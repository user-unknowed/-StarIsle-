package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 用户实体
 * 对应 {@code users} 表，存储学生/教师账号的基础信息、密码哈希、角色与登录状态。
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    // 用户 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 用户名（唯一）
    @Column(unique = true, nullable = false)
    private String username;

    // 密码哈希
    @Column(nullable = false)
    private String passwordHash;

    // 昵称
    private String nickname;
    // 头像 URL
    private String avatar;
    // 年龄段（小学生/初中生/高中生）
    private String ageGroup;

    // 角色（student/teacher）
    @Column(nullable = false)
    private String role;

    // 班级 ID
    @Column(name = "class_id")
    private String classId;

    // 学校名称
    @Column(name = "school_name")
    private String schoolName;

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
