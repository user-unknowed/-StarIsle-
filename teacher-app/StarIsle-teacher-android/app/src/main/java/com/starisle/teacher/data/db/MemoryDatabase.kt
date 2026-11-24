package com.starisle.teacher.data.db

import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.OnConflictStrategy
import android.content.Context
import com.starisle.teacher.data.models.MaintenanceRecord
import com.starisle.teacher.data.models.StorageStatus
import kotlinx.coroutines.flow.Flow
import java.time.LocalDateTime

/**
 * 观察笔记实体（对应 Dart observation_notes 表）。
 */
@Entity(tableName = "observation_notes", indices = [Index("student_id")])
data class ObservationNoteEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "student_id") val studentId: String,
    @androidx.room.ColumnInfo(name = "student_name") val studentName: String,
    val content: String,
    @androidx.room.ColumnInfo(name = "risk_level") val riskLevel: String?,
    @androidx.room.ColumnInfo(name = "created_at") val createdAt: Long,
    @androidx.room.ColumnInfo(name = "updated_at") val updatedAt: Long?,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 症状报告实体（对应 Dart symptom_reports 表）。
 */
@Entity(tableName = "symptom_reports")
data class SymptomReportEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "student_id") val studentId: String,
    @androidx.room.ColumnInfo(name = "student_name") val studentName: String,
    val symptoms: String,
    @androidx.room.ColumnInfo(name = "report_type") val reportType: String,
    val severity: Int?,
    @androidx.room.ColumnInfo(name = "created_at") val createdAt: Long,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 预警实体（对应 Dart alerts 表）。
 */
@Entity(tableName = "alerts", indices = [Index("risk_level")])
data class AlertEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "student_id") val studentId: String,
    @androidx.room.ColumnInfo(name = "student_name") val studentName: String,
    @androidx.room.ColumnInfo(name = "class_name") val className: String?,
    @androidx.room.ColumnInfo(name = "risk_level") val riskLevel: String,
    @androidx.room.ColumnInfo(name = "trigger_reason") val triggerReason: String,
    val resolved: Int = 0,
    @androidx.room.ColumnInfo(name = "resolved_at") val resolvedAt: Long?,
    @androidx.room.ColumnInfo(name = "triggered_at") val triggeredAt: Long,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 待办实体（对应 Dart todo_items 表）。
 */
@Entity(tableName = "todo_items", indices = [Index("priority")])
data class TodoItemEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String?,
    val priority: Int = 0,
    val completed: Int = 0,
    @androidx.room.ColumnInfo(name = "due_date") val dueDate: Long?,
    @androidx.room.ColumnInfo(name = "created_at") val createdAt: Long,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 聊天会话实体（对应 Dart chat_sessions 表）。
 */
@Entity(tableName = "chat_sessions")
data class ChatSessionEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "student_id") val studentId: String?,
    @androidx.room.ColumnInfo(name = "student_name") val studentName: String?,
    val type: String,
    @androidx.room.ColumnInfo(name = "last_message") val lastMessage: String?,
    @androidx.room.ColumnInfo(name = "last_message_at") val lastMessageAt: Long?,
    @androidx.room.ColumnInfo(name = "created_at") val createdAt: Long,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 聊天消息实体（对应 Dart chat_messages 表）。
 */
@Entity(
    tableName = "chat_messages",
    foreignKeys = [
        androidx.room.ForeignKey(
            entity = ChatSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
            onDelete = androidx.room.ForeignKey.CASCADE,
        ),
    ],
)
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "session_id") val sessionId: String,
    @androidx.room.ColumnInfo(name = "sender_id") val senderId: String,
    @androidx.room.ColumnInfo(name = "sender_name") val senderName: String,
    @androidx.room.ColumnInfo(name = "is_teacher") val isTeacher: Int = 0,
    val content: String,
    @androidx.room.ColumnInfo(name = "sent_at") val sentAt: Long,
    @androidx.room.ColumnInfo(name = "expires_at") val expiresAt: Long?,
)

/**
 * 维护历史实体（对应 Dart maintenance_history 表）。
 */
@Entity(tableName = "maintenance_history")
data class MaintenanceHistoryEntity(
    @PrimaryKey val id: String,
    @androidx.room.ColumnInfo(name = "action_type") val actionType: String,
    val details: String?,
    @androidx.room.ColumnInfo(name = "items_processed") val itemsProcessed: Int = 0,
    @androidx.room.ColumnInfo(name = "storage_saved") val storageSaved: Long = 0L,
    @androidx.room.ColumnInfo(name = "started_at") val startedAt: Long,
    @androidx.room.ColumnInfo(name = "completed_at") val completedAt: Long?,
)

/**
 * 应用设置实体（对应 Dart app_settings 表）。
 */
@Entity(tableName = "app_settings")
data class AppSettingEntity(
    @PrimaryKey val key: String,
    val value: String,
    @androidx.room.ColumnInfo(name = "updated_at") val updatedAt: Long,
)

/** 维护历史 DAO。 */
@Dao
interface MaintenanceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: MaintenanceHistoryEntity)

    @Query("SELECT * FROM maintenance_history ORDER BY started_at DESC LIMIT :limit")
    suspend fun queryRecent(limit: Int): List<MaintenanceHistoryEntity>
}

/**
 * 教师端 Room 数据库。
 *
 * 注：Dart 端使用 sqflite_sqlcipher 加密；Android 端采用 Room（未加密）。
 * 如后续需要加密，可使用 SQLCipher + SupportSQLiteDatabase。
 */
@Database(
    entities = [
        ObservationNoteEntity::class,
        SymptomReportEntity::class,
        AlertEntity::class,
        TodoItemEntity::class,
        ChatSessionEntity::class,
        ChatMessageEntity::class,
        MaintenanceHistoryEntity::class,
        AppSettingEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class MemoryDatabase : RoomDatabase() {
    abstract fun maintenanceDao(): MaintenanceDao

    companion object {
        @Volatile
        private var INSTANCE: MemoryDatabase? = null

        const val DB_NAME = "starisle_teacher.db"

        fun get(context: Context): MemoryDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    MemoryDatabase::class.java,
                    DB_NAME,
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
    }
}

/** 工具：Long 毫秒 ↔ LocalDateTime。 */
internal fun Long.toLocalDateTime(): LocalDateTime =
    LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(this), java.time.ZoneId.systemDefault())

/** 工具：LocalDateTime → Long 毫秒。 */
internal fun LocalDateTime.toEpochMilli(): Long =
    atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
