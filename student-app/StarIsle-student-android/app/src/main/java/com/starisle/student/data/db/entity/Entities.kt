package com.starisle.student.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room 实体定义集合，对应 Dart memory_storage_service.dart 的 7 张表。
 *
 * 字段名采用驼峰风格，Room 默认将属性名作为列名，[ColumnInfo] 用于显式匹配
 * Dart 端使用的下划线命名（迁移 SQL 查询时可保持兼容）。
 */

@Entity(tableName = "mood_records")
data class MoodRecord(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "mood_value") val moodValue: Int,
    @ColumnInfo(name = "mood_note") val moodNote: String? = null,
    @ColumnInfo(name = "recorded_at") val recordedAt: Long,
    @ColumnInfo(name = "expires_at") val expiresAt: Long? = null,
)

@Entity(tableName = "chat_history")
data class ChatHistory(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "session_id") val sessionId: String,
    @ColumnInfo(name = "sender_id") val senderId: String,
    @ColumnInfo(name = "sender_name") val senderName: String,
    val content: String,
    @ColumnInfo(name = "sent_at") val sentAt: Long,
    @ColumnInfo(name = "expires_at") val expiresAt: Long? = null,
)

@Entity(tableName = "chat_sessions")
data class ChatSession(
    @PrimaryKey val id: String,
    val title: String,
    @ColumnInfo(name = "last_message") val lastMessage: String? = null,
    @ColumnInfo(name = "last_message_at") val lastMessageAt: Long? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "expires_at") val expiresAt: Long? = null,
)

@Entity(tableName = "coping_strategies")
data class CopingStrategy(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "strategy_type") val strategyType: String,
    val content: String,
    @ColumnInfo(name = "used_count") val usedCount: Int = 0,
    @ColumnInfo(name = "last_used_at") val lastUsedAt: Long? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "expires_at") val expiresAt: Long? = null,
)

@Entity(tableName = "emotion_tracks")
data class EmotionTrack(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "emotion_type") val emotionType: String,
    val intensity: Int,
    @ColumnInfo(name = "recorded_at") val recordedAt: Long,
    val context: String? = null,
    @ColumnInfo(name = "expires_at") val expiresAt: Long? = null,
)

@Entity(tableName = "maintenance_history")
data class MaintenanceHistory(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "action_type") val actionType: String,
    val details: String? = null,
    @ColumnInfo(name = "items_processed") val itemsProcessed: Int = 0,
    @ColumnInfo(name = "storage_saved") val storageSaved: Int = 0,
    @ColumnInfo(name = "started_at") val startedAt: Long,
    @ColumnInfo(name = "completed_at") val completedAt: Long? = null,
)

@Entity(tableName = "app_settings")
data class AppSetting(
    @PrimaryKey val key: String,
    val value: String,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)
