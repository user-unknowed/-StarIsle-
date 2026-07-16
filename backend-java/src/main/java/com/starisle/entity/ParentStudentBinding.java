package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "parent_student_bindings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentStudentBinding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "parent_id", nullable = false)
    private String parentId;

    @Column(name = "student_id", nullable = false)
    private String studentId;

    @Column(name = "bind_type")
    @Builder.Default
    private String bindType = "scan";

    @Builder.Default
    private Boolean authorized = false;

    @Column(name = "authorized_at")
    private LocalDateTime authorizedAt;

    @Column(name = "student_nickname")
    private String studentNickname;

    @Column(name = "student_avatar")
    private String studentAvatar;

    @Column(name = "latest_mood")
    @Builder.Default
    private Integer latestMood = 3;

    @Column(name = "risk_level")
    @Builder.Default
    private String riskLevel = "green";

    @Column(name = "last_checkin_date")
    private String lastCheckinDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}