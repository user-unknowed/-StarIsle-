package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.entity.ChatMessage;
import com.starisle.repository.ChatMessageRepository;
import com.starisle.service.ChatService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 聊天接口控制器
 * 提供对话消息发送、聊天历史查询与话题卡片获取等接口，
 * 串联用户输入与 AI 对话回复。
 */
@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Validated
public class ChatController {

    // 聊天服务，负责 AI 回复生成
    private final ChatService chatService;
    // 聊天消息仓储
    private final ChatMessageRepository chatMessageRepository;

    /**
     * 发送消息请求 DTO
     */
    @Data
    public static class SendMessageRequest {
        // 用户 ID
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        // 消息内容
        @NotBlank(message = "消息内容不能为空")
        @Size(max = 2000, message = "消息内容长度不能超过2000个字符")
        private String message;

        // 消息类型
        private String messageType;
        // 上下文消息列表
        private List<Map<String, Object>> context;
        // 用户画像
        private Map<String, Object> userProfile;
    }

    /**
     * 发送聊天消息并获取 AI 回复
     *
     * @HTTP POST /api/v1/chat/message
     * @param request 发送消息请求
     * @return 包含响应耗时等信息的响应
     */
    @PostMapping("/message")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(@Validated @RequestBody SendMessageRequest request) {
        // 校验权限，禁止替他人发送消息
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人发送消息"));
        }

        // 调用服务生成 AI 回复
        ChatService.ChatResponse response = chatService.generateResponse(
            request.getUserId(),
            request.getMessage(),
            request.getContext(),
            request.getUserProfile()
        );

        // 返回响应耗时等基础信息
        return ResponseEntity.ok(ApiResponse.success("消息发送成功", Map.of(
            "user_id", request.getUserId(),
            "response_time", response.getResponseTimeMs()
        )));
    }

    /**
     * 查询用户聊天历史
     *
     * @HTTP GET /api/v1/chat/history/{userId}
     * @param userId 用户 ID
     * @param limit  最大返回条数（默认 50，上限 100）
     * @return 聊天历史记录
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChatHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "50") @jakarta.validation.constraints.Max(100) Integer limit) {
        // 校验权限，仅可查看本人历史
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人聊天记录"));
        }

        // 查询最近聊天记录
        List<ChatMessage> messages = chatMessageRepository.findByUserIdOrderByCreatedAtDesc(userId, limit);

        // 转换为响应格式
        List<Map<String, Object>> history = messages.stream()
                .map(m -> {
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("role", m.getRole());
                    item.put("content", m.getContent());
                    item.put("timestamp", m.getCreatedAt() != null ? m.getCreatedAt().toString() : "");
                    return item;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "limit", limit,
            "messages", history
        )));
    }

    /**
     * 获取话题卡片列表（公开接口）
     *
     * @HTTP GET /api/v1/chat/topics
     * @return 推荐话题卡片
     */
    @GetMapping("/topics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTopicCards() {
        // 返回内置的话题卡片，引导用户开启对话
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "topics", List.of(
                Map.of("id", "topic_1", "title", "聊聊最近的压力", "icon", "压力"),
                Map.of("id", "topic_2", "title", "关于朋友的事", "icon", "朋友"),
                Map.of("id", "topic_3", "title", "未来让我有点焦虑", "icon", "未来"),
                Map.of("id", "topic_4", "title", "和家人相处", "icon", "家庭"),
                Map.of("id", "topic_5", "title", "没有什么特别的事，就是有点闷", "icon", "心情")
            )
        )));
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
