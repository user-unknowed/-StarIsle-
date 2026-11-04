"""
risk_detection_service.py - 危机信号检测服务（L1 关键词 + L2 语义）

所属模块：ai-engine/app/services
功能简述：
    对用户内容进行二值危机检测：L1 明确危机关键词命中、
    L2 自伤语义意图识别。任一命中即 crisis=true，
    不再输出绿/黄/橙/红四级风险等级，中危情绪词也不再升级。
依赖关系：
    - app.utils.keyword_manager：关键词管理
    - app.models.semantic_analyzer：L2 语义分析器
"""
from typing import Dict
from app.utils.keyword_manager import KeywordManager
from app.models.semantic_analyzer import SemanticAnalyzer


class RiskDetectionService:
    """
    危机信号检测服务 - L1关键词 + L2语义分析

    输出 boolean crisis 与检测明细（命中关键词、类别、意图、置信度、来源）。
    """

    def __init__(self):
        """
        初始化危机检测服务，装载关键词库与语义分析器。
        """
        self.keyword_manager = KeywordManager()
        self.semantic_analyzer = SemanticAnalyzer()

        # 危机关键词：明确自伤/轻生/生命无意义等急性高危表达
        self.crisis_keywords = {
            "自杀意念": [
                "自杀", "想死", "不想活", "活着没意义", "活着没有意义",
                "轻生", "轻生的想法", "结束生命", "了结", "一了百了",
            ],
            "自伤行为": [
                "自残", "割腕", "跳楼", "伤害自己",
            ],
            "绝望感": [
                "绝望", "看不到未来", "极端", "极端的方式",
                "解脱", "解脱自己", "活着累", "活不下去", "活够了",
                "消失", "想消失",
            ],
        }

    async def detect_risk(self, user_id: str, content: str) -> bool:
        """
        综合危机检测。

        Args:
            user_id: 用户ID
            content: 待检测的文本内容

        Returns:
            bool: 是否命中危机信号（true 表示需要危机响应）
        """
        # L1: 明确危机关键词检测（实时）
        keyword_result = await self._detect_keywords(content)

        # L2: 自伤语义意图分析（异步）
        semantic_result = await self._detect_semantic(content)

        # 二值判定：任一命中即为危机
        return bool(keyword_result["high_risk"] or semantic_result["crisis"])

    async def _detect_keywords(self, content: str) -> Dict:
        """
        L1 危机关键词检测。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 high_risk（是否命中）与命中 keywords/categories 的检测结果
        """
        matched_keywords = []
        matched_categories = []

        for category, keywords in self.crisis_keywords.items():
            for keyword in keywords:
                if keyword in content:
                    matched_keywords.append(keyword)
                    if category not in matched_categories:
                        matched_categories.append(category)

        return {
            "high_risk": bool(matched_keywords),
            "keywords": matched_keywords,
            "categories": matched_categories,
        }

    async def _detect_semantic(self, content: str) -> Dict:
        """
        L2 语义分析。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 包含 crisis、confidence、intent 的语义检测结果；异常时降级为非危机
        """
        try:
            analysis_result = await self.semantic_analyzer.analyze(content)

            return {
                "crisis": analysis_result["crisis"],
                "confidence": analysis_result["confidence"],
                "intent": analysis_result["intent"],
            }

        except Exception:
            # 降级策略：语义分析异常不判定危机，避免阻塞主流程
            return {"crisis": False, "confidence": 0.5, "intent": "unknown"}

    async def get_detection_details(self, content: str) -> Dict:
        """
        获取检测详情（保留命中关键词、类别、意图、置信度与来源）。

        Args:
            content: 待检测的文本内容

        Returns:
            Dict: 危机判定与检测明细
        """
        keyword_result = await self._detect_keywords(content)
        semantic_result = await self._detect_semantic(content)

        sources = []
        if keyword_result["high_risk"]:
            sources.append("keyword")
        if semantic_result["crisis"]:
            sources.append("semantic")

        return {
            "crisis": bool(keyword_result["high_risk"] or semantic_result["crisis"]),
            "keywords_detected": keyword_result["keywords"],
            "categories": keyword_result["categories"],
            "semantic_intent": semantic_result["intent"],
            "confidence": semantic_result["confidence"],
            "sources": sources,
        }
