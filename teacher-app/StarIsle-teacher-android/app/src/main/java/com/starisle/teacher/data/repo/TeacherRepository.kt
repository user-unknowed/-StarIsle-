package com.starisle.teacher.data.repo

import com.starisle.teacher.data.models.Alert
import com.starisle.teacher.data.models.AuthorizationRequest
import com.starisle.teacher.data.models.ChatMessage
import com.starisle.teacher.data.models.EmotionalExpression
import com.starisle.teacher.data.models.EmotionalOverview
import com.starisle.teacher.data.models.KnowledgeBaseItem
import com.starisle.teacher.data.models.NotificationItem
import com.starisle.teacher.data.models.NotificationType
import com.starisle.teacher.data.models.ReportStatus
import com.starisle.teacher.data.models.RiskLevel
import com.starisle.teacher.data.models.SelfHelpRequest
import com.starisle.teacher.data.models.SeverityLevel
import com.starisle.teacher.data.models.Student
import com.starisle.teacher.data.models.StudentChatSession
import com.starisle.teacher.data.models.SymptomReport
import com.starisle.teacher.data.models.SymptomType
import com.starisle.teacher.data.models.Teacher
import com.starisle.teacher.data.models.TeacherMoodRecord
import com.starisle.teacher.data.models.TeacherRole
import com.starisle.teacher.data.models.TodoItem
import com.starisle.teacher.data.models.TodoType
import com.starisle.teacher.data.models.DurationType
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 教师业务 Repository。
 *
 * 对应 Dart 端 `providers/teacher_providers.dart` 中的所有 Provider/Notifier 数据初始化与状态变更。
 * 当前为本地 Mock 数据，后续可替换为真实后端。
 */
@Singleton
class TeacherRepository @Inject constructor() {

    /** 当前登录教师（Mock：张明 班主任）。 */
    val currentTeacher: Teacher = Teacher(
        id = "t1",
        name = "张明",
        role = TeacherRole.HOMEROOM_TEACHER,
        school = "星光中学",
        className = "高一(3)班",
        studentCount = 45,
    )

    /** Mock 风险预警列表。 */
    val alerts: List<Alert> = listOf(
        Alert(
            id = "a1",
            studentId = "s1",
            studentName = "李小雨",
            className = "高一(3)班",
            riskLevel = RiskLevel.RED,
            triggerReason = "AI对话中检测到自伤倾向",
            triggeredAt = LocalDateTime.now().minusHours(1),
        ),
        Alert(
            id = "a2",
            studentId = "s2",
            studentName = "王浩宇",
            className = "高一(3)班",
            riskLevel = RiskLevel.ORANGE,
            triggerReason = "连续7天心情低落",
            triggeredAt = LocalDateTime.now().minusHours(3),
        ),
        Alert(
            id = "a3",
            studentId = "s3",
            studentName = "陈思琪",
            className = "高一(2)班",
            riskLevel = RiskLevel.ORANGE,
            triggerReason = "测评显示中度焦虑",
            triggeredAt = LocalDateTime.now().minusHours(6),
        ),
    )

    /** Mock 待办列表。 */
    val todos: List<TodoItem> = listOf(
        TodoItem(
            id = "todo1",
            title = "处理学生症状反馈报告",
            description = "李小雨 - 情绪低落、睡眠异常",
            deadline = LocalDateTime.now().plusHours(2),
            type = TodoType.REPORT_PROCESSING,
            relatedId = "r1",
        ),
        TodoItem(
            id = "todo2",
            title = "跟进介入记录",
            description = "王浩宇 - 需要了解本周情况",
            deadline = LocalDateTime.now().plusHours(24),
            type = TodoType.INTERVENTION_FOLLOWUP,
            relatedId = "i1",
        ),
        TodoItem(
            id = "todo3",
            title = "查看处理回执",
            description = "陈思琪 - 心理老师已处理",
            deadline = LocalDateTime.now().plusHours(12),
            type = TodoType.RECEIPT_REVIEW,
            relatedId = "r2",
        ),
        TodoItem(
            id = "todo4",
            title = "观察学生对话",
            description = "张婷婷 - 橙色风险",
            deadline = LocalDateTime.now().plusHours(8),
            type = TodoType.OBSERVATION_TASK,
            relatedId = "s4",
        ),
    )

