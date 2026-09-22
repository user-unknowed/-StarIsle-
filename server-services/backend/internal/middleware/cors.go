// Package middleware 提供星屿 API 网关的跨切面中间件，
// 包括 CORS、请求日志、JWT 鉴权与限流。
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS 返回跨域资源共享中间件，按配置白名单放行来源。
// 生产环境应将 AllowedOrigins 收紧为具体域名列表。
func CORS(allowedOrigins []string) gin.HandlerFunc {
	// 构建 origin 查找集合
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	allowAll := false
	if len(allowedOrigins) == 0 {
		allowAll = true
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if allowAll || originSet[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Max-Age", "3600")
		}

		// 预检请求直接返回 204
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
