# 星屿 Web 前端 UX 评分与全量修复计划（28 项）

> 创建日期：2026-08-02
> 分支：基于 main 创建 `fix/ux-improvements-all`
> 交付：开 PR 并合并到 main，触发 Pages 重新部署

---

## 一、Summary 概述

对 `web-frontend/` 全部 14 个页面进行 UX 评分（见下方评分），并修复探索发现的 28 项 UX 问题，覆盖 P0 严重 bug（7 项）、P1 数据可信度（6 项）、P2 体验一致性（7 项）、P3 可访问性（8 项）。修复后通过本地构建+浏览器逐页验证，再开 PR 合并。

---

## 二、UX 评分（满分 10 分）

| 维度 | 得分 | 说明 |
|------|------|------|
| 功能正确性 | 4/10 | 7 个 P0 bug：资料编辑不保存、消息重复、风险提示缺失、导航坐标硬编码、告警弹窗无法关闭、假音乐播放、播放按钮样式 bug |
| 数据可信度 | 3/10 | 统计数字硬编码、权限开关/菜单按钮全是死控件、mock 降级掩盖 401 等真实错误 |
| 体验一致性 | 4/10 | 三端配色三套体系、loading/empty/error/mock 四态实现不统一、Toast 非全局、页面宽度不一致 |
| 可访问性 | 2/10 | 几乎全项目无 aria-label、Modal 无焦点陷阱、Tab/Toggle 不符合 ARIA、全局移除 focus outline |
| 代码质量 | 5/10 | 设计令牌体系存在但未贯穿、死代码多（WebSocket/Empty/LazyLoad）、测试钩子残留风险 |
| 移动端适配 | 7/10 | 安全区/touch-target/16px 防放大到位，但移动菜单无动画无焦点管理 |
| **综合** | **4.2/10** | 有设计系统骨架与降级思路，但功能 bug 多、死控件多、可访问性系统性缺失 |

---

## 三、Current State Analysis 现状分析

技术栈：React 18 + TS + Vite 6 + Tailwind 3.4 + Zustand 5 + HashRouter。
设计令牌 `src/design/tokens.ts` → `tailwind.config.js`，思路正确但未贯穿三端。
最佳实践样本：`parentStore.ts`（`isDegradable` + 三态 + error 字段）、`ParentChildren.tsx`（完整 loading/empty/error/mock + 二次确认 + Button loading）、`Input.tsx`（aria-invalid/role=alert/htmlFor）。
最差样本：`StudentChat/TeacherChat`（无 loading/无 error/无 mock 提示/无 aria）、三个 Profile（编辑不保存 + 硬编码统计 + 死按钮）。

---

## 四、Proposed Changes 拟定变更

### 基础设施修复（影响全局，先做）

#### 变更 1：全局 Toast Provider
**文件**：`src/components/ui/Toast.tsx`、`src/main.tsx`、`src/components/common/Header.tsx`、`src/pages/parent/ParentChildren.tsx`、`src/pages/parent/ParentEmergency.tsx`
**What**：将 `useToast` 从局部 state 改为全局 Zustand store（`toastStore`），在 `main.tsx` 顶层渲染唯一一个 `<ToastContainer>`。删除 Header/ParentChildren/ParentEmergency 各自的 `<ToastContainer>` 挂载与局部 `useToast` 调用。
**Why**：当前 Toast 状态分散在 Header 内，页面级 Toast 无法共享，且多处重复挂载容器导致重复 toast。
**How**：在 Toast.tsx 中新增 `create<ToastState>()` store（含 `toasts` 数组 + `addToast`/`removeToast`），导出 `useToastStore`。`useToast()` hook 改为返回 store 的 `addToast`。`main.tsx` 在 `<App />` 外包一层 `<ToastContainer toasts={useToastStore(s=>s.toasts)} />`。

