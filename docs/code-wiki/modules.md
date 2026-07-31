# 主要模块职责

## 模块总览

| 模块路径 | 技术栈 | 主要职责 | 部署形态 |
|---------|--------|---------|---------|
| `backend-java/` | Java 21 + Spring Boot 3.2 | 核心业务后端 | Docker / JAR |
| `web-frontend/` | React 18 + TypeScript + Vite | Web 多端应用 | Docker / 静态资源 |
| `后台/ai-engine/` | Python 3.10 + FastAPI | AI 对话与情绪分析 | Docker / Python |
| `后台/backend/` | Go 1.21 + Gin | API 网关（过渡期） | Docker / 二进制 |
| `学生端/StarIsle-student/` | Flutter 3.x | 学生移动端 App | APK / IPA |
| `教师端/StarIsle-teacher/` | Flutter 3.x | 教师移动端 App | APK / IPA |
| `家长端/` | React + TypeScript | 家长端 Web 页面扩展 | 同 web-frontend |
| `api-docs/` | React + Electron | API 文档桌面应用 | Electron 安装包 |

---

## 1. backend-java（核心业务后端）

### 职责
- 用户注册、登录、JWT 认证与角色权限控制
- 心情打卡数据的接收、存储、查询与统计
- 聊天消息的存储、历史查询、WebSocket 实时推送
- 风险检测触发与预警记录
- 家长绑定、授权管理与情绪数据共享
- 端到端加密通信的密钥管理

