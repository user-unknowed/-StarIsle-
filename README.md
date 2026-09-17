# 星屿 StarIsle - 青少年心理健康AI陪伴应用

> **版本**: v2.1（心理测评微信小程序增强版）
> **目标用户**: 12-18岁初高中生、教师及家长
> **核心定位**: AI情绪成长伙伴，零压力的第一心理求助站

## 项目概述

「星屿」StarIsle 是专为12-18岁初高中生打造的AI心理健康应用，通过极简心情打卡和24/7 AI对话，为学生提供零压力的情绪支持。同时为教师提供心理守护协同工作台，为家长提供孩子情绪状态查看与AI心理咨询服务，实现家校共育。

v2.1 新增「心理测评反馈微信小程序」模块，基于微信云开发，支持罗夏/TAT 自定义图片投射测评、AI 情绪分析、教师复核、匿名科研数据导出与管理员危机干预，所有 PII 默认匿名化处理，管理员 PII 访问需双因素认证。

## MVP核心功能

### 学生端
- ✅ 匿名注册与隐私保护
- ✅ 极简心情打卡（5档表情）
- ✅ AI星宝对话（基于CBT框架）
- ✅ 情绪探索测评（PHQ-9映射）
- ✅ 冥想放松（3-5个音频）
- ✅ 风险检测与危机响应
- ✅ 端到端加密通信
- ✅ **本地记忆存储管理**（加密数据库、定时整理、存储监控）
- ✅ **AI工具中心**（文本生成、内容摘要、风格转换）
- ✅ **紧急帮助按钮**（三端共用，一键拨打心理危机热线）`v1.5新增`
- ✅ **前端危机关键词检测**（自伤/自杀等关键词触发安全引导）`v1.5新增`
- ✅ **小星 Skill 自适应能力**（GitHub Fork 三层集成：代码能力+RAG知识+训练语料）`v2.0新增`

### 教师端
- ✅ 工作台概览与高风险告警
- ✅ 学生列表与情绪趋势查看
- ✅ 症状反馈与上报处理
- ✅ 对话观察与介入干预
- ✅ **本地记忆存储管理**（加密数据库、定时整理、存储监控）
- ✅ **紧急帮助按钮**（三端共用）`v1.5新增`

### 家长端
- ✅ 孩子情绪状态查看
- ✅ AI心理顾问（大星）对话
- ✅ 情绪趋势分析（7/30/90天）
- ✅ 应急预案与预警管理
- ✅ 心理健康知识库
- ✅ 通知设置与隐私管理
- ✅ 孩子绑定与授权管理
- ✅ **完整应急预案流程**（红色告警全屏阻断、二次确认、应急流程引导）`v1.5增强`
- ✅ **告警超时升级机制**（未处理告警自动升级风险等级）`v1.5新增`

### 心理测评微信小程序 `v2.1新增`
- ✅ **学生端**：测评任务大厅、罗夏/TAT/自定义图片投射反馈、历史记录与 AI 摘要、30 天自动登录
- ✅ **教师端**：班级管理、图片库管理、班级仪表盘、学生历史反馈、AI 审核复核、状态打标、特殊学生绑定
- ✅ **管理员端**：全局 KPI、科研数据 CSV 导出、危机高危干预（TOP50 全匿名 + 2FA + 30 秒 PII 窗口）、AI 质量仪表盘
- ✅ **AI 分析**：DashScope qwen-plus few-shot，指数退避重试，Token 预算 80%/95% 告警
- ✅ **隐私合规**：所有用户使用 anonymousNo，PII 仅危机干预双因素认证后 30 秒可见，4 层 null 化清理，审计日志匿名化
- ✅ **MCP Server**：6 个 Tool（listTasks / submitFeedback / aiAnalyze / reviewFeedback / exportResearch / accessPII），接入 server-services 聊天后端

## 技术架构