#### 变更 2：全局 ErrorBoundary
**文件**：`src/components/common/ErrorBoundary.tsx`（新建）、`src/App.tsx`
**What**：新建 React ErrorBoundary 类组件，捕获渲染异常，显示友好错误页（含"刷新页面"按钮）。在 App.tsx 中包裹 `<Router>` 内的 `<Routes>`。
**Why**：当前无错误边界，页面抛错即白屏。
**How**：class 组件 `getDerivedStateFromError` + `componentDidCatch`，render 降级 UI（居中卡片 + 错误图标 + "页面出错了，请刷新重试" + 刷新按钮）。

#### 变更 3：修复全局 focus outline
**文件**：`src/design/platform.css`
**What**：删除 `button:focus { outline: none }`（行 171-173），改为 `button:focus-visible { outline: 2px solid theme('colors.primary.500'); outline-offset: 2px; }`。
**Why**：全局移除 focus outline 违反 WCAG 2.4.7，键盘用户无法定位焦点。用 `:focus-visible` 仅在键盘导航时显示，不影响鼠标点击。
**How**：编辑 platform.css 对应行。

#### 变更 4：统一三端首页容器宽度
**文件**：`src/pages/student/StudentHome.tsx`、`src/pages/teacher/TeacherHome.tsx`、`src/pages/parent/ParentHome.tsx`
**What**：三端首页 `max-w-*` 统一为 `max-w-6xl mx-auto`。
**Why**：当前 student=`max-w-4xl`、teacher=`max-w-7xl`、parent=`max-w-5xl`，跨角色切换视觉宽度跳变。
**How**：替换三处 className。

---

### P0 严重 bug 修复（7 项）

#### 变更 5：修复资料编辑不保存
**文件**：`src/pages/student/StudentProfile.tsx`（行 132-134）、`src/pages/teacher/TeacherProfile.tsx`（行 36-38）、`src/pages/parent/ParentProfile.tsx`（行 48-50）
**What**：`handleSave` 改为调用 `authStore` 的更新方法。因 authStore 无 `updateProfile` action，新增一个：调用 `authApi`（若无对应 API 则在本地更新 user state + toast 提示"资料已更新"）。同时更新 `editedNickname`/`editedSignature` 回写到 store。
**Why**：当前 `handleSave` 只 `setIsEditing(false)`，用户修改被静默丢弃。
**How**：在 `authStore.ts` 新增 `updateProfile(data: {nickname?: string; signature?: string})` action（先尝试 API，失败则仅更新本地 state + 标记 mock）。三个 Profile 的 `handleSave` 调用它。

#### 变更 6：修复 ParentChat 用户消息重复插入
**文件**：`src/pages/parent/ParentChat.tsx`（行 70、76）
**What**：删除危机关键词分支中第二次 `setMessages((prev) => [...prev, userMessage])`（行 76），保留行 70 的首次插入。危机回复作为独立的 assistant 消息插入即可。
**Why**：当前用户在危机场景下看到自己的消息出现两次。
**How**：删除行 76 的 `setMessages` 调用。

#### 变更 7：恢复 TeacherChat 风险提示渲染
**文件**：`src/pages/teacher/TeacherChat.tsx`（行 122-131 对比 StudentChat.tsx:121-128）
**What**：从 StudentChat.tsx 复制 `message.riskLevel === 'red'/'orange'` 的风险提示框渲染逻辑到 TeacherChat 的消息渲染处。
**Why**：TeacherChat 完全删掉了风险提示，教师端看不到危机信号——违背"教师更需要风险信息"的产品逻辑。
**How**：在 TeacherChat 的消息 map 中，assistant 消息后增加 riskLevel 条件渲染（AlertTriangle 图标 + 红色/橙色提示框 + 文案）。

#### 变更 8：修复 ParentEmergency 导航坐标硬编码
**文件**：`src/pages/parent/ParentEmergency.tsx`（行 335）
**What**：高德导航链接的 `position` 参数改为使用资源的实际坐标（`resource.lat,resource.lng` 或 `resource.location`），若资源无坐标则隐藏导航按钮或回退到资源名称搜索。
**Why**：当前所有医院都导航到上海同一坐标（121.4737,31.2304）。
**How**：检查 `EmergencyResource` 类型是否有坐标字段；若无，在类型中添加 `lat?: number; lng?: number`，导航链接用 `position={resource.lng},{resource.lat}`，无坐标时回退 `q={resource.name}` 搜索。同时给 `EmergencyResource` 添加 `id` 字段（变更 28）。

