package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.entity.User;
import com.starisle.repository.UserRepository;
import com.starisle.utils.JwtUtil;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 认证接口控制器（前端契约适配层）
 * 前端 {@code authApi} 调用的是 /api/v1/auth/login 与 /api/v1/auth/register，
 * 且期望响应体为 { token, user: { id, nickname, avatar, role, ... } }（camelCase 嵌套结构）。
 * 本控制器在 /api/v1/users 的账号体系之上做一层适配，避免前端改动即可拿到真实 JWT，
 * 从而让前端 AI 对话可以携带合法 Token 请求后端并转发到本地微调模型。
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    // 用户仓储
    private final UserRepository userRepository;
    // 密码编码器
    private final PasswordEncoder passwordEncoder;
    // JWT 工具类
    private final JwtUtil jwtUtil;

    /**
     * 账号密码登录请求 DTO（与前端 LoginRequest 对齐）
     */
    @Data
    public static class LoginRequest {
        // 用户名
        @NotBlank(message = "用户名不能为空")
        private String username;

        // 密码
        @NotBlank(message = "密码不能为空")
        private String password;

        // 角色（前端传 student/teacher/parent，服务端以账号实际角色为准）
        private String role;
    }

    /**
     * 注册请求 DTO（与前端 RegisterRequest 对齐）
     * 前端注册只填昵称，本接口以昵称作为用户名创建账号。
     */
    @Data
    public static class RegisterRequest {
        // 昵称（同时作为用户名）
        @NotBlank(message = "昵称不能为空")
        @Size(max = 50, message = "昵称长度不能超过50个字符")
        private String nickname;

        // 密码
        @NotBlank(message = "密码不能为空")
        @Size(min = 6, max = 20, message = "密码长度必须在6-20个字符之间")
        private String password;

        // 角色：student 或 teacher（家长账号走 /api/v1/parents/register）
        @NotBlank(message = "角色不能为空")
        @Pattern(regexp = "^(student|teacher)$", message = "角色必须是student或teacher")
        private String role;

        // 年龄段（可选）
        private String ageGroup;
    }

    /**
     * 账号密码登录
     *
     * @HTTP POST /api/v1/auth/login
     * @param request 登录请求
     * @return { token, user } 结构的登录响应
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Validated @RequestBody LoginRequest request) {
        // 按用户名查找，校验密码与账号启用状态
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .filter(user -> Boolean.TRUE.equals(user.getIsActive()))
                .map(user -> {
                    // 更新最近登录时间
                    user.setLastLoginAt(java.time.LocalDateTime.now());
                    user = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.success("登录成功", buildLoginPayload(user)));
                })
                .orElse(ResponseEntity.ok(ApiResponse.<Map<String, Object>>unauthorized("用户名或密码错误")));
    }

    /**
     * 注册并直接返回登录态
     *
     * @HTTP POST /api/v1/auth/register
     * @param request 注册请求
     * @return { token, user } 结构的登录响应
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(@Validated @RequestBody RegisterRequest request) {
        // 以昵称作为用户名；重名时追加四位随机后缀，保证唯一
        String baseUsername = request.getNickname().trim();
        String username = baseUsername;
        if (userRepository.existsByUsername(username)) {
            username = baseUsername + "_" + String.valueOf(System.currentTimeMillis()).substring(9);
        }
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>badRequest("昵称已被使用，请换一个"));
        }

        // 构造并保存用户
        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .avatar("")
                .ageGroup(request.getAgeGroup())
                .role(request.getRole())
                .isActive(true)
                .build();
        user = userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("注册成功", buildLoginPayload(user)));
    }

    /**
     * 组装与前端 LoginResponse 对齐的 { token, user } 响应体
     *
     * @param user 用户实体
     * @return 登录响应数据
     */
    private Map<String, Object> buildLoginPayload(User user) {
        // 生成 JWT（角色小写，安全过滤器会转为 ROLE_xxx）
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        // 用户信息（camelCase，供前端 User 类型直接消费）
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("nickname", user.getNickname() == null ? "" : user.getNickname());
        userData.put("avatar", user.getAvatar() == null ? "" : user.getAvatar());
        userData.put("role", user.getRole());
        userData.put("ageGroup", user.getAgeGroup());
        userData.put("createdAt", user.getCreatedAt() == null ? "" : user.getCreatedAt().toString());
        userData.put("updatedAt", user.getUpdatedAt() == null ? "" : user.getUpdatedAt().toString());

        // 登录响应
        Map<String, Object> payload = new HashMap<>();
        payload.put("token", token);
        payload.put("user", userData);
        return payload;
    }
}
