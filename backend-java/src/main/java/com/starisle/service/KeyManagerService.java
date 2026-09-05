package com.starisle.service;

import com.starisle.entity.EncryptionKey;
import com.starisle.repository.EncryptionKeyRepository;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 密钥管理服务
 * 基于 AES/GCM 提供数据加解密能力，管理多版本密钥的创建、轮换、停用与过期清理，
 * 并使用主密钥对存储中的密钥值进行二次加密保护。
 */
@Service
public class KeyManagerService {

    /** 对称加密算法 */
    private static final String ALGORITHM = "AES";
    /** 加密变换：AES + GCM + 无填充 */
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    /** GCM 初始化向量长度（字节） */
    private static final int GCM_IV_LENGTH = 12;
    /** GCM 认证标签长度（位） */
    private static final int GCM_TAG_LENGTH = 128;
    /** 密钥字节长度 */
    private static final int KEY_SIZE = 32;

    /** 密钥仓库，负责密钥实体持久化 */
    @Autowired
    private EncryptionKeyRepository keyRepository;

    /** 默认密钥，由配置 starisle.encryption.key 指定 */
    @Value("${starisle.encryption.key:}")
    private String defaultKey;

    /** 主密钥，用于加密存储中的密钥值，由配置 starisle.encryption.master-key 指定 */
    @Value("${starisle.encryption.master-key:starisle-master-key-2026-must-be-32-bytes}")
    private String masterKey;

    /** 活动密钥缓存：版本 -> 解密后的密钥值 */
    private final Map<String, String> activeKeys = new ConcurrentHashMap<>();

    /**
     * 初始化回调
     * 加载活动密钥并确保默认密钥存在。
     */
    @PostConstruct
    public void init() {
        loadActiveKeys();
        ensureDefaultKeyExists();
    }

    /**
     * 加载活动密钥
     * 从仓库读取所有活动密钥，使用主密钥解密后放入缓存。
     */
    private void loadActiveKeys() {
        List<EncryptionKey> keys = keyRepository.findByKeyTypeAndIsActiveTrue("encryption");
        for (EncryptionKey key : keys) {
            try {
                String decryptedKey = decryptKeyWithMaster(key.getKeyValue());
                activeKeys.put(key.getKeyVersion(), decryptedKey);
            } catch (Exception e) {
                System.err.println("Failed to load key: " + key.getKeyVersion());
            }
        }
    }

    /**
     * 确保默认密钥存在
     * 若无活动密钥则使用配置或新生成的密钥创建默认版本。
     */
    private void ensureDefaultKeyExists() {
        Optional<EncryptionKey> activeKey = keyRepository.findTopByKeyTypeAndIsActiveTrueOrderByCreatedAtDesc("encryption");

        if (activeKey.isEmpty()) {
            String keyValue;
            if (defaultKey != null && !defaultKey.isEmpty()) {
                keyValue = defaultKey;
            } else {
                keyValue = generateNewKey();
            }

            createKey("default", keyValue);
        }
    }

    /**
     * 获取当前密钥版本
     *
     * @return 当前活动密钥版本，无则返回 v1
     */
    public String getCurrentKeyVersion() {
        Optional<EncryptionKey> activeKey = keyRepository.findTopByKeyTypeAndIsActiveTrueOrderByCreatedAtDesc("encryption");
        return activeKey.map(EncryptionKey::getKeyVersion).orElse("v1");
    }

    /**
     * 加密内容
     * 使用当前密钥版本进行加密。
     *
     * @param content 待加密明文
     * @return 形如 "版本:Base64(IV+密文)" 的密文
     * @throws Exception 当加密失败时抛出
     */
    public String encrypt(String content) throws Exception {
        return encrypt(content, getCurrentKeyVersion());
    }

    /**
     * 加密内容
     * 使用指定版本密钥进行 AES/GCM 加密，输出格式为 "版本:Base64(IV+密文)"。
     *
     * @param content    待加密明文
     * @param keyVersion 密钥版本
     * @return 形如 "版本:Base64(IV+密文)" 的密文
     * @throws Exception 当密钥版本不存在或加密失败时抛出
     */
    public String encrypt(String content, String keyVersion) throws Exception {
        String key = activeKeys.get(keyVersion);
        if (key == null) {
            throw new RuntimeException("Key version not found: " + keyVersion);
        }

        byte[] keyBytes = Base64.getUrlDecoder().decode(key);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGORITHM);

        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

