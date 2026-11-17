package com.starisle.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.student.data.api.LocalChatTurn
import com.starisle.student.data.repo.AiRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * AI 状态（对应 Dart providers/ai_provider.dart 中的 AiState）。
 */
data class AiState(
    val isLoading: Boolean = false,
    val result: String? = null,
    val error: String? = null,
    val currentAction: String = "",
)

/**
 * 本地模型单轮回复结果。
 */
data class ChatReply(
    /** 递增序号，用于 UI 区分不同的回复事件 */
    val seq: Long,
    val content: String,
    val riskLevel: String,
    val model: String,
    val elapsedMs: Long,
)

/**
 * AI ViewModel（对应 Dart AiStateNotifier）。
 *
 * 通过 StateFlow 暴露状态，UI 通过 collect 观察。
 * 所有操作在 viewModelScope 中协程执行，完成后更新 result / error。
 */
@HiltViewModel
class AiViewModel @Inject constructor(
    private val aiRepository: AiRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AiState())
    val state: StateFlow<AiState> = _state.asStateFlow()

    // ===== 本地模型对话状态 =====

    private val _chatSending = MutableStateFlow(false)
    val chatSending: StateFlow<Boolean> = _chatSending.asStateFlow()

    private val _chatReply = MutableStateFlow<ChatReply?>(null)
    val chatReply: StateFlow<ChatReply?> = _chatReply.asStateFlow()

    private val _chatError = MutableStateFlow<String?>(null)
    val chatError: StateFlow<String?> = _chatError.asStateFlow()

    private val _serverUrl = MutableStateFlow(aiRepository.localServerUrl())
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    // 对话上下文（仅保留最近 12 条，避免 prompt 过长拖慢本地推理）
    private val history = mutableListOf<LocalChatTurn>()
    private var replySeq = 0L

    /**
     * 向本地训练模型发送一条消息。
     *
     * @param userId 稳定的用户标识（客户端生成即可）
     * @param text   用户输入
     */
    fun sendChatMessage(userId: String, text: String) {
        if (text.isBlank() || _chatSending.value) return
        viewModelScope.launch {
            _chatSending.value = true
            _chatError.value = null
            runCatching {
                aiRepository.chatWithLocalModel(
                    userId = userId,
                    message = text.trim(),
                    history = history.toList(),
                )
            }.onSuccess { resp ->
                history += LocalChatTurn(role = "user", content = text.trim())
                history += LocalChatTurn(role = "assistant", content = resp.response)
                while (history.size > 12) history.removeAt(0)
                replySeq += 1
                _chatReply.value = ChatReply(
                    seq = replySeq,
                    content = resp.response,
                    riskLevel = resp.riskLevel,
                    model = resp.model,
                    elapsedMs = resp.responseTimeMs,
                )
            }.onFailure { e ->
                _chatError.value = e.message ?: e.toString()
            }
            _chatSending.value = false
        }
    }

    /** 更新本地模型服务地址（下次请求即时生效） */
    fun updateServerUrl(url: String) {
        aiRepository.updateLocalServerUrl(url)
        _serverUrl.value = aiRepository.localServerUrl()
    }

    fun setApiKey(apiKey: String) {
        aiRepository.setApiKey(apiKey)
    }

    fun generateArticle(
        topic: String,
        style: String? = "professional",
        wordCount: Int? = 800,
        additionalRequirements: String? = null,
    ) {
        launchAction("generateArticle") {
            aiRepository.generateArticle(
                topic = topic,
                style = style,
                wordCount = wordCount,
                additionalRequirements = additionalRequirements,
            )
        }
    }

    fun summarizeContent(
        content: String,
        summaryLength: Int? = 200,
        summaryType: String? = "general",
    ) {
        launchAction("summarizeContent") {
            aiRepository.summarizeContent(
                content = content,
                summaryLength = summaryLength,
                summaryType = summaryType,
            )
        }
    }

    fun convertStyle(content: String, targetStyle: String) {
        launchAction("convertStyle") {
            aiRepository.convertStyle(
                content = content,
                targetStyle = targetStyle,
            )
        }
    }

    fun analyzeTopic(
        content: String,
        includeSentiment: Boolean = true,
        includeKeywords: Boolean = true,
        includeSuggestions: Boolean = true,
    ) {
        launchAction("analyzeTopic") {
            aiRepository.analyzeTopic(
                content = content,
                includeSentiment = includeSentiment,
                includeKeywords = includeKeywords,
                includeSuggestions = includeSuggestions,
            )
        }
    }

    fun clearResult() {
        _state.value = AiState()
    }

    private fun launchAction(actionName: String, block: suspend () -> String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isLoading = true,
                currentAction = actionName,
                error = null,
                result = null,
            )
            runCatching { block() }
                .onSuccess { result ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        result = result,
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message ?: e.toString(),
                    )
                }
        }
    }
}