    /** Mock 学生列表。 */
    val students: List<Student> = listOf(
        Student(
            id = "s1",
            name = "李小雨",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.RED,
            lastStatusUpdate = LocalDateTime.now().minusHours(1),
            statusSummary = "情绪低落，有自伤倾向",
            moodTrend = -2,
        ),
        Student(
            id = "s2",
            name = "王浩宇",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.ORANGE,
            lastStatusUpdate = LocalDateTime.now().minusHours(3),
            statusSummary = "连续7天心情低落，睡眠不足",
            moodTrend = -1,
        ),
        Student(
            id = "s3",
            name = "张婷婷",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.ORANGE,
            lastStatusUpdate = LocalDateTime.now().minusHours(5),
            statusSummary = "焦虑，考试压力大",
            moodTrend = 0,
        ),
        Student(
            id = "s4",
            name = "刘畅",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.YELLOW,
            lastStatusUpdate = LocalDateTime.now().minusHours(8),
            statusSummary = "最近比较沉默，社交活动减少",
            moodTrend = -1,
        ),
        Student(
            id = "s5",
            name = "孙悦",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.GREEN,
            lastStatusUpdate = LocalDateTime.now().minusHours(12),
            statusSummary = "状态平稳",
            moodTrend = 1,
        ),
        Student(
            id = "s6",
            name = "赵文博",
            className = "高一(3)班",
            grade = 10,
            riskLevel = RiskLevel.GREEN,
            lastStatusUpdate = LocalDateTime.now().minusDays(1),
            statusSummary = "状态良好",
            moodTrend = 2,
        ),
    )

    /** Mock 症状报告列表。 */
    val reports: List<SymptomReport> = listOf(
        SymptomReport(
            id = "r1",
            studentId = "s1",
            studentName = "李小雨",
            className = "高一(3)班",
            reporterId = "t1",
            reporterName = "张明",
            symptoms = listOf(SymptomType.EMOTIONAL_LOW, SymptomType.SLEEP_ABNORMAL),
            emotions = listOf(EmotionalExpression.CRYING, EmotionalExpression.NUMB),
            duration = DurationType.ONE_TO_TWO_WEEKS,
            severity = SeverityLevel.URGENT,
            description = "近两周情绪低落，上课注意力不集中，晚上失眠，有时会偷偷哭泣",
            hasCommunicated = true,
            hasContactedParent = false,
            submittedAt = LocalDateTime.now().minusHours(2),
            status = ReportStatus.RECEIVED,
            assigneeId = "t2",
            assigneeName = "王丽",
        ),
        SymptomReport(
            id = "r2",
            studentId = "s2",
            studentName = "王浩宇",
            className = "高一(3)班",
            reporterId = "t1",
            reporterName = "张明",
            symptoms = listOf(SymptomType.EMOTIONAL_LOW, SymptomType.ACADEMIC_DROP),
            emotions = listOf(EmotionalExpression.NUMB),
            duration = DurationType.TWO_TO_FOUR_WEEKS,
            severity = SeverityLevel.SOMEWHAT_URGENT,
            description = "连续两周成绩下滑明显，不愿与人交流",
            hasCommunicated = true,
            hasContactedParent = true,
            submittedAt = LocalDateTime.now().minusDays(1),
            status = ReportStatus.PROCESSED,
            assigneeId = "t2",
            assigneeName = "王丽",
            processingOpinion = "已介入跟进，建议家长多关注",
            processedAt = LocalDateTime.now().minusHours(6),
        ),
        SymptomReport(
            id = "r3",
            studentId = "s3",
            studentName = "张婷婷",
            className = "高一(3)班",
            reporterId = "t1",
            reporterName = "张明",
            symptoms = listOf(SymptomType.IRRITABLE, SymptomType.ACADEMIC_DROP),
            emotions = listOf(EmotionalExpression.ANXIOUS),
            duration = DurationType.ONE_TO_TWO_WEEKS,
            severity = SeverityLevel.NEED_ATTENTION,
            description = "期中考试临近，压力较大，担心考不好",
            hasCommunicated = false,
            hasContactedParent = false,
            submittedAt = LocalDateTime.now().minusHours(8),
            status = ReportStatus.PROCESSING,
            assigneeId = "t2",
            assigneeName = "王丽",
        ),
    )

