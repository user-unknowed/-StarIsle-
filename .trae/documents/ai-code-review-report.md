# AI 大模型代码审核报告

> **审核日期**：2026-07-31
> **审核范围**：`feat-design-frontend-tools-Pj5q7p` → `main` 合并的 AI 相关代码（19 个核心文件）
> **审核标准**：学生端 MVP-PRD、家长端 PRD、小星虚拟形象设计文档、TechArch.md
> **审核方法**：HOTL code-review 流程（3 路并行审核 → 6 维度 × 6 段输出契约）

---

## 1. Scope（审核范围与验证证据）

### 审核文件清单

| # | 文件路径 | 子任务 |
|---|---------|:------:|
| 1 | `web-frontend/src/pages/student/StudentChat.tsx` | A |
| 2 | `web-frontend/src/pages/parent/ParentChat.tsx` | A |
| 3 | `web-frontend/src/pages/teacher/TeacherChat.tsx` | A |
| 4 | `web-frontend/src/store/chatStore.ts` | A |
| 5 | `web-frontend/src/services/api.ts` | A+C |
| 6 | `web-frontend/src/pages/teacher/TeacherHome.tsx` | B |
| 7 | `web-frontend/src/pages/student/StudentProfile.tsx` | B |
| 8 | `web-frontend/src/store/parentStore.ts` | B |
| 9 | `web-frontend/src/pages/parent/ParentEmergency.tsx` | B |
| 10 | `web-frontend/src/types/index.ts` | B |
| 11 | `web-frontend/src/services/http.ts` | C |
| 12 | `web-frontend/src/services/ws.ts` | C |
| 13 | `web-frontend/src/components/dev/ApiDebugOverlay.tsx` | C |
| 14 | `web-frontend/src/App.tsx` | C |
| 15 | `web-frontend/src/store/apiDebugStore.ts` | C |
| 16 | `web-frontend/.env.production` | C |
| 17 | `api-docs/spec/openapi.yaml` | C |
| 18 | `web-frontend/src/pages/parent/ParentHome.tsx` | B |
| 19 | `web-frontend/src/pages/parent/ParentProfile.tsx` | B |

### 验证证据

- **无 `.hotl/state/` 或 `.hotl/reports/` 目录**：项目中未落地 HOTL 工作流文件
- **无 `docs/plans/` 目录**：计划文档集中在 `.trae/documents/`
- **无测试输出**：项目未配置自动化测试，无 test/lint 输出可引用
- **构建验证**：未执行（本次为静态代码审核）
- **PRD 文档**：已逐一读取学生端 MVP-PRD、家长端 PRD、小星设计文档、TechArch.md 作为审核基线

---

## 2. Reviewed Dimensions（6 维度审核结果）

### 维度 1：PRD 对齐性

已对照 12 项 PRD 需求（FR-3.4、FR-6.1~6.4、AC-14、家长端 7.3/6.3/8.1/8.2、FR-P4.2、FR-4.1/4.2），发现 **21 项 BLOCK 级不合规**。最严重问题：三端聊天页均缺少"紧急帮助"按钮（AC-14 硬性要求）、风险检测链路在 UI 层完全断裂（riskLevel 字段被忽略）、家长端未使用 WebSocket 传输（PRD 6.3 明确要求）、API 路径与 OpenAPI 规范不匹配导致全站 404 风险。

### 维度 2：代码质量与设计

发现 ParentChat 未使用 chatStore（架构分叉）、三端 Chat 页面约 100 行重复 JSX、大量 `as unknown as` 类型断言链绕过类型安全、AssessmentResult 类型定义与 PRD 契约不一致。api.ts 缺少 10+ 个 OpenAPI 已定义端点的封装。

### 维度 3：安全与可靠性

