package com.starisle.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.starisle.config.AppConfig;
import com.starisle.utils.EncryptionUtil;
import lombok.Data;
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
 * 将用户消息转发到 ai-engine（本地 SFT 模型）生成回复，
 * 并把回复内容、风险等级、情绪标签与耗时回传给客户端。
 */
@Service
public class ChatService {

    /** 系统提示生成器，保留用于引擎不可用时的话术扩展 */
    private final StarIsleSystemPrompt systemPrompt;
    /** 加密工具，用于敏感数据加密 */
    private final EncryptionUtil encryptionUtil;
    /** 应用配置，提供 ai-engine 接入地址 */
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
     * 调用 ai-engine 的 /chat 端点（本地 SFT 模型 + RAG），
     * 失败时返回兜底文案，保证客户端始终有可展示内容。
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

        try {
            ChatResponse response = callAiEngine(userId, message, context, userProfile);
            // 引擎返回空文本时使用兜底文案，避免客户端展示空白
            if (response.getContent() == null || response.getContent().isBlank()) {
                response.setContent("小星好像有点迷糊了，请稍后再试试～");
            }
            return response;
        } catch (Exception e) {
            long responseTimeMs = System.currentTimeMillis() - startTime;
            return new ChatResponse("小星好像有点迷糊了，请稍后再试试～", responseTimeMs, "unavailable");
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
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json; charset=utf-8")
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
     * 封装响应内容、风险等级、情绪标签、响应时间与使用模型。
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
