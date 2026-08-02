# Web 前端三端统一应用（AI 对话屏蔽）+ GitHub Pages 部署 计划

> 创建日期：2026-08-02
> 项目名：**StarIsleONweb**
> 目标：在现有 `web-frontend/` 基础上，构造一个适用于 Windows / Linux / 移动端浏览器的 Web 应用，功能与 UI 与现有应用完全一致，仅屏蔽 AI 对话功能（保留入口但禁用），审核后以项目名 **StarIsleONweb** 部署到 GitHub Pages，访问路径为 `https://<user>.github.io/StarIsleONweb/`。

---

## 一、Summary 概述

现有 `web-frontend/` 已是基于 React 18 + TS + Vite + Tailwind + Zustand 的响应式 Web 应用，使用 `HashRouter` + `base: './'`，本身已跨平台兼容（Win/Linux/移动端浏览器），无需重写。本计划的核心工作：

1. 引入功能开关 `VITE_AI_CHAT_ENABLED`，通过环境变量控制 AI 对话是否启用（默认启用，仅在 Pages 构建时关闭），不影响现有开发与其他部署。
2. 修改 Header 导航：AI 对话入口保留可见但呈现"即将上线"禁用态，点击显示 Toast 提示而非跳转。
3. 修改三端 Chat 页面：当 AI 被禁用时，渲染统一的"功能暂未开放"占位组件（防止直接通过 URL 访问）。
4. **项目名标识**：将 `StarIsleONweb` 体现为页面 `document.title` 与登录页副标题，作为该 Web 版的产品标识。
5. 新增 GitHub Pages 部署 workflow（与现有 SLSA workflow 并存，互不干扰），构建时通过 `--base /StarIsleONweb/` 参数覆盖 base 路径，保持 `vite.config.ts` 源码不变。
6. 本地构建预览供用户审核，审核通过后推送触发自动部署。

## 二、Current State Analysis 现状分析

### 2.1 已具备的能力（无需改动）

- **跨平台响应式**：`src/design/platform.css`（safe-area / touch-target / 输入防缩放）+ Tailwind 断点（xs 360px ~ 2xl 1536px）+ Header 桌面/移动端双布局。
- **静态部署友好**：`vite.config.ts` 的 `base: './'`（相对路径）+ `HashRouter`，无需服务器 SPA 回退，适配 GitHub Pages 子路径（`<user>.github.io/StarIsle/`）。
- **后端不可用降级**：`authStore` 在 5xx/status 0 时降级到 mock 用户；`chatStore` 在 API 失败时降级到 mock 回复。Pages 为纯静态部署，这些降级保证应用可演示。

### 2.2 AI 对话功能现状（需屏蔽的部分）

