package routes

import (
    "github.com/gin-gonic/gin"
    "starisle-backend/internal/config"
    "starisle-backend/internal/handlers"
)

func SetupRoutes(router *gin.Engine, cfg *config.Config) {
    // API版本分组
    v1 := router.Group("/api/v1")
    {
        // 用户服务路由
        userGroup := v1.Group("/users")
        {
            userGroup.POST("/register", handlers.RegisterUser)
            userGroup.GET("/:id", handlers.GetUser)
            userGroup.PUT("/:id", handlers.UpdateUser)
            userGroup.DELETE("/:id", handlers.DeleteUser)
            userGroup.GET("/:id/export", handlers.ExportUserData)
        }
        
        // 心情打卡服务路由
        moodGroup := v1.Group("/mood")
        {
            moodGroup.POST("/checkin", handlers.MoodCheckin)
            moodGroup.GET("/history/:userId", handlers.GetMoodHistory)
            moodGroup.GET("/chart/:userId", handlers.GetMoodChart)
        }
        
        // 对话服务路由
        chatGroup := v1.Group("/chat")
        {
            chatGroup.POST("/message", handlers.SendMessage)
            chatGroup.GET("/history/:userId", handlers.GetChatHistory)
            chatGroup.GET("/ws/:userId", handlers.HandleWebSocket) // WebSocket连接
            chatGroup.GET("/topics", handlers.GetTopicCards)
        }
        
        // 测评服务路由
        assessmentGroup := v1.Group("/assessment")
        {
            assessmentGroup.GET("/questions/:type", handlers.GetAssessmentQuestions)
            assessmentGroup.POST("/submit", handlers.SubmitAssessment)
            assessmentGroup.GET("/result/:id", handlers.GetAssessmentResult)
        }
        
        // 内容服务路由
        contentGroup := v1.Group("/content")
        {
            contentGroup.GET("/meditations", handlers.GetMeditationList)
            contentGroup.GET("/meditation/:id", handlers.GetMeditationDetail)
            contentGroup.GET("/breathing/:type", handlers.GetBreathingExercise)
        }
        
        // 风险检测服务路由（内部调用）
        riskGroup := v1.Group("/risk")
        {
            riskGroup.POST("/detect", handlers.DetectRisk)
            riskGroup.GET("/level/:userId", handlers.GetUserRiskLevel)
        }
        
        // 危机资源路由
        crisisGroup := v1.Group("/crisis")
        {
            crisisGroup.GET("/hotlines", handlers.GetCrisisHotlines)
            crisisGroup.POST("/report", handlers.ReportCrisis)
        }
        
        // 帮助中心路由
        helpGroup := v1.Group("/help")
        {
            helpGroup.GET("/guide", handlers.GetUserGuide)
            helpGroup.GET("/faq", handlers.GetFAQ)
        }
    }
    
    // 健康检查
    router.GET("/health", handlers.HealthCheck)
    
    // WebSocket路由
    router.GET("/ws/chat/:userId", handlers.HandleWebSocket)
}