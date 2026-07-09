package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "time"
)

// MoodCheckin - 心情打卡
func MoodCheckin(c *gin.Context) {
    var req struct {
        UserId     string `json:"user_id" binding:"required"`
        MoodLevel  int    `json:"mood_level" binding:"required,min=1,max=5"`
        Tags       []string `json:"tags"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // TODO: 实现心情打卡逻辑
    // 1. 验证用户ID
    // 2. 保存打卡记录到数据库
    // 3. 更新连续打卡天数
    // 4. 检查是否需要触发智能追问
    
    c.JSON(http.StatusOK, gin.H{
        "message": "心情打卡成功",
        "checkin_date": time.Now().Format("2026-01-02"),
        "mood_level": req.MoodLevel,
        "continuous_days": 1,
    })
}

// GetMoodHistory - 获取心情历史记录
func GetMoodHistory(c *gin.Context) {
    userId := c.Param("userId")
    days := c.DefaultQuery("days", "7")
    
    // TODO: 从数据库查询心情历史
    
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "days": days,
        "history": []map[string]interface{}{
            {
                "date": "2026-01-01",
                "mood_level": 4,
                "tags": []string{"学习压力"},
            },
            {
                "date": "2026-01-02",
                "mood_level": 3,
                "tags": []string{"人际"},
            },
        },
    })
}

// GetMoodChart - 获取心情图表数据
func GetMoodChart(c *gin.Context) {
    userId := c.Param("userId")
    
    // TODO: 生成情绪晴雨表数据
    
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "chart_type": "bar",
        "data": []map[string]interface{}{
            {"date": "2026-01-01", "value": 4},
            {"date": "2026-01-02", "value": 3},
            {"date": "2026-01-03", "value": 2},
            {"date": "2026-01-04", "value": 5},
            {"date": "2026-01-05", "value": 4},
            {"date": "2026-01-06", "value": 3},
            {"date": "2026-01-07", "value": 4},
        },
    })
}