package com.starisle.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.starisle.websocket.ChatWebSocketHandler;

/**
 * WebSocket 配置类
 * 启用原生 WebSocket 支持，并注册聊天消息处理器，
 * 对外暴露 {@code /ws/chat/{userId}} 端点用于实时双向通信。
 * 握手阶段由 {@link WebSocketAuthInterceptor} 校验 JWT、userId 归属与来源白名单。
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    // 聊天 WebSocket 处理器，处理实时聊天连接
    private final ChatWebSocketHandler chatWebSocketHandler;
    // 握手鉴权拦截器
    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    /**
     * 构造函数注入处理器与鉴权拦截器
     *
     * @param chatWebSocketHandler     聊天处理器
     * @param webSocketAuthInterceptor 握手鉴权拦截器
     */
    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler,
                           WebSocketAuthInterceptor webSocketAuthInterceptor) {
        this.chatWebSocketHandler = chatWebSocketHandler;
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
    }

    /**
     * 注册 WebSocket 处理器
     *
     * @param registry WebSocket 处理器注册表
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 注册聊天端点，来源与身份校验在拦截器中完成
        registry.addHandler(chatWebSocketHandler, "/ws/chat/{userId}")
                .addInterceptors(webSocketAuthInterceptor);
    }
}
