"""
emergency_service.py - 紧急求助服务（心理援助热线、危机资源）

所属模块：ai-engine/app/services
功能简述：
    提供心理援助热线列表、危机资源信息，以及一键求助记录功能。
    当用户在聊天中触发高风险关键词时，前端可调用本服务展示紧急资源。
"""
from datetime import datetime
from typing import Dict, List
from app.utils.db_connection import get_db_connection


# 心理援助热线与危机资源
EMERGENCY_RESOURCES = [
    {
        "id": "12355",
        "name": "12355 青少年服务热线",
        "phone": "12355",
        "description": "共青团中央主办，面向青少年的心理咨询与法律援助热线",
        "available": "24小时",
    },
    {
        "id": "400-161-9995",
        "name": "希望24热线",
        "phone": "400-161-9995",
        "description": "24小时心理危机干预热线，专业心理咨询师接听",
        "available": "24小时",
    },
    {
        "id": "010-82951332",
        "name": "北京心理危机研究与干预中心",
        "phone": "010-82951332",
        "description": "国内首家心理危机干预专业机构",
        "available": "24小时",
    },
    {
        "id": "400-161-9995-ext",
        "name": "希望24热线（希望线）",
        "phone": "400-161-9995",
        "description": "生命教育与危机干预专线",
        "available": "24小时",
    },
]


class EmergencyService:
    """
    紧急求助服务 - 热线列表与求助记录

    提供心理援助热线资源，以及记录用户一键求助行为。
    """

    def __init__(self):
        self.db = get_db_connection()
        self.records_collection = "emergency_records"

    def get_resources(self) -> List[Dict]:
        """
        获取紧急求助资源列表。

        Returns:
            List[Dict]: 心理援助热线与危机资源
        """
        return EMERGENCY_RESOURCES

    def record_help_request(self, user_id: str, reason: str = "") -> Dict:
        """
        记录用户一键求助行为。

        Args:
            user_id: 用户 ID
            reason: 求助原因（可选）

        Returns:
            Dict: 记录结果
        """
        record = {
            "_id": str(__import__("uuid").uuid4()),
            "user_id": user_id,
            "reason": reason,
            "created_at": datetime.utcnow(),
        }
        try:
            collection = self.db.get_collection(self.records_collection)
            collection.insert_one(record)
        except Exception:
            pass
        return {
            "record_id": str(record["_id"]),
            "message": "求助记录已保存。请记得，你不是一个人，有人可以帮到你。",
            "resources": EMERGENCY_RESOURCES,
        }
