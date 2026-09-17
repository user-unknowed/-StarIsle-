// chat_handler.go - 对话服务 HTTP 处理器，提供消息收发、历史查询、WebSocket 与话题卡片
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦对话模块，负责接收用户消息、查询对话历史、
// 维护 WebSocket 长连接以及下发话题引导卡片。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "log"
)

// upgrader 是 WebSocket 升级器，将 HTTP 连接升级为 WebSocket 连接
var upgrader = websocket.Upgrader{
    // CheckOrigin 校验请求来源，当前实现允许所有来源（生产环境需严格校验）
    CheckOrigin: func(r *http.Request) bool {
        return true // 生产环境需要严格验证
    },
}

// SendMessage 处理用户发送对话消息的请求
// Args:
//   - c: Gin 上下文，请求体包含用户ID、消息内容与消息类型
func SendMessage(c *gin.Context) {
    // 定义请求结构：绑定用户ID、消息内容与可选的消息类型
    var req struct {
        UserId      string `json:"user_id" binding:"required"`      // 用户唯一标识
        Message     string `json:"message" binding:"required"`      // 消息文本内容
        MessageType string `json:"message_type"`                   // 消息类型：text / topic_card
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 实现消息发送逻辑
    // 1. 加密消息内容
    // 2. 调用AI服务生成回复
    // 3. 保存对话历史到MongoDB
    // 4. 触发风险检测

    // 返回发送成功响应，附带模拟响应时间
    c.JSON(http.StatusOK, gin.H{
        "message":       "消息发送成功",
        "user_id":       req.UserId,
        "response_time": 1500, // 模拟响应时间
    })
}

// GetChatHistory 返回指定用户的对话历史记录
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID，从 query 获取条数限制
func GetChatHistory(c *gin.Context) {
    // 读取用户ID与历史条数限制（默认50条）
    userId := c.Param("userId")
    limit := c.DefaultQuery("limit", "50")

    // TODO: 从MongoDB查询对话历史

    // 返回对话历史：按角色区分用户与助手消息
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "limit":   limit,
        "messages": []map[string]interface{}{
            {
                "role":      "user",
                "content":   "今天感觉不太好",
                "timestamp": "2026-01-01T10:00:00Z",
            },
            {
                "role":      "assistant",
                "content":   "小星听到了。听起来你今天有点低落呢...",
                "timestamp": "2026-01-01T10:00:02Z",
            },
        },
    })
}

// HandleWebSocket 处理 WebSocket 长连接，负责实时双向消息收发
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID
func HandleWebSocket(c *gin.Context) {
    // 读取用户ID，用于标识连接归属
    userId := c.Param("userId")

    // 升级HTTP连接为WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        // 升级失败记录日志并返回
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    // 函数返回时关闭连接，确保资源释放
    defer conn.Close()

    // TODO: 实现WebSocket消息处理
    // 1. 验证用户身份
    // 2. 接收用户消息
    // 3. 调用AI服务生成回复
    // 4. 推送回复给用户
    // 5. 实时风险检测

    // 循环读取并回写消息，直至连接断开或读写出错
    for {
        // 读取客户端消息
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            // 读取失败通常意味着连接关闭，记录后退出循环
            log.Printf("Read error: %v", err)
            break
        }

        // 记录收到的消息，便于调试追踪
        log.Printf("Received from %s: %s", userId, message)

        // 模拟AI回复：将用户消息原样拼接后回写
        response := "小星收到了你的消息：" + string(message)
        err = conn.WriteMessage(messageType, []byte(response))
        if err != nil {
            // 写入失败记录后退出循环
            log.Printf("Write error: %v", err)
            break
        }
    }
}

// GetTopicCards 返回话题引导卡片列表，帮助用户开启对话
// Args:
//   - c: Gin 上下文
func GetTopicCards(c *gin.Context) {
    // TODO: 返回话题卡片列表

    // 返回预设话题卡片：包含主题、标题与图标
    c.JSON(http.StatusOK, gin.H{
        "topics": []map[string]interface{}{
            {"id": "topic_1", "title": "聊聊最近的压力", "icon": "压力"},
            {"id": "topic_2", "title": "关于朋友的事", "icon": "朋友"},
            {"id": "topic_3", "title": "未来让我有点焦虑", "icon": "未来"},
            {"id": "topic_4", "title": "和家人相处", "icon": "家庭"},
            {"id": "topic_5", "title": "没有什么特别的事，就是有点闷", "icon": "心情"},
        },
    })
}