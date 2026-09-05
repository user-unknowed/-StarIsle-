"""
semantic_analyzer.py - 语义分析器（L2 语义级风险检测）

所属模块：ai-engine/app/models
功能简述：
    对用户文本进行意图识别与情绪强度分析，结合二者输出风险等级。
    MVP 阶段采用规则驱动的语义分析，后续可替换为深度学习模型。
依赖关系：
    - os：读取环境变量中的置信度阈值配置
    - typing：提供 Dict 类型注解
"""
from typing import Dict
import os

class SemanticAnalyzer:
    """
    语义分析器 - L2语义级风险检测

    通过意图识别与情绪强度分析，输出风险等级、置信度、意图与强度，
    作为风险检测服务 L1 关键词检测之后的第二层语义补充。
    """
    
    def __init__(self):
        """
        初始化语义分析器，加载置信度阈值。

        从环境变量 SEMANTIC_CONFIDENCE_THRESHOLD 读取阈值，缺省为 0.7。
        """
        # TODO: 加载预训练的意图识别模型
        self.intent_model = None
        # 语义分析置信度阈值，低于该值的判定将被打折
        self.confidence_threshold = float(os.getenv("SEMANTIC_CONFIDENCE_THRESHOLD", "0.7"))
    
    async def analyze(self, content: str) -> Dict:
        """
        对文本进行语义分析，输出风险等级与意图强度。

        Args:
            content: 待分析的文本

        Returns:
            dict: 包含 risk_level、confidence、intent、intensity 的分析结果
        """
        # MVP阶段：使用规则+简单语义分析
        # 后续可替换为深度学习模型

        # 1. 检测隐含意图：识别自伤/求助/情绪表达/日常聊天
        intent = self._detect_intent(content)

        # 2. 分析情绪强度：根据程度副词判断 mild/moderate/severe
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
        检测用户意图。

        Args:
            content: 待检测的文本

        Returns:
            str: 意图类型（self_harm / help_seeking / emotion_expression / casual_chat）
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
                # 命中自伤关键词后进一步检查上下文，避免误判
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
        
        # 情绪表达检测：命中情绪词汇即归类为情绪表达
        emotion_words = ["难过", "伤心", "累", "烦", "开心", "高兴"]
        for word in emotion_words:
            if word in content:
                return "emotion_expression"
        
        # 默认：日常聊天
        return "casual_chat"
    
    def _analyze_intensity(self, content: str) -> str:
        """
        分析情绪强度。

        Args:
            content: 待分析的文本

        Returns:
            str: 强度等级（mild / moderate / severe）
        """
        # 高强度情绪词汇：出现即判为 severe
        high_intensity = ["非常", "特别", "超级", "极其", "真的"]
        
        # 中强度情绪词汇：出现即判为 moderate
        moderate_intensity = ["有点", "稍微", "一些", "蛮"]
        
        for word in high_intensity:
            if word in content:
                return "severe"
        
        for word in moderate_intensity:
            if word in content:
                return "moderate"
        
        # 无强度副词则判为 mild
        return "mild"
    
    def _calculate_risk(self, intent: str, intensity: str, content: str = "") -> str:
        """
        根据意图与强度计算风险等级。

        Args:
            intent: 意图类型
            intensity: 强度等级
            content: 原文（v1.6 新增，用于积极词检测）

        Returns:
            str: 风险等级（green / yellow / orange / red）
        """
        # v1.6 积极词检测（降低 false positive）
        positive_indicators = ["希望", "好起来", "帮帮我", "会好", "想好", "好多了"]

        # 自伤意图按强度逐级提升风险等级
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
            # 情绪表达仅在高强度时升为 yellow
            if intensity == "severe":
                return "yellow"
            else:
                return "green"

        else:
            # 日常聊天默认安全
            return "green"