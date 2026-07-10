package com.starisle.utils;

import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class KeywordManager {
    
    private final Map<String, Map<String, List<String>>> keywords;
    
    public KeywordManager() {
        this.keywords = loadKeywords();
    }
    
    private Map<String, Map<String, List<String>>> loadKeywords() {
        Map<String, Map<String, List<String>>> keywordMap = new HashMap<>();
        
        Map<String, List<String>> highRisk = new HashMap<>();
        highRisk.put("自杀意念", List.of("自杀", "想死", "不想活", "活着没意义", "没意义"));
        highRisk.put("自伤行为", List.of("自残", "割腕", "跳楼", "伤害自己", "割自己"));
        highRisk.put("绝望感", List.of("绝望", "没希望", "看不到未来", "没有未来"));
        keywordMap.put("high_risk", highRisk);
        
        Map<String, List<String>> mediumRisk = new HashMap<>();
        mediumRisk.put("抑郁情绪", List.of("抑郁", "情绪低落", "心情不好", "很丧"));
        mediumRisk.put("焦虑症状", List.of("焦虑", "紧张", "担心", "慌", "不安"));
        mediumRisk.put("睡眠问题", List.of("失眠", "睡不着", "睡不着觉", "整夜睡不着"));
        mediumRisk.put("社交困扰", List.of("孤独", "被孤立", "没人理解", "没朋友"));
        keywordMap.put("medium_risk", mediumRisk);
        
        Map<String, List<String>> lowRisk = new HashMap<>();
        lowRisk.put("学业压力", List.of("压力大", "喘不过气", "学习压力", "考试压力"));
        lowRisk.put("人际关系", List.of("和朋友吵架", "被朋友孤立", "人际问题"));
        lowRisk.put("家庭矛盾", List.of("和父母吵架", "家庭矛盾", "爸妈不理解"));
        keywordMap.put("low_risk", lowRisk);
        
        return keywordMap;
    }
    
    public KeywordResult checkKeywords(String content) {
        List<String> matchedKeywords = new ArrayList<>();
        String riskLevel = "low";
        List<String> categories = new ArrayList<>();
        
        for (Map.Entry<String, List<String>> entry : keywords.get("high_risk").entrySet()) {
            String category = entry.getKey();
            for (String keyword : entry.getValue()) {
                if (content.contains(keyword)) {
                    matchedKeywords.add(keyword);
                    categories.add(category);
                    riskLevel = "high";
                }
            }
        }
        
        if ("low".equals(riskLevel)) {
            for (Map.Entry<String, List<String>> entry : keywords.get("medium_risk").entrySet()) {
                String category = entry.getKey();
                for (String keyword : entry.getValue()) {
                    if (content.contains(keyword)) {
                        matchedKeywords.add(keyword);
                        categories.add(category);
                        riskLevel = "medium";
                    }
                }
            }
        }
        
        if ("low".equals(riskLevel)) {
            for (Map.Entry<String, List<String>> entry : keywords.get("low_risk").entrySet()) {
                String category = entry.getKey();
                for (String keyword : entry.getValue()) {
                    if (content.contains(keyword)) {
                        matchedKeywords.add(keyword);
                        categories.add(category);
                    }
                }
            }
        }
        
        return new KeywordResult(riskLevel, matchedKeywords, categories);
    }
    
    @Data
    public static class KeywordResult {
        private String riskLevel;
        private List<String> matchedKeywords;
        private List<String> categories;
        
        public KeywordResult(String riskLevel, List<String> matchedKeywords, List<String> categories) {
            this.riskLevel = riskLevel;
            this.matchedKeywords = matchedKeywords;
            this.categories = categories;
        }
    }
}