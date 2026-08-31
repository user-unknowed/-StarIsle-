package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 心情记录实体
 * 对应 {@code mood_records} 表，存储学生每日心情打卡的等级、日期、备注与标签。
 */
@Entity
@Table(name = "mood_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodRecord {

    // 记录 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 用户 ID
    @Column(name = "user_id", nullable = false)
    private String userId;

    // 心情等级（1-5）
    @Column(name = "mood_level", nullable = false)
    private Integer moodLevel;

    // 打卡日期
    @Column(name = "checkin_date", nullable = false)
    private LocalDate checkinDate;

    // 心情备注
    @Column(columnDefinition = "TEXT")
    private String note;

    // 心情标签集合（@ElementCollection 映射到 mood_tags 子表）
    @ElementCollection
    @CollectionTable(name = "mood_tags", joinColumns = @JoinColumn(name = "mood_record_id"))
    @Column(name = "tag")
    private java.util.List<String> tags;

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
