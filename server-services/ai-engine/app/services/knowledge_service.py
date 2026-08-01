"""
知识库服务 - 心理咨询技术知识检索增强（RAG）
"""
import os
import json
from typing import List, Dict, Optional
from datetime import datetime
import uuid
from app.models.knowledge import KnowledgeDocument, KnowledgeSearchResult
from app.utils.db_connection import get_db_connection


class KnowledgeService:
    """
    知识库服务 - 负责心理咨询技术知识的存储与检索
    """
    
    def __init__(self):
        self.db = get_db_connection()
        self.collection_name = "psychological_knowledge"
        self._ensure_indexes()
        
        # 内存缓存（用于无数据库时的降级）
        self._in_memory_cache: List[Dict] = []
        self._fallback_mode = False

    def _ensure_indexes(self):
        """
        确保必要的索引存在
        """
        try:
            collection = self.db.get_collection(self.collection_name)
            # 创建文本索引用于全文搜索
            collection.create_index([
                ("content", "text"),
                ("title", "text"),
                ("tags", "text"),
                ("techniques", "text"),
                ("applicable_issues", "text")
            ])
            # 创建分类索引
            collection.create_index([("category", 1)])
            collection.create_index([("source", 1)])
            print(f"[KnowledgeService] Indexes ensured for {self.collection_name}")
        except Exception as e:
            print(f"[KnowledgeService] DB not available, entering fallback mode: {e}")
            self._fallback_mode = True

    async def add_document(self, doc: KnowledgeDocument) -> str:
        """
        添加知识文档
        """
        document = doc.model_dump()
        document["_id"] = str(uuid.uuid4())
        document["created_at"] = datetime.utcnow()
        document["updated_at"] = datetime.utcnow()
        
        if self._fallback_mode:
            self._in_memory_cache.append(document)
            return document["_id"]
        
        try:
            collection = self.db.get_collection(self.collection_name)
            result = collection.insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            print(f"[KnowledgeService] Insert error: {e}")
            self._fallback_mode = True
            self._in_memory_cache.append(document)
            return document["_id"]

    async def bulk_add_documents(self, docs: List[KnowledgeDocument]) -> List[str]:
        """
        批量添加知识文档
        """
        ids = []
        for doc in docs:
            doc_id = await self.add_document(doc)
            ids.append(doc_id)
        return ids

    async def search_knowledge(
        self, 
        query: str, 
        category: Optional[str] = None,
        top_k: int = 5
    ) -> List[KnowledgeSearchResult]:
        """
        搜索知识库 - 关键词匹配 + 语义相关性
        """
        results = []
        
        if self._fallback_mode or not self.db.is_connected():
            # 降级模式：内存搜索
            results = self._search_in_memory(query, category, top_k)
        else:
            # 数据库搜索
            results = self._search_in_db(query, category, top_k)
        
        return results

    def _search_in_db(
        self, 
        query: str, 
        category: Optional[str],
        top_k: int
    ) -> List[KnowledgeSearchResult]:
        """
        数据库全文搜索
        """
        try:
            collection = self.db.get_collection(self.collection_name)
            
            # 构建搜索管道
            pipeline = []
            
            # 文本搜索阶段
            search_stage = {
                "$search": {
                    "$text": {
                        "$search": query
                    }
                }
            }
            pipeline.append(search_stage)
            
            # 分类过滤
            if category:
                pipeline.append({"$match": {"category": category}})
            
            # 计算相关性得分
            pipeline.append({
                "$addFields": {
                    "relevance_score": {"$meta": "textScore"}
                }
            })
            
            # 排序和限制
            pipeline.append({"$sort": {"relevance_score": -1}})
            pipeline.append({"$limit": top_k})
            
            # 投影
            pipeline.append({
                "$project": {
                    "title": 1,
                    "source": 1,
                    "author": 1,
                    "category": 1,
                    "tags": 1,
                    "content": 1,
                    "techniques": 1,
                    "applicable_issues": 1,
                    "relevance_score": 1
                }
            })
            
            cursor = collection.aggregate(pipeline)
            results = []
            
            for doc in cursor:
                knowledge_doc = KnowledgeDocument(
                    id=str(doc["_id"]) if "_id" in doc else None,
                    title=doc.get("title", ""),
                    source=doc.get("source", ""),
                    author=doc.get("author"),
                    category=doc.get("category", ""),
                    tags=doc.get("tags", []),
                    content=doc.get("content", ""),
                    techniques=doc.get("techniques", []),
                    applicable_issues=doc.get("applicable_issues", [])
                )
                
                # 提取匹配的关键词
                matched_keywords = self._extract_matched_keywords(
                    query, knowledge_doc
                )
                
                results.append(KnowledgeSearchResult(
                    document=knowledge_doc,
                    relevance_score=doc.get("relevance_score", 0.0),
                    matched_keywords=matched_keywords
                ))
            
            # 如果全文搜索无结果，降级为关键词匹配
            if not results:
                results = self._keyword_fallback_search(
                    collection, query, category, top_k
                )
            
            return results
            
        except Exception as e:
            print(f"[KnowledgeService] Search error: {e}")
            return []

    def _keyword_fallback_search(
        self, 
        collection, 
        query: str, 
        category: Optional[str],
        top_k: int
    ) -> List[KnowledgeSearchResult]:
        """
        关键词匹配降级搜索
        """
        # 提取查询关键词
        keywords = self._extract_keywords(query)
        
        if not keywords:
            return []
        
        # 构建OR查询
        or_conditions = []
        for kw in keywords:
            or_conditions.append({"content": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"title": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"tags": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"techniques": {"$regex": kw, "$options": "i"}})
        
        filter_query = {"$or": or_conditions}
        if category:
            filter_query["category"] = category
        
        cursor = collection.find(filter_query).limit(top_k * 3)
        
        # 计算简单相关性
        scored_docs = []
        for doc in cursor:
            score = self._calculate_relevance(query, doc)
            if score > 0:
                knowledge_doc = KnowledgeDocument(
                    id=str(doc["_id"]),
                    title=doc.get("title", ""),
                    source=doc.get("source", ""),
                    author=doc.get("author"),
                    category=doc.get("category", ""),
                    tags=doc.get("tags", []),
                    content=doc.get("content", ""),
                    techniques=doc.get("techniques", []),
                    applicable_issues=doc.get("applicable_issues", [])
                )
                
                matched = self._extract_matched_keywords(query, knowledge_doc)
                
                scored_docs.append(KnowledgeSearchResult(
                    document=knowledge_doc,
                    relevance_score=score,
                    matched_keywords=matched
                ))
        
        # 排序并返回top_k
        scored_docs.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored_docs[:top_k]

    def _search_in_memory(
        self, 
        query: str, 
        category: Optional[str],
        top_k: int
    ) -> List[KnowledgeSearchResult]:
        """
        内存搜索（降级模式）
        """
        scored_docs = []
        
        for doc in self._in_memory_cache:
            if category and doc.get("category") != category:
                continue
            
            score = self._calculate_relevance(query, doc)
            if score > 0:
                knowledge_doc = KnowledgeDocument(
                    id=doc.get("_id", doc.get("id")),
                    title=doc.get("title", ""),
                    source=doc.get("source", ""),
                    author=doc.get("author"),
                    category=doc.get("category", ""),
                    tags=doc.get("tags", []),
                    content=doc.get("content", ""),
                    techniques=doc.get("techniques", []),
                    applicable_issues=doc.get("applicable_issues", [])
                )
                
                matched = self._extract_matched_keywords(query, knowledge_doc)
                
                scored_docs.append(KnowledgeSearchResult(
                    document=knowledge_doc,
                    relevance_score=score,
                    matched_keywords=matched
                ))
        
        scored_docs.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored_docs[:top_k]

    def _calculate_relevance(self, query: str, doc: Dict) -> float:
        """
        计算文档与查询的相关性得分
        """
        keywords = self._extract_keywords(query)
        if not keywords:
            return 0.0
        
        score = 0.0
        
        # 提取文档的可搜索文本（排除datetime等不可序列化字段）
        searchable_fields = ['title', 'content', 'tags', 'techniques', 'applicable_issues', 'category', 'source']
        doc_text_parts = []
        for field in searchable_fields:
            value = doc.get(field, '')
            if isinstance(value, list):
                doc_text_parts.append(' '.join(str(v) for v in value))
            elif isinstance(value, str):
                doc_text_parts.append(value)
            elif value:
                doc_text_parts.append(str(value))
        
        doc_text = ' '.join(doc_text_parts).lower()
        query_lower = query.lower()
        
        # 完整匹配加分
        if query_lower in doc_text:
            score += 5.0
        
        # 关键词匹配
        for kw in keywords:
            if kw.lower() in doc_text:
                score += 1.0
                # 内容中出现加更多分
                content = doc.get("content", "").lower()
                if kw.lower() in content:
                    score += 2.0
        
        return score

    def _extract_keywords(self, text: str) -> List[str]:
        """
        提取关键词（简单分词）
        """
        # 移除标点符号
        import re
        clean_text = re.sub(r'[^\u4e00-\u9fff\w\s]', ' ', text)
        
        # 按空格分割（处理英文）
        words = clean_text.split()
        
        # 对于中文，简单地按2字滑动窗口
        chinese_text = ''.join([c for c in text if '\u4e00' <= c <= '\u9fff'])
        
        keywords = list(words)
        if len(chinese_text) >= 2:
            for i in range(len(chinese_text) - 1):
                keywords.append(chinese_text[i:i+2])
        
        return [k.strip() for k in keywords if len(k.strip()) > 0]

    def _extract_matched_keywords(
        self, 
        query: str, 
        doc: KnowledgeDocument
    ) -> List[str]:
        """
        提取匹配的关键词
        """
        keywords = self._extract_keywords(query)
        matched = []
        
        doc_text = f"{doc.title} {doc.content} {' '.join(doc.tags)} {' '.join(doc.techniques)}"
        
        for kw in keywords:
            if kw.lower() in doc_text.lower():
                matched.append(kw)
        
        return matched

    async def get_relevant_knowledge_for_chat(
        self, 
        user_message: str,
        user_profile: Optional[Dict] = None
    ) -> str:
        """
        获取与用户消息相关的知识（用于RAG增强）
        """
        # 提取可能的心理问题类型
        issue_keywords = self._detect_issue_type(user_message)
        
        # 搜索相关知识
        search_query = user_message
        if issue_keywords:
            search_query = f"{user_message} {' '.join(issue_keywords)}"
        
        results = await self.search_knowledge(search_query, top_k=3)
        
        # 格式化返回相关知识
        if not results:
            return ""
        
        knowledge_context = "\n\n相关心理咨询知识参考：\n"
        for i, result in enumerate(results, 1):
            doc = result.document
            knowledge_context += f"""
[{i}] 《{doc.title}》({doc.source})
核心内容：{doc.content[:300]}
相关技术：{', '.join(doc.techniques[:5]) if doc.techniques else '暂无'}
适用问题：{', '.join(doc.applicable_issues[:3]) if doc.applicable_issues else '暂无'}
"""
        
        return knowledge_context.strip()

    def _detect_issue_type(self, message: str) -> List[str]:
        """
        检测用户消息中的心理问题类型
        """
        issue_patterns = {
            "情绪": ["情绪", "心情", "难过", "开心", "烦躁", "焦虑"],
            "压力": ["压力", "学习", "考试", "成绩", "作业"],
            "人际": ["朋友", "同学", "社交", "孤独", "被欺负"],
            "家庭": ["父母", "家人", "家庭", "沟通", "吵架"],
            "自我认同": ["自卑", "自信", "长相", "身材", "不喜欢自己"],
            "创伤": ["创伤", "伤害", "虐待", "失去", "离别"],
            "睡眠": ["失眠", "睡觉", "做梦", "早醒"],
            "饮食": ["吃不下", "暴食", "厌食", "体重"],
            "自伤意念": ["不想活", "想死", "活着没意思"]
        }
        
        detected = []
        message_lower = message.lower()
        
        for issue_type, keywords in issue_patterns.items():
            for kw in keywords:
                if kw in message_lower:
                    detected.append(issue_type)
                    break
        
        return list(set(detected))

    async def import_from_json(self, json_path: str) -> int:
        """
        从JSON文件导入知识
        """
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            docs = []
            for item in data:
                doc = KnowledgeDocument(
                    title=item.get("title", ""),
                    source=item.get("source", ""),
                    author=item.get("author"),
                    category=item.get("category", ""),
                    tags=item.get("tags", []),
                    content=item.get("content", ""),
                    techniques=item.get("techniques", []),
                    applicable_issues=item.get("applicable_issues", [])
                )
                docs.append(doc)
            
            ids = await self.bulk_add_documents(docs)
            print(f"[KnowledgeService] Imported {len(ids)} documents from {json_path}")
            return len(ids)
            
        except Exception as e:
            print(f"[KnowledgeService] Import error: {e}")
            return 0

    async def get_stats(self) -> Dict:
        """
        获取知识库统计信息
        """
        try:
            if self._fallback_mode:
                return {
                    "total_documents": len(self._in_memory_cache),
                    "mode": "fallback_memory",
                    "categories": list(set(d.get("category", "uncategorized") for d in self._in_memory_cache))
                }
            
            collection = self.db.get_collection(self.collection_name)
            total = collection.count_documents({})
            categories = collection.distinct("category")
            
            return {
                "total_documents": total,
                "mode": "database",
                "categories": categories,
                "connection_status": "connected" if self.db.is_connected() else "disconnected"
            }
        except Exception as e:
            return {
                "total_documents": len(self._in_memory_cache),
                "mode": "fallback_memory",
                "error": str(e)
            }
