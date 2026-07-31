package config

import (
    "os"
    "strconv"
)

type Config struct {
    Environment      string
    DatabaseURL      string
    MongoDBURL       string
    RedisURL         string
    KafkaBrokers     []string
    JWTSecret        string
    AIServiceURL     string
    EncryptionKey    string
    RateLimitRPS     int
    AllowedOrigins   []string
}

func LoadConfig() (*Config, error) {
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

func getEnv(key, defaultValue string) string {
    value := os.Getenv(key)
    if value == "" {
        return defaultValue
    }
    return value
}

func getEnvAsInt(key string, defaultValue int) int {
    value := os.Getenv(key)
    if value == "" {
        return defaultValue
    }
    intValue, err := strconv.Atoi(value)
    if err != nil {
        return defaultValue
    }
    return intValue
}