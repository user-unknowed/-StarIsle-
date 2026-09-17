# 主要模块职责

## 模块总览

| 模块路径 | 技术栈 | 主要职责 | 部署形态 |
|---------|--------|---------|---------|
| `backend-java/` | Java 21 + Spring Boot 3.2 | 核心业务后端 | Docker / JAR |
| `web-frontend/` | React 18 + TypeScript + Vite | Web 多端应用 | Docker / 静态资源 |
| `server-services/ai-engine/` | Python 3.10 + FastAPI | AI 对话与情绪分析 | Docker / Python |
| `server-services/backend/` | Go 1.21 + Gin | API 网关（过渡期） | Docker / 二进制 |
| `student-app/StarIsle-student/` | Flutter 3.x | 学生移动端 App | APK / IPA |
| `teacher-app/StarIsle-teacher/` | Flutter 3.x | 教师移动端 App | APK / IPA |
| `parent-app/` | React + TypeScript | 家长端 Web 页面扩展 | 同 web-frontend |
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
- 学生端 Web 页面：心情打卡、AI 对话、冥想放松、个人中心、紧急帮助按钮（v1.5）
- 教师端 Web 页面：班级状态、学生列表、AI 对话、个人中心、紧急帮助按钮（v1.5）
- 家长端 Web 页面：孩子情绪查看、AI 顾问对话、情绪趋势、**应急预案（v1.5全屏阻断弹窗 + 二次确认 + 超时升级）**
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
│   │   ├── parent/          # 家长端页面（v1.3新增）
│   │   │   ├── ParentHome.tsx        # 孩子情绪卡片概览 Dashboard
│   │   │   ├── ParentChat.tsx        # AI 心理顾问对话
│   │   │   ├── ParentChildren.tsx    # 绑定/管理孩子
│   │   │   ├── ParentEmergency.tsx   # 应急预案中心（详情/MoodDetail 子组件内嵌）
│   │   │   └── ParentProfile.tsx     # 家长个人中心
│   │   ├── Home.tsx         # 欢迎页
│   │   └── Login.tsx        # 登录页
│   ├── store/               # Zustand 状态管理
│   │   ├── authStore.ts     # 认证状态（登录/注册/角色）
│   │   ├── chatStore.ts     # 聊天状态
│   │   ├── classroomStore.ts # 班级状态
│   │   ├── moodStore.ts     # 情绪状态
│   │   └── parentStore.ts   # 家长端状态（v1.3新增）
│   ├── components/common/   # 公共组件
│   │   └── EmergencyHelpButton.tsx `v1.5新增` # 三端共用浮动紧急帮助按钮
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

## 3. server-services/ai-engine（AI 对话引擎）

### 职责
- 基于 CBT（认知行为疗法）框架的青少年心理咨询对话生成
- 实时风险检测：L1 关键词 28 类匹配 + L1.5 持续时间规则 + L1.6 心情历史结合 + L2 语义分析模型（v1.9 准确率 100%）
- 情绪标签识别与趋势分析
- 支持 DeepSeek API 调用和本地 Transformer 模型推理
- 话题引导卡片生成
- **Skill 架构（v2.0新增）**：BaseSkill/SkillRouter 动态路由，错误自动降级禁用
- **GitHub Fork 三层集成（v2.0新增）**：Skill Adapter 代码层、RAG knowledge_base.json 知识层、语料 combined_cleaned_text.txt 训练层
- **训练流水线（v2.0新增）**：M1 Fork 发现 → M2 集成 → M3a MLM → M3b SFT → M4 6维 LLM-as-Judge 评估 → 汇总报告（Orchestrator 一键）

### 目录结构