### 整体架构
```
┌─────────────────────────────────────────────────────────────────────┐
│                              客户端层                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ 学生端(Flutter)│  │ 教师端(Flutter)│  │  Web前端(React) │  │ 微信小程序  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────────────┼─────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              服务端层                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  API Gateway (Go / Gin)                       │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────┼───────────────────────────────┐       │
│  │                          ▼                               │       │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────┐│       │
│  │  │  Backend Java    │  │  AI Engine       │  │ MCP    ││       │
│  │  │  (Spring Boot)   │  │  (Python/FastAPI)│  │ Server ││       │
│  │  └──────────────────┘  └──────────────────┘  └────────┘│       │
│  └──────────────────────────┬───────────────────────────────┘       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                              数据层                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐        │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │   Kafka       │        │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              微信云开发 (云函数 / 云数据库 / 云存储)            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 技术栈详情
| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Web前端** | React + TypeScript | 18.x / 5.8.x | 多端Web应用 |
| **Web前端** | Vite | 6.3.x | 构建工具 |
| **Web前端** | Zustand | 5.0.x | 状态管理 |
| **Web前端** | React Router DOM | 7.3.x | 路由管理 |
| **Web前端** | TailwindCSS | 3.4.x | 样式框架 |
| **Web前端** | Lucide React | 0.511.x | 图标库 |
| **原生前端** | Flutter | 3.x | 跨平台iOS/Android |
| **原生前端** | Riverpod | - | 状态管理 |
| **原生前端** | SQLCipher | - | 加密本地存储 |
| **微信小程序** | WXML / WXSS / JavaScript | - | 心理测评反馈小程序 |
| **微信小程序** | 微信云开发 | - | 云函数 / 云数据库 / 云存储 |
| **后端服务** | Java + Spring Boot | 21 / 3.2.x | 核心业务逻辑 |
| **API网关** | Go + Gin | 1.21 / 1.9.x | 统一入口与路由 |
| **AI引擎** | Python + FastAPI | - / 0.108.x | AI对话与分析 |
| **AI引擎** | Transformers + Torch | 4.36.x / 2.1.x | 情绪分析模型 |
| **AI引擎** | LangChain | 0.1.x | LLM应用框架 |
| **AI分析** | DashScope qwen-plus | - | 心理测评反馈 AI 分析 `v2.1新增` |
| **MCP服务** | @modelcontextprotocol/sdk | 0.6.x | 心理测评 MCP Server `v2.1新增` |
| **MCP服务** | TypeScript + otplib + crypto-js | 5.x | 双因素认证与加密 `v2.1新增` |
| **AI训练** | PEFT + Accelerate | 0.7.x / 0.24.x | LoRA微调 + 显存优化 |`v2.0新增`
| **AI训练** | Datasets + Evaluate | 2.16.x / 0.4.x | 训练数据加载与评估 |`v2.0新增`
| **AI训练** | GitPython + LangDetect | 3.1.x / 1.0.x | Fork仓库解析+语种检测 |`v2.0新增`
| **数据库** | PostgreSQL | 14 | 关系型数据存储 |
| **数据库** | MongoDB | 6.0 | 非结构化数据存储 |
| **缓存** | Redis | 7.0 | 会话管理与缓存 |
| **消息队列** | Kafka | latest | 异步消息处理 |

### 组件职责划分
| 组件 | 技术栈 | 职责 |
|------|--------|------|
| `backend-java/` | Java Spring Boot | 核心业务服务（认证、用户管理、情绪数据、聊天、风险检测） |
| `server-services/backend/` | Go Gin | API网关（请求路由、负载均衡、统一认证入口） |
| `server-services/ai-engine/` | Python FastAPI | AI对话引擎（情绪分析、风险检测、语义分析） |
| `server-services/mcp-psych-assessment/` | TypeScript MCP SDK | 心理测评 MCP Server（6 Tool：任务/反馈/AI分析/复核/科研导出/PII访问）`v2.1新增` |
| `web-frontend/` | React TypeScript | Web端多角色应用（学生/教师/家长） |
| `student-app/` | Flutter | 学生端原生移动应用 |
| `teacher-app/` | Flutter | 教师端原生移动应用 |
| `projects/psych-assessment-miniapp/` | 微信小程序 + 云开发 | 心理测评反馈微信小程序（21页面 + 8云函数）`v2.1新增` |
| `tokens/psych-healing/` | CSS Variables / Tailwind | 疗愈独立色板与样式 Token（与主仓三层桥接）`v2.1新增` |

## 项目目录结构
```
-StarIsle-/
├── .github/                          # GitHub配置
│   └── workflows/                    # GitHub Actions工作流
│       ├── slsa-backend-java.yml     # 后端Java SLSA构建证明
│       ├── slsa-ai-engine.yml        # AI引擎SLSA构建证明
│       └── slsa-web-frontend.yml     # Web前端SLSA构建证明
├── .trae/                            # TRAE开发环境配置
│   └── documents/                    # 项目文档
│       ├── PRD.md                    # 产品需求文档
│       └── TechArch.md               # 技术架构文档
├── .vscode/                          # VSCode配置
│   └── settings.json                 # IDE设置
├── backend-java/                     # Java后端服务（Spring Boot）
│   ├── src/main/java/com/starisle/   # Java源码
│   │   ├── config/                   # 配置类（安全、CORS、WebSocket）
│   │   ├── controller/               # REST API控制器
│   │   ├── dto/                      # 数据传输对象
│   │   ├── entity/                   # JPA实体类
│   │   ├── repository/               # 数据访问层
│   │   ├── service/                  # 业务服务层
│   │   ├── utils/                    # 工具类（JWT、加密）
│   │   ├── websocket/                # WebSocket处理
│   │   └── StarIsleApplication.java  # 启动类
│   ├── src/main/resources/
│   │   └── application.yml           # 应用配置
│   ├── Dockerfile                    # Docker多阶段构建配置
│   ├── README.md                     # 后端服务文档
│   └── pom.xml                       # Maven依赖配置
├── web-frontend/                     # Web前端应用
│   ├── src/
│   │   ├── components/               # 通用组件
│   │   ├── hooks/                    # 自定义Hooks
│   │   ├── lib/                      # 工具函数
│   │   ├── pages/                    # 页面组件
│   │   │   ├── parent/               # 家长端页面
│   │   │   ├── student/              # 学生端页面
│   │   │   └── teacher/              # 教师端页面
│   │   ├── store/                    # Zustand状态管理
│   │   ├── types/                    # TypeScript类型定义
│   │   ├── App.tsx                   # 应用根组件
│   │   └── main.tsx                  # 入口文件
│   ├── android/                      # Android原生配置（Capacitor）
│   ├── ios/                          # iOS原生配置（Capacitor）
│   ├── Dockerfile                    # Docker多阶段构建配置
│   ├── package.json                  # npm依赖配置
│   ├── vite.config.ts                # Vite构建配置
│   └── tailwind.config.js            # TailwindCSS配置
├── server-services/                             # 后台服务（Go后端 + AI引擎 + MCP）
│   ├── ai-engine/                    # AI对话引擎（Python）
│   │   ├── app/
│   │   │   ├── models/               # 语义分析模型
│   │   │   ├── prompts/              # 系统提示词
│   │   │   ├── services/             # AI服务层
│   │   │   ├── skills/               # 小星技能适配器（Fork集成）`v2.0新增`
│   │   │   ├── utils/                # 工具函数
│   │   │   └── main.py               # 入口文件
│   │   ├── scripts/                  # AI训练与集成脚本 `v2.0新增`
│   │   │   ├── discover_forks.py     # M1: GitHub Fork发现
│   │   │   ├── integrate_forks.py    # M2: 三层集成（Skill+RAG+语料）
│   │   │   ├── build_sft_dataset.py  # SFT数据集构建
│   │   │   ├── continued_pretrain_mlm.py # M3a: MLM继续预训练
│   │   │   ├── sft_full_finetune.py  # M3b: SFT全参数微调
│   │   │   ├── evaluate_model.py     # M4: 6维LLM-as-Judge评估
│   │   │   └── orchestrate_fork_integration.py # 一键流水线
│   │   ├── tests/                    # 单元测试 `v2.0新增`
│   │   ├── data/                     # 训练数据与集成产物
│   │   ├── models/                   # 训练模型输出
│   │   ├── dockerfile                # Docker构建配置
│   │   └── requirements.txt          # Python依赖
│   ├── backend/                      # API网关（Go）
│   │   ├── cmd/api-gateway/          # 命令入口
│   │   ├── internal/
│   │   │   ├── config/               # 配置管理
│   │   │   ├── handlers/             # HTTP处理器
│   │   │   └── routes/               # 路由配置
│   │   ├── dockerfile                # Docker构建配置
│   │   └── go.mod                    # Go模块依赖
│   ├── mcp-psych-assessment/         # 心理测评 MCP Server `v2.1新增`
│   │   ├── src/
│   │   │   ├── shared/               # 共享中间件（审计/越权/PII/2FA）
│   │   │   │   ├── auditLogger.ts    # 审计日志（PII scrub）
│   │   │   │   ├── scopeGuard.ts     # 角色白名单 + anonymousNo 越权
│   │   │   │   ├── piiGate.ts        # PII 强制脱敏
│   │   │   │   ├── twoFA.ts          # 密码+SMS/TOTP 双因素认证
│   │   │   │   ├── dashscope.ts      # DashScope AI 客户端
│   │   │   │   └── cloudBridge.ts    # 微信云开发桥接
│   │   │   ├── tools/                # 6 个 Tool 处理器
│   │   │   │   ├── listTasks.ts
│   │   │   │   ├── submitFeedback.ts
│   │   │   │   ├── aiAnalyze.ts
│   │   │   │   ├── reviewFeedback.ts
│   │   │   │   ├── exportResearch.ts
│   │   │   │   └── accessPII.ts
│   │   │   └── index.ts              # MCP stdio Server 入口
│   │   ├── tests/                    # 6 个 vitest 测试（100% 覆盖）
│   │   ├── .env.example              # 环境变量模板
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/                     # 数据库配置
│   │   └── postgres/init.sql         # 初始化脚本
│   ├── deployment/                   # 部署配置
│   │   ├── kubernetes/               # Kubernetes部署文件
│   │   ├── nginx/                    # Nginx配置
│   │   └── docker-compose.yml        # Docker Compose配置
│   ├── docs/                         # 技术文档
│   │   ├── API文档.md
│   │   ├── 开发规范.md
│   │   ├── 部署指南.md
│   │   └── 验证报告.md
│   ├── testing/                      # 测试配置
│   ├── .env.template                 # 环境变量模板
│   └── CHANGELOG.md                  # 变更日志
├── projects/                                  # 独立子项目 `v2.1新增`
│   └── psych-assessment-miniapp/     # 心理测评反馈微信小程序
│       ├── pages/                    # 21 页面（学生3 / 教师7 / 管理员4 / 登录2 + 子页）
│       ├── cloudfunctions/           # 8 云函数 + 6 shared 模块
│       ├── components/               # 复用组件（admin-2fa）
│       ├── custom-tab-bar/           # 角色动态 TabBar
│       ├── utils/                    # 8 前端工具模块
│       ├── scripts/                  # 初始化脚本（seed-images / create-admin）
│       ├── docs/                     # 项目文档
│       ├── tokens/                   # 疗愈色板 Token 副本
│       ├── acceptance_check.py       # 37 项验收脚本
│       └── README.psych-assessment.md
├── tokens/                                    # UI 设计 Token `v2.1新增`
│   └── psych-healing/                # 疗愈独立色板（奶油色 / 森林绿 / 薄纱粉）
│       ├── tokens.json               # Token 定义
│       ├── tokens.css                # CSS Variables
│       ├── starlisle-bridge.css      # 与主仓三层桥接（间距/圆角/按钮）
│       ├── tailwind.preset.js        # Tailwind 预设
│       └── miniapp-app.wxss          # 小程序全局样式
├── student-app/                           # 学生端原生应用
│   ├── StarIsle-student/             # Flutter应用
│   │   ├── lib/                      # Dart源码
│   │   │   ├── providers/            # Riverpod providers
│   │   │   ├── screens/              # 页面组件
│   │   │   ├── services/             # 业务服务
│   │   │   └── theme/                # 主题配置
│   │   ├── assets/                   # 静态资源
│   │   └── pubspec.yaml              # Flutter依赖
│   └── docs/                         # 学生端产品文档
├── teacher-app/                           # 教师端原生应用
│   ├── StarIsle-teacher/             # Flutter应用
│   │   ├── lib/                      # Dart源码
│   │   ├── assets/                   # 静态资源
│   │   └── pubspec.yaml              # Flutter依赖
│   └── docs/                         # 教师端产品文档
├── parent-app/                           # 家长端组件（Web）
│   ├── src/
│   │   ├── pages/parent/             # 家长端页面组件
│   │   └── store/parentStore.ts      # 家长端状态管理
│   └── 星屿-StarIsle-家长端APP-PRD.md # PRD文档
├── security-assessment/              # 安全评估文档
│   ├── 00-归档索引.md                # 文档归档索引
│   ├── 01-应用程序基本信息.md         # 应用基本信息
│   ├── 02-安全架构说明文档.md         # 安全架构说明
│   ├── 03-数据处理流程文档.md         # 数据处理流程
│   ├── 04-MITRE-ATTACK安全评估报告.md # MITRE ATT&CK评估报告
│   └── 05-SLSA构建来源证明合规说明.md # SLSA合规说明
├── docs/                             # 项目文档
│   ├── psych-assessment/             # 心理测评模块文档 `v2.1新增`
│   │   ├── design.md                 # 设计规范
│   │   ├── implementation-plan.md    # 实施计划
│   │   ├── project-overview.md       # 项目总览
│   │   ├── test-cases-34.md          # 34 条测试用例
│   │   ├── acceptance-report-37-pass.md # 37 项验收报告
│   │   └── import-checklist.md       # 导入检查清单
│   └── backend-fix-report.md         # 后端修复报告
├── BUILD_GUIDE.md                    # 构建指南
├── build_android.ps1                 # Android构建脚本
├── build_ios.sh                      # iOS构建脚本
└── README.md                         # 项目总览说明（本文件）
```

## 文件依赖关系

### 前端依赖
```
web-frontend/src/main.tsx
    └── App.tsx
        ├── pages/student/StudentHome.tsx
        ├── pages/teacher/TeacherHome.tsx
        ├── pages/parent/ParentHome.tsx
        └── store/authStore.ts
                ├── store/chatStore.ts
                ├── store/moodStore.ts
                └── store/classroomStore.ts
