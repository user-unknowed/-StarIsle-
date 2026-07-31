# AI 大模型代码审核计划

> **审核范围**：`feat-design-frontend-tools-Pj5q7p` 分支合并到 `main` 的全部 AI 相关代码
> **审核标准**：学生端 MVP-PRD、家长端 PRD、小星虚拟形象设计文档、三端前端工具设计与部署计划
> **审核方法**：HOTL code-review 流程（6 维度 + 6 段输出契约）

---

## 一、当前状态分析

### 1.1 合并变更概览

本次合并共变更 34 个文件，其中 AI 大模型相关核心文件 19 个，覆盖以下功能域：

| 功能域 | 文件 | AI 关联度 |
|--------|------|:---------:|
| AI 对话 API 封装 | `web-frontend/src/services/api.ts` | 高 |
| AI 对话 HTTP 底层 | `web-frontend/src/services/http.ts` | 中 |
| AI 实时对话 WebSocket | `web-frontend/src/services/ws.ts` | 高 |
| AI 对话状态管理 | `web-frontend/src/store/chatStore.ts` | 高 |
| 家长端 AI 状态管理 | `web-frontend/src/store/parentStore.ts` | 中 |
| 学生端 AI 对话页 | `web-frontend/src/pages/student/StudentChat.tsx` | 高 |
| 教师端 AI 对话页 | `web-frontend/src/pages/teacher/TeacherChat.tsx` | 高 |
| 家长端 AI 对话页 | `web-frontend/src/pages/parent/ParentChat.tsx` | 高 |
| 风险检测 AI 逻辑 | `web-frontend/src/pages/teacher/TeacherHome.tsx` | 高 |
| 心理测评 AI 逻辑 | `web-frontend/src/pages/student/StudentProfile.tsx` | 高 |
| AI 接口调试面板 | `web-frontend/src/components/dev/ApiDebugOverlay.tsx` | 低 |
| AI 类型定义 | `web-frontend/src/types/index.ts` | 中 |
| OpenAPI 规范 | `api-docs/spec/openapi.yaml` | 中 |
| API 文档工具 | `api-docs/src/App.tsx`、`ApiTester.tsx`、`EndpointOverview.tsx`、`JsonView.tsx`、`specParser.ts` | 低 |

### 1.2 PRD 标准基线

审核将对照以下 PRD 文档的关键要求：

**学生端 MVP-PRD（FR-3 / FR-6）**：
- FR-3.1 基础对话：AI 回复基于 CBT 框架
- FR-3.4 对话安全边界：安全规则 100% 生效；紧急帮助按钮始终可见
- FR-6.1 L1 关键词检测：延迟 < 500ms，误报率 < 5%
- FR-6.2 L2 语义检测：延迟 < 5s，召回率 > 85%
- FR-6.3 高风险危机响应：触发到话术推送 < 2s，热线一键拨打，≥ 3 个有效热线
- AC-14：安全规则 100% 生效；紧急帮助按钮始终可见

**家长端 PRD（第 7 节 / 第 8 节）**：
- 7.3 大星对话安全红线：绝不替代专业诊断、绝不制造焦虑、绝不批评家长、检测到危机立即切换、始终传递希望
- 6.3 家长与大星对话流程：WebSocket 实时传输
- 8.1 预案触发：家长描述孩子出现自伤行为 → 红色预警
- 8.2 红色预警：立即全屏阻断通知；2 小时内确认

**小星虚拟形象设计文档**：
- 对话风格：短句 ≤ 20 字，自称"小星"，语气词"呀""呢""啦""～"
- 四级风险响应：绿/黄/橙/红，红色触发危机干预模式
- 10 条安全红线（RL-01~RL-10）

---

## 二、审核方案

### 2.1 审核维度（6 维度）

按照 HOTL code-review 输出契约，从以下 6 个维度审核：

#### 维度 1：PRD 对齐性（Plan Alignment）
逐条对照 PRD 需求项与代码实现，检查：
- FR-3.4 安全边界：聊天页是否有"紧急帮助"按钮始终可见
- FR-6.1/6.2 风险检测：前端是否处理 AI 返回的 `riskLevel` 字段并触发相应 UI
- FR-6.3 危机响应：红色风险时是否展示危机热线和一键拨号
- 家长端 7.3 安全红线：mock 回复是否违反安全红线（如替代诊断、制造焦虑）
- 家长端 6.3：PRD 要求 WebSocket 传输，实际实现是否一致
- 家长端 8.1：家长描述自伤时是否触发应急预案

#### 维度 2：代码质量与设计（Code Quality）
- ParentChat 未使用 chatStore，与 StudentChat 架构不一致
- ParentChat 直接调用 `post('/v1/chat/message')` 而非通过 `chatApi`/`parentApi` 统一封装
- 类型安全：`as unknown as` 类型断言链是否合理
- DRY 原则：三端 Chat 页面是否存在大量重复代码
- 错误处理：mock 降级逻辑是否一致

#### 维度 3：安全与可靠性（Security & Reliability）
- AI 安全边界：mock 回复中是否包含不安全内容（如自伤方法、诊断性语言）
- 危机话题处理：ParentChat 话题卡片含"发现孩子有自伤倾向"，但无前端危机检测
- JWT Token 安全：http.ts 是否正确处理 401 过期
- XSS 防护：AI 回复内容是否做 HTML 转义（React 默认转义，但需确认）
- 敏感数据：API 调试面板是否可能泄露用户隐私数据

