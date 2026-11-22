package com.starisle.parent.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.starisle.parent.data.api.AiApiService
import com.starisle.parent.data.api.ParentApiService
import com.starisle.parent.data.api.ServerConfig
import com.starisle.parent.data.api.ServerHostInterceptor
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

    /**
     * 网关基地址：构建默认值（三端统一 8081），运行时可在「我的 - 服务地址」修改。
     * 路径必须以 /api/ 结尾，接口方法不得再以 / 开头，否则会覆盖该 path 段。
     */
    private val BASE_URL: String = ServerConfig.DEFAULT_API_BASE_URL
    private const val DATASTORE_NAME = "starisle_parent_prefs"

    /** 登录 Token 的 DataStore key（与 AuthViewModel 写入的 key 名保持一致） */
    private val TOKEN_KEY = stringPreferencesKey("token")

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
    fun provideOkHttpClient(
        dataStore: DataStore<Preferences>,
        @ApplicationContext context: Context,
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        // 本地 SFT 模型单次推理约 20-30s，读超时必须放宽，否则必然超时
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        // 鉴权拦截器：从 DataStore 读取登录 Token 并注入 Authorization
        .addInterceptor(Interceptor { chain ->
            val token = runBlocking { dataStore.data.first()[TOKEN_KEY] }
            val request = if (token.isNullOrBlank()) {
                chain.request()
            } else {
                chain.request().newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            }
            chain.proceed(request)
        })
        .addInterceptor(ServerHostInterceptor(context))
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
