package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 紧急预警响应 DTO
 * 用于家长端展示学生触发的紧急预警详情，包括风险等级、状态、触发源与确认时间。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAlertResponse {

    // 预警 ID
    private String id;
    // 学生 ID
    private String studentId;
    // 家长 ID
    private String parentId;
    // 风险等级
    private String riskLevel;
    // 预警状态
    private String status;
    // 触发来源
    private String triggerSource;
    // 描述
    private String description;
    // 触发时间
    private LocalDateTime triggeredAt;
    // 确认时间
    private LocalDateTime confirmedAt;
}
