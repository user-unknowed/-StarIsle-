"""
db_connection.py - MongoDB 数据库连接管理（支持降级模式）

所属模块：ai-engine/app/utils
功能简述：
    以单例模式管理 MongoDB 连接池，连接参数通过环境变量（MONGO_URI / MONGO_DB_NAME）配置。
    当 pymongo 未安装或连接失败时，自动切换到降级模式（内存缓存），保证服务可用性。
依赖关系：
    - pymongo：MongoDB 官方驱动（可选，缺失时降级）
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

    支持降级模式：当 pymongo 不可用或连接失败时自动切换到内存缓存，
    通过 get_db_connection 工厂函数获取唯一实例。
    """
    _instance: Optional['DatabaseConnection'] = None  # 单例实例
    _client = None          # MongoDB 客户端
    _db = None              # 当前数据库引用
    _fallback_mode = False  # 是否处于降级模式

    def __new__(cls):
        # 单例创建：仅首次实例化时创建对象
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None and not self._fallback_mode:
            self._initialize_connection()

    def _initialize_connection(self):
        """
        初始化 MongoDB 连接，失败时切换至降级模式。
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
        获取集合引用（仅在数据库模式下可用）。

        Args:
            collection_name: 集合名称

        Returns:
            MongoDB 集合引用对象

        Raises:
            RuntimeError: 处于降级模式或未连接时抛出
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
        检查连接状态，通过 ping 命令验证连接是否存活。

        Returns:
            bool: 已连接返回 True，否则返回 False
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
        是否为降级模式。

        Returns:
            bool: 处于降级模式返回 True
        """
        return self._fallback_mode

    def close(self):
        """
        关闭连接并重置单例实例。
        """
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            DatabaseConnection._instance = None
            print("[DB] MongoDB connection closed")


def get_db_connection() -> DatabaseConnection:
    """
    获取数据库连接单例实例。

    Returns:
        DatabaseConnection: 数据库连接管理器实例
    """
    return DatabaseConnection()
