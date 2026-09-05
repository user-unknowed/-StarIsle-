// main.go - API网关程序入口，负责加载配置、初始化 Gin 路由及中间件并启动 HTTP 服务
//
// Package main 是星屿(StarIsle)后端 API 网关的可执行入口，
// 提供从环境变量加载配置、装配 CORS/日志/鉴权/限流中间件、
// 注册业务路由并启动 HTTP 服务的完整启动流程。
package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    "starisle-backend/internal/config"
    "starisle-backend/internal/middleware"
    "starisle-backend/internal/routes"
)

// main 是程序入口函数，负责串联配置加载、中间件装配、路由注册与服务启动
func main() {
    // 加载配置：从环境变量读取数据库、Redis、Kafka、JWT 等参数
    cfg, err := config.LoadConfig()
    if err != nil {
        // 配置加载失败直接终止进程，避免以错误配置启动
        log.Fatalf("Failed to load config: %v", err)
    }

    // 初始化Gin：生产环境切换为发布模式，关闭调试日志输出
    if cfg.Environment == "production" {
        gin.SetMode(gin.ReleaseMode)
    }

    // 创建默认 Gin 引擎，自带 Logger 与 Recovery 中间件
    router := gin.Default()

    // 中间件：按顺序注册跨域、日志、鉴权与限流四道全局中间件
    router.Use(middleware.CORS())             // 跨域资源共享处理
    router.Use(middleware.Logger())           // 请求日志记录
    router.Use(middleware.Authentication(cfg)) // JWT 身份认证
    router.Use(middleware.RateLimit(cfg))      // 限流保护

    // 注册路由：将各业务模块的路由组挂载到 v1 分组下
    routes.SetupRoutes(router, cfg)

    // 启动服务器：优先使用环境变量指定的端口，缺省时回退到 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // 打印启动端口并监听 HTTP 请求，启动失败则终止进程
    log.Printf("Server starting on port %s", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}