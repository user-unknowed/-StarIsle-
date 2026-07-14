package com.starisle.utils;

import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class EncryptionUtil {
    
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    
    private final String encryptionKey;
    
    public EncryptionUtil() {
        String key = System.getenv("ENCRYPTION_KEY");
        if (key == null || key.isEmpty()) {
            key = generateKey();
        }
        this.encryptionKey = key;
    }
    
    private String generateKey() {
        byte[] keyBytes = new byte[32];
        SecureRandom random = new SecureRandom();
        random.nextBytes(keyBytes);
        return Base64.getUrlEncoder().encodeToString(keyBytes);
    }
    
    public String encrypt(String content) throws Exception {
        byte[] keyBytes = Base64.getUrlDecoder().decode(encryptionKey);
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
        
        return Base64.getUrlEncoder().encodeToString(combined);
    }
    
    public String decrypt(String encryptedContent) throws Exception {
        byte[] combined = Base64.getUrlDecoder().decode(encryptedContent);
        
        byte[] iv = new byte[GCM_IV_LENGTH];
        byte[] encryptedBytes = new byte[combined.length - GCM_IV_LENGTH];
        System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
        System.arraycopy(combined, GCM_IV_LENGTH, encryptedBytes, 0, encryptedBytes.length);
        
        byte[] keyBytes = Base64.getUrlDecoder().decode(encryptionKey);
        SecretKeySpec keySpec = new SecretKeySpec(keyBytes, ALGORITHM);
        
        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);
        
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
        
        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }
    
    public String generateUserKey(String userId) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] seed = digest.digest(userId.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().encodeToString(seed);
        } catch (Exception e) {
            return generateKey();
        }
    }
}