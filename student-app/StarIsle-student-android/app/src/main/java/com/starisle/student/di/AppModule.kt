package com.starisle.student.di

import android.content.Context
import com.starisle.student.data.api.AiApiService
import com.starisle.student.data.api.RetrofitFactory
import com.starisle.student.data.db.MemoryDao
import com.starisle.student.data.db.MemoryDatabase
import com.starisle.student.data.db.MemoryStorageService
import com.starisle.student.data.repo.AiRepository
import com.starisle.student.data.repo.MemoryRepository
import com.starisle.student.util.MaintenanceScheduler
import com.starisle.student.util.StorageMonitor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt 依赖注入模块。
 *
 * 提供：
 * - [AiApiService]：基于 Retrofit 的 AI 接口（默认指向智谱）
 * - [AiRepository]：AI 仓储
 * - [MemoryDao] / [MemoryStorageService] / [MemoryRepository]：本地存储链
 * - [MaintenanceScheduler] / [StorageMonitor]：后台维护与监控
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAiApiService(): AiApiService =
        RetrofitFactory.createAi("https://open.bigmodel.cn/api/paas/v4/")

    @Provides
    @Singleton
    fun provideAiRepository(apiService: AiApiService): AiRepository =
        AiRepository(apiService)

    @Provides
    @Singleton
    fun provideMemoryDatabase(@ApplicationContext context: Context): MemoryDatabase =
        MemoryDatabase.getInstance(context)

    @Provides
    @Singleton
    fun provideMemoryDao(db: MemoryDatabase): MemoryDao = db.memoryDao()

    @Provides
    @Singleton
    fun provideMemoryStorageService(
        @ApplicationContext context: Context,
    ): MemoryStorageService = MemoryStorageService(context)

    @Provides
    @Singleton
    fun provideMemoryRepository(
        storageService: MemoryStorageService,
    ): MemoryRepository = MemoryRepository(storageService)

    @Provides
    @Singleton
    fun provideMaintenanceScheduler(
        @ApplicationContext context: Context,
        storageService: MemoryStorageService,
    ): MaintenanceScheduler = MaintenanceScheduler(context, storageService)

    @Provides
    @Singleton
    fun provideStorageMonitor(
        storageService: MemoryStorageService,
    ): StorageMonitor = StorageMonitor(storageService)
}
