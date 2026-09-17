package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * 孩子绑定响应 DTO
 * 用于家长端展示已绑定的学生信息，包括授权状态、最新心情、风险等级与最近打卡。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChildBindingResponse {

    // 绑定记录 ID
    private String id;
    // 家长 ID
    private String parentId;
    // 学生 ID
    private String studentId;
    // 学生昵称
    private String studentNickname;
    // 学生头像
    private String studentAvatar;
    // 绑定方式（如 scan）
    private String bindType;
    // 是否已授权
    private Boolean authorized;
    // 授权时间
    private LocalDateTime authorizedAt;
    // 最新心情等级
    private Integer latestMood;
    // 风险等级
    private String riskLevel;
    // 最近打卡日期
    private String lastCheckinDate;
    // 创建时间
    private LocalDateTime createdAt;
}
