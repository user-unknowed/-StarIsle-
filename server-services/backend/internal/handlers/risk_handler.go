// risk_handler.go - 风险检测与危机响应 HTTP 处理器
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦风险检测模块，负责对用户内容进行风险检测、
// 查询用户风险等级、提供心理援助热线以及处理危机事件上报。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// DetectRisk 风险检测接口（内部调用），对用户内容进行风险分析
// Args:
//   - c: Gin 上下文，请求体包含用户ID、待检测内容与内容类型
func DetectRisk(c *gin.Context) {
    // 定义请求结构：绑定用户ID、检测内容与内容类型
    var req struct {
        UserId      string `json:"user_id" binding:"required"`       // 用户唯一标识
        Content     string `json:"content" binding:"required"`       // 待检测的文本内容
        ContentType string `json:"content_type" binding:"required"` // 内容类型：chat / mood / assessment
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 实现风险检测逻辑
    // 1. L1关键词检测
    // 2. L2语义分析
    // 3. 综合用户历史计算风险等级
    // 4. 触发危机响应流程

    // 模拟风险等级与置信度，供下游判断是否需要干预
    riskLevel := "green" // 模拟风险等级
    confidence := 0.95

    // 返回风险检测结果：包含等级、置信度、触发关键词与是否需要干预
    c.JSON(http.StatusOK, gin.H{
        "user_id":            req.UserId,
        "risk_level":         riskLevel,
        "confidence":        confidence,
        "triggered_keywords": []string{},
        "need_intervention":  false,
    })
}

// GetUserRiskLevel 返回指定用户的风险等级及历史
// Args:
//   - c: Gin 上下文，从 URL 参数获取用户ID
func GetUserRiskLevel(c *gin.Context) {
    // 读取用户ID
    userId := c.Param("userId")

    // TODO: 从数据库查询用户风险等级

    // 返回当前风险等级与历史变化记录
    c.JSON(http.StatusOK, gin.H{
        "user_id":             userId,
        "current_risk_level": "green",
        "history": []map[string]interface{}{
            {"date": "2026-01-01", "level": "green"},
            {"date": "2026-01-02", "level": "yellow"},
        },
    })
}

// GetCrisisHotlines 返回心理援助热线列表
// Args:
//   - c: Gin 上下文
func GetCrisisHotlines(c *gin.Context) {
    // TODO: 返回心理援助热线列表

    // 返回预设心理援助热线：包含名称、号码、简介与服务时段
    c.JSON(http.StatusOK, gin.H{
        "hotlines": []map[string]interface{}{
            {
                "name":        "12355 青少年服务热线",
                "number":      "12355",
                "description": "全国青少年心理咨询服务热线",
                "hours":       "24小时",
            },
            {
                "name":        "希望24热线",
                "number":      "400-161-9995",
                "description": "全国心理危机干预热线",
                "hours":       "24小时",
            },
            {
                "name":        "全国公共卫生公益热线",
                "number":      "12320",
                "description": "心理健康咨询服务",
                "hours":       "24小时",
            },
        },
    })
}

// ReportCrisis 处理危机事件上报请求
// Args:
//   - c: Gin 上下文，请求体包含用户ID、风险等级与触发类型
func ReportCrisis(c *gin.Context) {
    // 定义请求结构：绑定用户ID、风险等级与触发类型
    var req struct {
        UserId      string `json:"user_id" binding:"required"`       // 用户唯一标识
        RiskLevel   string `json:"risk_level" binding:"required"`   // 风险等级
        TriggerType string `json:"trigger_type" binding:"required"` // 触发类型：keyword / semantic / assessment
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 实现危机上报逻辑
    // 1. 记录危机事件
    // 2. 触发通知服务
    // 3. 如有授权，通知家长/学校

    // 返回上报成功响应，标记事件已处理
    c.JSON(http.StatusOK, gin.H{
        "message": "危机事件已上报",
        "user_id": req.UserId,
        "handled": true,
    })
}