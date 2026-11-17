package com.starisle.parent.data.api

import com.starisle.parent.data.models.ApiEnvelope
import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.data.models.EmergencyAlert
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.data.models.MoodRecord
import com.starisle.parent.data.models.ParentLoginResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * 绑定孩子请求体
 */
data class BindChildRequest(
    val studentId: String,
    val studentNickname: String? = null,
    val bindType: String? = null
)

/**
 * 家长端业务 API（对接 /api/v1/parents）
 * 与 web-frontend parentApi 一致。
 *
 * 注意：
 * 1. 所有路径不得以 / 开头，否则会覆盖 Retrofit baseUrl 中的 /api/ 路径段。
 * 2. 所有接口统一返回 {code, message, data} 信封，业务数据在 data 字段。
 */
interface ParentApiService {

    @POST("v1/parents/register")
    suspend fun register(
        @Body body: RegisterRequest
    ): ApiEnvelope<ParentLoginResponse>

    @POST("v1/parents/login")
    suspend fun login(
        @Body body: LoginRequest
    ): ApiEnvelope<ParentLoginResponse>

    @GET("v1/parents/me")
    suspend fun getMe(): ApiEnvelope<ParentLoginResponse>

    @POST("v1/parents/children/bind")
    suspend fun bindStudent(
        @Body body: BindChildRequest
    ): ApiEnvelope<ChildBinding>

    @GET("v1/parents/children")
    suspend fun listChildren(): ApiEnvelope<List<ChildBinding>>

    @GET("v1/parents/children/{bindingId}")
    suspend fun getChild(
        @Path("bindingId") bindingId: String
    ): ApiEnvelope<ChildBinding>

    @POST("v1/parents/children/{bindingId}/authorize")
    suspend fun authorizeChild(
        @Path("bindingId") bindingId: String,
        @Body body: AuthorizeChildRequest = AuthorizeChildRequest()
    ): ApiEnvelope<ChildBinding>

    @DELETE("v1/parents/children/{bindingId}")
    suspend fun unbindChild(
        @Path("bindingId") bindingId: String
    ): ApiEnvelope<Map<String, Boolean>>

    @GET("v1/parents/children/{bindingId}/mood")
    suspend fun getChildMood(
        @Path("bindingId") bindingId: String,
        @Query("days") days: Int = 7
    ): ApiEnvelope<List<MoodRecord>>

    @GET("v1/parents/emergency/alert")
    suspend fun getEmergencyAlert(): ApiEnvelope<EmergencyAlert>

    @POST("v1/parents/emergency/alert/{alertId}/confirm")
    suspend fun confirmAlert(
        @Path("alertId") alertId: String
    ): ApiEnvelope<EmergencyAlert>

    @GET("v1/parents/emergency/resources")
    suspend fun getEmergencyResources(): ApiEnvelope<List<EmergencyResource>>

    @GET("v1/parents/emergency/resources/{type}")
    suspend fun getResourcesByType(
        @Path("type") type: String
    ): ApiEnvelope<List<EmergencyResource>>
}

data class LoginRequest(
    val phone: String,
    val password: String
)

data class RegisterRequest(
    val phone: String,
    val password: String,
    val nickname: String
)

data class AuthorizeChildRequest(
    val authorized: Boolean = true
)
