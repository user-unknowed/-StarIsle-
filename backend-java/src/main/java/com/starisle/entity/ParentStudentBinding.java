package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 家长-学生绑定关系实体
 * 对应 {@code parent_student_bindings} 表，记录家长与学生账号之间的绑定关系，
 * 包括绑定方式、授权状态以及学生的最新心情、风险等级等冗余信息。
 */
@Entity
@Table(name = "parent_student_bindings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentStudentBinding {

    // 绑定记录 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 家长 ID
    @Column(name = "parent_id", nullable = false)
    private String parentId;

    // 学生 ID
    @Column(name = "student_id", nullable = false)
    private String studentId;

    // 绑定方式，默认扫码绑定
    @Column(name = "bind_type")
    @Builder.Default
    private String bindType = "scan";

    // 是否已授权
    @Builder.Default
    private Boolean authorized = false;

    // 授权时间
    @Column(name = "authorized_at")
    private LocalDateTime authorizedAt;

    // 学生昵称（冗余便于展示）
    @Column(name = "student_nickname")
    private String studentNickname;

    // 学生头像（冗余便于展示）
    @Column(name = "student_avatar")
    private String studentAvatar;

    // 最新心情等级（冗余字段）
    @Column(name = "latest_mood")
    @Builder.Default
    private Integer latestMood = 3;

    // 风险等级（冗余字段）
    @Column(name = "risk_level")
    @Builder.Default
    private String riskLevel = "green";

    // 最近打卡日期
    @Column(name = "last_checkin_date")
    private String lastCheckinDate;

    // 创建时间
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // 更新时间
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
