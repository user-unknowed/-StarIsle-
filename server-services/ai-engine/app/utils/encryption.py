"""
encryption.py - 对话内容加密工具

所属模块：ai-engine/app/utils
功能简述：
    基于 Fernet（对称加密）封装对话内容的端到端加密与解密能力，
    密钥来源于环境变量 ENCRYPTION_KEY，缺失时自动生成随机密钥。
依赖关系：
    - cryptography.fernet：对称加密实现
"""
from cryptography.fernet import Fernet
import base64
import os

class EncryptionUtil:
    """
    加密工具类 - 基于 Fernet 的对称加密

    用于对话内容的端到端加密，密钥优先取自环境变量 ENCRYPTION_KEY，
    未配置时自动生成随机密钥。同时支持按用户生成专属密钥。
    """

    def __init__(self):
        # 从环境变量获取加密密钥，未配置则随机生成
        self.encryption_key = os.getenv("ENCRYPTION_KEY", self._generate_key())
        self.fernet = Fernet(self.encryption_key)

    def _generate_key(self) -> bytes:
        """
        随机生成 Fernet 加密密钥。

        Returns:
            bytes: 经 urlsafe base64 编码的 32 字节密钥
        """
        return base64.urlsafe_b64encode(os.urandom(32))

    def encrypt(self, content: str) -> str:
        """
        加密内容。

        Args:
            content: 待加密的明文内容

        Returns:
            str: 加密后的密文字符串
        """
        encrypted = self.fernet.encrypt(content.encode())
        return encrypted.decode()

    def decrypt(self, encrypted_content: str) -> str:
        """
        解密内容。

        Args:
            encrypted_content: 加密后的密文内容

        Returns:
            str: 解密后的明文字符串
        """
        decrypted = self.fernet.decrypt(encrypted_content.encode())
        return decrypted.decode()

    def generate_user_key(self, user_id: str) -> str:
        """
        为用户生成专属加密密钥。

        Args:
            user_id: 用户ID

        Returns:
            str: 用户专属密钥（字符串形式）
        """
        # 使用用户ID作为密钥种子，经 SHA256 派生固定密钥
        import hashlib
        seed = hashlib.sha256(user_id.encode()).digest()
        key = base64.urlsafe_b64encode(seed)
        return key.decode()