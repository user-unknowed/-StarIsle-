package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyAlertResponse {

    private String id;
    private String studentId;
    private String parentId;
    private String riskLevel;
    private String status;
    private String triggerSource;
    private String description;
    private LocalDateTime triggeredAt;
    private LocalDateTime confirmedAt;
}