package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 测评结果实体
 * 对应 {@code assessment_results} 表，存储学生提交心理测评后的得分、风险等级与答案明细。
 */
@Entity
@Table(name = "assessment_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentResult {

    // 测评结果 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 用户 ID
    @Column(name = "user_id", nullable = false)
    private String userId;

    // 测评类型
    @Column(nullable = false)
    private String type;

    // 总得分
    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    // 风险等级
    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    // 测评结果描述
    @Column(columnDefinition = "TEXT")
    private String description;

    // 答案明细（JSON 字符串）
    @Column(name = "answers", columnDefinition = "TEXT")
    private String answersJson;

    // 创建时间
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * 持久化前回调：初始化创建时间
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
