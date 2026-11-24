package com.starisle.teacher.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.teacher.data.repo.AiRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * AI ViewModel。
 *
 * 对应 Dart 端 `providers/ai_provider.dart`：
 * - AiState 状态字段：isLoading / result / error / currentAction；
 * - 文章生成 / 内容摘要 / 风格转换 / 主题分析；
 * - setApiKey / clearResult。
 */
@HiltViewModel
class AiViewModel @Inject constructor(
    private val aiRepo: AiRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiUiState())
    val uiState: StateFlow<AiUiState> = _uiState.asStateFlow()

    /** 设置 AI API Key。 */
    fun setApiKey(apiKey: String) {
        aiRepo.setApiKey(apiKey)
    }

    /** 切换供应商。 */
    fun switchProvider(provider: com.starisle.teacher.data.repo.AiRepository.Provider) {
        aiRepo.switchProvider(provider)
    }

    fun generateArticle(
        topic: String,
        style: String = "professional",
        wordCount: Int = 800,
        additionalRequirements: String? = null,
    ) {
        launchAction("generateArticle") {
            aiRepo.generateArticle(topic, style, wordCount, additionalRequirements)
        }
    }

    fun summarizeContent(
        content: String,
        summaryLength: Int = 200,
        summaryType: String = "general",
    ) {
        launchAction("summarizeContent") {
            aiRepo.summarizeContent(content, summaryLength, summaryType)
        }
    }

    fun convertStyle(content: String, targetStyle: String) {
        launchAction("convertStyle") {
            aiRepo.convertStyle(content, targetStyle)
        }
    }

    fun analyzeTopic(
        content: String,
        includeSentiment: Boolean = true,
        includeKeywords: Boolean = true,
        includeSuggestions: Boolean = true,
    ) {
        launchAction("analyzeTopic") {
            aiRepo.analyzeTopic(content, includeSentiment, includeKeywords, includeSuggestions)
        }
    }

    /** 清空当前结果，重置为初始状态。 */
    fun clearResult() {
        _uiState.value = AiUiState()
    }

    private fun launchAction(action: String, block: suspend () -> String) {
        _uiState.update { it.copy(isLoading = true, currentAction = action, error = null) }
        viewModelScope.launch {
            try {
                val result = block()
                _uiState.update { it.copy(isLoading = false, result = result) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message ?: e.toString()) }
            }
        }
    }
}

/** AI 状态数据类。 */
data class AiUiState(
    val isLoading: Boolean = false,
    val result: String? = null,
    val error: String? = null,
    val currentAction: String = "",
)
