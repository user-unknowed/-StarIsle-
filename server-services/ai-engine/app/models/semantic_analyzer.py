from typing import Dict
import os
import json

class SemanticAnalyzer:
    """
    语义分析器 - L2语义级风险检测
    """
    
    def __init__(self):
        # TODO: 加载预训练的意图识别模型
        self.intent_model = None
        self.confidence_threshold = float(os.getenv("SEMANTIC_CONFIDENCE_THRESHOLD", "0.7"))
    
    async def analyze(self, content: str) -> Dict:
        """
        语义分析

        Args:
            content: 待分析的文本

        Returns:
            {
                "risk_level": "green" / "yellow" / "orange" / "red",
                "confidence": 0.0-1.0,
                "intent": "self_harm" / "help_seeking" / "casual_chat" / "emotion_expression"
            }
        """
        # MVP阶段：使用规则+简单语义分析
        # 后续可替换为深度学习模型

        # 1. 检测隐含意图
        intent = self._detect_intent(content)

        # 2. 分析情绪强度
        intensity = self._analyze_intensity(content)

        # 3. 判断风险等级（v1.6 传入 content 用于积极词检测）
        risk_level = self._calculate_risk(intent, intensity, content)
        
        return {
            "risk_level": risk_level,
            "confidence": 0.85,  # MVP阶段固定置信度
            "intent": intent,
            "intensity": intensity
        }
    
    def _detect_intent(self, content: str) -> str:
        """
        检测用户意图

        Returns:
            意图类型
        """
        # 自伤意念检测（v1.6 扩充）
        self_harm_indicators = [
            "不想", "结束", "消失", "解脱",
            "没有意义", "无所谓", "随便",
            # v1.6 新增：基于 case_005 偏差
            "轻生", "极端", "活着累", "活不下去", "了结", "一了百了"
        ]

        for indicator in self_harm_indicators:
            if indicator in content:
                # 进一步检查上下文
                if any(word in content for word in ["活着", "生命", "未来", "自己"]):
                    return "self_harm"
        
        # 求助意图检测
        # v1.7: 移除 "想聊聊"（过宽，会误匹配 "想聊聊天"）；改用更精确的短语
        help_seeking_indicators = [
            "需要帮助", "有人能帮我", "怎么办",
            "不知道该怎么", "需要有人",
            "想找人聊聊", "想找人", "想聊一聊", "想找人说"
        ]
        
        for indicator in help_seeking_indicators:
            if indicator in content:
                return "help_seeking"
        
        # 情绪表达检测
        emotion_words = ["难过", "伤心", "累", "烦", "开心", "高兴"]
        for word in emotion_words:
            if word in content:
                return "emotion_expression"
        
        # 默认：日常聊天
        return "casual_chat"
    
    def _analyze_intensity(self, content: str) -> str:
        """
        分析情绪强度
        
        Returns:
            "mild" / "moderate" / "severe"
        """
        # 高强度情绪词汇
        high_intensity = ["非常", "特别", "超级", "极其", "真的"]
        
        # 中强度情绪词汇
        moderate_intensity = ["有点", "稍微", "一些", "蛮"]
        
        for word in high_intensity:
            if word in content:
                return "severe"
        
        for word in moderate_intensity:
            if word in content:
                return "moderate"
        
        return "mild"
    
    def _calculate_risk(self, intent: str, intensity: str, content: str = "") -> str:
        """
        计算风险等级

        Args:
            intent: 意图
            intensity: 强度
            content: 原文（v1.6 新增，用于积极词检测）

        Returns:
            "green" / "yellow" / "orange" / "red"
        """
        # v1.6 积极词检测（降低 false positive）
        positive_indicators = ["希望", "好起来", "帮帮我", "会好", "想好", "好多了"]

        if intent == "self_harm":
            if intensity == "severe":
                return "red"
            elif intensity == "moderate":
                return "orange"
            else:
                return "yellow"

        elif intent == "help_seeking":
            # v1.6: 求助意图 + 积极词 → 降为 green（修复 case_017 偏差）
            if content and any(word in content for word in positive_indicators):
                return "green"
            return "yellow"

        elif intent == "emotion_expression":
            if intensity == "severe":
                return "yellow"
            else:
                return "green"

        else:
            return "green"