package main

import (
    "log"
    "os"
    
    "github.com/gin-gonic/gin"
    "starisle-backend/internal/config"
    "starisle-backend/internal/middleware"
    "starisle-backend/internal/routes"
)

func main() {
    // 加载配置
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // 初始化Gin
    if cfg.Environment == "production" {
        gin.SetMode(gin.ReleaseMode)
    }
    
    router := gin.Default()
    
    // 中间件
    router.Use(middleware.CORS())
    router.Use(middleware.Logger())
    router.Use(middleware.Authentication(cfg))
    router.Use(middleware.RateLimit(cfg))
    
    // 注册路由
    routes.SetupRoutes(router, cfg)
    
    // 启动服务器
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    
    log.Printf("Server starting on port %s", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}