package com.starisle.parent.data.repo

import com.starisle.parent.data.api.AiApiService
import com.starisle.parent.data.api.BindChildRequest
import com.starisle.parent.data.api.ChatRequest
import com.starisle.parent.data.api.ChatResponse
import com.starisle.parent.data.api.TopicCard
import com.starisle.parent.data.models.ChatMessage
import com.starisle.parent.data.models.CrisisReportRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI 「大星」仓库。
 *
 * 兼容两套源：
 * - parent-app/src/store/parentStore.ts：sendChatMessage 模拟回执
 * - web-frontend/src/services/api.ts chatApi：真实 /v1/chat 调用 + 风险上报
 *
 * 网络不可用时降级到 mock 回复池，与 web-frontend 行为一致。
 */
@Singleton
class AiRepository @Inject constructor(
    private val api: AiApiService
) {

    /** 后端不可用时的示例回复池 */
    private val mockReplies = listOf(
        "大星理解您的担心。咱们慢慢来，先听听孩子的想法呢。",
        "您是很用心的家长。慢慢来，多给孩子安全感就好。",
        "保持稳定的家庭氛围。若您感觉孩子状态让您担忧，可寻求专业心理支持。",
        "请先确保孩子安全。可拨打 12355 或 400-161-9995 获取专业指导。咱们一起面对，慢慢来。"
    )

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

    suspend fun fetchHistory(userId: String): List<ChatMessage> = runCatching {
        api.getHistory(userId)
    }.getOrDefault(emptyList())

    /**
     * 发送一条家长消息，返回 assistant 回复（含降级 mock）。
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
        return runCatching {
            val resp: ChatResponse = api.sendMessage(ChatRequest(userId, message))
            if (resp.response.isNullOrEmpty()) {
                ChatResult.Fallback(mockReplies.random())
            } else {
                ChatResult.Success(resp.response!!, resp.riskLevel)
            }
        }.getOrElse {
            // 网络错误降级
            ChatResult.Fallback(mockReplies.random())
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
        data class Fallback(val reply: String) : ChatResult()
        data class Error(val message: String) : ChatResult()
    }
}
