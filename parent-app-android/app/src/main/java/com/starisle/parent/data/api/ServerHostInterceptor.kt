package com.starisle.parent.data.api

import android.content.Context
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response

/**
 * 运行时服务地址重写。
 *
 * Retrofit 的 baseUrl 固定为构建默认值（[ServerConfig.DEFAULT_API_BASE_URL]），
 * 用户在「我的 - 服务地址」修改后，由本拦截器把仍发往默认 host/port 的请求
 * 改写到最新地址，无需重启应用或重建 Retrofit。
 */
class ServerHostInterceptor(
    private val context: Context,
) : Interceptor {

    private val defaultBase = ServerConfig.DEFAULT_API_BASE_URL.toHttpUrlOrNull()

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val original = defaultBase ?: return chain.proceed(request)
        val target = ServerConfig.apiBaseUrl(context).toHttpUrlOrNull()
            ?: return chain.proceed(request)

        val url = request.url
        if (!url.host.equals(original.host, ignoreCase = true) || url.port != original.port) {
            return chain.proceed(request)
        }
        if (url.host.equals(target.host, ignoreCase = true) && url.port == target.port) {
            return chain.proceed(request)
        }
        val newUrl = url.newBuilder()
            .scheme(target.scheme)
            .host(target.host)
            .port(target.port)
            .build()
        return chain.proceed(request.newBuilder().url(newUrl).build())
    }
}
