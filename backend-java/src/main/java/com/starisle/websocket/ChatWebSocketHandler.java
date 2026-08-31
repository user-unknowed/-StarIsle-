package com.starisle.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 聊天 WebSocket 处理器
 * 管理 WebSocket 会话的建立、消息处理与关闭，
 * 通过路径中的用户标识维护在线会话映射，实现简单的消息回声。
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    /** 在线会话映射：用户标识 -> WebSocket 会话 */
    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    /**
     * 连接建立回调
     * 从连接路径中解析用户标识并加入会话映射。
     *
     * @param session WebSocket 会话
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String userId = session.getUri().getPath().split("/")[3];
        sessions.put(userId, session);
    }

    /**
     * 处理文本消息
     * 从会话路径解析用户标识，将收到的消息以"小星"口吻回复。
     *
     * @param session WebSocket 会话
     * @param message 文本消息
     * @throws Exception 当发送回复失败时抛出
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userId = session.getUri().getPath().split("/")[3];
        String payload = message.getPayload();

        String response = "小星收到了你的消息：" + payload;
        session.sendMessage(new TextMessage(response));
    }

    /**
     * 连接关闭回调
     * 从会话映射中移除对应用户的会话。
     *
     * @param session WebSocket 会话
     * @param status  关闭状态
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = session.getUri().getPath().split("/")[3];
        sessions.remove(userId);
    }
}
