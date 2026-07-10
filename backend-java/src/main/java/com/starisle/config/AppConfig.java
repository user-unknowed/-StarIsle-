package com.starisle.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Data
@Configuration
@ConfigurationProperties(prefix = "starisle")
public class AppConfig {
    
    private JwtConfig jwt = new JwtConfig();
    private AiServiceConfig aiService = new AiServiceConfig();
    private EncryptionConfig encryption = new EncryptionConfig();
    private RateLimitConfig rateLimit = new RateLimitConfig();
    private List<String> allowedOrigins = List.of("*");
    
    @Data
    public static class JwtConfig {
        private String secret = "your-secret-key";
        private long expiration = 86400000;
    }
    
    @Data
    public static class AiServiceConfig {
        private String url = "http://localhost:8000";
    }
    
    @Data
    public static class EncryptionConfig {
        private String key = "your-encryption-key";
    }
    
    @Data
    public static class RateLimitConfig {
        private int rps = 100;
    }
}