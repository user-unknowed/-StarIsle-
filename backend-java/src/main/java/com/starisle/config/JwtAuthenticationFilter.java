package com.starisle.config;

import com.starisle.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT 鉴权过滤器
 * 继承 {@link OncePerRequestFilter} 保证每次请求只执行一次，
 * 负责从请求头解析 JWT、校验有效性，
 * 并将用户身份与角色写入 Spring Security 上下文。
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // JWT 工具类，负责令牌解析与校验
    private final JwtUtil jwtUtil;

    /**
     * 构造函数注入 JwtUtil
     *
     * @param jwtUtil JWT 工具类实例
     */
    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /**
     * 单次请求的鉴权处理逻辑
     *
     * @param request     HTTP 请求对象
     * @param response    HTTP 响应对象
     * @param filterChain 过滤器链
     * @throws ServletException Servlet 异常
     * @throws IOException      IO 异常
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 从请求头获取 Authorization 字段
        String authHeader = request.getHeader("Authorization");

        // 当请求头以 Bearer 开头时尝试解析 JWT
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // 截取 Bearer 后的令牌部分
            String token = authHeader.substring(7);

            // 校验令牌有效性
            if (jwtUtil.isTokenValid(token)) {
                // 提取用户 ID 与角色信息
                String userId = jwtUtil.extractUserId(token);
                String role = jwtUtil.extractRole(token);

                // 构造 Spring Security 认证对象并赋予对应角色
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userId,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                );

                // 将认证信息写入安全上下文，供后续授权使用
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        // 继续执行后续过滤器链
        filterChain.doFilter(request, response);
    }
}
