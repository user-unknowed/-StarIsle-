package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "log"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // 生产环境需要严格验证
    },
}

// SendMessage - 发送消息
func SendMessage(c *gin.Context) {
    var req struct {
        UserId      string `json:"user_id" binding:"required"`
        Message     string `json:"message" binding:"required"`
        MessageType string `json:"message_type"` // "text" / "topic_card"
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // TODO: 实现消息发送逻辑
    // 1. 加密消息内容
    // 2. 调用AI服务生成回复
    // 3. 保存对话历史到MongoDB
    // 4. 触发风险检测
    
    c.JSON(http.StatusOK, gin.H{
        "message": "消息发送成功",
        "user_id": req.UserId,
        "response_time": 1500, // 模拟响应时间
    })
}

// GetChatHistory - 获取对话历史
func GetChatHistory(c *gin.Context) {
    userId := c.Param("userId")
    limit := c.DefaultQuery("limit", "50")
    
    // TODO: 从MongoDB查询对话历史
    
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "limit": limit,
        "messages": []map[string]interface{}{
            {
                "role": "user",
                "content": "今天感觉不太好",
                "timestamp": "2026-01-01T10:00:00Z",
            },
            {
                "role": "assistant",
                "content": "小星听到了。听起来你今天有点低落呢...",
                "timestamp": "2026-01-01T10:00:02Z",
            },
        },
    })
}

// HandleWebSocket - WebSocket连接处理
func HandleWebSocket(c *gin.Context) {
    userId := c.Param("userId")
    
    // 升级HTTP连接为WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()
    
    // TODO: 实现WebSocket消息处理
    // 1. 验证用户身份
    // 2. 接收用户消息
    // 3. 调用AI服务生成回复
    // 4. 推送回复给用户
    // 5. 实时风险检测
    
    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Read error: %v", err)
            break
        }
        
        log.Printf("Received from %s: %s", userId, message)
        
        // 模拟AI回复
        response := "小星收到了你的消息：" + string(message)
        err = conn.WriteMessage(messageType, []byte(response))
        if err != nil {
            log.Printf("Write error: %v", err)
            break
        }
    }
}

// GetTopicCards - 获取话题引导卡片
func GetTopicCards(c *gin.Context) {
    // TODO: 返回话题卡片列表
    
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