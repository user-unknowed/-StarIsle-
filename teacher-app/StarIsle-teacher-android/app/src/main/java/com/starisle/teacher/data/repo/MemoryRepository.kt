package com.starisle.teacher.data.repo

import com.starisle.teacher.data.db.MemoryStorageService
import com.starisle.teacher.data.models.MaintenanceRecord
import com.starisle.teacher.data.models.StorageStatus
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 本地存储 / 维护历史 Repository。
 *
 * 薄包装 [MemoryStorageService]，统一暴露给 ViewModel。
 */
@Singleton
class MemoryRepository @Inject constructor(
    private val storage: MemoryStorageService,
) {
    suspend fun getCurrentStatus(): StorageStatus = storage.getCurrentStatus()

    suspend fun getMaintenanceHistory(limit: Int = 20): List<MaintenanceRecord> =
        storage.getMaintenanceHistory(limit)

    suspend fun runMaintenance(): StorageStatus {
        val initialSize = storage.getDatabaseSize()
        storage.clearExpiredData()
        storage.compactDatabase()
        val finalSize = storage.getDatabaseSize()
        val now = System.currentTimeMillis()
        storage.insert(
            "maintenance_history",
            mapOf(
                "id" to java.time.LocalDateTime.now().toString(),
                "action_type" to "manual_maintenance",
                "details" to "手动整理：清理过期数据并压缩数据库",
                "items_processed" to 0,
                "storage_saved" to (initialSize - finalSize).coerceAtLeast(0L),
                "started_at" to now,
                "completed_at" to now,
            ),
        )
        return getCurrentStatus()
    }
}
