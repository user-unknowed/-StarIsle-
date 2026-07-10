# 星屿 StarIsle - 青少年心理健康AI陪伴应用

> **版本**: MVP v1.1
> **目标用户**: 12-18岁初高中生及教师
> **核心定位**: AI情绪成长伙伴，零压力的第一心理求助站

## 项目概述

「星屿」StarIsle 是专为12-18岁初高中生打造的AI心理健康应用，通过极简心情打卡和24/7 AI对话，为学生提供零压力的情绪支持。同时为教师提供心理守护协同工作台，实现家校共育。

### MVP核心功能

#### 学生端
- ✅ 匿名注册与隐私保护
- ✅ 极简心情打卡（5档表情）
- ✅ AI星宝对话（基于CBT框架）
- ✅ 情绪探索测评（PHQ-9映射）
- ✅ 冥想放松（3-5个音频）
- ✅ 风险检测与危机响应
- ✅ 端到端加密通信
- ✅ **本地记忆存储管理**（加密数据库、定时整理、存储监控）
- ✅ **AI工具中心**（文本生成、内容摘要、风格转换）

#### 教师端
- ✅ 工作台概览与高风险告警
- ✅ 学生列表与情绪趋势查看
- ✅ 症状反馈与上报处理
- ✅ 对话观察与介入干预
- ✅ **本地记忆存储管理**（加密数据库、定时整理、存储监控）

## 技术架构

### 前端 (Frontend)
- **框架**: Flutter 3.x (跨平台iOS/Android)
- **状态管理**: Riverpod
- **加密**: AES-256-GCM + SQLCipher
- **实时通信**: WebSocket

### 后端 (Backend)
- **API服务**: Java (Spring Boot 3.2)
- **AI服务**: Java (Spring Boot集成)
- **数据库**: PostgreSQL + MongoDB + Redis
- **消息队列**: Kafka/RabbitMQ

### AI引擎 (AI Engine)
- **对话模型**: 国产大模型微调 (Qwen/DeepSeek)
- **情绪分析**: BERT-based文本分类
- **风险检测**: L1关键词 + L2语义分析
- **安全过滤**: 多层内容审核

### 本地存储
- **数据库**: sqflite_sqlcipher (加密本地数据库)
- **后台任务**: Workmanager (定时维护)
- **密钥管理**: Flutter Secure Storage
- **通知**: flutter_local_notifications

## 项目目录结构

```
-StarIsle-/
├── 学生端/                    # 学生用户下载内容
│   ├── StarIsle-student/      # 学生端Flutter应用
│   │   ├── lib/
│   │   ├── assets/
│   │   └── pubspec.yaml
│   ├── docs/                  # 学生端产品文档
│   │   ├── 星屿-StarIsle-MVP-PRD.md
│   │   ├── 星屿-StarIsle-产品设计方案.md
│   │   └── 星屿-小星虚拟形象设计文档.md
│   └── app_docs/              # 学生端补充文档
│       ├── 星屿-StarIsle-MVP-评审材料.md
│       └── 青少年心理健康APP用户需求分析报告.md
├── 教师端/                    # 教师用户下载内容
│   ├── StarIsle-teacher/      # 教师端Flutter应用
│   │   ├── lib/
│   │   ├── assets/
│   │   └── pubspec.yaml
│   ├── docs/                  # 教师端产品文档
│   │   └── 星屿-StarIsle-教师端APP设计文档.md
│   └── app_docs/              # 教师端补充文档
├── 后台/                      # 管理员/运维人员下载内容
│   ├── ai-engine/             # AI对话引擎(Python)
│   │   ├── app/
│   │   ├── models/
│   │   ├── prompts/
│   │   └── services/
│   ├── backend/               # 后端微服务(Go)
│   │   ├── cmd/
│   │   ├── internal/
│   │   └── go.mod
│   ├── database/              # 数据库配置
│   │   └── postgres/
│   ├── deployment/            # 部署配置
│   │   ├── docker-compose.yml
│   │   ├── kubernetes/
│   │   └── nginx/
│   ├── docs/                  # 技术文档
│   │   ├── API文档.md
│   │   ├── 开发规范.md
│   │   ├── 部署指南.md
│   │   └── 验证报告.md
│   ├── testing/               # 测试配置
│   ├── .env.template          # 环境变量模板
│   ├── .gitignore             # Git忽略配置
│   ├── CHANGELOG.md           # 变更日志
│   └── 星屿-StarIsle-MVP-评审材料.md
├── backend-java/              # Java后端服务(Spring Boot)
│   ├── src/main/java/com/starisle/
│   │   ├── config/            # 配置类
│   │   ├── controller/        # REST控制器
│   │   ├── service/           # 业务服务层
│   │   ├── utils/             # 工具类
│   │   └── websocket/         # WebSocket处理
│   ├── src/main/resources/
│   │   └── application.yml    # 应用配置
│   └── pom.xml                # Maven配置
└── README.md                  # 项目总览说明
```

## 快速开始

### 环境要求

- Flutter SDK >= 3.0
- Java JDK >= 21
- Maven >= 3.8
- PostgreSQL >= 14
- MongoDB >= 6.0
- Redis >= 7.0

### 本地开发

#### 学生端
```bash
cd 学生端/StarIsle-student
flutter pub get
flutter run
```

#### 教师端
```bash
cd 教师端/StarIsle-teacher
flutter pub get
flutter run
```

#### 后端启动
```bash
cd 后台/deployment
docker-compose up -d
```

#### Java后端服务启动
```bash
cd backend-java
mvn clean compile
mvn spring-boot:run
```

#### AI引擎启动
```bash
cd 后台/ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/main.py
```

## MVP验证指标

| 指标 | 目标值 |
|------|--------|
| 7日留存率 | > 30% |
| 30日留存率 | > 15% |
| 日均心情打卡率 | > 40% |
| 用户NPS | > 40 |
| 高风险热线触达率 | > 80% |

## 安全与合规

### 数据安全
- ✅ HTTPS/TLS 1.3全程加密
- ✅ 对话内容端到端加密（AES-256-GCM）
- ✅ 本地数据加密存储（SQLCipher）
- ✅ 数据最小化采集原则
- ✅ 用户可一键删除所有数据

### 合规要求
- ✅ 《个人信息保护法》合规
- ✅ 《未成年人网络保护条例》
- ✅ 《生成式AI服务管理暂行办法》
- ✅ 等保三级认证准备

## 开发团队

- 产品设计: 产品团队
- 前端开发: Flutter开发团队 (Dart)
- 后端开发: Java开发团队 (Spring Boot)
- AI研发: 大模型算法团队
- 测试: QA团队

## 版本历史

- **v1.0 MVP** (2026-06): 核心功能验证
- **v1.1** (2026-07): 本地记忆存储管理实现、AI服务集成
- **v1.2** (2026-07): 后端服务迁移至Java (Spring Boot)、编译路径重构

## 联系方式

- GitHub: https://github.com/user-unknowed/-StarIsle-
- 邮箱: starisle@example.com

---

> **品牌Slogan**: 「你的情绪星球，永远亮着灯」