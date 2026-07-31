# BLOCK 级问题修复计划

> **目标**：修复 AI 代码审核报告中 21 项 BLOCK 级问题，预埋测试 sleep 代码，执行小规模测试后上传 GitHub
> **基线**：审核报告 `ai-code-review-report.md` 中的 Findings

---

## 一、当前状态分析

### 需修复的文件清单（10 个文件）

| # | 文件 | BLOCK 数 | 修复内容 |
|---|------|:--------:|---------|
| 1 | `web-frontend/src/services/http.ts` | 2 | 响应解包 + 脱敏日志 |
| 2 | `web-frontend/src/services/api.ts` | 2 | API 路径补 /v1 + 消息长度校验 |
| 3 | `web-frontend/src/services/ws.ts` | 2 | wss 强制 + JWT 鉴权 |
| 4 | `web-frontend/src/store/chatStore.ts` | 1 | riskLevel 处理 + reportCrisis 上报 |
| 5 | `web-frontend/src/pages/student/StudentChat.tsx` | 2 | 紧急帮助按钮 + riskLevel UI |
| 6 | `web-frontend/src/pages/parent/ParentChat.tsx` | 6 | 紧急按钮 + WebSocket + 危机检测 + mock 修正 + 热线 |
| 7 | `web-frontend/src/pages/teacher/TeacherChat.tsx` | 1 | 紧急帮助按钮 + riskLevel UI |
| 8 | `web-frontend/src/pages/parent/ParentEmergency.tsx` | 2 | 全屏阻断 + 完整应急流程 |
| 9 | `web-frontend/src/store/parentStore.ts` | 1 | 超时升级机制 |
| 10 | `web-frontend/src/types/index.ts` | 1 | AssessmentResult 类型修正 |
| 11 | `web-frontend/src/pages/student/StudentProfile.tsx` | 1 | "大星"→"小星" + red 分支 |
| 12 | `web-frontend/src/App.tsx` | 1 | ApiDebugOverlay 条件渲染 |
| 13 | `web-frontend/.env.production` | 1 | WS URL 绝对地址 |

### 新增文件（1 个）

| 文件 | 用途 |
|------|------|
| `web-frontend/src/components/common/EmergencyHelpButton.tsx` | 三端复用的紧急帮助按钮组件 |

---

## 二、修复方案（按执行顺序）

### 阶段 1：基础设施修复（http.ts + api.ts + ws.ts + .env）

#### 1.1 `web-frontend/src/services/http.ts`

**修复 1 — 响应解包**（BLOCK #21）
- 在 `request<T>` 返回前，检测响应体是否为 `{code, message, data}` 结构
- 若是则返回 `data` 字段，否则直接返回
- 在第 133-137 行修改：

```typescript
const data = await response.json();
// 解包统一响应格式 {code, message, data}
const unwrapped = (data && typeof data === 'object' && 'code' in data && 'data' in data)
  ? data.data
  : data;
recordLog(response.status, data);
return unwrapped as T;
```

**修复 2 — 脱敏日志**（BLOCK #15）
- 在 `recordLog` 中对敏感端点跳过 body 记录
- 新增敏感路径判断函数：

```typescript
const SENSITIVE_PATHS = ['/auth/', '/parents/login', '/parents/register', '/login'];
function shouldSanitizeBody(url: string): boolean {
  return SENSITIVE_PATHS.some(p => url.includes(p));
}
```
- recordLog 中：`requestBody: shouldSanitizeBody(url) ? '[REDACTED]' : body`

**修复 3 — 401 优化**（WARN）
- 第 122-125 行：调用 authStore logout 而非直接 localStorage 操作
- 添加去重标志防止并发跳转

#### 1.2 `web-frontend/src/services/api.ts`

