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
        self.high_risk_keywords = [
            "自杀", "想死", "不想活", "活着没意义",
            "自残", "割腕", "跳楼", "伤害自己",
            "绝望", "没希望", "看不到未来"
        ]
        
        self.medium_risk_keywords = [
            "抑郁", "焦虑", "失眠", "情绪低落",
            "压力大", "喘不过气", "无法呼吸",
            "孤独", "被孤立", "没人理解"
        ]
    
    async def detect_risk(self, user_id: str, content: str) -> str:
        """
        综合风险检测
        
        Returns:
            风险等级: "green" / "yellow" / "orange" / "red"
        """
        # L1: 关键词检测（实时）
        keyword_risk = await self._detect_keywords(content)
        
        # L2: 语义分析（异步）
        semantic_risk = await self._detect_semantic(content)
        
        # 综合判断
        final_risk = self._calculate_final_risk(keyword_risk, semantic_risk)
        
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
    
    def _calculate_final_risk(self, keyword_risk: Dict, semantic_risk: Dict) -> str:
        """
        综合计算最终风险等级
        
        规则：
        - L1检测到高风险关键词 → 立即返回红色
        - L1 + L2综合判断
        """
        # L1关键词检测到高风险，立即返回红色
        if keyword_risk["level"] == "red":
            return "red"
        
        # 综合L1和L2结果
        risk_levels = ["green", "yellow", "orange", "red"]
        
        keyword_level = keyword_risk["level"]
        semantic_level = semantic_risk["level"]
        
        # 取最高风险等级
        keyword_index = risk_levels.index(keyword_level)
        semantic_index = risk_levels.index(semantic_level)
        
        final_index = max(keyword_index, semantic_index)
        
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