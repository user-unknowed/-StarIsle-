package com.starisle.teacher.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 教师端网关会话存储。
 *
 * 将登录返回的 token / userId / nickname 持久化到 DataStore，
 * 供 OkHttp 鉴权拦截器与 AI 对话 ViewModel 读取。
 */
@Singleton
class TeacherSessionStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {

    /** 会话变化流，登录/登出后自动推送最新状态。 */
    val sessionFlow: Flow<TeacherSession> = dataStore.data.map { prefs ->
        TeacherSession(
            token = prefs[TOKEN_KEY],
            userId = prefs[USER_ID_KEY],
            nickname = prefs[NICKNAME_KEY].orEmpty(),
        )
    }

    /** 保存登录态。 */
    suspend fun save(token: String, userId: String, nickname: String) {
        dataStore.edit { prefs ->
            prefs[TOKEN_KEY] = token
            prefs[USER_ID_KEY] = userId
            prefs[NICKNAME_KEY] = nickname
        }
    }

    /** 清除登录态。 */
    suspend fun clear() {
        dataStore.edit { it.clear() }
    }

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val NICKNAME_KEY = stringPreferencesKey("nickname")
    }
}

/** 教师端登录会话。 */
data class TeacherSession(
    val token: String? = null,
    val userId: String? = null,
    val nickname: String = "",
) {
    val isLoggedIn: Boolean
        get() = !token.isNullOrBlank() && !userId.isNullOrBlank()
}
