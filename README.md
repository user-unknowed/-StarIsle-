# 星屿 StarIsle - 青少年心理健康AI陪伴应用

> **版本**: MVP v1.5
> **目标用户**: 12-18岁初高中生、教师及家长
> **核心定位**: AI情绪成长伙伴，零压力的第一心理求助站

## 项目概述

「星屿」StarIsle 是专为12-18岁初高中生打造的AI心理健康应用，通过极简心情打卡和24/7 AI对话，为学生提供零压力的情绪支持。同时为教师提供心理守护协同工作台，为家长提供孩子情绪状态查看与AI心理咨询服务，实现家校共育。

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

## 技术架构

### 整体架构

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
| **后端服务** | Java + Spring Boot | 21 / 3.2.x | 核心业务逻辑 |
| **API网关** | Go + Gin | 1.21 / 1.9.x | 统一入口与路由 |
| **AI引擎** | Python + FastAPI | - / 0.108.x | AI对话与分析 |
| **AI引擎** | Transformers + Torch | 4.36.x / 2.1.x | 情绪分析模型 |
| **AI引擎** | LangChain | 0.1.x | LLM应用框架 |
| **数据库** | PostgreSQL | 14 | 关系型数据存储 |
| **数据库** | MongoDB | 6.0 | 非结构化数据存储 |
| **缓存** | Redis | 7.0 | 会话管理与缓存 |
| **消息队列** | Kafka | latest | 异步消息处理 |

### 组件职责划分

| 组件 | 技术栈 | 职责 |
|------|--------|------|
| `backend-java/` | Java Spring Boot | 核心业务服务（认证、用户管理、情绪数据、聊天、风险检测） |
| `后台/backend/` | Go Gin | API网关（请求路由、负载均衡、统一认证入口） |
| `后台/ai-engine/` | Python FastAPI | AI对话引擎（情绪分析、风险检测、语义分析） |
| `web-frontend/` | React TypeScript | Web端多角色应用（学生/教师/家长） |
| `学生端/` | Flutter | 学生端原生移动应用 |
| `教师端/` | Flutter | 教师端原生移动应用 |

## 项目目录结构

```
-StarIsle-/n├── .github/                          # GitHub配置
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
├── 后台/                             # 后台服务（Go后端 + AI引擎）
│   ├── ai-engine/                    # AI对话引擎（Python）
│   │   ├── app/
│   │   │   ├── models/               # 语义分析模型
│   │   │   ├── prompts/              # 系统提示词
│   │   │   ├── services/             # AI服务层
│   │   │   ├── utils/                # 工具函数
│   │   │   └── main.py               # 入口文件
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
├── 学生端/                           # 学生端原生应用
│   ├── StarIsle-student/             # Flutter应用
│   │   ├── lib/                      # Dart源码
│   │   │   ├── providers/            # Riverpod providers
│   │   │   ├── screens/              # 页面组件
│   │   │   ├── services/             # 业务服务
│   │   │   └── theme/                # 主题配置
│   │   ├── assets/                   # 静态资源
│   │   └── pubspec.yaml              # Flutter依赖
│   └── docs/                         # 学生端产品文档
├── 教师端/                           # 教师端原生应用
│   ├── StarIsle-teacher/             # Flutter应用
│   │   ├── lib/                      # Dart源码
│   │   ├── assets/                   # 静态资源
│   │   └── pubspec.yaml              # Flutter依赖
│   └── docs/                         # 教师端产品文档
├── 家长端/                           # 家长端组件（Web）
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
后台/ai-engine/app/main.py
    ├── services/chat_service.py
    │   ├── models/semantic_analyzer.py
    │   └── prompts/star宝_system_prompt.py
    ├── services/emotion_analysis_service.py
    ├── services/risk_detection_service.py
    └── utils/keyword_manager.py
```

## 快速开始

### 环境要求

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Flutter SDK | 3.0 | 原生端开发 |
| Node.js | 18.0.0 | Web前端开发 |
| Java JDK | 21 | 后端服务开发 |
| Maven | 3.8 | Java构建工具 |
| Go | 1.21 | API网关开发 |
| Python | 3.10 | AI引擎开发 |
| PostgreSQL | 14 | 关系数据库 |
| MongoDB | 6.0 | 文档数据库 |
| Redis | 7.0 | 缓存服务 |

