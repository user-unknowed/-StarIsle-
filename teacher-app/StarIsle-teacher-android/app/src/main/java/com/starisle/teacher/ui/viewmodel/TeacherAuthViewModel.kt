package com.starisle.teacher.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.teacher.data.local.TeacherSessionStore
import com.starisle.teacher.data.repo.TeacherAuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 教师端网关鉴权 ViewModel：登录 / 注册 / 登出。
 */
@HiltViewModel
class TeacherAuthViewModel @Inject constructor(
    private val repo: TeacherAuthRepository,
    sessionStore: TeacherSessionStore,
) : ViewModel() {

    private val _state = MutableStateFlow(TeacherAuthUiState(isLoading = true))
    val state: StateFlow<TeacherAuthUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val session = sessionStore.sessionFlow.first()
            _state.update {
                it.copy(
                    isLoading = false,
                    isLoggedIn = session.isLoggedIn,
                    userId = session.userId,
                    nickname = session.nickname,
                )
            }
        }
    }

    fun login(username: String, password: String) = submit {
        repo.login(username.trim(), password)
    }

    fun register(username: String, password: String, nickname: String) = submit {
        repo.register(username.trim(), password, nickname.trim().ifBlank { username.trim() })
    }

    fun logout() {
        viewModelScope.launch {
            repo.logout()
            _state.value = TeacherAuthUiState()
        }
    }

    fun clearError() = _state.update { it.copy(error = null) }

    private fun submit(block: suspend () -> Result<com.starisle.teacher.data.local.TeacherSession>) {
        if (_state.value.isLoading) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            block()
                .onSuccess { session ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            isLoggedIn = true,
                            userId = session.userId,
                            nickname = session.nickname,
                            error = null,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoading = false, error = e.message ?: "操作失败，请重试") }
                }
        }
    }
}

/** 教师端鉴权 UI 状态。 */
data class TeacherAuthUiState(
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false,
    val userId: String? = null,
    val nickname: String = "",
    val error: String? = null,
)
