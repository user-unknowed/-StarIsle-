package com.starisle.utils;

import com.starisle.service.KeyManagerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class EncryptionUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final KeyManagerService keyManager;

    @Autowired
    public EncryptionUtil(KeyManagerService keyManager) {
        this.keyManager = keyManager;
    }

    public String encrypt(String content) throws Exception {
        if (content == null || content.isEmpty()) {
            throw new IllegalArgumentException("Content cannot be null or empty");
        }
        return keyManager.encrypt(content);
    }

    public String decrypt(String encryptedContent) throws Exception {
        if (encryptedContent == null || encryptedContent.isEmpty()) {
            throw new IllegalArgumentException("Encrypted content cannot be null or empty");
        }
        return keyManager.decrypt(encryptedContent);
    }

    public String generateUserKey(String userId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] seed = digest.digest(userId.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().encodeToString(seed);
        } catch (Exception e) {
            return generateRandomKey();
        }
    }

    public String generateRandomKey() {
        byte[] keyBytes = new byte[32];
        SecureRandom random = new SecureRandom();
        random.nextBytes(keyBytes);
        return Base64.getUrlEncoder().encodeToString(keyBytes);
    }

    public boolean validateEncryptedFormat(String encryptedContent) {
        if (encryptedContent == null || encryptedContent.isEmpty()) {
            return false;
        }
        String[] parts = encryptedContent.split(":", 2);
        return parts.length == 2 && parts[0].startsWith("v") && !parts[1].isEmpty();
    }

    public boolean validateKeyVersion(String version) {
        return keyManager.isValidKeyVersion(version);
    }
}
