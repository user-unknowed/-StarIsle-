package com.starisle.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.starisle.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Spring Security 安全配置类
 * 配置 Web 安全过滤链、方法级鉴权、密码编码器与跨域策略。
 * 公网暴露遵循最小放行原则：只放行显式声明的接口，未声明路径一律拒绝；
 * 运维/迁移/actuator/H2 控制台等管理端点仅允许携带内部令牌访问。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    // JWT 鉴权过滤器，由 SecurityFilterChain 装配
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    // 应用配置（CORS 白名单、内部管理令牌）
    private final AppConfig appConfig;
    // JSON 序列化器，用于输出统一错误结构
    private final ObjectMapper objectMapper;

    /**
     * 构造函数注入依赖
     *
     * @param jwtAuthenticationFilter JWT 鉴权过滤器
     * @param appConfig               应用配置
     * @param objectMapper            JSON 序列化器
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          AppConfig appConfig,
                          ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.appConfig = appConfig;
        this.objectMapper = objectMapper;
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
            // 禁止页面被内嵌，管理控制台不再对外提供
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
            )
            // 使用无状态会话，鉴权完全依赖 JWT
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 未登录 / 无权限时返回统一 JSON，而不是空响应或重定向
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(this::writeUnauthorized)
                .accessDeniedHandler(this::writeForbidden)
            )
            .authorizeHttpRequests(auth -> auth
                // 管理与运维端点：必须携带内部令牌，令牌为空时一律拒绝
                .requestMatchers("/actuator/**", "/h2-console/**", "/api/migration/**")
                    .access(adminAccess())
                // 健康检查与错误页
                .requestMatchers("/health", "/error").permitAll()
                // 匿名可访问：注册/登录
                .requestMatchers("/api/v1/users/register").permitAll()
                .requestMatchers("/api/v1/users/login").permitAll()
                .requestMatchers("/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/auth/register").permitAll()
                .requestMatchers("/api/v1/parents/register").permitAll()
                .requestMatchers("/api/v1/parents/login").permitAll()
                // 匿名可访问：纯内容类接口（不含个人数据）
                .requestMatchers("/api/v1/content/**").permitAll()
                .requestMatchers("/api/v1/chat/topics").permitAll()
                .requestMatchers("/api/v1/risk/crisis/hotlines").permitAll()
                .requestMatchers("/api/v1/assessment/questions/**").permitAll()
                // 匿名可访问：隐私政策说明（同意前需要先能看到范围与用途）
                .requestMatchers("/api/v1/consent/policy").permitAll()
                // 同意管理本身需要登录（只能操作本人）
                .requestMatchers("/api/v1/consent/**").authenticated()
                // WebSocket 端点：握手阶段校验 JWT 与 userId，见 WebSocketAuthInterceptor
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
                // 未声明的路径一律拒绝，避免新接口被意外公开
                .anyRequest().denyAll()
            )
            // 在用户名密码过滤器之前注册 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // 构建并返回过滤链
        return http.build();
    }

    /**
     * 内部管理端点鉴权：必须携带与配置一致的 X-Admin-Token
     * 未配置内部令牌时任何请求都无法访问管理端点。
     *
     * @return 授权管理器
     */
    @Bean
    public AuthorizationManager<RequestAuthorizationContext> adminAccess() {
        return (authentication, context) -> {
            String expected = appConfig.getAdminToken();
            String provided = context.getRequest().getHeader("X-Admin-Token");
            boolean allowed = appConfig.isAdminEnabled()
                    && expected != null && !expected.isBlank()
                    && provided != null && expected.equals(provided);
            return new AuthorizationDecision(allowed);
        };
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
     * 来源白名单由 starisle.allowed-origins（环境变量 CORS_ALLOWED_ORIGINS）控制，
     * 生产环境必须显式配置可信来源，默认仅本地调试地址。
     *
     * @return 跨域配置源
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = appConfig.getAllowedOrigins();
        boolean wildcard = origins.stream().anyMatch(origin -> "*".equals(origin.trim()));

        // 构造跨域配置
        CorsConfiguration configuration = new CorsConfiguration();
        if (wildcard) {
            // 通配来源下禁止携带凭证，避免任意站点读取用户数据
            configuration.setAllowedOriginPatterns(List.of("*"));
            configuration.setAllowCredentials(false);
        } else {
            configuration.setAllowedOriginPatterns(origins);
            configuration.setAllowCredentials(true);
        }
        // 允许的 HTTP 方法
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // 允许的请求头
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-Admin-Token",
            "X-Internal-Token"
        ));
        // 允许暴露给前端的响应头
        configuration.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        // 预检请求缓存时间（秒）
        configuration.setMaxAge(3600L);

        // 注册到基于 URL 的跨域配置源
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * 输出 401 未登录的统一 JSON 响应
     *
     * @param request  HTTP 请求
     * @param response HTTP 响应
     * @param ex       鉴权异常
     * @throws IOException 写出失败
     */
    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response,
                                   org.springframework.security.core.AuthenticationException ex) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.unauthorized("请先登录"));
    }

    /**
     * 输出 403 无权限的统一 JSON 响应
     *
     * @param request  HTTP 请求
     * @param response HTTP 响应
     * @param ex       访问拒绝异常
     * @throws IOException 写出失败
     */
    private void writeForbidden(HttpServletRequest request, HttpServletResponse response,
                                org.springframework.security.access.AccessDeniedException ex) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.forbidden("无权访问"));
    }
}
