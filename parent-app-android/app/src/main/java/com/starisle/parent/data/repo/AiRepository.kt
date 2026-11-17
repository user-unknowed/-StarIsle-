package com.starisle.parent.data.repo

import com.starisle.parent.data.api.AiApiService
import com.starisle.parent.data.api.ChatRequest
import com.starisle.parent.data.api.TopicCard
import com.starisle.parent.data.models.ChatMessage
import com.starisle.parent.data.models.CrisisReportRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI「大星」仓库：真实调用网关 /api/v1/chat 并解包 {code,message,data}。
 *
 * 不做 mock 降级：请求失败或模型空回复时如实返回错误，避免掩盖链路故障。
 */
@Singleton
class AiRepository @Inject constructor(
    private val api: AiApiService
) {

    /** 静态推荐话题（与 parent-app ParentChat.tsx 一致） */
    val parentTopics: List<TopicCard> = listOf(
        TopicCard("t1", "孩子不愿意跟我说话怎么办", "沟通"),
        TopicCard("t2", "怎么判断孩子是否需要专业帮助", "评估"),
        TopicCard("t3", "青春期孩子情绪波动正常吗", "情绪"),
        TopicCard("t4", "发现孩子自伤怎么办", "危机"),
        TopicCard("t5", "如何跟孩子聊心理话题", "沟通"),
        TopicCard("t6", "家长自己压力大怎么调节", "自助")
    )

    /** 危机关键词，命中则直接返回风险提示，不再请求后端 */
    private val crisisKeywords = listOf("自伤", "自杀", "不想活", "想死", "结束生命")

    /**
     * 拉取对话历史：网关 data 是 {user_id, limit, messages} 对象。
     * 失败返回空列表，不伪造历史。
     */
    suspend fun fetchHistory(userId: String): List<ChatMessage> = runCatching {
        val envelope = api.getHistory(userId)
        val code = envelope.code ?: 200
        if (code !in 200..299) return@runCatching emptyList()
        envelope.data?.messages.orEmpty().mapIndexed { index, item ->
            ChatMessage(
                id = "history-$index-${System.currentTimeMillis()}",
                userId = userId,
                content = item.content.orEmpty(),
                role = item.role ?: "assistant",
                timestamp = item.timestamp.orEmpty()
            )
        }
    }.getOrDefault(emptyList())

    /**
     * 发送一条家长消息，返回 assistant 真实回复。
     * 命中危机关键词时直接返回危机提示。
     */
    suspend fun sendMessage(
        userId: String,
        message: String
    ): ChatResult {
        if (message.length > 2000) {
            return ChatResult.Error("消息长度不能超过2000字")
        }
        if (crisisKeywords.any { message.contains(it) }) {
            return ChatResult.Crisis(
                reply = "听到您的描述，大星非常关心您和孩子的安全。请立即拨打危机热线获取专业指导。"
            )
        }
        return try {
            val envelope = api.sendMessage(ChatRequest(userId, message))
            val code = envelope.code ?: 200
            val data = envelope.data
            val reply = data?.response
            when {
                code !in 200..299 ->
                    ChatResult.Error(envelope.message ?: "请求失败（code=$code）")

                // ai-engine 内部异常时仍返回 HTTP 200，但 model 为 unknown、正文是兜底话术
                data?.model == ENGINE_FALLBACK_MODEL ->
                    ChatResult.Error("ai-engine 返回兜底回复（模型未就绪或推理超时），请稍后重试")

                reply.isNullOrBlank() ->
                    ChatResult.Error("模型未返回内容（riskLevel=${data?.riskLevel ?: "unknown"}）")

                else -> ChatResult.Success(reply, data?.riskLevel)
            }
        } catch (e: Exception) {
            ChatResult.Error(e.message ?: e.javaClass.simpleName)
        }
    }

    /** 上报危机事件，失败不影响主流程 */
    suspend fun reportCrisis(userId: String, riskLevel: String, triggerType: String? = "chat") {
        runCatching {
            api.reportCrisis(CrisisReportRequest(userId, riskLevel, triggerType))
        }
    }

    sealed class ChatResult {
        data class Success(val reply: String, val riskLevel: String?) : ChatResult()
        data class Crisis(val reply: String) : ChatResult()
        data class Error(val message: String) : ChatResult()
    }

    private companion object {
        /** ai-engine 降级回复时返回的 model 标记 */
        const val ENGINE_FALLBACK_MODEL = "unknown"
    }
}
