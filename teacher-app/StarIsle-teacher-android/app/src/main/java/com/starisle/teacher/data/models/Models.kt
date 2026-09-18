package com.starisle.teacher.data.models

import androidx.compose.ui.graphics.Color
import com.starisle.teacher.theme.AlertOrangeBg
import com.starisle.teacher.theme.AlertRedBg
import com.starisle.teacher.theme.RiskGreen
import com.starisle.teacher.theme.RiskOrange
import com.starisle.teacher.theme.RiskRed
import com.starisle.teacher.theme.RiskYellow
import com.starisle.teacher.theme.InfoColor
import com.starisle.teacher.theme.NotificationAlert
import com.starisle.teacher.theme.NotificationAuth
import com.starisle.teacher.theme.NotificationReport
import com.starisle.teacher.theme.NotificationSystem
import com.starisle.teacher.theme.SuccessColor
import com.starisle.teacher.theme.TextSecondaryLight
import com.starisle.teacher.theme.WarningColor
import java.time.LocalDateTime
import java.util.UUID

/**
 * 教师角色枚举。区分班主任/科任老师/心理老师。
 */
enum class TeacherRole {
    HOMEROOM_TEACHER,
    SUBJECT_TEACHER,
    COUNSELOR;

    val label: String
        get() = when (this) {
            HOMEROOM_TEACHER -> "班主任"
            SUBJECT_TEACHER -> "科任老师"
            COUNSELOR -> "心理老师"
        }
}

/**
 * 风险等级枚举（绿/黄/橙/红）。
 */
enum class RiskLevel {
    GREEN,
    YELLOW,
    ORANGE,
    RED;

    val label: String
        get() = when (this) {
            GREEN -> "轻微关注"
            YELLOW -> "需要关注"
            ORANGE -> "较为紧急"
            RED -> "紧急"
        }

    val color: Color
        get() = when (this) {
            GREEN -> RiskGreen
            YELLOW -> RiskYellow
            ORANGE -> RiskOrange
            RED -> RiskRed
        }

    val emoji: String
        get() = when (this) {
            GREEN -> "🟢"
            YELLOW -> "🟡"
            ORANGE -> "🟠"
            RED -> "🔴"
        }

    /** 告警卡片背景色。 */
    val cardBg: Color
        get() = when (this) {
            RED -> AlertRedBg
            ORANGE -> AlertOrangeBg
            else -> Color.White
        }
}

/**
 * 报告处理状态枚举。
 */
enum class ReportStatus {
    SUBMITTED,
    RECEIVED,
    PROCESSING,
    PROCESSED;

    val label: String
        get() = when (this) {
            SUBMITTED -> "已提交"
            RECEIVED -> "已接收"
            PROCESSING -> "处理中"
            PROCESSED -> "已处理"
        }

    val color: Color
        get() = when (this) {
            SUBMITTED -> TextSecondaryLight
            RECEIVED -> InfoColor
            PROCESSING -> WarningColor
            PROCESSED -> SuccessColor
        }
}

/**
 * 症状类型枚举。
 */
enum class SymptomType {
    EMOTIONAL_LOW,
    IRRITABLE,
    SOCIAL_WITHDRAWAL,
    ACADEMIC_DROP,
    SLEEP_ABNORMAL,
    SELF_HARM_TRACES,
    OTHER;

    val label: String
        get() = when (this) {
            EMOTIONAL_LOW -> "情绪低落"
            IRRITABLE -> "易怒"
            SOCIAL_WITHDRAWAL -> "社交退缩"
            ACADEMIC_DROP -> "学业骤降"
            SLEEP_ABNORMAL -> "睡眠异常"
            SELF_HARM_TRACES -> "自伤痕迹"
            OTHER -> "其他"
        }
}

/**
 * 情绪表达类型枚举。
 */
enum class EmotionalExpression {
    CRYING,
    NUMB,
    ANXIOUS,
    IRRITABLE,
    ABNORMALLY_CALM;

    val label: String
        get() = when (this) {
            CRYING -> "哭泣"
            NUMB -> "麻木"
            ANXIOUS -> "焦虑"
            IRRITABLE -> "暴躁"
            ABNORMALLY_CALM -> "异常平静"
        }
}

/**
 * 症状持续时长枚举。
 */