#### 维度 4：性能与边界条件（Performance & Boundaries）
- 消息长度限制：PRD 要求 message maxLength 2000，前端是否校验
- 超时处理：AI 回复慢时是否有合理超时（http.ts 10s 是否足够）
- 并发发送：快速连续发送消息是否会导致消息顺序错乱
- 空消息/超长消息处理
- WebSocket 重连机制（ws.ts 最多 5 次重连）

#### 维度 5：AI 角色一致性（Character Consistency）
- 小星对话风格：mock 回复是否符合"短句 ≤ 20 字、自称小星、语气词"设定
- 大星对话风格：mock 回复是否符合"中长句 15-30 字、有阅历、语重心长"设定
- 测评结果中称呼错误：StudentProfile mock 结果使用"大星"而非"小星"
- 话题卡片内容是否与 PRD 示例一致

#### 维度 6：移除与简化（Removal & Simplification）
- 是否有未使用的导入或变量
- mock 数据是否应在生产构建中移除或条件加载
- ApiDebugOverlay 是否仅在开发环境加载

---

### 2.2 审核执行步骤

#### 步骤 1：并行分发审核 Agent

使用 `trae-remote-official:hotl:dispatch-agents` 或 Task 工具，并行分发 3 个审核子任务：

**子任务 A — AI 对话与安全边界审核**
- 审核文件：`StudentChat.tsx`、`ParentChat.tsx`、`TeacherChat.tsx`、`chatStore.ts`、`api.ts`（chatApi 部分）
- 审核重点：FR-3.4 安全边界、角色一致性、危机响应机制、mock 数据安全性
- 对照 PRD：学生端 MVP-PRD FR-3/FR-6、家长端 PRD 第 7 节、小星设计文档

**子任务 B — 风险检测与心理测评审核**
- 审核文件：`TeacherHome.tsx`、`StudentProfile.tsx`、`parentStore.ts`（风险/告警部分）、`ParentEmergency.tsx`、`types/index.ts`
- 审核重点：FR-6.1/6.2 风险检测、FR-6.3 危机响应、风险评估准确性、应急预案触发
- 对照 PRD：学生端 MVP-PRD FR-6、家长端 PRD 第 8 节

**子任务 C — API 层与基础设施审核**
- 审核文件：`http.ts`、`ws.ts`、`ApiDebugOverlay.tsx`、`api.ts`（非 chat 部分）、`openapi.yaml`
- 审核重点：安全传输、超时处理、错误处理、WebSocket 重连、调试面板安全
- 对照 PRD：TechArch.md 安全考虑、三端前端工具设计与部署计划

#### 步骤 2：汇总审核发现

收集 3 个子任务的审核结果，按 HOTL 输出契约格式整理：
1. Scope（审核范围 + 验证证据）
2. Reviewed Dimensions（6 维度审核结果）
3. Findings（按 BLOCK / WARN / NOTE 分级）
4. What Was Not Covered（未覆盖项）
5. Residual Risks（残留风险）
6. Verdict（READY / READY WITH WARNINGS / NOT READY）

#### 步骤 3：输出审核报告

将审核报告写入 `.trae/documents/ai-code-review-report.md`，并向用户展示关键发现。

---

## 三、预期审核重点问题（基于 Phase 1 探索的初步发现）

以下为探索阶段已识别的潜在问题，需在审核中确认：

| # | 文件 | 潜在问题 | 严重度预估 |
|---|------|---------|:----------:|
| 1 | `ParentChat.tsx` | 未使用 chatStore，直接调用 post()，与 StudentChat 架构不一致 | WARN |
| 2 | `ParentChat.tsx` | PRD 要求 WebSocket 传输，实际使用 HTTP POST | WARN |
| 3 | `ParentChat.tsx` | 话题卡片含"发现孩子有自伤倾向"，但无前端危机检测/应急预案触发 | BLOCK |
| 4 | `ParentChat.tsx` | mock 回复中"大星建议...可寻求专业心理帮助"接近替代诊断 | WARN |
| 5 | `StudentProfile.tsx` | mock 测评结果使用"大星为你生成了初步评估"，应为"小星" | WARN |
| 6 | `StudentChat.tsx` | 缺少"紧急帮助"按钮（FR-3.4 / AC-14 要求始终可见） | BLOCK |
| 7 | `ParentChat.tsx` | 缺少"紧急帮助"按钮 | BLOCK |
| 8 | `chatStore.ts` | mock 回复未包含 riskLevel，无法验证风险检测联动 | WARN |
| 9 | `ParentChat.tsx` | AI 回复未处理 riskLevel 字段，无法触发风险告警 | BLOCK |
| 10 | `http.ts` | 消息无前端长度校验（PRD 要求 maxLength 2000） | WARN |
| 11 | `chatStore.ts` | 快速连续发送可能导致消息顺序错乱（isTyping 防抖不完善） | NOTE |

---

## 四、假设与决策

1. **审核范围限定为前端代码**：后端 Java/Python AI 引擎代码不在本次审核范围内（本次合并仅涉及前端）
2. **mock 数据视为生产代码审核**：因为 mock 数据在后端不可用时会展示给真实用户
3. **PRD 为唯一审核标准**：以 PRD 文档中的验收标准（AC）和功能需求（FR）为通过/不通过依据
4. **不执行代码修改**：本次仅生成审核报告，不修改代码（用户确认后再执行修复）

---

## 五、验证步骤

1. 审核报告完成后，逐条核对 Findings 与 PRD 验收标准
2. 确认每个 BLOCK 级问题都有对应的 PRD 条目作为依据
3. 确认审核覆盖了所有 19 个 AI 相关文件
4. 将审核报告保存至 `.trae/documents/ai-code-review-report.md`
5. 向用户展示审核摘要，等待用户确认是否执行修复
