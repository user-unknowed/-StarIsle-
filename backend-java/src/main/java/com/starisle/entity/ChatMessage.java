package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 聊天消息实体
 * 对应 {@code chat_messages} 表，存储用户与 AI 的对话消息内容、角色、风险等级与响应耗时。
 */
@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    // 消息 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 用户 ID
    @Column(name = "user_id", nullable = false)
    private String userId;

    // 消息角色（user/assistant）
    @Column(nullable = false)
    private String role;

    // 消息内容
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 消息类型
    @Column(name = "message_type")
    private String messageType;

    // 风险等级
    @Column(name = "risk_level")
    private String riskLevel;

    // AI 响应耗时（毫秒）
    @Column(name = "response_time_ms")
    private Long responseTimeMs;

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
