package com.starisle.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 学生绑定请求 DTO
 * 用于家长端绑定学生账号时提交学生 ID、昵称与绑定方式。
 */
@Data
public class BindStudentRequest {

    // 学生 ID
    @NotBlank(message = "学生ID不能为空")
    @Size(max = 50, message = "学生ID长度不能超过50个字符")
    private String studentId;

    // 学生昵称
    @Size(max = 50, message = "学生昵称长度不能超过50个字符")
    private String studentNickname;

    // 绑定方式，默认扫码绑定
    private String bindType = "scan";
}