- **入口**：[Header.tsx](file:///c:/Users/ababa/.trae-cn/worktrees/-StarIsle-/feat-web-frontend-app-GDsero/web-frontend/src/components/common/Header.tsx) 的 `studentNavItems` / `teacherNavItems` / `parentNavItems` 三个数组，各含一项指向 `*/chat`（label：聊一聊 / 想聊聊天 / AI顾问）。
- **页面**：`StudentChat.tsx` / `TeacherChat.tsx`（共用 `useChatStore`）、`ParentChat.tsx`（本地 state + 直接 `post('/v1/chat/message')`）。
- **路由**：[App.tsx](file:///c:/Users/ababa/.trae-cn/worktrees/-StarIsle-/feat-web-frontend-app-GDsero/web-frontend/src/App.tsx) 中 `/student/chat`、`/teacher/chat`、`/parent/chat` 三条路由。
- **状态/服务**：`store/chatStore.ts`、`services/api.ts` 的 `chatApi`、`services/ws.ts` 的 WebSocketManager。

### 2.3 部署现状

- 现有 `.github/workflows/slsa-web-frontend.yml` 仅做 SLSA 构建证明 + Docker 镜像推送 ghcr.io，**无 Pages 部署**。
- 环境变量约定：`.env.example`（开发模板）、`.env.production`（生产，`VITE_API_BASE_URL=/api` 等）。

## 三、Proposed Changes 拟定变更

### 变更 1：新增功能开关配置模块

**文件**：`web-frontend/src/config/features.ts`（新建）

**What**：集中管理功能开关常量。

```typescript
// 默认启用；仅当显式设置 VITE_AI_CHAT_ENABLED='false' 时关闭
export const AI_CHAT_ENABLED =
  import.meta.env.VITE_AI_CHAT_ENABLED !== 'false';
```

**Why**：单一真源，避免散落的 `import.meta.env` 判断；默认 `true` 保证现有开发/Docker 部署零影响，仅在 Pages workflow 中注入 `false`。

**How**：被 Header 与三端 Chat 页面引用。

---

### 变更 2：更新 `.env.example` 文档化新变量

**文件**：`web-frontend/.env.example`

**What**：追加注释说明 `VITE_AI_CHAT_ENABLED`。

```
# AI 对话功能开关（默认启用；设为 'false' 屏蔽 AI 对话入口与页面，用于 GitHub Pages 演示部署）
VITE_AI_CHAT_ENABLED=true
```

**Why**：保持环境变量文档完整，便于开发者知晓开关存在。

---

### 变更 3：Header 导航 AI 入口"保留但禁用"

**文件**：[web-frontend/src/components/common/Header.tsx](file:///c:/Users/ababa/.trae-cn/worktrees/-StarIsle-/feat-web-frontend-app-GDsero/web-frontend/src/components/common/Header.tsx)

**What**：

1. 给 navItems 类型增加 `disabled?: boolean` 字段；在三端的 chat 项上根据 `AI_CHAT_ENABLED` 动态标记 `disabled: !AI_CHAT_ENABLED`。
2. 导入 `useToast`（现有 `components/ui/Toast` 已提供）与 `AI_CHAT_ENABLED`。
3. 桌面端导航（`hidden md:flex` 区块）与移动端汉堡菜单（`md:hidden` 区块）渲染逻辑：
   - `disabled` 项：降低不透明度（`opacity-50 cursor-not-allowed`）、追加"即将上线"小标签（`<span>` 内联徽章）、`onClick` 改为触发 Toast（"AI 对话功能暂未开放，敬请期待"）并 `return`，不调用 `navigate`。
   - 非 disabled 项：保持原逻辑。
4. 因 navItems 是模块级常量数组，需改为在组件内部用 `useMemo` 依据 `AI_CHAT_ENABLED` 派生，或在常量项里统一标记 `chat` 项为 `disabled: !AI_CHAT_ENABLED`（常量求值时读取 env，仅一次，可接受）。

**Why**：用户要求"保留入口但禁用"，Header 是三端 AI 对话的唯一入口，符合需求。

**How**：保持现有视觉风格（accent 渐变），禁用态用 `opacity-50` + 徽章 + Toast，最小侵入。

---

### 变更 4：三端 Chat 页面增加禁用占位

**文件**：
- [web-frontend/src/pages/student/StudentChat.tsx](file:///c:/Users/ababa/.trae-cn/worktrees/-StarIsle-/feat-web-frontend-app-GDsero/web-frontend/src/pages/student/StudentChat.tsx)
- `web-frontend/src/pages/teacher/TeacherChat.tsx`
- `web-frontend/src/pages/parent/ParentChat.tsx`

**What**：

1. 新建 `web-frontend/src/components/common/ChatDisabledPlaceholder.tsx`：居中卡片，展示"AI 对话功能暂未开放"标题 + 说明文案 + 保留 `EmergencyHelpButton`（紧急帮助按钮在危机场景下仍可用，符合产品安全定位）。视觉沿用各端渐变色调（通过 `role` prop 区分）。
2. 三端 Chat 页面在组件顶部判断：`if (!AI_CHAT_ENABLED) return <ChatDisabledPlaceholder role="..." />`（仍渲染 `<Header role="..." />` 保持布局一致）。
3. 不删除现有 Chat 逻辑代码，仅做条件短路，保证开关切回 `true` 时功能完整恢复。

**Why**：防止用户直接通过 URL（如 `/#/student/chat`）绕过 Header 禁用态进入聊天页；同时保持危机帮助通道可用。

**How**：占位组件复用，三端传入对应 `role` 与渐变色。

---

### 变更 5：新增 GitHub Pages 部署 workflow

**文件**：`.github/workflows/deploy-pages.yml`（新建）

**What**：

- 触发：`workflow_dispatch`（手动）+ `push` 到 `main` 分支且 `web-frontend/**` 或该 workflow 文件有变更。
- 权限：`pages: write`、`id-token: write`、`contents: read`。
- 环境变量：注入 `VITE_AI_CHAT_ENABLED=false`（屏蔽 AI 对话，覆盖 `.env.production` 默认）。
- 构建命令：`npm run build -- --base /StarIsleONweb/`（Vite CLI `--base` 参数覆盖 `vite.config.ts` 的 `base: './'`，**不改源码**，保护现有 Docker/开发链路）。
- 步骤：checkout → setup-node 20（cache npm，依赖 `web-frontend/package-lock.json`）→ `npm ci` → 构建（带 env 与 `--base`）→ `upload-pages-artifact@v3`（path `./web-frontend/dist`）→ `deploy-pages@v4`。

**Why**：与现有 SLSA workflow 解耦，专责 Pages 部署；用 `--base` 参数避免污染 `vite.config.ts`。

**How**：标准 actions/deploy-pages 流程；不触碰现有 Docker/SLSA 链路。

**关于访问路径 `/StarIsleONweb/` 与仓库名的处理（重要）**：

GitHub Pages 项目站点的 URL 由仓库名决定（`https://<user>.github.io/<仓库名>/`）。用户已确认：StarIsleONweb 作为**项目名**，当前仓库不重命名。但 base 路径 `/StarIsleONweb/` 与仓库名 `StarIsle` 不一致会导致资源 404。处理方案二选一（**部署阶段由用户决定，计划默认采用方案 B**）：

- **方案 A（推荐，保证 base 一致）**：在 GitHub 仓库 Settings 中将当前仓库重命名为 `StarIsleONweb`。重命名后 GitHub 自动为旧 URL 设置重定向，base `/StarIsleONweb/` 与 URL 路径匹配，资源加载正确。此为人工操作，部署阶段执行。
- **方案 B（不改仓库名，base 用相对路径）**：保留仓库名 `StarIsle`，构建时不传 `--base`（即用 `vite.config.ts` 默认 `./`），访问 `https://<user>.github.io/StarIsle/`。HashRouter + 相对路径在子路径下正常工作。此时 StarIsleONweb 仅作页面标题，不进 URL。

> 鉴于用户明确选择 base 为 `/StarIsleONweb/`，本计划在 workflow 中采用 `--base /StarIsleONweb/`，并在部署阶段提示用户执行方案 A（重命名仓库）以使路径匹配；若用户不愿重命名，则改用方案 B（去掉 `--base` 参数）。**审核预览阶段不受影响**，因本地预览可用任意 base。

---

### 变更 6：页面项目名标识

**文件**：`web-frontend/index.html`、`web-frontend/src/pages/Login.tsx`（最小改动）

**What**：
1. `index.html`：将 `<title>` 更新为 `StarIsleONweb - 星屿`（保留品牌名，叠加项目名）。
2. `Login.tsx`：在登录页标题"星屿"下方追加一行小字副标题 `StarIsleONweb`（低饱和度灰色，不破坏现有视觉）。

**Why**：用户要求 StarIsleONweb 作为项目名体现；最小侵入，符合"与现有应用完全一致"约束。

**How**：仅文本层叠加，不改布局与交互。

---

### 变更 7：本地构建预览（审核用）

**What**：执行 `npm run build -- --base /StarIsleONweb/`（注入 `VITE_AI_CHAT_ENABLED=false`）生成 `dist/`，用 `npm run preview -- --base /StarIsleONweb/` 启动本地预览服务器，供用户在浏览器审核。

**Why**：用户明确要求"我审核之后上传"，需先提供可交互预览。

**How**：在执行阶段运行预览命令并通过 `OpenPreview` 暴露 URL。

## 四、Assumptions & Decisions 假设与决策

| 项 | 决策 | 理由 |
|----|------|------|
| "三端统一"含义 | 指 Win/Linux/移动端浏览器统一的 Web 版（非学生/教师/家长角色端） | 现有应用已是三角色统一 Web 应用，且用户表述"适用于win，Linux和移动端" |
| AI 屏蔽方式 | 保留入口但禁用（Header 徽章 + Toast，URL 直访渲染占位） | 用户明确选择 |
| 代码组织 | 直接改 `web-frontend/`，用环境变量开关 | 用户明确选择；不删除代码，开关切回即恢复 |
| 功能开关默认值 | `true`（启用），仅 Pages 构建设 `false` | 零影响现有开发/Docker 部署 |
| 项目名 | StarIsleONweb，体现在 `<title>` 与登录页副标题 | 用户指定；当前仓库不重命名 |
| base 路径 | Pages 构建用 `--base /StarIsleONweb/` 参数覆盖；`vite.config.ts` 源码保持 `./` 不变 | 用户选择 `/StarIsleONweb/`；用 CLI 参数避免污染源码与 Docker 链路 |
| 仓库与 URL 匹配 | 部署阶段需重命名仓库为 StarIsleONweb（方案 A）以匹配 base；否则改用相对路径（方案 B） | GitHub Pages URL 由仓库名决定；部署阶段由用户最终确认 |
| 后端 API 不可用 | 不处理，依赖现有 mock 降级 | Pages 为纯静态演示，超出本次范围；"与现有应用一致" |
| 紧急帮助按钮 | 保留可用 | 产品安全定位，危机通道不可屏蔽 |
| 不改动内容 | 心情打卡、放松、家长端、个人中心、登录、设计系统等 | "与现有应用完全一致" |

## 五、Verification 验证步骤

### 5.1 本地构建预览验证（审核前）

1. 在 `web-frontend/` 执行 `VITE_AI_CHAT_ENABLED=false npm run build -- --base /StarIsleONweb/`。
2. `npm run preview -- --base /StarIsleONweb/` 启动，浏览器访问预览 URL。
3. 验证清单：
   - [ ] 浏览器标签页标题显示 `StarIsleONweb - 星屿`，登录页有 StarIsleONweb 副标题。
   - [ ] 三端登录可进入（mock 降级生效）。
   - [ ] Header 中 AI 对话入口可见但呈禁用态（降低透明度 + "即将上线"徽章）。
   - [ ] 点击 AI 入口弹出 Toast"AI 对话功能暂未开放"，不跳转。
   - [ ] 直接访问 `/#/student/chat`、`/#/teacher/chat`、`/#/parent/chat` 显示占位页，紧急帮助按钮可用。
   - [ ] 其他功能（心情打卡、放松、家长孩子管理、应急中心、个人中心）正常。
   - [ ] 桌面端（>768px）横向导航与移动端（≤768px）汉堡菜单均表现一致。
   - [ ] Win/Linux/移动端浏览器下布局无破版。

### 5.2 部署后验证

1. 推送后 GitHub Actions `deploy-pages` 成功完成。
2. 访问 `https://<user>.github.io/StarIsleONweb/`（方案 A，仓库已重命名）或 `https://<user>.github.io/StarIsle/`（方案 B），重跑 5.1 清单。
3. 确认资源 404 无、路由刷新无 404（HashRouter 保障）。

### 5.3 回归验证（确保不影响现有链路）

1. 不带 `VITE_AI_CHAT_ENABLED=false` 构建（即默认 `true`），AI 对话入口与页面应完全可用，回归现有行为。
2. 现有 `slsa-web-frontend.yml` workflow 不受影响。

## 六、执行顺序

1. 新建 `src/config/features.ts` + 更新 `.env.example`。
2. 新建 `ChatDisabledPlaceholder.tsx`。
3. 改 `Header.tsx`（navItems 派生 + 禁用态 + Toast）。
4. 改三端 Chat 页面（条件渲染占位）。
5. 改 `index.html` 与 `Login.tsx`（StarIsleONweb 项目名标识）。
6. 新建 `.github/workflows/deploy-pages.yml`（含 `--base /StarIsleONweb/` 与 `VITE_AI_CHAT_ENABLED=false`）。
7. 本地构建 + 预览（带 `--base /StarIsleONweb/`），通知用户审核。
8. 用户通过后，提交并推送（触发 Pages 部署）；部署阶段与用户确认仓库重命名（方案 A）或保留仓库名改相对路径（方案 B）。

## 七、不在范围内

- 不实现真实后端 API（Pages 纯静态）。
- 不新增 PWA / Service Worker。
- 不引入 Electron/Tauri 桌面端打包（用户要的是 Web 应用）。
- 不修改现有 Docker / SLSA / Nginx 部署链路。
- 不调整设计系统与 UI 组件库。
