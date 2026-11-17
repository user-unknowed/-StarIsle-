package com.starisle.parent.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.starisle.parent.data.models.ApiEnvelope
import com.starisle.parent.data.models.CrisisReportRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * AI 聊天请求体（与 web-frontend ChatRequest 对齐，snake_case 由网关内部转换）
 */
@JsonClass(generateAdapter = true)
data class ChatRequest(
    val userId: String,
    val message: String
)

/**
 * AI 聊天响应（网关 data 字段，camelCase）
 */
@JsonClass(generateAdapter = true)
data class ChatResponse(
    val userId: String? = null,
    val response: String? = null,
    val riskLevel: String? = null,
    val emotionTags: List<String>? = null,
    val responseTimeMs: Int? = null,
    val model: String? = null
)

/**
 * 聊天历史 data 载荷（网关返回对象，不是数组）
 */
@JsonClass(generateAdapter = true)
data class ChatHistoryPayload(
    @Json(name = "user_id") val userId: String? = null,
    val limit: Int? = null,
    val messages: List<ChatHistoryItem>? = null
)

/**
 * 单条聊天历史
 */
@JsonClass(generateAdapter = true)
data class ChatHistoryItem(
    val role: String? = null,
    val content: String? = null,
    val timestamp: String? = null
)

/**
 * 话题卡片
 */
@JsonClass(generateAdapter = true)
data class TopicCard(
    val id: String = "",
    val title: String = "",
    val category: String? = null,
    val icon: String? = null
)

/**
 * 话题卡片 data 载荷
 */
@JsonClass(generateAdapter = true)
data class TopicsPayload(
    val topics: List<TopicCard>? = null
)

/**
 * 「大星」AI 顾问对话 API（对接 /api/v1/chat）
 *
 * 注意：所有路径不得以 / 开头，否则会覆盖 Retrofit baseUrl 中的 /api/ 路径段。
 * 所有接口统一返回 {code, message, data} 信封。
 */
interface AiApiService {

    @POST("v1/chat/message")
    suspend fun sendMessage(
        @Body body: ChatRequest
    ): ApiEnvelope<ChatResponse>

    @GET("v1/chat/history/{userId}")
    suspend fun getHistory(
        @Path("userId") userId: String,
        @Query("limit") limit: Int = 20
    ): ApiEnvelope<ChatHistoryPayload>

    @GET("v1/chat/topics")
    suspend fun getTopics(): ApiEnvelope<TopicsPayload>

    @POST("v1/risk/crisis/report")
    suspend fun reportCrisis(
        @Body body: CrisisReportRequest
    ): ApiEnvelope<Map<String, Any?>>
}
