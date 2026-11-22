package com.starisle.student.data.api

import android.content.Context
import com.starisle.student.BuildConfig

/**
 * AI 服务地址配置（三端统一：默认地址由构建参数注入，运行时可改）。
 *
 * 默认指向星屿本地模型服务（ai-engine，8000 端口），
 * 手机与开发机需处于同一局域网，真机无法访问 localhost，
 * 因此默认使用模拟器映射地址，并允许在应用内覆盖（见 [overrideBaseUrl]）。
 */
object ServerConfig {

    /** 构建期默认地址（默认 http://10.0.2.2:8000/，可用 -PstarIsleAiBaseUrl 覆盖） */
    val DEFAULT_AI_BASE_URL: String = BuildConfig.DEFAULT_AI_BASE_URL

    private const val PREFS_NAME = "starisle_settings"
    private const val KEY_AI_BASE_URL = "ai_base_url"

    /** 读取当前生效的 AI 服务地址，未配置时返回默认值 */
    fun aiBaseUrl(context: Context): String {
        val saved = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_AI_BASE_URL, null)
        return (saved?.takeIf { it.isNotBlank() } ?: DEFAULT_AI_BASE_URL).ensureTrailingSlash()
    }

    /** 覆盖 AI 服务地址，传空字符串表示恢复默认值 */
    fun overrideBaseUrl(context: Context, newUrl: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_AI_BASE_URL, newUrl.trim())
            .apply()
    }

    /** Retrofit 要求 baseUrl 以 '/' 结尾 */
    private fun String.ensureTrailingSlash(): String = if (endsWith("/")) this else "$this/"
}