    /** Mock 聊天会话列表。 */
    val chatSessions: List<StudentChatSession> = listOf(
        StudentChatSession(
            id = "cs1",
            studentId = "s1",
            studentName = "李小雨",
            className = "高一(3)班",
            riskLevel = RiskLevel.RED,
            lastActive = LocalDateTime.now().minusHours(1),
            isIntervening = false,
            messages = listOf(
                ChatMessage(
                    id = "m1",
                    senderId = "ai",
                    senderName = "小星",
                    isTeacher = false,
                    content = "你好呀，我是小星，今天过得怎么样？",
                    sentAt = LocalDateTime.now().minusHours(2),
                ),
                ChatMessage(
                    id = "m2",
                    senderId = "s1",
                    senderName = "李小雨",
                    isTeacher = false,
                    content = "我觉得活着没什么意思...",
                    sentAt = LocalDateTime.now().minusHours(2),
                    riskLevel = RiskLevel.RED,
                ),
                ChatMessage(
                    id = "m3",
                    senderId = "ai",
                    senderName = "小星",
                    isTeacher = false,
                    content = "听到你这么说，我很担心你。能告诉我发生了什么吗？",
                    sentAt = LocalDateTime.now().minusHours(2),
                    strategyHint = "共情回应",
                ),
                ChatMessage(
                    id = "m4",
                    senderId = "s1",
                    senderName = "李小雨",
                    isTeacher = false,
                    content = "学习压力太大了，爸妈也不理解我...",
                    sentAt = LocalDateTime.now().minusHours(1),
                    riskLevel = RiskLevel.ORANGE,
                ),
            ),
        ),
        StudentChatSession(
            id = "cs2",
            studentId = "s2",
            studentName = "王浩宇",
            className = "高一(3)班",
            riskLevel = RiskLevel.ORANGE,
            lastActive = LocalDateTime.now().minusHours(3),
            isIntervening = true,
            messages = listOf(
                ChatMessage(
                    id = "m5",
                    senderId = "ai",
                    senderName = "小星",
                    isTeacher = false,
                    content = "嗨！最近感觉怎么样？",
                    sentAt = LocalDateTime.now().minusHours(4),
                ),
                ChatMessage(
                    id = "m6",
                    senderId = "s2",
                    senderName = "王浩宇",
                    isTeacher = false,
                    content = "不太好，每天都很累",
                    sentAt = LocalDateTime.now().minusHours(4),
                    riskLevel = RiskLevel.YELLOW,
                ),
                ChatMessage(
                    id = "m7",
                    senderId = "t2",
                    senderName = "王丽老师",
                    isTeacher = true,
                    content = "王浩宇同学你好，我是学校的心理老师王丽。小星和我说了你最近的情况，我很愿意听你说说。",
                    sentAt = LocalDateTime.now().minusHours(3),
                ),
                ChatMessage(
                    id = "m8",
                    senderId = "s2",
                    senderName = "王浩宇",
                    isTeacher = false,
                    content = "老师好...",
                    sentAt = LocalDateTime.now().minusHours(3),
                ),
            ),
        ),
    )