### 目录结构

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
│   │   ├── ContentController.java    # 内容（冥想等）接口
│   │   ├── HealthController.java     # 健康检查
│   │   ├── MigrationController.java  # 数据迁移
│   │   ├── MoodController.java       # 心情打卡接口
│   │   ├── ParentController.java     # 家长相关接口
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
│   ├── model/dart/                   # Dart 模型（供 Flutter 使用）
│   ├── repository/                   # Spring Data JPA 仓库
│   ├── service/                      # 业务服务层
│   │   ├── dart/                     # Dart 相关服务（MemoryStorage）
│   │   ├── ChatService.java
│   │   ├── EmotionAnalysisService.java
│   │   ├── KeyManagerService.java
│   │   ├── MigrationService.java
│   │   ├── ParentService.java
│   │   ├── RiskDetectionService.java
│   │   ├── SemanticAnalyzer.java
│   │   └── StarIsleSystemPrompt.java
│   ├── utils/                        # 工具类
│   │   ├── EncryptionUtil.java       # AES-256-GCM 加密工具
│   │   ├── JwtUtil.java              # JWT 生成与解析
│   │   └── KeywordManager.java       # 关键词管理
│   └── websocket/                    # WebSocket 处理器
│       └── ChatWebSocketHandler.java # 实时聊天处理
├── src/main/resources/
│   └── application.yml               # 应用配置（支持 H2/PostgreSQL/MySQL）
├── Dockerfile                        # 多阶段构建
├── pom.xml                           # Maven 依赖
└── README.md
```

### 关键配置
- `application.yml` 支持通过环境变量切换数据库（H2 开发、PostgreSQL 测试、MySQL 生产）
- 开发环境默认排除 MongoDB 和 Redis 的自动配置
- JWT 密钥和加密密钥通过环境变量注入

---

## 2. web-frontend（Web 前端）

### 职责
- 学生端 Web 页面：心情打卡、AI 对话、冥想放松、个人中心
- 教师端 Web 页面：班级状态、学生列表、AI 对话、个人中心
- 家长端 Web 页面：孩子情绪查看、AI 顾问对话、情绪趋势、应急预案
- 支持响应式布局，适配桌面端和移动端浏览器
- 通过 Capacitor 可打包为 Android/iOS 原生应用

### 目录结构

```
web-frontend/
├── src/
│   ├── assets/              # 静态资源
│   ├── components/          # 通用组件
│   │   ├── common/          # 公共组件（Header 等）
│   │   ├── ui/              # 基础 UI 组件（Button、Card、Input、Modal、Tabs、Toast）
│   │   ├── BubbleWrapGame.tsx
│   │   ├── Empty.tsx
│   │   ├── LazyLoad.tsx
│   │   └── SuspenseWrapper.tsx
│   ├── design/              # 设计系统
│   │   ├── platform.css     # 平台适配样式
│   │   ├── theme.ts         # 主题配置
│   │   └── tokens.ts        # 设计 Token
│   ├── hooks/               # 自定义 Hooks
│   │   └── useTheme.ts
│   ├── lib/                 # 工具函数
│   │   └── utils.ts
│   ├── pages/               # 页面组件
│   │   ├── student/         # 学生端页面
│   │   │   ├── StudentChat.tsx
│   │   │   ├── StudentHome.tsx
│   │   │   ├── StudentProfile.tsx
│   │   │   └── StudentRelax.tsx
│   │   ├── teacher/         # 教师端页面
│   │   │   ├── TeacherChat.tsx
│   │   │   ├── TeacherHome.tsx
│   │   │   ├── TeacherProfile.tsx
│   │   │   └── TeacherRelax.tsx
│   │   ├── Home.tsx         # 欢迎页
│   │   └── Login.tsx        # 登录页
│   ├── store/               # Zustand 状态管理
│   │   ├── authStore.ts     # 认证状态（登录/注册/角色）
│   │   ├── chatStore.ts     # 聊天状态
│   │   ├── classroomStore.ts # 班级状态
│   │   └── moodStore.ts     # 情绪状态
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx              # 根组件与路由配置
│   ├── main.tsx             # React 入口
│   └── index.css            # 全局样式
├── android/                 # Capacitor Android 配置
├── ios/                     # Capacitor iOS 配置
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── Dockerfile
```

### 技术栈详情

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 18.3.1 | UI 框架 |
| react-router-dom | 7.3.0 | 路由管理 |
| zustand | 5.0.3 | 状态管理 |
| tailwindcss | 3.4.17 | CSS 框架 |
| lucide-react | 0.511.0 | 图标库 |
| clsx | 2.1.1 | 条件类名 |
| tailwind-merge | 3.0.2 | 类名合并 |

---

## 3. 后台/ai-engine（AI 对话引擎）

### 职责
- 基于 CBT（认知行为疗法）框架的青少年心理咨询对话生成
- 实时风险检测：L1 关键词匹配 + L2 语义分析模型
- 情绪标签识别与趋势分析
- 支持 DeepSeek API 调用和本地 Transformer 模型推理
- 话题引导卡片生成

### 目录结构

```
后台/ai-engine/
├── app/
│   ├── models/
│   │   └── semantic_analyzer.py      # 语义分析模型封装
│   ├── prompts/
│   │   └── star宝_system_prompt.py   # 星宝角色系统提示词
│   ├── services/
│   │   ├── chat_service.py           # AI 对话服务核心
│   │   ├── emotion_analysis_service.py # 情绪分析服务
│   │   └── risk_detection_service.py # 风险检测服务
│   ├── utils/
│   │   ├── encryption.py             # 加密工具
│   │   └── keyword_manager.py        # 关键词管理
│   └── main.py                       # FastAPI 入口
├── data/                             # 训练/清洗数据
├── models/                           # 预训练 Word2Vec 模型
│   ├── pretrained_english/
│   └── pretrained_word2vec/
├── scripts/                          # 数据处理脚本
│   ├── extract_pdf_content.py
│   ├── pretrain_english.py
│   ├── pretrain_model.py
│   └── pretrain_word2vec.py
├── dockerfile
└── requirements.txt
```

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| fastapi | 0.108.0 | Web 框架 |
| uvicorn | 0.25.0 | ASGI 服务器 |
| transformers | 4.36.2 | HuggingFace 模型 |
| torch | 2.1.2 | 深度学习框架 |
| openai | 1.6.1 | DeepSeek/OpenAI API |
| langchain | 0.1.0 | LLM 应用框架 |
| scikit-learn | 1.3.2 | 机器学习工具 |

---

## 4. 后台/backend（Go API 网关）

### 职责
- 统一 API 入口，请求路由转发
- JWT 认证中间件
- 跨域（CORS）和速率限制
- 日志记录

### 目录结构

```
后台/backend/
├── cmd/api-gateway/
│   └── main.go              # 入口
├── internal/
│   ├── config/
│   │   └── config.go        # 配置加载
│   ├── handlers/            # HTTP 处理器
│   │   ├── assessment_handler.go
│   │   ├── chat_handler.go
│   │   ├── content_handler.go
│   │   ├── mood_handler.go
│   │   ├── risk_handler.go
│   │   └── user_handler.go
│   ├── middleware/          # 中间件（CORS、Auth、Logger、RateLimit）
│   └── routes/
│       └── routes.go        # 路由注册
├── dockerfile
└── go.mod
```

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| gin-gonic/gin | 1.9.1 | Web 框架 |
| go-redis/redis | 8.11.5 | Redis 客户端 |
| mongo-driver | 1.13.1 | MongoDB 客户端 |
| gorm + postgres driver | 1.25.5 / 1.5.4 | ORM 与 PostgreSQL |

---

## 5. 学生端/StarIsle-student（Flutter 学生 App）

### 职责
- 学生移动端原生体验（iOS/Android）
- 本地加密数据库存储（SQLCipher）
- 本地记忆存储管理（定时整理、存储监控）
- 音频冥想播放、动画交互
- AI 工具中心（文本生成、摘要、风格转换）

### 目录结构

```
学生端/StarIsle-student/
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

