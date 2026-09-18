package com.starisle.student.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