enum class DurationType {
    LESS_THAN_1_WEEK,
    ONE_TO_TWO_WEEKS,
    TWO_TO_FOUR_WEEKS,
    MORE_THAN_1_MONTH;

    val label: String
        get() = when (this) {
            LESS_THAN_1_WEEK -> "<1周"
            ONE_TO_TWO_WEEKS -> "1-2周"
            TWO_TO_FOUR_WEEKS -> "2-4周"
            MORE_THAN_1_MONTH -> ">1月"
        }
}

/**
 * 严重程度枚举（与风险等级对应）。
 */
enum class SeverityLevel {
    MILD_ATTENTION,
    NEED_ATTENTION,
    SOMEWHAT_URGENT,
    URGENT;

    val label: String
        get() = when (this) {
            MILD_ATTENTION -> "轻微关注"
            NEED_ATTENTION -> "需要关注"
            SOMEWHAT_URGENT -> "较为紧急"
            URGENT -> "紧急"
        }

    val riskLevel: RiskLevel
        get() = when (this) {
            MILD_ATTENTION -> RiskLevel.GREEN
            NEED_ATTENTION -> RiskLevel.YELLOW
            SOMEWHAT_URGENT -> RiskLevel.ORANGE
            URGENT -> RiskLevel.RED
        }
}

/**
 * 待办类型枚举。
 */
enum class TodoType {
    REPORT_PROCESSING,
    INTERVENTION_FOLLOWUP,
    RECEIPT_REVIEW,
    OBSERVATION_TASK;

    val label: String
        get() = when (this) {
            REPORT_PROCESSING -> "报告处理"
            INTERVENTION_FOLLOWUP -> "干预跟进"
            RECEIPT_REVIEW -> "回执审核"
            OBSERVATION_TASK -> "观察任务"
        }
}

/**
 * 通知类型枚举。
 */
enum class NotificationType {
    ALERT,
    REPORT,
    AUTH,
    SYSTEM;

    val label: String
        get() = when (this) {
            ALERT -> "高风险告警"
            REPORT -> "报告回执"
            AUTH -> "授权请求"
            SYSTEM -> "系统提示"
        }

    val color: Color
        get() = when (this) {
            ALERT -> NotificationAlert
            REPORT -> NotificationReport
            AUTH -> NotificationAuth
            SYSTEM -> NotificationSystem
        }
}

/**
 * 教师信息模型。
 */
data class Teacher(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val role: TeacherRole,
    val school: String,
    val className: String,
    val studentCount: Int,
    val avatar: String = "",
) {
    val roleLabel: String get() = role.label
}

/**
 * 学生信息模型。
 */
data class Student(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val className: String,
    val grade: Int,
    val riskLevel: RiskLevel,
    val lastStatusUpdate: LocalDateTime,
    val statusSummary: String,
    val hasRealIdentity: Boolean = true,
    val moodTrend: Int = 0,
)

/**
 * 症状报告模型。
 */
data class SymptomReport(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val studentName: String,
    val className: String,
    val reporterId: String,
    val reporterName: String,
    val symptoms: List<SymptomType>,
    val emotions: List<EmotionalExpression>,
    val duration: DurationType,
    val severity: SeverityLevel,
    val description: String,
    val hasCommunicated: Boolean,
    val hasContactedParent: Boolean,
    val submittedAt: LocalDateTime,
    val status: ReportStatus,
    val assigneeId: String? = null,
    val assigneeName: String? = null,
    val processingOpinion: String? = null,
    val processedAt: LocalDateTime? = null,
) {
    val riskLevel: RiskLevel get() = severity.riskLevel
}

/**
 * 预警信息模型。
 */
data class Alert(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val studentName: String,
    val className: String,
    val riskLevel: RiskLevel,
    val triggerReason: String,
    val triggeredAt: LocalDateTime,
    val isRead: Boolean = false,
)

/**
 * 待办事项模型。
 */
data class TodoItem(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String? = null,
    val deadline: LocalDateTime,
    val isCompleted: Boolean = false,
    val type: TodoType,
    val relatedId: String? = null,
)

/**
 * 聊天消息模型。
 */
data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val senderId: String,
    val senderName: String,
    val isTeacher: Boolean,
    val content: String,
    val sentAt: LocalDateTime,
    val riskLevel: RiskLevel? = null,
    val strategyHint: String? = null,
)

