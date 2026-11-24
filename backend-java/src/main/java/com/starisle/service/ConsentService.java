package com.starisle.service;

import com.starisle.config.AppConfig;
import com.starisle.consent.ConsentScope;
import com.starisle.entity.ConsentAuditLog;
import com.starisle.entity.ConsentRecord;
import com.starisle.exception.ConsentRequiredException;
import com.starisle.repository.ConsentAuditLogRepository;
import com.starisle.repository.ConsentRecordRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 个人数据同意服务
 * 负责授权的授予、撤回、有效性判断、访问门禁与审计留痕。
 * 所有涉及个人数据的接口必须先经过 {@link #require} 校验，未授权直接拒绝。
 */
@Service
@RequiredArgsConstructor
public class ConsentService {

    /** 未授权业务错误码 */
    public static final int CONSENT_REQUIRED_CODE = 40301;

    // 同意记录仓储
    private final ConsentRecordRepository recordRepository;
    // 审计日志仓储
    private final ConsentAuditLogRepository auditLogRepository;
    // 应用配置（政策版本、默认有效期等）
    private final AppConfig appConfig;

    /**
     * 判断某用户对指定范围是否拥有当前有效的授权
     *
     * @param userId    用户 ID
     * @param scopeName 同意范围名称
     * @return 有效返回 true
     */
    public boolean isActive(String userId, String scopeName) {
        if (userId == null || scopeName == null) {
            return false;
        }
        return recordRepository.findByUserIdAndScope(userId, scopeName)
                .map(ConsentRecord::isActive)
                .orElse(false);
    }

    /**
     * 访问门禁：未授权时写入拒绝审计并抛出异常
     *
     * @param userId   用户 ID（数据主体）
     * @param scope    需要的同意范围
     * @param request  当前请求，用于记录 IP 与 User-Agent
     * @param resource 被访问的资源标识（接口路径）
     */
    public void require(String userId, ConsentScope scope, HttpServletRequest request, String resource) {
        require(userId, scope, true, request, resource);
    }

    /**
     * 访问门禁（带前置条件）：前置条件不满足同样视为未授权
     *
     * @param userId       用户 ID（数据主体）
     * @param scope        需要的同意范围
     * @param precondition 额外的授权前置条件（如家长绑定已授权）
     * @param request      当前请求
     * @param resource     被访问的资源标识
     */
    public void require(String userId, ConsentScope scope, boolean precondition,
                        HttpServletRequest request, String resource) {
        if (precondition && isActive(userId, scope.name())) {
            return;
        }
        writeAudit(userId, scope.name(), "DENIED", request, resource);
        throw new ConsentRequiredException(scope.name(), appConfig.getConsent().getPolicyVersion());
    }

    /**
     * 监护人查看门禁：需绑定已授权且学生本人同意被监护人查看
     *
     * @param studentId         学生 ID（数据主体）
     * @param bindingAuthorized 家长绑定是否已授权
     * @param request           当前请求
     * @param resource          被访问的资源标识
     * @param context           附加说明（绑定 ID、原因等）
     */
    public void requireGuardianView(String studentId, boolean bindingAuthorized,
                                    HttpServletRequest request, String resource,
                                    Map<String, Object> context) {
        if (bindingAuthorized && isActive(studentId, ConsentScope.GUARDIAN_MOOD_VIEW.name())) {
            return;
        }
        String reason = bindingAuthorized ? "STUDENT_CONSENT_MISSING" : "BINDING_NOT_AUTHORIZED";
        Map<String, Object> detail = new LinkedHashMap<>(context == null ? Map.of() : context);
        detail.put("reason", reason);
        detail.put("studentId", studentId);
        writeAudit(studentId, ConsentScope.GUARDIAN_MOOD_VIEW.name(), "DENIED", request,
                resource + " reason=" + reason);
        throw new ConsentRequiredException(ConsentScope.GUARDIAN_MOOD_VIEW.name(),
                appConfig.getConsent().getPolicyVersion(), detail);
    }

    /**
     * 授予（或续期）同意
     *
     * @param userId  用户 ID
     * @param scope   同意范围
     * @param ttlDays 有效期天数，为空时使用默认值
     * @param request 当前请求
     * @return 更新后的同意记录
     */
    @Transactional
    public ConsentRecord grant(String userId, ConsentScope scope, Integer ttlDays, HttpServletRequest request) {
        AppConfig.ConsentConfig config = appConfig.getConsent();
        int days = ttlDays == null ? config.getDefaultTtlDays() : ttlDays;
        if (days < 1 || days > config.getMaxTtlDays()) {
            throw new IllegalArgumentException("有效期必须在 1-" + config.getMaxTtlDays() + " 天之间");
        }

        LocalDateTime now = LocalDateTime.now();
        ConsentRecord record = recordRepository.findByUserIdAndScope(userId, scope.name())
                .orElseGet(() -> ConsentRecord.builder()
                        .userId(userId)
                        .scope(scope.name())
                        .build());

        record.setPolicyVersion(config.getPolicyVersion());
        record.setGrantedAt(now);
        record.setExpiresAt(now.plusDays(days));
        record.setRevokedAt(null);
        record.setClientIp(resolveClientIp(request));
        record.setUserAgent(truncate(request.getHeader("User-Agent")));
        ConsentRecord saved = recordRepository.save(record);

        writeAudit(userId, scope.name(), "GRANT", request,
                "ttlDays=" + days + ", policy=" + config.getPolicyVersion());
        return saved;
    }

    /**
     * 撤回同意：撤回后立即失效
     *
     * @param userId  用户 ID
     * @param scope   同意范围
     * @param request 当前请求
     * @return 撤回后的同意记录
     */
    @Transactional
    public ConsentRecord revoke(String userId, ConsentScope scope, HttpServletRequest request) {
        ConsentRecord record = recordRepository.findByUserIdAndScope(userId, scope.name())
                .orElseThrow(() -> new IllegalArgumentException("未找到该范围的授权记录，无需撤回"));

        LocalDateTime now = LocalDateTime.now();
        record.setRevokedAt(now);
        record.setExpiresAt(now);
        record.setClientIp(resolveClientIp(request));
        record.setUserAgent(truncate(request.getHeader("User-Agent")));
        ConsentRecord saved = recordRepository.save(record);

        writeAudit(userId, scope.name(), "REVOKE", request, "policy=" + record.getPolicyVersion());
        return saved;
    }

    /**
     * 查询用户全部同意范围的状态
     *
     * @param userId 用户 ID
     * @return 每个范围的状态列表
     */
    public List<Map<String, Object>> status(String userId) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ConsentScope scope : ConsentScope.values()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("scope", scope.name());
            item.put("displayName", scope.getDisplayName());
            item.put("purpose", scope.getPurpose());
            ConsentRecord record = recordRepository.findByUserIdAndScope(userId, scope.name()).orElse(null);
            boolean active = record != null && record.isActive();
            item.put("granted", active);
            item.put("policyVersion", record == null ? null : record.getPolicyVersion());
            item.put("grantedAt", record == null ? null : record.getGrantedAt());
            item.put("expiresAt", record == null ? null : record.getExpiresAt());
            item.put("revokedAt", record == null ? null : record.getRevokedAt());
            result.add(item);
        }
        return result;
    }

    /**
     * 查询用户最近的同意审计日志
     *
     * @param userId 用户 ID
     * @param limit  返回条数上限
     * @return 审计日志
     */
    public List<ConsentAuditLog> auditLogs(String userId, int limit) {
        int size = Math.min(Math.max(limit, 1), 100);
        return auditLogRepository.findByUserIdOrderByOccurredAtDesc(userId, PageRequest.of(0, size));
    }

    /**
     * 写入审计日志
     *
     * @param userId  用户 ID
     * @param scope   同意范围
     * @param action  动作
     * @param request 当前请求
     * @param detail  明细
     */
    private void writeAudit(String userId, String scope, String action,
                            HttpServletRequest request, String detail) {
        auditLogRepository.save(ConsentAuditLog.builder()
                .userId(userId)
                .scope(scope)
                .action(action)
                .policyVersion(appConfig.getConsent().getPolicyVersion())
                .occurredAt(LocalDateTime.now())
                .clientIp(resolveClientIp(request))
                .userAgent(truncate(request.getHeader("User-Agent")))
                .detail(truncate(detail))
                .build());
    }

    /**
     * 解析客户端 IP；开启 trust-proxy 时取 X-Forwarded-For 的第一段
     *
     * @param request 当前请求
     * @return 客户端 IP
     */
    private String resolveClientIp(HttpServletRequest request) {
        if (appConfig.getRateLimit().isTrustProxy()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return truncate(forwarded.split(",")[0].trim());
            }
        }
        return truncate(request.getRemoteAddr());
    }

    /**
     * 截断超长字段，避免审计写入失败
     *
     * @param value 原始值
     * @return 截断后的值
     */
    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 255 ? value.substring(0, 255) : value;
    }
}