### 核心依赖

| 依赖 | 用途 |
|------|------|
| flutter_riverpod | 状态管理 |
| http / web_socket_channel | 网络通信 |
| sqflite_sqlcipher | 加密本地数据库 |
| just_audio | 音频播放 |
| lottie / rive | 动画 |
| fl_chart | 图表 |
| workmanager | 后台任务 |

---

## 6. 教师端/StarIsle-teacher（Flutter 教师 App）

### 职责
- 教师工作台概览与高风险学生告警
- 学生列表与情绪趋势查看
- 症状反馈与上报处理
- 对话观察与介入干预
- 本地记忆存储管理

### 目录结构

```
教师端/StarIsle-teacher/
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

---

## 7. 家长端（React Web 扩展）

### 职责
- 孩子情绪状态实时查看
- AI 心理顾问（大星）对话
- 情绪趋势分析（7/30/90 天）
- 应急预案与预警管理
- 心理健康知识库
- 孩子绑定与授权管理

### 目录结构

```
家长端/
├── src/
│   ├── pages/parent/
│   │   ├── EmergencyDetail.tsx      # 预警详情
│   │   ├── MoodDetail.tsx           # 情绪趋势详情
│   │   ├── ParentChat.tsx           # AI 对话
│   │   ├── ParentHome.tsx           # 首页
│   │   └── ParentProfile.tsx        # 个人中心
│   └── store/
│       └── parentStore.ts           # 家长端状态管理
└── 星屿-StarIsle-家长端APP-PRD.md
```

---

## 8. api-docs（API 文档桌面应用）

### 职责
- 基于 OpenAPI 规范的可视化 API 文档
- 内置 API 测试工具（Scalar API Client）
- Electron 打包，支持 Windows 桌面安装

### 目录结构

```
api-docs/
├── electron/
│   ├── main.js              # Electron 主进程
│   └── preload.js           # 预加载脚本
├── public/
│   └── spec/
│       └── openapi.yaml     # OpenAPI 规范
├── src/
│   ├── components/
│   │   └── ApiTester.tsx    # API 测试组件
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

### 核心依赖

| 依赖 | 用途 |
|------|------|
| @scalar/api-reference-react | OpenAPI 可视化 |
| @scalar/api-client | API 测试客户端 |
| electron | 桌面应用框架 |
