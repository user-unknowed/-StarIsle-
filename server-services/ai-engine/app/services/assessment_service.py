"""
assessment_service.py - 心理量表服务（标准量表题库、计分、去标签化结果）

所属模块：ai-engine/app/services
功能简述：
    内置 PHQ-9、GAD-7、CD-RISC 等标准心理量表，提供题目获取、
    自动计分与"关注方向"结果解读（不使用诊断性标签，改用中性表达）。
依赖关系：
    - app.utils.db_connection：MongoDB 连接（存储用户答题记录）
    - os/json/uuid/datetime：通用工具
"""
import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.utils.db_connection import get_db_connection


# 内置量表定义（不贴标签原则：结果文案使用"关注方向"而非诊断名）
BUILTIN_ASSESSMENTS = {
    "phq9": {
        "id": "phq9",
        "name": "情绪状态小测",
        "full_name": "Patient Health Questionnaire-9",
        "description": "通过 9 个小问题，了解你最近两周的情绪状态。小星会陪你一起看看～",
        "instructions": "请根据你最近两周的实际感受作答。没有对错之分，如实选择就好。",
        "questions": [
            {"id": 1, "text": "做事时提不起劲或没有兴趣"},
            {"id": 2, "text": "感到心情低落、沮丧或绝望"},
            {"id": 3, "text": "入睡困难、睡不安稳或睡眠过多"},
            {"id": 4, "text": "感觉疲倦或没有活力"},
            {"id": 5, "text": "食欲不振或吃太多"},
            {"id": 6, "text": "觉得自己很糟——或觉得自己很失败，或让自己或家人失望"},
            {"id": 7, "text": "对事物专注有困难，例如阅读报纸或看电视时"},
            {"id": 8, "text": "动作或说话速度缓慢到别人已经察觉？或正好相反——烦躁或坐立不安"},
            {"id": 9, "text": "有不如死掉或用某种方式伤害自己的念头"},
        ],
        "options": [
            {"value": 0, "label": "完全不会"},
            {"value": 1, "label": "好几天"},
            {"value": 2, "label": "一半以上的天数"},
            {"value": 3, "label": "几乎每天"},
        ],
        "scoring": {
            "ranges": [
                {"min": 0, "max": 4, "level": "minimal", "focus": "最近的情绪状态还不错，继续保持哦～小星会一直陪着你。", "suggestion": "试试每天记录三件让你开心的小事，培养积极情绪。"},
                {"min": 5, "max": 9, "level": "mild", "focus": "最近可能有些情绪上的小波动，这很正常。小星想多陪陪你。", "suggestion": "可以试试深呼吸、出去走走，或者跟小星聊聊是什么让你烦恼。"},
                {"min": 10, "max": 14, "level": "moderate", "focus": "最近的情绪可能需要多一些关注。不用一个人扛着，小星在这里。", "suggestion": "建议和信任的人说说你的感受，或者尝试一些放松练习。持续的话可以考虑寻求专业帮助。"},
                {"min": 15, "max": 19, "level": "moderately_severe", "focus": "你最近可能承受着比较大的情绪压力。请记得，寻求帮助是勇敢的表现。", "suggestion": "强烈建议你联系学校心理老师或拨打心理援助热线，你不需要独自面对这些。"},
                {"min": 20, "max": 27, "level": "severe", "focus": "小星很担心你现在的状态。请一定不要一个人扛，有人可以帮到你。", "suggestion": "请尽快联系专业心理援助。紧急情况请拨打 12355（青少年服务热线）或 400-161-9995（希望24热线）。"},
            ],
            "has_suicide_question": True,
            "suicide_question_id": 9,
        },
    },
    "gad7": {
        "id": "gad7",
        "name": "心情放松小测",
        "full_name": "Generalized Anxiety Disorder-7",
        "description": "7 个小问题，帮你了解最近的紧张和担忧程度。放轻松，慢慢选～",
        "instructions": "请根据你最近两周的实际感受作答。",
        "questions": [
            {"id": 1, "text": "感觉紧张、焦虑或急切"},
            {"id": 2, "text": "无法停止或控制担忧"},
            {"id": 3, "text": "对各种各样的事情担忧过多"},
            {"id": 4, "text": "很难放松下来"},
            {"id": 5, "text": "坐立不安以至于难以静坐"},
            {"id": 6, "text": "变得容易烦恼或急躁"},
            {"id": 7, "text": "感到害怕，好像有什么可怕的事情会发生"},
        ],
        "options": [
            {"value": 0, "label": "完全不会"},
            {"value": 1, "label": "好几天"},
            {"value": 2, "label": "一半以上的天数"},
            {"value": 3, "label": "几乎每天"},
        ],
        "scoring": {
            "ranges": [
                {"min": 0, "max": 4, "level": "minimal", "focus": "最近的心情挺放松的，状态不错～继续保持哦！", "suggestion": "可以试试把让你放松的事情记下来，以后紧张时拿出来看看。"},
                {"min": 5, "max": 9, "level": "mild", "focus": "最近可能偶尔会有些紧张和担忧，这是很常见的感受。", "suggestion": "试试 4-7-8 呼吸法：吸气 4 秒，屏息 7 秒，呼气 8 秒。"},
                {"min": 10, "max": 14, "level": "moderate", "focus": "最近的紧张感可能比较频繁，小星想陪你一起慢慢放松。", "suggestion": "规律作息、适度运动和正念冥想都有帮助。如果持续影响生活，可以寻求专业支持。"},
                {"min": 15, "max": 21, "level": "severe", "focus": "你最近可能承受着较大的压力。请记得，你值得被好好对待。", "suggestion": "建议尽快联系学校心理老师或专业心理咨询师。小星也会一直在这里陪你。"},
            ],
            "has_suicide_question": False,
        },
    },
    "cdrisc": {
        "id": "cdrisc",
        "name": "心理韧性小测",
        "full_name": "Connor-Davidson Resilience Scale (简化版)",
        "description": "了解你的心理弹性——也就是从困难中恢复的能力。这是你的超能力哦～",
        "instructions": "请根据你过去一个月的真实情况作答。",
        "questions": [
            {"id": 1, "text": "我能够适应变化"},
            {"id": 2, "text": "我有亲密的朋友或家人可以依靠"},
            {"id": 3, "text": "我相信自己能够处理好困难"},
            {"id": 4, "text": "过去的成功经验让我有信心面对挑战"},
            {"id": 5, "text": "我知道事情总会过去的"},
            {"id": 6, "text": "我能够在压力下保持冷静"},
            {"id": 7, "text": "我有明确的目标和方向"},
            {"id": 8, "text": "我能够从失败中学习"},
            {"id": 9, "text": "我觉得自己是被爱着的"},
            {"id": 10, "text": "遇到困难时我会主动寻求帮助"},
        ],
        "options": [
            {"value": 0, "label": "完全不符合"},
            {"value": 1, "label": "不太符合"},
            {"value": 2, "label": "一般"},
            {"value": 3, "label": "比较符合"},
            {"value": 4, "label": "完全符合"},
        ],
        "scoring": {
            "ranges": [
                {"min": 0, "max": 15, "level": "low", "focus": "你的心理韧性正在成长中。每个人都是慢慢变坚强的，小星相信你可以。", "suggestion": "从小事开始建立自信：每天完成一个小目标，记录自己的进步。"},
                {"min": 16, "max": 25, "level": "moderate", "focus": "你有一定的心理韧性，已经很棒了！我们可以一起让它变得更强。", "suggestion": "多关注自己的优点和成功经历，这些都是你韧性的源泉。"},
                {"min": 26, "max": 35, "level": "high", "focus": "你的心理韧性很强！这是你非常珍贵的能力，能帮你度过很多难关。", "suggestion": "继续保持，也可以把你的经验分享给需要的人哦。"},
                {"min": 36, "max": 40, "level": "very_high", "focus": "你的心理韧性非常出色！你是一个内心很有力量的人。", "suggestion": "你的力量可以成为别人的光，考虑一下成为『帮帮者』帮助更多人吧～"},
            ],
            "has_suicide_question": False,
        },
    },
}


