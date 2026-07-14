package com.starisle.config;

import org.springframework.context.annotation.Configuration;

/**
 * CORS configuration is now handled by SecurityConfig's corsConfigurationSource().
 * This class is kept for potential future custom CORS filter needs.
 * The SecurityFilterChain in SecurityConfig applies CORS via .cors(cors -> cors.configurationSource(...))
 */
@Configuration
public class CorsConfig {
    // CORS configuration is handled by SecurityConfig.corsConfigurationSource()
}
