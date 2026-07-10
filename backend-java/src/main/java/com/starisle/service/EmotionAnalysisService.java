package com.starisle.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmotionAnalysisService {
    
    private final List<String> emotionLabels = List.of(
        "开心", "兴奋", "平静", "焦虑",
        "担忧", "愤怒", "悲伤", "孤独",
        "疲惫", "迷茫", "无助"
    );
    
    public List<String> analyze(String content) {
        try {
            return keywordBasedAnalysis(content);
        } catch (Exception e) {
            return keywordBasedAnalysis(content);
        }
    }
    
    private List<String> keywordBasedAnalysis(String content) {
        List<String> detectedEmotions = new ArrayList<>();
        
        Map<String, List<String>> emotionKeywords = new HashMap<>();
        emotionKeywords.put("开心", List.of("开心", "高兴", "快乐", "棒", "好"));
        emotionKeywords.put("悲伤", List.of("难过", "伤心", "悲伤", "失落", "哭"));
        emotionKeywords.put("焦虑", List.of("焦虑", "紧张", "担心", "慌", "不安"));
        emotionKeywords.put("愤怒", List.of("生气", "愤怒", "烦", "讨厌", "恨"));
        emotionKeywords.put("孤独", List.of("孤独", "孤单", "一个人", "没人"));
        emotionKeywords.put("疲惫", List.of("累", "疲惫", "困", "无力", "辛苦"));
        
        for (Map.Entry<String, List<String>> entry : emotionKeywords.entrySet()) {
            String emotion = entry.getKey();
            for (String keyword : entry.getValue()) {
                if (content.contains(keyword)) {
                    detectedEmotions.add(emotion);
                    break;
                }
            }
        }
        
        if (detectedEmotions.isEmpty()) {
            detectedEmotions.add("平静");
        }
        
        return detectedEmotions;
    }
}