#### 变更 9：修复 ParentEmergency 红色告警 Modal 无法关闭
**文件**：`src/pages/parent/ParentEmergency.tsx`（行 108-154）
**What**：将手写 `<div>` 遮罩层改为使用项目 `<Modal>` 组件（自带 Escape 关闭），增加"稍后处理"按钮（关闭弹窗，不标记已处理），保留"确认已处理"按钮。
**Why**：当前红色告警全屏 Modal 无关闭按钮、无 Escape，用户必须确认才能继续——可能造成焦虑。
**How**：替换为 `<Modal isOpen={hasUnconfirmedRed} onClose={() => setRedAlertDismissed(true)} title="紧急告警">`，内部保留双 `tel:` 链接 + 两个按钮（"稍后处理"触发 onClose，"确认已处理"调 `acknowledgeAlert`）。新增 `redAlertDismissed` state 控制是否暂时关闭。

#### 变更 10：修复假音乐播放
**文件**：`src/pages/student/StudentRelax.tsx`（行 46-68）、`src/pages/teacher/TeacherRelax.tsx`
**What**：添加 `<audio>` 元素，`progress` 改为 `audio.currentTime` 驱动（`timeupdate` 事件），播放/暂停调 `audio.play()`/`audio.pause()`。若无真实音频 URL，使用一段静音/白噪音占位音频或明确标注"演示模式（无声）"。
**Why**：当前 `progress` 仅靠 `setInterval` 自增，无 `<audio>` 元素，用户点击播放听不到声音——严重预期违背。
**How**：在组件中 `useRef<HTMLAudioElement>`，`src` 绑定当前音乐的 url；`onTimeUpdate` 更新 progress；`onEnded` 切下一首。若无 url，显示"演示模式"徽章 + 播放按钮触发 toast"演示版本暂无音频"。

#### 变更 11：修复 TeacherRelax 播放按钮样式 bug
**文件**：src/pages/teacher/TeacherRelax.tsx（行 189-193）
**What**：`isPlaying` 为 true 时按钮显示暂停图标 + "暂停" 样式，false 时显示播放图标 + "播放" 样式。修正两分支相同的 className。
**Why**：当前 isPlaying true/false 视觉无差异（复制粘贴 bug）。
**How**：true 分支改为 `from-indigo-400 to-purple-500`（浅色）+ Pause 图标，false 分支保持 `from-indigo-500 to-purple-600` + Play 图标。

---

### P1 数据可信度修复（6 项）

#### 变更 12：修复硬编码统计数字
**文件**：`src/pages/student/StudentProfile.tsx`（行 199-201）、`src/pages/teacher/TeacherProfile.tsx`（行 93-103）、`src/pages/parent/ParentProfile.tsx`（行 132,138,143）
**What**：统计数字改为从对应 store 读取：StudentProfile 连续打卡取 `moodStore.continuousDays`；TeacherProfile 班级数/学生数/咨询次数取 `classroomStore` 数据；ParentProfile 绑定孩子数取 `parentStore.children.length`、待处理告警取 `parentStore.alerts.filter(a=>!a.acknowledged).length`。无数据时显示 `--` 而非假数字。
**Why**：当前统计全部硬编码（5/3/128/156/1/0/7），与 store 数据脱节，误导用户。
**How**：替换硬编码值为 store 计算值，加 `?? '--'` 兜底。

#### 变更 13：修复 TeacherProfile 权限开关死控件
**文件**：src/pages/teacher/TeacherProfile.tsx（行 20-26、145-155）
**What**：将 `permissionItems` 的 `enabled` 改为组件内 `useState`，`<button>` 添加 `onClick` 切换状态 + toast 提示"权限已更新（演示）"。添加 `role="switch"` + `aria-checked`。
**Why**：当前 `enabled` 是常量，按钮无 onClick，圆点永远停右侧——纯装饰。
**How**：`const [permissions, setPermissions] = useState(initialPermissions)`，onClick 切换对应项 enabled + toast。

