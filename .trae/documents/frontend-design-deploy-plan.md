# 星屿 Web 前端 - 设计优化与部署计划

## 概述

对 StarIsle web-frontend 进行 UI 设计审查优化、API 服务层补全，并完成本地开发与 Docker 容器化部署。

## 当前状态分析

### 技术栈
- React 18 + TypeScript 5 + Vite 6 + Tailwind CSS 3 + Zustand 5
- 自研 UI 组件库（Button/Card/Input/Modal/Tabs/Toast）
- 完整页面：Login + 学生端 4 页 + 教师端 4 页
- Capacitor 跨平台（Android/iOS 原生工程已生成）

### 已有基础设施
- 设计令牌系统：`src/design/tokens.ts`（颜色/间距/字体/阴影/圆角/断点）
- 暗色模式支持：`useTheme` Hook + Tailwind `darkMode: "class"`
- 跨平台 CSS：`src/design/platform.css`（安全区/滚动惯性/触摸目标）
- Dockerfile：多阶段构建（node:20-alpine → nginx:alpine）
- 生产 Nginx 配置：`后台/deployment/nginx/nginx.conf`

### 关键问题
1. **Dockerfile 缺少 SPA 路由配置**：nginx 未配置 `try_files`，刷新非根路径会 404
2. **无环境变量配置**：缺少 `.env` 文件和 `VITE_API_BASE_URL` 等 API 配置
3. **无 API 服务层**：4 个 Store 全部使用 `setTimeout` + mock 数据，无真实 HTTP 调用
4. **Login 页 QQ 登录按钮有 UI bug**：`<span>QQ</span>` 重复显示
5. **部分页面缺少加载状态和错误处理**：StudentHome 硬编码"5天"连续打卡

## 实施计划

### 步骤 1：修复 Dockerfile 与 Nginx SPA 配置

**文件**: `web-frontend/Dockerfile`
**改动**: 添加自定义 `nginx.conf` 到镜像，配置 SPA 路由回退

**文件**: `web-frontend/nginx.conf`（新建）
**改动**: 创建前端专用 nginx 配置，包含：
- `try_files $uri $uri/ /index.html` SPA 路由回退
- 静态资源缓存（1年 immutable）
- gzip 压缩配置
- 安全 headers

**原因**: 当前 Dockerfile 中 nginx 使用默认配置，不支持 React Router 的客户端路由，刷新 `/student/chat` 等路径会返回 404

### 步骤 2：创建环境变量配置

**文件**: `web-frontend/.env`（新建）
**改动**: 配置开发环境变量
```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_AI_ENGINE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8080/ws
```

**文件**: `web-frontend/.env.example`（新建）
**改动**: 环境变量模板，不含实际值

**文件**: `web-frontend/.env.production`（新建）
**改动**: 生产环境变量（使用相对路径，由 nginx 反代）
```
VITE_API_BASE_URL=/api
VITE_AI_ENGINE_URL=/ai
VITE_WS_URL=/ws
```

**原因**: 前端需要可配置的 API 地址，支持开发和生产环境切换

### 步骤 3：创建 API 服务层

**文件**: `web-frontend/src/services/http.ts`（新建）
**改动**: 创建 HTTP 请求封装
- 基于 `fetch` API 的请求封装（不引入 axios，保持依赖精简）
- 请求/响应拦截器：自动注入 JWT Token、统一错误处理
- 超时控制（10s）
- 类型安全的泛型请求方法 `request<T>()`

**文件**: `web-frontend/src/services/api.ts`（新建）
**改动**: 创建各模块 API 调用函数
- `authApi`: login / register / loginWithThirdParty / loginWithPhone
- `moodApi`: checkin / getMoodHistory / getMoodStats
- `chatApi`: sendMessage / getTopics / getHistory
- `classroomApi`: getClassStats / getStudentList / getAlerts
- `knowledgeApi`: searchKnowledge / getStats（对接 AI 引擎知识库接口）

**文件**: `web-frontend/src/services/ws.ts`（新建）
**改动**: WebSocket 连接管理
- 自动重连机制
- 心跳保活
- 消息队列

