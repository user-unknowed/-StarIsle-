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

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Data
    public static class RegisterRequest {
        @NotBlank(message = "用户名不能为空")
        @Size(max = 50, message = "用户名长度不能超过50个字符")
        private String username;

        @NotBlank(message = "密码不能为空")
        @Size(min = 6, max = 20, message = "密码长度必须在6-20个字符之间")
        private String password;

        @Size(max = 50, message = "昵称长度不能超过50个字符")
        private String nickname;

        @Size(max = 200, message = "头像URL长度不能超过200个字符")
        private String avatar;

        @Pattern(regexp = "^(小学生|初中生|高中生)$", message = "年龄段必须是小学生、初中生或高中生")
        private String ageGroup;

        @NotBlank(message = "角色不能为空")
        @Pattern(regexp = "^(student|teacher)$", message = "角色必须是student或teacher")
        private String role;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;

        @NotBlank(message = "密码不能为空")
        private String password;
    }

    @Data
    public static class UpdateRequest {
        @Size(max = 50, message = "昵称长度不能超过50个字符")
        private String nickname;

        @Size(max = 200, message = "头像URL长度不能超过200个字符")
        private String avatar;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerUser(@Validated @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.ok(ApiResponse.badRequest("用户名已被使用"));
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .avatar(request.getAvatar())
                .ageGroup(request.getAgeGroup())
                .role(request.getRole())
                .isActive(true)
                .build();

        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getRole());

        return ResponseEntity.ok(ApiResponse.created("用户注册成功", Map.of(
            "user_id", user.getId(),
            "username", user.getUsername(),
            "nickname", user.getNickname(),
            "role", user.getRole(),
            "token", token
        )));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Validated @RequestBody LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .filter(user -> user.getIsActive())
                .map(user -> {
                    user.setLastLoginAt(java.time.LocalDateTime.now());
                    user = userRepository.save(user);
                    String token = jwtUtil.generateToken(user.getId(), user.getRole());
                    return ResponseEntity.ok(ApiResponse.success("登录成功", Map.of(
                        "user_id", user.getId(),
                        "username", user.getUsername(),
                        "nickname", user.getNickname(),
                        "role", user.getRole(),
                        "token", token
                    )));
                })
                .orElse(ResponseEntity.ok(ApiResponse.unauthorized("用户名或密码错误")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人信息"));
        }

        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.success(Map.of(
                    "user_id", user.getId(),
                    "username", user.getUsername(),
                    "nickname", user.getNickname(),
                    "avatar", user.getAvatar(),
                    "age_group", user.getAgeGroup(),
                    "role", user.getRole(),
                    "created_at", user.getCreatedAt(),
                    "updated_at", user.getUpdatedAt()
                ))))
                .orElse(ResponseEntity.ok(ApiResponse.notFound("用户不存在")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateUser(
            @PathVariable String id,
            @Validated @RequestBody UpdateRequest request) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权修改他人信息"));
        }

        return userRepository.findById(id)
                .map(user -> {
                    if (request.getNickname() != null) {
                        user.setNickname(request.getNickname());
                    }
                    if (request.getAvatar() != null) {
                        user.setAvatar(request.getAvatar());
                    }
                    user = userRepository.save(user);
                    return ResponseEntity.ok(ApiResponse.success("用户信息更新成功", Map.of(
                        "user_id", user.getId(),
                        "nickname", user.getNickname(),
                        "avatar", user.getAvatar()
                    )));
                })
                .orElse(ResponseEntity.ok(ApiResponse.notFound("用户不存在")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权删除他人账号"));
        }

        if (!userRepository.existsById(id)) {
            return ResponseEntity.ok(ApiResponse.notFound("用户不存在"));
        }

        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("账号已删除", null));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<ApiResponse<Map<String, Object>>> exportUserData(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(id)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权导出他人数据"));
        }

        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(ApiResponse.success("数据导出成功", Map.of(
                    "user_id", user.getId(),
                    "username", user.getUsername(),
                    "nickname", user.getNickname(),
                    "age_group", user.getAgeGroup(),
                    "role", user.getRole(),
                    "created_at", user.getCreatedAt(),
                    "data_format", "JSON"
                ))))
                .orElse(ResponseEntity.ok(ApiResponse.notFound("用户不存在")));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}