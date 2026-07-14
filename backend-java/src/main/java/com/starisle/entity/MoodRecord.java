package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mood_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoodRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "mood_level", nullable = false)
    private Integer moodLevel;

    @Column(name = "checkin_date", nullable = false)
    private LocalDate checkinDate;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ElementCollection
    @CollectionTable(name = "mood_tags", joinColumns = @JoinColumn(name = "mood_record_id"))
    @Column(name = "tag")
    private java.util.List<String> tags;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
