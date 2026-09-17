// mood_handler.go - 心情打卡 HTTP 处理器，提供打卡、历史与图表数据
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦心情打卡模块，负责接收用户心情打卡、
// 查询心情历史记录以及生成情绪晴雨表图表数据。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "time"
)

// MoodCheckin 处理用户心情打卡请求
// Args:
//   - c: Gin 上下文，请求体包含用户ID、心情等级与情绪标签
func MoodCheckin(c *gin.Context) {
    // 定义请求结构：绑定用户ID、心情等级（1-5）与可选的情绪标签
    var req struct {
        UserId    string   `json:"user_id" binding:"required"`            // 用户唯一标识
        MoodLevel int      `json:"mood_level" binding:"required,min=1,max=5"` // 心情等级1-5
        Tags      []string `json:"tags"`                                // 情绪标签列表
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 实现心情打卡逻辑
    // 1. 验证用户ID
    // 2. 保存打卡记录到数据库
    // 3. 更新连续打卡天数
    // 4. 检查是否需要触发智能追问

    // 返回打卡成功响应，附带打卡日期与连续天数
    c.JSON(http.StatusOK, gin.H{
        "message":         "心情打卡成功",
        "checkin_date":    time.Now().Format("2026-01-02"),
        "mood_level":      req.MoodLevel,
        "continuous_days": 1,
    })
}

// GetMoodHistory 返回指定用户的心情历史记录
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID，从 query 获取查询天数
func GetMoodHistory(c *gin.Context) {
    // 读取用户ID与查询天数（默认7天）
    userId := c.Param("userId")
    days := c.DefaultQuery("days", "7")

    // TODO: 从数据库查询心情历史

    // 返回心情历史：按日期记录心情等级与情绪标签
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "days":    days,
        "history": []map[string]interface{}{
            {
                "date":       "2026-01-01",
                "mood_level": 4,
                "tags":       []string{"学习压力"},
            },
            {
                "date":       "2026-01-02",
                "mood_level": 3,
                "tags":       []string{"人际"},
            },
        },
    })
}

// GetMoodChart 返回指定用户的心情图表数据
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID
func GetMoodChart(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("userId")

    // TODO: 生成情绪晴雨表数据

    // 返回图表数据：按日期排列的心情等级，供前端渲染柱状图
    c.JSON(http.StatusOK, gin.H{
        "user_id":    userId,
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