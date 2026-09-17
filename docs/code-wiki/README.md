# StarIsle Code Wiki

> **版本**: v2.0（小星形象增强版）
> **最后更新**: 2026-08-29
> **项目定位**: 青少年心理健康 AI 陪伴应用

## 项目简介

「星屿」StarIsle 是专为 12-18 岁初高中生打造的 AI 心理健康应用，通过极简心情打卡和 24/7 AI 对话，为学生提供零压力的情绪支持。同时为教师提供心理守护协同工作台，为家长提供孩子情绪状态查看与 AI 心理咨询服务，实现家校共育。

## 文档导航

| 文档 | 说明 | 快速链接 |
|------|------|---------|
| [architecture.md](./architecture.md) | 项目整体架构、技术分层、数据流向 | [查看架构](./architecture.md) |
| [modules.md](./modules.md) | 各模块职责、目录结构、技术栈详情 | [查看模块](./modules.md) |
| [key-classes.md](./key-classes.md) | 关键类与函数的职责说明 | [查看类说明](./key-classes.md) |
| [dependencies.md](./dependencies.md) | 模块间依赖关系与调用链路 | [查看依赖](./dependencies.md) |
| [running.md](./running.md) | 环境要求、启动方式、配置说明 | [查看运行指南](./running.md) |
| [api-reference.md](./api-reference.md) | API 接口速查表 | [查看 API](./api-reference.md) |

## 快速开始

```bash
# 一键启动全部服务（推荐）——注意.env.template 位于 server-services/ 根目录
cd server-services/deployment
cp ../.env.template .env
# 编辑 .env 配置密码
docker-compose up -d

# Web 前端开发
cd web-frontend
npm install
npm run dev

# Java 后端开发
cd backend-java
mvn spring-boot:run
```

## 技术栈总览

| 层级 | 技术 | 版本 |
|------|------|------|
| Web 前端 | React + TypeScript + Vite | 18.x / 5.8.x / 6.3.x |
| 原生移动端 | Flutter | 3.x |
| 后端服务 | Java + Spring Boot | 21 / 3.2.x |
| API 网关 | Go + Gin | 1.21 / 1.9.x |
| AI 引擎 | Python + FastAPI | 3.10 / 0.108.x |
| AI 训练 | PEFT + Accelerate | 0.7.1 / 0.25.0 `v2.0新增` |
| AI 训练 | Datasets + Evaluate | 2.15.0 / 0.4.1 `v2.0新增` |
| AI 训练 | GitPython + LangDetect | 3.1.40 / 1.0.9 `v2.0新增` |
| 数据库 | PostgreSQL + MongoDB + Redis | 14 / 6.0 / 7.0 |

## 项目仓库结构

```
-StarIsle-/
├── backend-java/          # Java Spring Boot 核心业务后端
├── web-frontend/          # React Web 前端（学生/教师/家长，含 pages/parent、store/parentStore、EmergencyHelpButton）
├── server-services/                   # 后台服务集合
│   ├── ai-engine/         # Python AI 对话引擎
│   │   ├── app/skills/    # 小星技能适配器（Fork 三层集成·代码能力层）`v2.0新增`
│   │   ├── scripts/       # 数据处理 + 训练流水线（14脚本：含 discover/integrate/mlm/sft/evaluate/orchestrate）`v2.0增强`
│   │   └── tests/         # 7文件 20项单元测试（全通过）`v2.0新增`
│   ├── backend/           # Go API 网关
│   ├── database/          # 数据库初始化脚本
│   └── deployment/        # Docker/K8s 部署配置
├── student-app/                 # Flutter 学生端 App
├── teacher-app/                 # Flutter 教师端 App
├── parent-app/                 # React 家长端页面扩展
├── api-docs/              # API 文档（Electron 桌面应用）
├── security-assessment/   # 安全评估文档
└── docs/                  # 项目文档
```

## 核心功能

- **学生端**: 匿名注册、心情打卡、AI 星宝对话、情绪测评、冥想放松、风险检测、紧急帮助按钮 `v1.5新增`、前端危机关键词检测 `v1.5新增`、AI 工具中心、小星 Skill 自适应能力（Fork 三层集成）`v2.0新增`
- **教师端**: 工作台概览、学生情绪趋势、高风险告警、对话观察与干预、紧急帮助按钮 `v1.5新增`
- **家长端**: 孩子情绪查看、AI 心理顾问对话、情绪趋势分析、应急预案（全屏阻断+二次确认）`v1.5增强`、告警超时升级机制 `v1.5新增`

## 版本历史

- v1.0 MVP → v1.9.0（CodeQL 6/6 pass）→ **v2.0 小星形象增强版**（Skill 架构 + GitHub Fork 三层集成 + 训练流水线 Orchestrator + 6维 LLM-as-Judge 评估）

## 贡献与维护

- 遵循现有模块的提交规范（feat/fix/docs/refactor/style）
- 修改代码后同步更新对应的 Wiki 文档
- 如有架构变更，优先更新 `architecture.md` 和 `modules.md`
- 如需新增功能，请同步在 `modules.md`（目录）和 `key-classes.md`（关键类）中登记
