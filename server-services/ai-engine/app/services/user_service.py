"""
user_service.py - 用户服务（注册、登录、资料、帮帮者认证）

所属模块：ai-engine/app/services
功能简述：
    提供用户注册/登录（简单 token）、个人资料管理、帮帮者认证申请与状态查询，
    以及管理员角色标记。不使用复杂密码学，MVP 阶段以用户名+token 为主。
依赖关系：
    - app.utils.db_connection：MongoDB 连接
    - uuid/secrets/datetime：通用工具
"""
import uuid
import secrets
from datetime import datetime
from typing import Dict, List, Optional
from app.utils.db_connection import get_db_connection


class UserService:
    """
    用户服务 - 注册、登录、资料与帮帮者认证

    管理用户账户、个人资料、帮帮者认证流程与管理员权限。
    """

    def __init__(self):
        self.db = get_db_connection()
        self.users_collection = "users"
        # 内存降级存储：key=user_id, value=user dict
        self._in_memory_users: Dict[str, Dict] = {}
        self._fallback_mode = False
        # 尝试访问集合以判断是否处于降级模式
        try:
            self.db.get_collection(self.users_collection)
        except Exception:
            self._fallback_mode = True
            print("[UserService] DB not available, entering fallback mode")

    def register(self, username: str, nickname: str, password: str) -> Dict:
        """
        注册新用户。

        Args:
            username: 登录用户名
            nickname: 昵称
            password: 密码（MVP 阶段明文存储，生产需哈希）

        Returns:
            Dict: 含 user_id 与 token 的注册结果

        Raises:
            ValueError: 用户名已存在时抛出
        """
        if self._fallback_mode:
            # 降级模式：内存存储
            for u in self._in_memory_users.values():
                if u.get("username") == username:
                    raise ValueError("用户名已存在")
            user_id = str(uuid.uuid4())
            token = secrets.token_hex(32)
            user = {
                "_id": user_id,
                "username": username,
                "nickname": nickname,
                "password": password,
                "token": token,
                "role": "user",
                "helper_status": "none",
                "helper_application": None,
                "created_at": datetime.utcnow(),
            }
            self._in_memory_users[user_id] = user
            return {"user_id": user_id, "token": token, "nickname": nickname, "role": "user"}

        try:
            collection = self.db.get_collection(self.users_collection)
            if collection.find_one({"username": username}):
                raise ValueError("用户名已存在")
            user_id = str(uuid.uuid4())
            token = secrets.token_hex(32)
            user = {
                "_id": user_id,
                "username": username,
                "nickname": nickname,
                "password": password,
                "token": token,
                "role": "user",  # user / helper / admin
                "helper_status": "none",  # none / pending / approved / rejected
                "helper_application": None,
                "created_at": datetime.utcnow(),
            }
            collection.insert_one(user)
            return {"user_id": user_id, "token": token, "nickname": nickname, "role": "user"}
        except ValueError:
            raise
        except Exception:
            # 降级模式：内存模拟
            user_id = str(uuid.uuid4())
            token = secrets.token_hex(32)
            return {"user_id": user_id, "token": token, "nickname": nickname, "role": "user"}

    def login(self, username: str, password: str) -> Dict:
        """
        用户登录。

        Args:
            username: 用户名
            password: 密码

        Returns:
            Dict: 含 user_id、token、nickname、role 的登录结果

        Raises:
            ValueError: 用户名或密码错误时抛出
        """
        if self._fallback_mode:
            # 降级模式：从内存查找
            for u in self._in_memory_users.values():
                if u.get("username") == username and u.get("password") == password:
                    return {
                        "user_id": str(u["_id"]),
                        "token": u["token"],
                        "nickname": u["nickname"],
                        "role": u.get("role", "user"),
                        "helper_status": u.get("helper_status", "none"),
                    }
            raise ValueError("用户名或密码错误")

        try:
            collection = self.db.get_collection(self.users_collection)
            user = collection.find_one({"username": username, "password": password})
            if not user:
                raise ValueError("用户名或密码错误")
            return {
                "user_id": str(user["_id"]),
                "token": user["token"],
                "nickname": user["nickname"],
                "role": user.get("role", "user"),
                "helper_status": user.get("helper_status", "none"),
            }
        except ValueError:
            raise
        except Exception:
            raise ValueError("用户名或密码错误")

    def get_profile(self, user_id: str) -> Optional[Dict]:
        """
        获取用户资料。

        Args:
            user_id: 用户 ID

        Returns:
            Optional[Dict]: 用户资料（不含密码、token）
        """
        if self._fallback_mode:
            user = self._in_memory_users.get(user_id)
            if not user:
                return None
            return {
                "user_id": str(user["_id"]),
                "nickname": user.get("nickname", ""),
                "role": user.get("role", "user"),
                "helper_status": user.get("helper_status", "none"),
            }

        try:
            collection = self.db.get_collection(self.users_collection)
            user = collection.find_one({"_id": user_id})
            if not user:
                return None
            return {
                "user_id": str(user["_id"]),
                "nickname": user.get("nickname", ""),
                "role": user.get("role", "user"),
                "helper_status": user.get("helper_status", "none"),
            }
        except Exception:
            return None

    def update_profile(self, user_id: str, nickname: Optional[str] = None) -> Dict:
        """
        更新用户资料。

        Args:
            user_id: 用户 ID
            nickname: 新昵称（可选）

        Returns:
            Dict: 更新后的资料
        """
        if self._fallback_mode:
            user = self._in_memory_users.get(user_id)
            if user and nickname:
                user["nickname"] = nickname
            return self.get_profile(user_id) or {"user_id": user_id, "nickname": nickname or ""}

        try:
            collection = self.db.get_collection(self.users_collection)
            update = {}
            if nickname:
                update["nickname"] = nickname
            if update:
                collection.update_one({"_id": user_id}, {"$set": update})
            return self.get_profile(user_id) or {}
        except Exception:
            return {"user_id": user_id, "nickname": nickname or ""}

    def apply_helper(self, user_id: str, real_name: str, qualification: str, description: str) -> Dict:
        """
        提交帮帮者认证申请。

        Args:
            user_id: 用户 ID
            real_name: 真实姓名
            qualification: 资质说明（心理学背景、志愿者经历等）
            description: 自我介绍

        Returns:
            Dict: 申请结果
        """
        if self._fallback_mode:
            user = self._in_memory_users.get(user_id)
            if user:
                user["helper_status"] = "pending"
                user["helper_application"] = {
                    "real_name": real_name,
                    "qualification": qualification,
                    "description": description,
                    "applied_at": datetime.utcnow(),
                }
            return {"status": "pending", "message": "认证申请已提交，等待管理员审核"}

        try:
            collection = self.db.get_collection(self.users_collection)
            application = {
                "real_name": real_name,
                "qualification": qualification,
                "description": description,
                "applied_at": datetime.utcnow(),
            }
            collection.update_one(
                {"_id": user_id},
                {"$set": {"helper_status": "pending", "helper_application": application}},
            )
            return {"status": "pending", "message": "认证申请已提交，等待管理员审核"}
        except Exception:
            return {"status": "pending", "message": "认证申请已提交，等待管理员审核"}

    def get_helper_status(self, user_id: str) -> Dict:
        """
        查询帮帮者认证状态。

        Args:
            user_id: 用户 ID

        Returns:
            Dict: 认证状态与申请信息
        """
        if self._fallback_mode:
            user = self._in_memory_users.get(user_id)
            if not user:
                return {"helper_status": "none"}
            return {
                "helper_status": user.get("helper_status", "none"),
                "application": user.get("helper_application"),
            }

        try:
            collection = self.db.get_collection(self.users_collection)
            user = collection.find_one({"_id": user_id})
            if not user:
                return {"helper_status": "none"}
            return {
                "helper_status": user.get("helper_status", "none"),
                "application": user.get("helper_application"),
            }
        except Exception:
            return {"helper_status": "none"}

    def is_helper(self, user_id: str) -> bool:
        """
        检查用户是否为已认证帮帮者。

        Args:
            user_id: 用户 ID

        Returns:
            bool: 已认证返回 True
        """
        profile = self.get_profile(user_id)
        return bool(profile and profile.get("helper_status") == "approved")

    def is_admin(self, user_id: str) -> bool:
        """
        检查用户是否为管理员。

        Args:
            user_id: 用户 ID

        Returns:
            bool: 管理员返回 True
        """
        profile = self.get_profile(user_id)
        return bool(profile and profile.get("role") == "admin")

    def review_helper_application(self, user_id: str, approved: bool, note: str = "") -> Dict:
        """
        管理员审核帮帮者认证申请。

        Args:
            user_id: 申请用户 ID
            approved: 是否通过
            note: 审核备注

        Returns:
            Dict: 审核结果
        """
        status = "approved" if approved else "rejected"
        if self._fallback_mode:
            user = self._in_memory_users.get(user_id)
            if user:
                user["helper_status"] = status
                user["helper_review_note"] = note
                user["helper_reviewed_at"] = datetime.utcnow()
                if approved:
                    user["role"] = "helper"
            return {"user_id": user_id, "helper_status": status, "note": note}

        try:
            collection = self.db.get_collection(self.users_collection)
            update = {"helper_status": status, "helper_review_note": note, "helper_reviewed_at": datetime.utcnow()}
            if approved:
                update["role"] = "helper"
            collection.update_one({"_id": user_id}, {"$set": update})
            return {"user_id": user_id, "helper_status": status, "note": note}
        except Exception:
            return {"user_id": user_id, "helper_status": status, "note": note}

    def list_helper_applications(self) -> List[Dict]:
        """
        获取所有待审核的帮帮者申请列表（管理员用）。

        Returns:
            List[Dict]: 待审核申请列表
        """
        if self._fallback_mode:
            apps = []
            for u in self._in_memory_users.values():
                if u.get("helper_status") == "pending" and u.get("helper_application"):
                    apps.append({
                        "user_id": u["_id"],
                        "nickname": u.get("nickname", ""),
                        "application": u.get("helper_application"),
                    })
            return apps

        try:
            collection = self.db.get_collection(self.users_collection)
            cursor = collection.find({"helper_status": "pending"})
            return [
                {
                    "user_id": str(u["_id"]),
                    "nickname": u.get("nickname", ""),
                    "application": u.get("helper_application"),
                }
                for u in cursor
            ]
        except Exception:
            return []
