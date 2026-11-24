package com.starisle.parent.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.parent.data.api.BindChildRequest
import com.starisle.parent.data.models.ChatMessage
import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.data.models.EmergencyAlert
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.data.models.KnowledgeArticle
import com.starisle.parent.data.models.MoodRecord
import com.starisle.parent.data.models.MoodSummary
import com.starisle.parent.data.models.MoodTrendData
import com.starisle.parent.data.models.NotificationSettings
import com.starisle.parent.data.models.ParentUser
import com.starisle.parent.data.repo.ParentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import javax.inject.Inject

/**
 * 家长端主 ViewModel，对应 Zustand parentStore。
 *
 * 同时兼容两套 store 的状态字段：
 * - parent-app/src/store/parentStore.ts：children/currentChildId/moodTrend/moodSummary/knowledgeArticles/...
 * - web-frontend/src/store/parentStore.ts：parentProfile/selectedChildId/childMood/emergencyAlerts/...
 */
@HiltViewModel
class ParentViewModel @Inject constructor(
    private val repo: ParentRepository
) : ViewModel() {

    private val _state = MutableStateFlow(ParentState())
    val state: StateFlow<ParentState> = _state.asStateFlow()

    fun fetchProfile() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        repo.fetchProfile()
            .onSuccess { profile ->
                _state.update { it.copy(parentProfile = profile, isLoading = false, isUsingMockData = false) }
            }
            .onFailure { e ->
                _state.update {
                    it.copy(parentProfile = repo.mockParentProfile, isLoading = false, isUsingMockData = true)
                }
            }
    }

    fun fetchChildren() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        repo.fetchChildren()
            .onSuccess { children ->
                val selected = _state.value.selectedChildId ?: children.firstOrNull()?.bindingId
                _state.update {
                    it.copy(children = children, selectedChildId = selected,
                        currentChildId = children.firstOrNull()?.bindingId,
                        isLoading = false, isUsingMockData = false)
                }
            }
            .onFailure {
                val children = repo.mockChildren
                val selected = _state.value.selectedChildId ?: children.firstOrNull()?.bindingId
                _state.update {
                    it.copy(children = children, selectedChildId = selected,
                        currentChildId = children.firstOrNull()?.bindingId,
                        isLoading = false, isUsingMockData = true)
                }
            }
    }

    fun selectChild(bindingId: String) {
        _state.update { it.copy(selectedChildId = bindingId, currentChildId = bindingId, childMood = emptyList()) }
    }

    fun fetchChildMood(days: Int = 7) {
        val bindingId = _state.value.selectedChildId ?: return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repo.fetchChildMood(bindingId, days)
                .onSuccess { mood ->
                    _state.update { it.copy(childMood = mood, isLoading = false, isUsingMockData = false) }
                }
                .onFailure {
                    _state.update { it.copy(childMood = repo.mockChildMood, isLoading = false, isUsingMockData = true) }
                }
        }
    }

    fun bindChild(studentId: String, nickname: String?, bindType: String? = "manual", onResult: (ChildBinding?) -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repo.bindChild(BindChildRequest(studentId, nickname, bindType))
                .onSuccess { binding ->
                    _state.update {
                        it.copy(children = it.children + binding, isLoading = false, isUsingMockData = false)
                    }
                    onResult(binding)
                }
                .onFailure {
                    val mock = ChildBinding(
                        bindingId = "binding_${System.currentTimeMillis()}",
                        studentId = studentId,
                        studentNickname = nickname ?: "新绑定孩子",
                        authorized = false,
                        createdAt = Instant.now().toString()
                    )
                    _state.update {
                        it.copy(children = it.children + mock, isLoading = false,
                            isUsingMockData = it.children.isEmpty())
                    }
                    onResult(mock)
                }
        }
    }

    fun authorizeChild(bindingId: String) {
        viewModelScope.launch {
            repo.authorizeChild(bindingId)
            _state.update { s ->
                s.copy(children = s.children.map {
                    if (it.bindingId == bindingId) it.copy(authorized = true) else it
                })
            }
        }
    }

    fun unbindChild(bindingId: String) {
        viewModelScope.launch {
            repo.unbindChild(bindingId)
            val remaining = _state.value.children.filter { it.bindingId != bindingId }
            val newSelected = if (_state.value.selectedChildId == bindingId) remaining.firstOrNull()?.bindingId else _state.value.selectedChildId
            _state.update {
                it.copy(children = remaining, selectedChildId = newSelected, currentChildId = newSelected)
            }
        }
    }

    fun fetchAlerts() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        repo.fetchAlerts()
            .onSuccess { alerts ->
                val updated = repo.checkAlertTimeout(alerts)
                _state.update { it.copy(emergencyAlerts = updated, isLoading = false, isUsingMockData = false) }
            }
            .onFailure {
                val alerts = repo.mockAlerts
                _state.update { it.copy(emergencyAlerts = alerts, isLoading = false, isUsingMockData = true) }
            }
    }

    fun confirmAlert(alertId: String) {
        viewModelScope.launch {
            repo.confirmAlert(alertId)
            _state.update { s ->
                s.copy(emergencyAlerts = s.emergencyAlerts.map {
                    if (it.alertId == alertId) it.copy(confirmed = true, confirmedAt = Instant.now().toString(), status = "confirmed") else it
                })
            }
        }
    }

    fun fetchResources(type: String? = null) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        repo.fetchResources(type)
            .onSuccess { r ->
                _state.update { it.copy(emergencyResources = r, isLoading = false, isUsingMockData = false) }
            }
            .onFailure {
                val r = if (type != null) repo.mockEmergencyResources.filter { it.type == type } else repo.mockEmergencyResources
                _state.update { it.copy(emergencyResources = r, isLoading = false, isUsingMockData = true) }
            }
    }

    // ---- parent-app 旧版字段 ----

    fun fetchMoodTrend(studentId: String, days: Int) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        repo.fetchMoodTrend(studentId, days)
            .onSuccess { trend -> _state.update { it.copy(moodTrend = trend, isLoading = false) } }
            .onFailure { _state.update { it.copy(moodTrend = repo.mockMoodTrend, isLoading = false) } }
    }

    fun fetchMoodSummary(studentId: String) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        repo.fetchMoodSummary(studentId)
            .onSuccess { s -> _state.update { it.copy(moodSummary = s, isLoading = false) } }
            .onFailure { _state.update { it.copy(moodSummary = repo.mockMoodSummary, isLoading = false) } }
    }

    fun fetchKnowledgeArticles() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        repo.fetchKnowledgeArticles()
            .onSuccess { arts -> _state.update { it.copy(knowledgeArticles = arts, isLoading = false) } }
            .onFailure { _state.update { it.copy(knowledgeArticles = repo.mockKnowledgeArticles, isLoading = false) } }
    }

    fun fetchNotificationSettings() = viewModelScope.launch {
        repo.fetchNotificationSettings()
            .onSuccess { s -> _state.update { it.copy(notificationSettings = s) } }
            .onFailure { _state.update { it.copy(notificationSettings = repo.defaultNotificationSettings) } }
    }

    fun updateNotificationSettings(settings: NotificationSettings) = viewModelScope.launch {
        // 应急预案通知强制开启
        val safe = settings.copy(emergencyAlert = true)
        repo.updateNotificationSettings(safe)
        _state.update { it.copy(notificationSettings = safe) }
    }

    fun fetchEmergencyResources() = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        repo.fetchResources(null)
            .onSuccess { r -> _state.update { it.copy(emergencyResources = r, isLoading = false) } }
            .onFailure { _state.update { it.copy(emergencyResources = repo.mockEmergencyResources, isLoading = false) } }
    }

    fun confirmEmergencyAlert(alertId: String) = viewModelScope.launch {
        repo.confirmEmergencyAlert(alertId)
        _state.update { s ->
            s.copy(emergencyAlert = s.emergencyAlert?.copy(
                status = "confirmed",
                confirmedAt = Instant.now().toString()
            ))
        }
    }

    fun sendChatMessage(parentId: String, message: String, onReply: (ChatMessage) -> Unit) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        // 立即追加用户消息
        val userMsg = ChatMessage(
            id = "msg-${System.currentTimeMillis()}",
            userId = parentId,
            content = message,
            role = "user",
            timestamp = Instant.now().toString()
        )
        _state.update { s -> s.copy(chatMessages = s.chatMessages + userMsg) }

        // 模拟 AI 思考延时
        kotlinx.coroutines.delay(800)
        val reply = ChatMessage(
            id = "reply-${System.currentTimeMillis()}",
            userId = parentId,
            content = "大星理解你的感受。慢慢来，我们一起想想办法。",
            role = "assistant",
            timestamp = Instant.now().toString()
        )
        _state.update { s -> s.copy(chatMessages = s.chatMessages + reply, isLoading = false) }
        onReply(reply)
    }

    fun fetchChatHistory(parentId: String) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true) }
        kotlinx.coroutines.delay(500)
        val history = listOf(
            ChatMessage("msg1", parentId, "大星你好，我想问问关于孩子情绪的问题", "user", "2026-07-15T10:00:00Z"),
            ChatMessage("msg2", parentId, "你好呀！大星在这里陪着你。慢慢来，一切都会好起来的。关于孩子的情绪，大星很愿意听听你的想法。", "assistant", "2026-07-15T10:01:00Z")
        )
        _state.update { it.copy(chatMessages = history, isLoading = false) }
    }

    fun setActiveChatTopic(topic: String?) {
        _state.update { it.copy(activeChatTopic = topic) }
    }

    fun clearError() = _state.update { it.copy(error = null) }
}

/**
 * 家长端聚合状态（兼容 parent-app + web-frontend 两套 store 字段）
 */
data class ParentState(
    val parentProfile: ParentUser? = null,
    val children: List<ChildBinding> = emptyList(),
    val selectedChildId: String? = null,
    val currentChildId: String? = null,
    val childMood: List<MoodRecord> = emptyList(),
    val emergencyAlerts: List<EmergencyAlert> = emptyList(),
    val emergencyAlert: EmergencyAlert? = null,
    val emergencyResources: List<EmergencyResource> = emptyList(),
    val moodTrend: List<MoodTrendData> = emptyList(),
    val moodSummary: MoodSummary? = null,
    val knowledgeArticles: List<KnowledgeArticle> = emptyList(),
    val notificationSettings: NotificationSettings = NotificationSettings(),
    val chatMessages: List<ChatMessage> = emptyList(),
    val activeChatTopic: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isUsingMockData: Boolean = false
)
