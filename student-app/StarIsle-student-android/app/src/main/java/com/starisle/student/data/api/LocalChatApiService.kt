package com.starisle.student.data.api

import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Url

/**
 * 本地模型对话接口（ai-engine FastAPI 的 /chat 端点）。
 *
 * 与外部供应商（智谱 / SiliconFlow）的 OpenAI 兼容格式不同，
 * 这里对接的是本地 SFT 微调模型的对话服务契约。
 * 使用完整 URL 调用，便于用户在应用内修改服务地址后即时生效。
 */
interface LocalChatApiService {

    @POST
    suspend fun chat(
        @Url url: String,
        @Body body: LocalChatRequest,
    ): LocalChatResponse

    /**
     * OpenAI 兼容补全（ai-engine `/v1/chat/completions`）。
     * 供文章生成、摘要、风格转换、主题分析等写作功能复用本地模型，
     * 由本地客户端提供更宽松的读超时。
     */
    @POST
    suspend fun chatCompletion(
        @Url url: String,
        @Body body: ChatCompletionRequest,
    ): ChatCompletionResponse
}
