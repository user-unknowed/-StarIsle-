"""
submission_service.py - 投稿服务（文章/问卷投稿与审核）

所属模块：ai-engine/app/services
功能简述：
    管理用户投稿（心理科普文章、问卷），支持提交、查询状态，
    以及管理员审核（通过/拒绝）。
依赖关系：
    - app.utils.db_connection：MongoDB 连接
    - uuid/datetime：通用工具
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.utils.db_connection import get_db_connection


class SubmissionService:
    """
    投稿服务 - 文章/问卷投稿与审核

    用户可投稿心理科普文章或问卷，经管理员审核后发布到知识库。
    """

    def __init__(self):
        self.db = get_db_connection()
        self.collection_name = "submissions"
        # 内存降级存储：key=submission_id, value=submission dict
        self._in_memory_submissions: Dict[str, Dict] = {}
        self._fallback_mode = False
        try:
            self.db.get_collection(self.collection_name)
        except Exception:
            self._fallback_mode = True
            print("[SubmissionService] DB not available, entering fallback mode")

    def create_submission(
        self,
        user_id: str,
        title: str,
        content: str,
        submission_type: str = "article",
        category: str = "",
        tags: Optional[List[str]] = None,
    ) -> Dict:
        """
        创建投稿。

        Args:
            user_id: 投稿用户 ID
            title: 标题
            content: 内容
            submission_type: 类型（article / assessment）
            category: 分类
            tags: 标签列表

        Returns:
            Dict: 投稿信息
        """
        sub_id = str(uuid.uuid4())
        submission = {
            "_id": sub_id,
            "user_id": user_id,
            "title": title,
            "content": content,
            "type": submission_type,
            "category": category,
            "tags": tags or [],
            "status": "pending",  # pending / approved / rejected
            "review_note": "",
            "created_at": datetime.utcnow(),
            "reviewed_at": None,
        }
        if self._fallback_mode:
            self._in_memory_submissions[sub_id] = submission
        else:
            try:
                collection = self.db.get_collection(self.collection_name)
                collection.insert_one(submission)
            except Exception:
                pass
        return self._serialize(submission)

    def list_my_submissions(self, user_id: str) -> List[Dict]:
        """获取用户自己的投稿列表。"""
        if self._fallback_mode:
            subs = [s for s in self._in_memory_submissions.values() if s.get("user_id") == user_id]
            subs.sort(key=lambda s: s.get("created_at", datetime.min), reverse=True)
            return [self._serialize(s) for s in subs]

        try:
            collection = self.db.get_collection(self.collection_name)
            cursor = collection.find({"user_id": user_id}).sort("created_at", -1)
            return [self._serialize(s) for s in cursor]
        except Exception:
            return []

    def list_pending(self) -> List[Dict]:
        """获取待审核投稿列表（管理员用）。"""
        if self._fallback_mode:
            subs = [s for s in self._in_memory_submissions.values() if s.get("status") == "pending"]
            subs.sort(key=lambda s: s.get("created_at", datetime.min))
            return [self._serialize(s) for s in subs]

        try:
            collection = self.db.get_collection(self.collection_name)
            cursor = collection.find({"status": "pending"}).sort("created_at", 1)
            return [self._serialize(s) for s in cursor]
        except Exception:
            return []

    def review(self, submission_id: str, approved: bool, note: str = "") -> Dict:
        """
        审核投稿。

        Args:
            submission_id: 投稿 ID
            approved: 是否通过
            note: 审核备注

        Returns:
            Dict: 审核结果
        """
        status = "approved" if approved else "rejected"
        if self._fallback_mode:
            sub = self._in_memory_submissions.get(submission_id)
            if sub:
                sub["status"] = status
                sub["review_note"] = note
                sub["reviewed_at"] = datetime.utcnow()
            return {"submission_id": submission_id, "status": status, "note": note}

        try:
            collection = self.db.get_collection(self.collection_name)
            collection.update_one(
                {"_id": submission_id},
                {"$set": {"status": status, "review_note": note, "reviewed_at": datetime.utcnow()}},
            )
            return {"submission_id": submission_id, "status": status, "note": note}
        except Exception:
            return {"submission_id": submission_id, "status": status}

    def _serialize(self, sub: Dict) -> Dict:
        return {
            "submission_id": str(sub["_id"]),
            "title": sub.get("title", ""),
            "type": sub.get("type", "article"),
            "category": sub.get("category", ""),
            "tags": sub.get("tags", []),
            "status": sub.get("status", "pending"),
            "review_note": sub.get("review_note", ""),
            "created_at": sub["created_at"].isoformat() if sub.get("created_at") else None,
        }