#### 变更 14：移除/标注死按钮
**文件**：三个 Profile 的快捷菜单/设置项、TeacherHome 的"导入数据/导出报告"、TeacherHome 搜索框、Header 通知铃铛
**What**：
- 死按钮（无 onClick 且非未来功能）：要么实现基本交互（toast"功能开发中"），要么移除。
- TeacherHome 搜索框：添加 `value`/`onChange` state + 前端过滤学生列表，或移除。
- Header 通知铃铛：添加 `onClick` 弹出 toast"暂无新通知"，或移除红点。
**Why**：大量死按钮让用户点击无反应，严重损害信任。
**How**：统一方案——给所有暂未实现的按钮添加 `onClick={() => toast.info('功能开发中，敬请期待')}`，搜索框接入 state 实现前端过滤，铃铛接 toast。保留视觉但不再"死"。

#### 变更 15：修复 moodStore 降级策略
**文件**：`src/store/moodStore.ts`（行 57-58）
**What**：引入 `isDegradable` 函数（从 parentStore 复制），仅 `status === 0 || >= 500` 降级到 mock，4xx 写入 error 字段。在 store interface 添加 `error` 字段。
**Why**：当前注释说"其他错误也降级到 mock"——掩盖 401/403 等认证失败。
**How**：添加 `isDegradable`，修改 catch 分支：可降级 → mock + isUsingMockData；不可降级 → set error。

#### 变更 16：修复 parentStore.bindChild 覆盖 isUsingMockData
**文件**：`src/store/parentStore.ts`（行 227）
**What**：降级分支中 `isUsingMockData: true` 改为 `isUsingMockData: get().isUsingMockData || true`（仅当之前已是 mock 或本次确实降级时才标记），且成功分支保持 `isUsingMockData: false` 不变。更精确地：降级时不覆盖已有真实数据的 isUsingMockData 标记。
**Why**：当前先成功绑定真实孩子、再绑定失败降级时，isUsingMockData 被覆盖为 true，之前的真实绑定也被打上 mock 标记。
**How**：降级分支改为仅在 `children.length === 0` 时设 `isUsingMockData: true`。

#### 变更 17：修复 chatStore mock 回复不带 riskLevel
**文件**：`src/store/chatStore.ts`（行 114-124）
**What**：mock 回复中随机为部分消息附加 `riskLevel: 'green'`（低风险），并确保关键词检测（如"不想活"等）在 mock 模式下仍触发红色风险提示回复。
**Why**：当前降级后 mock 回复不带 riskLevel，风险检测完全失效。
**How**：在 mock responses 数组中部分项添加 `riskLevel`；在 `sendMessage` mock 分支中添加关键词检测逻辑（从 ParentChat 的 crisisKeywords 复制），命中时返回带 `riskLevel: 'red'` 的回复。

---

### P2 体验一致性修复（7 项）

#### 变更 18：统一 Mock 降级提示
**文件**：`src/pages/student/StudentChat.tsx`、`src/pages/teacher/TeacherChat.tsx`
**What**：读取 `chatStore.isUsingMockData`，在页面顶部显示与 ParentChat 一致的"后端未连接，当前为示例回复"横幅。
**Why**：ParentChat 有横幅、ParentChildren/Emergency/Profile 有徽章，但 StudentChat/TeacherChat 完全不显示。
**How**：在消息区上方添加条件横幅 `isUsingMockData && <div className="bg-warning-50...">后端未连接，当前为示例回复</div>`。

#### 变更 19：统一 Loading 模式
**文件**：StudentChat、TeacherChat、StudentRelax、TeacherRelax、StudentHome
**What**：这些页面添加 loading 态：StudentChat/TeacherChat 在 `fetchMessages` 期间显示 `<Loader2 className="animate-spin">` 居中；StudentRelax/TeacherRelax 在内容加载期间显示骨架屏或 spinner；StudentHome 在 `fetchMoodHistory` 期间趋势图区域显示 spinner。
**Why**：当前这些页面完全无 loading，用户无法区分"加载中"与"无数据"。
**How**：各页面添加 `isLoading` state（或从 store 读取），条件渲染 spinner。

