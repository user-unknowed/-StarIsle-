// assessment_handler.go - 心理测评相关 HTTP 处理器，提供题目获取、提交与结果查询
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦测评模块，负责返回 PHQ-9 等量表题目、
// 接收用户作答并计算总分、以及查询历史测评结果。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// GetAssessmentQuestions 根据测评类型返回测评题目列表
// Args:
//   - c: Gin 上下文，从 URL 参数 type 获取测评类型（emotional/stress/relationship）
func GetAssessmentQuestions(c *gin.Context) {
    // 读取测评类型参数，映射到 PHQ-9 等量表
    assessmentType := c.Param("type") // "emotional" / "stress" / "relationship"

    // TODO: 从数据库查询测评题目
    // PHQ-9映射版

    // 返回题目结构：包含题干、选项与权重
    c.JSON(http.StatusOK, gin.H{
        "type":        assessmentType,
        "title":       "情绪探索",
        "description": "了解你最近的情绪状态",
        "questions": []map[string]interface{}{
            {
                "id":       "q1",
                "question": "最近两周，你感到心情低落、沮丧或绝望的频率是？",
                "options":  []string{"完全没有", "有几天", "超过一半的时间", "几乎每天"},
                "weight":   1,
            },
            {
                "id":       "q2",
                "question": "最近两周，你对平时感兴趣的事情失去兴趣的频率是？",
                "options":  []string{"完全没有", "有几天", "超过一半的时间", "几乎每天"},
                "weight":   1,
            },
            // ... 共9题
        },
        "total_questions": 9,
    })
}

// SubmitAssessment 接收用户测评作答并返回测评提交结果
// Args:
//   - c: Gin 上下文，请求体包含用户ID、测评类型与各题得分
func SubmitAssessment(c *gin.Context) {
    // 定义请求结构：绑定用户ID、测评类型与作答分值列表
    var req struct {
        UserId  string `json:"user_id" binding:"required"`           // 用户唯一标识
        Type    string `json:"type" binding:"required"`             // 测评类型
        Answers []int  `json:"answers" binding:"required"`         // 每题得分列表
    }

    // 解析并校验请求 JSON，失败返回 400
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // TODO: 计算测评结果
    // 1. 计算总分
    // 2. 判断风险等级
    // 3. 生成个性化建议
    // 4. 保存结果到数据库

    // 累加各题得分得到总分
    totalScore := 0
    for _, answer := range req.Answers {
        totalScore += answer
    }

    // 返回提交成功响应，附带总分与结果ID
    c.JSON(http.StatusOK, gin.H{
        "message":     "测评提交成功",
        "user_id":     req.UserId,
        "total_score": totalScore,
        "result_id":   "generated-result-id",
    })
}

// GetAssessmentResult 根据结果ID返回测评结果详情
// Args:
//   - c: Gin 上下文，从 URL 参数 id 获取测评结果ID
func GetAssessmentResult(c *gin.Context) {
    // 读取测评结果ID
    resultId := c.Param("id")

    // TODO: 从数据库查询测评结果

    // 返回结果详情：包含总分、风险等级、描述与建议
    c.JSON(http.StatusOK, gin.H{
        "result_id":      resultId,
        "total_score":    5,
        "risk_level":     "green",
        "description":    "你最近的心情好像还不错呢！继续保持～",
        "suggestions": []string{
            "继续每天的心情打卡，观察情绪变化",
            "试试我们的呼吸练习，保持放松",
            "和小星聊聊你最近的开心事",
        },
        "recommendations": []map[string]interface{}{
            {"type": "meditation", "id": "meditation_1", "title": "考前放松"},
        },
    })
}