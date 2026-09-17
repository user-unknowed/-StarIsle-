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

/**
 * 数据迁移与密钥管理接口控制器
 * 提供数据迁移执行、一致性校验、表校验和计算，
 * 以及加密密钥的列表、查询、轮换、新增、停用与加密测试等运维接口。
 */
@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    // 数据迁移服务
    @Autowired
    private MigrationService migrationService;

    // 密钥管理服务
    @Autowired
    private KeyManagerService keyManagerService;

    /**
     * 执行全量数据迁移
     *
     * @HTTP POST /api/migration/execute
     * @return 迁移结果报告
     */
    @PostMapping("/execute")
    public ResponseEntity<ApiResponse<MigrationService.MigrationResult>> executeMigration() {
        try {
            // 调用迁移服务执行全量数据迁移
            MigrationService.MigrationResult result = migrationService.migrateAllData();
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            // 迁移失败时返回 500 与错误信息
            return ResponseEntity.ok(ApiResponse.error(500, "迁移失败: " + e.getMessage()));
        }
    }

    /**
     * 校验数据迁移前后一致性
     *
     * @HTTP GET /api/migration/verify
     * @return 数据一致性报告
     */
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<MigrationService.DataConsistencyReport>> verifyConsistency() {
        try {
            // 调用服务校验数据一致性
            MigrationService.DataConsistencyReport report = migrationService.verifyDataConsistency();
            return ResponseEntity.ok(ApiResponse.success(report));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "验证失败: " + e.getMessage()));
        }
    }

    /**
     * 计算指定表的校验和
     *
     * @HTTP GET /api/migration/checksum/{tableName}
     * @param tableName 表名
     * @return 表名校验和
     */
    @GetMapping("/checksum/{tableName}")
    public ResponseEntity<ApiResponse<Map<String, String>>> calculateChecksum(@PathVariable String tableName) {
        try {
            // 调用服务计算表数据校验和
            String checksum = migrationService.calculateChecksum(tableName);
            return ResponseEntity.ok(ApiResponse.success(Map.of("tableName", tableName, "checksum", checksum)));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "计算校验和失败: " + e.getMessage()));
        }
    }

    /**
     * 列出全部加密密钥
     *
     * @HTTP GET /api/migration/keys
     * @return 密钥列表
     */
    @GetMapping("/keys")
    public ResponseEntity<ApiResponse<List<EncryptionKey>>> listKeys() {
        try {
            // 调用密钥服务获取全部密钥
            List<EncryptionKey> keys = keyManagerService.listAllKeys();
            return ResponseEntity.ok(ApiResponse.success(keys));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取密钥列表失败: " + e.getMessage()));
        }
    }

    /**
     * 获取指定版本密钥信息
     *
     * @HTTP GET /api/migration/keys/{version}
     * @param version 密钥版本
     * @return 密钥信息
     */
    @GetMapping("/keys/{version}")
    public ResponseEntity<ApiResponse<String>> getKeyInfo(@PathVariable String version) {
        try {
            // 查询指定版本密钥信息
            String info = keyManagerService.getKeyInfo(version);
            return ResponseEntity.ok(ApiResponse.success(info));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取密钥信息失败: " + e.getMessage()));
        }
    }

    /**
     * 获取当前生效的密钥版本
     *
     * @HTTP GET /api/migration/keys/current
     * @return 当前密钥版本
     */
    @GetMapping("/keys/current")
    public ResponseEntity<ApiResponse<String>> getCurrentKeyVersion() {
        try {
            // 查询当前生效的密钥版本
            String version = keyManagerService.getCurrentKeyVersion();
            return ResponseEntity.ok(ApiResponse.success(version));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "获取当前密钥版本失败: " + e.getMessage()));
        }
    }

    /**
     * 执行密钥轮换
     *
     * @HTTP POST /api/migration/keys/rotate
     * @return 新密钥版本
     */
    @PostMapping("/keys/rotate")
    public ResponseEntity<ApiResponse<String>> rotateKey() {
        try {
            // 调用服务进行密钥轮换
            String newVersion = keyManagerService.rotateKey();
            return ResponseEntity.ok(ApiResponse.success("密钥轮换成功，新版本: " + newVersion));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "密钥轮换失败: " + e.getMessage()));
        }
    }

    /**
     * 新增一个密钥版本
     *
     * @HTTP POST /api/migration/keys/add
     * @return 新增的密钥版本
     */
    @PostMapping("/keys/add")
    public ResponseEntity<ApiResponse<String>> addKeyVersion() {
        try {
            // 新增密钥版本
            String newVersion = keyManagerService.addNewVersion();
            return ResponseEntity.ok(ApiResponse.success("新增密钥版本成功: " + newVersion));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "新增密钥版本失败: " + e.getMessage()));
        }
    }

    /**
     * 停用指定版本的密钥
     *
     * @HTTP DELETE /api/migration/keys/{version}
     * @param version 密钥版本
     * @return 停用结果
     */
    @DeleteMapping("/keys/{version}")
    public ResponseEntity<ApiResponse<String>> deactivateKey(@PathVariable String version) {
        try {
            // 停用密钥版本
            keyManagerService.deactivateKey(version);
            return ResponseEntity.ok(ApiResponse.success("密钥版本已停用: " + version));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(500, "停用密钥版本失败: " + e.getMessage()));
        }
    }

    /**
     * 加密链路测试
     *
     * @HTTP POST /api/migration/encrypt/test
     * @param request 原始内容
     * @return 加密、解密及一致性结果
     */
    @PostMapping("/encrypt/test")
    public ResponseEntity<ApiResponse<Map<String, String>>> testEncryption(@RequestBody Map<String, String> request) {
        try {
            // 取出原始内容并执行加密/解密测试
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
