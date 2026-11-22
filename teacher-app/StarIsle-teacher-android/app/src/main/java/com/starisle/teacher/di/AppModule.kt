package com.starisle.teacher.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.starisle.teacher.data.api.GatewayApiService
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
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
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

    // ===== 网关（星屿 Spring Boot，8081）相关依赖 =====

    /** 网关基地址：模拟器用 10.0.2.2 映射开发机；真机需改为开发机局域网 IP。 */
    private const val GATEWAY_BASE_URL = "http://10.0.2.2:8081/api/"

    /** 教师端会话 DataStore 名称与 token key（与 TeacherSessionStore 保持一致）。 */
    private const val TEACHER_PREFS_NAME = "starisle_teacher_prefs"
    private val TEACHER_TOKEN_KEY = stringPreferencesKey("token")

    /** 教师端会话 DataStore。 */
    private val Context.teacherDataStore: DataStore<Preferences> by preferencesDataStore(TEACHER_PREFS_NAME)

    /**
     * Moshi：KotlinJsonAdapterFactory 反射适配，无需 codegen。
     */
    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    /**
     * 网关专用 OkHttp：注入 Authorization: Bearer <token>。
     * 独立实例，避免把网关 JWT 发给智谱/SiliconFlow 等第三方域名。
     */
    @Provides
    @Singleton
    @GatewayOkHttp
    fun provideGatewayOkHttp(dataStore: DataStore<Preferences>): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        // 本地 SFT 模型单次推理约 20-30s，读超时放宽
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(Interceptor { chain ->
            val token = runBlocking { dataStore.data.first()[TEACHER_TOKEN_KEY] }
            val request = if (token.isNullOrBlank()) {
                chain.request()
            } else {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            }
            chain.proceed(request)
        })
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
        .build()

    /** 网关 Retrofit。 */
    @Provides
    @Singleton
    @GatewayRetrofit
    fun provideGatewayRetrofit(
        @GatewayOkHttp client: OkHttpClient,
        moshi: Moshi,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(GATEWAY_BASE_URL)
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    /** 网关 API Service。 */
    @Provides
    @Singleton
    fun provideGatewayApiService(@GatewayRetrofit retrofit: Retrofit): GatewayApiService =
        retrofit.create(GatewayApiService::class.java)

    /** 教师端会话 DataStore。 */
    @Provides
    @Singleton
    fun provideTeacherDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.teacherDataStore

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

    @javax.inject.Qualifier
    @Retention(AnnotationRetention.BINARY)
    annotation class GatewayOkHttp

    @javax.inject.Qualifier
    @Retention(AnnotationRetention.BINARY)
    annotation class GatewayRetrofit
}