### 使用Docker Compose启动（推荐）

```bash
cd 后台/deployment
cp .env.template .env
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
cd 后台/ai-engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py
```

服务运行在 http://localhost:8000

### Go API网关启动

```bash
cd 后台/backend
go mod download
go run cmd/api-gateway/main.go
```

服务运行在 http://localhost:8080

### 学生端原生开发

```bash
cd 学生端/StarIsle-student
flutter pub get
flutter run
```

### 教师端原生开发

```bash
cd 教师端/StarIsle-teacher
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

## 安全与合规

### 数据安全
- ✅ HTTPS/TLS 1.3全程加密
- ✅ 对话内容端到端加密（AES-256-GCM）
- ✅ 本地数据加密存储（SQLCipher）
- ✅ 数据最小化采集原则
- ✅ 用户可一键删除所有数据
- ✅ SLSA Build Track Level 2 构建来源证明

### 合规要求
- ✅ 《个人信息保护法》合规
- ✅ 《未成年人网络保护条例》
- ✅ 《生成式AI服务管理暂行办法》
- ✅ 等保三级认证准备
- ✅ MITRE ATT&CK框架安全评估

### SLSA构建来源证明

项目已配置完整的SLSA构建来源证明流程，确保软件供应链安全：

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

## MVP验证指标

| 指标 | 目标值 |
|------|--------|
| 7日留存率 | > 30% |
| 30日留存率 | > 15% |
| 日均心情打卡率 | > 40% |
| 用户NPS | > 40 |
| 高风险热线触达率 | > 80% |

## 常见问题

### Q: 如何切换角色？
A: 在Web前端登录页面选择对应的角色标签（学生/教师/家长），然后使用对应角色的测试账号登录。

### Q: 家长端如何绑定孩子？
A: 登录家长端后，进入"我的"页面，点击"绑定新孩子"，使用扫码功能绑定孩子账号。

### Q: 如何查看情绪趋势？
A: 在家长端首页点击"情绪趋势"卡片，查看详细的情绪变化图表（支持7/30/90天切换）。

### Q: 开发时遇到构建错误怎么办？
A: Web前端先运行 `npm run check` 检查TypeScript类型错误，再运行 `npm run lint` 检查代码规范问题。

### Q: 后端服务有两个版本（Go和Java），应该使用哪个？
A: 当前项目处于过渡期，`backend-java/`（Spring Boot）是主要开发版本，`后台/backend/`（Go）作为API网关保留。生产环境建议使用Docker Compose启动完整服务。

### Q: 如何验证构建来源证明？
A: 安装GitHub CLI后运行 `gh attestation verify` 命令，或在GitHub仓库的Security页面查看Attestations。

### Q: Docker构建失败如何排查？
A: 检查Dockerfile路径配置是否正确，确认工作目录下有对应的Dockerfile文件。

## 开发团队

- 产品设计: 产品团队
- Web前端开发: React + TypeScript开发团队
- 原生前端开发: Flutter开发团队 (Dart)
- 后端开发: Java开发团队 (Spring Boot)
- AI研发: 大模型算法团队
- 测试: QA团队

## 版本历史

- **v1.0 MVP** (2026-06): 核心功能验证
- **v1.1** (2026-07): 本地记忆存储管理实现、AI服务集成
- **v1.2** (2026-07): 后端服务迁移至Java (Spring Boot)、编译路径重构
- **v1.3** (2026-07): Web前端实现（学生/教师/家长三端）、家长端功能上线
- **v1.4** (2026-07): SLSA构建来源证明配置、安全评估文档完善、Dockerfile优化
- **v1.5** (2026-07-31): HOTL代码审核修复、三端紧急帮助按钮、危机响应流程完善、HTTP安全增强、测试sleep预埋

## v1.5 更新详情（2026-07-31）

### 更新目的

基于HOTL（trae-remote-official:hotl:code-review）对AI大模型相关代码及前端安全边界的代码审核结果，针对21项BLOCK级问题进行集中修复，补齐PRD要求的安全红线、危机响应和API契约一致性，并预埋测试sleep代码以支撑后续小规模集成测试。

### 模块变更

#### 1. 安全边界与危机响应（学生/教师/家长三端）

- **新增三端共用紧急帮助按钮组件** `EmergencyHelpButton.tsx`
  - 浮动按钮形态，集成三条24小时心理危机热线（12355青少年服务热线、希望24热线、北京心理危机研究与干预中心）
  - 一键拨号（`tel:` 协议）+ 热线详情展示
  - 学生端、教师端、家长端聊天页面均已集成
- **前端危机关键词检测**（家长端 `ParentChat.tsx`、学生端 `StudentChat.tsx`、教师端 `TeacherChat.tsx`）
  - 关键词清单：自伤、自杀、不想活、想死、结束生命
  - 命中后立即插入风险等级为 `red` 的安全引导回复，引导用户拨打危机热线
  - 不将敏感原文写入日志，避免PII泄露
- **家长端应急预案完整实现** `ParentEmergency.tsx`
  - 红色告警全屏阻断弹窗（`z-50 bg-red-900/80`）
  - 二次确认机制，防止误触关闭告警
  - 完整应急流程：识别 → 确认 → 联系热线 → 上报 → 跟进记录
- **`chatStore.ts` 风险上报联动**
  - 检测到 `riskLevel === 'red' || 'orange'` 时自动调用 `riskApi.reportCrisis` 上报危机事件
  - 上报失败静默吞错，不影响主对话流程

#### 2. HTTP通信安全增强

- **响应自动解包** `http.ts`
  - 自动识别后端统一响应格式 `{code, message, data}` 并解包 `data` 字段
  - 非统一格式（如AI引擎原始响应）原样返回，向后兼容
- **敏感路径脱敏**
  - 日志中对 `/auth/login`、`/auth/register`、`/v1/chat/message` 等路径的请求体进行字段级脱敏（password、token、message等字段）
- **401错误去重处理**
  - 同一会话内多次401仅触发一次跳转登录，避免循环弹窗
- **超时控制**
  - 默认请求超时10秒，AI对话接口单独配置30秒超时

#### 3. API契约一致性修复

- **统一 `/v1` 前缀** `api.ts`
  - 所有REST接口路径补全 `/v1` 前缀，与后端 `application.yml` 路由配置对齐
  - 涉及：`/v1/auth/login`、`/v1/auth/register`、`/v1/chat/message`、`/v1/mood/checkin`、`/v1/risk/report` 等
- **消息长度校验**
  - `chatApi.sendMessage` 入参校验消息长度上限2000字，超长抛出 `ApiError('MESSAGE_TOO_LONG', 400)`
- **路径参数修正**
  - `assessmentApi.getResult(resultId)` 由 query string 改为 path param `/v1/assessment/result/{resultId}`
- **WebSocket连接修复** `ws.ts`
  - 强制 `wss://` 协议（生产环境）
  - 连接时携带 `Authorization: Bearer <JWT>` 头部
  - 断线指数退避重连（1s/2s/4s/8s，最大30s）

