package com.starisle.config;

import com.starisle.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Map;

/**
 * WebSocket 握手鉴权拦截器
 * 要求连接携带有效 JWT，且 token 中的 userId 必须与路径中的 userId 一致，
 * 同时校验 Origin 白名单，防止任意站点或匿名用户冒用他人身份连接。
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    // JWT 工具类
    private final JwtUtil jwtUtil;
    // 应用配置（跨域来源白名单）
    private final AppConfig appConfig;

    /**
     * 握手前校验
     *
     * @param request    HTTP 握手请求
     * @param response   HTTP 握手响应
     * @param wsHandler  WebSocket 处理器
     * @param attributes 会话属性
     * @return 允许连接返回 true
     */
    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        URI uri = request.getURI();
        String path = uri.getPath();
        String pathUserId = path.substring(path.lastIndexOf('/') + 1);

        // 支持 ?token= 或 Authorization: Bearer
        String token = UriComponentsBuilder.fromUri(uri).build()
                .getQueryParams().getFirst("token");
        if (token == null || token.isBlank()) {
            String authorization = request.getHeaders().getFirst("Authorization");
            if (authorization != null && authorization.startsWith("Bearer ")) {
                token = authorization.substring(7);
            }
        }

        // 校验 token 有效性，并确保不能以他人身份连接
        if (token == null || token.isBlank()
                || !jwtUtil.isTokenValid(token)
                || !pathUserId.equals(jwtUtil.extractUserId(token))) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        // 校验来源白名单（非浏览器客户端可能没有 Origin，此时仅依赖 token）
        String origin = request.getHeaders().getOrigin();
        if (origin != null && !isOriginAllowed(origin)) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }

        attributes.put("userId", pathUserId);
        return true;
    }

    /**
     * 握手完成后回调，无需处理
     */
    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // 无需处理
    }

    /**
     * 判断来源是否命中白名单
     *
     * @param origin 来源
     * @return 允许返回 true
     */
    private boolean isOriginAllowed(String origin) {
        for (String pattern : appConfig.getAllowedOrigins()) {
            String trimmed = pattern.trim();
            if ("*".equals(trimmed)) {
                return true;
            }
            String regex = trimmed.replace(".", "\\.").replace("*", ".*");
            if (origin.matches(regex)) {
                return true;
            }
        }
        return false;
    }
}
