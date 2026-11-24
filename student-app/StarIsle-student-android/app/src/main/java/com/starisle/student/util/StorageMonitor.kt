package com.starisle.student.util

import com.starisle.student.data.db.MemoryStorageService
import com.starisle.student.data.db.entity.MaintenanceHistory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 存储状态快照（对应 Dart StorageStatus）。
 */
data class StorageStatus(
    val databaseSize: Long,
    val recordCounts: Map<String, Int>,
    val maintenanceHistory: List<MaintenanceRecordUi>,
)

/**
 * 维护历史 UI 模型（对应 Dart MaintenanceRecord）。
 */
data class MaintenanceRecordUi(
    val id: String,
    val actionType: String,
    val details: String,
    val itemsProcessed: Int,
    val storageSaved: Int,
    val startedAt: Long,
    val completedAt: Long?,
)

/**
 * 存储监控（对应 Dart services/memory_storage/storage_monitor.dart）。
 *
 * 每 5 分钟（默认）周期采集一次存储状态，通过 [status] StateFlow 暴露。
 *
 * Dart 版用 Timer.periodic；本 Kotlin 版用协程 [launch] + [delay] 循环。
 */
@Singleton
class StorageMonitor @Inject constructor(
    private val storageService: MemoryStorageService,
) {
    // 默认 5 分钟检查一次（Dart checkInterval 默认值）
    private val checkIntervalMs: Long = 5 * 60 * 1000L

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var monitorJob: Job? = null

    private val _status = MutableStateFlow(
        StorageStatus(0L, emptyMap(), emptyList())
    )
    val status: StateFlow<StorageStatus> = _status.asStateFlow()

    /**
     * 启动周期性存储监控。
     */
    suspend fun startMonitoring(checkIntervalMs: Long = this.checkIntervalMs) {
        // 立即更新一次状态
        updateStatus()
        // 已有任务则取消再重启
        monitorJob?.cancel()
        monitorJob = scope.launch {
            while (true) {
                delay(checkIntervalMs)
                updateStatus()
            }
        }
    }

    suspend fun stopMonitoring() {
        monitorJob?.cancel()
        monitorJob = null
    }

    suspend fun getCurrentStatus(): StorageStatus = snapshot()

    suspend fun getMaintenanceHistory(limit: Int = 20): List<MaintenanceRecordUi> {
        val history = storageService.queryMaintenanceHistory(limit)
        return history.map { it.toUi() }
    }

    /**
     * 字节数格式化（对应 Dart formatSize）。
     */
    fun formatSize(bytes: Long): String {
        if (bytes < 1024L) return "$bytes B"
        if (bytes < 1024L * 1024L) return "%.2f KB".format(bytes / 1024.0)
        return "%.2f MB".format(bytes / (1024.0 * 1024.0))
    }

    private suspend fun updateStatus() {
        runCatching { snapshot() }
            .onSuccess { _status.value = it }
            .onFailure { it.printStackTrace() }
    }

    private suspend fun snapshot(): StorageStatus {
        val size = storageService.getDatabaseSize()
        val stats = storageService.getStorageStats()
        val history = storageService.queryMaintenanceHistory(10).map { it.toUi() }
        return StorageStatus(size, stats, history)
    }

    private fun MaintenanceHistory.toUi() = MaintenanceRecordUi(
        id = id,
        actionType = actionType,
        details = details.orEmpty(),
        itemsProcessed = itemsProcessed,
        storageSaved = storageSaved,
        startedAt = startedAt,
        completedAt = completedAt,
    )

    /**
     * 操作耗时（对应 Dart MaintenanceRecord.duration）。
     */
    fun formatDuration(record: MaintenanceRecordUi): String {
        val completed = record.completedAt ?: return "进行中"
        val diffSec = (completed - record.startedAt) / 1000
        val diffMin = diffSec / 60
        val diffHour = diffMin / 60
        return when {
            diffSec < 60 -> "${diffSec}秒"
            diffMin < 60 -> "${diffMin}分钟"
            else -> "${diffHour}小时"
        }
    }

    /**
     * 操作类型中文标签（对应 Dart actionTypeLabel）。
     */
    fun actionTypeLabel(actionType: String): String = when (actionType) {
        "auto_maintenance" -> "自动整理"
        "manual_maintenance" -> "手动整理"
        "data_cleanup" -> "数据清理"
        "compaction" -> "数据库压缩"
        else -> actionType
    }
}
