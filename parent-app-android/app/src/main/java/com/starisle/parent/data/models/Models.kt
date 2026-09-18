package com.starisle.parent.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * 家长用户
 */
@JsonClass(generateAdapter = true)
data class ParentUser(
    val id: String,
    val username: String? = null,
    val nickname: String,
    val phone: String? = null,
    val avatar: String? = null,
    val signature: String? = null,
    val createdAt: String? = null
)

/**
 * 孩子绑定关系
 */
@JsonClass(generateAdapter = true)
data class ChildBinding(
    val bindingId: String,
    val studentId: String,
    val studentNickname: String,
    val studentAvatar: String? = null,
    val authorized: Boolean = false,
    val createdAt: String,
    // parent-app 旧字段（兼容两种 store 字段命名）
    val parentId: String? = null,
    val bindType: String? = null,
    val latestMood: Int? = null,
    val riskLevel: String? = null,
    val lastCheckinDate: String? = null,
    @Json(name = "id") val legacyId: String? = null
)

/**
 * 心情记录（孩子）
 */
@JsonClass(generateAdapter = true)
data class MoodRecord(
    val id: String,
    val userId: String,
    val moodLevel: Int,
    val tags: List<String> = emptyList(),
    val checkinDate: String,
    val createdAt: String? = null
)

/**
 * 情绪趋势数据（家长端旧版）
 */
@JsonClass(generateAdapter = true)
data class MoodTrendData(
    val date: String,
    val moodLevel: Int,
    val tags: List<String> = emptyList()
)

/**
 * 情绪摘要（家长端旧版）
 */
@JsonClass(generateAdapter = true)
data class MoodSummary(
    val trend: String,
    val description: String,
    val aiSuggestion: String,
    val tagDistribution: Map<String, Int> = emptyMap(),
    val checkinCalendar: List<String> = emptyList()
)

/**
 * 紧急告警
 */
@JsonClass(generateAdapter = true)
data class EmergencyAlert(
    val alertId: String,
    val studentId: String,
    val level: String,
    val reason: String,
    val createdAt: String,
    val confirmed: Boolean = false,
    val confirmedAt: String? = null,
    val status: String? = null
)

/**
 * 应急资源
 */
@JsonClass(generateAdapter = true)
data class EmergencyResource(
    val id: String? = null,
    val type: String,
    val title: String? = null,
    val name: String? = null,
    val content: String? = null,
    val contact: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val distance: String? = null,
    val description: String? = null,
    val lat: Double? = null,
    val lng: Double? = null
)

/**
 * 知识库文章
 */
@JsonClass(generateAdapter = true)
data class KnowledgeArticle(
    val id: String,
    val title: String,
    val category: String,
    val summary: String,
    val content: String,
    val readTime: Int = 3,
    val createdAt: String? = null
)

/**
 * 聊天消息（与 AI 大星）
 */
@JsonClass(generateAdapter = true)
data class ChatMessage(
    val id: String,
    val userId: String,
    val content: String,
    val role: String, // user / assistant
    val timestamp: String,
    val riskLevel: String? = null
)

/**
 * 通知设置
 */
@JsonClass(generateAdapter = true)
data class NotificationSettings(
    val moodAlert: Boolean = true,
    val checkinReminder: Boolean = true,
    val checkinThreshold: Int = 7,
    val knowledgeUpdate: Boolean = false,
    val emergencyAlert: Boolean = true
)

/**
 * 登录响应
 */
@JsonClass(generateAdapter = true)
data class ParentLoginResponse(
    val userId: String,
    val nickname: String,
    val phone: String,
    val avatar: String? = null,
    val token: String
)

/**
 * 统一响应壳层（与后端 { code, message, data } 对齐）
 */
@JsonClass(generateAdapter = true)
data class ApiEnvelope<T>(
    val code: Int? = null,
    val message: String? = null,
    val data: T? = null
)

/**
 * 风险检测请求
 */
@JsonClass(generateAdapter = true)
data class RiskDetectRequest(
    val userId: String,
    val content: String,
    val contentType: String? = null
)

@JsonClass(generateAdapter = true)
data class CrisisReportRequest(
    val userId: String,
    val riskLevel: String,
    val triggerType: String? = null
)
