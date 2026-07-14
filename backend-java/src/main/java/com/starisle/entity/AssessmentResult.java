package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "assessment_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String type;

    @Column(name = "total_score", nullable = false)
    private Integer totalScore;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "answers", columnDefinition = "TEXT")
    private String answersJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
