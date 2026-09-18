package com.starisle.student.data.api

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Url

/**
 * AI 服务 Retrofit 接口。
 *
 * 同时兼容智谱 GLM 与 SiliconFlow（二者均遵循 OpenAI 兼容的 /chat/completions 格式），
 * 通过 [baseUrl] 参数在运行时切换端点。
 */
interface AiApiService {

    @POST
    suspend fun chatCompletion(
        @Url baseUrl: String,
        @Header("Authorization") authHeader: String,
        @Body body: ChatCompletionRequest,
    ): ChatCompletionResponse
}
