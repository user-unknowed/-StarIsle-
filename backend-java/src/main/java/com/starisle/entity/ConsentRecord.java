package com.starisle.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 个人数据同意记录
 * 对应 {@code consent_records} 表，按（用户, 同意范围）唯一保存当前生效的授权状态，
 * 包含政策版本、生效时间、过期时间与撤回时间。
 */
@Entity
@Table(name = "consent_records",
        uniqueConstraints = @UniqueConstraint(name = "uk_consent_user_scope", columnNames = {"user_id", "scope"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentRecord {

    // 主键（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 用户 ID
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    // 同意范围（ConsentScope 名称）
    @Column(nullable = false, length = 64)
    private String scope;

    // 用户同意时适用的隐私政策版本
    @Column(name = "policy_version", nullable = false, length = 32)
    private String policyVersion;

    // 授权生效时间
    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    // 授权过期时间（到达后立即失效）
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // 撤回时间（非空即失效）
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    // 最近一次变更时间
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 授权时的客户端 IP（用于审计追溯）
    @Column(name = "client_ip", length = 64)
    private String clientIp;

    // 授权时的客户端标识（User-Agent）
    @Column(name = "user_agent", length = 255)
    private String userAgent;

    /**
     * 判断该授权当前是否有效：未撤回且未过期
     *
     * @return 有效返回 true
     */
    @Transient
    public boolean isActive() {
        return revokedAt == null && expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
    }

    /**
     * 持久化前回调：初始化时间字段
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (grantedAt == null) {
            grantedAt = now;
        }
        updatedAt = now;
    }

    /**
     * 更新前回调：刷新更新时间
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
