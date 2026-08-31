package com.starisle.service;

import com.starisle.utils.EncryptionUtil;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 聊天服务
 * 处理用户聊天消息，结合系统提示与上下文生成响应，
 * 记录响应时间并返回格式化结果。
 */
@Service
public class ChatService {
    
    /** 系统提示生成器，提供角色与对话规则 */
    private final StarIsleSystemPrompt systemPrompt;
    /** 加密工具，用于敏感数据加密 */
    private final EncryptionUtil encryptionUtil;
    
    /**
     * 构造方法
     * 注入系统提示生成器与加密工具依赖。
     *
     * @param systemPrompt   系统提示生成器
     * @param encryptionUtil 加密工具
     */
    public ChatService(StarIsleSystemPrompt systemPrompt, EncryptionUtil encryptionUtil) {
        this.systemPrompt = systemPrompt;
        this.encryptionUtil = encryptionUtil;
    }
    
    /**
     * 生成聊天响应
     * 结合系统提示、历史上下文与用户画像生成 AI 响应，
     * 历史上下文最多取最近 10 条，异常时返回兜底文案。
     *
     * @param userId      用户标识
     * @param message     用户消息
     * @param context     历史上下文
     * @param userProfile 用户画像
     * @return 聊天响应结果
     */
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
    
    /**
     * 生成 API 响应文本
     * 当前为占位实现，回显用户最后一条消息内容。
     *
     * @param messages 消息列表
     * @return 生成的响应文本
     */
    private String generateApiResponse(List<Map<String, Object>> messages) {
        return "小星收到了你的消息：" + messages.get(messages.size() - 1).get("content");
    }
    
    /**
     * 聊天响应结果
     * 封装响应内容、响应时间与使用模型。
     */
    @Data
    public static class ChatResponse {
        /** 响应内容文本 */
        private String content;
        /** 响应耗时（毫秒） */
        private long responseTimeMs;
        /** 生成响应所使用的模型标识 */
        private String model;
        
        /**
         * 构造方法
         *
         * @param content        响应内容
         * @param responseTimeMs 响应耗时
         * @param model          模型标识
         */
        public ChatResponse(String content, long responseTimeMs, String model) {
            this.content = content;
            this.responseTimeMs = responseTimeMs;
            this.model = model;
        }
    }
}