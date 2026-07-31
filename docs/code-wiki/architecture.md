# 项目整体架构

## 架构概览

StarIsle 采用经典的分层架构，分为**客户端层**、**服务端层**和**数据层**，通过 REST API 和 WebSocket 进行通信。

```mermaid
flowchart TB
    subgraph Frontend["客户端层"]
        A["Web 前端<br/>React + TypeScript"]
        B["学生端 App<br/>Flutter"]
        C["教师端 App<br/>Flutter"]
        D["API 文档<br/>Electron"]
    end

    subgraph Gateway["网关层"]
        E["API Gateway<br/>Go + Gin"]
    end

    subgraph Backend["服务端层"]
        F["核心业务后端<br/>Java + Spring Boot"]
        G["AI 对话引擎<br/>Python + FastAPI"]
    end

    subgraph Data["数据层"]
        H[("PostgreSQL<br/>关系数据")]
        I[("MongoDB<br/>非结构化数据")]
        J[("Redis<br/>缓存")]
    end

    A -->|"REST / WS"| E
    B -->|"REST / WS"| E
    C -->|"REST / WS"| E
    E -->|"路由转发"| F
    F -->|"HTTP"| G
    F --> H
    F --> I
    F --> J
    G --> I
    G --> J
```

## 分层说明

### 1. 客户端层

负责用户界面展示和交互，支持多角色、多平台访问。

| 客户端 | 技术栈 | 目标用户 | 核心功能 |
|--------|--------|---------|---------|
| Web 前端 | React 18 + TypeScript + Vite | 学生/教师/家长 | 情绪打卡、AI 对话、趋势分析 |
| 学生端 App | Flutter + Riverpod | 学生 | 移动端心情打卡、AI 对话、冥想 |
| 教师端 App | Flutter + Riverpod | 教师 | 班级状态、学生管理、告警处理 |
| API 文档 | React + Electron | 开发者 | OpenAPI 可视化、接口测试 |

### 2. 网关层

统一入口，负责请求路由、认证鉴权、限流和日志。

- **技术**: Go 1.21 + Gin 1.9.x
- **职责**: 
  - 统一认证入口（JWT 校验）
  - 请求路由与负载均衡
  - CORS 跨域处理
  - 速率限制
- **注意**: 当前项目处于过渡期，`backend-java/`（Spring Boot）是主要开发版本，`后台/backend/`（Go）作为 API 网关保留。

### 3. 服务端层

#### 3.1 核心业务后端（backend-java）

- **技术**: Java 21 + Spring Boot 3.2.5 + Maven
- **职责**:
  - 用户注册/登录/认证（JWT）
  - 心情打卡数据管理
  - 对话历史存储与转发
  - 风险检测与预警
  - 家长绑定与授权管理
  - 端到端加密通信

#### 3.2 AI 对话引擎（后台/ai-engine）

- **技术**: Python 3.10 + FastAPI 0.108.x
- **职责**:
  - 基于 CBT 框架的 AI 对话生成
  - 实时情绪分析（L1 关键词 + L2 语义分析）
  - 风险等级判定（green/yellow/orange/red）
  - 话题引导卡片生成
  - 支持 DeepSeek API 或本地模型推理

### 4. 数据层

| 数据库 | 用途 | 关键数据 |
|--------|------|---------|
| PostgreSQL 14 | 关系型数据存储 | 用户、心情记录、班级、预警、通知 |
| MongoDB 6.0 | 非结构化数据存储 | 聊天消息、对话上下文 |
| Redis 7.0 | 缓存与会话 | 会话状态、热点数据、速率限制计数 |

## 数据流向

### 典型场景：学生发送 AI 对话消息

```mermaid
sequenceDiagram
    participant S as 学生端 App
    participant GW as API Gateway
    participant BJ as backend-java
    participant AI as ai-engine
    participant DB as PostgreSQL
    participant MG as MongoDB

    S->>GW: POST /api/v1/chat/message
    GW->>BJ: 转发请求 + JWT
    BJ->>BJ: 权限校验（只能发自己的消息）
    BJ->>AI: POST /chat (用户消息)
    AI->>AI: L1 关键词风险检测
    AI->>AI: L2 语义情绪分析
    AI->>AI: 调用 DeepSeek API 生成回复
    AI-->>BJ: 回复内容 + 风险等级 + 情绪标签
    BJ->>DB: 保存聊天记录（加密）
    BJ->>MG: 保存对话上下文
    BJ-->>S: 返回 AI 回复
```

### 典型场景：教师查看班级情绪趋势

```mermaid
sequenceDiagram
    participant T as 教师端 Web
    participant BJ as backend-java
    participant DB as PostgreSQL
    participant RD as Redis

    T->>BJ: GET /api/v1/classroom/{id}/stats
    BJ->>BJ: JWT 校验 + 角色校验（TEACHER）
    BJ->>RD: 查询缓存的班级统计
    alt 缓存未命中
        BJ->>DB: 查询学生列表与心情数据
        BJ->>DB: 聚合计算趋势
        BJ->>RD: 写入缓存（TTL 5min）
    end
    BJ-->>T: 返回统计数据 + 图表数据
```

## 安全架构

```mermaid
flowchart LR
    subgraph Security["安全机制"]
        A["HTTPS/TLS 1.3"]
        B["JWT 认证"]
        C["AES-256-GCM<br/>端到端加密"]
        D["BCrypt 密码哈希"]
        E["SQL 注入防护<br/>参数化查询"]
        F["CORS 跨域控制"]
        G["SLSA Build L2"]
    end
```

- **传输层**: HTTPS/TLS 1.3 全程加密
- **认证层**: JWT Token + BCrypt 密码哈希 + Spring Security 角色控制
- **数据层**: AES-256-GCM 端到端加密、SQLCipher 本地加密存储
- **供应链**: GitHub Actions SLSA Build Level 2 构建来源证明

## 部署架构

```mermaid
flowchart TB
    subgraph K8s["Kubernetes / Docker Compose"]
        N["Nginx<br/>反向代理"]
        WF["Web Frontend<br/>静态资源"]
        BJ["backend-java<br/>:8080"]
        AI["ai-engine<br/>:8000"]
        MY[("MySQL<br/>:3306")]
        MG[("MongoDB<br/>:27017")]
        RD[("Redis<br/>:6379")]
    end

    Client["用户设备"] --> N
    N --> WF
    N --> BJ
    BJ --> AI
    BJ --> MY
    BJ --> MG
    BJ --> RD
    AI --> MG
    AI --> RD
```

## 技术选型理由

| 技术 | 选型理由 |
|------|---------|
| React + Vite | 现代化前端生态，快速 HMR，TypeScript 原生支持 |
| Flutter | 一套代码覆盖 iOS/Android，适合资源有限的团队 |
| Spring Boot | 成熟的企业级 Java 生态，安全、事务、JPA 开箱即用 |
| Go + Gin | 高并发网关层，编译快、资源占用低 |
| FastAPI | Python 异步高性能，AI/ML 生态无缝集成 |
| PostgreSQL | 稳定的关系型数据库，支持复杂查询和 JSON 字段 |
| MongoDB | 灵活存储聊天消息等非结构化数据 |
| Redis | 会话缓存、热点数据、分布式锁 |
