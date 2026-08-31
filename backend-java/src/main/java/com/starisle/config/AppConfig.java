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
    // 允许跨域访问的来源列表
    private List<String> allowedOrigins = List.of("*");

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
        // AI 服务接入地址
        private String url = "http://localhost:8000";
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
        // 每秒最大请求数
        private int rps = 100;
    }
}
