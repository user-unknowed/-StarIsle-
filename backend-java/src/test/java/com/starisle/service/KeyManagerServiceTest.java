package com.starisle.service;

import com.starisle.entity.EncryptionKey;
import com.starisle.repository.EncryptionKeyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 密钥管理服务测试
 * 覆盖加解密一致性、密文格式校验、密钥生成与轮换、版本管理及密钥信息查询等场景。
 */
@ExtendWith(MockitoExtension.class)
public class KeyManagerServiceTest {

    /** 密钥仓库 Mock */
    @Mock
    private EncryptionKeyRepository keyRepository;

    /** 待测密钥管理服务，依赖注入上述 Mock */
    @InjectMocks
    private KeyManagerService keyManagerService;

    /**
     * 测试前置初始化
     * 注入主密钥字段（@Value 字段在 Mockito 测试中不会自动注入）。
     */
    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(keyManagerService, "masterKey", "test-master-key-32-bytes-long!!");
    }

    /**
     * 测试加密和解密的一致性
     */
    @Test
    @DisplayName("测试加密和解密的一致性")
    void testEncryptionDecryptionConsistency() throws Exception {
        String testContent = "test-secret-content-123";

        String encrypted = keyManagerService.encrypt(testContent);
        assertNotNull(encrypted);
        assertFalse(encrypted.isEmpty());
        assertTrue(encrypted.contains(":"));

        String decrypted = keyManagerService.decrypt(encrypted);
        assertEquals(testContent, decrypted);
    }

    /**
     * 测试加密后密文符合版本前缀格式
     */
    @Test
    @DisplayName("测试加密格式验证")
    void testEncryptedFormat() throws Exception {
        String testContent = "hello world";
        String encrypted = keyManagerService.encrypt(testContent);

        String[] parts = encrypted.split(":", 2);
        assertEquals(2, parts.length);
        assertTrue(parts[0].startsWith("v"));
        assertFalse(parts[1].isEmpty());
    }

    /**
     * 测试加密空内容或 null 抛出异常
     */
    @Test
    @DisplayName("测试加密空内容抛出异常")
    void testEncryptEmptyContent() {
        assertThrows(Exception.class, () -> keyManagerService.encrypt(null));
        assertThrows(Exception.class, () -> keyManagerService.encrypt(""));
    }

    /**
     * 测试解密 null、空串与非法格式抛出异常
     */
    @Test
    @DisplayName("测试解密无效格式抛出异常")
    void testDecryptInvalidFormat() {
        assertThrows(Exception.class, () -> keyManagerService.decrypt(null));
        assertThrows(Exception.class, () -> keyManagerService.decrypt(""));
        assertThrows(Exception.class, () -> keyManagerService.decrypt("invalid-format"));
        assertThrows(Exception.class, () -> keyManagerService.decrypt("v1:"));
    }

    /**
     * 测试连续生成新密钥互不相同
     */
    @Test
    @DisplayName("测试生成新密钥")
    void testGenerateNewKey() {
        String key1 = keyManagerService.generateNewKey();
        String key2 = keyManagerService.generateNewKey();

        assertNotNull(key1);
        assertNotNull(key2);
        assertFalse(key1.isEmpty());
        assertFalse(key2.isEmpty());
        assertNotEquals(key1, key2);
    }

    /**
     * 测试当前密钥版本以 v 开头或为 default
     */
    @Test
    @DisplayName("测试获取当前密钥版本")
    void testGetCurrentKeyVersion() {
        String version = keyManagerService.getCurrentKeyVersion();
        assertNotNull(version);
        assertTrue(version.startsWith("v") || version.equals("default"));
    }

    /**
     * 测试密钥轮换生成新版本且新版本有效
     */
    @Test
    @DisplayName("测试密钥轮换")
    void testRotateKey() {
        String oldVersion = keyManagerService.getCurrentKeyVersion();
        String newVersion = keyManagerService.rotateKey();

        assertNotNull(newVersion);
        assertTrue(newVersion.startsWith("v"));
        assertNotEquals(oldVersion, newVersion);

        assertTrue(keyManagerService.isValidKeyVersion(newVersion));
    }

    /**
     * 测试新增密钥版本有效
     */
    @Test
    @DisplayName("测试添加新密钥版本")
    void testAddNewVersion() {
        String version = keyManagerService.addNewVersion();

        assertNotNull(version);
        assertTrue(version.startsWith("v"));
        assertTrue(keyManagerService.isValidKeyVersion(version));
    }

    /**
     * 测试密钥版本校验逻辑
     */
    @Test
    @DisplayName("测试验证密钥版本")
    void testValidateKeyVersion() {
        String currentVersion = keyManagerService.getCurrentKeyVersion();

        assertTrue(keyManagerService.isValidKeyVersion(currentVersion));
        assertFalse(keyManagerService.isValidKeyVersion("nonexistent-version"));
    }

    /**
     * 测试活动密钥数量至少为 1
     */
    @Test
    @DisplayName("测试获取活动密钥数量")
    void testGetActiveKeyCount() {
        int count = keyManagerService.getActiveKeyCount();
        assertTrue(count >= 1);
    }

    /**
     * 测试从仓库查询密钥列表
     */
    @Test
    @DisplayName("测试列出所有密钥")
    void testListAllKeys() {
        List<EncryptionKey> keys = new ArrayList<>();
        keys.add(EncryptionKey.builder()
                .keyVersion("v1")
                .keyType("encryption")
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build());

        when(keyRepository.findAll()).thenReturn(keys);

        List<EncryptionKey> result = keyManagerService.listAllKeys();
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("v1", result.get(0).getKeyVersion());
    }

    /**
     * 测试获取密钥信息，包括存在与不存在两种情况
     */
    @Test
    @DisplayName("测试密钥信息获取")
    void testGetKeyInfo() {
        String currentVersion = keyManagerService.getCurrentKeyVersion();
        String info = keyManagerService.getKeyInfo(currentVersion);

        assertNotNull(info);
        assertTrue(info.contains(currentVersion));

        String nonExistentInfo = keyManagerService.getKeyInfo("nonexistent");
        assertTrue(nonExistentInfo.contains("not found"));
    }

    /**
     * 回归测试：解密密文长度不足 IV 长度时应抛出 IllegalArgumentException，
     * 而非 NegativeArraySizeException（避免未捕获的运行时崩溃）。
     */
    @Test
    @DisplayName("解密过短密文抛出 IllegalArgumentException 而非 NegativeArraySizeException")
    void testDecryptShortCiphertextThrowsIllegalArgument() {
        // 向活动密钥缓存注入一个合法密钥，使解密能走到密文长度校验分支
        String validKey = keyManagerService.generateNewKey();
        java.util.Map<String, String> activeKeys =
                (java.util.Map<String, String>) ReflectionTestUtils.getField(keyManagerService, "activeKeys");
        activeKeys.put("v1", validKey);

        // 构造一个 Base64 解码后不足 12 字节的密文主体
        String shortPayload = Base64.getUrlEncoder().encodeToString(new byte[5]);
        String shortCiphertext = "v1:" + shortPayload;

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> keyManagerService.decrypt(shortCiphertext));
        assertTrue(ex.getMessage().contains("too short"));
    }

    /**
     * 回归测试：主密钥长度超过 32 字节时仍能正常加解密，
     * 避免 SecretKeySpec 因密钥长度非法抛出 InvalidKeyException。
     */
    @Test
    @DisplayName("主密钥超过 32 字节时加解密仍正常工作")
    void testMasterKeyLongerThan32BytesWorks() throws Exception {
        // 设置一个 40 字节的主密钥
        ReflectionTestUtils.setField(keyManagerService, "masterKey",
                "this-is-a-very-long-master-key-exceeding-32-bytes!");

        // 生成密钥并加入活动缓存
        String validKey = keyManagerService.generateNewKey();
        java.util.Map<String, String> activeKeys =
                (java.util.Map<String, String>) ReflectionTestUtils.getField(keyManagerService, "activeKeys");
        activeKeys.put("v1", validKey);

        String content = "sensitive mental health data";
        String encrypted = keyManagerService.encrypt(content, "v1");
        String decrypted = keyManagerService.decrypt(encrypted);

        assertEquals(content, decrypted);
    }

    /**
     * 回归测试：主密钥长度不足 32 字节时仍能正常加解密（补零对齐）。
     */
    @Test
    @DisplayName("主密钥不足 32 字节时加解密仍正常工作")
    void testMasterKeyShorterThan32BytesWorks() throws Exception {
        // 设置一个 16 字节的主密钥
        ReflectionTestUtils.setField(keyManagerService, "masterKey", "short-key-16byte");

        String validKey = keyManagerService.generateNewKey();
        java.util.Map<String, String> activeKeys =
                (java.util.Map<String, String>) ReflectionTestUtils.getField(keyManagerService, "activeKeys");
        activeKeys.put("v1", validKey);

        String content = "sensitive mental health data";
        String encrypted = keyManagerService.encrypt(content, "v1");
        String decrypted = keyManagerService.decrypt(encrypted);

        assertEquals(content, decrypted);
    }
}
