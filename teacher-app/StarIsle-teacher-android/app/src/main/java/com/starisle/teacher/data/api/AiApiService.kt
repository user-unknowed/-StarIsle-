package com.starisle.teacher.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * OpenAI 兼容风格的 Chat Completions 请求体（智谱/SiliconFlow 通用）。
 */
@JsonClass(generateAdapter = true)
data class ChatCompletionRequest(
    @Json(name = "model") val model: String,
    @Json(name = "messages") val messages: List<ChatMessageDto>,
    @Json(name = "temperature") val temperature: Double = 0.7,
    @Json(name = "max_tokens") val maxTokens: Int = 2048,
)

@JsonClass(generateAdapter = true)
data class ChatMessageDto(
    @Json(name = "role") val role: String,
    @Json(name = "content") val content: String,
)

@JsonClass(generateAdapter = true)
data class ChatCompletionResponse(
    @Json(name = "choices") val choices: List<Choice>? = null,
)

@JsonClass(generateAdapter = true)
data class Choice(
    @Json(name = "message") val message: MessageDto? = null,
)

@JsonClass(generateAdapter = true)
data class MessageDto(
    @Json(name = "content") val content: String? = null,
)

/**
 * 智谱 GLM API（OpenAI 兼容端点）。
 */
interface ZhipuApiService {
    @POST("chat/completions")
    suspend fun chatCompletions(
        @Header("Authorization") auth: String,
        @Body body: ChatCompletionRequest,
    ): ChatCompletionResponse
}

/**
 * SiliconFlow API（OpenAI 兼容端点）。
 */
interface SiliconFlowApiService {
    @POST("chat/completions")
    suspend fun chatCompletions(
        @Header("Authorization") auth: String,
        @Body body: ChatCompletionRequest,
    ): ChatCompletionResponse
}
