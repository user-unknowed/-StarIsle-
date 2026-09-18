package com.starisle.student.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * AI 聊天请求体（智谱 GLM / SiliconFlow 兼容 OpenAI 格式）。
 */
@JsonClass(generateAdapter = true)
data class ChatCompletionRequest(
    val model: String,
    val messages: List<ChatMessage>,
    val temperature: Double = 0.7,
    @Json(name = "max_tokens") val maxTokens: Int = 2048,
)

@JsonClass(generateAdapter = true)
data class ChatMessage(
    val role: String,        // system / user / assistant
    val content: String,
)

@JsonClass(generateAdapter = true)
data class ChatCompletionResponse(
    val choices: List<Choice> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class Choice(
    val message: ChatMessage? = null,
)

/**
 * 心情记录（Room Entity 时复用结构）。
 */
data class MoodRecord(
    val id: String,
    val moodValue: Int,
    val moodNote: String? = null,
    val recordedAt: Long,
    val expiresAt: Long? = null,
)

/**
 * 聊天消息 UI 模型。
 */
data class ChatUiMessage(
    val id: String,
    val senderId: String,
    val senderName: String,
    val content: String,
    val sentAt: Long,
    val isUser: Boolean,
)
