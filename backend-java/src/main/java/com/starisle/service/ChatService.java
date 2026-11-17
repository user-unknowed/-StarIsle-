package com.starisle.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.starisle.config.AppConfig;
import com.starisle.utils.EncryptionUtil;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 聊天服务
 * 负责把用户消息转发给 ai-engine 的 {@code POST /chat}（本地 SFT 微调模型），
 * 并把模型回复、风险等级、情绪标签与耗时封装为统一结果。
 */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    /** ai-engine 不可用或返回空内容时的兜底文案 */
    private static final String FALLBACK_REPLY = "小星好像有点迷糊了，请稍后再试试～";

    /** 系统提示生成器，提供角色与对话规则 */
    private final StarIsleSystemPrompt systemPrompt;
    /** 加密工具，用于敏感数据加密 */
    private final EncryptionUtil encryptionUtil;
    /** 应用配置，提供 ai-engine 地址 */
    private final AppConfig appConfig;
    /** 调用 ai-engine 的 HTTP 客户端 */
    private final RestTemplate restTemplate;

    /**
     * 构造方法
     * 注入系统提示生成器、加密工具与配置，并构建带超时控制的 HTTP 客户端。
     *
     * @param systemPrompt       系统提示生成器
     * @param encryptionUtil     加密工具
     * @param appConfig          应用配置
     * @param restTemplateBuilder RestTemplate 构建器
     */
    public ChatService(StarIsleSystemPrompt systemPrompt,
                       EncryptionUtil encryptionUtil,
                       AppConfig appConfig,
                       RestTemplateBuilder restTemplateBuilder) {
        this.systemPrompt = systemPrompt;
        this.encryptionUtil = encryptionUtil;
        this.appConfig = appConfig;
        // 本地 1.5B 模型生成 200 token 可能耗时十几秒，读超时放宽到 90 秒
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(90))
                .build();
    }

    /**
     * 生成聊天响应
     * 把消息与历史上下文转发给 ai-engine，历史上下文最多取最近 10 条；
     * System Prompt 由 ai-engine 统一生成，避免两端人设漂移。
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

        // 只转发对话上下文，剔除 system 消息
        List<Map<String, Object>> chatContext = new ArrayList<>();
        if (context != null && !context.isEmpty()) {
            int startIndex = Math.max(0, context.size() - 10);
            for (Map<String, Object> item : context.subList(startIndex, context.size())) {
                Object role = item.get("role");
                if (role != null && "system".equals(role.toString())) {
                    continue;
                }
                chatContext.add(item);
            }
        }

        String responseText;
        String riskLevel = "green";
        List<String> emotionTags = List.of();
        String model = "unknown";
        try {
            AiChatResponse ai = generateApiResponse(userId, message, chatContext, userProfile);
            responseText = ai.getResponse();
            if (ai.getRiskLevel() != null) {
                riskLevel = ai.getRiskLevel();
            }
            if (ai.getEmotionTags() != null) {
                emotionTags = ai.getEmotionTags();
            }
            if (ai.getModel() != null && !ai.getModel().isBlank()) {
                model = ai.getModel();
            }
        } catch (Exception e) {
            // 不静默吞掉：记录原因后再走兜底文案
            log.warn("调用 ai-engine 失败，使用兜底回复: {}", e.toString());
            responseText = FALLBACK_REPLY;
        }

        long responseTimeMs = System.currentTimeMillis() - startTime;

        ChatResponse response = new ChatResponse(responseText, responseTimeMs, model);
        response.setRiskLevel(riskLevel);
        response.setEmotionTags(emotionTags);
        return response;
    }

    /**
     * 调用 ai-engine 的 /chat 接口获取模型回复。
     *
     * @param userId      用户标识
     * @param message     用户消息
     * @param context     已剔除 system 的对话上下文
     * @param userProfile 用户画像
     * @return ai-engine 原始响应
     */
    private AiChatResponse generateApiResponse(String userId, String message,
                                               List<Map<String, Object>> context,
                                               Map<String, Object> userProfile) {
        String url = appConfig.getAiService().getUrl() + "/chat";

        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId);
        payload.put("message", message);
        payload.put("context", context);
        payload.put("user_profile", userProfile == null ? Map.of() : userProfile);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        AiChatResponse ai = restTemplate.postForObject(url, request, AiChatResponse.class);
        if (ai == null || ai.getResponse() == null || ai.getResponse().isBlank()) {
            throw new IllegalStateException("ai-engine 返回空响应");
        }
        return ai;
    }

    /**
     * ai-engine /chat 响应体（snake_case）
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AiChatResponse {
        /** AI 回复正文 */
        private String response;
        /** 风险等级 */
        @JsonProperty("risk_level")
        private String riskLevel;
        /** 情绪标签 */
        @JsonProperty("emotion_tags")
        private List<String> emotionTags;
        /** 响应耗时（毫秒） */
        @JsonProperty("response_time_ms")
        private int responseTimeMs;
        /** 实际使用的模型 */
        private String model;
    }

    /**
     * 聊天响应结果
     * 封装响应内容、响应时间、风险等级、情绪标签与使用模型。
     */
    @Data
    public static class ChatResponse {
        /** 响应内容文本 */
        private String content;
        /** 响应耗时（毫秒） */
        private long responseTimeMs;
        /** 生成响应所使用的模型标识 */
        private String model;
        /** 风险等级 */
        private String riskLevel;
        /** 情绪标签 */
        private List<String> emotionTags;

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
