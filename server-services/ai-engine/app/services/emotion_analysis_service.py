"""
emotion_analysis_service.py - 情绪分析服务（基于 BERT 的文本情感分类）

所属模块：ai-engine/app/services
功能简述：
    使用 BERT 文本分类 pipeline 对用户输入做情绪打标，
    在模型不可用时降级为关键词匹配方案，保证服务可用性。
依赖关系：
    - transformers：提供 text-classification pipeline
    - os：读取情绪模型名称配置
"""
from typing import List
from transformers import pipeline
import os

class EmotionAnalysisService:
    """
    情绪分析服务 - 基于BERT的文本情感分类
    
    优先使用预训练模型进行分类，加载失败或推理异常时降级为关键词匹配，
    始终返回情绪标签列表。
    """
    
    def __init__(self):
        """
        初始化情绪分析服务，加载模型与预定义情绪标签。

        从环境变量 EMOTION_MODEL 读取模型名（默认 bert-base-chinese），
        加载失败时将 classifier 置 None 并在分析时走降级路径。
        """
        # 加载情绪分析模型
        model_name = os.getenv("EMOTION_MODEL", "bert-base-chinese")
        
        try:
            # 构造文本分类 pipeline，返回所有标签得分
            self.classifier = pipeline(
                "text-classification",
                model=model_name,
                return_all_scores=True
            )
        except Exception as e:
            # 模型加载失败时打印告警并降级为关键词匹配
            print(f"Warning: Could not load emotion model: {e}")
            self.classifier = None
        
        # 预定义情绪标签：覆盖青少年常见情绪状态
        self.emotion_labels = [
            "开心", "兴奋", "平静", "焦虑",
            "担忧", "愤怒", "悲伤", "孤独",
            "疲惫", "迷茫", "无助"
        ]
    
    async def analyze(self, content: str) -> List[str]:
        """
        分析文本情绪，返回情绪标签列表。

        Args:
            content: 待分析的文本

        Returns:
            List[str]: 情绪标签列表
        """
        # 模型不可用时直接走关键词降级方案
        if self.classifier is None:
            # 降级策略：使用关键词匹配
            return self._keyword_based_analysis(content)
        
        try:
            # 使用模型分析：调用 pipeline 得到所有标签得分
            results = self.classifier(content)
            
            # 提取主要情绪：按得分取 top-3
            emotions = self._extract_emotions(results)
            
            return emotions
            
        except Exception as e:
            # 推理异常时同样降级为关键词匹配
            return self._keyword_based_analysis(content)
    
    def _keyword_based_analysis(self, content: str) -> List[str]:
        """
        关键词情绪分析（降级方案）。

        Args:
            content: 待分析的文本

        Returns:
            List[str]: 命中关键词对应的情绪标签；无命中则返回"平静"
        """
        detected_emotions = []
        
        # 情绪关键词映射：情绪 -> 触发关键词列表
        emotion_keywords = {
            "开心": ["开心", "高兴", "快乐", "棒", "好"],
            "悲伤": ["难过", "伤心", "悲伤", "失落", "哭"],
            "焦虑": ["焦虑", "紧张", "担心", "慌", "不安"],
            "愤怒": ["生气", "愤怒", "烦", "讨厌", "恨"],
            "孤独": ["孤独", "孤单", "一个人", "没人"],
            "疲惫": ["累", "疲惫", "困", "无力", "辛苦"]
        }
        
        # 遍历映射，命中任一关键词即记录该情绪并跳到下一个情绪
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
        从模型结果提取情绪标签。

        Args:
            results: pipeline 返回的标签-得分列表

        Returns:
            List[str]: 得分超过阈值的 top-3 情绪标签
        """
        # TODO: 实现从模型输出到情绪标签的映射
        emotions = []
        
        # 简化处理：按得分降序后取top-3
        sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
        
        for result in sorted_results[:3]:
            # 仅保留得分高于 0.3 的情绪，过滤低置信度噪声
            if result['score'] > 0.3:  # 置信度阈值
                emotions.append(self._map_label_to_emotion(result['label']))
        
        return emotions
    
    def _map_label_to_emotion(self, label: str) -> str:
        """
        将模型标签映射到情绪标签。

        Args:
            label: 模型输出的原始标签

        Returns:
            str: 映射后的情绪标签（当前实现原样返回）
        """
        # TODO: 实现标签映射
        return label