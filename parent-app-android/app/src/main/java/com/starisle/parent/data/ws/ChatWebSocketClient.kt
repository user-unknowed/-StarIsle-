package com.starisle.parent.data.ws

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 对话实时 WebSocket 客户端（与 web-frontend ws.ts 对齐）。
 *
 * - 自动重连（指数退避，最大 5 次）
 * - 心跳保活（30s ping）
 * - 连接未就绪时消息入队，连上后 flush
 *
 * 由于家长端主要走 HTTP /v1/chat/message（已在 [AiRepository] 实现），
 * 本类作为补充：当后端启用 WS 通道时可直接复用。
 */
@Singleton
class ChatWebSocketClient @Inject constructor(
    private val client: OkHttpClient
) {
    private var ws: WebSocket? = null
    private var url: String = DEFAULT_URL
    private var userId: String? = null
    private var token: String? = null

    private var reconnectAttempts = 0
    private val maxReconnect = 5
    private val baseDelay = 3000L

    private var heartbeatJob: Job? = null
    private val messageQueue = ArrayDeque<String>()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private val _status = MutableSharedFlow<WsStatus>(extraBufferCapacity = 16)
    val status: SharedFlow<WsStatus> = _status.asSharedFlow()

    enum class WsStatus { CONNECTING, CONNECTED, DISCONNECTED, ERROR }

    fun connect(url: String = DEFAULT_URL, userId: String, token: String?) {
        this.url = url
        this.userId = userId
        this.token = token
        reconnectAttempts = 0
        doConnect()
    }

    private fun doConnect() {
        val uid = userId ?: return
        _status.tryEmit(WsStatus.CONNECTING)
        val fullUrl = "$url/chat/$uid"
        val builder = Request.Builder().url(fullUrl)
        if (!token.isNullOrEmpty()) {
            builder.addHeader("Authorization", "Bearer $token")
        }
        ws = client.newWebSocket(builder.build(), object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                reconnectAttempts = 0
                _status.tryEmit(WsStatus.CONNECTED)
                startHeartbeat()
                flushQueue()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                _messages.tryEmit(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _status.tryEmit(WsStatus.ERROR)
                tryReconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                stopHeartbeat()
                _status.tryEmit(WsStatus.DISCONNECTED)
                tryReconnect()
            }
        })
    }

    fun send(message: String): Boolean {
        val s = ws ?: return false.also { messageQueue.addLast(message) }
        return if (s.send(message)) true else { messageQueue.addLast(message); false }
    }

    fun disconnect() {
        stopHeartbeat()
        ws?.close(1000, "manual close")
        ws = null
        messageQueue.clear()
    }

    private fun startHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = scope.launch {
            while (true) {
                delay(30_000)
                ws?.send("{\"type\":\"ping\"}")
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }

    private fun flushQueue() {
        while (messageQueue.isNotEmpty()) {
            val m = messageQueue.removeFirst()
            if (ws?.send(m) != true) {
                messageQueue.addFirst(m)
                return
            }
        }
    }

    private fun tryReconnect() {
        if (reconnectAttempts >= maxReconnect) return
        reconnectAttempts++
        val delay = (baseDelay * Math.pow(1.5, (reconnectAttempts - 1).toDouble())).toLong()
        scope.launch {
            delay(delay)
            doConnect()
        }
    }

    companion object {
        const val DEFAULT_URL = "ws://10.0.2.2:8080/ws"
        private const val TAG = "ChatWS"
    }
}
