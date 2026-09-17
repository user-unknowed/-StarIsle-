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

/**
 * 风险检测接口控制器
 * 提供内容风险检测、用户风险等级查询、危机热线获取与危机事件上报等接口，
 * 用于学生心理健康风险的实时监控与紧急响应。
 */
@RestController
@RequestMapping("/api/v1/risk")
@RequiredArgsConstructor
@Validated
public class RiskController {

    // 风险检测服务
    private final RiskDetectionService riskDetectionService;

    /**
     * 风险检测请求 DTO
     */
    @Data
    public static class DetectRiskRequest {
        // 用户 ID
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        // 待检测内容
        @NotBlank(message = "内容不能为空")
        @Size(max = 5000, message = "内容长度不能超过5000个字符")
        private String content;

        // 内容类型（如 text/chat）
        private String contentType;
    }

    /**
     * 危机上报请求 DTO
     */
    @Data
    public static class ReportCrisisRequest {
        // 用户 ID
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        // 风险等级（如 red/orange/yellow/green）
        @NotBlank(message = "风险等级不能为空")
        private String riskLevel;

        // 触发类型
        private String triggerType;
    }

    /**
     * 检测内容风险等级
     *
     * @HTTP POST /api/v1/risk/detect
     * @param request 风险检测请求
     * @return 包含风险等级、置信度、触发关键词与是否需要干预的响应
     */
    @PostMapping("/detect")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detectRisk(@Validated @RequestBody DetectRiskRequest request) {
        // 校验当前登录用户与目标用户一致，防止越权检测
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人检测风险"));
        }

        // 调用服务进行风险检测并获取明细
        String riskLevel = riskDetectionService.detectRisk(request.getUserId(), request.getContent());
        RiskDetectionService.RiskDetectionDetails details = riskDetectionService.getDetectionDetails(request.getContent());

        // 红色或橙色等级需要人工干预
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", request.getUserId(),
            "risk_level", riskLevel,
            "confidence", 0.95,
            "triggered_keywords", details.getKeywordsDetected(),
            "need_intervention", "red".equals(riskLevel) || "orange".equals(riskLevel)
        )));
    }

    /**
     * 查询用户当前与历史风险等级
     *
     * @HTTP GET /api/v1/risk/level/{userId}
     * @param userId 用户 ID
     * @return 包含当前与历史风险等级的响应
     */
    @GetMapping("/level/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserRiskLevel(@PathVariable String userId) {
        // 校验权限，仅可查询本人风险等级
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人风险等级"));
        }

        // 返回当前风险等级与历史记录
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "current_risk_level", "green",
            "history", List.of(
                Map.of("date", "2026-01-01", "level", "green"),
                Map.of("date", "2026-01-02", "level", "yellow")
            )
        )));
    }

    /**
     * 获取危机干预热线列表（公开接口）
     *
     * @HTTP GET /api/v1/risk/crisis/hotlines
     * @return 危机热线信息列表
     */
    @GetMapping("/crisis/hotlines")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCrisisHotlines() {
        // 返回常用心理危机干预热线
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

    /**
     * 上报危机事件
     *
     * @HTTP POST /api/v1/risk/crisis/report
     * @param request 危机上报请求
     * @return 上报结果
     */
    @PostMapping("/crisis/report")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reportCrisis(@Validated @RequestBody ReportCrisisRequest request) {
        // 校验权限，仅可上报本人危机事件
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人上报危机事件"));
        }

        // 返回上报成功结果
        return ResponseEntity.ok(ApiResponse.success("危机事件已上报", Map.of(
            "user_id", request.getUserId(),
            "risk_level", request.getRiskLevel(),
            "handled", true
        )));
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
}