class AssessmentService:
    """
    心理量表服务 - 标准量表题库、计分与去标签化结果解读

    内置 PHQ-9、GAD-7、CD-RISC 等量表，支持获取题目、提交答案、
    自动计分并返回"关注方向"结果（避免使用诊断性标签）。
    """

    def __init__(self):
        """初始化量表服务，建立数据库连接。"""
        self.db = get_db_connection()
        self.collection_name = "assessment_records"

    def list_assessments(self) -> List[Dict]:
        """
        获取所有可用量表列表。

        Returns:
            List[Dict]: 量表摘要列表（不含题目细节）
        """
        result = []
        for aid, asm in BUILTIN_ASSESSMENTS.items():
            result.append({
                "id": asm["id"],
                "name": asm["name"],
                "description": asm["description"],
                "question_count": len(asm["questions"]),
            })
        return result

    def get_assessment(self, assessment_id: str) -> Optional[Dict]:
        """
        获取指定量表的完整定义（含题目与选项）。

        Args:
            assessment_id: 量表标识

        Returns:
            Optional[Dict]: 量表定义；不存在时返回 None
        """
        return BUILTIN_ASSESSMENTS.get(assessment_id)

    def submit_assessment(
        self,
        user_id: str,
        assessment_id: str,
        answers: List[Dict],
    ) -> Dict:
        """
        提交量表答案，计分并返回去标签化结果。

        Args:
            user_id: 用户 ID
            assessment_id: 量表标识
            answers: 答案列表，每项含 question_id 与 value

        Returns:
            Dict: 计分结果（总分、等级、关注方向文案、建议、是否需危机干预）

        Raises:
            ValueError: 量表不存在或答案不完整时抛出
        """
        asm = BUILTIN_ASSESSMENTS.get(assessment_id)
        if not asm:
            raise ValueError(f"未知量表: {assessment_id}")

        # 校验答案完整性
        question_ids = {q["id"] for q in asm["questions"]}
        answered_ids = {a["question_id"] for a in answers}
        if question_ids != answered_ids:
            raise ValueError("答案不完整，请完成所有题目")

        # 计算总分
        answer_map = {a["question_id"]: a["value"] for a in answers}
        total_score = sum(answer_map[qid] for qid in question_ids)

        # 匹配分数区间，获取关注方向文案
        scoring = asm["scoring"]
        matched = None
        for r in scoring["ranges"]:
            if r["min"] <= total_score <= r["max"]:
                matched = r
                break
        if not matched:
            matched = scoring["ranges"][-1]

        # 检查自伤意念题（PHQ-9 第 9 题）
        needs_crisis = False
        if scoring.get("has_suicide_question"):
            sqid = scoring["suicide_question_id"]
            if answer_map.get(sqid, 0) >= 1:
                needs_crisis = True

        # 组装结果（不使用诊断名，使用"关注方向"语言）
        result = {
            "assessment_id": assessment_id,
            "assessment_name": asm["name"],
            "total_score": total_score,
            "max_score": len(asm["questions"]) * (asm["options"][-1]["value"]),
            "level": matched["level"],
            "focus": matched["focus"],
            "suggestion": matched["suggestion"],
            "needs_crisis_intervention": needs_crisis,
            "submitted_at": datetime.utcnow().isoformat(),
        }

        # 持久化答题记录（降级模式下跳过）
        try:
            collection = self.db.get_collection(self.collection_name)
            record = {
                "_id": str(uuid.uuid4()),
                "user_id": user_id,
                "assessment_id": assessment_id,
                "total_score": total_score,
                "level": matched["level"],
                "answers": answers,
                "needs_crisis_intervention": needs_crisis,
                "created_at": datetime.utcnow(),
            }
            collection.insert_one(record)
        except Exception:
            pass  # 降级模式下不存储

        return result

    def get_user_history(self, user_id: str, assessment_id: Optional[str] = None) -> List[Dict]:
        """
        获取用户的量表答题历史。

        Args:
            user_id: 用户 ID
            assessment_id: 可选，按量表筛选

        Returns:
            List[Dict]: 历史记录列表（按时间倒序）
        """
        try:
            collection = self.db.get_collection(self.collection_name)
            query = {"user_id": user_id}
            if assessment_id:
                query["assessment_id"] = assessment_id
            cursor = collection.find(query).sort("created_at", -1).limit(20)
            return [
                {
                    "id": str(r["_id"]),
                    "assessment_id": r.get("assessment_id"),
                    "total_score": r.get("total_score"),
                    "level": r.get("level"),
                    "needs_crisis_intervention": r.get("needs_crisis_intervention", False),
                    "created_at": r.get("created_at").isoformat() if r.get("created_at") else None,
                }
                for r in cursor
            ]
        except Exception:
            return []
