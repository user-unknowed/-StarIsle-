package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// GetAssessmentQuestions - 获取测评题目
func GetAssessmentQuestions(c *gin.Context) {
    assessmentType := c.Param("type") // "emotional" / "stress" / "relationship"
    
    // TODO: 从数据库查询测评题目
    // PHQ-9映射版
    
    c.JSON(http.StatusOK, gin.H{
        "type": assessmentType,
        "title": "情绪探索",
        "description": "了解你最近的情绪状态",
        "questions": []map[string]interface{}{
            {
                "id": "q1",
                "question": "最近两周，你感到心情低落、沮丧或绝望的频率是？",
                "options": []string{"完全没有", "有几天", "超过一半的时间", "几乎每天"},
                "weight": 1,
            },
            {
                "id": "q2",
                "question": "最近两周，你对平时感兴趣的事情失去兴趣的频率是？",
                "options": []string{"完全没有", "有几天", "超过一半的时间", "几乎每天"},
                "weight": 1,
            },
            // ... 共9题
        },
        "total_questions": 9,
    })
}

// SubmitAssessment - 提交测评结果
func SubmitAssessment(c *gin.Context) {
    var req struct {
        UserId    string `json:"user_id" binding:"required"`
        Type      string `json:"type" binding:"required"`
        Answers   []int  `json:"answers" binding:"required"` // 每题得分
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // TODO: 计算测评结果
    // 1. 计算总分
    // 2. 判断风险等级
    // 3. 生成个性化建议
    // 4. 保存结果到数据库
    
    totalScore := 0
    for _, answer := range req.Answers {
        totalScore += answer
    }
    
    c.JSON(http.StatusOK, gin.H{
        "message": "测评提交成功",
        "user_id": req.UserId,
        "total_score": totalScore,
        "result_id": "generated-result-id",
    })
}

// GetAssessmentResult - 获取测评结果
func GetAssessmentResult(c *gin.Context) {
    resultId := c.Param("id")
    
    // TODO: 从数据库查询测评结果
    
    c.JSON(http.StatusOK, gin.H{
        "result_id": resultId,
        "total_score": 5,
        "risk_level": "green",
        "description": "你最近的心情好像还不错呢！继续保持～",
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