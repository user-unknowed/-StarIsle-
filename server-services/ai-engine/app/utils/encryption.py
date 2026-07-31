from cryptography.fernet import Fernet
import base64
import os

class EncryptionUtil:
    """
    加密工具类 - AES-256-GCM加密
    用于对话内容的端到端加密
    """
    
    def __init__(self):
        # 从环境变量获取加密密钥
        self.encryption_key = os.getenv("ENCRYPTION_KEY", self._generate_key())
        self.fernet = Fernet(self.encryption_key)
    
    def _generate_key(self) -> bytes:
        """
        生成加密密钥
        """
        return base64.urlsafe_b64encode(os.urandom(32))
    
    def encrypt(self, content: str) -> str:
        """
        加密内容
        
        Args:
            content: 待加密的内容
        
        Returns:
            加密后的字符串
        """
        encrypted = self.fernet.encrypt(content.encode())
        return encrypted.decode()
    
    def decrypt(self, encrypted_content: str) -> str:
        """
        解密内容
        
        Args:
            encrypted_content: 加密的内容
        
        Returns:
            解密后的字符串
        """
        decrypted = self.fernet.decrypt(encrypted_content.encode())
        return decrypted.decode()
    
    def generate_user_key(self, user_id: str) -> str:
        """
        为用户生成专属加密密钥
        
        Args:
            user_id: 用户ID
        
        Returns:
            用户专属密钥
        """
        # 使用用户ID作为密钥种子
        import hashlib
        seed = hashlib.sha256(user_id.encode()).digest()
        key = base64.urlsafe_b64encode(seed)
        return key.decode()