**修复 4 — API 路径补 /v1**（BLOCK #19）
- `authApi`: `/auth/login` → `/v1/auth/login`，`/auth/register` → `/v1/auth/register`，所有 auth 路径加 `/v1`
- `moodApi`: `/mood/checkin` → `/v1/mood/checkin`
- `chatApi.sendMessage`: `/chat` → `/v1/chat/message`
- `chatApi.getHistory`: `/chat/history?userId=X` → `/v1/chat/history/${userId}`（path 参数）
- `chatApi.getTopics`: `/topics` → `/v1/chat/topics`
- `classroomApi`: `/classroom/` → `/v1/classroom/`
- `knowledgeApi`: `/knowledge/` → `/v1/knowledge/`

**修复 5 — 消息长度校验**（WARN）
- `chatApi.sendMessage` 入口添加：
```typescript
if (data.message.length > 2000) {
  throw new ApiError('消息长度不能超过2000字', 400, 'MESSAGE_TOO_LONG');
}
```

#### 1.3 `web-frontend/src/services/ws.ts`

**修复 6 — wss 强制**（BLOCK #17）
- 第 6 行：默认改为 `wss://localhost:8080/ws`
- 添加运行时校验：
```typescript
if (!this.url.startsWith('wss://') && import.meta.env.PROD) {
  console.error('[WS] 生产环境必须使用 wss://');
  this.notifyStatus('error');
  return;
}
```

**修复 7 — JWT 鉴权**（BLOCK #18）
- `_connect` 方法中，在 `new WebSocket(fullUrl)` 后 onopen 时首条消息发送 token：
```typescript
this.ws.onopen = () => {
  const token = getToken();
  if (token) {
    this.ws.send(JSON.stringify({ type: 'auth', token }));
  }
  // ...existing code
};
```
- 从 http.ts 导出 getToken 或提取到共享工具

#### 1.4 `web-frontend/.env.production`

**修复 8 — WS URL**（BLOCK #16）
- `VITE_WS_URL=/ws` → `VITE_WS_URL=wss://api.starisle.com/ws`

### 阶段 2：紧急帮助按钮组件 + 三端集成

#### 2.1 新建 `web-frontend/src/components/common/EmergencyHelpButton.tsx`

```tsx
import { useState } from 'react';
import { LifeBuoy, Phone, X } from 'lucide-react';
import { riskApi } from '../../services/api';

const CRISIS_HOTLINES = [
  { name: '12355 青少年服务热线', number: '12355', hours: '24小时' },
  { name: '希望24热线', number: '400-161-9995', hours: '24小时' },
  { name: '北京心理危机研究与干预中心', number: '010-82951332', hours: '24小时' },
];

export function EmergencyHelpButton() {
  const [open, setOpen] = useState(false);
  // ... 浮动按钮 + 弹出面板（热线列表 + 一键拨号）
}
```

#### 2.2 集成到三端 Chat 页面

**修复 9 — StudentChat.tsx**（BLOCK #6）
- 在第 46 行 `<Header role="student" />` 后添加 `<EmergencyHelpButton />`

**修复 10 — TeacherChat.tsx**（BLOCK #6）
- 在第 54 行 `<Header role="teacher" />` 后添加 `<EmergencyHelpButton />`

**修复 11 — ParentChat.tsx**（BLOCK #7）
- 在第 118 行 `<Header role="parent" />` 后添加 `<EmergencyHelpButton />`

### 阶段 3：riskLevel 处理链路

#### 3.1 `web-frontend/src/store/chatStore.ts`

**修复 12 — riskLevel 处理 + reportCrisis**（BLOCK #3）
- sendMessage 成功后，检查 data.riskLevel：
```typescript
const data = await chatApi.sendMessage({ userId, message: content });
// 如果检测到高风险，上报危机事件
if (data.riskLevel === 'red' || data.riskLevel === 'orange') {
  try {
    await riskApi.reportCrisis({ userId, riskLevel: data.riskLevel, triggerType: 'chat' });
  } catch { /* 上报失败不影响主流程 */ }
}
set((state) => ({
  messages: [...state.messages, {
    // ...existing
    riskLevel: data.riskLevel,
  }],
  // ...
}));
```
- 需 import riskApi

