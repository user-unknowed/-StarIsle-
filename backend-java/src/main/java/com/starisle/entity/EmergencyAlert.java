package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 紧急预警实体
 * 对应 {@code emergency_alerts} 表，当学生触发高风险信号时生成预警记录，
 * 家长可在家长端确认该预警。
 */
@Entity
@Table(name = "emergency_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAlert {

    // 预警 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 学生 ID
    @Column(name = "student_id", nullable = false)
    private String studentId;

    // 家长 ID
    @Column(name = "parent_id", nullable = false)
    private String parentId;

    // 触发来源，默认系统自动触发
    @Column(name = "trigger_source")
    @Builder.Default
    private String triggerSource = "system";

    // 风险等级，默认红色
    @Column(name = "risk_level", nullable = false)
    @Builder.Default
    private String riskLevel = "red";

    // 预警状态，默认待处理
    @Column(name = "status")
    @Builder.Default
    private String status = "pending";

    // 家长确认时间
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    // 预警描述
    @Column(name = "description", length = 500)
    private String description;

    // 触发时间
    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt;

    // 创建时间
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * 持久化前回调：初始化创建与触发时间
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        triggeredAt = LocalDateTime.now();
    }
}
