package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * 紧急资源响应 DTO
 * 用于家长端展示危机干预资源（如热线、就近机构）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyResourceResponse {

    // 资源 ID
    private String id;
    // 资源类型
    private String type;
    // 资源名称
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
}
