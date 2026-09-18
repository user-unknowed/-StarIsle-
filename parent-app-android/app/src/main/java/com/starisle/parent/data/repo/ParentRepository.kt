package com.starisle.parent.data.repo

import com.starisle.parent.data.api.AuthorizeChildRequest
import com.starisle.parent.data.api.BindChildRequest
import com.starisle.parent.data.api.ParentApiService
import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.data.models.EmergencyAlert
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.data.models.KnowledgeArticle
import com.starisle.parent.data.models.MoodRecord
import com.starisle.parent.data.models.MoodSummary
import com.starisle.parent.data.models.MoodTrendData
import com.starisle.parent.data.models.NotificationSettings
import com.starisle.parent.data.models.ParentUser
import kotlinx.coroutines.delay
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 家长端仓库，聚合 parent-app 与 web-frontend 两套 Zustand store 的状态。
 *
 * 网络不可用时降级到 mock 数据（与 web-frontend isDegradable 行为一致）。
 */
@Singleton
class ParentRepository @Inject constructor(
    private val api: ParentApiService
) {

    // ---------- Mock 数据（与 parentStore.ts/web parentStore.ts 一致） ----------

    val mockParentProfile = ParentUser(
        id = "parent1",
        username = "parent1",
        nickname = "王爸爸",
        phone = "138****8888",
        createdAt = "2026-01-01T00:00:00Z"
    )

    val mockChildren = listOf(
        ChildBinding(
            bindingId = "binding_1",
            studentId = "student1",
            studentNickname = "小明同学",
            authorized = true,
            createdAt = "2026-01-05T00:00:00Z"
        ),
        ChildBinding(
            bindingId = "binding_2",
            studentId = "s3",
            studentNickname = "小刚同学",
            authorized = true,
            createdAt = "2026-01-10T00:00:00Z"
        )
    )

    val mockChildMood = listOf(
        MoodRecord("cm1", "student1", 3, listOf("学习压力"), "2026-07-08", "2026-07-08T08:00:00Z"),
        MoodRecord("cm2", "student1", 2, listOf("考试焦虑"), "2026-07-09", "2026-07-09T08:00:00Z"),
        MoodRecord("cm3", "student1", 2, listOf("人际"), "2026-07-10", "2026-07-10T08:00:00Z"),
        MoodRecord("cm4", "student1", 3, listOf("平静"), "2026-07-11", "2026-07-11T08:00:00Z"),
        MoodRecord("cm5", "student1", 4, listOf("开心"), "2026-07-12", "2026-07-12T08:00:00Z"),
        MoodRecord("cm6", "student1", 3, listOf("一般"), "2026-07-13", "2026-07-13T08:00:00Z"),
        MoodRecord("cm7", "student1", 2, listOf("睡眠"), "2026-07-14", "2026-07-14T08:00:00Z")
    )

    val mockMoodTrend = listOf(
        MoodTrendData("2026-07-09", 3, listOf("学习压力")),
        MoodTrendData("2026-07-10", 4, listOf("平静")),
        MoodTrendData("2026-07-11", 2, listOf("考试焦虑")),
        MoodTrendData("2026-07-12", 3, listOf("人际")),
        MoodTrendData("2026-07-13", 5, listOf("开心")),
        MoodTrendData("2026-07-14", 4, listOf("平静")),
        MoodTrendData("2026-07-15", 4, listOf("学习压力"))
    )

    val mockMoodSummary = MoodSummary(
        trend = "stable",
        description = "最近一周情绪较为平稳，整体状态不错。",
        aiSuggestion = "孩子最近可能面临一些学习压力，可以找个轻松的时间聊聊，不一定非要聊学习。多关注孩子的兴趣爱好，给予适当的鼓励和支持。",
        tagDistribution = mapOf(
            "学习压力" to 3, "平静" to 2, "考试焦虑" to 1,
            "人际" to 1, "开心" to 1
        ),
        checkinCalendar = listOf(
            "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12",
            "2026-07-13", "2026-07-14", "2026-07-15"
        )
    )

    val mockKnowledgeArticles = listOf(
        KnowledgeArticle("1", "青春期孩子的心理特点", "青春期心理",
            "了解12-18岁孩子的心理发展规律，帮助家长更好地理解孩子",
            "青春期是孩子从儿童到成人的过渡阶段，生理和心理都会发生巨大变化。这个阶段的孩子开始关注自我认同，渴望独立，但同时也需要家长的支持和理解。",
            3, "2026-01-01T00:00:00Z"),
        KnowledgeArticle("2", "如何与青春期孩子有效沟通", "亲子沟通",
            "掌握与青春期孩子沟通的技巧，建立良好的亲子关系",
            "与青春期孩子沟通需要耐心和技巧。要尊重孩子的隐私，多倾听少说教，用平等的姿态与孩子交流。",
            4, "2026-01-02T00:00:00Z"),
        KnowledgeArticle("3", "发现孩子情绪低落时该怎么做", "家庭应对",
            "实用指南：当孩子情绪低落时，家长可以做什么",
            "当发现孩子情绪低落时，不要急于追问原因，先给予温暖的陪伴。告诉孩子\"无论发生什么，爸爸妈妈都在你身边\"。",
            5, "2026-01-03T00:00:00Z"),
        KnowledgeArticle("4", "家长自我关怀指南", "家长关怀",
            "照顾孩子之前，先照顾好自己",
            "家长的情绪状态直接影响家庭氛围。学会自我关怀，保持良好的心态，才能更好地支持孩子。",
            4, "2026-01-04T00:00:00Z"),
        KnowledgeArticle("5", "如何利用星屿了解孩子", "使用指南",
            "星屿家长端使用攻略，更好地关注孩子心理健康",
            "星屿家长端提供情绪概览、趋势分析等功能，帮助家长在尊重孩子隐私的前提下了解孩子的心理状态。",
            3, "2026-01-05T00:00:00Z")
    )

    val mockEmergencyResources = listOf(
        EmergencyResource(id = "res_1", type = "hotline",
            name = "12355 青少年服务热线", phone = "12355",
            title = "12355 青少年服务热线", content = "全国青少年心理咨询服务热线，提供 24 小时心理疏导",
            contact = "青少年服务台"),
        EmergencyResource(id = "res_2", type = "hotline",
            name = "希望24热线", phone = "400-161-9995",
            title = "希望24热线", content = "全国心理危机干预热线，专业志愿者 24 小时值守",
            contact = "危机干预中心"),
        EmergencyResource(id = "res_3", type = "hospital",
            name = "市精神卫生中心", phone = "021-12345678", address = "健康路456号", distance = "4.8km",
            title = "市精神卫生中心", content = "提供专业心理评估与诊疗服务，可预约青少年门诊",
            contact = "门诊咨询"),
        EmergencyResource(id = "res_4", type = "hospital",
            name = "市第一人民医院", phone = "021-76543210", address = "市中心大道123号", distance = "2.5km",
            title = "市第一人民医院", content = "提供急诊与心理卫生服务",
            contact = "急诊科"),
        EmergencyResource(id = "res_5", type = "teacher",
            name = "张老师（心理老师）", phone = "13900139000",
            title = "张老师（心理老师）", content = "学校专业心理辅导老师",
            contact = "学校心理辅导室"),
        EmergencyResource(id = "res_6", type = "community",
            name = "社区心理服务站", phone = "021-87654321",
            title = "社区心理服务站", content = "就近提供免费心理咨询服务，支持线下预约",
            contact = "社区服务中心")
    )

    val mockAlerts = listOf(
        EmergencyAlert(
            alertId = "alert_1",
            studentId = "student1",
            level = "orange",
            reason = "连续 3 天心情低落，检测到「压力」「焦虑」等关键词",
            createdAt = "2026-07-14T10:00:00Z",
            confirmed = false
        )
    )

    val defaultNotificationSettings = NotificationSettings()

    // ---------- API 调用（带 mock 降级） ----------

    suspend fun fetchProfile(): Result<ParentUser> = runCatching {
        delay(300)
        runCatching { api.getMe() }.getOrElse { mockParentProfile }
    }

    suspend fun fetchChildren(): Result<List<ChildBinding>> = runCatching {
        delay(300)
        runCatching { api.listChildren() }.getOrElse { mockChildren }
    }

    suspend fun fetchChildMood(bindingId: String, days: Int = 7): Result<List<MoodRecord>> = runCatching {
        delay(300)
        runCatching { api.getChildMood(bindingId, days) }.getOrElse { mockChildMood }
    }

    suspend fun bindChild(request: BindChildRequest): Result<ChildBinding> = runCatching {
        runCatching { api.bindStudent(request) }.getOrElse {
            ChildBinding(
                bindingId = "binding_${System.currentTimeMillis()}",
                studentId = request.studentId,
                studentNickname = request.studentNickname ?: "新绑定孩子",
                authorized = false,
                createdAt = java.time.Instant.now().toString()
            )
        }
    }

    suspend fun authorizeChild(bindingId: String): Result<ChildBinding> = runCatching {
        runCatching { api.authorizeChild(bindingId, AuthorizeChildRequest()) }.getOrElse {
            // mock：本地标记为已授权由 ViewModel 处理
            throw IllegalStateException("mock authorize")
        }
    }

    suspend fun unbindChild(bindingId: String): Result<Unit> = runCatching {
        runCatching { api.unbindChild(bindingId) }
    }

    suspend fun fetchAlerts(): Result<List<EmergencyAlert>> = runCatching {
        delay(300)
        runCatching { api.getEmergencyAlert() }.getOrNull()?.let { listOf(it) } ?: mockAlerts
    }

    suspend fun confirmAlert(alertId: String): Result<EmergencyAlert> = runCatching {
        runCatching { api.confirmAlert(alertId) }.getOrElse {
            EmergencyAlert(
                alertId = alertId,
                studentId = "",
                level = "orange",
                reason = "",
                createdAt = "",
                confirmed = true,
                confirmedAt = java.time.Instant.now().toString(),
                status = "confirmed"
            )
        }
    }

    suspend fun fetchResources(type: String? = null): Result<List<EmergencyResource>> = runCatching {
        delay(300)
        val data = runCatching {
            if (type != null) api.getResourcesByType(type) else api.getEmergencyResources()
        }.getOrNull() ?: mockEmergencyResources
        if (type != null) data.filter { it.type == type } else data
    }

    // ---------- parent-app 旧版 store 行为（mock 数据延时加载） ----------

    suspend fun fetchMoodTrend(studentId: String, days: Int): Result<List<MoodTrendData>> = runCatching {
        delay(500)
        mockMoodTrend
    }

    suspend fun fetchMoodSummary(studentId: String): Result<MoodSummary> = runCatching {
        delay(500)
        mockMoodSummary
    }

    suspend fun fetchKnowledgeArticles(): Result<List<KnowledgeArticle>> = runCatching {
        delay(500)
        mockKnowledgeArticles
    }

    suspend fun fetchNotificationSettings(): Result<NotificationSettings> = runCatching {
        delay(300)
        defaultNotificationSettings
    }

    suspend fun updateNotificationSettings(settings: NotificationSettings): Result<NotificationSettings> = runCatching {
        delay(300)
        settings
    }

    /** 模拟紧急预警，当前为 null */
    suspend fun fetchEmergencyAlert(parentId: String): Result<EmergencyAlert?> = runCatching {
        delay(500)
        null
    }

    /** 确认紧急预警回执（旧版） */
    suspend fun confirmEmergencyAlert(alertId: String): Result<EmergencyAlert?> = runCatching {
        delay(300)
        null
    }

    /** 超时升级检查（红色告警超 2 小时未确认） */
    fun checkAlertTimeout(alerts: List<EmergencyAlert>): List<EmergencyAlert> {
        val now = System.currentTimeMillis()
        val twoHours = 2 * 60 * 60 * 1000L
        return alerts.map { a ->
            if (a.level == "red" && !a.confirmed) {
                runCatching {
                    val created = java.time.Instant.from(java.time.OffsetDateTime.parse(a.createdAt)).toEpochMilli()
                    if (now - created > twoHours) {
                        a.copy(reason = a.reason + " [已超时升级：请心理组长介入]")
                    } else a
                }.getOrDefault(a)
            } else a
        }
    }

    /** 生成新 id */
    fun newId(prefix: String): String = "$prefix-${UUID.randomUUID()}"
}
