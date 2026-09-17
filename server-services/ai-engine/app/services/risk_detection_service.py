"""
risk_detection_service.py - 风险检测服务（L1 关键词 + L1.5 持续时间 + L2 语义）

所属模块：ai-engine/app/services
功能简述：
    对用户内容进行分层风险检测：L1 关键词实时命中判定、
    L1.5 持续时间表达与情绪低落组合判定、L2 语义意图分析，
    综合三层结果取最高风险等级，并提供积极词降级与社交孤立降级。
依赖关系：
    - app.utils.keyword_manager：关键词管理
    - app.models.semantic_analyzer：L2 语义分析器
    - os/re：通用工具与正则
"""
import re
from typing import Dict, List
from app.utils.keyword_manager import KeywordManager
from app.models.semantic_analyzer import SemanticAnalyzer
import os

class RiskDetectionService:
    """
    风险检测服务 - L1关键词 + L2语义分析
    
    通过关键词、持续时间、语义三层检测综合判定风险等级，
    并对求助意愿、积极词等场景做降级处理，降低误报率。
    """
    
    def __init__(self):
        """
        初始化风险检测服务，装载关键词库与语义分析器。

        关键词库按 v1.6/v1.7/v1.8 迭代更新，区分高/中风险、
        持续时间与情绪低落词组，用于分层判定。
        """
        self.keyword_manager = KeywordManager()
        self.semantic_analyzer = SemanticAnalyzer()

        # 关键词库
        # v1.7: "没有意义"/"毫无意义"/"一切都没有意义" 从 high 移到 medium
        #        仅 "活着没意义"/"活着没有意义" 保留 high（明确指向生命无意义）
        self.high_risk_keywords = [
            "自杀", "想死", "不想活", "活着没意义", "活着没有意义",
            "自残", "割腕", "跳楼", "伤害自己",
            "绝望", "看不到未来",
            # v1.6 扩充：基于 case_005 偏差和心理学常识
            "轻生", "轻生的想法", "极端", "极端的方式",
            "解脱", "解脱自己", "结束生命", "了结",
            "活着累", "活不下去", "活够了",
            "消失", "想消失", "一了百了"
        ]

        self.medium_risk_keywords = [
            "抑郁", "焦虑", "失眠", "情绪低落",
            "压力大", "喘不过气", "无法呼吸",
            "孤独", "被孤立", "没人理解",
            # v1.7: 被动无意义感（需结合持续时间/上下文判断，非急性危机）
            "没有意义", "毫无意义", "一切都没有意义", "没希望"
        ]

        # v1.6 持续时间表达词
        # v1.8: 移除 "天天"（"今天天气"误匹配），改用 "天天都"
        self.duration_indicators = [
            "持续很久", "一直", "长期", "好久", "很长时间",
            "每天都", "天天都", "日复一日", "一直很", "总是",
            "经常", "总是这样", "好长一段时间"
        ]

        # v1.6 情绪低落关键词（用于与持续时间组合判断）
        self.low_mood_keywords = [
            "情绪低落", "心情不好", "很丧", "抑郁", "难过",
            "孤独", "不开心", "低落", "消沉"
        ]

        # v2.0 儿少咨询督导增强：家庭系统失衡信号关键词（medium/orange 级）
        # 来自杜亚松家庭系统视角：问题行为常是家庭关系的报警器
        self.family_system_keywords = [
            "父母离异", "父母吵架", "家里没人理", "妈妈控制",
            "爸爸打人", "被冷落", "没人管我"
        ]

        # v2.0 儿少咨询督导增强：防御链条指标（岳晓东结构性概念化）
        # "逃避—否认—退缩"循环识别，用于配合求助意愿做降级判断
        self.defense_chain_indicators = [
            "逃避", "否认", "退缩", "不敢", "不敢说自己行"
        ]
    
    async def detect_risk(self, user_id: str, content: str) -> str:
        """
        综合风险检测。

        Args:
            user_id: 用户ID
            content: 待检测的文本内容

        Returns:
            str: 风险等级（green / yellow / orange / red）
        """
        # L1: 关键词检测（实时）
        keyword_risk = await self._detect_keywords(content)

        # L1.5: 持续时间检测（v1.6 新增）
        duration_risk = await self._detect_duration(content)

        # L1.6: 家庭系统失衡信号检测（v2.0 儿少督导增强）
        family_system_risk = await self._detect_family_system(content)

        # L2: 语义分析（异步）
        semantic_risk = await self._detect_semantic(content)

        # 综合判断（v1.8 传入 content 用于积极词降级；v2.0 传入 family_system 用于防御链条降级）
        final_risk = self._calculate_final_risk(
            keyword_risk, duration_risk, semantic_risk, content, family_system_risk
        )

        return final_risk
    
    async def _detect_keywords(self, content: str) -> Dict:
        """
        L1关键词检测。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 level 与命中 keywords 的检测结果
        """
        detected_high = []
        detected_medium = []
        
        # 检测高风险关键词
        for keyword in self.high_risk_keywords:
            if keyword in content:
                detected_high.append(keyword)
        
        # 检测中风险关键词
        for keyword in self.medium_risk_keywords:
            if keyword in content:
                detected_medium.append(keyword)
        
        # 判断关键词风险等级：高风险命中即红色，否则中风险橙色，否则绿色
        if detected_high:
            return {"level": "red", "keywords": detected_high}
        elif detected_medium:
            return {"level": "orange", "keywords": detected_medium}
        else:
            return {"level": "green", "keywords": []}
    
    async def _detect_semantic(self, content: str) -> Dict:
        """
        L2语义分析。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 level、confidence、intent 的语义检测结果；异常时降级为绿色
        """
        try:
            # 使用语义分析模型
            analysis_result = await self.semantic_analyzer.analyze(content)

            return {
                "level": analysis_result["risk_level"],
                "confidence": analysis_result["confidence"],
                "intent": analysis_result["intent"]
            }

        except Exception as e:
            # 降级策略：返回低风险，避免语义分析异常阻塞主流程
            return {"level": "green", "confidence": 0.5}

    async def _detect_duration(self, content: str) -> Dict:
        """
        L1.5 持续时间检测（v1.6 新增）

        规则：
        - 持续时间表达词 + 情绪低落词 → orange
        - 仅持续时间表达词 → yellow
        - 无持续时间表达 → green

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 level 与 reason 的持续时间检测结果
        """
        # 同时检测持续时间表达与情绪低落关键词
        has_duration = any(indicator in content for indicator in self.duration_indicators)
        has_low_mood = any(keyword in content for keyword in self.low_mood_keywords)

        # 持续时间叠加情绪低落，升级为橙色
        if has_duration and has_low_mood:
            return {"level": "orange", "reason": "duration_low_mood"}
        elif has_duration:
            return {"level": "yellow", "reason": "duration_expression"}
        else:
            return {"level": "green", "reason": "no_duration"}

    async def _detect_family_system(self, content: str) -> Dict:
        """
        L1.6 家庭系统失衡信号检测（v2.0 儿少咨询督导增强）

        规则：
        - 命中 family_system_keywords → orange（家庭关系报警器信号）
        - 未命中 → green

        来自杜亚松家庭系统视角：儿少问题行为常是家庭关系失衡的外在映射，
        识别"高控制"与"缺乏回应"两类模式，纳入综合风险判断。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 level 与 reason 的家庭系统信号检测结果
        """
        content_lower = content.lower()
        if any(kw in content_lower for kw in self.family_system_keywords):
            return {"level": "orange", "reason": "family_system_signal"}
        return {"level": "green", "reason": "no_family_system_signal"}

    def _calculate_final_risk(self, keyword_risk: Dict, duration_risk: Dict, semantic_risk: Dict,
                              content: str = "", family_system_risk: Dict = None) -> str:
        """
        综合计算最终风险等级。

        规则：
        - L1检测到高风险关键词 → 立即返回红色
        - v1.8: 中等关键词(orange) + 积极词 → 降为 yellow
                （有改善意愿/求助动机时风险可控，修复 case_017）
        - L1 + L1.5 + L1.6 + L2 综合判断，取最高风险等级
        - v2.0: 防御链条降级 — 含 3 个以上 defense_chain_indicators 且同时含求助意愿词时，
                将 orange 降为 yellow（避免把自我觉察的求助误判为高危）

        Args:
            keyword_risk: L1 关键词检测结果
            duration_risk: L1.5 持续时间检测结果
            semantic_risk: L2 语义检测结果
            content: 原文，用于积极词等降级判定
            family_system_risk: L1.6 家庭系统信号检测结果（v2.0 新增）

        Returns:
            str: 最终风险等级（green / yellow / orange / red）
        """
        # L1关键词检测到高风险，立即返回红色
        if keyword_risk["level"] == "red":
            return "red"

        # v1.8 积极词降级（修复 case_017 偏差，避免 case_004/012/015 误降）
        # v1.9: 移除 "希望"（"没有希望"误匹配），case_017 由 "好起来" 兜底
        positive_indicators = ["好起来", "会好", "想好", "好多了", "帮帮我"]
        if (keyword_risk["level"] == "orange"
            and content
            and any(word in content for word in positive_indicators)):
            return "yellow"

        # v1.9: 求助意图 + 仅社交孤立症状（无生理症状）→ 降为 yellow
        # 修复 case_023（孤独+求助，无失眠/压力等生理症状）
        physiological_symptoms = ["失眠", "压力大", "喘不过气", "无法呼吸", "厌食", "睡不着"]
        social_isolation_words = ["孤独", "没人理解", "被孤立"]
        has_only_social = (keyword_risk["level"] == "orange"
                          and content
                          and any(w in content for w in social_isolation_words)
                          and not any(w in content for w in physiological_symptoms)
                          and semantic_risk.get("intent") == "help_seeking")
        if has_only_social:
            return "yellow"

        # 综合L1、L1.5、L1.6、L2结果：取最高风险等级
        risk_levels = ["green", "yellow", "orange", "red"]

        keyword_level = keyword_risk["level"]
        duration_level = duration_risk["level"]
        semantic_level = semantic_risk.get("level", "green")
        # v2.0: 纳入家庭系统信号等级（默认 green，兼容未传入场景）
        family_system_level = (family_system_risk or {}).get("level", "green")

        # 取最高风险等级：将各级别转为索引后取最大值
        keyword_index = risk_levels.index(keyword_level)
        duration_index = risk_levels.index(duration_level)
        semantic_index = risk_levels.index(semantic_level)
        family_system_index = risk_levels.index(family_system_level)

        final_index = max(keyword_index, duration_index, semantic_index, family_system_index)

        # v2.0 防御链条降级（儿少咨询督导增强）：
        # 当含 3 个以上 defense_chain_indicators 且同时含求助意愿词时，
        # 将 orange 降为 yellow（避免把自我觉察的求助误判为高危）
        if content and risk_levels[final_index] == "orange":
            content_lower = content.lower()
            defense_hits = sum(1 for ind in self.defense_chain_indicators if ind in content_lower)
            positive_indicators = ["好起来", "会好", "想好", "好多了", "帮帮我"]
            has_positive = any(ind in content_lower for ind in positive_indicators)
            if defense_hits >= 3 and has_positive:
                final_index = risk_levels.index("yellow")

        return risk_levels[final_index]
    
    async def get_detection_details(self, content: str) -> Dict:
        """
        获取检测详情。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含命中关键词、语义意图与置信度的详情
        """
        # 重新执行关键词与语义检测，用于返回明细
        keyword_result = await self._detect_keywords(content)
        semantic_result = await self._detect_semantic(content)
        
        return {
            "keywords_detected": keyword_result["keywords"],
            "semantic_intent": semantic_result.get("intent", "unknown"),
            "confidence": semantic_result.get("confidence", 0.0)
        }