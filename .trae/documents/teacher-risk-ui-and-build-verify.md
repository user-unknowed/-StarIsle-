# TeacherHome 风险详情 UI 补全 + 构建验证

## 摘要

StarIsle 青少年心理健康 AI 应用家长端功能开发已接近尾声。经全面探索，11 项任务清单中除「TeacherHome 接入 riskApi 的 UI 渲染」与「构建验证」外，其余全部完成。本计划聚焦这两项收尾工作：补全 TeacherHome.tsx 中已定义但未接入 JSX 的风险详情交互与渲染，然后运行构建验证并修复所有 TypeScript 错误。

## 当前状态分析

### 已完成（无需改动）
- `web-frontend/vite.config.ts`：已设置 `base: './'`
- `web-frontend/src/types/index.ts`：UserRole 含 parent，家长端类型齐全
- `web-frontend/src/services/api.ts`：parentApi/riskApi/contentApi/assessmentApi/migrationApi/keyApi 六模块齐全
- `web-frontend/src/services/http.ts`：已注入 apiDebugStore 日志钩子
- `web-frontend/src/store/parentStore.ts`：含 mock 降级策略，完整
- `web-frontend/src/store/apiDebugStore.ts`：已创建
- `web-frontend/src/components/dev/ApiDebugOverlay.tsx`：已创建
- `web-frontend/src/components/common/Header.tsx`：支持 parent 角色，#F4A261 暖色点缀
- `web-frontend/src/pages/Login.tsx`：含家长角色标签和体验登录
- `web-frontend/src/App.tsx`：HashRouter + 家长端 5 条路由 + ApiDebugOverlay
- `web-frontend/src/pages/parent/`：5 个页面全部创建且完整
- `web-frontend/src/pages/student/StudentRelax.tsx`：已接入 contentApi（getMeditations + getBreathing）
- `web-frontend/src/pages/student/StudentProfile.tsx`：已接入 assessmentApi（getQuestions + submit + getResult）
- `web-frontend/src/store/authStore.ts`：含 parent1 mock 用户和 mock 降级

### 未完成（本计划目标）
1. **`web-frontend/src/pages/teacher/TeacherHome.tsx`**：riskApi 接入的「状态管理 + API 调用逻辑」已完成，但「JSX 渲染」未接入：
   - 已定义：`riskDetails`、`riskLoadingId`、`expandedRiskId`、`fetchRiskLevel`、`toggleRiskDetail`
   - 未接入：第 241 行 Eye 按钮、第 315 行"查看详情"按钮均未调用 `toggleRiskDetail`
   - 未渲染：展开后的风险详情面板（历史趋势、风险原因、数据来源标识）缺失
   - 导入未使用：`ShieldAlert`、`Loader2`、`FileSpreadsheet`（tsconfig `noUnusedLocals: false`，不会报错，但应清理）

2. **构建验证**：未运行 `npm install` + `npm run check` + `npm run build`，未知是否存在 TS 错误。

### 关键配置
- `tsconfig.json`：`strict: false`、`noUnusedLocals: false`、`noUnusedParameters: false`、`include: ["src", "api"]`（注意：web-frontend 下无 `api` 目录，tsc 会忽略不存在的 include 路径，不影响构建）
- `package.json` scripts：`check: tsc -b --noEmit`、`build: tsc -b && vite build`
- Button 组件支持 `loading`、`variant`、`size`、`icon` 等 props

## 拟定变更

### 变更 1：补全 TeacherHome.tsx 风险详情 UI 渲染

**文件**：`web-frontend/src/pages/teacher/TeacherHome.tsx`

**原因**：riskApi 接入的状态与处理函数已就绪，但未接入 JSX，导致功能不可用且状态变量闲置。

**做法**：