```
server-services/ai-engine/
├── app/
│   ├── models/
│   │   └── semantic_analyzer.py      # 语义分析模型封装
│   ├── prompts/
│   │   └── star宝_system_prompt.py   # 星宝角色系统提示词
│   ├── services/
│   │   ├── chat_service.py           # AI 对话服务核心
│   │   ├── emotion_analysis_service.py # 情绪分析服务
│   │   ├── risk_detection_service.py # 风险检测服务（多层级规则引擎）
│   │   └── knowledge_service.py `v2.0增强` # RAG 知识库(26本心理学书籍+Fork文档注入,带source_repo_id)
│   ├── skills/ `v2.0新增`            # 小星技能适配器（BaseSkill/SkillRouter/各 Adapter）
│   │   ├── base_skill.py             # BaseSkill 抽象基类
│   │   ├── skill_router.py           # SkillRouter 动态路由（原 registry.py 命名重构）
│   │   ├── emotional_support_conversation_adapter.py  # 情感支持对话 Skill
│   │   ├── sentiment_analysis_mental_health_adapter.py # 情绪分析 Skill
│   │   └── bert_mental_health_adapter.py  # BERT 心理健康 Skill
│   ├── utils/
│   │   ├── encryption.py             # 加密工具
│   │   └── keyword_manager.py        # 关键词管理（28分类，可热加载）
│   └── main.py                       # FastAPI 入口（含 GET /skills/status）
├── data/                             # 训练/清洗数据
│   ├── knowledge_base.json           # RAG 知识条目(含 source_repo_id 字段)
│   ├── combined_cleaned_text.txt     # 清洗后的 MLM/SFT 训练语料(含 fork)
│   └── sft_dataset.jsonl             # 指令微调数据
├── models/                           # 预训练 Word2Vec 模型
│   ├── pretrained_english/
│   └── pretrained_word2vec/
├── scripts/ `v2.0增强`               # 数据处理 + 训练流水线（14+ 脚本）
│   ├── extract_pdf_content.py
│   ├── pretrain_english.py
│   ├── pretrain_model.py
│   ├── pretrain_word2vec.py
│   ├── anonymize_pii.py               # PII 匿名化
│   ├── import_knowledge.py            # RAG 批量导入
│   ├── build_sft_dataset.py           # SFT 数据构建
│   ├── discover_forks.py              # M1 自动发现 GitHub Fork（原 discover_fork_repos.py 命名）
│   ├── integrate_forks.py             # M2 Skill+RAG+语料三层集成（原 integrate_fork_knowledge.py 命名）
│   ├── continued_pretrain_mlm.py      # M3a MLM 继续预训练(BERT)
│   ├── sft_full_finetune.py           # M3b SFT 全参/LoRA/CPU/SIM 显存降级链
│   ├── evaluate_model.py              # M4 6维 LLM-as-Judge 评估
│   └── orchestrate_fork_integration.py  # 6步 Orchestrator 入口(--smoke)
├── tests/ `v2.0新增`                 # 8 文件（7 test_*.py + __init__，另含 pytest.ini，20项单元测试）
│   ├── test_base_skill.py
│   ├── test_skill_router.py
│   ├── test_discover_forks.py
│   ├── test_integrate_forks.py
│   ├── test_build_sft_dataset.py
│   ├── test_gpu_downgrade.py         # 验证 FULL→LoRA→CPU→SIM 四级自动降级
│   └── test_evaluate_safety.py
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
| peft | 0.7.1 `v2.0新增` | LoRA 低秩微调 |
| accelerate | 0.25.0 `v2.0新增` | 分布式训练 + 显存降级链 |
| datasets | 2.15.0 `v2.0新增` | 训练数据处理（拼接/去重） |
| evaluate | 0.4.1 `v2.0新增` | 评估指标计算 |
| GitPython | 3.1.40 `v2.0新增` | Fork 仓库克隆与元数据 |
| langdetect | 1.0.9 `v2.0新增` | Fork 语料语种检测/过滤 |

---

## 4. server-services/backend（Go API 网关）

### 职责
- 统一 API 入口，请求路由转发
- JWT 认证中间件
- 跨域（CORS）和速率限制
- 日志记录

### 目录结构

```
server-services/backend/
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

## 5. student-app/StarIsle-student（Flutter 学生 App）

### 职责
- 学生移动端原生体验（iOS/Android）
- 本地加密数据库存储（SQLCipher）
- 本地记忆存储管理（定时整理、存储监控）
- 音频冥想播放、动画交互
- AI 工具中心（文本生成、摘要、风格转换）

### 目录结构

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

## 6. teacher-app/StarIsle-teacher（Flutter 教师 App）

### 职责
- 教师工作台概览与高风险学生告警
- 学生列表与情绪趋势查看
- 症状反馈与上报处理
- 对话观察与介入干预
- 本地记忆存储管理

### 目录结构

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

> 注意：家长端页面的代码主体位于 `web-frontend/src/pages/parent/`（5 个一级页面），本目录 `parent-app/` 存放家长端独立 PRD 文档，组件仅作归档引用。
> 当前 src 中仅保留 5 个一级页面；**MoodDetail（情绪趋势详情）与 EmergencyDetail（预警详情）现已内嵌为 ParentHome.tsx / ParentEmergency.tsx 的子组件/Section，不再作为独立文件存在**。

```
parent-app/
├── src/ (归档)
│   └── pages/parent/ 页面实现请查阅 web-frontend/src/pages/parent/
│       ├── ParentHome.tsx           # 首页（内嵌 MoodDetail Section）
│       ├── ParentEmergency.tsx      # 应急预案中心（内嵌 EmergencyDetail Section）
│       ├── ParentChildren.tsx       # 绑定管理
│       ├── ParentChat.tsx           # AI 对话
│       └── ParentProfile.tsx        # 个人中心
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
