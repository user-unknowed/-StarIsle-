package com.starisle.teacher.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.teacher.data.local.TeacherSessionStore
import com.starisle.teacher.data.models.GatewayChatRequest
import com.starisle.teacher.data.models.GatewayContextMessage
import com.starisle.teacher.data.models.TeacherAiMessage
import com.starisle.teacher.data.repo.GatewayChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 教师端 AI 助手对话 ViewModel。
 *
 * 发送时携带最近 10 条历史（user/assistant）与教师画像，
 * 网关转发给本地 SFT 模型并回传正文。
 */
@HiltViewModel
class TeacherAiChatViewModel @Inject constructor(
    private val repo: GatewayChatRepository,
    sessionStore: TeacherSessionStore,
) : ViewModel() {

    private val _state = MutableStateFlow(TeacherAiChatUiState())
    val state: StateFlow<TeacherAiChatUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            sessionStore.sessionFlow.collect { session ->
                _state.update { current ->
                    if (current.userId != session.userId) {
                        // 切换/退出登录后清空会话，避免串用上一位教师的上下文
                        current.copy(
                            userId = session.userId,
                            nickname = session.nickname,
                            messages = emptyList(),
                            error = null,
                        )
                    } else {
                        current.copy(nickname = session.nickname)
                    }
                }
            }
        }
    }

    fun onInputChange(value: String) = _state.update { it.copy(input = value) }

    fun sendMessage() {
        val current = _state.value
        val text = current.input.trim()
        if (text.isEmpty() || current.isSending) return
        val userId = current.userId
        if (userId.isNullOrBlank()) {
            _state.update { it.copy(error = "请先登录后再使用 AI 助手") }
            return
        }

        val context = current.messages.takeLast(10).map {
            GatewayContextMessage(role = it.role, content = it.content)
        }
        _state.update {
            it.copy(
                messages = it.messages + TeacherAiMessage(role = "user", content = text),
                input = "",
                isSending = true,
                error = null,
            )
        }

        viewModelScope.launch {
            repo.sendMessage(
                GatewayChatRequest(
                    userId = userId,
                    message = text,
                    context = context,
                    userProfile = mapOf(
                        "role" to "teacher",
                        "nickname" to current.nickname,
                    ),
                ),
            )
                .onSuccess { resp ->
                    _state.update {
                        it.copy(
                            isSending = false,
                            error = null,
                            riskLevel = resp.riskLevel,
                            messages = it.messages + TeacherAiMessage(
                                role = "assistant",
                                content = resp.response.orEmpty(),
                                model = resp.model,
                                responseTimeMs = resp.responseTimeMs,
                                riskLevel = resp.riskLevel,
                            ),
                        )
                    }
                }
                .onFailure { e ->
                    // 发送失败：撤回用户气泡并把文本放回输入框，便于直接重试
                    _state.update {
                        it.copy(
                            isSending = false,
                            error = e.message ?: "发送失败，请重试",
                            messages = it.messages.dropLast(1),
                            input = text,
                        )
                    }
                }
        }
    }
}

/** 教师端 AI 助手 UI 状态。 */
data class TeacherAiChatUiState(
    val messages: List<TeacherAiMessage> = emptyList(),
    val input: String = "",
    val isSending: Boolean = false,
    val error: String? = null,
    val userId: String? = null,
    val nickname: String = "",
    val riskLevel: String? = null,
)
