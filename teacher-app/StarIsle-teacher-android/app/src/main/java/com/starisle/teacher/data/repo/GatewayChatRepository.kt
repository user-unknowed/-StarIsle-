package com.starisle.teacher.data.repo

import com.starisle.teacher.data.api.GatewayApiService
import com.starisle.teacher.data.models.GatewayChatRequest
import com.starisle.teacher.data.models.GatewayChatResponse
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 教师端 AI 对话仓库：经网关调用真实模型并解包响应。
 */
@Singleton
class GatewayChatRepository @Inject constructor(
    private val api: GatewayApiService,
) {

    suspend fun sendMessage(request: GatewayChatRequest): Result<GatewayChatResponse> = runCatching {
        val envelope = api.sendMessage(request)
        val code = envelope.code ?: 200
        if (code !in 200..299) {
            throw IllegalStateException(envelope.message ?: "对话失败（code=$code）")
        }
        val data = envelope.data ?: throw IllegalStateException("对话响应缺少 data")
        if (data.response.isNullOrBlank()) {
            throw IllegalStateException("模型返回内容为空，请重试")
        }
        if (data.model.isNullOrBlank() || data.model == "unknown") {
            throw IllegalStateException("模型服务暂不可用，请稍后重试")
        }
        data
    }
}
