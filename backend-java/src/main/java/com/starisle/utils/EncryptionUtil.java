package com.starisle.utils;

import com.starisle.service.KeyManagerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 加密工具类
 * 委托 KeyManagerService 完成 AES/GCM 加解密，
 * 并提供用户级密钥派生、随机密钥生成与密文格式校验能力。
 */
@Component
public class EncryptionUtil {

    /** 对称加密算法 */
    private static final String ALGORITHM = "AES";
    /** 加密变换：AES + GCM + 无填充 */
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    /** GCM 初始化向量长度（字节） */
    private static final int GCM_IV_LENGTH = 12;
    /** GCM 认证标签长度（位） */
    private static final int GCM_TAG_LENGTH = 128;

    /** 密钥管理服务，负责实际加解密与密钥轮换 */
    private final KeyManagerService keyManager;

    /**
     * 构造方法
     *
     * @param keyManager 密钥管理服务
     */
    @Autowired
    public EncryptionUtil(KeyManagerService keyManager) {
        this.keyManager = keyManager;
    }

    /**
     * 加密内容
     * 校验输入非空后委托密钥管理服务执行加密。
     *
     * @param content 待加密明文
     * @return 加密后的密文
     * @throws Exception 当输入为空或加密失败时抛出
     */
    public String encrypt(String content) throws Exception {
        if (content == null || content.isEmpty()) {
            throw new IllegalArgumentException("Content cannot be null or empty");
        }
        return keyManager.encrypt(content);
    }

    /**
     * 解密内容
     * 校验输入非空后委托密钥管理服务执行解密。
     *
     * @param encryptedContent 待解密密文
     * @return 解密后的明文
     * @throws Exception 当输入为空或解密失败时抛出
     */
    public String decrypt(String encryptedContent) throws Exception {
        if (encryptedContent == null || encryptedContent.isEmpty()) {
            throw new IllegalArgumentException("Encrypted content cannot be null or empty");
        }
        return keyManager.decrypt(encryptedContent);
    }

    /**
     * 派生用户密钥
     * 对用户标识做 SHA-256 摘要并 Base64-URL 编码作为用户密钥，
     * 失败时回退为随机密钥。
     *
     * @param userId 用户标识
     * @return Base64-URL 编码的用户密钥
     */
    public String generateUserKey(String userId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] seed = digest.digest(userId.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().encodeToString(seed);
        } catch (Exception e) {
            return generateRandomKey();
        }
    }

    /**
     * 生成随机密钥
     * 使用安全随机数生成 32 字节并 Base64-URL 编码。
     *
     * @return Base64-URL 编码的随机密钥
     */
    public String generateRandomKey() {
        byte[] keyBytes = new byte[32];
        SecureRandom random = new SecureRandom();
        random.nextBytes(keyBytes);
        return Base64.getUrlEncoder().encodeToString(keyBytes);
    }

    /**
     * 校验密文格式
     * 约定密文以冒号分隔版本前缀与密文主体，前缀以 v 开头。
     *
     * @param encryptedContent 密文字符串
     * @return 格式合法返回 true，否则返回 false
     */
    public boolean validateEncryptedFormat(String encryptedContent) {
        if (encryptedContent == null || encryptedContent.isEmpty()) {
            return false;
        }
        String[] parts = encryptedContent.split(":", 2);
        return parts.length == 2 && parts[0].startsWith("v") && !parts[1].isEmpty();
    }

    /**
     * 校验密钥版本是否有效
     *
     * @param version 密钥版本
     * @return 有效返回 true，否则返回 false
     */
    public boolean validateKeyVersion(String version) {
        return keyManager.isValidKeyVersion(version);
    }
}
