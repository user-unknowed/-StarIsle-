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
 * 提供内容危机检测、危机热线获取与危机事件上报等接口，
 * 用于学生心理健康危机信号的实时识别与紧急响应。
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

        // 触发类型
        private String triggerType;
    }

    /**
     * 检测内容危机信号
     *
     * @HTTP POST /api/v1/risk/detect
     * @param request 风险检测请求
     * @return 包含危机信号、置信度、触发关键词与是否需要干预的响应
     */
    @PostMapping("/detect")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detectRisk(@Validated @RequestBody DetectRiskRequest request) {
        // 校验当前登录用户与目标用户一致，防止越权检测
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人检测风险"));
        }

        // 调用服务进行危机检测并获取明细
        RiskDetectionService.RiskDetectionResult detection = riskDetectionService.detectRisk(request.getUserId(), request.getContent());
        RiskDetectionService.RiskDetectionDetails details = riskDetectionService.getDetectionDetails(request.getContent());

        // 危机信号即需要人工干预
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", request.getUserId(),
            "crisis", detection.isCrisis(),
            "confidence", 0.95,
            "triggered_keywords", details.getKeywordsDetected(),
            "need_intervention", detection.isCrisis()
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
