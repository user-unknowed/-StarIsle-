package com.starisle.student.data.api

import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/**
 * 后端通用 API 接口占位（原 Dart 工程未定义具体后端调用，
 * 此处保留接口骨架，后续对接后端时扩展具体端点）。
 */
interface ApiService

/**
 * Retrofit 简单工厂，方便按 baseUrl 创建不同 AI 服务实例。
 */
object RetrofitFactory {
    fun createAi(baseUrl: String): AiApiService {
        val client = okhttp3.OkHttpClient.Builder()
            .addInterceptor(
                okhttp3.logging.HttpLoggingInterceptor().apply {
                    level = okhttp3.logging.HttpLoggingInterceptor.Level.BASIC
                }
            )
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(AiApiService::class.java)
    }
}
