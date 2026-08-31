// routes.go - HTTP 路由注册中心，集中挂载各业务模块的接口路径
//
// Package routes 提供星屿后端 API 的路由注册功能，
// 按 v1 版本分组组织用户、心情、对话、测评、内容、风险与帮助中心等业务路由，
// 并额外暴露健康检查与 WebSocket 路由。
package routes

import (
    "github.com/gin-gonic/gin"
    "starisle-backend/internal/config"
    "starisle-backend/internal/handlers"
)

// SetupRoutes 在指定 Gin 引擎上注册所有业务路由
// Args:
//   - router: Gin 引擎实例
//   - cfg: 全局配置对象，供下游处理器使用
func SetupRoutes(router *gin.Engine, cfg *config.Config) {
    // API版本分组：所有业务接口统一挂载在 /api/v1 前缀下
    v1 := router.Group("/api/v1")
    {
        // 用户服务路由：注册、查询、更新、删除及数据导出
        userGroup := v1.Group("/users")
        {
            userGroup.POST("/register", handlers.RegisterUser)         // 用户注册
            userGroup.GET("/:id", handlers.GetUser)                   // 获取用户信息
            userGroup.PUT("/:id", handlers.UpdateUser)                // 更新用户信息
            userGroup.DELETE("/:id", handlers.DeleteUser)            // 删除用户账号
            userGroup.GET("/:id/export", handlers.ExportUserData)     // 导出用户数据
        }

        // 心情打卡服务路由：打卡、历史记录与图表数据
        moodGroup := v1.Group("/mood")
        {
            moodGroup.POST("/checkin", handlers.MoodCheckin)               // 提交心情打卡
            moodGroup.GET("/history/:userId", handlers.GetMoodHistory)     // 获取心情历史
            moodGroup.GET("/chart/:userId", handlers.GetMoodChart)         // 获取心情图表数据
        }

        // 对话服务路由：消息收发、历史、WebSocket 与话题卡片
        chatGroup := v1.Group("/chat")
        {
            chatGroup.POST("/message", handlers.SendMessage)               // 发送对话消息
            chatGroup.GET("/history/:userId", handlers.GetChatHistory)     // 获取对话历史
            chatGroup.GET("/ws/:userId", handlers.HandleWebSocket)         // WebSocket连接
            chatGroup.GET("/topics", handlers.GetTopicCards)              // 获取话题引导卡片
        }

        // 测评服务路由：题目获取、提交与结果查询
        assessmentGroup := v1.Group("/assessment")
        {
            assessmentGroup.GET("/questions/:type", handlers.GetAssessmentQuestions) // 获取测评题目
            assessmentGroup.POST("/submit", handlers.SubmitAssessment)               // 提交测评结果
            assessmentGroup.GET("/result/:id", handlers.GetAssessmentResult)         // 获取测评结果
        }

        // 内容服务路由：冥想列表、冥想详情与呼吸练习
        contentGroup := v1.Group("/content")
        {
            contentGroup.GET("/meditations", handlers.GetMeditationList)     // 获取冥想内容列表
            contentGroup.GET("/meditation/:id", handlers.GetMeditationDetail) // 获取冥想详情
            contentGroup.GET("/breathing/:type", handlers.GetBreathingExercise) // 获取呼吸练习
        }

        // 风险检测服务路由（内部调用）：风险检测与用户风险等级查询
        riskGroup := v1.Group("/risk")
        {
            riskGroup.POST("/detect", handlers.DetectRisk)                  // 风险检测接口
            riskGroup.GET("/level/:userId", handlers.GetUserRiskLevel)     // 获取用户风险等级
        }

        // 危机资源路由：心理援助热线与危机事件上报
        crisisGroup := v1.Group("/crisis")
        {
            crisisGroup.GET("/hotlines", handlers.GetCrisisHotlines)        // 获取危机热线列表
            crisisGroup.POST("/report", handlers.ReportCrisis)             // 危机事件上报
        }

        // 帮助中心路由：使用指南与常见问题
        helpGroup := v1.Group("/help")
        {
            helpGroup.GET("/guide", handlers.GetUserGuide) // 获取使用指南
            helpGroup.GET("/faq", handlers.GetFAQ)         // 获取常见问题
        }
    }

    // 健康检查：供负载均衡与容器编排做存活探测
    router.GET("/health", handlers.HealthCheck)

    // WebSocket路由：独立于 v1 前缀的实时对话长连接入口
    router.GET("/ws/chat/:userId", handlers.HandleWebSocket)
}