# 星屿 StarIsle - 完整使用指南

> **版本**: MVP v1.5
> **更新日期**: 2026-08-01
> **目标用户**: 12-18岁初高中生、教师及家长
> **核心定位**: AI情绪成长伙伴，零压力的第一心理求助站

---

## 目录

1. [项目介绍](#1-项目介绍)
2. [架构说明](#2-架构说明)
3. [环境准备](#3-环境准备)
4. [快速开始](#4-快速开始)
5. [模块详解 - Web前端](#5-模块详解---web前端)
6. [模块详解 - Java后端](#6-模块详解---java后端)
7. [模块详解 - AI引擎](#7-模块详解---ai引擎)
8. [模块详解 - 移动端](#8-模块详解---移动端)
9. [API 速查](#9-api-速查)
10. [部署指南](#10-部署指南)
11. [安全与合规](#11-安全与合规)
12. [常见问题](#12-常见问题)

---

## 1. 项目介绍

### 1.1 项目概述

「星屿」StarIsle 是专为 12-18 岁初高中生打造的 AI 心理健康应用，通过极简心情打卡和 24/7 AI 对话，为学生提供零压力的情绪支持。同时为教师提供心理守护协同工作台，为家长提供孩子情绪状态查看与 AI 心理咨询服务，实现家校共育。

### 1.2 核心功能

#### 学生端
- 匿名注册与隐私保护
- 极简心情打卡（5档表情）
- AI 星宝对话（基于 CBT 框架）
- 情绪探索测评（PHQ-9 映射）
- 冥想放松（3-5个音频）
- 风险检测与危机响应
- 端到端加密通信
- 本地记忆存储管理
- AI 工具中心（文本生成、内容摘要、风格转换）
- 紧急帮助按钮（一键拨打心理危机热线）

#### 教师端
- 工作台概览与高风险告警
- 学生列表与情绪趋势查看
- 症状反馈与上报处理
- 对话观察与介入干预
- 本地记忆存储管理
- 紧急帮助按钮

#### 家长端
- 孩子情绪状态查看
- AI 心理顾问（大星）对话
- 情绪趋势分析（7/30/90天）
- 应急预案与预警管理
- 心理健康知识库
- 通知设置与隐私管理
- 孩子绑定与授权管理
- 完整应急预案流程（红色告警全屏阻断、二次确认）
- 告警超时升级机制

### 1.3 技术栈总览

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Web前端** | React + TypeScript | 18.x / 5.8.x | 多端 Web 应用 |
| **Web前端** | Vite | 6.3.x | 构建工具 |
| **Web前端** | Zustand | 5.0.x | 状态管理 |
| **Web前端** | TailwindCSS | 3.4.x | 样式框架 |
| **原生前端** | Flutter | 3.x | 跨平台 iOS/Android |
| **原生前端** | Riverpod | - | 状态管理 |
| **原生前端** | SQLCipher | - | 加密本地存储 |
| **后端服务** | Java + Spring Boot | 21 / 3.2.x | 核心业务逻辑 |
| **API网关** | Go + Gin | 1.21 / 1.9.x | 统一入口与路由 |
| **AI引擎** | Python + FastAPI | - / 0.108.x | AI 对话与分析 |
| **AI引擎** | Transformers + Torch | 4.36.x / 2.1.x | 情绪分析模型 |
| **数据库** | PostgreSQL / MySQL | 14 / 8.x | 关系型数据存储 |
| **数据库** | MongoDB | 6.0 | 非结构化数据存储 |
| **缓存** | Redis | 7.0 | 会话管理与缓存 |

---

## 2. 架构说明

### 2.1 整体架构

StarIsle 采用经典的分层架构，分为**客户端层**、**服务端层**和**数据层**，通过 REST API 和 WebSocket 进行通信。

```
┌─────────────────────────────────────────────────────────────────┐
│                          客户端层                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  学生端(Flutter) │  │  教师端(Flutter) │  │  Web前端(React) │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        服务端层                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Gateway (Go / Gin)                      │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┼───────────────────────────────┐   │
│  │                          ▼                               │   │
│  │  ┌──────────────────┐  ┌──────────────────┐              │   │
│  │  │  Backend Java    │  │  AI Engine       │              │   │
│  │  │  (Spring Boot)   │  │  (Python/FastAPI)│              │   │
│  │  └──────────────────┘  └──────────────────┘              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │   Kafka       │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 分层说明

#### 客户端层

| 客户端 | 技术栈 | 目标用户 | 核心功能 |
|--------|--------|---------|---------|
| Web 前端 | React 18 + TypeScript + Vite | 学生/教师/家长 | 情绪打卡、AI 对话、趋势分析 |
| 学生端 App | Flutter + Riverpod | 学生 | 移动端心情打卡、AI 对话、冥想 |
| 教师端 App | Flutter + Riverpod | 教师 | 班级状态、学生管理、告警处理 |
| API 文档 | React + Electron | 开发者 | OpenAPI 可视化、接口测试 |

#### 网关层

统一入口，负责请求路由、认证鉴权、限流和日志。

- **技术**: Go 1.21 + Gin 1.9.x
- **职责**: 统一认证入口（JWT 校验）、请求路由与负载均衡、CORS 跨域处理、速率限制
- **注意**: 当前项目处于过渡期，`backend-java/`（Spring Boot）是主要开发版本，`server-services/backend/`（Go）作为 API 网关保留

#### 服务端层

**核心业务后端（backend-java）**
- **技术**: Java 21 + Spring Boot 3.2.5 + Maven
- **职责**: 用户认证、心情打卡管理、对话存储、风险检测、家长绑定、端到端加密

**AI 对话引擎（server-services/ai-engine）**
- **技术**: Python 3.10 + FastAPI 0.108.x
- **职责**: CBT 框架 AI 对话生成、实时情绪分析、风险等级判定、话题引导

#### 数据层

| 数据库 | 用途 | 关键数据 |
|--------|------|---------|
| PostgreSQL 14 | 关系型数据存储 | 用户、心情记录、班级、预警、通知 |
| MongoDB 6.0 | 非结构化数据存储 | 聊天消息、对话上下文 |
| Redis 7.0 | 缓存与会话 | 会话状态、热点数据、速率限制计数 |

### 2.3 数据流向

#### 典型场景：学生发送 AI 对话消息

```
学生端 App → API Gateway → backend-java → ai-engine
                                         ↓
                                    L1 关键词风险检测
                                    L2 语义情绪分析
                                    调用 DeepSeek API 生成回复
                                         ↓
backend-java ← 回复内容 + 风险等级 + 情绪标签
    ↓
保存聊天记录（加密）→ PostgreSQL
保存对话上下文 → MongoDB
    ↓
返回 AI 回复 → 学生端 App
```

---

## 3. 环境准备

### 3.1 环境要求总览

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18.0.0 | Web 前端 / API 文档 |
| Java JDK | 21 | backend-java（推荐 Amazon Corretto） |
| Maven | 3.8 | Java 构建 |
| Go | 1.21 | API 网关 |
| Python | 3.10 | AI 引擎 |
| Flutter SDK | 3.0 | 移动端 |
| Docker | 20.10+ | 容器化部署 |
| Docker Compose | 2.0+ | 多服务编排 |
| PostgreSQL | 14 | 关系数据库（可选，开发可用 H2） |
| MongoDB | 6.0 | 文档数据库（可选） |
| Redis | 7.0 | 缓存服务（可选） |

### 3.2 开发工具推荐

| 工具 | 用途 | 推荐版本 |
|------|------|---------|
| VS Code | 通用 IDE | 最新版 |
| IntelliJ IDEA | Java 开发 | Community / Ultimate |
| Android Studio | Flutter / Android 开发 | 最新版 |
| Xcode | iOS 开发 | 最新版（需 macOS） |
| Postman | API 测试 | 最新版 |
| DBeaver | 数据库管理 | 最新版 |

### 3.3 各环境安装指南

#### Java JDK 21（Amazon Corretto）

```bash
# Windows (PowerShell)
winget install Amazon.Corretto.21.JDK

# macOS
brew install --cask corretto21

# Linux (Ubuntu)
wget -O- https://apt.corretto.aws/corretto.key | sudo gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" | sudo tee /etc/apt/sources.list.d/corretto.list
sudo apt-get update && sudo apt-get install -y java-21-amazon-corretto-jdk
```

验证安装：
```bash
java -version
# 输出: openjdk version "21.0.x" ...

javac -version
# 输出: javac 21.0.x
```

#### Node.js 18+

```bash
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS

# macOS
brew install node@18

# Linux (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18
```

验证安装：
```bash
node --version
# 输出: v18.x.x 或更高

npm --version
# 输出: 9.x.x 或更高
```

#### Python 3.10+

```bash
# Windows (PowerShell)
winget install Python.Python.3.10

# macOS
brew install python@3.10

# Linux (Ubuntu)
sudo apt-get update && sudo apt-get install -y python3.10 python3.10-venv python3-pip
```

验证安装：
```bash
python --version
# 输出: Python 3.10.x 或更高
```

#### Flutter 3.x

```bash
# Windows (PowerShell)
winget install Flutter.Flutter

# macOS
brew install --cask flutter

# Linux
git clone https://github.com/flutter/flutter.git -b stable ~/flutter
export PATH="$PATH:$HOME/flutter/bin"
```

验证安装：
```bash
flutter doctor
```

#### Maven 3.8+

```bash
# Windows (PowerShell)
winget install Apache.Maven

# macOS
brew install maven

# Linux
sudo apt-get install -y maven
```

验证安装：
```bash
mvn -version
```

---

## 4. 快速开始

### 4.1 方式一：Docker Compose 一键启动（推荐）

适用于：本地完整环境搭建、集成测试、演示

```bash
cd server-services/deployment

# 1. 复制环境变量模板
cp .env.template .env

# 2. 编辑 .env 文件，配置必填项
# MYSQL_PASSWORD=your_mysql_password
# MYSQL_ROOT_PASSWORD=your_root_password
# MONGO_PASSWORD=your_mongo_password
# REDIS_PASSWORD=your_redis_password
# JWT_SECRET=your_jwt_secret
# ENCRYPTION_KEY=your_encryption_key
# ENCRYPTION_MASTER_KEY=your_32_bytes_master_key
# MODEL_API_KEY=your_deepseek_api_key

# 3. 一键启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f backend-java
docker-compose logs -f ai-engine
```

**启动的服务与端口**：

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| MySQL | starisle-mysql | 3306 | 生产关系数据库 |
| MongoDB | starisle-mongodb | 27017 | 文档数据库 |
| Redis | starisle-redis | 6379 | 缓存服务 |
| backend-java | starisle-backend-java | 8080 | Java 核心业务后端 |
| ai-engine | starisle-ai | 8000 | Python AI 对话引擎 |

**健康检查**：

```bash
curl http://localhost:8080/health
# {"status":"UP","service":"starisle-backend"}

curl http://localhost:8000/health
# {"status":"healthy","service":"ai-engine","version":"1.0.0"}
```

### 4.2 方式二：各模块独立启动

适用于：日常开发、调试单个模块

#### 4.2.1 Web 前端

```bash
cd web-frontend

# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 访问 http://localhost:5173
```

#### 4.2.2 Java 后端

```bash
cd backend-java

# 编译
mvn clean compile

# 开发模式启动（使用 H2 内存数据库，无需外部依赖）
mvn spring-boot:run

# 服务运行在 http://localhost:8080
```

#### 4.2.3 AI 引擎

```bash
cd server-services/ai-engine

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
export MODEL_API_KEY=your_deepseek_api_key
export MODEL_API_BASE=https://api.deepseek.com

# 启动服务
python app/main.py

# 服务运行在 http://localhost:8000
```

#### 4.2.4 学生端 Flutter App

```bash
cd student-app/StarIsle-student

flutter pub get
flutter run
```

#### 4.2.5 教师端 Flutter App

```bash
cd teacher-app/StarIsle-teacher

flutter pub get
flutter run
```

### 4.3 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 学生 | student1 | 123456 |
| 教师 | teacher1 | 123456 |
| 家长 | parent1 | 123456 |

---

## 5. 模块详解 - Web前端

### 5.1 模块概述

- **路径**: `web-frontend/`
- **技术栈**: React 18 + TypeScript + Vite 6.3 + TailwindCSS 3.4 + Zustand 5.0
- **职责**: 学生/教师/家长三端 Web 应用，支持响应式布局和 Capacitor 打包

### 5.2 目录结构

```
web-frontend/
├── src/
│   ├── assets/              # 静态资源
│   ├── components/          # 通用组件
│   │   ├── common/          # 公共组件（Header、EmergencyHelpButton）
│   │   ├── ui/              # 基础 UI（Button、Card、Input、Modal、Tabs、Toast）
│   │   └── dev/             # 开发调试组件
│   ├── design/              # 设计系统
│   │   ├── platform.css     # 平台适配样式
│   │   ├── theme.ts         # 主题配置
│   │   └── tokens.ts        # 设计 Token
│   ├── hooks/               # 自定义 Hooks
│   ├── lib/                 # 工具函数
│   ├── pages/               # 页面组件
│   │   ├── student/         # 学生端页面
│   │   ├── teacher/         # 教师端页面
│   │   ├── parent/          # 家长端页面
│   │   ├── Home.tsx         # 欢迎页
│   │   └── Login.tsx        # 登录页
│   ├── services/            # API 服务层
│   │   ├── api.ts           # API 接口定义
│   │   ├── http.ts          # HTTP 客户端
│   │   └── ws.ts            # WebSocket 客户端
│   ├── store/               # Zustand 状态管理
│   │   ├── authStore.ts     # 认证状态
│   │   ├── chatStore.ts     # 聊天状态
│   │   ├── classroomStore.ts # 班级状态
│   │   ├── moodStore.ts     # 情绪状态
│   │   └── parentStore.ts   # 家长端状态
│   ├── types/               # TypeScript 类型定义
│   ├── App.tsx              # 根组件与路由
│   ├── main.tsx             # 入口文件
│   └── index.css            # 全局样式
├── android/                 # Capacitor Android 配置
├── ios/                     # Capacitor iOS 配置
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── Dockerfile
```

### 5.3 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 18.3.1 | UI 框架 |
| react-router-dom | 7.3.0 | 路由管理 |
| zustand | 5.0.3 | 状态管理 |
| tailwindcss | 3.4.17 | CSS 框架 |
| lucide-react | 0.511.0 | 图标库 |
| clsx | 2.1.1 | 条件类名 |
| tailwind-merge | 3.0.2 | 类名合并 |

### 5.4 开发命令

```bash
# 开发模式
npm run dev          # 启动开发服务器 http://localhost:5173

# 代码检查
npm run check        # TypeScript 类型检查
npm run lint         # ESLint 代码规范

# 构建
npm run build        # 生产构建
npm run preview      # 预览生产构建

# Capacitor 打包
npx cap sync         # 同步 Web 资源到原生项目
npx cap open android # 打开 Android Studio
npx cap open ios     # 打开 Xcode
```

### 5.5 环境变量

在 `web-frontend/` 下创建 `.env.local`：

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 5.6 关键组件说明

#### EmergencyHelpButton

三端共用的紧急帮助按钮组件，浮动显示在聊天页面，集成三条 24 小时心理危机热线：
- 12355 青少年服务热线
- 希望24热线
- 北京心理危机研究与干预中心

支持一键拨号（`tel:` 协议）和热线详情展示。

#### HTTP 客户端（http.ts）

- 自动识别后端统一响应格式 `{code, message, data}` 并解包 `data` 字段
- 敏感路径脱敏（password、token、message 等字段）
- 401 错误去重处理（同一会话仅触发一次跳转登录）
- 默认请求超时 10 秒，AI 对话接口 30 秒

#### WebSocket 客户端（ws.ts）

- 强制 `wss://` 协议（生产环境）
- 连接时携带 `Authorization: Bearer <JWT>` 头部
- 断线指数退避重连（1s/2s/4s/8s，最大 30s）

---

## 6. 模块详解 - Java后端

### 6.1 模块概述

- **路径**: `backend-java/`
- **技术栈**: Java 21 + Spring Boot 3.2.5 + Maven + Lombok 1.18.46
- **职责**: 核心业务服务（认证、用户管理、情绪数据、聊天、风险检测）

### 6.2 目录结构

```
backend-java/
├── src/main/java/com/starisle/
│   ├── StarIsleApplication.java      # Spring Boot 启动类
│   ├── config/                       # 配置类
│   │   ├── AppConfig.java            # 通用 Bean 配置
│   │   ├── CorsConfig.java           # 跨域配置
│   │   ├── DataSourceConfig.java     # 数据源配置
│   │   ├── GlobalExceptionHandler.java # 全局异常处理
│   │   ├── JwtAuthenticationFilter.java # JWT 认证过滤器
│   │   ├── SecurityConfig.java       # Spring Security 配置
│   │   └── WebSocketConfig.java      # WebSocket 配置
│   ├── controller/                   # REST API 控制器
│   │   ├── AssessmentController.java # 测评接口
│   │   ├── ChatController.java       # 聊天接口
│   │   ├── ContentController.java    # 内容接口
│   │   ├── HealthController.java     # 健康检查
│   │   ├── MigrationController.java  # 数据迁移
│   │   ├── MoodController.java       # 心情打卡接口
│   │   ├── ParentController.java     # 家长接口
│   │   ├── RiskController.java       # 风险检测接口
│   │   └── UserController.java       # 用户接口
│   ├── dto/                          # 数据传输对象
│   │   ├── request/                  # 请求 DTO
│   │   ├── response/                 # 响应 DTO
│   │   └── ApiResponse.java          # 统一响应包装
│   ├── entity/                       # JPA 实体类
│   │   ├── AssessmentResult.java
│   │   ├── ChatMessage.java
│   │   ├── EmergencyAlert.java
│   │   ├── EmergencyResource.java
│   │   ├── EncryptionKey.java
│   │   ├── MoodRecord.java
│   │   ├── ParentStudentBinding.java
│   │   ├── ParentUser.java
│   │   └── User.java
│   ├── exception/                    # 自定义异常
│   ├── repository/                   # Spring Data JPA 仓库
│   ├── service/                      # 业务服务层
│   │   ├── dart/                     # Dart 相关服务
│   │   ├── ChatService.java
│   │   ├── EmotionAnalysisService.java
│   │   ├── KeyManagerService.java
│   │   ├── MigrationService.java
│   │   ├── ParentService.java
│   │   ├── RiskDetectionService.java
│   │   ├── SemanticAnalyzer.java
│   │   └── StarIsleSystemPrompt.java
│   ├── utils/                        # 工具类
│   │   ├── EncryptionUtil.java       # AES-256-GCM 加密
│   │   ├── JwtUtil.java              # JWT 生成与解析
│   │   └── KeywordManager.java       # 关键词管理
│   └── websocket/                    # WebSocket 处理器
│       └── ChatWebSocketHandler.java
├── src/main/resources/
│   └── application.yml               # 应用配置
├── Dockerfile                        # 多阶段构建
├── pom.xml                           # Maven 依赖
└── README.md
```

### 6.3 关键配置

#### application.yml

支持通过环境变量切换数据库：

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `DATABASE_URL` | 数据库连接串 | `jdbc:h2:mem:starisle` |
| `DATABASE_USERNAME` | 数据库用户名 | `sa` |
| `DATABASE_PASSWORD` | 数据库密码 | 空 |
| `DATABASE_DRIVER` | 数据库驱动 | `org.h2.Driver` |
| `DDL_AUTO` | Hibernate DDL 模式 | `update` |
| `HIBERNATE_DIALECT` | Hibernate 方言 | `org.hibernate.dialect.H2Dialect` |
| `H2_CONSOLE_ENABLED` | H2 控制台 | `true` |
| `MONGODB_URL` | MongoDB 连接串 | `mongodb://localhost:27017/starisle` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `JWT_SECRET` | JWT 签名密钥 | `starisle-dev-secret-key` |
| `AI_SERVICE_URL` | AI 引擎地址 | `http://localhost:8000` |

#### 数据库切换

**开发环境（H2 内存数据库）**：
```bash
mvn spring-boot:run
# 无需额外配置，默认使用 H2
```

**生产环境（MySQL）**：
```bash
export DATABASE_URL=jdbc:mysql://localhost:3306/starisle
export DATABASE_USERNAME=starisle_user
export DATABASE_PASSWORD=your_password
export DATABASE_DRIVER=com.mysql.cj.jdbc.Driver
export DDL_AUTO=update
export HIBERNATE_DIALECT=org.hibernate.dialect.MySQLDialect
export H2_CONSOLE_ENABLED=false

mvn spring-boot:run
```

### 6.4 Lombok 配置

项目使用 Lombok 1.18.46 简化 Java 代码。`pom.xml` 中的关键配置：

```xml
<properties>
    <java.version>21</java.version>
    <lombok.version>1.18.46</lombok.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>${lombok.version}</version>
        <optional>true</optional>
    </dependency>
</dependencies>
```

**常用注解**：
- `@Data`: 自动生成 getter/setter/toString/equals/hashCode
- `@Builder`: 生成 Builder 模式构造器
- `@NoArgsConstructor` / `@AllArgsConstructor`: 生成构造函数
- `@RequiredArgsConstructor`: 为 final 字段生成构造函数

### 6.5 开发命令

```bash
# 编译
mvn clean compile

# 启动（开发模式）
mvn spring-boot:run

# 运行测试
mvn test

# 打包
mvn package -DskipTests

# 运行打包后的 JAR
java -jar target/starisle-backend-1.0.0.jar
```

### 6.6 安全机制

- **JWT 认证**: `JwtAuthenticationFilter` 拦截请求并校验 Token
- **Spring Security**: `SecurityConfig` 配置角色权限（STUDENT/TEACHER/PARENT）
- **密码加密**: BCrypt 哈希存储
- **端到端加密**: `EncryptionUtil` 使用 AES-256-GCM 加密聊天内容
- **CORS**: `CorsConfig` 配置跨域白名单

---

## 7. 模块详解 - AI引擎

### 7.1 模块概述

- **路径**: `server-services/ai-engine/`
- **技术栈**: Python 3.10 + FastAPI 0.108 + Transformers 4.36 + Torch 2.1
- **职责**: 基于 CBT 框架的 AI 对话生成、实时情绪分析、风险检测

### 7.2 目录结构

```
server-services/ai-engine/
├── app/
│   ├── models/
│   │   ├── knowledge.py              # 知识库模型
│   │   └── semantic_analyzer.py      # 语义分析模型封装
│   ├── prompts/
│   │   └── star宝_system_prompt.py   # 星宝角色系统提示词
│   ├── services/
│   │   ├── chat_service.py           # AI 对话服务核心
│   │   ├── emotion_analysis_service.py # 情绪分析服务
│   │   ├── knowledge_service.py      # 知识库检索服务
│   │   └── risk_detection_service.py # 风险检测服务
│   ├── utils/
│   │   ├── db_connection.py          # 数据库连接
│   │   ├── encryption.py             # 加密工具
│   │   └── keyword_manager.py        # 关键词管理
│   └── main.py                       # FastAPI 入口
├── data/                             # 训练/清洗数据
│   └── knowledge_base.json           # 心理学知识库
├── models/                           # 预训练 Word2Vec 模型
│   ├── pretrained_english/
│   └── pretrained_word2vec/
├── scripts/                          # 数据处理脚本
│   ├── extract_pdf_content.py
│   ├── import_knowledge.py
│   ├── pretrain_english.py
│   ├── pretrain_model.py
│   └── pretrain_word2vec.py
├── dockerfile
└── requirements.txt
```

### 7.3 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.108.0 | Web 框架 |
| uvicorn | 0.25.0 | ASGI 服务器 |
| transformers | 4.36.2 | HuggingFace 模型 |
| torch | 2.1.2 | 深度学习框架 |
| openai | 1.6.1 | DeepSeek/OpenAI API |
| langchain | 0.1.0 | LLM 应用框架 |
| scikit-learn | 1.3.2 | 机器学习工具 |
| pymongo | 4.6.0 | MongoDB 客户端 |
| redis | 5.0.1 | Redis 客户端 |

### 7.4 风险检测机制

AI 引擎采用**双层风险检测**：

#### L1 关键词检测

通过 `keyword_manager.py` 维护敏感关键词库，包括：
- 自伤类：自伤、割伤、伤害自己
- 自杀类：自杀、不想活、想死、结束生命
- 求助类：帮帮我、撑不下去

命中关键词立即返回对应风险等级。

#### L2 语义分析

通过 `semantic_analyzer.py` 使用 Word2Vec 模型进行语义相似度分析：
- 计算输入文本与风险类别的语义相似度
- 结合上下文判断意图（如"活着"、"生命"、"未来"等词的出现）
- 输出风险等级和置信度

#### 风险等级

| 等级 | 颜色 | 说明 | 处理措施 |
|------|------|------|---------|
| green | 绿色 | 正常 | 无 |
| yellow | 黄色 | 轻微波动 | 记录观察 |
| orange | 橙色 | 需关注 | 通知教师/家长 |
| red | 红色 | 紧急 | 立即触发危机干预流程 |

### 7.5 知识库 RAG 系统

AI 引擎集成了 RAG（检索增强生成）系统，基于 26 本经典心理学书籍：

- **知识检索**: 通过 `knowledge_service.py` 进行语义搜索
- **上下文增强**: 将检索到的知识片段注入 AI 对话上下文
- **不修改模型权重**: 知识仅用于推理时增强，不参与模型训练

**API 端点**：
- `POST /knowledge/search`: 搜索知识库
- `GET /knowledge/stats`: 获取知识库统计
- `POST /knowledge/import`: 导入新知识
- `GET /knowledge/categories`: 获取知识分类

### 7.6 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MODEL_API_KEY` | 大模型 API Key | DeepSeek API Key |
| `MODEL_API_BASE` | 大模型 API 地址 | `https://api.deepseek.com` |
| `USE_LOCAL_MODEL` | 是否使用本地模型 | `true` / `false` |
| `MODEL_NAME` | 本地模型名称 | `deepseek-ai/deepseek-chat` |
| `MONGODB_URL` | MongoDB 连接串 | `mongodb://localhost:27017/starisle` |
| `REDIS_HOST` | Redis 主机 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |

### 7.7 开发命令

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python app/main.py

# 服务运行在 http://localhost:8000

# 导入知识库（可选）
python scripts/import_knowledge.py

# 预训练模型（可选）
python scripts/pretrain_word2vec.py
```

---

## 8. 模块详解 - 移动端

### 8.1 学生端 Flutter App

- **路径**: `student-app/StarIsle-student/`
- **技术栈**: Flutter 3.x + Riverpod + SQLCipher

#### 目录结构

```
student-app/StarIsle-student/
├── lib/
│   ├── providers/
│   │   └── ai_provider.dart         # AI 服务 Provider
│   ├── screens/
│   │   ├── ai_tools_screen.dart     # AI 工具中心
│   │   ├── chat_screen.dart         # 对话页面
│   │   ├── explore_screen.dart      # 探索页面
│   │   ├── home_screen.dart         # 首页
│   │   ├── profile_screen.dart      # 个人中心
│   │   └── splash_screen.dart       # 启动页
│   ├── services/
│   │   ├── ai_service.dart          # AI 业务服务
│   │   └── memory_storage/          # 本地记忆存储管理
│   │       ├── maintenance_scheduler.dart
│   │       ├── memory_storage_service.dart
│   │       └── storage_monitor.dart
│   ├── src/
│   │   └── app.dart                 # 应用根组件
│   ├── theme/
│   │   └── app_theme.dart           # 主题配置
│   └── main.dart                    # 入口
├── assets/                          # 图片、音频、动画、字体
└── pubspec.yaml
```

#### 核心依赖

| 依赖 | 用途 |
|------|------|
| flutter_riverpod | 状态管理 |
| http / web_socket_channel | 网络通信 |
| sqflite_sqlcipher | 加密本地数据库 |
| just_audio | 音频播放 |
| lottie / rive | 动画 |
| fl_chart | 图表 |
| workmanager | 后台任务 |

#### 开发命令

```bash
cd student-app/StarIsle-student

# 获取依赖
flutter pub get

# 运行
flutter run

# 构建 APK
flutter build apk

# 构建 iOS（需 macOS + Xcode）
flutter build ios
```

### 8.2 教师端 Flutter App

- **路径**: `teacher-app/StarIsle-teacher/`
- **技术栈**: Flutter 3.x + Riverpod

#### 目录结构

```
teacher-app/StarIsle-teacher/
├── lib/
│   ├── models/
│   │   └── teacher_models.dart      # 教师端数据模型
│   ├── providers/
│   │   ├── ai_provider.dart
│   │   └── teacher_providers.dart   # 教师状态管理
│   ├── screens/
│   │   ├── ai_tools_screen.dart
│   │   ├── chat_screen.dart
│   │   ├── profile_screen.dart
│   │   ├── students_screen.dart     # 学生列表
│   │   └── workbench_screen.dart    # 工作台
│   ├── services/
│   │   ├── ai_service.dart
│   │   └── memory_storage/          # 本地记忆存储
│   ├── src/
│   │   └── app.dart
│   ├── theme/
│   │   └── teacher_theme.dart
│   └── main.dart
├── assets/
└── pubspec.yaml
```

#### 开发命令

```bash
cd teacher-app/StarIsle-teacher

flutter pub get
flutter run
```

### 8.3 本地记忆存储管理

学生端和教师端均集成本地记忆存储管理系统：

- **加密数据库**: 使用 SQLCipher 进行本地数据加密存储
- **定时整理**: `maintenance_scheduler.dart` 定期整理过期数据
- **存储监控**: `storage_monitor.dart` 监控存储空间使用情况

---

## 9. API 速查

### 9.1 基础信息

- **基础 URL**: `http://localhost:8080`
- **API 版本**: `v1`
- **认证方式**: Bearer Token（JWT）
- **内容类型**: `application/json`

### 9.2 认证接口

#### 用户注册

```http
POST /api/v1/users/register
Content-Type: application/json

{
  "username": "student1",
  "password": "123456",
  "nickname": "小明",
  "role": "student",
  "ageGroup": "高中生"
}
```

#### 用户登录

```http
POST /api/v1/users/login
Content-Type: application/json

{
  "username": "student1",
  "password": "123456"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user_id": "xxx",
    "username": "student1",
    "nickname": "小明同学",
    "role": "student",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 家长注册

```http
POST /api/v1/parents/register
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "123456",
  "nickname": "张爸爸"
}
```

#### 家长登录

```http
POST /api/v1/parents/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "123456"
}
```

### 9.3 心情打卡服务

#### 提交心情打卡

```http
POST /api/v1/mood/checkin
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "moodLevel": 4,
  "tags": ["开心", "考试顺利"]
}
```

**字段说明**：
- `moodLevel`: 整数 1-5（1=很糟，5=很开心）
- `tags`: 情绪标签数组，可选

#### 获取心情历史

```http
GET /api/v1/mood/history/{userId}
Authorization: Bearer {token}
```

#### 获取心情图表数据

```http
GET /api/v1/mood/chart/{userId}
Authorization: Bearer {token}
```

### 9.4 对话服务

#### 发送消息（HTTP）

```http
POST /api/v1/chat/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "message": "最近学习压力很大"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "消息发送成功",
  "data": {
    "user_id": "student1",
    "response_time": 1200
  }
}
```

#### 获取对话历史

```http
GET /api/v1/chat/history/{userId}?limit=50
Authorization: Bearer {token}
```

#### 获取话题卡片

```http
GET /api/v1/chat/topics
```

#### WebSocket 实时对话

```
ws://localhost:8080/ws/chat/{userId}
```

### 9.5 测评服务

#### 获取测评题目

```http
GET /api/v1/assessment/questions/{type}
Authorization: Bearer {token}
```

**type 取值**: `phq9`（抑郁症筛查）、`gad7`（焦虑症筛查）

#### 提交测评

```http
POST /api/v1/assessment/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "type": "phq9",
  "answers": [1, 2, 1, 0, 1, 2, 1, 0, 1]
}
```

### 9.6 风险检测服务

#### 风险检测

```http
POST /api/v1/risk/detect
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "content": "最近总是失眠，感觉很绝望"
}
```

**响应**：
```json
{
  "code": 200,
  "data": {
    "user_id": "student1",
    "risk_level": "orange",
    "confidence": 0.95,
    "details": {
      "keywords_detected": ["失眠", "绝望"],
      "semantic_intent": "情绪低落"
    }
  }
}
```

#### 获取危机热线

```http
GET /api/v1/risk/crisis/hotlines
```

**说明**: 无需认证，公开接口

### 9.7 家长端服务

#### 获取绑定的孩子列表

```http
GET /api/v1/parents/children
Authorization: Bearer {token}
```

#### 绑定孩子

```http
POST /api/v1/parents/children
Authorization: Bearer {token}
Content-Type: application/json

{
  "studentId": "student1",
  "studentNickname": "小明"
}
```

#### 授权绑定

```http
PUT /api/v1/parents/children/{bindingId}/authorize
Authorization: Bearer {token}
```

### 9.8 AI 引擎接口

> **基础 URL**: `http://localhost:8000`

#### AI 对话

```http
POST /chat
Content-Type: application/json

{
  "user_id": "student1",
  "message": "最近学习压力很大"
}
```

**响应**：
```json
{
  "response": "学习压力确实让人难受，想跟我聊聊具体是什么科目吗？",
  "risk_level": "green",
  "emotion_tags": ["焦虑", "压力"],
  "response_time_ms": 1250
}
```

#### 风险检测

```http
POST /risk/check
Content-Type: application/json

{
  "user_id": "student1",
  "content": "最近总是失眠，感觉很绝望"
}
```

#### 情绪分析

```http
POST /emotion/analyze
Content-Type: application/json

{
  "content": "今天考试考得很好，特别开心！"
}
```

#### 知识库搜索

```http
POST /knowledge/search
Content-Type: application/json

{
  "query": "认知行为疗法",
  "limit": 5
}
```

### 9.9 接口权限速查

| 接口路径 | 允许角色 | 需认证 |
|---------|---------|--------|
| `POST /api/v1/users/register` | 任何人 | 否 |
| `POST /api/v1/users/login` | 任何人 | 否 |
| `POST /api/v1/parents/register` | 任何人 | 否 |
| `POST /api/v1/parents/login` | 任何人 | 否 |
| `GET /api/v1/content/**` | 任何人 | 否 |
| `GET /api/v1/chat/topics` | 任何人 | 否 |
| `GET /api/v1/risk/crisis/hotlines` | 任何人 | 否 |
| `GET /health` | 任何人 | 否 |
| `WS /ws/**` | 任何人 | 否 |
| `GET /api/v1/parents/**` | PARENT | 是 |
| `GET/POST /api/v1/users/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/mood/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/chat/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/risk/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/assessment/**` | STUDENT/TEACHER | 是 |

---

## 10. 部署指南

### 10.1 Docker Compose 部署（推荐）

#### 步骤

```bash
cd server-services/deployment

# 1. 配置环境变量
cp .env.template .env
# 编辑 .env 文件配置密码和密钥

# 2. 构建并启动
docker-compose up -d --build

# 3. 查看状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

#### 服务端口映射

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|---------|---------|------|
| MySQL | 3306 | 3306 | 数据库 |
| MongoDB | 27017 | 27017 | 文档数据库 |
| Redis | 6379 | 6379 | 缓存 |
| backend-java | 8080 | 8080 | Java 后端 |
| ai-engine | 8000 | 8000 | AI 引擎 |

#### 停止服务

```bash
# 停止并删除容器
docker-compose down

# 停止并删除容器 + 数据卷（谨慎）
docker-compose down -v
```

### 10.2 Kubernetes 部署

```bash
cd server-services/deployment/kubernetes

# 应用部署文件
kubectl apply -f starisle-deployment.yml

# 查看状态
kubectl get pods
kubectl get svc

# 查看日志
kubectl logs -f deployment/starisle-backend
```

### 10.3 Nginx 反向代理

参考 `server-services/deployment/nginx/nginx.conf`：

```nginx
server {
    listen 80;
    server_name api.starisle.com;

    # HTTP 接口
    location / {
        proxy_pass http://backend-java:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend-java:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源
    location /static/ {
        root /usr/share/nginx/html;
    }
}
```

### 10.4 环境变量清单（生产）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接串 | `jdbc:mysql://mysql:3306/starisle` |
| `DATABASE_USERNAME` | 数据库用户名 | `starisle_user` |
| `DATABASE_PASSWORD` | 数据库密码 | - |
| `DATABASE_DRIVER` | 数据库驱动 | `com.mysql.cj.jdbc.Driver` |
| `HIBERNATE_DIALECT` | Hibernate 方言 | `org.hibernate.dialect.MySQLDialect` |
| `MONGODB_URL` | MongoDB 连接串 | `mongodb://admin:pass@mongodb:27017/starisle` |
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `ENCRYPTION_KEY` | AES 加密密钥 | - |
| `ENCRYPTION_MASTER_KEY` | 主密钥（32 字节） | - |
| `AI_SERVICE_URL` | AI 引擎地址 | `http://ai-engine:8000` |
| `MODEL_API_KEY` | 大模型 API Key | - |
| `MODEL_API_BASE` | 大模型 API 地址 | `https://api.deepseek.com` |

### 10.5 SLSA 构建来源证明

项目已配置完整的 SLSA 构建来源证明流程：

| 工作流 | 文件 | 触发条件 | 证明类型 |
|--------|------|---------|---------|
| 后端Java | `.github/workflows/slsa-backend-java.yml` | push/tags/release | 镜像证明 |
| AI引擎 | `.github/workflows/slsa-ai-engine.yml` | push/tags/release | 镜像证明 |
| Web前端 | `.github/workflows/slsa-web-frontend.yml` | push/tags/release | 文件证明 + 镜像证明 |

验证构建证明：

```bash
gh attestation verify oci://ghcr.io/user-unknowed/-StarIsle--backend:latest \
  --repo user-unknowed/-StarIsle-
```

---

## 11. 安全与合规

### 11.1 数据安全

- **传输层**: HTTPS/TLS 1.3 全程加密
- **认证层**: JWT Token + BCrypt 密码哈希 + Spring Security 角色控制
- **数据层**: AES-256-GCM 端到端加密、SQLCipher 本地加密存储
- **供应链**: GitHub Actions SLSA Build Level 2 构建来源证明
- **数据最小化**: 采集原则，用户可一键删除所有数据

### 11.2 安全架构

```
┌─────────────────────────────────────────┐
│              安全机制                    │
├─────────────────────────────────────────┤
│  HTTPS/TLS 1.3          传输层加密       │
│  JWT 认证               身份验证         │
│  AES-256-GCM            端到端加密       │
│  BCrypt 密码哈希        密码存储         │
│  SQL 注入防护           参数化查询       │
│  CORS 跨域控制          访问控制         │
│  SLSA Build L2          供应链安全       │
└─────────────────────────────────────────┘
```

### 11.3 合规要求

- 《个人信息保护法》合规
- 《未成年人网络保护条例》
- 《生成式AI服务管理暂行办法》
- 等保三级认证准备
- MITRE ATT&CK 框架安全评估

### 11.4 安全评估文档

项目包含完整的安全评估文档（`security-assessment/`）：

| 文档 | 说明 |
|------|------|
| `01-应用程序基本信息.md` | 应用基本信息 |
| `02-安全架构说明文档.md` | 安全架构说明 |
| `03-数据处理流程文档.md` | 数据处理流程 |
| `04-MITRE-ATTACK安全评估报告.md` | MITRE ATT&CK 评估报告 |
| `05-SLSA构建来源证明合规说明.md` | SLSA 合规说明 |

### 11.5 危机响应机制

#### 前端检测

- 三端聊天页面集成危机关键词检测（自伤、自杀、不想活、想死、结束生命）
- 命中后立即插入风险等级为 `red` 的安全引导回复
- 引导用户拨打危机热线

#### 后端检测

- AI 引擎双层风险检测（L1 关键词 + L2 语义分析）
- 风险等级 `red` 或 `orange` 时自动上报危机事件
- 通知教师/家长

#### 紧急帮助按钮

三端共用的浮动按钮，集成三条 24 小时心理危机热线：
- 12355 青少年服务热线
- 希望24热线
- 北京心理危机研究与干预中心

---

## 12. 常见问题

### Q1: 如何切换角色？

在 Web 前端登录页面选择对应的角色标签（学生/教师/家长），然后使用对应角色的测试账号登录。

### Q2: 家长端如何绑定孩子？

登录家长端后，进入"我的"页面，点击"绑定新孩子"，输入学生 ID 进行绑定。绑定后需要学生端确认授权。

### Q3: 如何查看情绪趋势？

在家长端首页点击"情绪趋势"卡片，查看详细的情绪变化图表（支持 7/30/90 天切换）。

### Q4: 开发时遇到 Web 前端构建错误怎么办？

```bash
# 先检查类型错误
npm run check

# 再检查代码规范
npm run lint

# 清除缓存后重试
rm -rf node_modules dist
npm install
npm run build
```

### Q5: 后端服务有两个版本（Go 和 Java），应该使用哪个？

当前项目处于过渡期，`backend-java/`（Spring Boot）是主要开发版本，`server-services/backend/`（Go）作为 API 网关保留。生产环境建议使用 Docker Compose 启动完整服务。

### Q6: Java 后端编译失败，提示 Lombok 找不到符号？

确保 `pom.xml` 中 Lombok 版本统一为 1.18.46（与 JDK 21 兼容）：

```xml
<properties>
    <lombok.version>1.18.46</lombok.version>
</properties>

<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <version>${lombok.version}</version>
    <optional>true</optional>
</dependency>
```

然后执行：
```bash
mvn clean compile
```

### Q7: 如何验证构建来源证明？

安装 GitHub CLI 后运行 `gh attestation verify` 命令，或在 GitHub 仓库的 Security 页面查看 Attestations。

### Q8: Docker 构建失败如何排查？

```bash
# 检查 .env 是否配置
cat .env

# 检查端口占用
docker-compose ps

# 查看具体服务日志
docker-compose logs mysql
docker-compose logs backend-java

# 重建镜像
docker-compose up -d --build
```

### Q9: AI 引擎启动失败？

```bash
# 检查环境变量
echo $MODEL_API_KEY

# 检查 Python 版本
python --version  # 需 >= 3.10

# 检查依赖安装
pip list | grep fastapi

# 重新安装依赖
pip install -r requirements.txt
```

### Q10: Flutter 运行失败？

```bash
# 检查 Flutter 环境
flutter doctor

# 检查设备连接
flutter devices

# 清理构建缓存
flutter clean
flutter pub get
```

### Q11: 如何切换数据库（开发 → 生产）？

编辑 `application.yml` 或通过环境变量：

```bash
# 使用 MySQL
export DATABASE_URL=jdbc:mysql://localhost:3306/starisle
export DATABASE_USERNAME=starisle_user
export DATABASE_PASSWORD=your_password
export DATABASE_DRIVER=com.mysql.cj.jdbc.Driver
export DDL_AUTO=update
export HIBERNATE_DIALECT=org.hibernate.dialect.MySQLDialect
export H2_CONSOLE_ENABLED=false

mvn spring-boot:run
```

### Q12: WebSocket 连接失败？

1. 确保后端服务已启动
2. 检查 WebSocket URL 是否正确（`ws://localhost:8080/ws/chat/{userId}`）
3. 生产环境强制使用 `wss://` 协议
4. 确认 JWT Token 有效（通过 Header 携带）

### Q13: 知识库 RAG 系统如何使用？

AI 引擎内置了基于 26 本心理学书籍的 RAG 系统。系统启动时会自动加载知识库（如 MongoDB 不可用则降级为内存缓存）。

API 端点：
- `POST /knowledge/search`: 搜索知识
- `GET /knowledge/stats`: 查看统计
- `POST /knowledge/import`: 导入新知识

---

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交代码 (`git commit -m "feat: xxx"`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

### 提交规范

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

---

## 版权与许可

### 许可证

本项目采用 **MIT License** 开源协议。

### 版权声明

© 2026 StarIsle 团队. All rights reserved.

本项目面向青少年心理健康领域，所有代码和文档均受知识产权保护。未经授权，禁止用于商业用途。

### 第三方依赖

项目使用的第三方库遵循其各自的开源许可证，详见各模块的依赖配置文件：
- `backend-java/pom.xml` - Java/Maven 依赖
- `web-frontend/package.json` - npm 依赖
- `server-services/ai-engine/requirements.txt` - Python 依赖
- `student-app/StarIsle-student/pubspec.yaml` - Flutter 依赖
- `teacher-app/StarIsle-teacher/pubspec.yaml` - Flutter 依赖

---

## 联系方式

- **GitHub**: https://github.com/user-unknowed/-StarIsle-
- **邮箱**: starisle@example.com

---

> **品牌 Slogan**: 「你的情绪星球，永远亮着灯」