#### 变更 20：统一 StudentHome 三态
**文件**：`src/pages/student/StudentHome.tsx`（行 150-163）
**What**：趋势图区域添加：`moodHistory.length === 0` 时显示空态（"暂无心情记录，快去打卡吧"）；`isLoading` 时显示 spinner；`error` 时显示错误提示。修复"本周心情"硬编码 `😊`（行 186）为真实数据计算。
**Why**：新用户/慢网络下趋势图空白，"本周心情"硬编码 emoji 不真实。
**How**：添加条件渲染分支；本周心情从 `moodHistory` 计算本周平均情绪。

#### 变更 21：TeacherRelax 接入 API
**文件**：`src/pages/teacher/TeacherRelax.tsx`
**What**：复制 StudentRelax 的 `contentApi.getMeditations`/`getBreathing` 调用 + `contentSource` 徽章逻辑到 TeacherRelax。
**Why**：StudentRelax 有 API 集成 + "API/示例"徽章，TeacherRelax 完全没有——两端不一致。
**How**：添加 useEffect 调 contentApi，添加 contentSource state + 徽章。

#### 变更 22：StudentRelax 错误处理
**文件**：`src/pages/student/StudentRelax.tsx`（行 138-140、158-160）
**What**：`.catch(() => {})` 改为 `.catch((err) => { console.error('contentApi failed:', err); })`，保留 mock 降级但至少记录错误。
**Why**：当前静默吞掉 API 错误，调试困难。
**How**：替换空 catch 为带 console.error 的 catch。

#### 变更 23：ParentChat 接入 chatApi
**文件**：`src/pages/parent/ParentChat.tsx`（行 93）
**What**：`post('/v1/chat/message')` 改为 `chatApi.sendMessage`，获得 2000 字长度校验。保留 ParentChat 的 error/mock/危机关键词逻辑。
**Why**：当前绕过 chatApi，丢失长度校验，两套调用路径并存。
**How**：替换 `post` 为 `chatApi.sendMessage`，适配返回值格式。

#### 变更 24：统一三端配色到 token 体系
**文件**：TeacherHome（indigo/purple）、ParentHome/ParentChat/ChatDisabledPlaceholder（#F4A261/#E76F51）、tokens.ts
**What**：在 tokens.ts 新增 `accent` 色系（`accent: { 50-900 }`，对应家长端的橙色调），将 parent 端硬编码色值替换为 `accent-*`。TeacherHome 的 indigo/purple 替换为 `primary/secondary`。ChatDisabledPlaceholder 的 student/teacher 渐变从 indigo/purple 改为 `primary/secondary`，parent 改为 `accent`，背景渐变按 role 区分。
**Why**：三端三套配色并行（token primary/secondary + 非token indigo/purple + 硬编码 hex），设计系统未贯穿。
**How**：tokens.ts 添加 accent 色阶 → tailwind.config 引入 → 全局替换硬编码色值。

---

### P3 可访问性系统性修复（8 项）

#### 变更 25：全局 aria-label 补全
**文件**：Header.tsx、Login.tsx、三个 Chat 页面、两个 Relax 页面、Modal.tsx、Toast.tsx
**What**：
- Header 汉堡按钮：`aria-label="菜单" aria-expanded={mobileMenuOpen} aria-controls="mobile-menu"`；通知铃铛 `aria-label="通知"`；导航项添加 `aria-current={isActive ? "page" : undefined}`。
- Login 密码显隐按钮 `aria-label={showPassword ? "隐藏密码" : "显示密码"}`；表单 Input 添加 `autocomplete="username"`/`autocomplete="current-password"`。
- Chat 输入框 `aria-label="输入消息"`；发送按钮 `aria-label="发送"`；消息列表 `role="log" aria-live="polite"`。
- Relax 播放控制按钮 `aria-label="播放"/"暂停"/"上一首"/"下一首"`；进度条 `role="progressbar" aria-valuenow aria-valuemin aria-valuemax`。
- Modal 关闭按钮 `aria-label="关闭"`；Modal 容器 `role="dialog" aria-modal="true" aria-labelledby`。
- Toast 容器 `role="region" aria-live="polite"`；Toast 关闭按钮 `aria-label="关闭"`。
**Why**：几乎全项目无 aria-label，屏幕阅读器用户无法操作。
**How**：逐文件添加 aria 属性。