        byte[] encryptedBytes = cipher.doFinal(content.getBytes(StandardCharsets.UTF_8));

        byte[] combined = new byte[iv.length + encryptedBytes.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

        return keyVersion + ":" + Base64.getUrlEncoder().encodeToString(combined);
    }

    /**
     * 解密内容
     * 解析密文中的版本与密文主体，使用对应版本密钥进行 AES/GCM 解密。
     *
     * @param encryptedContent 形如 "版本:Base64(IV+密文)" 的密文
     * @return 解密后的明文
     * @throws Exception 当输入非法或解密失败时抛出
     */
    public String decrypt(String encryptedContent) throws Exception {
        if (encryptedContent == null || encryptedContent.isEmpty()) {
            throw new IllegalArgumentException("Encrypted content cannot be null or empty");
        }

        String[] parts = encryptedContent.split(":", 2);
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid encrypted content format");
        }

        String keyVersion = parts[0];
        String encodedData = parts[1];

        String key = activeKeys.get(keyVersion);
        if (key == null) {
            throw new RuntimeException("Key version not found: " + keyVersion);
        }

        byte[] combined = Base64.getUrlDecoder().decode(encodedData);

        byte[] iv = new byte[GCM_IV_LENGTH];
        byte[] encryptedBytes = new byte[combined.length - GCM_IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
        System.arraycopy(combined, GCM_IV_LENGTH, encryptedBytes, 0, encryptedBytes.length);

        byte[] keyBytes = Base64.getUrlDecoder().decode(key);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGORITHM);

        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);

        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    /**
     * 创建密钥
     * 使用主密钥加密密钥值后持久化，并加入活动密钥缓存。
     *
     * @param version  密钥版本
     * @param keyValue 密钥明文值
     * @return 密钥版本
     */
    @Transactional
    public String createKey(String version, String keyValue) {
        try {
            String encryptedKey = encryptKeyWithMaster(keyValue);

            EncryptionKey key = EncryptionKey.builder()
                    .keyId(version)
                    .keyVersion(version)
                    .keyType("encryption")
                    .keyValue(encryptedKey)
                    .isActive(true)
                    .expiresAt(null)
                    .build();

            keyRepository.save(key);
            activeKeys.put(version, keyValue);

            return version;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create key", e);
        }
    }

    /**
     * 轮换密钥
     * 生成新版本密钥并将其他活动密钥置为停用。
     *
     * @return 新密钥版本
     */
    @Transactional
    public String rotateKey() {
        String newVersion = "v" + (System.currentTimeMillis() / 1000);
        String newKey = generateNewKey();

        createKey(newVersion, newKey);

        List<EncryptionKey> oldKeys = keyRepository.findByKeyTypeAndIsActiveTrue("encryption");
        for (EncryptionKey oldKey : oldKeys) {
            if (!oldKey.getKeyVersion().equals(newVersion)) {
                oldKey.setIsActive(false);
                keyRepository.save(oldKey);
                activeKeys.remove(oldKey.getKeyVersion());
            }
        }

        return newVersion;
    }

    /**
     * 新增密钥版本
     * 仅创建新版本，不停用其他活动密钥。
     *
     * @return 新密钥版本
     */
    @Transactional
    public String addNewVersion() {
        String newVersion = "v" + (System.currentTimeMillis() / 1000);
        String newKey = generateNewKey();

        createKey(newVersion, newKey);

        return newVersion;
    }

    /**
     * 停用指定版本密钥
     *
     * @param version 密钥版本
     */
    @Transactional
    public void deactivateKey(String version) {
        Optional<EncryptionKey> key = keyRepository.findByKeyVersionAndKeyTypeAndIsActiveTrue(version, "encryption");
        key.ifPresent(k -> {
            k.setIsActive(false);
            keyRepository.save(k);
            activeKeys.remove(version);
        });
    }

    /**
     * 列出所有密钥
     *
     * @return 密钥实体列表
     */
    public List<EncryptionKey> listAllKeys() {
        return keyRepository.findAll();
    }

    /**
     * 获取密钥信息
     *
     * @param version 密钥版本
     * @return 密钥信息字符串，不存在返回未找到提示
     */
    public String getKeyInfo(String version) {
        Optional<EncryptionKey> key = keyRepository.findByKeyVersionAndKeyTypeAndIsActiveTrue(version, "encryption");
        if (key.isPresent()) {
            EncryptionKey k = key.get();
            return String.format("Key Version: %s, Active: %s, Created: %s",
                    k.getKeyVersion(), k.getIsActive(), k.getCreatedAt());
        }
        return "Key not found: " + version;
    }

    /**
     * 生成新密钥
     * 使用安全随机数生成 32 字节并 Base64-URL 编码。
     *
     * @return Base64-URL 编码的新密钥
     */
    public String generateNewKey() {
        byte[] keyBytes = new byte[KEY_SIZE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(keyBytes);
        return Base64.getUrlEncoder().encodeToString(keyBytes);
    }

    /**
     * 使用主密钥加密密钥值
     * 主密钥不足 32 字节时补零对齐。
     *
     * @param keyValue 密钥明文值
     * @return Base64-URL 编码的加密密钥值
     * @throws Exception 当加密失败时抛出
     */
    private String encryptKeyWithMaster(String keyValue) throws Exception {
        byte[] masterKeyBytes = masterKey.getBytes(StandardCharsets.UTF_8);
        if (masterKeyBytes.length < KEY_SIZE) {
            byte[] padded = new byte[KEY_SIZE];
            System.arraycopy(masterKeyBytes, 0, padded, 0, masterKeyBytes.length);
            masterKeyBytes = padded;
        }

        SecretKeySpec keySpec = new SecretKeySpec(masterKeyBytes, ALGORITHM);

        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

        byte[] encryptedBytes = cipher.doFinal(keyValue.getBytes(StandardCharsets.UTF_8));

        byte[] combined = new byte[iv.length + encryptedBytes.length];
        System.arraycopy(iv, 0, combined, 0, iv.length);
        System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

        return Base64.getUrlEncoder().encodeToString(combined);
    }

    /**
     * 使用主密钥解密密钥值
     * 主密钥不足 32 字节时补零对齐。
     *
     * @param encryptedKey Base64-URL 编码的加密密钥值
     * @return 解密后的密钥明文值
     * @throws Exception 当解密失败时抛出
     */
    private String decryptKeyWithMaster(String encryptedKey) throws Exception {
        byte[] masterKeyBytes = masterKey.getBytes(StandardCharsets.UTF_8);
        if (masterKeyBytes.length < KEY_SIZE) {
            byte[] padded = new byte[KEY_SIZE];
            System.arraycopy(masterKeyBytes, 0, padded, 0, masterKeyBytes.length);
            masterKeyBytes = padded;
        }

        byte[] combined = Base64.getUrlDecoder().decode(encryptedKey);

        byte[] iv = new byte[GCM_IV_LENGTH];
        byte[] encryptedBytes = new byte[combined.length - GCM_IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
        System.arraycopy(combined, GCM_IV_LENGTH, encryptedBytes, 0, encryptedBytes.length);

        SecretKeySpec keySpec = new SecretKeySpec(masterKeyBytes, ALGORITHM);

        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);

        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    /**
     * 定时清理过期密钥
     * 每日凌晨 3 点将已过期且仍活动的密钥置为停用并移出缓存。
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupExpiredKeys() {
        List<EncryptionKey> expiredKeys = keyRepository.findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime.now());
        for (EncryptionKey key : expiredKeys) {
            key.setIsActive(false);
            keyRepository.save(key);
            activeKeys.remove(key.getKeyVersion());
        }
    }

    /**
     * 获取活动密钥数量
     *
     * @return 活动密钥缓存大小
     */
    public int getActiveKeyCount() {
        return activeKeys.size();
    }

    /**
     * 校验密钥版本是否有效
     *
     * @param version 密钥版本
     * @return 存在且活动返回 true，否则返回 false
     */
    public boolean isValidKeyVersion(String version) {
        return activeKeys.containsKey(version);
    }
}
