package com.starisle.config;

import org.springframework.context.annotation.Configuration;

/**
 * 跨域（CORS）配置占位类
 * 实际跨域配置统一由 {@link SecurityConfig#corsConfigurationSource()} 提供，
 * 在 SecurityFilterChain 中通过 {@code .cors(cors -> cors.configurationSource(...))} 注入。
 * 本类保留以备未来可能扩展自定义跨域过滤器使用。
 */
@Configuration
public class CorsConfig {
    // 跨域配置已由 SecurityConfig.corsConfigurationSource() 统一管理
}