发现 **6 项 BLOCK 级安全问题**：ApiDebugOverlay 生产构建无条件渲染且记录密码/Token、WebSocket 明文传输且无鉴权、mock 回复含替代诊断/诊断性症状列举、危机话题卡片无前端拦截。这些问题涉及未成年人心理数据安全，风险极高。

### 维度 4：性能与边界条件

发现 http.ts 10s 超时对 AI 对话过短、WebSocket 重连 5 次后静默停止无用户提示、消息队列无上限可能内存膨胀、心跳无 pong 超时检测（半开连接）、消息无前端长度校验、chatStore 消息 ID 可能重复。

### 维度 5：AI 角色一致性

发现小星 mock 回复部分超过 20 字限制且缺少语气词、大星 mock 回复全部超过 30 字且未使用"慢慢来/不着急/咱们"口头禅、StudentProfile mock 测评结果错误使用"大星"称呼（应为"小星"）、话题卡片数量和文案与 PRD 不一致。

### 维度 6：移除与简化

发现 ApiDebugOverlay 应在生产构建中移除、未使用的 `put` 导入、mock 数据应在生产中条件加载、OpenAPI 内部响应格式不统一（部分包裹 `{code,message,data}`，部分不包裹）。

---

## 3. Findings（审核发现）

### BLOCK（必须修复 — 共 21 项）

#### 安全边界缺失（FR-3.4 / AC-14）

- **[BLOCK]** `StudentChat.tsx:45-174`、`TeacherChat.tsx:52-184`、`ParentChat.tsx:116-261` — 三端聊天页均缺少"紧急帮助"按钮，违反 PRD FR-3.4 / AC-14"紧急帮助按钮始终可见"。
  - Why: 学生是高危群体，缺少常驻紧急出口在危机时刻可能延误求助。
  - Fix: 在 Header 或聊天容器添加固定定位的"紧急帮助"按钮，点击展示危机热线 + 一键拨号 + 风险告警入口。

- **[BLOCK]** `StudentChat.tsx:91-127`、`TeacherChat.tsx:98-137`、`ParentChat.tsx:170-210` — 三端消息渲染均未读取 `message.riskLevel` 字段，未触发任何风险告警 UI。
  - Why: chatStore 第 78 行已写入 riskLevel，但 UI 完全忽略，风险检测链路在展示层断裂，违反 FR-3.4"安全规则 100% 生效"。
  - Fix: 渲染消息时判断 riskLevel，red/orange 时展示红色横幅、危机热线卡片、一键拨号按钮。

- **[BLOCK]** `chatStore.ts:69-82` — sendMessage 收到 AI 回复后未根据 riskLevel 调用 `riskApi.reportCrisis` 上报危机事件。
  - Why: PRD FR-6.3 要求"触发到话术推送 < 2s"，当前高风险对话无法触达应急系统。
  - Fix: 若 riskLevel 为 red/orange，立即调用 riskApi.reportCrisis 并拉取 riskApi.getHotlines 展示。

#### 家长端 AI 对话合规性

- **[BLOCK]** `ParentChat.tsx:42-107` — 家长端对话使用 HTTP POST，未使用 WebSocket 实时传输。
  - Why: PRD 6.3 明确要求 WebSocket；项目已有 `ws.ts` 完整实现却未被引用。
  - Fix: 引入 WebSocket 管理器收发消息，保留 HTTP 作为降级通道。

- **[BLOCK]** `ParentChat.tsx:13` — 话题卡片"发现孩子有自伤倾向"点击后仅填入输入框，无前端危机检测、无应急预案触发。
  - Why: PRD 8.1 要求"家长描述孩子自伤 → 红色预警"，该话题本身即是高危入口。
  - Fix: 点击危机类话题或输入含自伤关键词时，前端调用 riskApi.detect，red 级别立即弹出应急预案。

- **[BLOCK]** `ParentChat.tsx:20` — mock 回复"必要时带孩子到精神卫生中心评估"接近替代专业诊断。
  - Why: PRD 7.3 大星安全红线"绝不替代专业诊断"。
  - Fix: 改为"建议您带孩子到专业心理机构寻求评估与支持"。

