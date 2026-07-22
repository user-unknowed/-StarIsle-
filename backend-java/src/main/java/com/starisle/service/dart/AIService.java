package com.starisle.service.dart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AIService {
    private static final String ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
    private static final String SILICON_FLOW_BASE_URL = "https://api.siliconflow.cn/v1";
    
    private String apiKey;
    private String currentProvider = "zhipu";
    
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AIService() {}

    public AIService(String apiKey) {
        this.apiKey = apiKey;
    }

    public void setApiKey(String key) {
        this.apiKey = key;
    }

    public void switchProvider(String provider) {
        this.currentProvider = provider;
    }

    public String generateArticle(String topic, String style, Integer wordCount, String additionalRequirements) throws Exception {
        String effectiveStyle = style != null ? style : "professional";
        int effectiveWordCount = wordCount != null ? wordCount : 800;
        
        String systemPrompt = buildSystemPrompt("article_writer");
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请根据以下主题撰写一篇").append(effectiveWordCount).append("字左右的文章：\n\n");
        userPrompt.append("主题：").append(topic).append("\n\n");
        userPrompt.append("风格要求：").append(getStyleDescription(effectiveStyle)).append("\n\n");
        if (additionalRequirements != null) {
            userPrompt.append("附加要求：").append(additionalRequirements).append("\n\n");
        }
        userPrompt.append("请确保文章结构清晰、内容专业、语言流畅，符合青少年心理健康教育领域的特点。");

        return callAPI(systemPrompt, userPrompt.toString());
    }

    public String summarizeContent(String content, Integer summaryLength, String summaryType) throws Exception {
        int effectiveSummaryLength = summaryLength != null ? summaryLength : 200;
        String effectiveSummaryType = summaryType != null ? summaryType : "general";
        
        String systemPrompt = buildSystemPrompt("summarizer");
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请对以下内容进行").append(effectiveSummaryType.equals("academic") ? "学术性" : "一般性");
        userPrompt.append("摘要，控制在").append(effectiveSummaryLength).append("字左右：\n\n");
        userPrompt.append("原文内容：\n").append(content).append("\n\n");
        userPrompt.append("要求：提取核心要点，保持逻辑清晰，准确传达原文主旨。");

        return callAPI(systemPrompt, userPrompt.toString());
    }

    public String convertStyle(String content, String targetStyle) throws Exception {
        String systemPrompt = buildSystemPrompt("style_converter");
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请将以下文本转换为\"").append(targetStyle).append("\"风格：\n\n");
        userPrompt.append("原文：\n").append(content).append("\n\n");
        userPrompt.append("目标风格特点：").append(getStyleDescription(targetStyle)).append("\n\n");
        userPrompt.append("请保持原文内容不变，仅改变表达方式和语言风格。");

        return callAPI(systemPrompt, userPrompt.toString());
    }

    public String analyzeTopic(String content, boolean includeSentiment, boolean includeKeywords, boolean includeSuggestions) throws Exception {
        String systemPrompt = buildSystemPrompt("topic_analyzer");
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请对以下内容进行主题分析：\n\n");
        userPrompt.append("内容：\n").append(content).append("\n\n");
        userPrompt.append("分析要求：\n");
        if (includeSentiment) {
            userPrompt.append("- 情感分析：识别文本的情感倾向\n");
        }
        if (includeKeywords) {
            userPrompt.append("- 关键词提取：列出核心关键词\n");
        }
        if (includeSuggestions) {
            userPrompt.append("- 改进建议：针对内容提出优化建议\n");
        }
        userPrompt.append("\n请以结构化方式输出分析结果。");

        return callAPI(systemPrompt, userPrompt.toString());
    }

    private String buildSystemPrompt(String role) {
        Map<String, String> rolePrompts = Map.of(
            "article_writer", """
                你是一名专业的青少年心理健康教育文章撰稿人。
                
                角色背景：
                - 拥有心理学专业背景，熟悉青少年心理发展规律
                - 长期从事心理健康教育工作，了解教师和学生的需求
                - 擅长将专业知识转化为通俗易懂的教育内容
                
                语言风格：
                - 温和亲切，富有同理心
                - 专业严谨，数据准确
                - 鼓励性强，传递正能量
                - 适合青少年阅读，避免使用过于学术化的术语
                
                专业领域知识：
                - 青少年情绪管理
                - 压力应对策略
                - 人际交往技巧
                - 自我认知与成长
                - 心理健康维护
                
                写作要求：
                - 结构清晰，层次分明
                - 观点明确，论据充分
                - 语言流畅，易于理解
                - 符合教育目的，传递积极价值观
                """,
            "summarizer", """
                你是一名专业的内容摘要专家，擅长提炼文本核心信息。
                
                角色背景：
                - 拥有信息学和心理学双专业背景
                - 熟悉教育领域文本的特点和重点
                - 擅长在保持信息完整性的前提下进行精准概括
                
                语言风格：
                - 简洁明了，直击要点
                - 逻辑清晰，层次分明
                - 客观中立，不添加主观评价
                
                专业能力：
                - 快速识别文本主旨和关键信息
                - 准确提取核心论点和论据
                - 保持原文逻辑结构和重要关系
                - 根据需求调整摘要的详细程度
                
                摘要要求：
                - 保留关键数据和结论
                - 不遗漏重要观点
                - 语言精炼，避免冗余
                - 符合原文风格和语境
                """,
            "style_converter", """
                你是一名精通多种写作风格的语言转换专家。
                
                角色背景：
                - 拥有文学和教育学专业背景
                - 熟悉各种文体的特点和规范
                - 擅长在不同风格间进行自然转换
                
                语言风格库：
                - 正式专业：适合学术论文、研究报告
                - 通俗易懂：适合科普文章、大众读物
                - 温暖亲切：适合心理辅导、情感文章
                - 幽默风趣：适合轻松话题、互动内容
                - 激励鼓舞：适合励志文章、演讲文稿
                
                转换要求：
                - 保持内容的准确性和完整性
                - 自然流畅，不生硬
                - 符合目标风格的语言特点
                - 根据受众调整表达方式
                """,
            "topic_analyzer", """
                你是一名专业的文本分析专家，擅长主题挖掘和内容评估。
                
                角色背景：
                - 拥有语言学和心理学专业背景
                - 熟悉青少年心理健康领域的内容特点
                - 擅长从多角度进行深度分析
                
                分析能力：
                - 主题识别：准确判断文本的核心主题
                - 情感分析：识别文本的情感倾向和强度
                - 关键词提取：提炼最具代表性的关键词
                - 内容评估：评估内容质量和适用性
                
                分析要求：
                - 客观中立，基于文本事实
                - 结构清晰，分点论述
                - 提供具体的改进建议
                - 结合青少年心理健康教育的专业视角
                """
        );

        return rolePrompts.getOrDefault(role, rolePrompts.get("article_writer"));
    }

    private String getStyleDescription(String style) {
        Map<String, String> descriptions = Map.of(
            "professional", "专业严谨，适合学术或正式场合",
            "casual", "轻松随意，适合日常交流",
            "warm", "温暖亲切，富有同理心",
            "humorous", "幽默风趣，轻松愉快",
            "inspirational", "激励鼓舞，充满正能量",
            "academic", "学术规范，严谨专业",
            "simple", "通俗易懂，适合大众阅读"
        );
        return descriptions.getOrDefault(style, descriptions.get("professional"));
    }

    private String callAPI(String systemPrompt, String userPrompt) throws Exception {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("API密钥未配置，请先设置API Key");
        }

        try {
            if ("zhipu".equals(currentProvider)) {
                return callZhipuAPI(systemPrompt, userPrompt);
            } else {
                return callSiliconFlowAPI(systemPrompt, userPrompt);
            }
        } catch (Exception e) {
            if ("zhipu".equals(currentProvider)) {
                currentProvider = "siliconflow";
                return callSiliconFlowAPI(systemPrompt, userPrompt);
            }
            throw e;
        }
    }

    private String callZhipuAPI(String systemPrompt, String userPrompt) throws Exception {
        String url = ZHIPU_BASE_URL + "/chat/completions";
        
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userPrompt));
        
        Map<String, Object> body = Map.of(
            "model", "glm-4-flash",
            "messages", messages,
            "temperature", 0.7,
            "max_tokens", 2048
        );

        String jsonBody = objectMapper.writeValueAsString(body);
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode data = objectMapper.readTree(response.body());
            String content = data.get("choices").get(0).get("message").get("content").asText();
            return content != null ? content.trim() : "生成失败";
        } else {
            throw new Exception("API调用失败: " + response.statusCode() + " - " + response.body());
        }
    }

    private String callSiliconFlowAPI(String systemPrompt, String userPrompt) throws Exception {
        String url = SILICON_FLOW_BASE_URL + "/chat/completions";
        
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", userPrompt));
        
        Map<String, Object> body = Map.of(
            "model", "Qwen/Qwen2-7B-Instruct",
            "messages", messages,
            "temperature", 0.7,
            "max_tokens", 2048
        );

        String jsonBody = objectMapper.writeValueAsString(body);
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            JsonNode data = objectMapper.readTree(response.body());
            String content = data.get("choices").get(0).get("message").get("content").asText();
            return content != null ? content.trim() : "生成失败";
        } else {
            throw new Exception("API调用失败: " + response.statusCode() + " - " + response.body());
        }
    }
}