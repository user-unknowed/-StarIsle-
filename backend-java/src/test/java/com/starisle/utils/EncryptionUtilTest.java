package com.starisle.utils;

import com.starisle.service.KeyManagerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EncryptionUtilTest {

    @Mock
    private KeyManagerService keyManagerService;

    @InjectMocks
    private EncryptionUtil encryptionUtil;

    @Test
    @DisplayName("测试加密和解密")
    void testEncryptDecrypt() throws Exception {
        String testContent = "test-content";
        String encrypted = "v1:encrypted-data";
        
        when(keyManagerService.encrypt(testContent)).thenReturn(encrypted);
        when(keyManagerService.decrypt(encrypted)).thenReturn(testContent);
        
        String result = encryptionUtil.encrypt(testContent);
        assertEquals(encrypted, result);
        
        String decrypted = encryptionUtil.decrypt(encrypted);
        assertEquals(testContent, decrypted);
    }

    @Test
    @DisplayName("测试加密空内容抛出异常")
    void testEncryptEmptyContent() {
        assertThrows(Exception.class, () -> encryptionUtil.encrypt(null));
        assertThrows(Exception.class, () -> encryptionUtil.encrypt(""));
    }

    @Test
    @DisplayName("测试解密空内容抛出异常")
    void testDecryptEmptyContent() {
        assertThrows(Exception.class, () -> encryptionUtil.decrypt(null));
        assertThrows(Exception.class, () -> encryptionUtil.decrypt(""));
    }

    @Test
    @DisplayName("测试生成用户密钥")
    void testGenerateUserKey() {
        String userId = "user-123";
        String key = encryptionUtil.generateUserKey(userId);
        
        assertNotNull(key);
        assertFalse(key.isEmpty());
        
        String sameKey = encryptionUtil.generateUserKey(userId);
        assertEquals(key, sameKey);
        
        String differentKey = encryptionUtil.generateUserKey("user-456");
        assertNotEquals(key, differentKey);
    }

    @Test
    @DisplayName("测试生成随机密钥")
    void testGenerateRandomKey() {
        String key1 = encryptionUtil.generateRandomKey();
        String key2 = encryptionUtil.generateRandomKey();
        
        assertNotNull(key1);
        assertNotNull(key2);
        assertFalse(key1.isEmpty());
        assertFalse(key2.isEmpty());
        assertNotEquals(key1, key2);
    }

    @Test
    @DisplayName("测试验证加密格式")
    void testValidateEncryptedFormat() {
        assertTrue(encryptionUtil.validateEncryptedFormat("v1:abc123"));
        assertTrue(encryptionUtil.validateEncryptedFormat("v2:xyz789"));
        
        assertFalse(encryptionUtil.validateEncryptedFormat(null));
        assertFalse(encryptionUtil.validateEncryptedFormat(""));
        assertFalse(encryptionUtil.validateEncryptedFormat("abc123"));
        assertFalse(encryptionUtil.validateEncryptedFormat("v1:"));
        assertFalse(encryptionUtil.validateEncryptedFormat(":abc123"));
    }

    @Test
    @DisplayName("测试验证密钥版本")
    void testValidateKeyVersion() {
        when(keyManagerService.isValidKeyVersion("v1")).thenReturn(true);
        when(keyManagerService.isValidKeyVersion("invalid")).thenReturn(false);
        
        assertTrue(encryptionUtil.validateKeyVersion("v1"));
        assertFalse(encryptionUtil.validateKeyVersion("invalid"));
    }
}
