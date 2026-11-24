package com.starisle.teacher.util

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.starisle.teacher.data.db.MemoryStorageService
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit

/**
 * 本地存储维护调度器。
 *
 * 对应 Dart 端 `services/memory_storage/maintenance_scheduler.dart`：
 * - workmanager → androidx.work.WorkManager；
 * - 默认维护时间窗口：22:00 - 次日 06:00；
 * - 周期性维护任务（每 24 小时一次），支持手动触发 / 暂停 / 恢复 / 取消。
 */
class MaintenanceScheduler(
    private val context: Context,
    private val storage: MemoryStorageService,
) {
    /** 初始化 WorkManager + 注册周期性维护任务。 */
    suspend fun initialize() {
        // WorkManager 在 Application 中已通过自定义 Configuration 初始化，这里仅注册周期任务。
        scheduleMaintenance()
    }

    /** 取消旧任务并重新注册周期性维护任务（每 24 小时执行一次）。 */
    suspend fun scheduleMaintenance() {
        val workManager = WorkManager.getInstance(context)
        workManager.cancelAllWorkByTag(MAINTENANCE_TASK_TAG)

        val initialDelay = calculateNextDelay()
        val request = PeriodicWorkRequestBuilder<MaintenanceWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                    .setRequiresBatteryNotLow(false)
                    .setRequiresCharging(false)
                    .setRequiresDeviceIdle(false)
                    .setRequiresStorageNotLow(false)
                    .build()
            )
            .addTag(MAINTENANCE_TASK_TAG)
            .build()
        workManager.enqueue(request)
    }

    /** 手动触发一次维护，并记录到维护历史。 */
    suspend fun runManualMaintenance() {
        val startTime = System.currentTimeMillis()
        val initialSize = storage.getDatabaseSize()
        storage.clearExpiredData()
        storage.compactDatabase()
        val endTime = System.currentTimeMillis()
        val finalSize = storage.getDatabaseSize()
        storage.insert(
            "maintenance_history",
            mapOf(
                "id" to LocalDateTime.now().toString(),
                "action_type" to "manual_maintenance",
                "details" to "手动整理：清理过期数据并压缩数据库",
                "items_processed" to 0,
                "storage_saved" to (initialSize - finalSize).coerceAtLeast(0L),
                "started_at" to startTime,
                "completed_at" to endTime,
            ),
        )
    }

    /** 取消周期性维护任务。 */
    fun cancelMaintenance() {
        WorkManager.getInstance(context).cancelAllWorkByTag(MAINTENANCE_TASK_TAG)
    }

    /** 暂停维护（取消已注册任务）。 */
    fun pauseMaintenance() = cancelMaintenance()

    /** 恢复维护。 */
    suspend fun resumeMaintenance() = scheduleMaintenance()

    /** 计算距离下一个维护时间窗口起点的延迟（毫秒）。 */
    private fun calculateNextDelay(): Long {
        val now = LocalDateTime.now()
        val target = LocalDateTime.of(now.toLocalDate(), DEFAULT_WINDOW_START)
            .let { if (now.isAfter(it)) it.plusDays(1) else it }
        return now.until(target, ChronoUnit.MILLIS)
    }

    companion object {
        const val MAINTENANCE_TASK_TAG = "starisle_teacher_maintenance"
        val DEFAULT_WINDOW_START: LocalTime = LocalTime.of(22, 0)
        val DEFAULT_WINDOW_END: LocalTime = LocalTime.of(6, 0)
    }
}

/**
 * 维护任务 Worker：清理过期数据并压缩数据库，写入维护历史。
 */
class MaintenanceWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = try {
        val storage = MemoryStorageService(applicationContext, com.starisle.teacher.data.db.MemoryDatabase.get(applicationContext))
        val startTime = System.currentTimeMillis()
        val initialSize = storage.getDatabaseSize()
        storage.clearExpiredData()
        storage.compactDatabase()
        val endTime = System.currentTimeMillis()
        val finalSize = storage.getDatabaseSize()
        storage.insert(
            "maintenance_history",
            mapOf(
                "id" to LocalDateTime.now().toString(),
                "action_type" to "auto_maintenance",
                "details" to "自动整理：清理过期数据并压缩数据库",
                "items_processed" to 0,
                "storage_saved" to (initialSize - finalSize).coerceAtLeast(0L),
                "started_at" to startTime,
                "completed_at" to endTime,
            ),
        )
        Result.success(workDataOf("cleanup_done" to true))
    } catch (e: Exception) {
        Result.retry()
    }
}
