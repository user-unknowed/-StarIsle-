package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// GetMeditationList - 获取冥想内容列表
func GetMeditationList(c *gin.Context) {
    category := c.DefaultQuery("category", "all")
    
    // TODO: 从数据库查询冥想内容
    
    c.JSON(http.StatusOK, gin.H{
        "category": category,
        "meditations": []map[string]interface{}{
            {
                "id": "meditation_1",
                "title": "考前放松",
                "duration": 5,
                "category": "学习",
                "audio_url": "https://cdn.example.com/meditation1.mp3",
                "description": "帮助缓解考试焦虑，提升专注力",
            },
            {
                "id": "meditation_2",
                "title": "入睡引导",
                "duration": 8,
                "category": "睡眠",
                "audio_url": "https://cdn.example.com/meditation2.mp3",
                "description": "深度放松，引导进入睡眠",
            },
            {
                "id": "meditation_3",
                "title": "情绪安抚",
                "duration": 5,
                "category": "情绪",
                "audio_url": "https://cdn.example.com/meditation3.mp3",
                "description": "安抚情绪风暴，找回内心平静",
            },
        },
    })
}

// GetMeditationDetail - 获取冥想详情
func GetMeditationDetail(c *gin.Context) {
    meditationId := c.Param("id")
    
    // TODO: 从数据库查询冥想详情
    
    c.JSON(http.StatusOK, gin.H{
        "id": meditationId,
        "title": "考前放松",
        "duration": 5,
        "audio_url": "https://cdn.example.com/meditation1.mp3",
        "background_image": "https://cdn.example.com/background1.jpg",
        "script": "闭上眼睛，深呼吸...",
    })
}

// GetBreathingExercise - 获取呼吸练习
func GetBreathingExercise(c *gin.Context) {
    breathType := c.Param("type") // "4-7-8" / "box"
    
    // TODO: 返回呼吸练习配置
    
    c.JSON(http.StatusOK, gin.H{
        "type": breathType,
        "steps": []map[string]interface{}{
            {"name": "吸气", "duration": 4, "instruction": "慢慢吸气"},
            {"name": "屏息", "duration": 7, "instruction": "屏住呼吸"},
            {"name": "呼气", "duration": 8, "instruction": "慢慢呼气"},
        },
        "recommended_duration": 3, // 分钟
        "animation_url": "https://cdn.example.com/breathing_animation.json",
    })
}