// risk_handler.go - 风险检测与危机响应 HTTP 处理器
//
// 混合型 handler：
//   - DetectRisk: 编排型 — 调 AI 引擎 /risk/check，高危时联动 Java 危机上报
//   - GetUserRiskLevel, GetCrisisHotlines: 透传到 Java 后端
//   - ReportCrisis: 透传到 Java 后端
package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"starisle-backend/internal/service"
)

// DetectRisk 编排型 handler：
// 1. 调 AI 引擎 POST /risk/check 获取风险等级
// 2. 若返回 red 或 orange，异步调 Java 后端 POST /api/v1/crisis/report 触发危机上报
func DetectRisk(c *gin.Context) {
	var req service.RiskCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 调 AI 引擎进行风险检测
	aiResp, err := AICli.CheckRisk(c.Request.Context(), &req)
	if err != nil {
		log.Printf("[DetectRisk] AI 风险检测失败 user=%s: %v", req.UserId, err)
		// 降级：返回 green + 低置信度，不阻塞流程
		c.JSON(http.StatusOK, gin.H{
			"user_id":            req.UserId,
			"risk_level":         "green",
			"confidence":         0.0,
			"triggered_keywords": []string{},
			"need_intervention":  false,
			"degraded":           true,
		})
		return
	}

	needIntervention := aiResp.RiskLevel == "red" || aiResp.RiskLevel == "orange"

	// 高危联动：异步触发危机上报
	if needIntervention {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			err := JavaCli.Post(ctx, "/api/v1/crisis/report", map[string]interface{}{
				"user_id":      req.UserId,
				"risk_level":   aiResp.RiskLevel,
				"trigger_type": "semantic",
				"content_type": req.ContentType,
				"confidence":   aiResp.Confidence,
			})
			if err != nil {
				log.Printf("[DetectRisk] 危机上报失败 user=%s: %v", req.UserId, err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":            req.UserId,
		"risk_level":         aiResp.RiskLevel,
		"confidence":          aiResp.Confidence,
		"triggered_keywords": []string{},
		"need_intervention":  needIntervention,
	})
}

// GetUserRiskLevel 透传到 Java 后端 GET /api/v1/risk/level/:userId
func GetUserRiskLevel(c *gin.Context) {
	JavaCli.Proxy(c)
}

// GetCrisisHotlines 透传到 Java 后端 GET /api/v1/crisis/hotlines
func GetCrisisHotlines(c *gin.Context) {
	JavaCli.Proxy(c)
}

// ReportCrisis 透传到 Java 后端 POST /api/v1/crisis/report
func ReportCrisis(c *gin.Context) {
	JavaCli.Proxy(c)
}
