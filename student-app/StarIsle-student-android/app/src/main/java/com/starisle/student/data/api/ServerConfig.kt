package com.starisle.student.data.api

import android.content.Context

/**
 * AI 服务地址配置。
 *
 * 默认指向开发机上的本地模型服务（ai-engine，监听 8000 端口）。
 * 手机与开发机需处于同一局域网，真机无法访问 localhost，
 * 因此这里使用局域网 IP，并允许在应用内覆盖（见 [overrideBaseUrl]）。
 */
object ServerConfig {

    /** 开发机局域网地址（随网络环境变化时可在「我的 - AI 服务地址」中修改） */
    const val DEFAULT_AI_BASE_URL: String = "http://192.168.31.122:8000/"

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
