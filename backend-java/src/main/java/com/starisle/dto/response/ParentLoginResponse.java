package com.starisle.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParentLoginResponse {

    private String userId;
    private String nickname;
    private String avatar;
    private String phone;
    private String token;
}