package com.starisle.parent.ui.viewmodel

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.starisle.parent.data.api.LoginRequest
import com.starisle.parent.data.api.ParentApiService
import com.starisle.parent.data.api.RegisterRequest
import com.starisle.parent.data.models.ParentLoginResponse
import com.starisle.parent.data.models.ParentUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 鉴权 ViewModel：登录/登出/Token 持久化。
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ParentApiService,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val token = dataStore.data.map { it[TOKEN_KEY] }.first()
            val userId = dataStore.data.map { it[USER_ID_KEY] }.first()
            val nickname = dataStore.data.map { it[NICKNAME_KEY] }.first()
            val phone = dataStore.data.map { it[PHONE_KEY] }.first()
            if (!token.isNullOrEmpty() && !userId.isNullOrEmpty()) {
                _state.update {
                    it.copy(
                        token = token,
                        userId = userId,
                        user = ParentUser(
                            id = userId,
                            nickname = nickname ?: "家长",
                            phone = phone
                        ),
                        isLoggedIn = true
                    )
                }
            }
        }
    }

    fun login(phone: String, password: String, onSuccess: () -> Unit = {}, onError: (String) -> Unit = {}) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        runCatching {
            val envelope = api.login(LoginRequest(phone, password))
            // 注册接口成功返回 201，登录返回 200，统一按 2xx 判定
            val code = envelope.code ?: 200
            if (code !in 200..299) {
                throw IllegalStateException(envelope.message ?: "登录失败（code=$code）")
            }
            val payload = envelope.data ?: throw IllegalStateException("登录响应缺少 data")
            if (payload.token.isNullOrBlank()) throw IllegalStateException("登录响应缺少 token")
            payload
        }
            .onSuccess { resp ->
                saveSession(resp)
                _state.update {
                    it.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        token = resp.token,
                        userId = resp.userId,
                        user = ParentUser(
                            id = resp.userId,
                            nickname = resp.nickname,
                            phone = resp.phone,
                            avatar = resp.avatar
                        )
                    )
                }
                onSuccess()
            }
            .onFailure { e ->
                _state.update { it.copy(isLoading = false, error = e.message ?: "登录失败") }
                onError(e.message ?: "登录失败")
            }
    }

    /**
     * 家长注册：成功后直接写入登录态（与后端 /v1/parents/register 行为一致）。
     */
    fun register(
        phone: String,
        password: String,
        nickname: String,
        onSuccess: () -> Unit = {},
        onError: (String) -> Unit = {}
    ) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        runCatching {
            val envelope = api.register(RegisterRequest(phone, password, nickname))
            val code = envelope.code ?: 200
            if (code !in 200..299) {
                throw IllegalStateException(envelope.message ?: "注册失败（code=$code）")
            }
            val payload = envelope.data ?: throw IllegalStateException("注册响应缺少 data")
            if (payload.token.isNullOrBlank()) throw IllegalStateException("注册响应缺少 token")
            payload
        }
            .onSuccess { resp ->
                saveSession(resp)
                _state.update {
                    it.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        token = resp.token,
                        userId = resp.userId,
                        user = ParentUser(
                            id = resp.userId,
                            nickname = resp.nickname,
                            phone = resp.phone,
                            avatar = resp.avatar
                        )
                    )
                }
                onSuccess()
            }
            .onFailure { e ->
                _state.update { it.copy(isLoading = false, error = e.message ?: "注册失败") }
                onError(e.message ?: "注册失败")
            }
    }

    /** 持久化登录态，供 OkHttp 鉴权拦截器读取 token */
    private suspend fun saveSession(resp: ParentLoginResponse) {
        val token = resp.token?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("登录响应缺少 token")
        dataStore.edit { p ->
            p[TOKEN_KEY] = token
            p[USER_ID_KEY] = resp.userId
            p[NICKNAME_KEY] = resp.nickname
            p[PHONE_KEY] = resp.phone.orEmpty()
        }
    }

    fun logout() = viewModelScope.launch {
        dataStore.edit { it.clear() }
        _state.update { AuthState() }
    }

    fun updateProfile(nickname: String, signature: String?) = viewModelScope.launch {
        _state.update { s ->
            s.copy(user = s.user?.copy(nickname = nickname, signature = signature))
        }
        dataStore.edit { it[NICKNAME_KEY] = nickname }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val NICKNAME_KEY = stringPreferencesKey("nickname")
        private val PHONE_KEY = stringPreferencesKey("phone")
    }
}

data class AuthState(
    val isLoggedIn: Boolean = false,
    val token: String? = null,
    val userId: String? = null,
    val user: ParentUser? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)
