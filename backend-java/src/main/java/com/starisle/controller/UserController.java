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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户接口控制器
 * 提供学生/教师用户的注册、登录、信息查询、信息更新、账号删除与数据导出等接口。
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    // 用户仓储
    private final UserRepository userRepository;
    // 密码编码器
    private final PasswordEncoder passwordEncoder;
    // JWT 工具类
    private final JwtUtil jwtUtil;

    /**
     * 用户注册请求 DTO
     */
    @Data
    public static class RegisterRequest {
        // 用户名
        @NotBlank(message = "用户名不能为空")
        @Size(max = 50, message = "用户名长度不能超过50个字符")
        private String username;

        // 密码
        @NotBlank(message = "密码不能为空")
        @Size(min = 6, max = 20, message = "密码长度必须在6-20个字符之间")
        private String password;

        // 昵称
        @Size(max = 50, message = "昵称长度不能超过50个字符")
        private String nickname;

        // 头像 URL
        @Size(max = 200, message = "头像URL长度不能超过200个字符")
        private String avatar;

        // 年龄段：小学生/初中生/高中生
        @Pattern(regexp = "^(小学生|初中生|高中生)$", message = "年龄段必须是小学生、初中生或高中生")
        private String ageGroup;

        // 角色：student 或 teacher
        @NotBlank(message = "角色不能为空")
        @Pattern(regexp = "^(student|teacher)$", message = "角色必须是student或teacher")
        private String role;
    }

    /**
     * 用户登录请求 DTO
     */
    @Data
    public static class LoginRequest {
        // 用户名
        @NotBlank(message = "用户名不能为空")
        private String username;

        // 密码
        @NotBlank(message = "密码不能为空")
        private String password;
    }

    /**
     * 用户信息更新请求 DTO
     */
    @Data
    public static class UpdateRequest {
        // 昵称
        @Size(max = 50, message = "昵称长度不能超过50个字符")
        private String nickname;

        // 头像 URL
        @Size(max = 200, message = "头像URL长度不能超过200个字符")
        private String avatar;
    }

    /**
     * 用户注册接口
     *
     * @HTTP POST /api/v1/users/register
     * @param request 注册请求
     * @return 包含用户信息与登录令牌的响应
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerUser(@Validated @RequestBody RegisterRequest request) {
        // 校验用户名是否已被占用
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>badRequest("用户名已被使用"));
        }

        // 构造用户实体并保存
        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .avatar(request.getAvatar())
                .ageGroup(request.getAgeGroup())
                .role(request.getRole())
                .isActive(true)
                .build();

        // 保存用户并生成 JWT
        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        // 组装响应数据
        Map<String, Object> registerData = new java.util.HashMap<>();
        registerData.put("user_id", user.getId());
        registerData.put("username", user.getUsername());
        registerData.put("nickname", user.getNickname());
        registerData.put("role", user.getRole());
        registerData.put("token", token);

        return ResponseEntity.ok(ApiResponse.created("用户注册成功", registerData));
    }

    /**
     * 用户登录接口
     *
     * @HTTP POST /api/v1/users/login
     * @param request 登录请求
     * @return 包含用户信息与登录令牌的响应
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Validated @RequestBody LoginRequest request) {
        // 根据用户名查找用户，校验密码与账号启用状态
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .filter(user -> user.getIsActive())
                .map(user -> {
                    // 更新最近登录时间并保存
                    user.setLastLoginAt(java.time.LocalDateTime.now());
                    user = userRepository.save(user);
                    // 生成 JWT
                    String token = jwtUtil.generateToken(user.getId(), user.getRole());
                    // 组装登录响应数据
                    Map<String, Object> loginData = new java.util.HashMap<>();
                    loginData.put("user_id", user.getId());
                    loginData.put("username", user.getUsername());
                    loginData.put("nickname", user.getNickname());
                    loginData.put("role", user.getRole());
                    loginData.put("token", token);
                    return ResponseEntity.ok(ApiResponse.success("登录成功", loginData));
                })
                .orElse(ResponseEntity.ok(ApiResponse.<Map<String, Object>>unauthorized("用户名或密码错误")));
    }

    /**
     * 查询用户信息
     *
     * @HTTP GET /api/v1/users/{id}
     * @param id 用户 ID
     * @return 用户信息
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable String id) {
        // 仅可查询本人信息
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>forbidden("无权查看他人信息"));
        }

        // 查询用户并组装响应
        return userRepository.findById(id)
                .map(user -> {
                    Map<String, Object> userData = new java.util.HashMap<>();
                    userData.put("user_id", user.getId());
                    userData.put("username", user.getUsername());
                    userData.put("nickname", user.getNickname());
                    userData.put("avatar", user.getAvatar());
                    userData.put("age_group", user.getAgeGroup());
                    userData.put("role", user.getRole());
                    userData.put("created_at", user.getCreatedAt());
                    userData.put("updated_at", user.getUpdatedAt());
                    return ResponseEntity.ok(ApiResponse.success(userData));
                })
                .orElse(ResponseEntity.ok(ApiResponse.<Map<String, Object>>notFound("用户不存在")));
    }

    /**
     * 更新用户信息
     *
     * @HTTP PUT /api/v1/users/{id}
     * @param id      用户 ID
     * @param request 更新请求
     * @return 更新后的用户信息
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable String id,
            @Validated @RequestBody UpdateRequest request) {
        // 仅可修改本人信息
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>forbidden("无权修改他人信息"));
        }

        // 按字段非空更新用户昵称与头像
        return userRepository.findById(id)
                .map(user -> {
                    if (request.getNickname() != null) {
                        user.setNickname(request.getNickname());
                    }
                    if (request.getAvatar() != null) {
                        user.setAvatar(request.getAvatar());
                    }
                    user = userRepository.save(user);
                    Map<String, Object> updateData = new java.util.HashMap<>();
                    updateData.put("user_id", user.getId());
                    updateData.put("nickname", user.getNickname());
                    updateData.put("avatar", user.getAvatar());
                    return ResponseEntity.ok(ApiResponse.success("用户信息更新成功", updateData));
                })
                .orElse(ResponseEntity.ok(ApiResponse.<Map<String, Object>>notFound("用户不存在")));
    }

    /**
     * 删除用户账号
     *
     * @HTTP DELETE /api/v1/users/{id}
     * @param id 用户 ID
     * @return 删除结果
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        // 仅可删除本人账号
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.<Void>forbidden("无权删除他人账号"));
        }

        // 校验用户是否存在并执行删除
        if (!userRepository.existsById(id)) {
            return ResponseEntity.ok(ApiResponse.<Void>notFound("用户不存在"));
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.<Void>success("账号已删除", null));
    }

    /**
     * 导出用户个人数据
     *
     * @HTTP GET /api/v1/users/{id}/export
     * @param id 用户 ID
     * @return 用户数据 JSON
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<ApiResponse<Map<String, Object>>> exportUserData(@PathVariable String id) {
        // 仅可导出本人数据
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.<Map<String, Object>>forbidden("无权导出他人数据"));
        }

        // 组装导出数据
        return userRepository.findById(id)
                .map(user -> {
                    Map<String, Object> exportData = new java.util.HashMap<>();
                    exportData.put("user_id", user.getId());
                    exportData.put("username", user.getUsername());
                    exportData.put("nickname", user.getNickname());
                    exportData.put("age_group", user.getAgeGroup());
                    exportData.put("role", user.getRole());
                    exportData.put("created_at", user.getCreatedAt());
                    exportData.put("data_format", "JSON");
                    return ResponseEntity.ok(ApiResponse.success("数据导出成功", exportData));
                })
                .orElse(ResponseEntity.ok(ApiResponse.<Map<String, Object>>notFound("用户不存在")));
    }

    /**
     * 从 Spring Security 上下文获取当前登录用户 ID
     *
     * @return 当前登录用户 ID
     */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}
