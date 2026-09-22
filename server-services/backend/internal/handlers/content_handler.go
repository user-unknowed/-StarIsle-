// content_handler.go - 内容服务 HTTP 处理器，提供冥想与呼吸练习内容
//
// Package handlers 提供星屿后端各业务接口的 HTTP 处理逻辑，
// 本文件聚焦内容模块，负责返回冥想音轨列表与详情、
// 以及不同类型的呼吸练习配置。
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

// GetMeditationList 返回冥想内容列表，可按分类筛选
// Args:
//   - c: Gin 上下文，从 query 参数 category 获取分类（默认 all）
func GetMeditationList(c *gin.Context) {
    // 读取分类筛选条件，缺省返回全部分类
    category := c.DefaultQuery("category", "all")

    // TODO: 从数据库查询冥想内容

    // 返回冥想列表：包含标题、时长、分类、音频地址与简介
    c.JSON(http.StatusOK, gin.H{
        "category": category,
        "meditations": []map[string]interface{}{
            {
                "id":          "meditation_1",
                "title":       "考前放松",
                "duration":    5,
                "category":    "学习",
                "audio_url":   "https://cdn.example.com/meditation1.mp3",
                "description": "帮助缓解考试焦虑，提升专注力",
            },
            {
                "id":          "meditation_2",
                "title":       "入睡引导",
                "duration":    8,
                "category":    "睡眠",
                "audio_url":   "https://cdn.example.com/meditation2.mp3",
                "description": "深度放松，引导进入睡眠",
            },
            {
                "id":          "meditation_3",
                "title":       "情绪安抚",
                "duration":    5,
                "category":    "情绪",
                "audio_url":   "https://cdn.example.com/meditation3.mp3",
                "description": "安抚情绪风暴，找回内心平静",
            },
        },
    })
}

// GetMeditationDetail 根据冥想ID返回冥想详情
// Args:
//   - c: Gin 上下文，从 URL 参数 id 获取冥想ID
func GetMeditationDetail(c *gin.Context) {
    // 读取冥想ID
    meditationId := c.Param("id")

    // TODO: 从数据库查询冥想详情

    // 返回冥想详情：包含音频地址、背景图与引导文案
    c.JSON(http.StatusOK, gin.H{
        "id":               meditationId,
        "title":            "考前放松",
        "duration":         5,
        "audio_url":        "https://cdn.example.com/meditation1.mp3",
        "background_image": "https://cdn.example.com/background1.jpg",
        "script":           "闭上眼睛，深呼吸...",
    })
}

// GetBreathingExercise 根据呼吸类型返回呼吸练习配置
// Args:
//   - c: Gin 上下文，从 URL 参数 type 获取呼吸练习类型（4-7-8 / box）
func GetBreathingExercise(c *gin.Context) {
    // 读取呼吸练习类型，决定吸气/屏息/呼气节奏
    breathType := c.Param("type") // "4-7-8" / "box"

    // TODO: 返回呼吸练习配置

    // 返回呼吸步骤配置：包含吸气、屏息、呼气时长与引导语
    c.JSON(http.StatusOK, gin.H{
        "type": breathType,
        "steps": []map[string]interface{}{
            {"name": "吸气", "duration": 4, "instruction": "慢慢吸气"},
            {"name": "屏息", "duration": 7, "instruction": "屏住呼吸"},
            {"name": "呼气", "duration": 8, "instruction": "慢慢呼气"},
        },
        "recommended_duration": 3, // 分钟
        "animation_url":        "https://cdn.example.com/breathing_animation.json",
    })
}

// GetUserGuide 返回应用使用指南
func GetUserGuide(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "guide": []map[string]interface{}{
            {"title": "心情打卡", "content": "每天记录你的心情，坚持打卡可以帮助你了解情绪变化规律。"},
            {"title": "AI对话", "content": "和小星聊聊你的感受，它会用心理学的知识陪你探索内心。"},
            {"title": "情绪测评", "content": "定期完成情绪测评，了解自己的心理健康状况。"},
            {"title": "冥想放松", "content": "感到压力时，试试冥想和呼吸练习，帮助自己放松下来。"},
        },
    })
}

// GetFAQ 返回常见问题列表
func GetFAQ(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "faq": []map[string]interface{}{
            {"question": "我的数据安全吗？", "answer": "我们使用端到端加密保护你的所有数据，只有你能查看。"},
            {"question": "小星会记录我的对话吗？", "answer": "对话内容加密存储，仅用于提升AI回复质量，不会分享给第三方。"},
            {"question": "如果我有心理危机怎么办？", "answer": "点击紧急帮助按钮可直接拨打心理援助热线，系统也会自动提醒信任的联系人。"},
            {"question": "测评结果准吗？", "answer": "测评基于PHQ-9等标准量表，结果仅供自我了解参考，不替代专业诊断。"},
        },
    })
}