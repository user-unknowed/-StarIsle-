package com.starisle.teacher

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.starisle.teacher.util.MaintenanceScheduler
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 教师端 Application。
 *
 * 对应 Dart 端 `main.dart` 启动逻辑：
 * - ProviderScope → @HiltAndroidApp；
 * - MaintenanceScheduler.initialize() 启动时调用；
 * - 自定义 WorkManager Configuration（替代默认 WorkManagerInitializer）。
 */
@HiltAndroidApp
class StarIsleTeacherApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    @Inject
    lateinit var maintenanceScheduler: MaintenanceScheduler

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        // 启动维护调度器（对应 Dart main.dart 中的 MaintenanceScheduler.initialize()）
        appScope.launch {
            maintenanceScheduler.initialize()
        }
    }
}
