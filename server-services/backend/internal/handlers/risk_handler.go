// risk_handler.go - 危机信号检测与危机响应 HTTP 处理器
//
// 混合型 handler：
//   - DetectRisk: 编排型 — 调 AI 引擎 /risk/check，危机信号为真时联动 Java 危机上报
//   - GetCrisisHotlines: 透传到 Java 后端
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
// 1. 调 AI 引擎 POST /risk/check 获取危机信号
// 2. 若 crisis 为 true，异步调 Java 后端 POST /api/v1/crisis/report 触发危机上报
func DetectRisk(c *gin.Context) {
	var req service.RiskCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 调 AI 引擎进行危机信号检测
	aiResp, err := AICli.CheckRisk(c.Request.Context(), &req)
	if err != nil {
		log.Printf("[DetectRisk] AI 危机检测失败 user=%s: %v", req.UserId, err)
		// 降级：返回非危机 + 低置信度，不阻塞流程
		c.JSON(http.StatusOK, gin.H{
			"user_id":            req.UserId,
			"crisis":             false,
			"need_intervention":  false,
			"confidence":         0.0,
			"triggered_keywords": []string{},
			"degraded":           true,
		})
		return
	}

	// 危机联动：异步触发危机上报
	if aiResp.Crisis {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			err := JavaCli.Post(ctx, "/api/v1/crisis/report", map[string]interface{}{
				"user_id":      req.UserId,
				"crisis":       true,
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
		"crisis":             aiResp.Crisis,
		"need_intervention":  aiResp.NeedIntervention,
		"confidence":         aiResp.Confidence,
		"triggered_keywords": []string{},
	})
}

// GetCrisisHotlines 透传到 Java 后端 GET /api/v1/crisis/hotlines
func GetCrisisHotlines(c *gin.Context) {
	JavaCli.Proxy(c)
}

// ReportCrisis 透传到 Java 后端 POST /api/v1/crisis/report
func ReportCrisis(c *gin.Context) {
	JavaCli.Proxy(c)
}
