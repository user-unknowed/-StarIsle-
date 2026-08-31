package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 家长用户实体
 * 对应 {@code parent_users} 表，存储家长端用户基础信息、密码哈希与登录状态等。
 */
@Entity
@Table(name = "parent_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentUser {

    // 家长用户 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 手机号（唯一）
    @Column(unique = true, nullable = false)
    private String phone;

    // 密码哈希
    @Column(nullable = false)
    private String passwordHash;

    // 昵称
    private String nickname;
    // 头像 URL
    private String avatar;

    // 创建时间
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // 更新时间
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 最近登录时间
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // 是否启用
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /**
     * 持久化前回调：初始化创建与更新时间
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * 更新前回调：刷新更新时间
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
