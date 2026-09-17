package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 加密密钥实体
 * 对应 {@code encryption_keys} 表，存储不同版本的加密密钥信息，支持密钥轮换与停用。
 */
@Entity
@Table(name = "encryption_keys")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EncryptionKey {

    // 主键 ID（自增）
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 密钥 ID（UUID 形式）
    @Column(name = "key_id", unique = true, nullable = false, length = 36)
    private String keyId;

    // 密钥版本
    @Column(name = "key_version", nullable = false, length = 20)
    private String keyVersion;

    // 密钥类型
    @Column(name = "key_type", nullable = false, length = 20)
    private String keyType;

    // 密钥值（Base64 或其它编码）
    @Column(name = "key_value", nullable = false, columnDefinition = "TEXT")
    private String keyValue;

    // 是否启用
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // 创建时间
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // 失效时间
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /**
     * 持久化前回调：初始化创建时间
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