/**
 * 学生聊天会话模型。
 */
data class StudentChatSession(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val studentName: String,
    val className: String,
    val riskLevel: RiskLevel,
    val lastActive: LocalDateTime,
    val isIntervening: Boolean = false,
    val messages: List<ChatMessage>,
)

/**
 * 教师心情记录模型。
 */
data class TeacherMoodRecord(
    val id: String = UUID.randomUUID().toString(),
    val moodLevel: Int,
    val stressTags: List<String>,
    val recordedAt: LocalDateTime,
) {
    val moodLabel: String
        get() = when (moodLevel) {
            1 -> "很糟"
            2 -> "不太好"
            3 -> "一般"
            4 -> "不错"
            5 -> "很棒"
            else -> "一般"
        }

    val moodEmoji: String
        get() = when (moodLevel) {
            1 -> "😢"
            2 -> "😔"
            3 -> "😐"
            4 -> "🙂"
            5 -> "😄"
            else -> "😐"
        }
}

/**
 * 教师自助请求模型。
 */
data class SelfHelpRequest(
    val id: String = UUID.randomUUID().toString(),
    val teacherId: String,
    val teacherName: String,
    val description: String,
    val supportType: String,
    val urgency: String,
    val submittedAt: LocalDateTime,
    val counselorId: String? = null,
    val counselorName: String? = null,
    val isConnected: Boolean = false,
    val connectedAt: LocalDateTime? = null,
)

/**
 * 知识库条目模型。
 */
data class KnowledgeBaseItem(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val category: String,
    val summary: String,
    val content: String,
    val author: String,
    val createdAt: LocalDateTime,
    val isProfessional: Boolean = false,
)

/**
 * 干预记录模型。
 */
data class InterventionRecord(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val studentName: String,
    val counselorId: String,
    val counselorName: String,
    val startTime: LocalDateTime,
    val endTime: LocalDateTime,
    val messageCount: Int,
    val interventionSummary: String,
    val beforeRiskLevel: RiskLevel,
    val afterRiskLevel: RiskLevel,
    val needsFollowup: Boolean = false,
    val followupPlan: String? = null,
)

/**
 * 班级情绪概览模型。
 */
data class EmotionalOverview(
    val className: String,
    val totalStudents: Int,
    val averageMood: Double,
    val moodDistribution: Map<String, Int>,
    val highRiskCount: Int,
    val updatedAt: LocalDateTime,
)

/**
 * 授权请求模型。
 */
data class AuthorizationRequest(
    val id: String = UUID.randomUUID().toString(),
    val studentId: String,
    val studentName: String,
    val className: String,
    val counselorId: String,
    val counselorName: String,
    val scope: String,
    val expiresAt: LocalDateTime,
    val requestedAt: LocalDateTime,
    val isApproved: Boolean = false,
    val isRevoked: Boolean = false,
)

/**
 * 系统通知项数据。
 */
data class NotificationItem(
    val title: String,
    val description: String,
    val time: LocalDateTime,
    val type: NotificationType,
)

/**
 * 维护历史记录模型（对应 Room maintenance_history 表）。
 */
data class MaintenanceRecord(
    val id: String,
    val actionType: String,
    val details: String,
    val itemsProcessed: Int,
    val storageSaved: Long,
    val startedAt: LocalDateTime,
    val completedAt: LocalDateTime?,
) {
    val duration: String
        get() {
            val end = completedAt ?: return "进行中"
            val diffSec = java.time.Duration.between(startedAt, end).seconds
            return when {
                diffSec < 60 -> "${diffSec}秒"
                diffSec < 3600 -> "${diffSec / 60}分钟"
                else -> "${diffSec / 3600}小时"
            }
        }

    val actionTypeLabel: String
        get() = when (actionType) {
            "auto_maintenance" -> "自动整理"
            "manual_maintenance" -> "手动整理"
            "data_cleanup" -> "数据清理"
            "compaction" -> "数据库压缩"
            else -> actionType
        }
}

/**
 * 存储状态快照。
 */
data class StorageStatus(
    val databaseSize: Long,
    val recordCounts: Map<String, Int>,
    val maintenanceHistory: List<MaintenanceRecord>,
)
