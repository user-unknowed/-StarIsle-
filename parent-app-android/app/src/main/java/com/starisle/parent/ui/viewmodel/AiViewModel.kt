package com.starisle.parent.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.parent.data.repo.AiRepository
import com.starisle.parent.data.models.ChatMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

/**
 * 「大星」AI 对话 ViewModel。
 *
 * 对应 web-frontend ParentChat.tsx：危机关键词检测、HTTP 调用、风险上报、降级 mock。
 */
@HiltViewModel
class AiViewModel @Inject constructor(
    private val repo: AiRepository
) : ViewModel() {

    private val _state = MutableStateFlow(AiState())
    val state: StateFlow<AiState> = _state.asStateFlow()

    val parentTopics get() = repo.parentTopics

    fun fetchHistory(userId: String) = viewModelScope.launch {
        val history = repo.fetchHistory(userId)
        // mock 兜底
        val data = if (history.isEmpty()) listOf(
            ChatMessage("msg1", userId, "大星你好，我想问问关于孩子情绪的问题", "user", "2026-07-15T10:00:00Z"),
            ChatMessage("msg2", userId, "你好呀！大星在这里陪着你。慢慢来，一切都会好起来的。关于孩子的情绪，大星很愿意听听你的想法。", "assistant", "2026-07-15T10:01:00Z")
        ) else history
        _state.update { it.copy(messages = data) }
    }

    /**
     * 发送一条家长消息。
     * - 危机关键词 → 直接返回危机提示
     * - 调用 HTTP /v1/chat/message
     * - 网络错误降级到 mock 回复池
     */
    fun sendMessage(userId: String, content: String) {
        if (content.isBlank()) return
        if (_state.value.isTyping) return

        val userMsg = ChatMessage(
            id = "u-${System.currentTimeMillis()}",
            userId = userId,
            content = content,
            role = "user",
            timestamp = Instant.now().toString()
        )
        _state.update { s -> s.copy(messages = s.messages + userMsg, isTyping = true, error = null) }

        viewModelScope.launch {
            val result = repo.sendMessage(userId, content)
            val reply = when (result) {
                is AiRepository.ChatResult.Success -> ChatMessage(
                    id = "a-${System.currentTimeMillis()}",
                    userId = userId,
                    content = result.reply,
                    role = "assistant",
                    timestamp = Instant.now().toString(),
                    riskLevel = result.riskLevel
                )
                is AiRepository.ChatResult.Crisis -> ChatMessage(
                    id = "a-${System.currentTimeMillis()}",
                    userId = userId,
                    content = result.reply,
                    role = "assistant",
                    timestamp = Instant.now().toString(),
                    riskLevel = "red"
                )
                is AiRepository.ChatResult.Fallback -> {
                    _state.update { it.copy(isUsingMock = true) }
                    ChatMessage(
                        id = "a-${System.currentTimeMillis()}",
                        userId = userId,
                        content = result.reply,
                        role = "assistant",
                        timestamp = Instant.now().toString()
                    )
                }
                is AiRepository.ChatResult.Error -> {
                    _state.update { it.copy(isTyping = false, error = result.message) }
                    return@launch
                }
            }
            // 风险上报（异步，失败不影响主流程）
            if (reply.riskLevel == "red" || reply.riskLevel == "orange") {
                repo.reportCrisis(userId, reply.riskLevel, "chat")
            }
            _state.update { s -> s.copy(messages = s.messages + reply, isTyping = false) }
        }
    }

    /** 点击推荐话题，危机话题直接弹出危机提示 */
    fun tapTopic(userId: String, topicId: String, title: String) {
        if (topicId == "t4") {
            // 危机话题：插入危机提示而非直接填入
            val msg = ChatMessage(
                id = "system-${System.currentTimeMillis()}",
                userId = userId,
                content = "如果您发现孩子有自伤倾向，请立即拨打危机热线：12355 / 400-161-9995 / 010-82951332。您不是一个人在面对，大星在这里陪您。",
                role = "assistant",
                timestamp = Instant.now().toString(),
                riskLevel = "red"
            )
            _state.update { s -> s.copy(messages = s.messages + msg) }
            viewModelScope.launch { repo.reportCrisis(userId, "red", "chat") }
        } else {
            _state.update { it.copy(inputDraft = title) }
        }
    }

    fun updateInput(text: String) = _state.update { it.copy(inputDraft = text) }
    fun clearInput() = _state.update { it.copy(inputDraft = "") }
}

data class AiState(
    val messages: List<ChatMessage> = emptyList(),
    val inputDraft: String = "",
    val isTyping: Boolean = false,
    val isUsingMock: Boolean = false,
    val error: String? = null
)
