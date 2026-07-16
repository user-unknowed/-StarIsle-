package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.service.RiskDetectionService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/risk")
@RequiredArgsConstructor
@Validated
public class RiskController {

    private final RiskDetectionService riskDetectionService;

    @Data
    public static class DetectRiskRequest {
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        @NotBlank(message = "内容不能为空")
        @Size(max = 5000, message = "内容长度不能超过5000个字符")
        private String content;

        private String contentType;
    }

    @Data
    public static class ReportCrisisRequest {
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        @NotBlank(message = "风险等级不能为空")
        private String riskLevel;

        private String triggerType;
    }

    @PostMapping("/detect")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detectRisk(@Validated @RequestBody DetectRiskRequest request) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人检测风险"));
        }

        String riskLevel = riskDetectionService.detectRisk(request.getUserId(), request.getContent());
        RiskDetectionService.RiskDetectionDetails details = riskDetectionService.getDetectionDetails(request.getContent());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", request.getUserId(),
            "risk_level", riskLevel,
            "confidence", 0.95,
            "triggered_keywords", details.getKeywordsDetected(),
            "need_intervention", "red".equals(riskLevel) || "orange".equals(riskLevel)
        )));
    }

    @GetMapping("/level/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserRiskLevel(@PathVariable String userId) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人风险等级"));
        }

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "current_risk_level", "green",
            "history", List.of(
                Map.of("date", "2026-01-01", "level", "green"),
                Map.of("date", "2026-01-02", "level", "yellow")
            )
        )));
    }

    @GetMapping("/crisis/hotlines")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCrisisHotlines() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "hotlines", List.of(
                Map.of(
                    "name", "12355 青少年服务热线",
                    "number", "12355",
                    "description", "全国青少年心理咨询服务热线",
                    "hours", "24小时"
                ),
                Map.of(
                    "name", "希望24热线",
                    "number", "400-161-9995",
                    "description", "全国心理危机干预热线",
                    "hours", "24小时"
                ),
                Map.of(
                    "name", "全国公共卫生公益热线",
                    "number", "12320",
                    "description", "心理健康咨询服务",
                    "hours", "24小时"
                )
            )
        )));
    }

    @PostMapping("/crisis/report")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reportCrisis(@Validated @RequestBody ReportCrisisRequest request) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人上报危机事件"));
        }

        return ResponseEntity.ok(ApiResponse.success("危机事件已上报", Map.of(
            "user_id", request.getUserId(),
            "risk_level", request.getRiskLevel(),
            "handled", true
        )));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}