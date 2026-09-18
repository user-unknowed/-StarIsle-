package com.starisle.parent.data.api

import com.starisle.parent.data.models.ChatMessage
import com.starisle.parent.data.models.CrisisReportRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * AI 聊天请求体（与 web-frontend ChatRequest 对齐）
 */
data class ChatRequest(
    val userId: String,
    val message: String
)

/**
 * AI 聊天响应（与 web-frontend ChatResponse 对齐）
 */
data class ChatResponse(
    val response: String? = null,
    val riskLevel: String? = null
)

/**
 * 话题卡片
 */
data class TopicCard(
    val id: String,
    val title: String,
    val category: String? = null
)

/**
 * 「大星」AI 顾问对话 API（对接 /v1/chat）
 * 后端可对接智谱 / SiliconFlow 等。
 */
interface AiApiService {

    @POST("/v1/chat/message")
    suspend fun sendMessage(
        @Body body: ChatRequest
    ): ChatResponse

    @GET("/v1/chat/history/{userId}")
    suspend fun getHistory(
        @Path("userId") userId: String,
        @Query("limit") limit: Int = 20
    ): List<ChatMessage>

    @GET("/v1/chat/topics")
    suspend fun getTopics(): Map<String, List<TopicCard>>

    @POST("/v1/risk/crisis/report")
    suspend fun reportCrisis(
        @Body body: CrisisReportRequest
    ): Map<String, Any?>
}
