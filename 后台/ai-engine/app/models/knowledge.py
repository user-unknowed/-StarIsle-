"""
知识库数据模型 - 心理咨询技术知识存储
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class KnowledgeDocument(BaseModel):
    """
    知识文档模型 - 存储心理咨询技术知识
    """
    id: Optional[str] = None
    title: str = Field(..., description="知识标题")
    source: str = Field(..., description="来源书籍/文献")
    author: Optional[str] = Field(None, description="作者")
    category: str = Field(..., description="分类：认知行为疗法/精神分析/人本主义等")
    tags: List[str] = Field(default_factory=list, description="标签关键词")
    content: str = Field(..., description="知识核心内容/技术方法")
    techniques: List[str] = Field(default_factory=list, description="相关咨询技术列表")
    applicable_issues: List[str] = Field(default_factory=list, description="适用心理问题类型")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class KnowledgeSearchQuery(BaseModel):
    """
    知识搜索查询模型
    """
    query: str = Field(..., description="搜索查询内容")
    category: Optional[str] = Field(None, description="分类筛选")
    top_k: int = Field(default=5, description="返回前K个结果")


class KnowledgeSearchResult(BaseModel):
    """
    知识搜索结果模型
    """
    document: KnowledgeDocument
    relevance_score: float = Field(..., description="相关性得分")
    matched_keywords: List[str] = Field(default_factory=list, description="匹配的关键词")
