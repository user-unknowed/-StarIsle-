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

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Validated
public class ChatController {

    private final ChatService chatService;
    private final ChatMessageRepository chatMessageRepository;

    @Data
    public static class SendMessageRequest {
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        @NotBlank(message = "消息内容不能为空")
        @Size(max = 2000, message = "消息内容长度不能超过2000个字符")
        private String message;

        private String messageType;
        private List<Map<String, Object>> context;
        private Map<String, Object> userProfile;
    }

    @PostMapping("/message")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendMessage(@Validated @RequestBody SendMessageRequest request) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人发送消息"));
        }

        ChatService.ChatResponse response = chatService.generateResponse(
            request.getUserId(),
            request.getMessage(),
            request.getContext(),
            request.getUserProfile()
        );

        return ResponseEntity.ok(ApiResponse.success("消息发送成功", Map.of(
            "user_id", request.getUserId(),
            "response_time", response.getResponseTimeMs()
        )));
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChatHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "50") @jakarta.validation.constraints.Max(100) Integer limit) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人聊天记录"));
        }

        List<ChatMessage> messages = chatMessageRepository.findByUserIdOrderByCreatedAtDesc(userId, limit);

        List<Map<String, Object>> history = messages.stream()
                .map(m -> Map.of(
                    "role", m.getRole(),
                    "content", m.getContent(),
                    "timestamp", m.getCreatedAt() != null ? m.getCreatedAt().toString() : ""
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "limit", limit,
            "messages", history
        )));
    }

    @GetMapping("/topics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTopicCards() {
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

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}