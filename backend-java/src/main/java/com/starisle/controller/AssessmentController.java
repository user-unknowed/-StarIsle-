package com.starisle.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.starisle.consent.ConsentScope;
import com.starisle.dto.ApiResponse;
import com.starisle.entity.AssessmentResult;
import com.starisle.repository.AssessmentResultRepository;
import com.starisle.service.ConsentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 心理测评接口控制器
 * 问卷公开可读；提交与结果查询属于个人数据，必须登录并取得本人显式授权，
 * 结果按用户归属落库，禁止跨用户读取。
 */
@RestController
@RequestMapping("/api/v1/assessment")
@RequiredArgsConstructor
@Validated
public class AssessmentController {

    // 测评结果仓储
    private final AssessmentResultRepository assessmentResultRepository;
    // 同意服务，负责个人数据访问门禁
    private final ConsentService consentService;
    // JSON 序列化器，用于保存答案明细
    private final ObjectMapper objectMapper;

    /**
     * 按类型获取测评问卷（公开接口，不含任何个人数据）
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
     * 用户 ID 一律取自登录态，忽略请求体中的 userId，防止冒用。
     *
     * @HTTP POST /api/v1/assessment/submit
     * @param request 测评提交请求
     * @param httpRequest 当前 HTTP 请求
     * @return 包含总得分与真实结果 ID 的响应
     */
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAssessment(
            @Validated @RequestBody SubmitAssessmentRequest request,
            HttpServletRequest httpRequest) {
        String userId = getCurrentUserId();

        // 门禁：测评结果属于个人数据，必须本人显式授权
        consentService.require(userId, ConsentScope.ASSESSMENT, httpRequest, "POST /api/v1/assessment/submit");

        if (request.getAnswers() == null || request.getAnswers().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.badRequest("答案不能为空"));
        }

        // 累加各题答案分数得到总分
        int totalScore = request.getAnswers().stream().mapToInt(Integer::intValue).sum();
        String riskLevel = resolveRiskLevel(totalScore);

        AssessmentResult result = AssessmentResult.builder()
                .userId(userId)
                .type(request.getType() == null || request.getType().isBlank() ? "emotion" : request.getType())
                .totalScore(totalScore)
                .riskLevel(riskLevel)
                .description(resolveDescription(riskLevel))
                .answersJson(writeAnswers(request.getAnswers()))
                .build();
        AssessmentResult saved = assessmentResultRepository.save(result);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user_id", userId);
        data.put("total_score", totalScore);
        data.put("risk_level", riskLevel);
        data.put("result_id", saved.getId());
        return ResponseEntity.ok(ApiResponse.success("测评提交成功", data));
    }

    /**
     * 查询测评结果详情（仅本人）
     *
     * @HTTP GET /api/v1/assessment/result/{id}
     * @param id 结果 ID
     * @param httpRequest 当前 HTTP 请求
     * @return 测评结果，包括风险等级、建议与推荐
     */
    @GetMapping("/result/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAssessmentResult(
            @PathVariable String id,
            HttpServletRequest httpRequest) {
        String userId = getCurrentUserId();

        // 门禁：测评结果属于个人数据，必须本人显式授权
        consentService.require(userId, ConsentScope.ASSESSMENT, httpRequest, "GET /api/v1/assessment/result");

        AssessmentResult result = assessmentResultRepository.findById(id).orElse(null);
        if (result == null) {
            return ResponseEntity.ok(ApiResponse.notFound("测评结果不存在"));
        }
        if (!userId.equals(result.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人测评结果"));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("result_id", result.getId());
        data.put("type", result.getType());
        data.put("total_score", result.getTotalScore());
        data.put("risk_level", result.getRiskLevel());
        data.put("description", result.getDescription());
        data.put("created_at", result.getCreatedAt());
        data.put("suggestions", suggestionsFor(result.getRiskLevel()));
        data.put("recommendations", List.of(
                Map.of("type", "meditation", "id", "meditation_1", "title", "考前放松")));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 根据总分判定风险等级
     *
     * @param totalScore 总分
     * @return green / yellow / red
     */
    private String resolveRiskLevel(int totalScore) {
        if (totalScore <= 9) {
            return "green";
        }
        return totalScore <= 19 ? "yellow" : "red";
    }

    /**
     * 根据风险等级生成描述
     *
     * @param riskLevel 风险等级
     * @return 描述文案
     */
    private String resolveDescription(String riskLevel) {
        return switch (riskLevel) {
            case "red" -> "你的情绪压力较大，建议尽快联系心理老师或拨打心理援助热线。";
            case "yellow" -> "最近可能有些情绪波动，建议保持记录并适当休息。";
            default -> "你最近的心情好像还不错呢！继续保持～";
        };
    }

    /**
     * 根据风险等级返回建议列表
     *
     * @param riskLevel 风险等级
     * @return 建议列表
     */
    private List<String> suggestionsFor(String riskLevel) {
        if ("red".equals(riskLevel)) {
            return List.of("尽快联系学校心理老师", "拨打 24 小时心理援助热线", "避免独处，告知信任的人");
        }
        if ("yellow".equals(riskLevel)) {
            return List.of("继续每天的心情打卡，观察情绪变化", "试试呼吸练习，保持放松", "和小星聊聊你最近的感受");
        }
        return List.of("继续每天的心情打卡，观察情绪变化", "试试我们的呼吸练习，保持放松", "和小星聊聊你最近的开心事");
    }

    /**
     * 将答案列表序列化为 JSON
     *
     * @param answers 答案列表
     * @return JSON 字符串；序列化失败返回 null
     */
    private String writeAnswers(List<Integer> answers) {
        try {
            return objectMapper.writeValueAsString(answers);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 从 Spring Security 上下文获取当前登录用户 ID
     *
     * @return 当前登录用户 ID
     */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }

    /**
     * 测评提交请求 DTO
     */
    @Data
    public static class SubmitAssessmentRequest {
        // 用户 ID（服务端忽略，以登录态为准）
        private String userId;
        // 测评类型
        private String type;
        // 各题答案分数列表
        private List<Integer> answers;
    }
}
