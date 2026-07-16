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
public class ChildBindingResponse {

    private String id;
    private String parentId;
    private String studentId;
    private String studentNickname;
    private String studentAvatar;
    private String bindType;
    private Boolean authorized;
    private LocalDateTime authorizedAt;
    private Integer latestMood;
    private String riskLevel;
    private String lastCheckinDate;
    private LocalDateTime createdAt;
}