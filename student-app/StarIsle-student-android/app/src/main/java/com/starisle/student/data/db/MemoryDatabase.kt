package com.starisle.student.data.db

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import android.content.Context
import com.starisle.student.data.db.entity.AppSetting
import com.starisle.student.data.db.entity.ChatHistory
import com.starisle.student.data.db.entity.ChatSession
import com.starisle.student.data.db.entity.CopingStrategy
import com.starisle.student.data.db.entity.EmotionTrack
import com.starisle.student.data.db.entity.MaintenanceHistory
import com.starisle.student.data.db.entity.MoodRecord

/**
 * 本地数据库（对应 Dart services/memory_storage/memory_storage_service.dart）。
 *
 * Dart 版基于 sqflite_sqlcipher 加密；本 Kotlin 版暂用普通 Room，
 * 加密可在后续通过 SupportFactory + SQLCipher 集成（注释说明）。
 *
 * 包含 7 张业务表：mood_records / chat_history / chat_sessions /
 * coping_strategies / emotion_tracks / maintenance_history / app_settings。
 */
@Database(
    entities = [
        MoodRecord::class,
        ChatHistory::class,
        ChatSession::class,
        CopingStrategy::class,
        EmotionTrack::class,
        MaintenanceHistory::class,
        AppSetting::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class MemoryDatabase : RoomDatabase() {
    abstract fun memoryDao(): MemoryDao

    companion object {
        const val DB_NAME = "starisle_student.db"

        @Volatile
        private var INSTANCE: MemoryDatabase? = null

        /**
         * 单例访问入口。
         *
         * 注：若要启用 SQLCipher 加密，可在此处使用
         * SupportFactory(secretKey, openHelper) 包裹 OpenHelper：
         * ```
         * val factory = SupportFactory(secretKey.toByteArray())
         * Room.databaseBuilder(...)
         *     .openHelperFactory(factory)
         *     .build()
         * ```
         * 当前阶段先用明文 Room，后续接入加密。
         */
        fun getInstance(context: Context): MemoryDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    MemoryDatabase::class.java,
                    DB_NAME,
                )
                    .addCallback(object : Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            // 与 Dart 版一致：为高频查询字段创建索引
                            db.execSQL(
                                "CREATE INDEX IF NOT EXISTS idx_mood_records_date " +
                                    "ON mood_records(recorded_at)"
                            )
                            db.execSQL(
                                "CREATE INDEX IF NOT EXISTS idx_chat_history_session " +
                                    "ON chat_history(session_id)"
                            )
                            db.execSQL(
                                "CREATE INDEX IF NOT EXISTS idx_emotion_tracks_date " +
                                    "ON emotion_tracks(recorded_at)"
                            )
                        }
                    })
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
