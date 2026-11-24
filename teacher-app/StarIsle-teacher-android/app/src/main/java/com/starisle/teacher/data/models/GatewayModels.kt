package com.starisle.teacher.data.models

import com.squareup.moshi.Json

/**
 * 网关统一响应壳：{ code, message, data }。
 */
data class ApiEnvelope<T>(
    val code: Int? = null,
    val message: String? = null,
    val data: T? = null,
)

/** 登录请求（网关 /api/v1/users/login）。 */
data class TeacherLoginRequest(
    val username: String,
    val password: String,
)

/** 注册请求；教师端固定 role=teacher，不传 ageGroup。 */
data class TeacherRegisterRequest(
    val username: String,
    val password: String,
    val nickname: String,
    val role: String = "teacher",
)

/** 登录/注册返回的用户载荷。 */
data class TeacherLoginResponse(
    @Json(name = "user_id") val userId: String,
    val username: String? = null,
    val nickname: String? = null,
    val role: String? = null,
    val token: String? = null,
)

/** 对话上下文中的单条历史消息。 */
data class GatewayContextMessage(
    val role: String,
    val content: String,
)

/** 对话请求体，字段对齐网关 ChatController。 */
data class GatewayChatRequest(
    val userId: String,
    val message: String,
    val context: List<GatewayContextMessage> = emptyList(),
    val userProfile: Map<String, String> = emptyMap(),
)

/** 对话响应体，字段对齐网关返回的 data。 */
data class GatewayChatResponse(
    val userId: String? = null,
    val response: String? = null,
    val riskLevel: String? = null,
    val emotionTags: List<String>? = null,
    val responseTimeMs: Long? = null,
    val model: String? = null,
)

/** AI 对话气泡的 UI 模型。 */
data class TeacherAiMessage(
    val role: String,
    val content: String,
    val model: String? = null,
    val responseTimeMs: Long? = null,
    val riskLevel: String? = null,
)
