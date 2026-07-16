# 星屿 StarIsle - Web前端

> **版本**: v1.0
> **框架**: React 18 + TypeScript + Vite
> **核心定位**: 星屿青少年心理健康应用的Web前端实现

## 项目概述

「星屿」StarIsle Web前端是基于React 18构建的多角色Web应用，支持学生端、教师端和家长端三种角色，提供情绪打卡、AI对话、情绪趋势分析、预警管理等核心功能。

## 技术栈

### 核心框架
- **React**: 18.3.1
- **TypeScript**: 5.8.3
- **Vite**: 6.3.5

### 状态管理
- **Zustand**: 轻量级状态管理库

### 路由
- **React Router DOM**: 7.3.0

### UI样式
- **TailwindCSS**: 3.4.17
- **Lucide React**: 图标库

### 工具函数
- **clsx**: 条件类名拼接
- **tailwind-merge**: TailwindCSS类名合并

## 功能模块

### 学生端
- ✅ 心情打卡（5档表情）
- ✅ AI星宝对话
- ✅ 情绪探索测评
- ✅ 冥想放松
- ✅ 个人中心

### 教师端
- ✅ 工作台概览与高风险告警
- ✅ 学生列表与情绪趋势查看
- ✅ 症状反馈与上报处理
- ✅ 对话观察与介入干预
- ✅ 个人中心

### 家长端
- ✅ 孩子情绪状态查看
- ✅ AI心理顾问（大星）对话
- ✅ 情绪趋势分析（7/30/90天）
- ✅ 应急预案与预警管理
- ✅ 心理健康知识库
- ✅ 通知设置与隐私管理

## 项目结构

```
src/
├── assets/           # 静态资源
├── components/       # 通用组件
│   └── common/       # 公共组件
├── hooks/            # 自定义hooks
├── lib/              # 工具函数
├── pages/            # 页面组件
│   ├── parent/       # 家长端页面
│   │   ├── ParentHome.tsx      # 首页
│   │   ├── ParentChat.tsx      # AI对话
│   │   ├── ParentProfile.tsx   # 个人中心
│   │   ├── MoodDetail.tsx      # 情绪趋势详情
│   │   └── EmergencyDetail.tsx # 预警详情
│   ├── student/      # 学生端页面
│   ├── teacher/      # 教师端页面
│   ├── Home.tsx      # 欢迎页
│   └── Login.tsx     # 登录页
├── store/            # 状态管理
│   ├── authStore.ts      # 认证状态
│   ├── chatStore.ts      # 聊天状态
│   ├── classroomStore.ts # 班级状态
│   ├── moodStore.ts      # 情绪状态
│   └── parentStore.ts    # 家长端状态
├── types/            # TypeScript类型定义
├── App.tsx           # 应用入口与路由配置
├── main.tsx          # React入口文件
└── index.css         # 全局样式
```

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
npm run check
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

## 路由结构

```
/           # 欢迎页
/login      # 登录页
/student    # 学生端首页
/student/chat    # 学生端对话
/student/relax   # 学生端放松
/student/profile # 学生端个人中心
/teacher    # 教师端首页
/teacher/chat    # 教师端对话
/teacher/relax   # 教师端放松
/teacher/profile # 教师端个人中心
/parent     # 家长端首页
/parent/chat         # 家长端AI对话
/parent/mood-detail  # 情绪趋势详情
/parent/emergency    # 预警详情
/parent/profile      # 家长端个人中心
```

## 状态管理说明

项目使用Zustand进行状态管理，各store职责如下：

- **authStore**: 用户认证信息、登录/登出、角色切换
- **chatStore**: 聊天消息管理、发送消息
- **classroomStore**: 班级信息、学生列表
- **moodStore**: 情绪数据、打卡记录
- **parentStore**: 家长端专用状态（孩子绑定、情绪趋势、知识库、预警等）

## 类型定义

类型定义集中在 `src/types/index.ts`，包含：

- User: 用户基础信息
- ParentUser: 家长用户扩展
- ChildBinding: 孩子绑定信息
- ChatMessage: 聊天消息
- MoodTrendData: 情绪趋势数据
- EmergencyAlert: 预警信息
- KnowledgeArticle: 知识文章

## 开发规范

### 代码风格
- 使用TypeScript进行类型检查
- 组件使用函数式组件 + Hooks
- 遵循ESLint规则

### 命名规范
- 组件文件: PascalCase（如 ParentHome.tsx）
- 变量/函数: camelCase
- 常量: UPPER_CASE
- 文件目录: kebab-case

### 提交规范
- feat: 新功能
- fix: 修复Bug
- docs: 文档更新
- refactor: 代码重构
- style: 样式调整

## 常见问题

### Q: 如何切换角色？
A: 在登录页面选择对应的角色标签（学生/教师/家长），然后使用对应角色的测试账号登录。

### Q: 家长端如何绑定孩子？
A: 登录家长端后，进入"我的"页面，点击"绑定新孩子"，使用扫码功能绑定孩子账号。

### Q: 如何查看情绪趋势？
A: 在家长端首页点击"情绪趋势"卡片，或进入"聊一聊"页面查看详细的情绪变化图表。

### Q: 开发时遇到构建错误怎么办？
A: 先运行 `npm run check` 检查TypeScript类型错误，再运行 `npm run lint` 检查代码规范问题。

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交代码 (`git commit -m "feat: xxx"`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建Pull Request

## 联系方式

- GitHub: https://github.com/user-unknowed/-StarIsle-
- 邮箱: starisle@example.com

---

> **品牌Slogan**: 「你的情绪星球，永远亮着灯」