1. **「需要关注的学生」卡片（约 226-245 行）**：
   - 将第 241 行 Eye 按钮 `onClick` 绑定为 `() => toggleRiskDetail(student.id, student.riskLevel)`
   - 在该学生条目下方，当 `expandedRiskId === student.id` 时，渲染展开的风险详情面板：
     - 加载态：`riskLoadingId === student.id` 时显示 `<Loader2 className="animate-spin" />` 加载提示
     - 详情态：展示当前风险等级 badge、数据来源（API/示例）、风险原因（`reason`）、历史趋势（`history` 数组按日期展示为小色块时间线）

2. **「学生列表」表格（约 285-318 行）**：
   - 将第 315 行"查看详情"按钮 `onClick` 绑定为 `() => toggleRiskDetail(student.id, student.riskLevel)`
   - 当 `expandedRiskId === student.id` 时，在该行下方插入一个跨列的展开行（`<tr><td colSpan={5}>...</td></tr>`），渲染与上述一致的风险详情面板

3. **风险详情面板内容设计**（复用于两处）：
   - 顶部：风险等级 badge + 数据来源标签（`source === 'api'` 绿色「API 数据」，否则灰色「示例数据」）
   - 中部：风险原因文本（`reason`，若有）
   - 底部：历史趋势——`history` 数组每个元素显示日期 + 对应等级色块（复用 `getRiskColor`/`getRiskLabel`）
   - 使用 `ShieldAlert` 图标作为面板标题点缀

4. **清理未使用导入**：移除 `FileSpreadsheet`（确未使用）；`ShieldAlert`、`Loader2` 在补全 UI 后将被使用，保留。

**约束**：
- 不改动 `fetchRiskLevel`、`toggleRiskDetail`、`RiskDetail` 接口等已有逻辑
- 沿用现有 Tailwind 类风格（圆角卡片、渐变、`text-sm`/`rounded-xl` 等）
- 中文 UI 文案
- 不引入新依赖

### 变更 2：构建验证

**做法**：
1. 在 `web-frontend/` 目录运行 `npm install`（若 `node_modules` 缺失）；网络失败重试一次
2. 运行 `npm run check`（`tsc -b --noEmit`）排查类型错误
3. 运行 `npm run build`（`tsc -b && vite build`）验证完整构建
4. 修复发现的全部 TypeScript 错误（不运行 dev server）

**可能的问题点**（基于探索预判）：
- TeacherHome.tsx 未使用变量：因 `noUnusedLocals: false` 不会报错，补全 UI 后自然消除
- 家长端页面类型引用：已确认 `EmergencyResource`、`ChildBinding` 等类型在 `types/index.ts` 中存在
- `apiDebugStore` 导出：`http.ts` 使用 `apiDebugStore.addLog`（非 hook 版本），已在 `apiDebugStore.ts` 第 37-40 行导出
- `parentStore.ts` 的 `BindChildRequest` 导入：从 `services/api` 导入，已在 `api.ts` 第 149 行定义并导出

## 假设与决策

1. **风险详情面板复用**：两处（关注卡片 + 学生表格）使用相同的渲染逻辑，通过内联 JSX 实现（不抽取子组件，避免过度工程化，符合现有页面风格）。
2. **历史趋势展示形式**：用简单的日期 + 色块横排展示（非图表库），与现有 StudentRelax/ParentHome 的纯 CSS 可视化风格一致。
3. **不改动已有 riskApi 调用逻辑**：`fetchRiskLevel` 的降级策略（API 失败回退 mock）已正确实现，仅补 UI。
4. **构建修复范围**：仅修复阻断构建的 TS 错误，不做额外重构或功能增强。
5. **不运行 dev server**：按任务要求仅做 `check` + `build` 静态验证。

## 验证步骤

1. `npm run check` 输出无错误（exit code 0）
2. `npm run build` 输出 `dist/` 产物且无错误（exit code 0）
3. TeacherHome.tsx 中：
   - Eye 按钮点击后展开/收起风险详情面板
   - "查看详情"按钮点击后展开/收起风险详情面板
   - 展开面板显示加载态 → 风险等级/来源/原因/历史趋势
   - 无未使用的导入或闲置状态变量
