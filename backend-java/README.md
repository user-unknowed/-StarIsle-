# StarIsle Backend - Java Version

## 项目概述

星屿青少年心理健康AI陪伴应用的Java后端服务，基于Spring Boot 3.2构建。

## 技术栈

- Java 21
- Spring Boot 3.2.5
- Spring Web + WebSocket
- Spring Data JPA + MongoDB
- Redis (Jedis)
- PostgreSQL
- JWT Authentication
- Maven

## 快速开始

### 环境要求

- JDK 21+
- Maven 3.8+
- PostgreSQL 14+
- MongoDB 6.0+
- Redis 7.0+

### 构建与运行

```bash
cd backend-java

mvn clean compile

mvn spring-boot:run

mvn package
java -jar target/starisle-backend-1.0.0.jar
```

## API端点

### 健康检查
- `GET /health` - 服务健康检查

### 用户服务
- `POST /api/v1/users/register` - 用户注册
- `GET /api/v1/users/{id}` - 获取用户信息
- `PUT /api/v1/users/{id}` - 更新用户信息
- `DELETE /api/v1/users/{id}` - 删除用户
- `GET /api/v1/users/{id}/export` - 导出用户数据

### 心情打卡服务
- `POST /api/v1/mood/checkin` - 心情打卡
- `GET /api/v1/mood/history/{userId}` - 获取心情历史
- `GET /api/v1/mood/chart/{userId}` - 获取心情图表

### 对话服务
- `POST /api/v1/chat/message` - 发送消息
- `GET /api/v1/chat/history/{userId}` - 获取对话历史
- `GET /api/v1/chat/topics` - 获取话题卡片

### 测评服务
- `GET /api/v1/assessment/questions/{type}` - 获取测评题目
- `POST /api/v1/assessment/submit` - 提交测评
- `GET /api/v1/assessment/result/{id}` - 获取测评结果

### 内容服务
- `GET /api/v1/content/meditations` - 获取冥想列表
- `GET /api/v1/content/meditation/{id}` - 获取冥想详情
- `GET /api/v1/content/breathing/{type}` - 获取呼吸练习

### 风险检测服务
- `POST /api/v1/risk/detect` - 风险检测
- `GET /api/v1/risk/level/{userId}` - 获取用户风险等级

### WebSocket
- `ws://localhost:8080/ws/chat/{userId}` - 实时对话

## 配置说明

配置文件位于 `src/main/resources/application.yml`，支持环境变量覆盖：

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| DATABASE_URL | PostgreSQL连接地址 | jdbc:postgresql://localhost:5432/starisle |
| DATABASE_USERNAME | 数据库用户名 | postgres |
| DATABASE_PASSWORD | 数据库密码 | password |
| MONGODB_URL | MongoDB连接地址 | mongodb://localhost:27017/starisle |
| REDIS_HOST | Redis主机 | localhost |
| REDIS_PORT | Redis端口 | 6379 |
| JWT_SECRET | JWT密钥 | your-secret-key |
| ENCRYPTION_KEY | 加密密钥 | your-encryption-key |

## 项目结构

```
backend-java/
├── src/main/java/com/starisle/
│   ├── StarIsleApplication.java     # 启动类
│   ├── config/                       # 配置类
│   │   ├── AppConfig.java
│   │   ├── CorsConfig.java
│   │   └── WebSocketConfig.java
│   ├── controller/                   # REST控制器
│   │   ├── UserController.java
│   │   ├── ChatController.java
│   │   ├── MoodController.java
│   │   ├── RiskController.java
│   │   ├── ContentController.java
│   │   ├── AssessmentController.java
│   │   └── HealthController.java
│   ├── service/                      # 业务服务层
│   │   ├── ChatService.java
│   │   ├── RiskDetectionService.java
│   │   ├── EmotionAnalysisService.java
│   │   ├── SemanticAnalyzer.java
│   │   └── Star宝SystemPrompt.java
│   ├── utils/                        # 工具类
│   │   ├── EncryptionUtil.java
│   │   └── KeywordManager.java
│   └── websocket/                    # WebSocket处理
│       └── ChatWebSocketHandler.java
├── src/main/resources/
│   └── application.yml               # 应用配置
└── pom.xml                           # Maven配置
```

## 安全特性

- AES-256-GCM加密通信
- JWT身份认证
- CORS跨域配置
- 风险检测与危机干预
- 端到端加密支持

## License

MIT License