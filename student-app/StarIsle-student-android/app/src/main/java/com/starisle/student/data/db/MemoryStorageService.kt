package com.starisle.student.data.db

import android.content.Context
import com.starisle.student.data.db.entity.MaintenanceHistory
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 内存存储服务（对应 Dart services/memory_storage/memory_storage_service.dart）。
 *
 * Dart 版基于 sqflite_sqlcipher + SecureStorage；本 Kotlin 版基于 Room，
 * 提供与之等价的：清理过期数据、VACUUM、统计、获取文件大小、全量清空。
 *
 * 加密能力可通过 SupportFactory + SQLCipher 在 [MemoryDatabase.getInstance] 中扩展，
 * 当前阶段暂用明文 Room（与原 Dart 工程合并前后的核心逻辑保持一致）。
 */
@Singleton
class MemoryStorageService @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val dao: MemoryDao by lazy {
        MemoryDatabase.getInstance(context).memoryDao()
    }

    /**
     * 清理所有带 expiresAt 字段的表中的过期数据。
     */
    suspend fun clearExpiredData() {
        val now = System.currentTimeMillis()
        dao.deleteExpiredMood(now)
        dao.deleteExpiredChatHistory(now)
        dao.deleteExpiredChatSessions(now)
        dao.deleteExpiredCopingStrategies(now)
        dao.deleteExpiredEmotionTracks(now)
    }

    /**
     * 压缩数据库文件，回收空闲空间（对应 Dart VACUUM）。
     */
    suspend fun compactDatabase() {
        withContext(Dispatchers.IO) {
            MemoryDatabase.getInstance(context)
                .openHelper
                .writableDatabase
                .execSQL("VACUUM")
        }
    }

    /**
     * 获取各业务表记录数统计。
     */
    suspend fun getStorageStats(): Map<String, Int> = mapOf(
        "mood_records" to dao.moodCount(),
        "chat_history" to dao.chatHistoryCount(),
        "chat_sessions" to dao.chatSessionCount(),
        "coping_strategies" to dao.copingStrategyCount(),
        "emotion_tracks" to dao.emotionTrackCount(),
    )

    /**
     * 获取数据库文件大小（字节）。
     */
    suspend fun getDatabaseSize(): Long {
        val file = File(context.getDatabasePath(MemoryDatabase.DB_NAME).path)
        return if (file.exists()) file.length() else 0L
    }

    /**
     * 清空所有业务数据表并压缩数据库（保留表结构与维护历史）。
     */
    suspend fun clearAllData() {
        dao.clearMood()
        dao.clearChatHistory()
        dao.clearChatSessions()
        dao.clearCopingStrategies()
        dao.clearEmotionTracks()
        compactDatabase()
    }

    /**
     * 记录一次维护历史（自动 / 手动）。
     */
    suspend fun recordMaintenance(
        actionType: String,
        details: String,
        itemsProcessed: Int = 0,
        storageSaved: Int = 0,
        startedAt: Long,
        completedAt: Long,
    ) {
        dao.insertMaintenanceHistory(
            MaintenanceHistory(
                id = System.currentTimeMillis().toString(),
                actionType = actionType,
                details = details,
                itemsProcessed = itemsProcessed,
                storageSaved = storageSaved,
                startedAt = startedAt,
                completedAt = completedAt,
            )
        )
    }

    /**
     * 查询最近 N 条维护历史。
     */
    suspend fun queryMaintenanceHistory(limit: Int = 20) =
        dao.queryMaintenanceHistory(limit)
}