- **[BLOCK]** `ParentChat.tsx:19` — mock 回复"若出现持续低落、失眠等情况"使用诊断性症状列举。
  - Why: PRD 红线"绝不使用诊断性词汇"。
  - Fix: 改为"若您感觉孩子状态让您担忧"，避免具体症状列举。

- **[BLOCK]** `ParentChat.tsx:16-21` — mock 中仅出现 1 条热线（12355）。
  - Why: PRD FR-6.3 明确"≥ 3 个有效热线"。
  - Fix: 补充 400-161-9995 希望热线、010-82951332 等共 ≥ 3 条。

#### 应急预案缺失

- **[BLOCK]** `ParentEmergency.tsx:101-201` — 红色告警未实现 PRD FR-P4.2"全屏阻断通知"，告警仅在普通列表中展示。
  - Why: PRD 8.2 要求红色预警"立即全屏阻断通知"。
  - Fix: 存在 level==='red' 且未确认告警时，渲染全屏阻断 Modal 强制确认。

- **[BLOCK]** `ParentEmergency.tsx:150-180` — 告警卡片仅含 reason + studentId + 确认按钮，缺少"行动建议""医院导航""通知老师""72 小时跟进"。
  - Why: PRD FR-P4.2 标准流程是应急安全闭环。
  - Fix: 扩展为行动建议清单 + 急救电话一键拨打 + 医院导航 + 通知老师 + 72 小时跟进。

- **[BLOCK]** `parentStore.ts:278-323` — 缺少红色告警"2 小时内确认，超时升级至心理组长"机制。
  - Why: PRD 8.2 时效升级是安全保障核心要求。
  - Fix: 记录告警创建时间，超 2 小时未确认时标记升级。

#### 类型与角色错误

- **[BLOCK]** `StudentProfile.tsx:124` — mock 测评结果描述使用"大星"而非"小星"，且与同份结果建议中的"小星"自相矛盾。
  - Why: 学生端 AI 伴侣统一称谓是品牌基础。
  - Fix: 将"大星"改为"小星"。

- **[BLOCK]** `types/index.ts:189-194` — AssessmentResult 类型不符合 PRD：用 `level` 而非 `risk_level`、`suggestion`（单数）而非 `suggestions`（数组）、缺少 `description`。
  - Why: 类型与 PRD 契约不一致迫使 `as unknown as` 绕过类型检查。
  - Fix: 改为 `{ risk_level: RiskLevel; description: string; suggestions: string[]; score: number }`。

#### API 基础设施安全

- **[BLOCK]** `App.tsx:3,168` — ApiDebugOverlay 在生产构建中无条件渲染，未做 `import.meta.env.DEV` 守卫。
  - Why: 调试面板会随生产包发布，泄露 API 路径、请求/响应结构。
  - Fix: 改为 `{import.meta.env.DEV && <ApiDebugOverlay />}`。

- **[BLOCK]** `http.ts:78-93` — recordLog 将完整 requestBody 与 responseBody 写入调试 store，包含登录密码、JWT Token。
  - Why: 结合上一条，密码与 Token 会在生产 UI 明文展示。
  - Fix: 对 `/auth/*`、`/parents/login` 等敏感端点跳过日志或脱敏。

- **[BLOCK]** `.env.production:3` — `VITE_WS_URL=/ws` 为相对路径，WebSocket 构造器要求绝对 URL，连接直接失败。
  - Why: 家长端 PRD 6.3 实时对话流程不可用。
  - Fix: 配置完整绝对地址 `wss://api.starisle.com/ws`。

- **[BLOCK]** `ws.ts:6,39` — WebSocket 默认 `ws://localhost:8080`（明文），未强制 `wss://`。
  - Why: 未成年人心理数据明文传输，违反 TechArch "HTTPS/TLS 1.3"。
  - Fix: 生产强制 `wss://`，运行时校验协议。

