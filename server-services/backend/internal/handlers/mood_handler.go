// mood_handler.go - 心情打卡 HTTP 处理器
//
// 透传型 handler：所有请求原样代理到 Java 后端。
package handlers

import "github.com/gin-gonic/gin"

// MoodCheckin 透传到 Java 后端 POST /api/v1/mood/checkin
func MoodCheckin(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetMoodHistory 透传到 Java 后端 GET /api/v1/mood/history/:userId
func GetMoodHistory(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetMoodChart 透传到 Java 后端 GET /api/v1/mood/chart/:userId
func GetMoodChart(c *gin.Context) {
	JavaCli.Proxy(c)
}
