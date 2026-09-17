// config.go - 全局配置定义与加载逻辑，统一从环境变量读取运行参数
//
// Package config 提供星屿后端的全局配置结构定义与加载功能，
// 通过环境变量注入数据库、缓存、消息队列、安全密钥与限流等参数，
// 并为各参数提供合理的本地开发默认值，便于在缺失环境变量时仍可启动。
package config

import (
    "os"
    "strconv"
)

// Config 是后端服务的全局配置对象，包含运行所需的所有外部依赖与运行参数
type Config struct {
    Environment    string   // 运行环境：development / production
    DatabaseURL    string   // PostgreSQL 主数据库连接串
    MongoDBURL     string   // MongoDB 文档数据库连接串，用于存储对话历史
    RedisURL       string   // Redis 缓存连接串，用于会话与限流计数
    KafkaBrokers   []string // Kafka 消息代理地址列表，用于异步事件投递
    JWTSecret      string   // JWT 签名密钥，用于用户身份认证
    AIServiceURL   string   // AI 引擎服务地址，指向 ai-engine 模块
    EncryptionKey  string   // 敏感数据加密密钥，用于用户隐私内容加密
    RateLimitRPS   int      // 限流阈值：每秒允许的最大请求数
    AllowedOrigins []string // 允许跨域访问的来源列表
}

// LoadConfig 从环境变量加载配置并返回 Config 实例
// Returns:
//   - *Config: 已填充好的配置对象
//   - error: 配置加载错误（当前实现始终返回 nil）
func LoadConfig() (*Config, error) {
    // 构造配置对象：逐项从环境变量读取，缺省时使用本地开发默认值
    cfg := &Config{
        Environment:    getEnv("ENVIRONMENT", "development"),
        DatabaseURL:    getEnv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/starisle"),
        MongoDBURL:     getEnv("MONGODB_URL", "mongodb://localhost:27017/starisle"),
        RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
        KafkaBrokers:   []string{getEnv("KAFKA_BROKER", "localhost:9092")},
        JWTSecret:      getEnv("JWT_SECRET", "your-secret-key"),
        AIServiceURL:   getEnv("AI_SERVICE_URL", "http://localhost:8000"),
        EncryptionKey:  getEnv("ENCRYPTION_KEY", "your-encryption-key"),
        RateLimitRPS:   getEnvAsInt("RATE_LIMIT_RPS", 100),
        AllowedOrigins: []string{getEnv("ALLOWED_ORIGIN", "*")},
    }

    return cfg, nil
}

// getEnv 读取字符串类型的环境变量，缺失时返回给定的默认值
// Args:
//   - key: 环境变量名
//   - defaultValue: 缺失时使用的默认值
// Returns:
//   - string: 环境变量值或默认值
func getEnv(key, defaultValue string) string {
    value := os.Getenv(key)
    if value == "" {
        // 环境变量未设置或为空，回退到默认值
        return defaultValue
    }
    return value
}

// getEnvAsInt 读取整型环境变量，缺失或格式非法时返回给定的默认值
// Args:
//   - key: 环境变量名
//   - defaultValue: 缺失或非法时使用的默认值
// Returns:
//   - int: 解析后的整型值或默认值
func getEnvAsInt(key string, defaultValue int) int {
    value := os.Getenv(key)
    if value == "" {
        // 未设置则直接返回默认值
        return defaultValue
    }
    // 尝试将字符串解析为整数，失败时回退到默认值
    intValue, err := strconv.Atoi(value)
    if err != nil {
        return defaultValue
    }
    return intValue
}