    /** Mock 教师心情记录（最近 7 天）。 */
    val moodRecords: List<TeacherMoodRecord> = listOf(
        TeacherMoodRecord(
            id = "mood1",
            moodLevel = 3,
            stressTags = listOf("教学任务", "学生问题"),
            recordedAt = LocalDateTime.now().minusDays(6),
        ),
        TeacherMoodRecord(
            id = "mood2",
            moodLevel = 4,
            stressTags = emptyList(),
            recordedAt = LocalDateTime.now().minusDays(5),
        ),
        TeacherMoodRecord(
            id = "mood3",
            moodLevel = 2,
            stressTags = listOf("家校沟通", "评价考核"),
            recordedAt = LocalDateTime.now().minusDays(4),
        ),
        TeacherMoodRecord(
            id = "mood4",
            moodLevel = 2,
            stressTags = listOf("学生问题"),
            recordedAt = LocalDateTime.now().minusDays(3),
        ),
        TeacherMoodRecord(
            id = "mood5",
            moodLevel = 3,
            stressTags = emptyList(),
            recordedAt = LocalDateTime.now().minusDays(2),
        ),
        TeacherMoodRecord(
            id = "mood6",
            moodLevel = 4,
            stressTags = emptyList(),
            recordedAt = LocalDateTime.now().minusDays(1),
        ),
        TeacherMoodRecord(
            id = "mood7",
            moodLevel = 3,
            stressTags = listOf("教学任务"),
            recordedAt = LocalDateTime.now(),
        ),
    )

    /** Mock 教师自助请求列表。 */
    val selfHelpRequests: List<SelfHelpRequest> = listOf(
        SelfHelpRequest(
            id = "sh1",
            teacherId = "t1",
            teacherName = "张明",
            description = "最近班级里有几个学生状态不太好，感觉压力很大，不知道该怎么处理",
            supportType = "建议",
            urgency = "一般",
            submittedAt = LocalDateTime.now().minusDays(1),
            counselorId = "t3",
            counselorName = "陈静",
            isConnected = true,
            connectedAt = LocalDateTime.now().minusHours(12),
        ),
    )

    /** Mock 知识库条目列表。 */
    val knowledgeBase: List<KnowledgeBaseItem> = listOf(
        KnowledgeBaseItem(
            id = "kb1",
            title = "青少年心理预警信号识别指南",
            category = "识别指南",
            summary = "帮助教师识别学生常见的心理预警信号",
            content = "## 青少年心理预警信号识别指南\n\n### 一、情绪信号\n- 持续两周以上的情绪低落\n- 突然的情绪波动，易怒或易哭\n- 对以前感兴趣的事情失去兴趣\n- 过度焦虑或担忧\n\n### 二、行为信号\n- 社交退缩，不愿与人交往\n- 学业成绩突然下滑\n- 睡眠或饮食习惯改变\n- 出现自伤行为或谈论死亡\n\n### 三、身体信号\n- 不明原因的身体不适（头痛、胃痛等）\n- 疲劳乏力，精力下降\n- 体重明显变化\n\n### 四、应对建议\n1. 保持关注，但不要过度追问\n2. 提供支持性环境\n3. 及时上报心理老师\n4. 注意保护学生隐私",
            author = "心理教研组",
            createdAt = LocalDateTime.now().minusDays(7),
        ),
        KnowledgeBaseItem(
            id = "kb2",
            title = "如何与情绪困扰学生沟通",
            category = "沟通技巧",
            summary = "掌握与情绪困扰学生沟通的基本技巧",
            content = "## 如何与情绪困扰学生沟通\n\n### 基本原则\n- **共情为先**：先理解学生的感受，再提供建议\n- **尊重隐私**：不在公开场合谈论学生的情况\n- **保持耐心**：给学生足够的时间表达\n- **避免评判**：不用\"你应该\"等评判性语言\n\n### 沟通技巧\n1. **开放式提问**：\"你最近感觉怎么样？\"而不是\"你还好吗？\"\n2. **倾听多于说话**：让学生充分表达，不要急于打断\n3. **验证感受**：\"听起来你真的很不容易\"\n4. **提供支持**：\"我很愿意帮助你\"",
            author = "王丽",
            createdAt = LocalDateTime.now().minusDays(3),
        ),
        KnowledgeBaseItem(
            id = "kb3",
            title = "症状反馈上报SOP",
            category = "上报SOP",
            summary = "症状反馈上报的标准操作流程",
            content = "## 症状反馈上报SOP\n\n### 第一步：观察记录\n- 记录观察到的具体行为\n- 不要主观推断，只记录事实\n\n### 第二步：初步沟通\n- 与学生进行简短沟通\n- 了解基本情况\n\n### 第三步：填写反馈表\n- 选择学生\n- 勾选行为表现和情绪表现\n- 选择持续时间和严重程度\n- 填写具体描述\n\n### 第四步：提交报告\n- 系统会根据严重程度自动推送\n- 紧急情况立即联系心理老师\n\n### 第五步：跟进回执\n- 关注报告处理状态\n- 查看心理老师的处理回执",
            author = "系统",
            createdAt = LocalDateTime.now().minusDays(1),
        ),
        KnowledgeBaseItem(
            id = "kb4",
            title = "危机干预技术手册",
            category = "干预技术",
            summary = "专业危机干预技术指南（心理老师专用）",
            content = "## 危机干预技术手册\n\n### 一、危机评估\n1. 评估危险等级\n2. 确定干预方向\n3. 制定干预计划\n\n### 二、核心技术\n- **共情技术**：理解并表达学生的感受\n- **情绪调节**：帮助学生调节情绪\n- **认知重构**：引导积极思维\n- **安全计划**：制定安全策略",
            author = "心理教研组",
            createdAt = LocalDateTime.now().minusDays(5),
            isProfessional = true,
        ),
        KnowledgeBaseItem(
            id = "kb5",
            title = "危机处理SOP",
            category = "危机SOP",
            summary = "高风险危机处理标准流程（心理老师专用）",
            content = "## 危机处理SOP\n\n### 红色风险处理流程\n1. 立即响应（30分钟内）\n2. 评估危机程度\n3. 启动安全协议\n4. 通知相关人员\n\n### 危机热线\n- 全国心理援助热线：12355\n- 希望24热线：400-161-9995",
            author = "心理教研组",
            createdAt = LocalDateTime.now().minusDays(10),
            isProfessional = true,
        ),
    )

