package com.starisle.student

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.starisle.student.util.MaintenanceScheduler
import com.starisle.student.util.StorageMonitor
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * StarIsle 学生端 Application 入口（对应 Dart main.dart）。
 *
 * 职责：
 * 1. 注入 Hilt 依赖图；
 * 2. 配置 WorkManager（使用 HiltWorkerFactory）；
 * 3. 启动 MaintenanceScheduler 与 StorageMonitor（对应 Dart main() 中的初始化）。
 */
@HiltAndroidApp
class StarIsleStudentApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var maintenanceScheduler: MaintenanceScheduler

    @Inject
    lateinit var storageMonitor: StorageMonitor

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        // 在后台协程中执行对应 Dart main() 的异步初始化流程
        appScope.launch {
            runCatching { maintenanceScheduler.initialize() }
                .onFailure { it.printStackTrace() }
            runCatching { storageMonitor.startMonitoring() }
                .onFailure { it.printStackTrace() }
        }
    }
}
