package com.starisle.service;

import com.starisle.utils.KeywordManager;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 风险检测服务
 * 结合关键词匹配与语义分析识别文本中的心理健康风险，
 * 支持多级风险评估与详细检测结果输出。
 */
@Service
public class RiskDetectionService {

    /** 关键词管理器，提供关键词检索能力 */
    private final KeywordManager keywordManager;
    /** 语义分析器，提供意图与强度分析能力 */
    private final SemanticAnalyzer semanticAnalyzer;

    /** 高风险关键词列表，命中即判定为红色风险 */
    private final List<String> highRiskKeywords = List.of(
        "自杀", "想死", "不想活", "活着没意义",
        "自残", "割腕", "跳楼", "伤害自己",
        "绝望", "没希望", "看不到未来"
    );

    /** 中风险关键词列表，命中即判定为橙色风险 */
    private final List<String> mediumRiskKeywords = List.of(
        "抑郁", "焦虑", "失眠", "情绪低落",
        "压力大", "喘不过气", "无法呼吸",
        "孤独", "被孤立", "没人理解"
    );

    /**
     * 构造方法
     * 注入关键词管理器与语义分析器依赖。
     *
     * @param keywordManager    关键词管理器
     * @param semanticAnalyzer 语义分析器
     */
    public RiskDetectionService(KeywordManager keywordManager, SemanticAnalyzer semanticAnalyzer) {
        this.keywordManager = keywordManager;
        this.semanticAnalyzer = semanticAnalyzer;
    }

    /**
     * 检测文本风险
     * 综合关键词检测与语义分析结果计算最终风险等级。
     *
     * @param userId  用户标识
     * @param content 待检测文本
     * @return 风险等级（red/orange/yellow/green）
     */
    public String detectRisk(String userId, String content) {
        KeywordDetectionResult keywordRisk = detectKeywords(content);
        SemanticAnalyzer.SemanticAnalysisResult semanticRisk = semanticAnalyzer.analyze(content);

        return calculateFinalRisk(keywordRisk, semanticRisk);
    }

    /**
     * 关键词检测
     * 逐条匹配高风险与中风险关键词，命中高风险返回红色，命中中风险返回橙色，否则返回绿色。
     *
     * @param content 待检测文本
     * @return 关键词检测结果，包含风险等级与命中关键词
     */
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
    
    /**
     * 计算最终风险等级
     * 关键词命中红色时直接返回红色，否则取关键词风险与语义风险的较高等级。
     *
     * @param keywordRisk  关键词检测结果
     * @param semanticRisk 语义分析结果
     * @return 最终风险等级（red/orange/yellow/green）
     */
    private String calculateFinalRisk(KeywordDetectionResult keywordRisk, SemanticAnalyzer.SemanticAnalysisResult semanticRisk) {
        if ("red".equals(keywordRisk.getLevel())) {
            return "red";
        }
        
        // 风险等级从低到高排列，取关键词与语义风险的较高等级
        List<String> riskLevels = List.of("green", "yellow", "orange", "red");
        
        int keywordIndex = riskLevels.indexOf(keywordRisk.getLevel());
        int semanticIndex = riskLevels.indexOf(semanticRisk.getRiskLevel());
        
        int finalIndex = Math.max(keywordIndex, semanticIndex);
        
        return riskLevels.get(finalIndex);
    }
    
    /**
     * 获取风险检测详情
     * 汇总关键词命中结果与语义分析意图、置信度。
     *
     * @param content 待检测文本
     * @return 风险检测详情对象
     */
    public RiskDetectionDetails getDetectionDetails(String content) {
        KeywordDetectionResult keywordResult = detectKeywords(content);
        SemanticAnalyzer.SemanticAnalysisResult semanticResult = semanticAnalyzer.analyze(content);
        
        return new RiskDetectionDetails(
            keywordResult.getKeywords(),
            semanticResult.getIntent(),
            semanticResult.getConfidence()
        );
    }
    
    /**
     * 关键词检测结果
     * 包含风险等级与命中关键词。
     */
    @Data
    public static class KeywordDetectionResult {
        /** 风险等级：red、orange、green */
        private String level;
        /** 命中的关键词列表 */
        private List<String> keywords;
        
        /**
         * 构造方法
         *
         * @param level    风险等级
         * @param keywords 命中关键词列表
         */
        public KeywordDetectionResult(String level, List<String> keywords) {
            this.level = level;
            this.keywords = keywords;
        }
    }
    
    /**
     * 风险检测详情
     * 包含命中关键词、语义意图与置信度。
     */
    @Data
    public static class RiskDetectionDetails {
        /** 检测命中的关键词列表 */
        private List<String> keywordsDetected;
        /** 语义分析识别的意图 */
        private String semanticIntent;
        /** 语义分析置信度，0-1 之间 */
        private double confidence;
        
        /**
         * 构造方法
         *
         * @param keywordsDetected 命中关键词列表
         * @param semanticIntent   语义意图
         * @param confidence       置信度
         */
        public RiskDetectionDetails(List<String> keywordsDetected, String semanticIntent, double confidence) {
            this.keywordsDetected = keywordsDetected;
            this.semanticIntent = semanticIntent;
            this.confidence = confidence;
        }
    }
}