#### 4. 类型系统修正

- **`RiskLevelType` 强类型约束** `types/index.ts`
  - 新增 `export type RiskLevelType = 'green' | 'yellow' | 'orange' | 'red'`
  - `ChatResponse.riskLevel` 由 `string` 收窄为 `RiskLevelType`
- **`AssessmentResult` 接口修正**
  - `risk_level` 字段类型对齐后端返回值
  - `suggestions` 改为 `string[]`，移除可选 `suggestion` 单数字段
- **`ParentState` 接口补全**
  - `parentStore.ts` 中补充 `checkAlertTimeout` 方法定义，修复TypeScript编译错误

#### 5. 测试sleep代码预埋

为支撑后续小规模集成测试，在关键链路预埋可配置的延迟代码（仅开发环境生效，通过 `import.meta.env.DEV` 守卫）：

- `http.ts`: 请求前200ms延迟，模拟网络抖动
- `chatStore.ts`: AI回复前500ms延迟，模拟大模型推理耗时
- `parentStore.ts`: 告警查询前300ms延迟，模拟后端风险检测耗时

预埋代码已通过 `npm run build` 验证，生产构建会被tree-shaking移除，不影响线上性能。

### 技术细节

| 维度 | 修复前 | 修复后 |
|------|--------|--------|
| 危机热线触达 | 仅家长端静态展示 | 三端浮动按钮 + 一键拨号 + 关键词触发 |
| HTTP响应处理 | 各调用方手动解包 | `http.ts` 统一自动解包 |
| API路径前缀 | 部分接口缺失 `/v1` | 全量补齐，与后端路由对齐 |
| WebSocket鉴权 | URL携带token（泄露风险） | Header携带JWT |
| 风险上报 | 仅后端检测 | 前后端双重检测联动 |
| 类型安全 | `riskLevel: string` | `riskLevel: RiskLevelType` 联合类型 |

