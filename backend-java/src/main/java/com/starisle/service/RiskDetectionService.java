package com.starisle.service;

import com.starisle.utils.KeywordManager;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 风险检测服务
 * 结合关键词匹配与语义分析识别文本中的危机信号，
 * 仅输出布尔危机信号与检测明细，不做等级划分。
 */
@Service
public class RiskDetectionService {

    /** 关键词管理器，提供关键词检索能力 */
    private final KeywordManager keywordManager;
    /** 语义分析器，提供意图与强度分析能力 */
    private final SemanticAnalyzer semanticAnalyzer;

    /** 高危危机关键词列表，命中即视为危机信号 */
    private final List<String> highRiskKeywords = List.of(
        "自杀", "想死", "不想活", "活着没意义",
        "自残", "割腕", "跳楼", "伤害自己",
        "绝望", "没希望", "看不到未来"
    );

    /** 中危关注关键词列表，命中用于记录但不构成危机信号 */
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
     * 检测文本危机信号
     * 综合关键词检测与语义分析，输出无等级的布尔危机结果。
     *
     * @param userId  用户标识
     * @param content 待检测文本
     * @return 危机检测结果，包含危机信号、触发关键词、意图与来源
     */
    public RiskDetectionResult detectRisk(String userId, String content) {
        KeywordDetectionResult keywordRisk = detectKeywords(content);
        SemanticAnalyzer.SemanticAnalysisResult semanticRisk = semanticAnalyzer.analyze(content);

        boolean crisis = keywordRisk.isHighRisk() || semanticRisk.isCrisis();

        String source;
        if (keywordRisk.isHighRisk()) {
            source = "keyword";
        } else if (semanticRisk.isCrisis()) {
            source = "semantic";
        } else {
            source = "none";
        }

        return new RiskDetectionResult(crisis, keywordRisk.getKeywords(), semanticRisk.getIntent(), source);
    }

    /**
     * 关键词检测
     * 收集命中的高危与关注关键词，仅标记是否命中高危，不产生等级。
     *
     * @param content 待检测文本
     * @return 关键词检测结果，包含是否高危与命中关键词
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
            return new KeywordDetectionResult(true, detectedHigh);
        } else {
            return new KeywordDetectionResult(false, detectedMedium);
        }
    }

    /**
     * 获取危机检测详情
     * 汇总关键词命中结果与语义分析意图、置信度。
     *
     * @param content 待检测文本
     * @return 危机检测详情对象
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
     * 包含是否命中高危关键词与命中关键词。
     */
    @Data
    public static class KeywordDetectionResult {
        /** 是否命中高危危机关键词 */
        private boolean highRisk;
        /** 命中的关键词列表 */
        private List<String> keywords;

        /**
         * 构造方法
         *
         * @param highRisk 是否命中高危危机关键词
         * @param keywords 命中关键词列表
         */
        public KeywordDetectionResult(boolean highRisk, List<String> keywords) {
            this.highRisk = highRisk;
            this.keywords = keywords;
        }
    }

    /**
     * 危机检测结果
     * 包含危机信号、触发关键词、语义意图与信号来源。
     */
    @Data
    public static class RiskDetectionResult {
        /** 是否存在危机信号 */
        private boolean crisis;
        /** 触发检测的关键词列表 */
        private List<String> triggeredKeywords;
        /** 语义分析识别的意图 */
        private String intent;
        /** 信号来源：keyword、semantic、none */
        private String source;

        /**
         * 构造方法
         *
         * @param crisis            是否存在危机信号
         * @param triggeredKeywords 触发关键词列表
         * @param intent            语义意图
         * @param source            信号来源
         */
        public RiskDetectionResult(boolean crisis, List<String> triggeredKeywords, String intent, String source) {
            this.crisis = crisis;
            this.triggeredKeywords = triggeredKeywords;
            this.intent = intent;
            this.source = source;
        }
    }

    /**
     * 危机检测详情
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
