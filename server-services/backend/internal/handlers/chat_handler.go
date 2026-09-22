// chat_handler.go - 对话服务 HTTP 处理器
//
// 混合型 handler：
//   - SendMessage: 编排型 — 调 AI /chat 生成回复，异步持久化到 Java，风险联动
//   - GetChatHistory: 透传到 Java 后端
//   - HandleWebSocket: 编排型 — WS 连接，逐条调 AI /chat，异步持久化
//   - GetTopicCards: 编排型 — 调 AI /topics 获取话题卡片
package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"starisle-backend/internal/service"
)

// upgrader 是 WebSocket 升级器
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 生产环境需严格校验
	},
}

// SendMessage 编排型 handler：
// 1. 调 AI 引擎 POST /chat 获取回复 + 风险等级
// 2. 异步 POST Java /api/v1/chat/message 持久化对话历史
// 3. 若 risk_level 为 red/orange，异步触发危机上报
func SendMessage(c *gin.Context) {
	var req service.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. 调 AI 引擎生成回复
	aiResp, err := AICli.Chat(c.Request.Context(), &req)
	if err != nil {
		log.Printf("[SendMessage] AI 对话失败 user=%s: %v", req.UserId, err)
		c.JSON(http.StatusBadGateway, gin.H{
			"error":    "AI 服务暂时不可用，请稍后再试",
			"user_id":  req.UserId,
			"fallback": true,
		})
		return
	}

	// 2. 异步持久化到 Java 后端（不阻塞响应）
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err := JavaCli.Post(ctx, "/api/v1/chat/message", map[string]interface{}{
			"user_id":      req.UserId,
			"message":      req.Message,
			"response":     aiResp.Response,
			"risk_level":   aiResp.RiskLevel,
			"emotion_tags": aiResp.EmotionTags,
		})
		if err != nil {
			log.Printf("[SendMessage] 持久化失败 user=%s: %v", req.UserId, err)
		}
	}()

	// 3. 风险联动：高危时触发危机上报
	if aiResp.RiskLevel == "red" || aiResp.RiskLevel == "orange" {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			err := JavaCli.Post(ctx, "/api/v1/crisis/report", map[string]interface{}{
				"user_id":      req.UserId,
				"risk_level":   aiResp.RiskLevel,
				"trigger_type": "semantic",
			})
			if err != nil {
				log.Printf("[SendMessage] 危机上报失败 user=%s: %v", req.UserId, err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "消息发送成功",
		"user_id":         req.UserId,
		"response":        aiResp.Response,
		"risk_level":      aiResp.RiskLevel,
		"emotion_tags":    aiResp.EmotionTags,
		"response_time":   aiResp.ResponseTimeMs,
		"rag_enhanced":    aiResp.RagEnhanced,
		"knowledge_mode":  aiResp.KnowledgeMode,
	})
}

// GetChatHistory 透传到 Java 后端 GET /api/v1/chat/history/:userId
func GetChatHistory(c *gin.Context) {
	JavaCli.Proxy(c)
}

// HandleWebSocket 编排型 handler：
// 升级 WS 连接，循环读取消息 → 调 AI /chat → 回写客户端 → 异步持久化
func HandleWebSocket(c *gin.Context) {
	userId := c.Param("userId")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS] 升级失败 user=%s: %v", userId, err)
		return
	}
	defer conn.Close()

	// 设置读写超时
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// 启动心跳 ping
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] 读错误 user=%s: %v", userId, err)
			}
			break
		}

		// 调 AI 引擎生成回复
		aiReq := &service.ChatRequest{
			UserId:  userId,
			Message: string(message),
		}
		aiResp, err := AICli.Chat(context.Background(), aiReq)
		if err != nil {
			log.Printf("[WS] AI 调用失败 user=%s: %v", userId, err)
			// 降级回复
			if err := conn.WriteMessage(websocket.TextMessage, []byte("小星暂时忙不过来，请稍后再试")); err != nil {
				break
			}
			continue
		}

		// 回写客户端
		if err := conn.WriteMessage(websocket.TextMessage, []byte(aiResp.Response)); err != nil {
			break
		}

		// 异步持久化
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_ = JavaCli.Post(ctx, "/api/v1/chat/message", map[string]interface{}{
				"user_id":      userId,
				"message":      string(message),
				"response":     aiResp.Response,
				"risk_level":   aiResp.RiskLevel,
				"emotion_tags": aiResp.EmotionTags,
			})
		}()

		// 风险联动
		if aiResp.RiskLevel == "red" || aiResp.RiskLevel == "orange" {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				_ = JavaCli.Post(ctx, "/api/v1/crisis/report", map[string]interface{}{
					"user_id":      userId,
					"risk_level":   aiResp.RiskLevel,
					"trigger_type": "semantic",
				})
			}()
		}
	}
}

// GetTopicCards 编排型 handler：调 AI 引擎 GET /topics 获取话题卡片
func GetTopicCards(c *gin.Context) {
	topics, err := AICli.GetTopics(c.Request.Context())
	if err != nil {
		log.Printf("[GetTopicCards] AI 获取话题失败: %v", err)
		// 降级：返回预设话题
		c.JSON(http.StatusOK, gin.H{
			"topics": []map[string]interface{}{
				{"id": "topic_1", "title": "聊聊最近的压力", "icon": "压力"},
				{"id": "topic_2", "title": "关于朋友的事", "icon": "朋友"},
				{"id": "topic_3", "title": "未来让我有点焦虑", "icon": "未来"},
				{"id": "topic_4", "title": "和家人相处", "icon": "家庭"},
				{"id": "topic_5", "title": "没有什么特别的事，就是有点闷", "icon": "心情"},
			},
			"degraded": true,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"topics": topics,
	})
}
