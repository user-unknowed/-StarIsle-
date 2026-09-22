package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"starisle-backend/internal/config"
)

// jwtClaims 是 JWT 解析后使用的 claims 结构
type jwtClaims struct {
	UserId string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Authentication 返回 JWT 鉴权中间件。
// 公开路由（注册、登录、健康检查、危机热线）不需要 token，
// 其余路由要求有效 Bearer JWT。
func Authentication(cfg *config.Config) gin.HandlerFunc {
	// 公开路由前缀：不需要 token 即可访问
	publicPaths := map[string]bool{
		"/api/v1/users/register": true,
		"/api/v1/users/login":    true,
		"/api/v1/parents/register": true,
		"/api/v1/parents/login":    true,
		"/health":                  true,
		"/api/v1/risk/crisis/hotlines": true,
		"/api/v1/content":             true, // /api/v1/content/** 公开
		"/api/v1/chat/topics":         true,
	}

	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// 公开路由直接放行
		if publicPaths[path] || strings.HasPrefix(path, "/api/v1/content/") {
			c.Next()
			return
		}

		// WebSocket 端点放行（鉴权在连接参数中处理）
		if strings.HasPrefix(path, "/ws/") {
			c.Next()
			return
		}

		// 从 Authorization 头提取 Bearer token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "缺少认证信息"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "认证格式错误"})
			return
		}

		tokenStr := parts[1]

		// 解析并验证 JWT
		token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		}, jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}))

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "认证信息无效或已过期"})
			return
		}

		// 注入用户信息到上下文，供后续 handler 使用
		if claims, ok := token.Claims.(*jwtClaims); ok {
			c.Set("user_id", claims.UserId)
			c.Set("role", claims.Role)
		}

		c.Next()
	}
}