#### 变更 26：Modal 焦点陷阱
**文件**：`src/components/ui/Modal.tsx`
**What**：打开时将焦点移入 Modal（聚焦首个可聚焦元素或 Modal 容器），Tab/Shift+Tab 在 Modal 内循环，关闭时焦点恢复到触发元素。添加 `role="dialog"` `aria-modal="true"` `aria-labelledby`。
**Why**：当前打开 Modal 后 Tab 会跑到背景页，键盘用户无法有效操作。
**How**：用 `useRef` + `keydown` 监听 Tab，计算 focusable elements 数组，循环焦点。`onClose` 时 `triggerElement.focus()`。

#### 变更 27：Tab/Toggle ARIA 模式
**文件**：StudentRelax/TeacherRelax（Tab）、ParentEmergency（筛选 Tab）、TeacherProfile/ParentProfile（Toggle）
**What**：
- Tab 组：容器 `role="tablist"`，每个 Tab `role="tab" aria-selected={active} aria-controls={panelId}`，面板 `role="tabpanel" id={panelId}`，支持左右方向键切换。
- Toggle 开关：`role="switch" aria-checked={enabled}`。
**Why**：不符合 ARIA Tab/Switch 模式，辅助技术无法识别。
**How**：添加 role/aria 属性 + 键盘事件处理。

#### 变更 28：EmergencyResource 添加 id 字段
**文件**：`src/types/index.ts`、`src/pages/parent/ParentEmergency.tsx`（行 310）、`src/store/parentStore.ts`（mockAlerts/resources）
**What**：`EmergencyResource` 类型添加 `id: string` 字段，mock 数据添加 id，`key={idx}` 改为 `key={resource.id}`。
**Why**：当前用数组下标作 key，筛选切换时可能渲染错乱。
**How**：类型添加 id，mock 数据添加 id，渲染处改 key。

#### 变更 29：暗色模式修复或移除
**文件**：`src/hooks/useTheme.ts`、`src/design/theme.ts`、`src/index.css`、所有含 `dark:` 类的组件
**What**：因暗色模式完全未接入（useTheme 从未被调用），选择**移除死代码**：删除 useTheme.ts、theme.ts 中的 darkTheme，移除组件中的 `dark:` 类。保留 `darkMode: "class"` 配置但不渲染暗色（避免大范围改动）。
**Why**：暗色模式是死代码，`dark:` 类全部无效，误导维护者。
**How**：删除 useTheme.ts、darkTheme；grep 清除 `dark:` 类。

#### 变更 30：清理死代码
**文件**：`src/components/Empty.tsx`、`src/components/LazyLoad.tsx`、`src/components/SuspenseWrapper.tsx`、`src/services/ws.ts`（可选保留）、各文件未使用 import
**What**：删除 Empty.tsx（无引用）、LazyLoad.tsx/SuspenseWrapper.tsx（未使用）；清理各文件未使用的 import（如 StudentRelax 的 Volume2/MessageCircle）。ws.ts 暂保留（有完整实现，未来可能启用）。
**Why**：死代码增加维护负担。
**How**：删除文件，grep 确认无引用后清理 import。

#### 变更 31：EmergencyHelpButton 全局化
**文件**：`src/App.tsx`、`src/components/common/EmergencyHelpButton.tsx`、`src/pages/student/StudentHome.tsx`、`src/pages/teacher/TeacherHome.tsx`、`src/pages/parent/ParentHome.tsx`
**What**：在 App.tsx 的 `<Routes>` 之外（但 ProtectedRoute 内）全局渲染 `<EmergencyHelpButton />`，使其在所有受保护页面可见。从 ChatDisabledPlaceholder 中移除单独引用（避免重复）。
**Why**：心理健康应用的主页面无危机热线入口（仅 ChatDisabledPlaceholder 有），是重大安全缺口。
**How**：App.tsx 在 ProtectedRoute 的 children 外包一层含 EmergencyHelpButton 的 fragment。

