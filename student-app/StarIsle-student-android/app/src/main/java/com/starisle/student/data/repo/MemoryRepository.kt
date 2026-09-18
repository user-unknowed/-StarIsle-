package com.starisle.student.data.repo

import com.starisle.student.data.db.MemoryStorageService
import com.starisle.student.data.db.entity.MaintenanceHistory
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 内存仓储，对 [MemoryStorageService] 做薄包装，供 ViewModel 调用。
 *
 * 未来可在这一层扩展跨数据源的协调（如远端同步）。
 */
@Singleton
class MemoryRepository @Inject constructor(
    private val storageService: MemoryStorageService,
) {
    suspend fun clearExpiredData() = storageService.clearExpiredData()

    suspend fun compactDatabase() = storageService.compactDatabase()

    suspend fun getStorageStats(): Map<String, Int> = storageService.getStorageStats()

    suspend fun getDatabaseSize(): Long = storageService.getDatabaseSize()

    suspend fun clearAllData() = storageService.clearAllData()

    suspend fun queryMaintenanceHistory(limit: Int = 20): List<MaintenanceHistory> =
        storageService.queryMaintenanceHistory(limit)
}
