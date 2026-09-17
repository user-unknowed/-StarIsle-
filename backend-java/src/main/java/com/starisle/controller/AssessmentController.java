package com.starisle.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 心理测评接口控制器
 * 提供测评问卷查询、测评结果提交与测评结果查询等接口，
 * 用于评估学生近期心理健康状况。
 */
@RestController
@RequestMapping("/api/v1/assessment")
@RequiredArgsConstructor
public class AssessmentController {

    /**
     * 按类型获取测评问卷（公开接口）
     *
     * @HTTP GET /api/v1/assessment/questions/{type}
     * @param type 测评类型
     * @return 测评题干、选项、权重等信息
     */
    @GetMapping("/questions/{type}")
    public ResponseEntity<Map<String, Object>> getAssessmentQuestions(@PathVariable String type) {
        // 返回内置的情绪探索问卷
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

    /**
     * 提交测评答卷
     *
     * @HTTP POST /api/v1/assessment/submit
     * @param request 测评提交请求
     * @return 包含总得分与结果 ID 的响应
     */
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitAssessment(@RequestBody SubmitAssessmentRequest request) {
        // 累加各题答案分数得到总分
        int totalScore = request.getAnswers().stream().mapToInt(Integer::intValue).sum();

        return ResponseEntity.ok(Map.of(
            "message", "测评提交成功",
            "user_id", request.getUserId(),
            "total_score", totalScore,
            "result_id", "generated-result-id"
        ));
    }

    /**
     * 查询测评结果详情
     *
     * @HTTP GET /api/v1/assessment/result/{id}
     * @param id 结果 ID
     * @return 测评结果，包括风险等级、建议与推荐
     */
    @GetMapping("/result/{id}")
    public ResponseEntity<Map<String, Object>> getAssessmentResult(@PathVariable String id) {
        // 返回内置的测评结果示例
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

    /**
     * 测评提交请求 DTO
     */
    @Data
    public static class SubmitAssessmentRequest {
        // 用户 ID
        private String userId;
        // 测评类型
        private String type;
        // 各题答案分数列表
        private List<Integer> answers;
    }
}
