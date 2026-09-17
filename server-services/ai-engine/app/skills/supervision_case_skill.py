"""
supervision_case_skill.py - 心理咨询督导案例对话技能适配器

所属模块：ai-engine/app/skills
功能简述：
    将儿童青少年心理咨询案例与督导教学知识（B 站 BV1LG9wBhEMP）
    提炼为可被小星对话流调度的 skills。整合四个督导技能包：
      A. 父母观察法（卢林）
      B. 循环发展督导五步（萧文）
      C. 结构性概念化四维评估（岳晓东）
      D. 家庭系统视角（杜亚松）
    优先并入对话 skills，复用 BaseSkill 契约与 SkillRouter 三段注入机制，
    注册后即被小星对话流自动调度，无需改动路由器。

依赖关系：
    - app.skills.base_skill.BaseSkill：技能抽象基类
    - 调用方：SkillRouter 通过 can_handle 打分后调度 execute
"""
from __future__ import annotations
from typing import Any, Dict, List
from app.skills.base_skill import BaseSkill


class SupervisionCaseSkill(BaseSkill):
    """
    心理咨询督导案例技能 - 儿少心理咨询

    整合父母观察法、循环发展督导五步、结构性概念化四维评估、
    家庭系统视角四个督导技能包，作为小星对话 skills 的新成员。
    通过关键词命中组数打分，execute 内部按命中的技能包分支返回督导要点。
    """

    # 技能元信息：被 SkillRouter 用于三段注入与状态展示
    name = 'supervision_case_skill'                                  # 技能唯一标识
    display_name = '督导案例:儿少心理咨询'                            # 前端展示名称
    source_repo = 'internal/supervision-teaching'                    # 知识来源（内部督导教学）
    description = '儿童青少年心理咨询案例与督导教学知识包：父母观察法、循环发展督导五步、结构性概念化四维评估、家庭系统视角'

    # 四组触发关键词，分别对应技能包 A/B/C/D
    # 命中组数越多，匹配度越高（与 emotional_support_conversation_adapter 风格一致）
    # 兼顾书面与口语表达（12-18 岁少年多用"爸妈"而非"父母"）
    _SKILL_A_KWS = ['父母观察', '看见孩子', '亲子错位', '不上学', '不出门', '关在家里',
                    '不理解孩子', '爸妈不理解', '父母不理解', '爸妈管我', '不想上学']
    _SKILL_B_KWS = ['督导', '概念化', '策略检核', '咨询计划', '专业发展']
    _SKILL_C_KWS = ['厌学', '概念化', '防御', '逃避', '否认', '退缩', '完美主义',
                    '自我认同', '不敢', '考砸', '请假', '暴食', '躲起来']
    _SKILL_D_KWS = ['家庭', '亲子', '高控制', '缺乏回应', '家庭系统', '谁的错', '脱落',
                    '爸妈吵架', '父母吵架', '父母离异', '妈妈控制', '爸爸打人',
                    '被冷落', '没人管我', '家里没人理', '控制我', '爸妈控制']

    def can_handle(self, message: str, context: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> float:
        """
        判断技能对消息的匹配度。

        按命中的技能包组数打分：base 0.5 + 0.15×hits，上限 0.95。
        未命中任何组返回 0.0，低于 SkillRouter 的 ACTIVATE_THRESHOLD(0.6) 不激活。

        Args:
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像

        Returns:
            float: [0,1] 匹配度
        """
        msg = (message or "").lower()
        # 统计命中的技能包组数（每组最多计 1 次）
        hits = 0
        if any(k in msg for k in self._SKILL_A_KWS): hits += 1
        if any(k in msg for k in self._SKILL_B_KWS): hits += 1
        if any(k in msg for k in self._SKILL_C_KWS): hits += 1
        if any(k in msg for k in self._SKILL_D_KWS): hits += 1
        return 0.0 if hits == 0 else min(0.5 + 0.15 * hits, 0.95)

    async def execute(self, message: str, context: List[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        """
        执行技能，按命中的技能包分支返回督导要点。

        返回的 text 会原样注入 System Prompt，需符合小星人设
        （短句、语气词、邀请式建议、去标签化），不直接抛诊断词。

        Args:
            message: 用户消息
            context: 对话历史
            **kwargs: 附加参数

        Returns:
            Dict[str, Any]: 包含 text、confidence、raw_data 的结果
        """
        msg = (message or "").lower()
        matched_packages: List[str] = []
        text_parts: List[str] = []

        # 技能包 A：父母观察法（卢林督导精华）
        if any(k in msg for k in self._SKILL_A_KWS):
            matched_packages.append("A:父母观察法")
            text_parts.append(
                "【父母观察法】小星想到一个方法呀～\n"
                "1. 不批评、不教育、不干扰，父母每周观察孩子一小时并记录片段\n"
                "2. 留意亲子错位：孩子怎么说 vs 父母怎么接/误解/错过\n"
                "3. 孩子关在家里≠拒绝世界，可能是在给父母机会呢～\n"
                "小星陪你一起试试，好吗？"
            )

        # 技能包 B：循环发展督导五步（萧文）
        if any(k in msg for k in self._SKILL_B_KWS):
            matched_packages.append("B:循环发展督导五步")
            text_parts.append(
                "【循环发展督导五步】\n"
                "1. 了解咨询师对来访者的解读与感受\n"
                "2. 了解已用策略与技巧\n"
                "3. 核验假设与理论基础\n"
                "4. 再检核技巧策略适当性\n"
                "5. 重新整理咨询计划与目标\n"
                "一步一步来，会更清晰哦～"
            )

        # 技能包 C：结构性概念化四维评估（岳晓东）
        if any(k in msg for k in self._SKILL_C_KWS):
            matched_packages.append("C:结构性概念化四维评估")
            text_parts.append(
                "【结构性概念化四维评估】\n"
                "1. 行为层面：请假、逃避、暴食等行为表现\n"
                "2. 情绪层面：焦虑、自责、无助等情绪体验\n"
                "3. 认知层面：'考砸就完了'等非理性信念\n"
                "4. 家庭系统：纠缠依附、控制欲、被冷落等互动模式\n"
                "我们可以一起看看这些方面，好吗？"
            )

        # 技能包 D：家庭系统视角（杜亚松）
        if any(k in msg for k in self._SKILL_D_KWS):
            matched_packages.append("D:家庭系统视角")
            text_parts.append(
                "【家庭系统视角】\n"
                "1. 问题行为常是家庭关系的报警器，留意'高控制'与'缺乏回应'两类模式\n"
                "2. 进食障碍可能是孩子难以言说的情绪表达，厌学或许是家庭关系失衡的外在映射\n"
                "3. 从'追究谁的错'转向'探索可能改变的路径'，一起寻找解决办法吧～"
            )

        # 无任何命中时返回兜底说明
        if not text_parts:
            text = "【督导案例:儿少心理咨询】小星会根据儿童青少年心理咨询案例与督导教学知识包，为你提供参考回复～"
        else:
            text = "\n".join(text_parts)

        # 末尾标注仅供参考，符合 skill 注入的免责约定
        text += "\n（仅供参考，小星会结合你的情况调整）"

        return {
            "text": text,
            "confidence": 0.75,
            "raw_data": {
                "matched_packages": matched_packages,
                "source": "supervision-teaching"
            }
        }
