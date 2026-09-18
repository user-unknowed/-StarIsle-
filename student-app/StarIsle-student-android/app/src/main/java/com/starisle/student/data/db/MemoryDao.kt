package com.starisle.student.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.starisle.student.data.db.entity.AppSetting
import com.starisle.student.data.db.entity.ChatHistory
import com.starisle.student.data.db.entity.ChatSession
import com.starisle.student.data.db.entity.CopingStrategy
import com.starisle.student.data.db.entity.EmotionTrack
import com.starisle.student.data.db.entity.MaintenanceHistory
import com.starisle.student.data.db.entity.MoodRecord
import kotlinx.coroutines.flow.Flow

/**
 * 数据访问对象，提供 7 张表的 CRUD 与统计查询。
 */
@Dao
interface MemoryDao {

    // === MoodRecords ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMood(record: MoodRecord)

    @Query("SELECT * FROM mood_records ORDER BY recorded_at DESC")
    fun observeMoodRecords(): Flow<List<MoodRecord>>

    @Query("SELECT * FROM mood_records ORDER BY recorded_at DESC LIMIT :limit")
    suspend fun queryMoodRecords(limit: Int): List<MoodRecord>

    @Query("DELETE FROM mood_records WHERE expires_at IS NOT NULL AND expires_at < :now")
    suspend fun deleteExpiredMood(now: Long): Int

    @Query("DELETE FROM mood_records")
    suspend fun clearMood(): Int

    @Query("SELECT COUNT(*) FROM mood_records")
    suspend fun moodCount(): Int

    // === ChatHistory ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChatHistory(item: ChatHistory)

    @Query("SELECT * FROM chat_history WHERE session_id = :sessionId ORDER BY sent_at ASC")
    fun observeChatHistory(sessionId: String): Flow<List<ChatHistory>>

    @Query("DELETE FROM chat_history WHERE expires_at IS NOT NULL AND expires_at < :now")
    suspend fun deleteExpiredChatHistory(now: Long): Int

    @Query("DELETE FROM chat_history")
    suspend fun clearChatHistory(): Int

    @Query("SELECT COUNT(*) FROM chat_history")
    suspend fun chatHistoryCount(): Int

    // === ChatSession ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChatSession(session: ChatSession)

    @Query("SELECT * FROM chat_sessions ORDER BY last_message_at DESC")
    fun observeChatSessions(): Flow<List<ChatSession>>

    @Query("DELETE FROM chat_sessions WHERE expires_at IS NOT NULL AND expires_at < :now")
    suspend fun deleteExpiredChatSessions(now: Long): Int

    @Query("DELETE FROM chat_sessions")
    suspend fun clearChatSessions(): Int

    @Query("SELECT COUNT(*) FROM chat_sessions")
    suspend fun chatSessionCount(): Int

    // === CopingStrategy ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCopingStrategy(item: CopingStrategy)

    @Query("DELETE FROM coping_strategies WHERE expires_at IS NOT NULL AND expires_at < :now")
    suspend fun deleteExpiredCopingStrategies(now: Long): Int

    @Query("DELETE FROM coping_strategies")
    suspend fun clearCopingStrategies(): Int

    @Query("SELECT COUNT(*) FROM coping_strategies")
    suspend fun copingStrategyCount(): Int

    // === EmotionTrack ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEmotionTrack(item: EmotionTrack)

    @Query("DELETE FROM emotion_tracks WHERE expires_at IS NOT NULL AND expires_at < :now")
    suspend fun deleteExpiredEmotionTracks(now: Long): Int

    @Query("DELETE FROM emotion_tracks")
    suspend fun clearEmotionTracks(): Int

    @Query("SELECT COUNT(*) FROM emotion_tracks")
    suspend fun emotionTrackCount(): Int

    // === MaintenanceHistory ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMaintenanceHistory(item: MaintenanceHistory)

    @Query("SELECT * FROM maintenance_history ORDER BY started_at DESC LIMIT :limit")
    suspend fun queryMaintenanceHistory(limit: Int = 10): List<MaintenanceHistory>

    @Query("SELECT COUNT(*) FROM maintenance_history")
    suspend fun maintenanceHistoryCount(): Int

    // === AppSetting ===
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSetting(setting: AppSetting)

    @Query("SELECT * FROM app_settings WHERE `key` = :key LIMIT 1")
    suspend fun getSetting(key: String): AppSetting?

    // === 统一清理与压缩 ===
    @Query("DELETE FROM mood_records")
    suspend fun clearAllMood(): Int
}
