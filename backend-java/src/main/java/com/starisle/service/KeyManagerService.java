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

@Service
public class KeyManagerService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int KEY_SIZE = 32;

    @Autowired
    private EncryptionKeyRepository keyRepository;

    @Value("${starisle.encryption.key:}")
    private String defaultKey;

    @Value("${starisle.encryption.master-key:starisle-master-key-2026-must-be-32-bytes}")
    private String masterKey;

    private final Map<String, String> activeKeys = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        loadActiveKeys();
        ensureDefaultKeyExists();
    }

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

    public String getCurrentKeyVersion() {
        Optional<EncryptionKey> activeKey = keyRepository.findTopByKeyTypeAndIsActiveTrueOrderByCreatedAtDesc("encryption");
        return activeKey.map(EncryptionKey::getKeyVersion).orElse("v1");
    }

    public String encrypt(String content) throws Exception {
        return encrypt(content, getCurrentKeyVersion());
    }

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

    @Transactional
    public String addNewVersion() {
        String newVersion = "v" + (System.currentTimeMillis() / 1000);
        String newKey = generateNewKey();

        createKey(newVersion, newKey);

        return newVersion;
    }

    @Transactional
    public void deactivateKey(String version) {
        Optional<EncryptionKey> key = keyRepository.findByKeyVersionAndKeyTypeAndIsActiveTrue(version, "encryption");
        key.ifPresent(k -> {
            k.setIsActive(false);
            keyRepository.save(k);
            activeKeys.remove(version);
        });
    }

    public List<EncryptionKey> listAllKeys() {
        return keyRepository.findAll();
    }

    public String getKeyInfo(String version) {
        Optional<EncryptionKey> key = keyRepository.findByKeyVersionAndKeyTypeAndIsActiveTrue(version, "encryption");
        if (key.isPresent()) {
            EncryptionKey k = key.get();
            return String.format("Key Version: %s, Active: %s, Created: %s",
                    k.getKeyVersion(), k.getIsActive(), k.getCreatedAt());
        }
        return "Key not found: " + version;
    }

    public String generateNewKey() {
        byte[] keyBytes = new byte[KEY_SIZE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(keyBytes);
        return Base64.getUrlEncoder().encodeToString(keyBytes);
    }

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

    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupExpiredKeys() {
        List<EncryptionKey> expiredKeys = keyRepository.findByExpiresAtBeforeAndIsActiveTrue(LocalDateTime.now());
        for (EncryptionKey key : expiredKeys) {
            key.setIsActive(false);
            keyRepository.save(key);
            activeKeys.remove(key.getKeyVersion());
        }
    }

    public int getActiveKeyCount() {
        return activeKeys.size();
    }

    public boolean isValidKeyVersion(String version) {
        return activeKeys.containsKey(version);
    }
}
