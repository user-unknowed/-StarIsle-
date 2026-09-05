package com.starisle.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security 安全配置类
 * 配置 Web 安全过滤链、方法级鉴权、密码编码器与跨域策略，
 * 保护对外暴露的 REST 接口与 WebSocket 端点。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    // JWT 鉴权过滤器，由 SecurityFilterChain 装配
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * 构造函数注入 JWT 鉴权过滤器
     *
     * @param jwtAuthenticationFilter JWT 鉴权过滤器
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /**
     * 构建 Spring Security 过滤链
     *
     * @param http HttpSecurity 配置对象
     * @return 构建完成的 SecurityFilterChain
     * @throws Exception 配置异常
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 关闭 CSRF（前后端分离场景使用 JWT）
            .csrf(csrf -> csrf.disable())
            // 启用 CORS 并注入跨域配置源
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // 关闭 frameOptions，便于 H2 控制台等嵌入页面
            .headers(headers -> headers
                .frameOptions(frame -> frame.disable())
            )
            // 使用无状态会话，鉴权完全依赖 JWT
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 健康检查与公开接口放行
                .requestMatchers("/health").permitAll()
                .requestMatchers("/api/v1/users/register").permitAll()
                .requestMatchers("/api/v1/users/login").permitAll()
                .requestMatchers("/api/v1/parents/register").permitAll()
                .requestMatchers("/api/v1/parents/login").permitAll()
                .requestMatchers("/api/v1/risk/crisis/hotlines").permitAll()
                .requestMatchers("/api/v1/content/**").permitAll()
                .requestMatchers("/api/v1/chat/topics").permitAll()
                .requestMatchers("/api/v1/assessment/questions/**").permitAll()
                // WebSocket 端点放行（鉴权在连接参数中处理）
                .requestMatchers("/ws/**").permitAll()
                // 家长接口仅允许 PARENT 角色访问
                .requestMatchers("/api/v1/parents/**").hasRole("PARENT")
                // 用户接口允许学生、教师、家长访问
                .requestMatchers("/api/v1/users/**").hasAnyRole("STUDENT", "TEACHER", "PARENT")
                // 情绪记录接口允许学生、教师、家长访问
                .requestMatchers("/api/v1/mood/**").hasAnyRole("STUDENT", "TEACHER", "PARENT")
                // 聊天接口允许学生、教师、家长访问
                .requestMatchers("/api/v1/chat/**").hasAnyRole("STUDENT", "TEACHER", "PARENT")
                // 风险接口允许学生、教师、家长访问
                .requestMatchers("/api/v1/risk/**").hasAnyRole("STUDENT", "TEACHER", "PARENT")
                // 量表评估接口仅允许学生、教师访问
                .requestMatchers("/api/v1/assessment/**").hasAnyRole("STUDENT", "TEACHER")
                // 其它请求均需登录
                .anyRequest().authenticated()
            )
            // 在用户名密码过滤器之前注册 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // 构建并返回过滤链
        return http.build();
    }

    /**
     * 密码编码器 Bean（BCrypt，强度 12）
     *
     * @return BCrypt 密码编码器实例
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * 跨域配置源 Bean
     * 允许本地开发与星岛官方域名跨域，支持常用 HTTP 方法和必要请求头。
     *
     * @return 跨域配置源
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // 构造跨域配置
        CorsConfiguration configuration = new CorsConfiguration();
        // 允许的来源模式：本地、官方域名
        configuration.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.starisle.com",
            "https://*.starisle.cn"
        ));
        // 允许的 HTTP 方法
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // 允许的请求头
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With"
        ));
        // 允许暴露给前端的响应头
        configuration.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        // 允许携带凭证（如 Cookie）
        configuration.setAllowCredentials(true);
        // 预检请求缓存时间（秒）
        configuration.setMaxAge(3600L);

        // 注册到基于 URL 的跨域配置源
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
