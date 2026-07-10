package com.starisle.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerUser(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(Map.of(
            "message", "用户注册成功",
            "user_id", "generated-user-id"
        ));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "user_id", id,
            "nickname", "用户昵称",
            "avatar", "头像URL",
            "age_group", "高中生"
        ));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable String id,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(Map.of(
            "message", "用户信息更新成功",
            "user_id", id
        ));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "message", "账号已删除",
            "user_id", id
        ));
    }
    
    @GetMapping("/{id}/export")
    public ResponseEntity<Map<String, Object>> exportUserData(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "message", "数据导出成功",
            "user_id", id,
            "data_format", "JSON"
        ));
    }
    
    @Data
    public static class RegisterRequest {
        private String nickname;
        private String avatar;
        private String ageGroup;
    }
}