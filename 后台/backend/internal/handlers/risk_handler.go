package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// DetectRisk - 风险检测接口（内部调用）
func DetectRisk(c *gin.Context) {
    var req struct {
        UserId         string `json:"user_id" binding:"required"`
        Content        string `json:"content" binding:"required"`
        ContentType    string `json:"content_type" binding:"required"` // "chat" / "mood" / "assessment"
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // TODO: 实现风险检测逻辑
    // 1. L1关键词检测
    // 2. L2语义分析
    // 3. 综合用户历史计算风险等级
    // 4. 触发危机响应流程
    
    riskLevel := "green" // 模拟风险等级
    confidence := 0.95
    
    c.JSON(http.StatusOK, gin.H{
        "user_id": req.UserId,
        "risk_level": riskLevel,
        "confidence": confidence,
        "triggered_keywords": []string{},
        "need_intervention": false,
    })
}

// GetUserRiskLevel - 获取用户风险等级
func GetUserRiskLevel(c *gin.Context) {
    userId := c.Param("userId")
    
    // TODO: 从数据库查询用户风险等级
    
    c.JSON(http.StatusOK, gin.H{
        "user_id": userId,
        "current_risk_level": "green",
        "history": []map[string]interface{}{
            {"date": "2026-01-01", "level": "green"},
            {"date": "2026-01-02", "level": "yellow"},
        },
    })
}

// GetCrisisHotlines - 获取危机热线列表
func GetCrisisHotlines(c *gin.Context) {
    // TODO: 返回心理援助热线列表
    
    c.JSON(http.StatusOK, gin.H{
        "hotlines": []map[string]interface{}{
            {
                "name": "12355 青少年服务热线",
                "number": "12355",
                "description": "全国青少年心理咨询服务热线",
                "hours": "24小时",
            },
            {
                "name": "希望24热线",
                "number": "400-161-9995",
                "description": "全国心理危机干预热线",
                "hours": "24小时",
            },
            {
                "name": "全国公共卫生公益热线",
                "number": "12320",
                "description": "心理健康咨询服务",
                "hours": "24小时",
            },
        },
    })
}

// ReportCrisis - 危机事件上报
func ReportCrisis(c *gin.Context) {
    var req struct {
        UserId      string `json:"user_id" binding:"required"`
        RiskLevel   string `json:"risk_level" binding:"required"`
        TriggerType string `json:"trigger_type" binding:"required"` // "keyword" / "semantic" / "assessment"
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // TODO: 实现危机上报逻辑
    // 1. 记录危机事件
    // 2. 触发通知服务
    // 3. 如有授权，通知家长/学校
    
    c.JSON(http.StatusOK, gin.H{
        "message": "危机事件已上报",
        "user_id": req.UserId,
        "handled": true,
    })
}