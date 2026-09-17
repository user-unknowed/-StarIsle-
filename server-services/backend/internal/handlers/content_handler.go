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