- **[BLOCK]** `ws.ts:38-39` — WebSocket 连接未携带 JWT Token，仅靠 URL path 中的 userId 标识身份。
  - Why: 任何知道 userId 的攻击者均可连接他人对话流。
  - Fix: 通过子协议或首条消息发送 token 完成鉴权。

- **[BLOCK]** `api.ts:34,62,78,82,86` — authApi/moodApi/chatApi 路径缺少 `/v1` 前缀，且 chat 路径与 OpenAPI 不一致。
  - Why: BASE_URL 为 `/api`，`post('/auth/login')` 实际请求 `/api/auth/login`，OpenAPI 定义为 `/api/v1/auth/login`；chatApi.sendMessage 调用 `/chat`，OpenAPI 为 `/api/v1/chat/message`。全部 404。
  - Fix: 统一补齐 `/v1` 前缀并核对路径。

- **[BLOCK]** `http.ts` vs `openapi.yaml` — http.ts 直接返回 `response.json() as T`，未解包 OpenAPI 规定的 `{code, message, data}` 外层。
  - Why: 实际运行时拿到的是外层 wrapper，访问 `.id`/`.token` 将为 undefined，导致全站功能失效。
  - Fix: 在 http.ts 统一识别 wrapper 并返回 data 字段。

---

### WARN（应尽快修复 — 共 23 项）

#### 代码质量与架构

- **[WARN]** `ParentChat.tsx:29-36` — 未使用 useChatStore，自行用 useState 维护状态，与 StudentChat/TeacherChat 架构不一致。
- **[WARN]** `ParentChat.tsx:60-64` — 直接 `post('/v1/chat/message')`，未通过 chatApi/parentApi 统一封装。
- **[WARN]** `ParentChat.tsx:85-87` — `err instanceof Error` 几乎恒为 true，导致所有错误（含 4xx）都降级到 mock。
- **[WARN]** `StudentChat.tsx`/`TeacherChat.tsx`/`ParentChat.tsx` — 三端聊天页约 100 行重复 JSX（消息列表、typing、输入区）。
- **[WARN]** `ParentChat.tsx:65-66` — `(data && (data.response || data.data?.response)) as string` 类型断言冗余且不安全。
- **[WARN]** `chatStore.ts:21-27` — 话题来源三处分散（chatStore/ParentChat/TeacherChat 各自定义），chatApi.getTopics 已定义却无人调用。
- **[WARN]** `ParentChat.tsx:29-107` — 未调用 fetchMessages 拉取历史消息，刷新后历史丢失。
- **[WARN]** `StudentProfile.tsx:66,103,110` — 多处 `as unknown as` 类型断言链绕过类型检查。
- **[WARN]** `TeacherHome.tsx:49` — riskDetails 按 studentId 累积无清理，长会话内存增长。
- **[WARN]** `types/index.ts:176-181` — 缺少 RiskLevel 联合类型，全部使用 string。
- **[WARN]** `api.ts:5` — 导入 `put` 未使用。
- **[WARN]** `api.ts` — 缺少 10+ 个 OpenAPI 已定义端点封装（notifications、data/import/export、permissions、logout 等）。

#### AI 角色一致性

- **[WARN]** `chatStore.ts:94` — mock 回复"嗯，我懂你的感受..."未自称"小星"、无语气词、超 20 字。
- **[WARN]** `ParentChat.tsx:17-20` — 大星 4 条 mock 回复全部超过 30 字，未使用"慢慢来/不着急/咱们"。
- **[WARN]** `ParentChat.tsx:9-14` — 话题卡片仅 4 张，PRD 要求 6 张且文案不一致。
- **[WARN]** `StudentProfile.tsx:82-86` — Mock 测评仅 3 题，未完整映射 PHQ-9 量表（标准 9 题）。
- **[WARN]** `StudentProfile.tsx:120` — Mock 风险等级计算永不返回 'red'，缺失四级中的红色。
- **[WARN]** `StudentProfile.tsx:354-361` — 测评结果展示仅处理 green/yellow，red 回退到 orange 样式。

