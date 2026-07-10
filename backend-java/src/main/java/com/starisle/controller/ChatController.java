package com.starisle.controller;

import com.starisle.service.ChatService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {
    
    private final ChatService chatService;
    
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody SendMessageRequest request) {
        ChatService.ChatResponse response = chatService.generateResponse(
            request.getUserId(),
            request.getMessage(),
            request.getContext(),
            request.getUserProfile()
        );
        
        return ResponseEntity.ok(Map.of(
            "message", "消息发送成功",
            "user_id", request.getUserId(),
            "response_time", response.getResponseTimeMs()
        ));
    }
    
    @GetMapping("/history/{userId}")
    public ResponseEntity<Map<String, Object>> getChatHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "50") String limit) {
        return ResponseEntity.ok(Map.of(
            "user_id", userId,
            "limit", limit,
            "messages", List.of(
                Map.of(
                    "role", "user",
                    "content", "今天感觉不太好",
                    "timestamp", "2026-01-01T10:00:00Z"
                ),
                Map.of(
                    "role", "assistant",
                    "content", "小星听到了。听起来你今天有点低落呢...",
                    "timestamp", "2026-01-01T10:00:02Z"
                )
            )
        ));
    }
    
    @GetMapping("/topics")
    public ResponseEntity<Map<String, Object>> getTopicCards() {
        return ResponseEntity.ok(Map.of(
            "topics", List.of(
                Map.of("id", "topic_1", "title", "聊聊最近的压力", "icon", "压力"),
                Map.of("id", "topic_2", "title", "关于朋友的事", "icon", "朋友"),
                Map.of("id", "topic_3", "title", "未来让我有点焦虑", "icon", "未来"),
                Map.of("id", "topic_4", "title", "和家人相处", "icon", "家庭"),
                Map.of("id", "topic_5", "title", "没有什么特别的事，就是有点闷", "icon", "心情")
            )
        ));
    }
    
    @Data
    public static class SendMessageRequest {
        private String userId;
        private String message;
        private String messageType;
        private List<Map<String, Object>> context;
        private Map<String, Object> userProfile;
    }
}