    /** Mock 班级情绪概览。 */
    val emotionalOverview: EmotionalOverview = EmotionalOverview(
        className = "高一(3)班",
        totalStudents = 45,
        averageMood = 3.2,
        moodDistribution = mapOf(
            "很棒" to 8,
            "不错" to 15,
            "一般" to 12,
            "不太好" to 6,
            "很糟" to 4,
        ),
        highRiskCount = 3,
        updatedAt = LocalDateTime.now(),
    )

    /** Mock 授权请求列表。 */
    val authorizationRequests: List<AuthorizationRequest> = listOf(
        AuthorizationRequest(
            id = "auth1",
            studentId = "s7",
            studentName = "周子涵",
            className = "高一(4)班",
            counselorId = "t2",
            counselorName = "王丽",
            scope = "持续观察30天",
            expiresAt = LocalDateTime.now().plusDays(30),
            requestedAt = LocalDateTime.now().minusHours(2),
        ),
    )

    /** Mock 系统通知项。 */
    val notifications: List<NotificationItem> = listOf(
        NotificationItem(
            title = "高风险告警",
            description = "李小雨触发红色风险，已自动开放对话查看权限",
            time = LocalDateTime.now().minusHours(1),
            type = NotificationType.ALERT,
        ),
        NotificationItem(
            title = "报告回执",
            description = "王浩宇的症状反馈报告已处理完成",
            time = LocalDateTime.now().minusHours(6),
            type = NotificationType.REPORT,
        ),
        NotificationItem(
            title = "授权请求",
            description = "周子涵发起对话观察授权请求",
            time = LocalDateTime.now().minusHours(2),
            type = NotificationType.AUTH,
        ),
        NotificationItem(
            title = "系统提示",
            description = "今日有3条待办事项需要处理",
            time = LocalDateTime.now().minusHours(3),
            type = NotificationType.SYSTEM,
        ),
    )
}
