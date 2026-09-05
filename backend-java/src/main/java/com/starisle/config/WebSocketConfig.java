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
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    // 聊天 WebSocket 处理器，处理实时聊天连接
    private final ChatWebSocketHandler chatWebSocketHandler;

    /**
     * 构造函数注入聊天 WebSocket 处理器
     *
     * @param chatWebSocketHandler 聊天处理器
     */
    public WebSocketConfig(ChatWebSocketHandler chatWebSocketHandler) {
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    /**
     * 注册 WebSocket 处理器
     *
     * @param registry WebSocket 处理器注册表
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 注册聊天端点并允许所有来源跨域
        registry.addHandler(chatWebSocketHandler, "/ws/chat/{userId}")
                .setAllowedOrigins("*");
    }
}
