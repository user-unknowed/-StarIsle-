"""
knowledge.py - 知识库数据模型定义

所属模块：ai-engine/app/models
功能简述：
    定义心理咨询技术知识库的 Pydantic 数据模型，包含知识文档、
    搜索查询与搜索结果三类结构，供知识库服务与 API 层统一使用。
依赖关系：
    - pydantic：提供数据校验与字段描述能力
    - typing/datetime：提供类型注解与时间字段
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class KnowledgeDocument(BaseModel):
    """
    知识文档模型 - 存储心理咨询技术知识

    一条记录对应一条心理咨询技术知识，包含来源、分类、标签、
    核心内容、相关技术与适用问题等字段。
    """
    id: Optional[str] = None                                                    # 文档唯一标识
    title: str = Field(..., description="知识标题")                              # 知识标题
    source: str = Field(..., description="来源书籍/文献")                       # 来源书籍/文献
    author: Optional[str] = Field(None, description="作者")                      # 作者
    category: str = Field(..., description="分类：认知行为疗法/精神分析/人本主义等")  # 心理咨询流派分类
    tags: List[str] = Field(default_factory=list, description="标签关键词")      # 标签关键词
    content: str = Field(..., description="知识核心内容/技术方法")                # 知识核心内容/技术方法
    techniques: List[str] = Field(default_factory=list, description="相关咨询技术列表")  # 相关咨询技术列表
    applicable_issues: List[str] = Field(default_factory=list, description="适用心理问题类型")  # 适用心理问题类型
    source_repo_id: Optional[str] = Field(None,                                 # 来源 fork 仓库标识
        description="来源GitHub fork仓库 owner/repo，M2b注入知识专用")
    created_at: Optional[datetime] = None                                        # 创建时间
    updated_at: Optional[datetime] = None                                        # 更新时间


class KnowledgeSearchQuery(BaseModel):
    """
    知识搜索查询模型

    封装对知识库发起检索时的查询参数，支持分类筛选与结果数量控制。
    """
    query: str = Field(..., description="搜索查询内容")                          # 搜索查询内容
    category: Optional[str] = Field(None, description="分类筛选")               # 分类筛选（可选）
    top_k: int = Field(default=5, description="返回前K个结果")                  # 返回前K个结果


class KnowledgeSearchResult(BaseModel):
    """
    知识搜索结果模型

    单条检索结果，包含命中的知识文档、相关性得分与匹配关键词。
    """
    document: KnowledgeDocument                                                # 命中的知识文档
    relevance_score: float = Field(..., description="相关性得分")              # 相关性得分
    matched_keywords: List[str] = Field(default_factory=list, description="匹配的关键词")  # 命中的关键词列表
