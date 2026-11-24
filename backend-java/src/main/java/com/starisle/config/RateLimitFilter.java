package com.starisle.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.starisle.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 轻量级限流过滤器
 * 基于令牌桶按（客户端 IP + 登录用户）维度限流，默认每秒 100 次、突发 200 次，
 * 可通过 starisle.rate-limit.* 或环境变量调整；超限返回 429 与统一业务码。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    // 超过该条目数时触发过期桶清理
    private static final int CLEANUP_THRESHOLD = 5000;
    // 令牌桶闲置超过该时长可被清理
    private static final long IDLE_NANOS = 10L * 60L * 1_000_000_000L;

    // 应用配置
    private final AppConfig appConfig;
    // JSON 序列化器
    private final ObjectMapper objectMapper;
    // 每个访问主体的令牌桶
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * 仅对 API 与 WebSocket 路径限流，静态资源与健康检查不限流
     *
     * @param request 当前请求
     * @return 是否跳过
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.startsWith("/api/") || path.startsWith("/ws/"));
    }

    /**
     * 执行限流判断
     *
     * @param request     HTTP 请求
     * @param response    HTTP 响应
     * @param filterChain 过滤链
     * @throws ServletException Servlet 异常
     * @throws IOException      IO 异常
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        AppConfig.RateLimitConfig config = appConfig.getRateLimit();
        if (config == null || !config.isEnabled() || config.getRps() <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        int rps = config.getRps();
        int capacity = config.getBurst() > 0 ? config.getBurst() : rps * 2;
        String key = resolveKey(request);
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket(capacity));

        if (!bucket.tryConsume(rps, capacity)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Retry-After", "1");
            objectMapper.writeValue(response.getWriter(),
                    ApiResponse.error(42900, "RATE_LIMITED: 请求过于频繁，请稍后重试"));
            return;
        }

        cleanupIfNeeded();
        filterChain.doFilter(request, response);
    }

    /**
     * 解析限流维度：客户端 IP + 登录用户（匿名用户仅按 IP）
     *
     * @param request 当前请求
     * @return 限流键
     */
    private String resolveKey(HttpServletRequest request) {
        AppConfig.RateLimitConfig config = appConfig.getRateLimit();
        String ip = request.getRemoteAddr();
        if (config.isTrustProxy()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                ip = forwarded.split(",")[0].trim();
            }
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = auth != null && auth.getPrincipal() != null ? auth.getPrincipal().toString() : "anon";
        return ip + "|" + user;
    }

    /**
     * 条目过多时清理长时间未使用的令牌桶
     */
    private void cleanupIfNeeded() {
        if (buckets.size() <= CLEANUP_THRESHOLD) {
            return;
        }
        long now = System.nanoTime();
        Iterator<Map.Entry<String, Bucket>> iterator = buckets.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Bucket> entry = iterator.next();
            if (now - entry.getValue().lastAccessNanos > IDLE_NANOS) {
                iterator.remove();
            }
        }
    }

    /**
     * 令牌桶
     * 以固定速率补充令牌，容量限制突发流量。
     */
    private static final class Bucket {

        // 当前可用令牌数
        private double tokens;
        // 上次补充时间
        private long lastRefillNanos;
        // 最近访问时间，用于清理
        private long lastAccessNanos;

        /**
         * 构造令牌桶
         *
         * @param capacity 初始容量
         */
        private Bucket(int capacity) {
            this.tokens = capacity;
            this.lastRefillNanos = System.nanoTime();
            this.lastAccessNanos = this.lastRefillNanos;
        }

        /**
         * 尝试消费一个令牌
         *
         * @param rps      每秒补充速率
         * @param capacity 最大容量
         * @return 允许返回 true
         */
        private synchronized boolean tryConsume(int rps, int capacity) {
            long now = System.nanoTime();
            double elapsedSeconds = (now - lastRefillNanos) / 1_000_000_000.0;
            tokens = Math.min(capacity, tokens + elapsedSeconds * rps);
            lastRefillNanos = now;
            lastAccessNanos = now;

            if (tokens < 1.0) {
                return false;
            }
            tokens -= 1.0;
            return true;
        }
    }
}
