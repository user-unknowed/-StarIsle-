package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.entity.EncryptionKey;
import com.starisle.service.KeyManagerService;
import com.starisle.service.MigrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    @Autowired
    private MigrationService migrationService;

    @Autowired
    private KeyManagerService keyManagerService;

    @PostMapping("/execute")
    public ResponseEntity<ApiResponse<MigrationService.MigrationResult>> executeMigration() {
        try {
            MigrationService.MigrationResult result = migrationService.migrateAllData();
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "迁移失败: " + e.getMessage()));
        }
    }

    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<MigrationService.DataConsistencyReport>> verifyConsistency() {
        try {
            MigrationService.DataConsistencyReport report = migrationService.verifyDataConsistency();
            return ResponseEntity.ok(ApiResponse.success(report));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "验证失败: " + e.getMessage()));
        }
    }

    @GetMapping("/checksum/{tableName}")
    public ResponseEntity<ApiResponse<Map<String, String>>> calculateChecksum(@PathVariable String tableName) {
        try {
            String checksum = migrationService.calculateChecksum(tableName);
            return ResponseEntity.ok(ApiResponse.success(Map.of("tableName", tableName, "checksum", checksum)));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "计算校验和失败: " + e.getMessage()));
        }
    }

    @GetMapping("/keys")
    public ResponseEntity<ApiResponse<List<EncryptionKey>>> listKeys() {
        try {
            List<EncryptionKey> keys = keyManagerService.listAllKeys();
            return ResponseEntity.ok(ApiResponse.success(keys));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取密钥列表失败: " + e.getMessage()));
        }
    }

    @GetMapping("/keys/{version}")
    public ResponseEntity<ApiResponse<String>> getKeyInfo(@PathVariable String version) {
        try {
            String info = keyManagerService.getKeyInfo(version);
            return ResponseEntity.ok(ApiResponse.success(info));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取密钥信息失败: " + e.getMessage()));
        }
    }

    @GetMapping("/keys/current")
    public ResponseEntity<ApiResponse<String>> getCurrentKeyVersion() {
        try {
            String version = keyManagerService.getCurrentKeyVersion();
            return ResponseEntity.ok(ApiResponse.success(version));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取当前密钥版本失败: " + e.getMessage()));
        }
    }

    @PostMapping("/keys/rotate")
    public ResponseEntity<ApiResponse<String>> rotateKey() {
        try {
            String newVersion = keyManagerService.rotateKey();
            return ResponseEntity.ok(ApiResponse.success("密钥轮换成功，新版本: " + newVersion));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "密钥轮换失败: " + e.getMessage()));
        }
    }

    @PostMapping("/keys/add")
    public ResponseEntity<ApiResponse<String>> addKeyVersion() {
        try {
            String newVersion = keyManagerService.addNewVersion();
            return ResponseEntity.ok(ApiResponse.success("新增密钥版本成功: " + newVersion));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "新增密钥版本失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/keys/{version}")
    public ResponseEntity<ApiResponse<String>> deactivateKey(@PathVariable String version) {
        try {
            keyManagerService.deactivateKey(version);
            return ResponseEntity.ok(ApiResponse.success("密钥版本已停用: " + version));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "停用密钥版本失败: " + e.getMessage()));
        }
    }

    @PostMapping("/encrypt/test")
    public ResponseEntity<ApiResponse<Map<String, String>>> testEncryption(@RequestBody Map<String, String> request) {
        try {
            String content = request.get("content");
            String encrypted = keyManagerService.encrypt(content);
            String decrypted = keyManagerService.decrypt(encrypted);
            
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "original", content,
                "encrypted", encrypted,
                "decrypted", decrypted,
                "consistent", String.valueOf(content.equals(decrypted))
            )));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "加密测试失败: " + e.getMessage()));
        }
    }
}