**原因**: 将 API 调用逻辑从 Store 中解耦，便于维护和测试

### 步骤 4：重构 Store 层，接入真实 API

**文件**: `web-frontend/src/store/authStore.ts`
**改动**: 将 `login`/`register`/`loginWithThirdParty`/`loginWithPhone` 方法的 mock 逻辑替换为调用 `authApi`，保留 mock 作为降级 fallback

**文件**: `web-frontend/src/store/chatStore.ts`
**改动**: 将 `fetchMessages`/`sendMessage` 方法的 mock 逻辑替换为调用 `chatApi`，保留降级 fallback

**文件**: `web-frontend/src/store/moodStore.ts`
**改动**: 将 `fetchMoodHistory`/`checkinMood` 方法的 mock 逻辑替换为调用 `moodApi`，保留降级 fallback

**文件**: `web-frontend/src/store/classroomStore.ts`
**改动**: 将 `fetchClassStats`/`fetchStudents` 方法的 mock 逻辑替换为调用 `classroomApi`，保留降级 fallback

**原因**: 实现前后端真实对接，同时保留 fallback 保证后端不可用时不影响前端运行

### 步骤 5：UI 设计审查与修复

**文件**: `web-frontend/src/pages/Login.tsx`
**改动**: 修复 QQ 登录按钮 UI bug（`<span>QQ</span>` 重复），优化第三方登录按钮布局

**文件**: `web-frontend/src/pages/student/StudentHome.tsx`
**改动**: 修复硬编码"5天"连续打卡，从 moodStore 动态获取；增加加载状态骨架屏

**文件**: `web-frontend/src/components/common/Header.tsx`
**改动**: 审查并优化移动端汉堡菜单交互，确保暗色模式样式正确

**文件**: `web-frontend/src/components/ui/Input.tsx`
**改动**: 审查表单可访问性（aria-label、error message 关联）

**原因**: 修复已知 UI bug 和可访问性问题，提升设计质量

### 步骤 6：添加 TypeScript 类型增强

**文件**: `web-frontend/src/vite-env.d.ts`
**改动**: 添加 `ImportMetaEnv` 类型声明，让 `import.meta.env.VITE_*` 有类型提示

**原因**: TypeScript 需要显式声明环境变量类型

### 步骤 7：本地开发部署验证

**操作**:
1. 运行 `npm install`（确保依赖完整）
2. 创建 `.env` 配置文件
3. 运行 `npm run build` 验证 TypeScript 编译和构建
4. 运行 `npm run dev` 启动开发服务器
5. 在浏览器中验证页面功能

### 步骤 8：Docker 容器化部署

**操作**:
1. 确认 Dockerfile 和 nginx.conf 配置正确
2. 运行 `docker build -t starisle-frontend .` 构建镜像
3. 运行 `docker run -d -p 8081:80 starisle-frontend` 启动容器
4. 访问 `http://localhost:8081` 验证部署

## 假设与决策

1. **API 降级策略**: 后端不可用时自动 fallback 到 mock 数据，保证前端可独立运行
2. **不引入新依赖**: HTTP 请求使用原生 `fetch`，不引入 axios
3. **保持现有设计系统**: 不重写设计令牌和 UI 组件库，仅修复已知问题
4. **Docker 端口**: 前端容器映射到 8081 端口，避免与后端 Java（8080）和 AI 引擎（8000）冲突
5. **环境变量前缀**: 使用 Vite 标准的 `VITE_` 前缀

## 验证步骤

1. **TypeScript 编译**: `npm run check` 无错误
2. **构建**: `npm run build` 成功生成 `dist/`
3. **本地开发**: `npm run dev` 启动后浏览器可访问所有页面
4. **Docker 构建**: `docker build` 成功
5. **Docker 运行**: 容器启动后 `http://localhost:8081` 可访问
6. **SPA 路由**: 在 Docker 容器中刷新 `/student/chat` 等子路径不返回 404
7. **API 降级**: 后端未启动时，前端仍可使用 mock 数据正常运行
