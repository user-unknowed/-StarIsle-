import re
from typing import Dict, List
from app.utils.keyword_manager import KeywordManager
from app.models.semantic_analyzer import SemanticAnalyzer
import os

class RiskDetectionService:
    """
    风险检测服务 - L1关键词 + L2语义分析
    """
    
    def __init__(self):
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
    
    async def detect_risk(self, user_id: str, content: str) -> str:
        """
        综合风险检测

        Returns:
            风险等级: "green" / "yellow" / "orange" / "red"
        """
        # L1: 关键词检测（实时）
        keyword_risk = await self._detect_keywords(content)

        # L1.5: 持续时间检测（v1.6 新增）
        duration_risk = await self._detect_duration(content)

        # L2: 语义分析（异步）
        semantic_risk = await self._detect_semantic(content)

        # 综合判断（v1.8 传入 content 用于积极词降级）
        final_risk = self._calculate_final_risk(keyword_risk, duration_risk, semantic_risk, content)

        return final_risk
    
    async def _detect_keywords(self, content: str) -> Dict:
        """
        L1关键词检测
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
        
        # 判断关键词风险等级
        if detected_high:
            return {"level": "red", "keywords": detected_high}
        elif detected_medium:
            return {"level": "orange", "keywords": detected_medium}
        else:
            return {"level": "green", "keywords": []}
    
    async def _detect_semantic(self, content: str) -> Dict:
        """
        L2语义分析
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
            # 降级策略：返回低风险
            return {"level": "green", "confidence": 0.5}

    async def _detect_duration(self, content: str) -> Dict:
        """
        L1.5 持续时间检测（v1.6 新增）

        规则：
        - 持续时间表达词 + 情绪低落词 → orange
        - 仅持续时间表达词 → yellow
        - 无持续时间表达 → green
        """
        has_duration = any(indicator in content for indicator in self.duration_indicators)
        has_low_mood = any(keyword in content for keyword in self.low_mood_keywords)

        if has_duration and has_low_mood:
            return {"level": "orange", "reason": "duration_low_mood"}
        elif has_duration:
            return {"level": "yellow", "reason": "duration_expression"}
        else:
            return {"level": "green", "reason": "no_duration"}

    def _calculate_final_risk(self, keyword_risk: Dict, duration_risk: Dict, semantic_risk: Dict, content: str = "") -> str:
        """
        综合计算最终风险等级

        规则：
        - L1检测到高风险关键词 → 立即返回红色
        - v1.8: 中等关键词(orange) + 积极词 → 降为 yellow
                （有改善意愿/求助动机时风险可控，修复 case_017）
        - L1 + L1.5 + L2 综合判断，取最高风险等级
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

        # 综合L1、L1.5、L2结果
        risk_levels = ["green", "yellow", "orange", "red"]

        keyword_level = keyword_risk["level"]
        duration_level = duration_risk["level"]
        semantic_level = semantic_risk.get("level", "green")

        # 取最高风险等级
        keyword_index = risk_levels.index(keyword_level)
        duration_index = risk_levels.index(duration_level)
        semantic_index = risk_levels.index(semantic_level)

        final_index = max(keyword_index, duration_index, semantic_index)

        return risk_levels[final_index]
    
    async def get_detection_details(self, content: str) -> Dict:
        """
        获取检测详情
        """
        keyword_result = await self._detect_keywords(content)
        semantic_result = await self._detect_semantic(content)
        
        return {
            "keywords_detected": keyword_result["keywords"],
            "semantic_intent": semantic_result.get("intent", "unknown"),
            "confidence": semantic_result.get("confidence", 0.0)
        }