#### 变更 32：ParentHome 重复入口 + Skip-link
**文件**：`src/pages/parent/ParentHome.tsx`（行 244、273）、`src/App.tsx`
**What**：ParentHome 两个都指向 `/parent/emergency` 的入口卡，改为一个指向 emergency、另一个改为指向 `/parent/children` 或其他有意义的页面。App.tsx 添加 skip-link `<a href="#main" className="sr-only focus:not-sr-only">跳到主内容</a>`，各页面 `<main>` 添加 `id="main"`。
**Why**：两个入口指向同一路由是冗余；无 skip-link 键盘用户需多次 Tab。
**How**：修改第二个入口卡的 navigate 目标；App.tsx 添加 skip-link；各 main 添加 id。

---

## 五、Assumptions & Decisions 假设与决策

| 项 | 决策 | 理由 |
|----|------|------|
| 修复范围 | 全部 28 项 | 用户明确选择 |
| 交付方式 | 开 PR 并合并 | 用户明确选择 |
| 分支 | 基于 main 创建 `fix/ux-improvements-all` | 不污染 feat 分支 |
| 暗色模式 | 移除死代码（非修复启用） | 启用暗色模式需全组件适配，超出 UX 修复范围；移除避免误导 |
| 假音乐播放 | 添加 `<audio>` + 无 url 时标注"演示模式" | 无法获取真实音频文件，但至少实现播放机制 |
| 死按钮 | 添加 toast"功能开发中"而非移除 | 保留 UI 完整性，用户点击有反馈 |
| 统计数字 | 从 store 读取，无数据显 `--` | 避免硬编码假数字 |
| 权限开关 | 本地 state + toast（非 API） | 无后端权限 API，演示交互即可 |
| WebSocket | 保留不删 | 有完整实现，未来可能启用 |
| 验证方式 | 本地构建 + 浏览器逐页验证（api=500 模式） | 与上次验收一致 |
| 配色统一 | 新增 accent token（橙色调）给 parent 端 | 保留家长端橙色品牌识别，但纳入 token 体系 |

---

## 六、Verification 验证步骤

1. **构建**：`cd web-frontend && npm run build`（tsc + vite build）无错误。
2. **逐页浏览器测试**：用 api=500 静态服务器 + 浏览器子代理验证全部 14 页：
   - 每页可见内容（非白屏/404）
   - 资料编辑后 toast 提示 + state 更新
   - ParentChat 危机关键词不重复消息
   - TeacherChat 显示风险提示框
   - ParentEmergency 告警 Modal 可关闭 + 导航坐标非硬编码
   - Relax 播放按钮有 `<audio>` 元素
   - 所有页面有 loading/empty/error 态
   - Modal 焦点陷阱生效（Tab 循环）
   - aria-label 存在（抽查）
3. **可访问性抽查**：用浏览器检查 Tab 键导航、focus 可见性。
4. **PR**：推送 `fix/ux-improvements-all` → 开 PR → 合并 → Pages 部署 → 正式站点逐页验证。

---

## 七、执行顺序

1. 基础设施（变更 1-4）：Toast Provider、ErrorBoundary、focus outline、容器宽度。
2. P0 bug（变更 5-11）：资料编辑、消息重复、风险提示、导航坐标、告警 Modal、音乐播放、按钮样式。
3. P1 可信度（变更 12-17）：硬编码统计、权限开关、死按钮、降级策略。
4. P2 一致性（变更 18-24）：mock 提示、loading、三态、API 集成、配色统一。
5. P3 可访问性（变更 25-32）：aria、焦点陷阱、ARIA 模式、id、暗色模式清理、死代码、EmergencyHelpButton 全局化、skip-link。
6. 构建验证 → PR → 合并 → Pages 验证。