**修复 13 — mock 回复风格修正**（WARN）
- 第 94 行 mock 回复改为：`'小星懂你呀～有时候确实有点难呢。'`
- 确保 ≤ 20 字、含语气词

#### 3.2 三端 Chat 页面 riskLevel UI 渲染

**修复 14 — StudentChat.tsx / TeacherChat.tsx**（BLOCK #2）
- 在消息渲染 `messages.map` 中，assistant 消息的 riskLevel 为 red/orange 时添加风险横幅：
```tsx
{message.role === 'assistant' && (message.riskLevel === 'red' || message.riskLevel === 'orange') && (
  <div className={`mt-2 p-3 rounded-xl ${message.riskLevel === 'red' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
    <p className="text-xs text-red-600 font-medium">
      ⚠ 检测到风险信号，请点击右下角紧急帮助按钮获取支持
    </p>
  </div>
)}
```

**修复 15 — ParentChat.tsx riskLevel 处理**（BLOCK #9）
- 在 mock 回复和 API 回复中均处理 riskLevel
- 危机话题点击时调用 riskApi.detect 前端检测

### 阶段 4：ParentChat 全面修复

**修复 16 — 话题卡片修正**（WARN + BLOCK #5）
- 替换为 PRD 6 张卡片：
```typescript
const parentTopics = [
  { id: 't1', title: '孩子不愿意跟我说话怎么办', category: '沟通' },
  { id: 't2', title: '怎么判断孩子是否需要专业帮助', category: '评估' },
  { id: 't3', title: '青春期孩子情绪波动正常吗', category: '情绪' },
  { id: 't4', title: '发现孩子自伤怎么办', category: '危机' },
  { id: 't5', title: '如何跟孩子聊心理话题', category: '沟通' },
  { id: 't6', title: '家长自己压力大怎么调节', category: '自助' },
];
```
- 点击 t4（危机话题）时，弹出危机提示而非直接填入输入框

**修复 17 — mock 回复安全红线修正**（BLOCK #6, #7, #8）
- 移除"精神卫生中心评估"→ 改为"专业心理机构寻求评估与支持"
- 移除诊断性症状列举 → 改为"若您感觉孩子状态让您担忧"
- 补充 ≥ 3 条热线
- 大星 mock 回复控制在 15-30 字，加入"慢慢来""咱们"

**修复 18 — 错误降级逻辑修正**（WARN）
- 第 87 行：`if (isNetError || err instanceof Error)` → `if (isNetError)`

### 阶段 5：应急预案修复

#### 5.1 `web-frontend/src/pages/parent/ParentEmergency.tsx`

**修复 19 — 全屏阻断**（BLOCK #9）
- 在组件顶部添加红色告警全屏 Modal：
```tsx
const hasUnconfirmedRed = activeAlerts.some(a => a.level === 'red');
{hasUnconfirmedRed && (
  <div className="fixed inset-0 z-50 bg-red-900/80 flex items-center justify-center">
    {/* 全屏阻断卡片：告警详情 + 行动建议 + 热线 + 确认按钮 */}
  </div>
)}
```

**修复 20 — 完整应急流程**（BLOCK #10）
- 告警卡片扩展：行动建议清单 + 急救电话一键拨打 + 医院导航链接 + 通知老师入口

#### 5.2 `web-frontend/src/store/parentStore.ts`

**修复 21 — 超时升级机制**（BLOCK #11）
- 在 store 中添加告警超时检查：
```typescript
// 在 fetchAlerts 后检查超时
checkAlertTimeout: () => {
  const alerts = get().emergencyAlerts;
  const now = Date.now();
  const updated = alerts.map(a => {
    if (a.level === 'red' && !a.confirmed) {
      const created = new Date(a.createdAt).getTime();
      if (now - created > 2 * 60 * 60 * 1000) { // 2小时
        return { ...a, escalated: true };
      }
    }
    return a;
  });
  set({ emergencyAlerts: updated });
},
```

### 阶段 6：类型与角色修复

#### 6.1 `web-frontend/src/types/index.ts`

**修复 22 — AssessmentResult 类型**（BLOCK #13）
```typescript
export interface AssessmentResult {
  id: string;
  type: string;
  score: number;
  risk_level: string;
  description: string;
  suggestions: string[];
}
```

#### 6.2 `web-frontend/src/pages/student/StudentProfile.tsx`

**修复 23 — 角色称呼**（BLOCK #12）
- 第 124 行：`大星为你生成了初步评估` → `小星为你生成了初步评估`

**修复 24 — red 分支**（WARN）
- 第 355-358 行三元表达式增加 red 分支

### 阶段 7：生产安全修复

#### 7.1 `web-frontend/src/App.tsx`

**修复 25 — ApiDebugOverlay 条件渲染**（BLOCK #14）
- 第 168 行：`<ApiDebugOverlay />` → `{import.meta.env.DEV && <ApiDebugOverlay />}`

---

## 三、测试 sleep 代码预埋

在以下位置预埋可配置的 sleep 用于测试：

### 3.1 `web-frontend/src/services/http.ts`
```typescript
// 测试用：模拟网络延迟（可通过 localStorage 控制开关）
const TEST_DELAY = typeof localStorage !== 'undefined' && localStorage.getItem('__test_delay');
if (TEST_DELAY) {
  await new Promise(r => setTimeout(r, parseInt(TEST_DELAY)));
}
```

### 3.2 `web-frontend/src/store/chatStore.ts`
```typescript
// 测试用：模拟 AI 回复延迟
const TEST_AI_DELAY = typeof localStorage !== 'undefined' && localStorage.getItem('__test_ai_delay');
if (TEST_AI_DELAY) {
  await new Promise(r => setTimeout(r, parseInt(TEST_AI_DELAY)));
}
```

### 3.3 `web-frontend/src/store/parentStore.ts`
```typescript
// 测试用：模拟告警延迟
const TEST_ALERT_DELAY = typeof localStorage !== 'undefined' && localStorage.getItem('__test_alert_delay');
if (TEST_ALERT_DELAY) {
  await new Promise(r => setTimeout(r, parseInt(TEST_ALERT_DELAY)));
}
```

---

## 四、测试计划

### 4.1 构建验证
```bash
cd web-frontend && npm run check   # TypeScript 类型检查
cd web-frontend && npm run build   # Vite 构建
cd api-docs && npm run check       # api-docs 类型检查
```

### 4.2 小规模功能测试
使用 `npm run dev` 启动开发服务器，通过浏览器验证：
1. 登录页正常加载
2. 三端聊天页有"紧急帮助"按钮
3. ApiDebugOverlay 仅在开发环境显示
4. 设置 `localStorage.setItem('__test_delay', '500')` 验证延迟效果

### 4.3 GitHub 上传
构建通过后，通过 GitHub API 推送所有修改文件到 main 分支。

---

## 五、假设与决策

1. **getToken 提取**：从 http.ts 导出 getToken 供 ws.ts 使用，避免重复实现
2. **EmergencyHelpButton 固定定位**：使用 `fixed bottom-4 right-4 z-40` 浮动按钮
3. **测试 sleep 代码**：通过 localStorage 开关控制，不影响生产性能
4. **mock 热线数据**：硬编码在 EmergencyHelpButton 组件中，后端可用后切换为 riskApi.getHotlines()
5. **类型变更影响**：AssessmentResult 类型修改后，StudentProfile.tsx 中的 `as unknown as` 断言可简化
6. **不重构 ParentChat 使用 chatStore**：本次仅修复 BLOCK 问题，架构统一为后续 WARN 项

---

## 六、验证步骤

1. `npm run check` 通过（无 TS 错误）
2. `npm run build` 通过（无构建错误）
3. 浏览器验证紧急帮助按钮可见
4. 浏览器验证 ApiDebugOverlay 在生产构建中不出现
5. `localStorage.setItem('__test_delay', '300')` 后请求有延迟
6. 所有修改文件推送到 GitHub