#### 安全与降级

- **[WARN]** `parentStore.ts:281-283` — fetchAlerts 仅获取单条告警，无法支持多条并发。
- **[WARN]** `parentStore.ts:288-289` — 告警获取失败降级到 mockAlerts（固定橙色），可能用假告警掩盖真实危机。
- **[WARN]** `parentStore.ts:85-114` — Mock 应急资源缺少 PRD 8.3 要求的"学校心理老师"和"班主任"。
- **[WARN]** `ParentEmergency.tsx:85-88` — handleConfirm 无二次确认弹窗。
- **[WARN]** `ParentEmergency.tsx:262-268` — 医院资源仅 tel: 拨号，未实现 PRD"医院导航"。

#### API 与传输

- **[WARN]** `http.ts:8,54` — 10s 超时对 AI 对话场景过短（大模型冷启动可能 >10s）。
- **[WARN]** `http.ts:122-125` — 401 处理未通知 authStore，并发 401 触发多次跳转。
- **[WARN]** `ws.ts:14-15,66-70` — 重连 5 次后静默停止，无用户提示。
- **[WARN]** `ws.ts:18,84,96` — messageQueue 无上限，断连期间内存膨胀。
- **[WARN]** `ws.ts:121-126` — 心跳仅发 ping 无 pong 等待，半开连接不被发现。
- **[WARN]** `ApiDebugOverlay.tsx:155-163` — 即便仅开发环境，面板明文展示敏感数据。
- **[WARN]** `api.ts:78-79` — sendMessage 发送前无 message.length <= 2000 前端校验。
- **[WARN]** `api.ts:193` — parentApi.getChildMood 路径与 OpenAPI 不一致（parents 复数 vs parent 单数）。
- **[WARN]** `openapi.yaml:993-1011` — 教师端 chat.message 未定义 maxLength: 2000。
- **[WARN]** `openapi.yaml` — 未文档化 WebSocket 端点 `/ws/chat/{userId}`。

---

### NOTE（未来考虑 — 共 15 项）

- **[NOTE]** `api.ts:249-252` — riskApi.getHotlines 已定义但全项目无调用方。
- **[NOTE]** `chatStore.ts:59,73,94,103` — `msg-${Date.now()}` 快速连续发送可能产生重复 id。
- **[NOTE]** `StudentChat.tsx:151`/`ParentChat.tsx:239`/`TeacherChat.tsx:161` — 使用已废弃的 `onKeyPress`，应改用 `onKeyDown`。
- **[NOTE]** `ws.ts:6` — WS_BASE_URL 默认 localhost，生产配置未在文档中说明。
- **[NOTE]** `chatStore.ts:29-32` — mockMessages 含示例对话，降级时展示可能被误认为真实历史。
- **[NOTE]** `TeacherHome.tsx:75-79` — Mock 历史趋势使用硬编码日期 '2026-07-12/13/14'。
- **[NOTE]** `TeacherHome.tsx:282` — 告警徽章三元仅处理 red/orange，green 回退到 yellow。
- **[NOTE]** `ParentEmergency.tsx:168` — 告警卡片展示原始"孩子ID"而非姓名。
- **[NOTE]** `parentStore.ts:74-83` — mockAlerts 仅 1 条橙色，无红色告警 mock。
- **[NOTE]** `http.ts:13` — JWT 存于 localStorage（XSS 可读取），建议评估 HttpOnly Cookie。
- **[NOTE]** `apiDebugStore.ts:22` — MAX_LOGS=10 对复杂调试场景过少。
- **[NOTE]** `openapi.yaml` — 内部响应格式不统一（部分包裹 `{code,message,data}`，部分不包裹）。
- **[NOTE]** `api.ts:237-242` — riskApi.detect 无前端 SLA 监控。
- **[NOTE]** `openapi.yaml:1477-1520` — emergency/resources 端点功能重叠，命名易混淆。
- **[NOTE]** `ParentChat.tsx:89` — mock 延迟 1.2s 加上选择逻辑最坏远超 PRD FR-6.3 "< 2s" SLA。

