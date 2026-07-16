package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "parent_id", nullable = false)
    private String parentId;

    @Column(name = "trigger_source")
    @Builder.Default
    private String triggerSource = "system";

    @Column(name = "risk_level", nullable = false)
    @Builder.Default
    private String riskLevel = "red";

    @Column(name = "status")
    @Builder.Default
    private String status = "pending";

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        triggeredAt = LocalDateTime.now();
    }
}