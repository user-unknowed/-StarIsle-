package com.starisle.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * 应用统一配置类
 * 通过 {@code starisle.*} 前缀绑定 application.yml 中的配置项，
 * 集中管理 JWT、AI 服务、加密、限流、跨域等可配置参数。
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "starisle")
public class AppConfig {

    // JWT 鉴权相关配置
    private JwtConfig jwt = new JwtConfig();
    // AI 服务相关配置
    private AiServiceConfig aiService = new AiServiceConfig();
    // 数据加密相关配置
    private EncryptionConfig encryption = new EncryptionConfig();
    // 接口限流相关配置
    private RateLimitConfig rateLimit = new RateLimitConfig();
    // 个人数据同意相关配置
    private ConsentConfig consent = new ConsentConfig();
    // 允许跨域访问的来源列表（生产环境必须显式配置白名单）
    private List<String> allowedOrigins = List.of("http://localhost:*", "http://127.0.0.1:*");
    // 内部运维令牌；为空时管理端点一律拒绝
    private String adminToken = "";
    // 是否启用管理端点（默认关闭，公网部署必须保持关闭）
    private boolean adminEnabled = false;

    /**
     * JWT 鉴权参数配置
     */
    @Data
    public static class JwtConfig {
        // JWT 签名密钥
        private String secret = "your-secret-key";
        // JWT 有效期（毫秒），默认 24 小时
        private long expiration = 86400000;
    }

    /**
     * AI 服务参数配置
     */
    @Data
    public static class AiServiceConfig {
        // AI 服务接入地址（仅允许内网地址）
        private String url = "http://localhost:8000";
        // 调用 ai-engine 时携带的内部令牌，防止绕过网关直连
        private String token = "";
    }

    /**
     * 数据加密参数配置
     */
    @Data
    public static class EncryptionConfig {
        // 加密密钥
        private String key = "your-encryption-key";
    }

    /**
     * 接口限流参数配置
     */
    @Data
    public static class RateLimitConfig {
        // 是否启用限流
        private boolean enabled = true;
        // 每秒最大请求数
        private int rps = 100;
        // 突发容量，缺省为 rps 的 2 倍
        private int burst = 0;
        // 是否信任 X-Forwarded-For（仅在可信反向代理之后开启）
        private boolean trustProxy = false;
    }

    /**
     * 个人数据同意参数配置
     */
    @Data
    public static class ConsentConfig {
        // 当前隐私政策版本，授权记录会绑定该版本
        private String policyVersion = "2026-11-21";
        // 未指定有效期时使用的默认天数
        private int defaultTtlDays = 180;
        // 允许的最长有效期天数
        private int maxTtlDays = 365;
    }
}
