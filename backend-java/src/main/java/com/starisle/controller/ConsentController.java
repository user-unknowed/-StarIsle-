package com.starisle.controller;

import com.starisle.config.AppConfig;
import com.starisle.consent.ConsentScope;
import com.starisle.dto.ApiResponse;
import com.starisle.entity.ConsentAuditLog;
import com.starisle.entity.ConsentRecord;
import com.starisle.service.ConsentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 个人数据同意接口控制器
 * 提供政策说明（公开）、授权状态查询、授予同意、撤回同意与审计日志查询。
 */
@RestController
@RequestMapping("/api/v1/consent")
@RequiredArgsConstructor
@Validated
public class ConsentController {

    // 同意服务
    private final ConsentService consentService;
    // 应用配置（政策版本与默认有效期）
    private final AppConfig appConfig;

    /**
     * 授权请求 DTO
     */
    @Data
    public static class GrantRequest {
        // 同意范围（ConsentScope 名称）
        @NotBlank(message = "同意范围不能为空")
        private String scope;
        // 有效期天数，为空使用默认值
        private Integer ttlDays;
    }

    /**
     * 撤回请求 DTO
     */
    @Data
    public static class RevokeRequest {
        // 同意范围（ConsentScope 名称）
        @NotBlank(message = "同意范围不能为空")
        private String scope;
    }

    /**
     * 获取当前隐私政策与同意范围说明（公开接口）
     *
     * @HTTP GET /api/v1/consent/policy
     * @return 政策版本与范围列表
     */
    @GetMapping("/policy")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPolicy() {
        AppConfig.ConsentConfig config = appConfig.getConsent();

        List<Map<String, Object>> scopes = new ArrayList<>();
        for (ConsentScope scope : ConsentScope.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("scope", scope.name());
            item.put("displayName", scope.getDisplayName());
            item.put("purpose", scope.getPurpose());
            scopes.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("policyVersion", config.getPolicyVersion());
        data.put("defaultTtlDays", config.getDefaultTtlDays());
        data.put("maxTtlDays", config.getMaxTtlDays());
        data.put("scopes", scopes);
        data.put("withdrawPath", "POST /api/v1/consent/revoke");
        data.put("effectiveImmediately", true);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 查询当前用户的授权状态
     *
     * @HTTP GET /api/v1/consent
     * @return 各范围授权状态
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        String userId = getCurrentUserId();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", userId);
        data.put("policyVersion", appConfig.getConsent().getPolicyVersion());
        data.put("scopes", consentService.status(userId));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    /**
     * 授予同意
     *
     * @HTTP POST /api/v1/consent/grant
     * @param request 授权请求
     * @param httpRequest 当前 HTTP 请求
     * @return 更新后的授权记录
     */
    @PostMapping("/grant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> grant(
            @Validated @RequestBody GrantRequest request,
            HttpServletRequest httpRequest) {
        String userId = getCurrentUserId();
        ConsentScope scope = parseScope(request.getScope());
        ConsentRecord record = consentService.grant(userId, scope, request.getTtlDays(), httpRequest);
        return ResponseEntity.ok(ApiResponse.success("授权成功", toView(record, true)));
    }

    /**
     * 撤回同意（立即失效）
     *
     * @HTTP POST /api/v1/consent/revoke
     * @param request 撤回请求
     * @param httpRequest 当前 HTTP 请求
     * @return 撤回后的授权记录
     */
    @PostMapping("/revoke")
    public ResponseEntity<ApiResponse<Map<String, Object>>> revoke(
            @Validated @RequestBody RevokeRequest request,
            HttpServletRequest httpRequest) {
        String userId = getCurrentUserId();
        ConsentScope scope = parseScope(request.getScope());
        ConsentRecord record = consentService.revoke(userId, scope, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("已撤回，授权立即失效", toView(record, false)));
    }

    /**
     * 查询本人同意审计日志
     *
     * @HTTP GET /api/v1/consent/audit
     * @param limit 返回条数上限
     * @return 审计日志
     */
    @GetMapping("/audit")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAudit(
            @RequestParam(defaultValue = "50") Integer limit) {
        String userId = getCurrentUserId();
        List<Map<String, Object>> logs = new ArrayList<>();
        for (ConsentAuditLog log : consentService.auditLogs(userId, limit)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", log.getId());
            item.put("scope", log.getScope());
            item.put("action", log.getAction());
            item.put("policyVersion", log.getPolicyVersion());
            item.put("occurredAt", log.getOccurredAt());
            item.put("clientIp", log.getClientIp());
            item.put("detail", log.getDetail());
            logs.add(item);
        }
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    /**
     * 将同意记录转换为响应视图
     *
     * @param record 同意记录
     * @param active 当前是否生效
     * @return 响应视图
     */
    private Map<String, Object> toView(ConsentRecord record, boolean active) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("scope", record.getScope());
        view.put("granted", active);
        view.put("policyVersion", record.getPolicyVersion());
        view.put("grantedAt", record.getGrantedAt());
        view.put("expiresAt", record.getExpiresAt());
        view.put("revokedAt", record.getRevokedAt());
        return view;
    }

    /**
     * 解析并校验同意范围
     *
     * @param raw 原始范围字符串
     * @return 同意范围枚举
     */
    private ConsentScope parseScope(String raw) {
        return ConsentScope.from(raw)
                .orElseThrow(() -> new IllegalArgumentException("未知的同意范围: " + raw));
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
