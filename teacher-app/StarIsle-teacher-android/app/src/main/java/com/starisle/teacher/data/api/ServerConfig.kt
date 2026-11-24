package com.starisle.teacher.data.api

import android.content.Context
import com.starisle.teacher.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * 服务地址配置（三端统一：默认指向星屿 Java 网关 8081，路径前缀 /api/）。
 *
 * - 默认值来自构建参数：[BuildConfig.DEFAULT_API_BASE_URL]
 * - 运行时可覆盖：写入 SharedPreferences，立即生效（配合 [ServerHostInterceptor]）
 */
object ServerConfig {

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    /** 构建期默认网关地址，形如 http://10.0.2.2:8081/api/ */
    val DEFAULT_API_BASE_URL: String = BuildConfig.DEFAULT_API_BASE_URL

    private const val PREFS_NAME = "starisle_server_settings"
    private const val KEY_API_BASE_URL = "api_base_url"

    /** 当前生效的网关地址（保证以 /api/ 结尾） */
    fun apiBaseUrl(context: Context): String {
        val saved = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_API_BASE_URL, null)
        return (saved?.takeIf { it.isNotBlank() } ?: DEFAULT_API_BASE_URL).normalizeApiBase()
    }

    /** 覆盖网关地址；传空串恢复默认。输入 http://host:8081 会自动补 /api/ */
    fun overrideApiBaseUrl(context: Context, newUrl: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_API_BASE_URL, newUrl.trim())
            .apply()
    }

    /**
     * 测试指定网关地址是否可达（GET /health）
     */
    suspend fun testApiConnection(url: String): ConnectionResult =
        withContext(Dispatchers.IO) {
            val base = url.trim().normalizeApiBase()
            val healthUrl = base.removeSuffix("/api/").removeSuffix("/api") + "/health"
            val start = System.currentTimeMillis()
            try {
                val request = Request.Builder().url(healthUrl).get().build()
                client.newCall(request).execute().use { response ->
                    val elapsed = System.currentTimeMillis() - start
                    if (response.isSuccessful) ConnectionResult.Connected(elapsed)
                    else ConnectionResult.HttpError(response.code, elapsed)
                }
            } catch (e: Exception) {
                ConnectionResult.Unreachable(e.message ?: "网络不可达")
            }
        }

    /** 保证以 /api/ 结尾（Retrofit 要求 baseUrl 以 '/' 结尾，接口方法不再以 '/' 开头） */
    private fun String.normalizeApiBase(): String {
        val trimmed = trim().trimEnd('/')
        return if (trimmed.endsWith("/api")) "$trimmed/" else "$trimmed/api/"
    }
}

sealed class ConnectionResult {
    data class Connected(val elapsedMs: Long) : ConnectionResult()
    data class HttpError(val code: Int, val elapsedMs: Long) : ConnectionResult()
    data class Unreachable(val detail: String) : ConnectionResult()
}
