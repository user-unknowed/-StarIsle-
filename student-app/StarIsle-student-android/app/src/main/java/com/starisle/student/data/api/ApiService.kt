package com.starisle.student.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

/**
 * 后端通用 API 接口占位（原 Dart 工程未定义具体后端调用，
 * 此处保留接口骨架，后续对接后端时扩展具体端点）。
 */
interface ApiService

/**
 * Retrofit 简单工厂，方便按 baseUrl 创建不同服务实例。
 */
object RetrofitFactory {

    /**
     * 统一使用带 Kotlin 反射适配器的 Moshi，
     * 否则 Kotlin data class 在序列化时会抛 "Cannot serialize Kotlin type"。
     */
    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private fun okHttpClient() = okhttp3.OkHttpClient.Builder()
        .addInterceptor(
            okhttp3.logging.HttpLoggingInterceptor().apply {
                level = okhttp3.logging.HttpLoggingInterceptor.Level.BASIC
            }
        )
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun createAi(baseUrl: String): AiApiService {
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient())
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(AiApiService::class.java)
    }

    /**
     * 创建本地模型对话服务。
     *
     * 本地模型推理（1.5B，CPU/GPU）耗时明显高于云端 API，
     * 读超时放宽到 120 秒，避免长回复被提前中断。
     */
    fun createLocalChat(baseUrl: String): LocalChatApiService {
        val client = okHttpClient().newBuilder()
            .readTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(LocalChatApiService::class.java)
    }
}
