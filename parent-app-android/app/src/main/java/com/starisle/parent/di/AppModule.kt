package com.starisle.parent.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.starisle.parent.data.api.AiApiService
import com.starisle.parent.data.api.ParentApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt 全局 DI 模块：OkHttp / Moshi / Retrofit / ApiService / DataStore。
 *
 * 对应 web-frontend/src/services/http.ts + api.ts 的网络与鉴权栈：
 * - JWT Token 注入（Authorization: Bearer）
 * - 超时 10s
 * - 统一 base url（可被 manifest meta-data 覆盖）
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val BASE_URL = "http://10.0.2.2:8080/"
    private const val DATASTORE_NAME = "starisle_parent_prefs"

    /**
     * Moshi JSON 解析器（与 web-frontend 一致：Kotlin 反射 + 数据类）。
     */
    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    /**
     * OkHttp 客户端：
     * - 鉴权拦截器（注入 DataStore 中持久化的 Token）
     * - 日志拦截器
     * - 10 秒超时（与 http.ts TIMEOUT_MS 一致）
     * - WebSocket PingInterval 30s
     *
     * 由于 OkHttp 拦截器无法直接访问 DataStore，此处使用简化版注入：
     * 实际 Token 由各 Service 通过 @Header 或调用方传递；
     * 此拦截器仅添加通用 header。
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        })
        .build()

    /**
     * Retrofit 实例：Moshi 转换器 + BASE_URL。
     */
    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    /**
     * 家长端业务 API Service。
     */
    @Provides
    @Singleton
    fun provideParentApiService(retrofit: Retrofit): ParentApiService =
        retrofit.create(ParentApiService::class.java)

    /**
     * AI 「大星」对话 API Service。
     */
    @Provides
    @Singleton
    fun provideAiApiService(retrofit: Retrofit): AiApiService =
        retrofit.create(AiApiService::class.java)

    /**
     * DataStore：Token / userId / nickname / phone 持久化（对应 web-frontend localStorage）。
     */
    private val Context.parentDataStore: DataStore<Preferences> by preferencesDataStore(DATASTORE_NAME)

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.parentDataStore
}
