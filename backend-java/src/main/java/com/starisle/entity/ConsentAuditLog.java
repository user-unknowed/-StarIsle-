package com.starisle.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 同意审计日志
 * 对应 {@code consent_audit_logs} 表，记录授权、撤回与因未授权被拒绝的访问，
 * 仅追加不修改，用于合规追溯。
 */
@Entity
@Table(name = "consent_audit_logs", indexes = {
        @Index(name = "idx_consent_audit_user", columnList = "user_id"),
        @Index(name = "idx_consent_audit_time", columnList = "occurred_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentAuditLog {

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

    // 审计动作：GRANT / REVOKE / DENIED
    @Column(nullable = false, length = 16)
    private String action;

    // 政策版本
    @Column(name = "policy_version", length = 32)
    private String policyVersion;

    // 发生时间
    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    // 客户端 IP
    @Column(name = "client_ip", length = 64)
    private String clientIp;

    // 客户端标识（User-Agent）
    @Column(name = "user_agent", length = 255)
    private String userAgent;

    // 补充说明（如被拒绝的接口路径）
    @Column(length = 255)
    private String detail;

    /**
     * 持久化前回调：初始化发生时间
     */
    @PrePersist
    protected void onCreate() {
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now();
        }
    }
}
