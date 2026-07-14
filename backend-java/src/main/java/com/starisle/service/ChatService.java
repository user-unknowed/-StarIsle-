package com.starisle.service;

import com.starisle.utils.EncryptionUtil;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {
    
    private final StarIsleSystemPrompt systemPrompt;
    private final EncryptionUtil encryptionUtil;
    
    public ChatService(StarIsleSystemPrompt systemPrompt, EncryptionUtil encryptionUtil) {
        this.systemPrompt = systemPrompt;
        this.encryptionUtil = encryptionUtil;
    }
    
    public ChatResponse generateResponse(String userId, String message, 
                                          List<Map<String, Object>> context, 
                                          Map<String, Object> userProfile) {
        long startTime = System.currentTimeMillis();
        
        String systemPromptText = systemPrompt.generatePrompt(userProfile);
        
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPromptText));
        
        if (context != null && !context.isEmpty()) {
            int startIndex = Math.max(0, context.size() - 10);
            messages.addAll(context.subList(startIndex, context.size()));
        }
        
        messages.add(Map.of("role", "user", "content", message));
        
        String responseText;
        try {
            responseText = generateApiResponse(messages);
        } catch (Exception e) {
            responseText = "小星好像有点迷糊了，请稍后再试试～";
        }
        
        long responseTimeMs = System.currentTimeMillis() - startTime;
        
        return new ChatResponse(responseText, responseTimeMs, "deepseek-chat");
    }
    
    private String generateApiResponse(List<Map<String, Object>> messages) {
        return "小星收到了你的消息：" + messages.get(messages.size() - 1).get("content");
    }
    
    @Data
    public static class ChatResponse {
        private String content;
        private long responseTimeMs;
        private String model;
        
        public ChatResponse(String content, long responseTimeMs, String model) {
            this.content = content;
            this.responseTimeMs = responseTimeMs;
            this.model = model;
        }
    }
}