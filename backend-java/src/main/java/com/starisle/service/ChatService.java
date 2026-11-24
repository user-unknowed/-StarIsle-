package com.starisle.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.starisle.config.AppConfig;
import com.starisle.utils.EncryptionUtil;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 聊天服务
 * 将用户消息转发到 ai-engine 的 {@code POST /chat}（本地 SFT 模型 + RAG），
 * 并把模型回复、风险等级、情绪标签与耗时封装为统一结果。
 */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    /** ai-engine 不可用或返回空内容时的兜底文案 */
    private static final String FALLBACK_REPLY = "小星好像有点迷糊了，请稍后再试试～";

    /** 系统提示生成器，保留用于引擎不可用时的话术扩展 */
    private final StarIsleSystemPrompt systemPrompt;
    /** 加密工具，用于敏感数据加密 */
    private final EncryptionUtil encryptionUtil;
    /** 应用配置，提供 ai-engine 接入地址与内部令牌 */
    private final AppConfig appConfig;
    /** JSON 序列化工具 */
    private final ObjectMapper objectMapper;
    /** HTTP 客户端，复用连接调用 ai-engine */
    private final HttpClient httpClient;

    /**
     * 构造方法
     * 注入系统提示、加密工具、应用配置与 JSON 工具。
     *
     * @param systemPrompt   系统提示生成器
     * @param encryptionUtil 加密工具
     * @param appConfig      应用配置
     * @param objectMapper   JSON 序列化工具
     */
    public ChatService(StarIsleSystemPrompt systemPrompt,
                       EncryptionUtil encryptionUtil,
                       AppConfig appConfig,
                       ObjectMapper objectMapper) {
        this.systemPrompt = systemPrompt;
        this.encryptionUtil = encryptionUtil;
        this.appConfig = appConfig;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * 生成聊天响应
     * 调用 ai-engine 的 /chat 端点（本地 SFT 模型 + RAG），历史上下文最多取最近 10 条；
     * System Prompt 由 ai-engine 统一生成，失败时返回兜底文案。
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

        // 只转发最近 10 条对话上下文，剔除 system 消息
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

        try {
            ChatResponse response = callAiEngine(userId, message, chatContext, userProfile);
            // 引擎返回空文本时使用兜底文案，避免客户端展示空白
            if (response.getContent() == null || response.getContent().isBlank()) {
                response.setContent(FALLBACK_REPLY);
            }
            return response;
        } catch (Exception e) {
            // 不静默吞掉：记录原因后再走兜底文案
            log.warn("调用 ai-engine 失败，使用兜底回复: {}", e.toString());
            long responseTimeMs = System.currentTimeMillis() - startTime;
            ChatResponse response = new ChatResponse(FALLBACK_REPLY, responseTimeMs, "unavailable");
            response.setRiskLevel("green");
            response.setEmotionTags(List.of());
            return response;
        }
    }

    /**
     * 调用 ai-engine 本地模型端点
     *
     * @param userId      用户标识
     * @param message     用户消息
     * @param context     历史上下文
     * @param userProfile 用户画像
     * @return 引擎返回的完整聊天响应
     * @throws Exception 网络或解析异常
     */
    private ChatResponse callAiEngine(String userId, String message,
                                      List<Map<String, Object>> context,
                                      Map<String, Object> userProfile) throws Exception {
        // 组装与 ai-engine /chat 一致的下划线字段请求体
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId);
        payload.put("message", message);
        payload.put("context", context != null ? context : List.of());
        payload.put("user_profile", userProfile != null ? userProfile : Map.of());

        String url = trimTrailingSlash(appConfig.getAiService().getUrl()) + "/chat";
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json; charset=utf-8");
        // 携带内部令牌，ai-engine 只接受来自网关的调用
        String internalToken = appConfig.getAiService().getToken();
        if (internalToken != null && !internalToken.isBlank()) {
            requestBuilder.header("X-Internal-Token", internalToken);
        }
        HttpRequest request = requestBuilder
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();

        HttpResponse<String> httpResponse = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (httpResponse.statusCode() != 200) {
            throw new IllegalStateException("ai-engine 返回状态码 " + httpResponse.statusCode());
        }

        // 解析引擎响应，映射为客户端约定的字段
        JsonNode root = objectMapper.readTree(httpResponse.body());
        ChatResponse response = new ChatResponse(
                root.path("response").asText(""),
                root.path("response_time_ms").asLong(0),
                root.path("model").asText("qwen2-1.5b-sft")
        );
        response.setRiskLevel(root.path("risk_level").asText("green"));

        List<String> emotionTags = new ArrayList<>();
        root.path("emotion_tags").forEach(node -> emotionTags.add(node.asText()));
        response.setEmotionTags(emotionTags);

        return response;
    }

    /**
     * 去除地址末尾斜杠，避免拼接出双斜杠
     *
     * @param url 服务地址
     * @return 规范化后的地址
     */
    private String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "http://localhost:8000";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
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
        /** 情绪标签列表 */
        private List<String> emotionTags = new ArrayList<>();

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
