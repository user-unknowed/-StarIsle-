package com.starisle.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * 紧急资源实体
 * 对应 {@code emergency_resources} 表，存储危机干预热线、就近机构等家长可联系的紧急资源信息。
 */
@Entity
@Table(name = "emergency_resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyResource {

    // 资源 ID（UUID）
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // 学校 ID（按学校维度配置）
    @Column(name = "school_id")
    private String schoolId;

    // 资源类型
    @Column(nullable = false)
    private String type;

    // 资源名称
    @Column(nullable = false)
    private String name;

    // 联系电话
    private String phone;
    // 地址
    private String address;
    // 距离描述
    private String distance;
    // 描述
    private String description;
    // 营业时间
    private String hours;

    // 排序权重
    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    // 是否启用
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
