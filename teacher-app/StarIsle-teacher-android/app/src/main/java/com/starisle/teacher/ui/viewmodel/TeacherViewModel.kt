package com.starisle.teacher.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.teacher.data.models.Alert
import com.starisle.teacher.data.models.ChatMessage
import com.starisle.teacher.data.models.ReportStatus
import com.starisle.teacher.data.models.Student
import com.starisle.teacher.data.models.StudentChatSession
import com.starisle.teacher.data.models.Teacher
import com.starisle.teacher.data.models.TeacherMoodRecord
import com.starisle.teacher.data.models.TodoItem
import com.starisle.teacher.data.repo.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

/**
 * 教师业务 ViewModel。
 *
 * 对应 Dart 端 `providers/teacher_providers.dart`：
 * - Riverpod StateNotifier → ViewModel + MutableStateFlow；
 * - 当前教师 / 预警 / 待办 / 学生列表 / 报告 / 聊天会话 / 心情 / 自助请求 / 知识库 / 情绪概览 / 授权请求；
 * - 各 Notifier 操作（markAsRead / dismiss / toggleComplete / addReport / updateStatus / addMessage / toggleIntervention 等）以方法暴露。
 */
@HiltViewModel
class TeacherViewModel @Inject constructor(
    private val repo: TeacherRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TeacherUiState(
        currentTeacher = repo.currentTeacher,
        alerts = repo.alerts,
        todos = repo.todos,
        students = repo.students,
        reports = repo.reports,
        chatSessions = repo.chatSessions,
        moodRecords = repo.moodRecords,
        selfHelpRequests = repo.selfHelpRequests,
        knowledgeBase = repo.knowledgeBase,
        emotionalOverview = repo.emotionalOverview,
        authorizationRequests = repo.authorizationRequests,
        notifications = repo.notifications,
    ))
    val uiState: StateFlow<TeacherUiState> = _uiState.asStateFlow()

    /** 当前教师派生角色。 */
    val currentRole get() = _uiState.value.currentTeacher.role

    /** 标记指定预警为已读。 */
    fun markAlertAsRead(alertId: String) {
        _uiState.update { state ->
            state.copy(alerts = state.alerts.map { if (it.id == alertId) it.copy(isRead = true) else it })
        }
    }

    /** 忽略（移除）指定预警。 */
    fun dismissAlert(alertId: String) {
        _uiState.update { state -> state.copy(alerts = state.alerts.filterNot { it.id == alertId }) }
    }

    /** 切换指定待办的完成状态。 */
    fun toggleTodoComplete(todoId: String) {
        _uiState.update { state ->
            state.copy(
                todos = state.todos.map {
                    if (it.id == todoId) it.copy(isCompleted = !it.isCompleted) else it
                },
            )
        }
    }

    /** 移除指定待办。 */
    fun removeTodo(todoId: String) {
        _uiState.update { state -> state.copy(todos = state.todos.filterNot { it.id == todoId }) }
    }

    /** 新增一条症状报告。 */
    fun addReport(report: com.starisle.teacher.data.models.SymptomReport) {
        _uiState.update { state -> state.copy(reports = state.reports + report) }
    }

    /** 更新指定报告的处理状态。 */
    fun updateReportStatus(reportId: String, status: ReportStatus) {
        _uiState.update { state ->
            state.copy(
                reports = state.reports.map { if (it.id == reportId) it.copy(status = status) else it },
            )
        }
    }

    /** 向指定会话追加一条消息，并更新最近活跃时间。 */
    fun addChatMessage(sessionId: String, message: ChatMessage) {
        _uiState.update { state ->
            state.copy(
                chatSessions = state.chatSessions.map {
                    if (it.id == sessionId) {
                        it.copy(messages = it.messages + message, lastActive = LocalDateTime.now())
                    } else {
                        it
                    }
                },
            )
        }
    }

    /** 切换指定会话的干预状态。 */
    fun toggleIntervention(sessionId: String, isIntervening: Boolean) {
        _uiState.update { state ->
            state.copy(
                chatSessions = state.chatSessions.map {
                    if (it.id == sessionId) it.copy(isIntervening = isIntervening) else it
                },
            )
        }
    }

    /** 新增一条心情记录。 */
    fun addMoodRecord(record: TeacherMoodRecord) {
        _uiState.update { state -> state.copy(moodRecords = state.moodRecords + record) }
    }

    /** 新增一条自助请求。 */
    fun addSelfHelpRequest(request: com.starisle.teacher.data.models.SelfHelpRequest) {
        _uiState.update { state -> state.copy(selfHelpRequests = state.selfHelpRequests + request) }
    }

    /** 批准授权请求。 */
    fun approveAuthorizationRequest(requestId: String) {
        _uiState.update { state ->
            state.copy(
                authorizationRequests = state.authorizationRequests.map {
                    if (it.id == requestId) it.copy(isApproved = true) else it
                },
            )
        }
    }

    /** 拒绝授权请求（移除）。 */
    fun rejectAuthorizationRequest(requestId: String) {
        _uiState.update { state ->
            state.copy(authorizationRequests = state.authorizationRequests.filterNot { it.id == requestId })
        }
    }

    fun setStudents(students: List<Student>) {
        _uiState.update { it.copy(students = students) }
    }

    fun setAlerts(alerts: List<Alert>) {
        _uiState.update { it.copy(alerts = alerts) }
    }

    fun setTodos(todos: List<TodoItem>) {
        _uiState.update { it.copy(todos = todos) }
    }

    fun setChatSessions(sessions: List<StudentChatSession>) {
        _uiState.update { it.copy(chatSessions = sessions) }
    }

    fun setCurrentTeacher(teacher: Teacher) {
        _uiState.update { it.copy(currentTeacher = teacher) }
    }
}

/** 教师端 UI 状态聚合。 */
data class TeacherUiState(
    val currentTeacher: Teacher,
    val alerts: List<Alert>,
    val todos: List<TodoItem>,
    val students: List<Student>,
    val reports: List<com.starisle.teacher.data.models.SymptomReport>,
    val chatSessions: List<StudentChatSession>,
    val moodRecords: List<TeacherMoodRecord>,
    val selfHelpRequests: List<com.starisle.teacher.data.models.SelfHelpRequest>,
    val knowledgeBase: List<com.starisle.teacher.data.models.KnowledgeBaseItem>,
    val emotionalOverview: com.starisle.teacher.data.models.EmotionalOverview,
    val authorizationRequests: List<com.starisle.teacher.data.models.AuthorizationRequest>,
    val notifications: List<com.starisle.teacher.data.models.NotificationItem>,
)
