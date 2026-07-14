package com.starisle.service;

import com.starisle.utils.KeywordManager;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RiskDetectionService {
    
    private final KeywordManager keywordManager;
    private final SemanticAnalyzer semanticAnalyzer;
    
    private final List<String> highRiskKeywords = List.of(
        "自杀", "想死", "不想活", "活着没意义",
        "自残", "割腕", "跳楼", "伤害自己",
        "绝望", "没希望", "看不到未来"
    );
    
    private final List<String> mediumRiskKeywords = List.of(
        "抑郁", "焦虑", "失眠", "情绪低落",
        "压力大", "喘不过气", "无法呼吸",
        "孤独", "被孤立", "没人理解"
    );
    
    public RiskDetectionService(KeywordManager keywordManager, SemanticAnalyzer semanticAnalyzer) {
        this.keywordManager = keywordManager;
        this.semanticAnalyzer = semanticAnalyzer;
    }
    
    public String detectRisk(String userId, String content) {
        KeywordDetectionResult keywordRisk = detectKeywords(content);
        SemanticAnalyzer.SemanticAnalysisResult semanticRisk = semanticAnalyzer.analyze(content);
        
        return calculateFinalRisk(keywordRisk, semanticRisk);
    }
    
    private KeywordDetectionResult detectKeywords(String content) {
        List<String> detectedHigh = new ArrayList<>();
        List<String> detectedMedium = new ArrayList<>();
        
        for (String keyword : highRiskKeywords) {
            if (content.contains(keyword)) {
                detectedHigh.add(keyword);
            }
        }
        
        for (String keyword : mediumRiskKeywords) {
            if (content.contains(keyword)) {
                detectedMedium.add(keyword);
            }
        }
        
        if (!detectedHigh.isEmpty()) {
            return new KeywordDetectionResult("red", detectedHigh);
        } else if (!detectedMedium.isEmpty()) {
            return new KeywordDetectionResult("orange", detectedMedium);
        } else {
            return new KeywordDetectionResult("green", List.of());
        }
    }
    
    private String calculateFinalRisk(KeywordDetectionResult keywordRisk, SemanticAnalyzer.SemanticAnalysisResult semanticRisk) {
        if ("red".equals(keywordRisk.getLevel())) {
            return "red";
        }
        
        List<String> riskLevels = List.of("green", "yellow", "orange", "red");
        
        int keywordIndex = riskLevels.indexOf(keywordRisk.getLevel());
        int semanticIndex = riskLevels.indexOf(semanticRisk.getRiskLevel());
        
        int finalIndex = Math.max(keywordIndex, semanticIndex);
        
        return riskLevels.get(finalIndex);
    }
    
    public RiskDetectionDetails getDetectionDetails(String content) {
        KeywordDetectionResult keywordResult = detectKeywords(content);
        SemanticAnalyzer.SemanticAnalysisResult semanticResult = semanticAnalyzer.analyze(content);
        
        return new RiskDetectionDetails(
            keywordResult.getKeywords(),
            semanticResult.getIntent(),
            semanticResult.getConfidence()
        );
    }
    
    @Data
    public static class KeywordDetectionResult {
        private String level;
        private List<String> keywords;
        
        public KeywordDetectionResult(String level, List<String> keywords) {
            this.level = level;
            this.keywords = keywords;
        }
    }
    
    @Data
    public static class RiskDetectionDetails {
        private List<String> keywordsDetected;
        private String semanticIntent;
        private double confidence;
        
        public RiskDetectionDetails(List<String> keywordsDetected, String semanticIntent, double confidence) {
            this.keywordsDetected = keywordsDetected;
            this.semanticIntent = semanticIntent;
            this.confidence = confidence;
        }
    }
}