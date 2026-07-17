# 星屿 StarIsle - 青少年心理健康AI陪伴应用

> **版本**: MVP v1.4
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

### 教师端
- ✅ 工作台概览与高风险告警
- ✅ 学生列表与情绪趋势查看
- ✅ 症状反馈与上报处理
- ✅ 对话观察与介入干预
- ✅ **本地记忆存储管理**（加密数据库、定时整理、存储监控）

### 家长端
- ✅ 孩子情绪状态查看
- ✅ AI心理顾问（大星）对话
- ✅ 情绪趋势分析（7/30/90天）
- ✅ 应急预案与预警管理
- ✅ 心理健康知识库
- ✅ 通知设置与隐私管理
- ✅ 孩子绑定与授权管理

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