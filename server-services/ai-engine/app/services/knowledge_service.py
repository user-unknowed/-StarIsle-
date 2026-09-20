"""
knowledge_service.py - 知识库服务（心理咨询技术知识检索增强 RAG）
所属模块：ai-engine/app/services
"""
import os
import json
from typing import List, Dict, Optional
from datetime import datetime
import uuid
from app.models.knowledge import KnowledgeDocument, KnowledgeSearchResult
from app.utils.db_connection import get_db_connection


class KnowledgeService:
    def __init__(self):
        self.db = get_db_connection()
        self.collection_name = "psychological_knowledge"
        self._ensure_indexes()
        self._in_memory_cache: List[Dict] = []
        self._fallback_mode = False

    def _ensure_indexes(self):
        try:
            collection = self.db.get_collection(self.collection_name)
            collection.create_index([("content", "text"), ("title", "text"), ("tags", "text"), ("techniques", "text"), ("applicable_issues", "text")])
            collection.create_index([("category", 1)])
            collection.create_index([("source", 1)])
        except Exception as e:
            print(f"[KnowledgeService] DB not available, entering fallback mode: {e}")
            self._fallback_mode = True

    async def add_document(self, doc: KnowledgeDocument) -> str:
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
            self._fallback_mode = True
            self._in_memory_cache.append(document)
            return document["_id"]

    async def bulk_add_documents(self, docs: List[KnowledgeDocument]) -> List[str]:
        ids = []
        for doc in docs:
            ids.append(await self.add_document(doc))
        return ids

    async def search_knowledge(self, query: str, category: Optional[str] = None, top_k: int = 5) -> List[KnowledgeSearchResult]:
        if self._fallback_mode or not self.db.is_connected():
            return self._search_in_memory(query, category, top_k)
        return self._search_in_db(query, category, top_k)

    def _search_in_db(self, query: str, category: Optional[str], top_k: int) -> List[KnowledgeSearchResult]:
        try:
            collection = self.db.get_collection(self.collection_name)
            pipeline = [{"$match": {"$text": {"$search": query}}}]
            if category: pipeline.append({"$match": {"category": category}})
            pipeline.append({"$addFields": {"relevance_score": {"$meta": "textScore"}}})
            pipeline.append({"$sort": {"relevance_score": -1}})
            pipeline.append({"$limit": top_k})
            cursor = collection.aggregate(pipeline)
            results = []
            for doc in cursor:
                knowledge_doc = KnowledgeDocument(id=str(doc["_id"]) if "_id" in doc else None, title=doc.get("title", ""), source=doc.get("source", ""), author=doc.get("author"), category=doc.get("category", ""), tags=doc.get("tags", []), content=doc.get("content", ""), techniques=doc.get("techniques", []), applicable_issues=doc.get("applicable_issues", []))
                matched = self._extract_matched_keywords(query, knowledge_doc)
                results.append(KnowledgeSearchResult(document=knowledge_doc, relevance_score=doc.get("relevance_score", 0.0), matched_keywords=matched))
            if not results: results = self._keyword_fallback_search(collection, query, category, top_k)
            return results
        except Exception as e:
            return []

    def _keyword_fallback_search(self, collection, query: str, category: Optional[str], top_k: int) -> List[KnowledgeSearchResult]:
        keywords = self._extract_keywords(query)
        if not keywords: return []
        or_conditions = []
        for kw in keywords:
            or_conditions.append({"content": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"title": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"tags": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"techniques": {"$regex": kw, "$options": "i"}})
        filter_query = {"$or": or_conditions}
        if category: filter_query["category"] = category
        cursor = collection.find(filter_query).limit(top_k * 3)
        scored = []
        for doc in cursor:
            score = self._calculate_relevance(query, doc)
            if score > 0:
                knowledge_doc = KnowledgeDocument(id=str(doc["_id"]), title=doc.get("title", ""), source=doc.get("source", ""), author=doc.get("author"), category=doc.get("category", ""), tags=doc.get("tags", []), content=doc.get("content", ""), techniques=doc.get("techniques", []), applicable_issues=doc.get("applicable_issues", []))
                matched = self._extract_matched_keywords(query, knowledge_doc)
                scored.append(KnowledgeSearchResult(document=knowledge_doc, relevance_score=score, matched_keywords=matched))
        scored.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored[:top_k]

    def _search_in_memory(self, query: str, category: Optional[str], top_k: int) -> List[KnowledgeSearchResult]:
        scored = []
        for doc in self._in_memory_cache:
            if category and doc.get("category") != category: continue
            score = self._calculate_relevance(query, doc)
            if score > 0:
                knowledge_doc = KnowledgeDocument(id=doc.get("_id", doc.get("id")), title=doc.get("title", ""), source=doc.get("source", ""), author=doc.get("author"), category=doc.get("category", ""), tags=doc.get("tags", []), content=doc.get("content", ""), techniques=doc.get("techniques", []), applicable_issues=doc.get("applicable_issues", []))
                matched = self._extract_matched_keywords(query, knowledge_doc)
                scored.append(KnowledgeSearchResult(document=knowledge_doc, relevance_score=score, matched_keywords=matched))
        scored.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored[:top_k]

    def _calculate_relevance(self, query: str, doc: Dict) -> float:
        keywords = self._extract_keywords(query)
        if not keywords: return 0.0
        score = 0.0
        searchable = ['title', 'content', 'tags', 'techniques', 'applicable_issues', 'category', 'source']
        parts = []
        for field in searchable:
            v = doc.get(field, '')
            if isinstance(v, list): parts.append(' '.join(str(x) for x in v))
            elif isinstance(v, str): parts.append(v)
            elif v: parts.append(str(v))
        doc_text = ' '.join(parts).lower()
        query_lower = query.lower()
        if query_lower in doc_text: score += 5.0
        for kw in keywords:
            if kw.lower() in doc_text:
                score += 1.0
                if kw.lower() in doc.get("content", "").lower(): score += 2.0
        return score

    def _extract_keywords(self, text: str) -> List[str]:
        import re
        clean = re.sub(r'[^\u4e00-\u9fff\w\s]', ' ', text)
        words = clean.split()
        chinese = ''.join([c for c in text if '\u4e00' <= c <= '\u9fff'])
        keywords = list(words)
        if len(chinese) >= 2:
            for i in range(len(chinese) - 1):
                keywords.append(chinese[i:i+2])
        return [k.strip() for k in keywords if len(k.strip()) > 0]

    def _extract_matched_keywords(self, query: str, doc: KnowledgeDocument) -> List[str]:
        keywords = self._extract_keywords(query)
        doc_text = f"{doc.title} {doc.content} {' '.join(doc.tags)} {' '.join(doc.techniques)}"
        return [kw for kw in keywords if kw.lower() in doc_text.lower()]

    async def get_relevant_knowledge_for_chat(self, user_message: str, user_profile: Optional[Dict] = None) -> str:
        issue_keywords = self._detect_issue_type(user_message)
        search_query = user_message
        if issue_keywords:
            search_query = f"{user_message} {' '.join(issue_keywords)}"
        results = await self.search_knowledge(search_query, top_k=3)
        if not results: return ""
        ctx = "\n\n相关心理咨询知识参考：\n"
        for i, result in enumerate(results, 1):
            doc = result.document
            ctx += f"\n[{i}] 《{doc.title}》({doc.source})\n核心内容：{doc.content[:300]}\n相关技术：{', '.join(doc.techniques[:5]) if doc.techniques else '暂无'}\n适用问题：{', '.join(doc.applicable_issues[:3]) if doc.applicable_issues else '暂无'}\n"
        return ctx.strip()

    def _detect_issue_type(self, message: str) -> List[str]:
        patterns = {
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
        msg_lower = message.lower()
        for issue_type, keywords in patterns.items():
            for kw in keywords:
                if kw in msg_lower:
                    detected.append(issue_type)
                    break
        return list(set(detected))

    async def import_from_json(self, json_path: str) -> int:
        import logging as _lg
        log = _lg.getLogger("knowledge_service.import_json")
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            seen = set(); deduped = []
            for item in data:
                k = (item.get("title"), item.get("source"))
                if k in seen: continue
                seen.add(k); deduped.append(item)
            log.info("Knowledge dedup %d -> %d", len(data), len(deduped))
            data = deduped
            docs = []
            for item in data:
                docs.append(KnowledgeDocument(title=item.get("title", ""), source=item.get("source", ""), author=item.get("author"), category=item.get("category", ""), tags=item.get("tags", []), content=item.get("content", ""), techniques=item.get("techniques", []), applicable_issues=item.get("applicable_issues", []), source_repo_id=item.get("source_repo_id")))
            ids = await self.bulk_add_documents(docs)
            return len(ids)
        except Exception as e:
            print(f"[KnowledgeService] Import error: {e}")
            return 0

    async def get_stats(self) -> Dict:
        try:
            if self._fallback_mode:
                return {"total_documents": len(self._in_memory_cache), "mode": "fallback_memory", "categories": list(set(d.get("category", "uncategorized") for d in self._in_memory_cache))}
            collection = self.db.get_collection(self.collection_name)
            total = collection.count_documents({})
            categories = collection.distinct("category")
            return {"total_documents": total, "mode": "database", "categories": categories, "connection_status": "connected" if self.db.is_connected() else "disconnected"}
        except Exception as e:
            return {"total_documents": len(self._in_memory_cache), "mode": "fallback_memory", "error": str(e)}