---

## 4. What Was Not Covered（未覆盖项）

| 未覆盖项 | 原因 | 建议 |
|---------|------|------|
| 后端 Java/Python AI 引擎代码 | 本次合并仅涉及前端 | 后续单独审核 backend-java 和 ai-engine |
| Flutter 学生端/教师端 APP | 本次合并仅涉及 web-frontend | 若有 Flutter 代码变更需单独审核 |
| OpenAPI 61 个端点的逐条字段验证 | 范围过大，仅审核了 AI 相关端点 | 建议后续全量审核 openapi.yaml |
| 构建验证（tsc/vite build） | 审核为静态分析，未执行构建 | 建议执行 `npm run check` + `npm run build` |
| 运行时行为测试 | 无测试环境与后端服务 | 建议集成测试环境后验证 API 调用链 |
| 设计稿/视觉走查 | 无 Figma/设计稿资源 | 建议设计师参与 UI 合规走查 |
| 可访问性（a11y）审核 | 超出本次 AI 代码审核范围 | 建议后续单独进行 a11y 审计 |

---

## 5. Residual Risks（残留风险）

| 风险 | 严重度 | 说明 |
|------|:------:|------|
| **未成年人心理数据明文传输** | 高 | WebSocket 使用 ws:// 而非 wss://，对话内容明文传输 |
| **API 路径不匹配导致全站 404** | 高 | authApi/moodApi/chatApi 路径缺少 /v1 前缀，生产环境可能全部失败 |
| **危机话题无前端拦截** | 高 | "发现孩子有自伤倾向"话题点击后无任何危机检测，可能延误干预 |
| **mock 数据替代真实 AI 判断** | 中 | 后端不可用时 mock 回复不含 riskLevel，高危对话无法触发风险告警 |
| **调试面板泄露敏感数据** | 中 | ApiDebugOverlay 在生产构建中可能暴露密码、Token、心理对话内容 |
| **响应格式不一致** | 中 | OpenAPI 部分端点包裹 `{code,message,data}` 部分不包裹，http.ts 未统一解包 |
| **测评结果风险等级截断** | 中 | Mock 计算永不返回 red，且 UI 未处理 red 分支，可能误导学生低估危机 |

---

## 6. Verdict（审核结论）

### **NOT READY** — 不可合并

本次审核发现 **21 项 BLOCK 级问题**，涉及：
- AI 安全边界完全缺失（无紧急帮助按钮、riskLevel 未处理、危机话题无拦截）
- 应急预案未实现（无全屏阻断、无超时升级、无完整流程）
- API 基础设施不安全（明文传输、无鉴权、路径不匹配、响应未解包）
- 生产构建泄露敏感数据（调试面板无条件渲染、记录密码/Token）

这些问题直接影响未成年人心理安全与数据安全，**必须在合并前解决所有 BLOCK 级问题**。建议按以下优先级修复：

1. **P0 — 安全阻断**：添加紧急帮助按钮 → 处理 riskLevel → 修复 API 路径 → 修复 WebSocket 安全
2. **P1 — 应急预案**：实现全屏阻断 → 补全应急流程 → 添加超时升级
3. **P2 — 角色与类型**：修正 AssessmentResult 类型 → 修正 mock 角色称呼 → 统一 API 封装
4. **P3 — 生产安全**：条件加载 ApiDebugOverlay → 脱敏日志 → 移除未使用代码

---

*审核报告生成时间：2026-07-31 | 审核工具：HOTL code-review（3 路并行）*
