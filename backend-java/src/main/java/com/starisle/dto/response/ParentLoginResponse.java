package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * 家长登录响应 DTO
 * 用于家长注册/登录/当前家长信息接口返回家长基础信息与登录令牌。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentLoginResponse {

    // 家长用户 ID
    private String userId;
    // 昵称
    private String nickname;
    // 头像 URL
    private String avatar;
    // 手机号
    private String phone;
    // JWT 登录令牌
    private String token;
}
