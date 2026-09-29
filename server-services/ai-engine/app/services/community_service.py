"""
community_service.py - 树人互助社区服务（求助帖、回复、标签等级）

所属模块：ai-engine/app/services
功能简述：
    管理互助社区的求助帖与回复。求助帖按标签紧急等级优先排序；
    仅已认证帮帮者可回复。提供发帖、列表、详情、回复等接口。
依赖关系：
    - app.utils.db_connection：MongoDB 连接
    - app.services.user_service：帮帮者权限校验
    - uuid/datetime：通用工具
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.utils.db_connection import get_db_connection


# 紧急等级定义：1=低, 2=中, 3=高, 4=紧急, 5=危机
URGENCY_LEVELS = {
    1: {"name": "日常倾诉", "color": "#9E9E9E"},
    2: {"name": "需要倾听", "color": "#4CAF50"},
    3: {"name": "希望得到建议", "color": "#FFC107"},
    4: {"name": "情绪压力较大", "color": "#FF9800"},
    5: {"name": "急需陪伴", "color": "#F44336"},
}


class CommunityService:
    """
    树人互助社区服务 - 求助帖与回复管理

    求助帖按紧急等级倒序排列，高等级优先展示。
    仅已认证帮帮者（helper_status=approved）可发表回复。
    """

    def __init__(self, user_service):
        self.db = get_db_connection()
        self.posts_collection = "community_posts"
        self.replies_collection = "community_replies"
        self.user_service = user_service
        # 内存降级存储
        self._in_memory_posts: Dict[str, Dict] = {}
        self._in_memory_replies: Dict[str, List[Dict]] = {}
        self._fallback_mode = False
        try:
            self.db.get_collection(self.posts_collection)
        except Exception:
            self._fallback_mode = True
            print("[CommunityService] DB not available, entering fallback mode")

    def create_post(
        self,
        user_id: str,
        title: str,
        content: str,
        tags: List[str],
        urgency_level: int = 2,
    ) -> Dict:
        """
        发布求助帖。

        Args:
            user_id: 发帖用户 ID
            title: 标题
            content: 内容
            tags: 标签列表
            urgency_level: 紧急等级（1-5）

        Returns:
            Dict: 新建帖子信息
        """
        urgency_level = max(1, min(5, urgency_level))
        post_id = str(uuid.uuid4())
        post = {
            "_id": post_id,
            "user_id": user_id,
            "title": title,
            "content": content,
            "tags": tags,
            "urgency_level": urgency_level,
            "status": "open",  # open / resolved / closed
            "reply_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        if self._fallback_mode:
            self._in_memory_posts[post_id] = post
        else:
            try:
                collection = self.db.get_collection(self.posts_collection)
                collection.insert_one(post)
            except Exception:
                pass  # 降级模式
        return self._serialize_post(post)

    def list_posts(self, page: int = 1, page_size: int = 20) -> Dict:
        """
        获取求助帖列表，按紧急等级倒序 + 时间倒序排列。

        Args:
            page: 页码
            page_size: 每页条数

        Returns:
            Dict: 帖子列表与分页信息
        """
        if self._fallback_mode:
            all_posts = [p for p in self._in_memory_posts.values() if p.get("status") != "closed"]
            all_posts.sort(key=lambda p: (-p.get("urgency_level", 2), p.get("created_at", datetime.min)))
            skip = (page - 1) * page_size
            page_posts = all_posts[skip:skip + page_size]
            return {
                "posts": [self._serialize_post(p) for p in page_posts],
                "total": len(all_posts),
                "page": page,
                "page_size": page_size,
            }

        try:
            collection = self.db.get_collection(self.posts_collection)
            skip = (page - 1) * page_size
            cursor = (
                collection.find({"status": {"$ne": "closed"}})
                .sort([("urgency_level", -1), ("created_at", -1)])
                .skip(skip)
                .limit(page_size)
            )
            posts = [self._serialize_post(p) for p in cursor]
            total = collection.count_documents({"status": {"$ne": "closed"}})
            return {"posts": posts, "total": total, "page": page, "page_size": page_size}
        except Exception:
            return {"posts": [], "total": 0, "page": page, "page_size": page_size}

    def get_post(self, post_id: str) -> Optional[Dict]:
        """
        获取帖子详情。

        Args:
            post_id: 帖子 ID

        Returns:
            Optional[Dict]: 帖子详情（含回复列表）
        """
        if self._fallback_mode:
            post = self._in_memory_posts.get(post_id)
            if not post:
                return None
            result = self._serialize_post(post)
            result["replies"] = self._get_replies(post_id)
            return result

        try:
            collection = self.db.get_collection(self.posts_collection)
            post = collection.find_one({"_id": post_id})
            if not post:
                return None
            result = self._serialize_post(post)
            result["replies"] = self._get_replies(post_id)
            return result
        except Exception:
            return None

    def reply_post(self, post_id: str, user_id: str, content: str) -> Dict:
        """
        回复求助帖（仅已认证帮帮者可回复）。

        Args:
            post_id: 帖子 ID
            user_id: 回复用户 ID
            content: 回复内容

        Returns:
            Dict: 回复结果

        Raises:
            PermissionError: 用户未认证帮帮者时抛出
            ValueError: 帖子不存在时抛出
        """
        # 权限校验：必须是已认证帮帮者
        if not self.user_service.is_helper(user_id):
            raise PermissionError("仅已认证帮帮者可以回复求助帖")

        if self._fallback_mode:
            post = self._in_memory_posts.get(post_id)
            if not post:
                raise ValueError("帖子不存在")
            reply_id = str(uuid.uuid4())
            reply = {
                "_id": reply_id,
                "post_id": post_id,
                "user_id": user_id,
                "content": content,
                "created_at": datetime.utcnow(),
            }
            self._in_memory_replies.setdefault(post_id, []).append(reply)
            post["reply_count"] = post.get("reply_count", 0) + 1
            post["updated_at"] = datetime.utcnow()
            return {
                "reply_id": reply_id,
                "post_id": post_id,
                "content": content,
                "created_at": reply["created_at"].isoformat(),
            }

        try:
            collection = self.db.get_collection(self.posts_collection)
            post = collection.find_one({"_id": post_id})
            if not post:
                raise ValueError("帖子不存在")

            reply_id = str(uuid.uuid4())
            reply = {
                "_id": reply_id,
                "post_id": post_id,
                "user_id": user_id,
                "content": content,
                "created_at": datetime.utcnow(),
            }
            replies_collection = self.db.get_collection(self.replies_collection)
            replies_collection.insert_one(reply)

            # 更新帖子回复数
            collection.update_one(
                {"_id": post_id},
                {"$inc": {"reply_count": 1}, "$set": {"updated_at": datetime.utcnow()}},
            )

            return {
                "reply_id": reply_id,
                "post_id": post_id,
                "content": content,
                "created_at": reply["created_at"].isoformat(),
            }
        except (PermissionError, ValueError):
            raise
        except Exception:
            return {"reply_id": str(uuid.uuid4()), "post_id": post_id, "content": content}

    def _get_replies(self, post_id: str) -> List[Dict]:
        """获取帖子的回复列表（按时间正序）。"""
        if self._fallback_mode:
            replies = self._in_memory_replies.get(post_id, [])
            return [
                {
                    "reply_id": str(r["_id"]),
                    "user_id": r["user_id"],
                    "content": r["content"],
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in replies
            ]

        try:
            collection = self.db.get_collection(self.replies_collection)
            cursor = collection.find({"post_id": post_id}).sort("created_at", 1)
            return [
                {
                    "reply_id": str(r["_id"]),
                    "user_id": r["user_id"],
                    "content": r["content"],
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in cursor
            ]
        except Exception:
            return []

    def _serialize_post(self, post: Dict) -> Dict:
        """将数据库帖子序列化为前端可读结构。"""
        urgency = URGENCY_LEVELS.get(post.get("urgency_level", 2), URGENCY_LEVELS[2])
        return {
            "post_id": str(post["_id"]),
            "user_id": post.get("user_id"),
            "title": post.get("title", ""),
            "content": post.get("content", ""),
            "tags": post.get("tags", []),
            "urgency_level": post.get("urgency_level", 2),
            "urgency_name": urgency["name"],
            "urgency_color": urgency["color"],
            "status": post.get("status", "open"),
            "reply_count": post.get("reply_count", 0),
            "created_at": post["created_at"].isoformat() if post.get("created_at") else None,
        }
