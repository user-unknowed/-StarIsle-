package com.starisle.teacher.di

import android.content.Context
import com.starisle.teacher.data.api.SiliconFlowApiService
import com.starisle.teacher.data.api.ZhipuApiService
import com.starisle.teacher.data.db.MemoryDatabase
import com.starisle.teacher.data.db.MemoryStorageService
import com.starisle.teacher.data.repo.AiRepository
import com.starisle.teacher.data.repo.MemoryRepository
import com.starisle.teacher.data.repo.TeacherRepository
import com.starisle.teacher.util.MaintenanceScheduler
import com.starisle.teacher.util.StorageMonitor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * 全局 Hilt 依赖注入模块。
 *
 * 提供：OkHttp / Retrofit（智谱 + SiliconFlow）/ Room 数据库 / Storage 服务 / Scheduler / Monitor / Repository。
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
        .build()

    /**
     * 智谱 Retrofit 实例。
     */
    @Provides
    @Singleton
    @ZhipuRetrofit
    fun provideZhipuRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("https://open.bigmodel.cn/api/paas/v4/")
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()

    /**
     * SiliconFlow Retrofit 实例。
     */
    @Provides
    @Singleton
    @SiliconFlowRetrofit
    fun provideSiliconFlowRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("https://api.siliconflow.cn/v1/")
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()

    @Provides
    @Singleton
    fun provideZhipuApi(@ZhipuRetrofit retrofit: Retrofit): ZhipuApiService =
        retrofit.create(ZhipuApiService::class.java)

    @Provides
    @Singleton
    fun provideSiliconFlowApi(@SiliconFlowRetrofit retrofit: Retrofit): SiliconFlowApiService =
        retrofit.create(SiliconFlowApiService::class.java)

    @Provides
    @Singleton
    fun provideMemoryDatabase(@ApplicationContext context: Context): MemoryDatabase =
        MemoryDatabase.get(context)

    @Provides
    @Singleton
    fun provideMemoryStorageService(
        @ApplicationContext context: Context,
        database: MemoryDatabase,
    ): MemoryStorageService = MemoryStorageService(context, database)

    @Provides
    @Singleton
    fun provideMaintenanceScheduler(
        @ApplicationContext context: Context,
        storage: MemoryStorageService,
    ): MaintenanceScheduler = MaintenanceScheduler(context, storage)

    @Provides
    @Singleton
    fun provideStorageMonitor(storage: MemoryStorageService): StorageMonitor =
        StorageMonitor(storage)

    @Provides
    @Singleton
    fun provideTeacherRepository(): TeacherRepository = TeacherRepository()

    @Provides
    @Singleton
    fun provideMemoryRepository(storage: MemoryStorageService): MemoryRepository =
        MemoryRepository(storage)

    @Provides
    @Singleton
    fun provideAiRepository(
        zhipu: ZhipuApiService,
        siliconFlow: SiliconFlowApiService,
    ): AiRepository = AiRepository(zhipu, siliconFlow)

    @javax.inject.Qualifier
    @Retention(AnnotationRetention.BINARY)
    annotation class ZhipuRetrofit

    @javax.inject.Qualifier
    @Retention(AnnotationRetention.BINARY)
    annotation class SiliconFlowRetrofit
}
