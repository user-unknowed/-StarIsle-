package com.starisle.student.util

import android.content.Context
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.starisle.student.data.db.MemoryStorageService
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.runBlocking
import java.util.Calendar
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import androidx.hilt.work.HiltWorker

/**
 * 维护工作器（WorkManager Worker，在后台任务执行时调用 [MemoryStorageService]）。
 *
 * 对应 Dart callbackDispatcher 中的 _performMaintenance()：清理过期数据 +
 * 压缩数据库 + 写入维护历史。
 */
@HiltWorker
class MaintenanceWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val storageService: MemoryStorageService,
) : Worker(appContext, params) {

    override fun doWork(): Result = runBlocking {
        try {
            val startTime = System.currentTimeMillis()
            val initialSize = storageService.getDatabaseSize()

            storageService.clearExpiredData()
            storageService.compactDatabase()

            val endTime = System.currentTimeMillis()
            val finalSize = storageService.getDatabaseSize()
            val storageSaved = (initialSize - finalSize).coerceAtLeast(0L).toInt()

            storageService.recordMaintenance(
                actionType = "auto_maintenance",
                details = "自动整理：清理过期数据并压缩数据库",
                itemsProcessed = 0,
                storageSaved = storageSaved,
                startedAt = startTime,
                completedAt = endTime,
            )
            Result.success()
        } catch (e: Throwable) {
            e.printStackTrace()
            Result.retry()
        }
    }
}

/**
 * 内存存储维护调度器（对应 Dart services/memory_storage/maintenance_scheduler.dart）。
 *
 * 默认维护窗口：22:00 - 次日 06:00。每 24 小时执行一次周期性任务，
 * 首次执行延迟至下次窗口开始。
 *
 * 维护窗口配置持久化到 SharedPreferences（与 Dart 版一致）。
 */
@Singleton
class MaintenanceScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val storageService: MemoryStorageService,
) {
    companion object {
        const val WORK_TAG = "starisle_student_maintenance"

        // 默认维护窗口 22:00 - 06:00（Dart defaultTimeWindows）
        const val DEFAULT_START_HOUR = 22
        const val DEFAULT_START_MINUTE = 0
        const val DEFAULT_END_HOUR = 6
        const val DEFAULT_END_MINUTE = 0

        private const val PREF_NAME = "maintenance_prefs"
        private const val KEY_START_HOUR = "maintenance_start_hour"
        private const val KEY_START_MINUTE = "maintenance_start_minute"
        private const val KEY_END_HOUR = "maintenance_end_hour"
        private const val KEY_END_MINUTE = "maintenance_end_minute"
    }

    suspend fun initialize() {
        scheduleMaintenance()
    }

    suspend fun scheduleMaintenance() {
        val workManager = WorkManager.getInstance(context)
        workManager.cancelAllWorkByTag(WORK_TAG)

        val delayMinutes = calculateNextDelayMinutes()
        val request = PeriodicWorkRequestBuilder<MaintenanceWorker>(
            24, TimeUnit.HOURS,
        )
            .setInitialDelay(delayMinutes, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                    .setRequiresBatteryNotLow(false)
                    .setRequiresCharging(false)
                    .setRequiresDeviceIdle(false)
                    .setRequiresStorageNotLow(false)
                    .build()
            )
            .addTag(WORK_TAG)
            .build()
        workManager.enqueue(request)
    }

    suspend fun setMaintenanceWindow(
        startHour: Int,
        startMinute: Int,
        endHour: Int,
        endMinute: Int,
    ) {
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_START_HOUR, startHour)
            .putInt(KEY_START_MINUTE, startMinute)
            .putInt(KEY_END_HOUR, endHour)
            .putInt(KEY_END_MINUTE, endMinute)
            .apply()
        scheduleMaintenance()
    }

    fun getMaintenanceWindow(): Map<String, Int> {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return mapOf(
            "startHour" to (prefs.getInt(KEY_START_HOUR, DEFAULT_START_HOUR)),
            "startMinute" to (prefs.getInt(KEY_START_MINUTE, DEFAULT_START_MINUTE)),
            "endHour" to (prefs.getInt(KEY_END_HOUR, DEFAULT_END_HOUR)),
            "endMinute" to (prefs.getInt(KEY_END_MINUTE, DEFAULT_END_MINUTE)),
        )
    }

    /**
     * 手动触发一次维护（对应 Dart runManualMaintenance）。
     */
    suspend fun runManualMaintenance() {
        val startTime = System.currentTimeMillis()
        val initialSize = storageService.getDatabaseSize()

        storageService.clearExpiredData()
        storageService.compactDatabase()

        val endTime = System.currentTimeMillis()
        val finalSize = storageService.getDatabaseSize()
        val storageSaved = (initialSize - finalSize).coerceAtLeast(0L).toInt()

        storageService.recordMaintenance(
            actionType = "manual_maintenance",
            details = "手动整理：清理过期数据并压缩数据库",
            itemsProcessed = 0,
            storageSaved = storageSaved,
            startedAt = startTime,
            completedAt = endTime,
        )
    }

    fun cancelMaintenance() {
        WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG)
    }

    fun pauseMaintenance() = cancelMaintenance()

    suspend fun resumeMaintenance() = scheduleMaintenance()

    /**
     * 计算到下一次维护窗口开始的分钟数（对应 Dart _calculateNextDelay）。
     */
    private fun calculateNextDelayMinutes(): Long {
        val now = Calendar.getInstance()
        val window = getMaintenanceWindow()
        val target = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, window["startHour"] ?: DEFAULT_START_HOUR)
            set(Calendar.MINUTE, window["startMinute"] ?: DEFAULT_START_MINUTE)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= now.timeInMillis) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }
        val diffMs = target.timeInMillis - now.timeInMillis
        return TimeUnit.MILLISECONDS.toMinutes(diffMs.coerceAtLeast(0L))
    }
}
