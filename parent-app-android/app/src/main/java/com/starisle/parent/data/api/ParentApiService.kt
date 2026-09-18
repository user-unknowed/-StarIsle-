package com.starisle.parent.data.api

import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.data.models.EmergencyAlert
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.data.models.MoodRecord
import com.starisle.parent.data.models.ParentLoginResponse
import com.starisle.parent.data.models.ParentUser
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
 * 家长端业务 API（对接 /v1/parents）
 * 与 web-frontend parentApi 一致。
 */
interface ParentApiService {

    @POST("/v1/parents/register")
    suspend fun register(
        @Body body: RegisterRequest
    ): ParentLoginResponse

    @POST("/v1/parents/login")
    suspend fun login(
        @Body body: LoginRequest
    ): ParentLoginResponse

    @GET("/v1/parents/me")
    suspend fun getMe(): ParentUser

    @POST("/v1/parents/children/bind")
    suspend fun bindStudent(
        @Body body: BindChildRequest
    ): ChildBinding

    @GET("/v1/parents/children")
    suspend fun listChildren(): List<ChildBinding>

    @GET("/v1/parents/children/{bindingId}")
    suspend fun getChild(
        @Path("bindingId") bindingId: String
    ): ChildBinding

    @POST("/v1/parents/children/{bindingId}/authorize")
    suspend fun authorizeChild(
        @Path("bindingId") bindingId: String,
        @Body body: AuthorizeChildRequest = AuthorizeChildRequest()
    ): ChildBinding

    @DELETE("/v1/parents/children/{bindingId}")
    suspend fun unbindChild(
        @Path("bindingId") bindingId: String
    ): Map<String, Boolean>

    @GET("/v1/parents/children/{bindingId}/mood")
    suspend fun getChildMood(
        @Path("bindingId") bindingId: String,
        @Query("days") days: Int = 7
    ): List<MoodRecord>

    @GET("/v1/parents/emergency/alert")
    suspend fun getEmergencyAlert(): EmergencyAlert?

    @POST("/v1/parents/emergency/alert/{alertId}/confirm")
    suspend fun confirmAlert(
        @Path("alertId") alertId: String
    ): EmergencyAlert

    @GET("/v1/parents/emergency/resources")
    suspend fun getEmergencyResources(): List<EmergencyResource>

    @GET("/v1/parents/emergency/resources/{type}")
    suspend fun getResourcesByType(
        @Path("type") type: String
    ): List<EmergencyResource>
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
