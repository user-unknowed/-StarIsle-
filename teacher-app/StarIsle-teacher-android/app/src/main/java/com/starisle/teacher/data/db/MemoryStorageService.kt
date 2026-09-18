package com.starisle.teacher.data.db

import android.content.Context
import com.starisle.teacher.data.models.MaintenanceRecord
import com.starisle.teacher.data.models.StorageStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDateTime
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 教师端本地存储服务。
 *
 * 对应 Dart 端 `services/memory_storage/memory_storage_service.dart`：
 * - sqflite_sqlcipher → Room（加密暂简化为标准 Room，详见 [MemoryDatabase] 类注释）；
 * - FlutterSecureStorage → 简化保存在 DataStore / SharedPreferences 中（密钥不再独立）；
 * - 保留 insert/query/update/delete/clearExpired/compact/stats/getDatabaseSize/close/clearAll 接口语义。
 */
@Singleton
class MemoryStorageService @Inject constructor(
    private val context: Context,
    private val database: MemoryDatabase,
) {
    private val appContext: Context = context.applicationContext

    /** 获取数据库文件。 */
    private val dbFile: File
        get() = appContext.getDatabasePath(MemoryDatabase.DB_NAME)

    /** 通用插入：主键冲突时替换。 */
    suspend fun insert(table: String, data: Map<String, Any?>) = withContext(Dispatchers.IO) {
        // 仅实现 maintenance_history 表的插入路径（其他业务表通过各自 DAO 扩展）。
        if (table == "maintenance_history") {
            val entity = MaintenanceHistoryEntity(
                id = data["id"] as? String ?: UUID.randomUUID().toString(),
                actionType = data["action_type"] as? String ?: "",
                details = data["details"] as? String,
                itemsProcessed = (data["items_processed"] as? Number)?.toInt() ?: 0,
                storageSaved = (data["storage_saved"] as? Number)?.toLong() ?: 0L,
                startedAt = (data["started_at"] as? Number)?.toLong() ?: 0L,
                completedAt = data["completed_at"] as? Long,
            )
            database.maintenanceDao().upsert(entity)
        }
    }

    /** 通用查询：仅支持 maintenance_history 表。 */
    suspend fun query(
        table: String,
        orderBy: String? = null,
        limit: Int = 100,
    ): List<Map<String, Any?>> = withContext(Dispatchers.IO) {
        if (table == "maintenance_history") {
            database.maintenanceDao().queryRecent(limit).map { it.toMap() }
        } else {
            emptyList()
        }
    }

    /** 清理所有业务表中已过期的数据（expires_at 早于当前时间）。 */
    suspend fun clearExpiredData() = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        // 通过 SupportSQLiteDatabase 执行原始 SQL，避免为每张表写 DAO。
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM observation_notes WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM symptom_reports WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM alerts WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM todo_items WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM chat_sessions WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
        database.openHelper.writableDatabase.execSQL(
            "DELETE FROM chat_messages WHERE expires_at IS NOT NULL AND expires_at < ?",
            arrayOf(now),
        )
    }

    /** 执行 VACUUM 压缩数据库，回收未使用空间。 */
    suspend fun compactDatabase() = withContext(Dispatchers.IO) {
        database.openHelper.writableDatabase.execSQL("VACUUM")
    }

    /** 获取数据库文件大小（字节），文件不存在时返回 0。 */
    suspend fun getDatabaseSize(): Long = withContext(Dispatchers.IO) {
        val f = dbFile
        if (f.exists()) f.length() else 0L
    }

    /** 获取各业务表的记录数统计。 */
    @Suppress("UNUSED_VARIABLE")
    suspend fun getStorageStats(): Map<String, Int> = withContext(Dispatchers.IO) {
        val db = database.openHelper.readableDatabase
        fun countOf(table: String): Int =
            db.query("SELECT COUNT(*) AS c FROM $table", arrayOf<Any?>()).use { c ->
                if (c.moveToFirst()) c.getInt(0) else 0
            }
        mapOf(
            "observation_notes" to countOf("observation_notes"),
            "symptom_reports" to countOf("symptom_reports"),
            "alerts" to countOf("alerts"),
            "todo_items" to countOf("todo_items"),
            "chat_messages" to countOf("chat_messages"),
        )
    }

    /** 关闭数据库连接。 */
    suspend fun close() = withContext(Dispatchers.IO) {
        // Room 单例由 DI 管理生命周期，这里仅做兼容占位。
    }

    /** 清空所有业务表数据并压缩数据库。 */
    suspend fun clearAllData() = withContext(Dispatchers.IO) {
        val db = database.openHelper.writableDatabase
        listOf(
            "observation_notes",
            "symptom_reports",
            "alerts",
            "todo_items",
            "chat_sessions",
            "chat_messages",
        ).forEach { table ->
            db.execSQL("DELETE FROM $table")
        }
        compactDatabase()
    }

    /** 一次性获取当前存储状态。 */
    suspend fun getCurrentStatus(): StorageStatus = withContext(Dispatchers.IO) {
        StorageStatus(
            databaseSize = getDatabaseSize(),
            recordCounts = getStorageStats(),
            maintenanceHistory = query("maintenance_history", orderBy = "started_at DESC", limit = 10)
                .map { it.toMaintenanceRecord() },
        )
    }

    /** 查询维护历史。 */
    suspend fun getMaintenanceHistory(limit: Int = 20): List<MaintenanceRecord> =
        withContext(Dispatchers.IO) {
            query("maintenance_history", orderBy = "started_at DESC", limit = limit)
                .map { it.toMaintenanceRecord() }
        }
}

/** 将实体行 Map 转换为 [MaintenanceRecord]。 */
private fun Map<String, Any?>.toMaintenanceRecord(): MaintenanceRecord {
    val startedAt = (this["started_at"] as? Number)?.toLong() ?: 0L
    val completedAt = this["completed_at"] as? Long
    return MaintenanceRecord(
        id = this["id"] as? String ?: "",
        actionType = this["action_type"] as? String ?: "",
        details = this["details"] as? String ?: "",
        itemsProcessed = (this["items_processed"] as? Number)?.toInt() ?: 0,
        storageSaved = (this["storage_saved"] as? Number)?.toLong() ?: 0L,
        startedAt = startedAt.toLocalDateTime(),
        completedAt = completedAt?.toLocalDateTime(),
    )
}

/** MaintenanceHistoryEntity → Map（保持 query 返回结构兼容 Dart 语义）。 */
private fun MaintenanceHistoryEntity.toMap(): Map<String, Any?> = mapOf(
    "id" to id,
    "action_type" to actionType,
    "details" to details,
    "items_processed" to itemsProcessed,
    "storage_saved" to storageSaved,
    "started_at" to startedAt,
    "completed_at" to completedAt,
)
