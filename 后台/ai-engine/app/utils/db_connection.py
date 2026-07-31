"""
数据库连接管理 - MongoDB 连接池（支持降级模式）
"""
import os
from typing import Optional

# 尝试导入 pymongo，如果不可用则使用降级模式
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False
    print("[DB] pymongo not installed, running in fallback mode")


class DatabaseConnection:
    """
    MongoDB 数据库连接管理器（单例模式）
    支持降级模式：当 pymongo 不可用时自动切换到内存缓存
    """
    _instance: Optional['DatabaseConnection'] = None
    _client = None
    _db = None
    _fallback_mode = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None and not self._fallback_mode:
            self._initialize_connection()

    def _initialize_connection(self):
        """
        初始化 MongoDB 连接
        """
        if not HAS_PYMONGO:
            self._fallback_mode = True
            print("[DB] Using fallback mode (in-memory cache)")
            return
        
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        db_name = os.getenv("MONGO_DB_NAME", "starisle_ai")
        
        try:
            self._client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=10,
                minPoolSize=2
            )
            self._client.admin.command('ping')
            self._db = self._client[db_name]
            print(f"[DB] MongoDB connected: {db_name}")
            
        except ConnectionFailure as e:
            print(f"[DB] MongoDB connection failed: {e}")
            self._client = None
            self._db = None
            self._fallback_mode = True
            print("[DB] Switched to fallback mode (in-memory cache)")
        except Exception as e:
            print(f"[DB] MongoDB error: {e}")
            self._client = None
            self._db = None
            self._fallback_mode = True
            print("[DB] Switched to fallback mode (in-memory cache)")

    def get_collection(self, collection_name: str):
        """
        获取集合引用（仅在数据库模式下可用）
        """
        if self._fallback_mode:
            raise RuntimeError("Running in fallback mode, database not available")
        if self._db is None:
            self._initialize_connection()
        if self._db is None:
            raise RuntimeError("MongoDB not connected")
        return self._db[collection_name]

    def is_connected(self) -> bool:
        """
        检查连接状态
        """
        if self._fallback_mode:
            return False
        if self._client is None:
            return False
        try:
            self._client.admin.command('ping')
            return True
        except:
            return False
    
    def is_fallback_mode(self) -> bool:
        """
        是否为降级模式
        """
        return self._fallback_mode

    def close(self):
        """
        关闭连接
        """
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            DatabaseConnection._instance = None
            print("[DB] MongoDB connection closed")


def get_db_connection() -> DatabaseConnection:
    """
    获取数据库连接实例
    """
    return DatabaseConnection()
