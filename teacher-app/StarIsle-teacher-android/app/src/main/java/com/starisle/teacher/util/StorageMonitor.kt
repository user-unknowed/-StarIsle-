package com.starisle.teacher.util

import com.starisle.teacher.data.db.MemoryStorageService
import com.starisle.teacher.data.models.StorageStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * 存储监控服务。
 *
 * 对应 Dart 端 `services/memory_storage/storage_monitor.dart`：
 * - 周期性采集数据库大小、记录数与维护历史；
 * - 通过 [SharedFlow] 向外广播 [StorageStatus]；
 * - 提供一次性状态查询与体积格式化。
 */
class StorageMonitor(
    private val storage: MemoryStorageService,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _statusFlow = MutableSharedFlow<StorageStatus>(replay = 1, extraBufferCapacity = 4)
    val statusFlow: SharedFlow<StorageStatus> = _statusFlow.asSharedFlow()

    /** 启动周期性监控，默认 5 分钟一次。 */
    suspend fun startMonitoring(intervalMillis: Long = 5 * 60 * 1000L) {
        updateStatus()
        scope.launch {
            while (isActive) {
                delay(intervalMillis)
                updateStatus()
            }
        }
    }

    /** 停止监控。 */
    fun stopMonitoring() {
        scope.cancel()
    }

    /** 采集一次最新状态并推送到流。 */
    suspend fun updateStatus() {
        try {
            _statusFlow.emit(storage.getCurrentStatus())
        } catch (e: Exception) {
            _statusFlow.emit(
                StorageStatus(
                    databaseSize = 0L,
                    recordCounts = emptyMap(),
                    maintenanceHistory = emptyList(),
                ),
            )
        }
    }

    /** 获取一次性的当前存储状态。 */
    suspend fun getCurrentStatus(): StorageStatus = storage.getCurrentStatus()

    companion object {
        /** 将字节数格式化为易读字符串（B/KB/MB）。 */
        fun formatSize(bytes: Long): String = when {
            bytes < 1024L -> "$bytes B"
            bytes < 1024L * 1024L -> String.format("%.2f KB", bytes / 1024.0)
            else -> String.format("%.2f MB", bytes / (1024.0 * 1024.0))
        }
    }
}
