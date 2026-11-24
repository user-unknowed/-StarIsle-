package com.starisle.teacher.data.repo

import com.starisle.teacher.data.api.GatewayApiService
import com.starisle.teacher.data.local.TeacherSession
import com.starisle.teacher.data.local.TeacherSessionStore
import com.starisle.teacher.data.models.ApiEnvelope
import com.starisle.teacher.data.models.TeacherLoginRequest
import com.starisle.teacher.data.models.TeacherRegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 教师端网关鉴权仓库：登录 / 注册 / 登出，并持久化会话。
 */
@Singleton
class TeacherAuthRepository @Inject constructor(
    private val api: GatewayApiService,
    private val sessionStore: TeacherSessionStore,
) {

    suspend fun login(username: String, password: String): Result<TeacherSession> = runCatching {
        val payload = unwrap(api.login(TeacherLoginRequest(username, password)), "登录")
        val token = payload.token?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("登录响应缺少 token")
        val nickname = payload.nickname?.takeIf { it.isNotBlank() } ?: username
        sessionStore.save(token, payload.userId, nickname)
        TeacherSession(token = token, userId = payload.userId, nickname = nickname)
    }

    suspend fun register(username: String, password: String, nickname: String): Result<TeacherSession> = runCatching {
        val payload = unwrap(
            api.register(TeacherRegisterRequest(username, password, nickname)),
            "注册",
        )
        val token = payload.token?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("注册响应缺少 token")
        val displayName = payload.nickname?.takeIf { it.isNotBlank() } ?: nickname
        sessionStore.save(token, payload.userId, displayName)
        TeacherSession(token = token, userId = payload.userId, nickname = displayName)
    }

    suspend fun logout() {
        sessionStore.clear()
    }

    /** 按 2xx 判定成功并取出 data。 */
    private fun <T> unwrap(envelope: ApiEnvelope<T>, action: String): T {
        val code = envelope.code ?: 200
        if (code !in 200..299) {
            throw IllegalStateException(envelope.message ?: "${action}失败（code=$code）")
        }
        return envelope.data ?: throw IllegalStateException("${action}响应缺少 data")
    }
}
