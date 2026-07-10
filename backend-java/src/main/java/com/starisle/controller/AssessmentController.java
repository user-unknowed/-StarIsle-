package com.starisle.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/assessment")
@RequiredArgsConstructor
public class AssessmentController {
    
    @GetMapping("/questions/{type}")
    public ResponseEntity<Map<String, Object>> getAssessmentQuestions(@PathVariable String type) {
        return ResponseEntity.ok(Map.of(
            "type", type,
            "title", "情绪探索",
            "description", "了解你最近的情绪状态",
            "questions", List.of(
                Map.of(
                    "id", "q1",
                    "question", "最近两周，你感到心情低落、沮丧或绝望的频率是？",
                    "options", List.of("完全没有", "有几天", "超过一半的时间", "几乎每天"),
                    "weight", 1
                ),
                Map.of(
                    "id", "q2",
                    "question", "最近两周，你对平时感兴趣的事情失去兴趣的频率是？",
                    "options", List.of("完全没有", "有几天", "超过一半的时间", "几乎每天"),
                    "weight", 1
                )
            ),
            "total_questions", 9
        ));
    }
    
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitAssessment(@RequestBody SubmitAssessmentRequest request) {
        int totalScore = request.getAnswers().stream().mapToInt(Integer::intValue).sum();
        
        return ResponseEntity.ok(Map.of(
            "message", "测评提交成功",
            "user_id", request.getUserId(),
            "total_score", totalScore,
            "result_id", "generated-result-id"
        ));
    }
    
    @GetMapping("/result/{id}")
    public ResponseEntity<Map<String, Object>> getAssessmentResult(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "result_id", id,
            "total_score", 5,
            "risk_level", "green",
            "description", "你最近的心情好像还不错呢！继续保持～",
            "suggestions", List.of(
                "继续每天的心情打卡，观察情绪变化",
                "试试我们的呼吸练习，保持放松",
                "和小星聊聊你最近的开心事"
            ),
            "recommendations", List.of(
                Map.of("type", "meditation", "id", "meditation_1", "title", "考前放松")
            )
        ));
    }
    
    @Data
    public static class SubmitAssessmentRequest {
        private String userId;
        private String type;
        private List<Integer> answers;
    }
}