```

### 心理测评小程序依赖 `v2.1新增`
```
projects/psych-assessment-miniapp/app.js
    ├── utils/auth.js          # 30天登录会话
    ├── utils/cloud.js         # 云函数统一封装
    ├── utils/platform.js      # Android/iOS/Harmony 适配
    └── utils/pii.js           # 前端 PII 模糊化

cloudfunctions/*/index.js
    └── shared/verifyRole.js   # 所有云函数首行鉴权
    └── shared/stripPII.js     # 三角色 PII 白名单过滤
    └── shared/dashscopeClient.js  # DashScope AI 调用
```

### 后端依赖
```
backend-java/StarIsleApplication.java
    ├── config/SecurityConfig.java
    │   ├── config/JwtAuthenticationFilter.java
    │   └── config/WebSocketConfig.java
    ├── controller/UserController.java
    │   ├── service/ParentService.java
    │   └── repository/UserRepository.java
    ├── controller/ChatController.java
    │   ├── service/ChatService.java
    │   └── websocket/ChatWebSocketHandler.java
    ├── controller/MoodController.java
    │   ├── service/EmotionAnalysisService.java
    │   └── repository/MoodRecordRepository.java
    ├── controller/RiskController.java
    │   └── service/RiskDetectionService.java
    └── utils/JwtUtil.java
```

### AI引擎依赖
```
server-services/ai-engine/app/main.py
    ├── services/chat_service.py
    │   ├── models/semantic_analyzer.py
    │   ├── prompts/star宝_system_prompt.py
    │   └── skills/skill_router.py        # v2.0新增：技能路由
    ├── skills/                            # v2.0新增：Fork技能适配器
    │   ├── base_skill.py                 # 抽象基类
    │   └── *_adapter.py                  # Fork自动生成的技能
    ├── services/emotion_analysis_service.py
    ├── services/risk_detection_service.py
    └── utils/keyword_manager.py
scripts/orchestrate_fork_integration.py   # v2.0新增：一键流水线
    ├── discover_forks.py                 # M1: Fork发现
    ├── integrate_forks.py                # M2: 三层集成
    ├── continued_pretrain_mlm.py         # M3a: MLM预训练
    ├── sft_full_finetune.py              # M3b: SFT微调
    └── evaluate_model.py                 # M4: 6维评估
```

### 心理测评 MCP Server 依赖 `v2.1新增`
```
server-services/mcp-psych-assessment/src/index.ts
    ├── shared/auditLogger.ts     # 审计中间件（PII scrub）
    ├── shared/scopeGuard.ts      # 角色 + anonymousNo 越权
    ├── shared/piiGate.ts         # 输出 PII 强制脱敏
    └── tools/
        ├── listTasks.ts          # 查询测评任务
        ├── submitFeedback.ts     # 学生提交反馈
        ├── aiAnalyze.ts          # AI 分析（DashScope）
        ├── reviewFeedback.ts     # 教师复核
        ├── exportResearch.ts     # 匿名科研导出
        └── accessPII.ts          # 双 2FA PII 访问
```

## 快速开始

### 环境要求
| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Flutter SDK | 3.0 | 原生端开发 |
| Node.js | 18.0.0 | Web前端 / MCP Server 开发 |
| 微信开发者工具 | 1.06+ | 微信小程序开发 `v2.1新增` |
| Java JDK | 21 | 后端服务开发 |
| Maven | 3.8 | Java构建工具 |
| Go | 1.21 | API网关开发 |
| Python | 3.10 | AI引擎开发 |
| PostgreSQL | 14 | 关系数据库 |
| MongoDB | 6.0 | 文档数据库 |
| Redis | 7.0 | 缓存服务 |

### 使用Docker Compose启动（推荐）
```bash
cd server-services/deployment
cp ../.env.template .env
# 编辑 .env 文件，配置数据库密码等环境变量
docker-compose up -d
```

### Web前端开发
```bash
cd web-frontend
npm install
npm run dev
```
访问 http://localhost:5173 查看应用

### Java后端服务启动
```bash
cd backend-java
mvn clean compile
mvn spring-boot:run
```
服务运行在 http://localhost:8080

### AI引擎启动
```bash
cd server-services/ai-engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py
```
服务运行在 http://localhost:8000

### 小星训练流水线（v2.0新增）
```bash
cd server-services/ai-engine
# 一键执行全流程（discover → integrate → mlm → sft → evaluate → report）
PYTHONPATH=. python scripts/orchestrate_fork_integration.py \
  --smoke --max-forks 3 --force-sft-mode simulation
# 真实 GPU 训练（需 80GB A100）
PYTHONPATH=. python scripts/orchestrate_fork_integration.py --max-forks 10
# 查看技能状态
curl http://localhost:8000/skills/status
```

### 心理测评微信小程序开发 `v2.1新增`
```bash
# 1. 用微信开发者工具导入 projects/psych-assessment-miniapp/
# 2. 在 project.private.config.json 中填入云环境 ID
# 3. 逐个云函数安装依赖并上传：
cd projects/psych-assessment-miniapp/cloudfunctions
for d in login classOperate imageOperate taskOperate feedbackSubmit aiAnalyze cacheClear statusOperate crisis; do
  cd $d && npm install && cd ..
done
# 4. 初始化系统图片：运行 scripts/seed-images.js
# 5. 创建管理员账号：参考 scripts/create-admin-user.md
```

### 心理测评 MCP Server 开发 `v2.1新增`
```bash
cd server-services/mcp-psych-assessment
npm install
cp .env.example .env  # 填写 DASHSCOPE_KEY / 2FA 环境变量
npm run build
npm test              # vitest 16/16
node dist/index.js    # stdio MCP Server 启动
```

### Go API网关启动
```bash
cd server-services/backend
go mod download
go run cmd/api-gateway/main.go
```
服务运行在 http://localhost:8080

### 学生端原生开发
```bash
cd student-app/StarIsle-student
flutter pub get
flutter run
```

### 教师端原生开发
```bash
cd teacher-app/StarIsle-teacher
flutter pub get
flutter run
```

## 登录测试账号

### 学生端
- 账号: `student1`
- 密码: `123456`

### 教师端
- 账号: `teacher1`
- 密码: `123456`

### 家长端
- 账号: `parent1`
- 密码: `123456`

### 心理测评小程序 `v2.1新增`
- 学生：首次进入选择「学生」角色，自动分配 anonymousNo
- 教师：选择「教师」角色，等待管理员审批
- 管理员：按 `scripts/create-admin-user.md` 创建账号，使用密码 + SMS/TOTP 双因素登录
