package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "emergency_resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyResource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "school_id")
    private String schoolId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String name;

    private String phone;
    private String address;
    private String distance;
    private String description;
    private String hours;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}