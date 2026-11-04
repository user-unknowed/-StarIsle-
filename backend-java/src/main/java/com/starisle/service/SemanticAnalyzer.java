package com.starisle.service;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 语义分析器
 * 检测文本意图与情感强度，支持自伤倾向识别与求助意图判断，
 * 仅输出布尔危机信号，不做风险等级划分。
 */
@Service
public class SemanticAnalyzer {
    
    /** 置信度阈值，由环境变量 SEMANTIC_CONFIDENCE_THRESHOLD 配置，默认 0.7 */
    private final double confidenceThreshold = Double.parseDouble(
        System.getenv().getOrDefault("SEMANTIC_CONFIDENCE_THRESHOLD", "0.7")
    );
    
    /**
     * 分析文本语义
     * 综合意图检测与强度分析生成分析结果。
     *
     * @param content 待分析文本
     * @return 语义分析结果，包含危机信号、置信度、意图与强度
     */
    public SemanticAnalysisResult analyze(String content) {
        String intent = detectIntent(content);
        String intensity = analyzeIntensity(content);
        boolean crisis = "self_harm".equals(intent);
        
        return new SemanticAnalysisResult(crisis, 0.85, intent, intensity);
    }
    
    /**
     * 检测文本意图
     * 按自伤倾向、求助意图、情绪表达与闲聊顺序匹配，返回首个命中意图。
     *
     * @param content 待分析文本
     * @return 意图标识：self_harm、help_seeking、emotion_expression、casual_chat
     */
    private String detectIntent(String content) {
        List<String> selfHarmIndicators = List.of(
            "不想", "结束", "消失", "解脱",
            "没有意义", "无所谓", "随便"
        );
        
        for (String indicator : selfHarmIndicators) {
            if (content.contains(indicator)) {
                if (content.contains("活着") || content.contains("生命") || 
                    content.contains("未来") || content.contains("自己")) {
                    return "self_harm";
                }
            }
        }
        
        List<String> helpSeekingIndicators = List.of(
            "想聊聊", "需要帮助", "有人能帮我", "怎么办",
            "不知道该怎么", "需要有人"
        );
        
        for (String indicator : helpSeekingIndicators) {
            if (content.contains(indicator)) {
                return "help_seeking";
            }
        }
        
        List<String> emotionWords = List.of("难过", "伤心", "累", "烦", "开心", "高兴");
        for (String word : emotionWords) {
            if (content.contains(word)) {
                return "emotion_expression";
            }
        }
        
        return "casual_chat";
    }
    
    /**
     * 分析情感强度
     * 按高强度、中强度关键词匹配，返回 severe、moderate 或 mild。
     *
     * @param content 待分析文本
     * @return 强度标识：severe、moderate、mild
     */
    private String analyzeIntensity(String content) {
        List<String> highIntensity = List.of("非常", "特别", "超级", "极其", "真的");
        List<String> moderateIntensity = List.of("有点", "稍微", "一些", "蛮");
        
        for (String word : highIntensity) {
            if (content.contains(word)) {
                return "severe";
            }
        }
        
        for (String word : moderateIntensity) {
            if (content.contains(word)) {
                return "moderate";
            }
        }
        
        return "mild";
    }
    
    /**
     * 语义分析结果
     * 封装危机信号、置信度、意图与强度信息。
     */
    @Data
    public static class SemanticAnalysisResult {
        /** 是否存在自伤危机信号 */
        private boolean crisis;
        /** 分析置信度，0-1 之间 */
        private double confidence;
        /** 识别的意图标识 */
        private String intent;
        /** 情感强度标识 */
        private String intensity;
        
        /**
         * 构造方法
         *
         * @param crisis     是否存在自伤危机信号
         * @param confidence 置信度
         * @param intent     意图
         * @param intensity  强度
         */
        public SemanticAnalysisResult(boolean crisis, double confidence, String intent, String intensity) {
            this.crisis = crisis;
            this.confidence = confidence;
            this.intent = intent;
            this.intensity = intensity;
        }
    }
}
