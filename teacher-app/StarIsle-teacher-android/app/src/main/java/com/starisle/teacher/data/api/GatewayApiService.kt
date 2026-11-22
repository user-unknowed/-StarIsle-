package com.starisle.teacher.data.api

import com.starisle.teacher.data.models.ApiEnvelope
import com.starisle.teacher.data.models.GatewayChatRequest
import com.starisle.teacher.data.models.GatewayChatResponse
import com.starisle.teacher.data.models.TeacherLoginRequest
import com.starisle.teacher.data.models.TeacherLoginResponse
import com.starisle.teacher.data.models.TeacherRegisterRequest
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * 星屿网关（Spring Boot，8081）接口。
 *
 * 路径不以 / 开头，避免覆盖 Retrofit baseUrl 中已有的 /api/ 段。
 */
interface GatewayApiService {

    /** 教师登录（用户名 + 密码）。 */
    @POST("v1/users/login")
    suspend fun login(@Body body: TeacherLoginRequest): ApiEnvelope<TeacherLoginResponse>

    /** 教师注册（role 固定 teacher）。 */
    @POST("v1/users/register")
    suspend fun register(@Body body: TeacherRegisterRequest): ApiEnvelope<TeacherLoginResponse>

    /** 发送对话消息并获取模型回复。 */
    @POST("v1/chat/message")
    suspend fun sendMessage(@Body body: GatewayChatRequest): ApiEnvelope<GatewayChatResponse>
}
