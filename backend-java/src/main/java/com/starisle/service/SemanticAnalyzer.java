package com.starisle.service;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SemanticAnalyzer {
    
    private final double confidenceThreshold = Double.parseDouble(
        System.getenv().getOrDefault("SEMANTIC_CONFIDENCE_THRESHOLD", "0.7")
    );
    
    public SemanticAnalysisResult analyze(String content) {
        String intent = detectIntent(content);
        String intensity = analyzeIntensity(content);
        String riskLevel = calculateRisk(intent, intensity);
        
        return new SemanticAnalysisResult(riskLevel, 0.85, intent, intensity);
    }
    
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
    
    private String calculateRisk(String intent, String intensity) {
        if ("self_harm".equals(intent)) {
            if ("severe".equals(intensity)) {
                return "red";
            } else if ("moderate".equals(intensity)) {
                return "orange";
            } else {
                return "yellow";
            }
        } else if ("help_seeking".equals(intent)) {
            return "yellow";
        } else if ("emotion_expression".equals(intent)) {
            if ("severe".equals(intensity)) {
                return "yellow";
            } else {
                return "green";
            }
        } else {
            return "green";
        }
    }
    
    @Data
    public static class SemanticAnalysisResult {
        private String riskLevel;
        private double confidence;
        private String intent;
        private String intensity;
        
        public SemanticAnalysisResult(String riskLevel, double confidence, String intent, String intensity) {
            this.riskLevel = riskLevel;
            this.confidence = confidence;
            this.intent = intent;
            this.intensity = intensity;
        }
    }
}