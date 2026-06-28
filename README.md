# 星屿 StarIsle - 青少年心理健康AI陪伴应用

> **版本**: MVP v1.0
> **目标用户**: 12-18岁初高中生
> **核心定位**: AI情绪成长伙伴，零压力的第一心理求助站

## 项目概述

「星屿」StarIsle 是专为12-18岁初高中生打造的AI心理健康应用，通过极简心情打卡和24/7 AI对话，为学生提供零压力的情绪支持。

### MVP核心功能

- ✅ 匿名注册与隐私保护
- ✅ 极简心情打卡（5档表情）
- ✅ AI星宝对话（基于CBT框架）
- ✅ 情绪探索测评（PHQ-9映射）
- ✅ 冥想放松（3-5个音频）
- ✅ 风险检测与危机响应
- ✅ 端到端加密通信

## 技术架构

### 前端 (Frontend)
- **框架**: Flutter 3.x (跨平台iOS/Android)
- **状态管理**: Riverpod
- **加密**: AES-256-GCM + Signal Protocol
- **实时通信**: WebSocket

### 后端 (Backend)
- **API服务**: Go (Gin/Fiber)
- **AI服务**: Python (FastAPI)
- **数据库**: PostgreSQL + MongoDB + Redis
- **消息队列**: Kafka/RabbitMQ

### AI引擎 (AI Engine)
- **对话模型**: 国产大模型微调 (Qwen/DeepSeek)
- **情绪分析**: BERT-based文本分类
- **风险检测**: L1关键词 + L2语义分析
- **安全过滤**: 多层内容审核

## 项目目录结构

```
Big_proj/
├── -StarIsle-/           # 产品文档
│   ├── MVP-PRD.md
│   ├── 产品设计方案.md
│   ├── 小星虚拟形象设计.md
│   └── 评审材料.md
├── frontend/             # Flutter前端应用
│   ├── lib/
│   ├── assets/
│   └── pubspec.yaml
├── backend/              # 后端微服务
│   ├── user-service/
│   ├── mood-service/
│   ├── chat-service/
│   └── content-service/
├── ai-engine/            # AI对话引擎
│   ├── models/
│   ├── prompts/
│   └── risk-detection/
├── database/             # 数据库配置
│   ├── postgres/
│   ├── mongodb/
│   └── redis/
├── deployment/           # 部署配置
│   ├── docker/
│   ├── kubernetes/
│   └── nginx/
├── testing/              # 测试代码
│   ├── unit-tests/
│   ├── integration-tests/
│   └── e2e-tests/
├── assets/               # 静态资源
│   ├── audio/            # 冥想音频
│   ├── images/           # 图片素材
│   └── animations/       # 动画文件
└── docs/                 # 技术文档
    ├── API文档.md
    ├── 部署指南.md
    └── 开发规范.md
```

## 快速开始

### 环境要求

- Flutter SDK >= 3.0
- Go >= 1.21
- Python >= 3.10
- PostgreSQL >= 14
- MongoDB >= 6.0
- Redis >= 7.0

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/user-unknowed/-StarIsle-.git
cd -StarIsle-
```

2. **前端启动**
```bash
cd frontend
flutter pub get
flutter run
```

3. **后端启动**
```bash
cd backend
docker-compose up -d
```

4. **AI引擎启动**
```bash
cd ai-engine
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
- ✅ 数据最小化采集原则
- ✅ 用户可一键删除所有数据

### 合规要求
- ✅ 《个人信息保护法》合规
- ✅ 《未成年人网络保护条例》
- ✅ 《生成式AI服务管理暂行办法》
- ✅ 等保三级认证准备

## 开发团队

- 产品设计: 产品团队
- 前端开发: Flutter开发团队
- 后端开发: Go/Java开发团队
- AI研发: 大模型算法团队
- 测试: QA团队

## 版本历史

- **v1.0 MVP** (2026-06): 核心功能验证
- **v1.1** (计划): 咨询师匹配功能
- **v2.0** (计划): 完整生态建设

## 联系方式

- GitHub: https://github.com/user-unknowed/-StarIsle-
- 邮箱: starisle@example.com

---

> **品牌Slogan**: 「你的情绪星球，永远亮着灯」