### 使用变更

- **无破坏性变更**：所有修复保持API向后兼容，现有调用方无需改动
- **新增依赖**：无（仅使用已有 `lucide-react` 图标库）
- **配置变更**：无（WebSocket鉴权方式变更对调用方透明）

### 验证情况

- ✅ `npm run build` 构建通过，无TypeScript错误
- ✅ `npm run lint` 代码规范检查通过
- ✅ 三端聊天页面危机关键词触发测试通过
- ✅ 紧急帮助按钮浮动显示与拨号功能测试通过
- ✅ HTTP响应解包兼容统一格式与原始格式
- ✅ WebSocket wss连接与JWT鉴权验证通过
- ✅ 预埋sleep代码在开发环境生效，生产构建被移除

### 已知限制

1. **危机关键词为前端检测**：仅为第一道防线，最终判定仍依赖后端AI引擎的 `risk_detection_service`
2. **测试sleep为开发环境专用**：生产环境通过 `import.meta.env.DEV` 守卫移除，但若误用 `import.meta.env.MODE === 'development'` 判断可能失效，需在CI中校验
3. **热线号码为硬编码**：暂未接入后端配置接口，后续需支持运营动态配置
4. **家长端应急预案**：当前仅支持单次告警确认，多告警并发场景的优先级排序待后续迭代

### 修改文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `web-frontend/src/services/http.ts` | 修改 | 响应解包、脱敏、401去重、超时、sleep预埋 |
| `web-frontend/src/services/api.ts` | 修改 | `/v1`前缀补全、消息长度校验、路径参数修正 |
| `web-frontend/src/services/ws.ts` | 修改 | wss强制、JWT鉴权、指数退避重连 |
| `web-frontend/src/components/common/EmergencyHelpButton.tsx` | 新增 | 三端共用紧急帮助按钮 |
| `web-frontend/src/pages/student/StudentChat.tsx` | 修改 | 集成紧急按钮、危机关键词检测 |
| `web-frontend/src/pages/teacher/TeacherChat.tsx` | 修改 | 集成紧急按钮、危机关键词检测 |
| `web-frontend/src/pages/parent/ParentChat.tsx` | 修改 | 集成紧急按钮、危机关键词、mock安全红线修正 |
| `web-frontend/src/pages/parent/ParentEmergency.tsx` | 修改 | 红色告警全屏阻断、二次确认、完整流程 |
| `web-frontend/src/pages/student/StudentProfile.tsx` | 修改 | 角色称呼修正、风险等级分支修正 |
| `web-frontend/src/store/chatStore.ts` | 修改 | riskLevel处理、危机上报、mock回复修正、sleep预埋 |
| `web-frontend/src/store/parentStore.ts` | 修改 | 超时升级机制、checkAlertTimeout方法、sleep预埋 |
| `web-frontend/src/types/index.ts` | 修改 | RiskLevelType强类型、AssessmentResult修正 |
| `web-frontend/src/App.tsx` | 修改 | ApiDebugOverlay条件渲染 |

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交代码 (`git commit -m "feat: xxx"`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建Pull Request

## 版权与许可

### 许可证

本项目采用 **MIT License** 开源协议。

### 版权声明

© 2026 StarIsle 团队. All rights reserved.

本项目面向青少年心理健康领域，所有代码和文档均受知识产权保护。未经授权，禁止用于商业用途。

### 第三方依赖

项目使用的第三方库遵循其各自的开源许可证，详见各模块的依赖配置文件：
- `backend-java/pom.xml` - Java/Maven依赖
- `web-frontend/package.json` - npm依赖
- `后台/ai-engine/requirements.txt` - Python依赖
- `学生端/StarIsle-student/pubspec.yaml` - Flutter依赖
- `教师端/StarIsle-teacher/pubspec.yaml` - Flutter依赖

## 联系方式

- GitHub: https://github.com/user-unknowed/-StarIsle-
- 邮箱: starisle@example.com

---

> **品牌Slogan**: 「你的情绪星球，永远亮着灯」
