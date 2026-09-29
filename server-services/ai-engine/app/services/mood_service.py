"""
mood_service.py - 情绪打卡服务

所属模块：ai-engine/app/services
功能简述：
    记录用户每日情绪打卡（情绪类型、强度、备注），支持查询历史。
依赖关系：
    - app.utils.db_connection：MongoDB 连接
    - uuid/datetime：通用工具
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.utils.db_connection import get_db_connection


class MoodService:
    """
    情绪打卡服务 - 记录与查询用户情绪状态

    支持提交情绪打卡、查询打卡历史，用于个性化文章推荐等场景。
    """

    def __init__(self):
        self.db = get_db_connection()
        self.collection_name = "mood_checkins"
        # 内存降级存储：key=user_id, value=List[record]
        self._in_memory_checkins: Dict[str, List[Dict]] = {}
        self._fallback_mode = False
        try:
            self.db.get_collection(self.collection_name)
        except Exception:
            self._fallback_mode = True
            print("[MoodService] DB not available, entering fallback mode")

    def check_in(
        self,
        user_id: str,
        mood: str,
        intensity: int,
        note: Optional[str] = None,
    ) -> Dict:
        """
        提交情绪打卡。

        Args:
            user_id: 用户 ID
            mood: 情绪类型（happy/calm/neutral/sad/anxious/angry 等）
            intensity: 强度（1-10）
            note: 备注（可选）

        Returns:
            Dict: 打卡记录
        """
        intensity = max(1, min(10, intensity))
        record = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "mood": mood,
            "intensity": intensity,
            "note": note or "",
            "created_at": datetime.utcnow(),
        }
        if self._fallback_mode:
            self._in_memory_checkins.setdefault(user_id, []).append(record)
        else:
            try:
                collection = self.db.get_collection(self.collection_name)
                collection.insert_one(record)
            except Exception:
                pass
        return {
            "checkin_id": str(record["_id"]),
            "mood": mood,
            "intensity": intensity,
            "message": "打卡成功，星宝陪着你 🌟",
        }

    def get_history(self, user_id: str, limit: int = 30) -> List[Dict]:
        """
        获取用户情绪打卡历史。

        Args:
            user_id: 用户 ID
            limit: 返回条数上限

        Returns:
            List[Dict]: 打卡记录列表（按时间倒序）
        """
        if self._fallback_mode:
            records = self._in_memory_checkins.get(user_id, [])
            records = sorted(records, key=lambda r: r.get("created_at", datetime.min), reverse=True)[:limit]
            return [
                {
                    "checkin_id": str(r["_id"]),
                    "mood": r.get("mood", ""),
                    "intensity": r.get("intensity", 5),
                    "note": r.get("note", ""),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in records
            ]

        try:
            collection = self.db.get_collection(self.collection_name)
            cursor = collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
            return [
                {
                    "checkin_id": str(r["_id"]),
                    "mood": r.get("mood", ""),
                    "intensity": r.get("intensity", 5),
                    "note": r.get("note", ""),
                    "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                }
                for r in cursor
            ]
        except Exception:
            return []
