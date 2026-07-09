from typing import List
from transformers import pipeline
import os

class EmotionAnalysisService:
    """
    情绪分析服务 - 基于BERT的文本情感分类
    """
    
    def __init__(self):
        # 加载情绪分析模型
        model_name = os.getenv("EMOTION_MODEL", "bert-base-chinese")
        
        try:
            self.classifier = pipeline(
                "text-classification",
                model=model_name,
                return_all_scores=True
            )
        except Exception as e:
            print(f"Warning: Could not load emotion model: {e}")
            self.classifier = None
        
        # 预定义情绪标签
        self.emotion_labels = [
            "开心", "兴奋", "平静", "焦虑",
            "担忧", "愤怒", "悲伤", "孤独",
            "疲惫", "迷茫", "无助"
        ]
    
    async def analyze(self, content: str) -> List[str]:
        """
        分析文本情绪
        
        Returns:
            情绪标签列表
        """
        if self.classifier is None:
            # 降级策略：使用关键词匹配
            return self._keyword_based_analysis(content)
        
        try:
            # 使用模型分析
            results = self.classifier(content)
            
            # 提取主要情绪
            emotions = self._extract_emotions(results)
            
            return emotions
            
        except Exception as e:
            return self._keyword_based_analysis(content)
    
    def _keyword_based_analysis(self, content: str) -> List[str]:
        """
        关键词情绪分析（降级方案）
        """
        detected_emotions = []
        
        # 情绪关键词映射
        emotion_keywords = {
            "开心": ["开心", "高兴", "快乐", "棒", "好"],
            "悲伤": ["难过", "伤心", "悲伤", "失落", "哭"],
            "焦虑": ["焦虑", "紧张", "担心", "慌", "不安"],
            "愤怒": ["生气", "愤怒", "烦", "讨厌", "恨"],
            "孤独": ["孤独", "孤单", "一个人", "没人"],
            "疲惫": ["累", "疲惫", "困", "无力", "辛苦"]
        }
        
        for emotion, keywords in emotion_keywords.items():
            for keyword in keywords:
                if keyword in content:
                    detected_emotions.append(emotion)
                    break
        
        # 如果没有检测到，返回中性标签
        if not detected_emotions:
            detected_emotions.append("平静")
        
        return detected_emotions
    
    def _extract_emotions(self, results: List[Dict]) -> List[str]:
        """
        从模型结果提取情绪标签
        """
        # TODO: 实现从模型输出到情绪标签的映射
        emotions = []
        
        # 简化处理：取top-3情绪
        sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
        
        for result in sorted_results[:3]:
            if result['score'] > 0.3:  # 置信度阈值
                emotions.append(self._map_label_to_emotion(result['label']))
        
        return emotions
    
    def _map_label_to_emotion(self, label: str) -> str:
        """
        将模型标签映射到情绪标签
        """
        # TODO: 实现标签映射
        return label