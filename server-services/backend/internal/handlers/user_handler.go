// user_handler.go - 用户管理 HTTP 处理器
//
// 透传型 handler：所有请求原样代理到 Java 后端，不引入业务逻辑。
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheck 健康检查接口，供负载均衡与容器编排做存活探测
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "starisle-api-gateway",
		"version": "2.1.0",
	})
}

// RegisterUser 透传到 Java 后端 POST /api/v1/users/register
func RegisterUser(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetUser 透传到 Java 后端 GET /api/v1/users/:id
func GetUser(c *gin.Context) {
	JavaCli.Proxy(c)
}

// UpdateUser 透传到 Java 后端 PUT /api/v1/users/:id
func UpdateUser(c *gin.Context) {
	JavaCli.Proxy(c)
}

// DeleteUser 透传到 Java 后端 DELETE /api/v1/users/:id
func DeleteUser(c *gin.Context) {
	JavaCli.Proxy(c)
}

// ExportUserData 透传到 Java 后端 GET /api/v1/users/:id/export
func ExportUserData(c *gin.Context) {
	JavaCli.Proxy(c)
}
