package com.starisle.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BindStudentRequest {

    @NotBlank(message = "学生ID不能为空")
    @Size(max = 50, message = "学生ID长度不能超过50个字符")
    private String studentId;

    @Size(max = 50, message = "学生昵称长度不能超过50个字符")
    private String studentNickname;

    private String bindType = "scan";
}