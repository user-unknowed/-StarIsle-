# StarIsle · 心理测评模块导入与 MCP 接入设计规范

**版本**：v1.0
**日期**：2026-09-04
**状态**：设计完成（用户已审批 §1~§5）→ 待 writing-plans → 实施
**目标仓库**：`https://github.com/user-unknowed/-StarIsle-`（默认分支 `main`，角色：admin）
**源项目**：`g:\mental health`（心理测评反馈微信小程序 · 37/37 源码合规验收 PASS）

> 对应 Brainstorm 会话 18808：三轮用户决策 —— 导入粒度 = **A（projects 子目录隔离）**；UI 统一 = **方案②（疗愈独立色板 + 间距/圆角/按钮三层桥接）**；技能宿主 = **方案 3（MCP Server 接入 server-services 聊天后端）**；合并总方案 = **B（完整闭环，工期 3~5 天）**。

---

## §1 · 目标 / 非目标 / 约束

### 1.1 目标（三条与用户原话一一对应）

1. **导入任务**：把心理测评反馈微信小程序（`g:\mental health` 全量，28+ 文件）以**独立子项目**形式导入 StarIsle 主仓，同步交付物镜像与联调 README，不破坏 v2.0 现有子域。
2. **统一 UI**：输出疗愈独立色板 Design Tokens（奶油米 + 森林绿 + 薄纱粉）+ 三层桥接样式（间距/圆角/按钮交互）；不强行把 StarIsle 主站星盘色合并，留未来 Tailwind preset 接口。
3. **技能写回原有 AI（server-services 聊天后端）**：将「测评任务下发 / 学生反馈提交 / 教师审核 / AI 情绪分析 / 匿名导出 / PII 访问」六能力封装为标准 **MCP Server 6 Tool**，坐落 `server-services/mcp-psych-assessment/`；所有 2FA / PII / 审计日志在 Tool 层再校验，不信任前端授权 flag。

### 1.2 非目标（本轮绝对不做）

- ❌ 不把 `pages/student/*` 重写为 React 迁入 `student-app/`，也不把 `pages/teacher/*` 迁入 `teacher-app/`（方案 C 内容，跨栈移植）。
- ❌ 不修改 `backend-java/`、`parent-app/`、`api-docs/`、`database_4_ai_res/` 内任何现有文件。
- ❌ 不将真实凭据写入主仓（云环境 ID、DashScope Key、管理员 passwordHash、短信模板 ID）—— 仅提供 `.env.example` 占位。
- ❌ 不在本轮跑 34 条三端真机用例（属于上线前操作，按 docs 交付后由部署端执行）。
- ❌ 不构建独立登录系统：直接复用 `server-services` 现有 auth/session，并叠加 2FA（Tool 级）。

### 1.3 约束 / 合规红线（继承自 mental-health 37 项验收）

- **PII 匿名化不变**：MCP 默认返 `anonymousNo`；真名需要 `accessPII` 二次 2FA（密码 + TOTP 或 SMS）+ 30 秒窗口，到期 `forceReMask` 并写 `audit_logs`。
- **TTL 自动删除（7 天）**：`exportResearch` 落地文件 TTL=7 天；聊天后端 `reply` 渲染时双保险到期灰化按钮 + toast。
- **AI 预算/重试继承**：DashScope 预算 80% WARN / 95% CRIT；失败 3 次指数退避（5s/10s/20s ±25%），进入 `retry_queue`。
- **分支合规（强约束）**：本轮所有变更走远端分支 `feat/import-psych-assessment-miniapp` → 开 **Draft PR** → 你 review 后才转 Ready → 合并 main。禁止直接推 main。
- **主仓优先保留（冲突策略）**：任何与 StarIsle 现有文件同名的文件（README.md / .gitignore / docs/README），**StarIsle 版保留**，小程序版自动重命名为 `README.psych-assessment.md` 等，无任何覆盖。

---

## §2 · 目录结构 & 文件清单（全部纯新增，零修改现有目录）

```
user-unknowed/-StarIsle-   (main)
│
├─ projects/                                                   ← 新增 1 级目录
│  └─ psych-assessment-miniapp/                                ← 选项 A · 子项目隔离根
│     ├─ app.js / app.json / app.wxss / project.config.json / sitemap.json
│     ├─ pages/                (student/teacher/admin 三类，整棵搬迁)
│     ├─ cloudfunctions/       (8 函数 + shared/6 模块 + _utils)
│     ├─ components/admin-2fa/
│     ├─ custom-tab-bar/
│     ├─ utils/                (8 个工具模块)
│     ├─ scripts/              (seed-images.js / create-admin-user.md / seed/*.json)
│     ├─ acceptance_check.py   (37/37 源码合规断言，随项目再跑)
│     ├─ .gitignore            ← 本地 .env / project.private.config.json 忽略
│     └─ README.psych-assessment.md   ← 不覆盖主仓 README.md
│
├─ docs/psych-assessment/                                      ← 新增 2 级目录
│  ├─ design.md                    ← 镜像 specs/2026-09-03-心理测评反馈小程序-design.md
│  ├─ implementation-plan.md       ← 镜像原实施计划
│  ├─ test-cases-34.md             ← 34 条三端真机用例
│  ├─ project-overview.md          ← §1 结构 / §2 流转 / §3 权限 / §4 合规
│  ├─ acceptance-report-37-pass.md ← Windows 验收快照（37/37 PASS）
│  └─ import-checklist.md          ← 导入 StarIsle 自检清单 8 项 Y/N
│
├─ tokens/psych-healing/                                      ← 方案 ② · UI Token 桥接层
│  ├─ tokens.json                      ← 源真 Token（8 色 + 间距 + 圆角 + 字号）
│  ├─ tokens.css                       ← :root { --heal-cream-50: …; }
│  ├─ starisle-bridge.css              ← 仅三层桥接：① 栅格 ② 圆角 ③ 按钮交互
│  ├─ tailwind.preset.js               ← 未来 web-frontend 接入入口
│  └─ miniapp-app.wxss                 ← projects/…/小程序 的新 app.wxss
│
└─ server-services/
   └─ mcp-psych-assessment/           ← 方案 3 · MCP Server 接入现有聊天后端
      ├─ README.md                        6 Tool 说明 + 启动 + 2FA 配置
      ├─ package.json                     @modelcontextprotocol/sdk + 云开发 + dashscope
      ├─ src/index.ts                     MCP bootstrap + register tools + audit 包装器
      ├─ src/tools/                       6 Tool handlers
      │  ├─ listTasks.ts                  按角色/状态筛任务（scope 白名单）
      │  ├─ submitFeedback.ts             学生提交 → msSec 先拦截 → 云等效路径
      │  ├─ aiAnalyze.ts                  DashScope 调用 + retry_queue + 三档预算
      │  ├─ reviewFeedback.ts             0 trust confirm_3 → 强制依赖 aiAnalysis.scores
      │  ├─ exportResearch.ts             匿名 CSV 导出 + 7 天 TTL + 双保险灰化
      │  └─ accessPII.ts                  管理员 2FA 双门 + 30s piiGrantToken + 审计
      ├─ src/shared/
      │  ├─ auditLogger.ts                写 audit_logs（只存 anonymousNo，不存真名/手机）
      │  ├─ piiGate.ts                    forceReMask + 30s 倒计时（等效小程序端）
      │  ├─ twoFA.ts                      TOTP / SMS + 5×/30min 密码锁 + SMS 5×/hour 限频
      │  ├─ cloudBridge.ts                调微信云（云环境内直连 / 境外 HTTP Webhook 桥）
      │  ├─ dashscope.ts                  封装通义千问（少样本 + 指数退避，与小程序同口径）
      │  └─ scopeGuard.ts                 fetchOwnStudentIds 三道 + 越权返回 4015
      ├─ .env.example                     DASHSCOPE_KEY / WX_CLOUD_ENV / 2FA_SMS_PROVIDER / TOTP_ISSUER
      ├─ .gitignore
      └─ tests/                           6 Tool × 边界单测（mock cloudBridge，不碰线上）
```

---

## §3 · MCP 六 Tool 契约 + server-services 数据流

### 3.1 六 Tool 契约（`src/tools/*.ts`）

| Tool 名 | 输入 arguments | 成功输出 | 失败输出 | 内置守卫 |
| --- | --- | --- | --- | --- |
| **listTasks** | `role`, `status?`, `anonymousNo?`, `page`, `size` | taskId / 标题 / 截止日 / 参与数 / 自定义图许可（**不返任何姓名**） | 4015 越权、400 参数 | scopeGuard（fetchOwnStudentIds 三道）、auditLogger |
| **submitFeedback** | `taskId`, `anonymousNo`, `imageId?`, `textResponses[]`, `elapsedSec` | feedbackId + `status:submitted` + msSec 提示文案 | msSec 失败 / 文本响应 < 1 字 | **先 msSec 再入云**；auditLogger；retry_queue 自动挂失败 |
| **aiAnalyze** | `feedbackId`（管理员可批 anonymousNo[]） | scores 5 维 0~100、warning_tags[]、summary、token_cost、latency_ms | WARN/CRIT 超 80%/95% → 阻塞 + 告警；3 次重试全失败 → 转人工 | dashscope ×3 指数退避；质量指标入 `ai_quality_metrics`；scopeGuard；auditLogger |
| **reviewFeedback** | `feedbackId`, `reviewStatus(pass/escalate/reject)?`, `confirmedScores{}?`, `teacherNote`, `reasons?` | reviewStatus 新值 + teacherReview 对象 + 变更 diff（**不含 student name**） | **若传入 confirm_3 → 直接 4015**（后端 0 trust confirm_3，强制依赖 aiAnalysis.scores） | 三道守卫 + confirm_3 丢弃/审计；只允许三态合法流转 |
| **exportResearch** | `dateStart`, `dateEnd`, `dimensions[]`, `format`(csv only) | 下载 URL（`exports-research/` 相对路径）+ `expireAt` 时间戳（7d TTL）+ 文件名仅 anonymousNo | 时间跨度 > 180d；dimensions 请求 PII 字段（name/phone/class/school） | stripPII；TTL 双保险；auditLogger 仅写 anonymousNo + 下载 token hash；过期自动灰化 toast |
| **accessPII** | `anonymousNo[]`, `reason`, `passwordHash`, `otp`, `otpMethod(sms/totp)` | 30s 窗口 `piiGrantToken` + `expireAt=now+30s` + 字段 name/phone/class | 密码×5 锁 10min；SMS×5/hour 锁；过期 token→4015；无 reason→400 | **双 2FA 门**（密码 + OTP）；piiGate 30s 计数；audit_logs 写 reason 但**只存 anonymousNo（不存真名/手机）** |

### 3.2 server-services 聊天后端调度三约定

1. **意图 → Tool 路由**：聊天后端先把 NL 意图打标签到 6 Tool，再走 MCP client `callTool(name, args)`，而不是直接把工具选择权交给模型。
2. **Session 绑定**：已有的 `userId/role/sessionId` 通过 MCP `metadata.callerRole / metadata.serverSessionId / metadata.callerUserHash` **原样透传**，scopeGuard 仅信任宿主 session，**忽略所有前端在 arguments 内传入的 role/identity 字段**。
3. **失败统一脱敏 toast**：MCP 任何返回 `code=4015/403/429` → 聊天后端统一渲染中文安全提示（「权限不足」「验证次数过多请 10 分钟后再试」等），**禁止把云函数内部错误号 / 堆栈 / DashScope 原始 429 文本外抛**。

### 3.3 三道守卫 + 2FA 服务端窗

```
callTool(name, args, meta)
  │
  ▼
auditLogger（先写 anonymousNo 级日志）─► audit_logs
  │
  ▼
scopeGuard（fetchOwnStudentIds 三道：本人班级 / 绑定列表 / 管理员白名单）
  │  └─ 越权 → 直接 4015，中断所有后续
  ▼
piiGate（仅 accessPII：校验 2FA + 开 30s 倒计时 + 出 piiGrantToken）
  │  └─ 任何非 accessPII 的 Tool：只要 output 含 name/phone → 自动 forceReMask
  ▼
tool handler（listTasks / submit / aiAnalyze / review / export / accessPII）
  │
  └─ output → auditLogger 写响应摘要（仍然只存 anonymousNo）
```

- 密码 5 次错误 → 服务端 `Map<sessionId, lockUntil>` 锁住 10 分钟；同一小时内 SMS 发送超过 5 次 → 服务端 `Map<phoneHash, hourlyCount>` 锁住至下个整点。
- `piiGrantToken` 为短 TTL JWT，服务端私钥签发，payload 仅 `sub=anonymousNo[]`，**Token 体中不携带姓名/手机**。姓名/手机仅在 30 秒窗内返回一次，客户端必须在收到后 30s 内清空 React state 对应字段（聊天后端已约定 dispatcher 在 30s 触发一次 soft reset）。

---

## §4 · UI 疗愈色板 + 三层桥接

### 4.1 八 Token（源真）

| Token 名 | 颜色值 | 应用 |
| --- | --- | --- |
| `--heal-cream-50` | `#FBF5EA` 奶油米 | 页面底色 / 卡片底 |
| `--heal-surface` | `#FFFFFF` 纸面白 | 输入框 / 弹窗内层 |
| `--heal-green-600` | `#3C765C` 森林绿 | 主按钮 / Tabbar 选中态 |
| `--heal-green-100` | `#E7F2EC` 薄荷淡 | 低风险 tag / 安全提示底色 |
| `--heal-tulle-300` | `#F5DAD4` 薄纱粉 | 鼓励按钮 / 关怀提示 |
| `--heal-dusk-500` | `#B5838D` 干玫瑰 | 次级文字 / 待办高亮 |
| `--heal-ink-900` | `#2B2A2A` 墨黑 | 正文 / 标题 |
| `--heal-muted-500` | `#8F8D8A` 暖灰 | 辅助文字 / 占位 |

- 对应 StarIsle 主仓的紫蓝星盘色不做覆盖；未来主站需要嵌入心理测评门户模块时再用 `starlisle-bridge.css` 包一层，保留双方独立性。

### 4.2 三层桥接（与 StarIsle 仅三层面统一）

1. **栅格节奏（Layer Rhythm）**：步长只允许 `4 / 8 / 12 / 16 / 20 / 24`；卡片 padding 固定 16，相邻元素 gap 用 8~12，段落间距 20，分段 24。**严禁 10/14/18/22**。
2. **圆角三级（Layer Radius）**：输入/标签 8，卡片/弹窗 12，按钮/Pill/头像 24（=full）。小程序 `border-radius` 与 React `rounded-2xl/full` 按此对齐。
3. **按钮交互（Layer Interaction）**：主按钮森林绿、次按钮白底描边、禁用态 `opacity:0.45 + cursor:not-allowed`、hover 填充 +8% 浅色、active 向下 translate 1px。三层桥接写入 `tokens/psych-healing/starlisle-bridge.css`，分别为小程序 `.btn-primary` 类与 React Tailwind `@layer components` 提供同名样式。

### 4.3 落地物（`tokens/psych-healing/` 五文件）

- `tokens.json`：Token 源真（颜色 + 间距 + 圆角 + 字号 × 疗愈/桥接两套，格式对齐 Design Token Community Group Draft spec）。
- `tokens.css`：输出 CSS Custom Properties，在 `:root` 下可用。
- `starlisle-bridge.css`：仅三层桥接；不引入色板混合。
- `tailwind.preset.js`：未来 `web-frontend/tailwind.config.js` → `presets: [require('./tokens/psych-healing/tailwind.preset')]` 即可无缝接入。
- `miniapp-app.wxss`：projects/… 下小程序 `app.wxss` 的新版本，完全走八 Token；旧 app.wxss 备份为 `app.wxss.bak-2026-09-03-star-default`（若需要回归，直接复制即可）。

---

## §5 · 角色范围 × 回滚闸门 × T0~T4

### 5.1 角色范围矩阵（× 6 Tool）

| 能力 | 学生 | 教师 | 管理员 |
| --- | --- | --- | --- |
| listTasks / submitFeedback | 仅自己 | 可布置自己班级 | 全局 |
| 查看 AI scores + warning_tags | ❌ 不可见 | ✅ 自己班级 | ✅ 全局 |
| reviewFeedback（教师审核 + 打标） | — | ✅ 自己班级 | ✅ 只读审计（不可覆盖他人 score） |
| exportResearch（匿名 CSV 7d） | — | ✅ 自己班级 | ✅ 全局 |
| **accessPII 真名/手机/班级** | — | ❌ 严禁 | 🚨 双 2FA + 30s 窗 |
| audit_logs 可读 | — | — | ✅ 查自己操作（只存 anonymousNo） |

### 5.2 回滚闸门（三级）

1. **合入 main 前（最轻）**：直接删除远端分支 `feat/import-psych-assessment-miniapp`，不留任何痕迹。
2. **合入 main 后（一次 revert）**：因为四棵目录（`projects/psych-assessment-miniapp / docs/psych-assessment / tokens/psych-healing / server-services/mcp-psych-assessment`）全部是**纯新增**，`git revert <merge-commit>` 会干净删除，不存在 3-way 冲突。
3. **运行时紧急回退（MCP 503 开关）**：聊天后端 dispatcher 已预埋开关，关闭后所有 `callTool → 'mcp-psych-assessment'/*` 一律返回「系统升级维护」并停止调用，无需重启站点；同时 Chat 侧 UI 隐藏"心理测评"相关入口（通过 `config.features.psych_assessment` = false）。

### 5.3 里程碑 T0 ~ T4（总工期 3~5 天）

| # | 名称 | 工期 | 阻塞条件（*未满足前不 commit*） |
| --- | --- | --- | --- |
| **T0** | 分支准备：切 `feat/import-psych-assessment-miniapp` → 空提交 → push → 开 Draft PR | 30 min | GitHub 远端分支 + Draft PR 两链接均返回 200 |
| **T1** | 导入：projects/… 全量 + docs/psych-assessment/ 6 份镜像 + README.psych-assessment.md | 1.5 天 | 本地再跑 `acceptance_check.py` **仍 37/37 PASS** |
| **T2** | UI：tokens/psych-healing/ 五文件 + 小程序 app.wxss 重写 + 三桥接样式应用 TabBar/主按钮/表单 | 1 天 | 小程序 34 条用例前 10 条（学生端）在微信开发者工具桌面回放 PASS |
| **T3** | MCP：6 Tool + 6 Shared Guard + mock 单测 6×边界 100% PASS | 2 天 | `.env.example` 仅占位、不出现真 Key；`auditLogger` 输出不包含 name/phone |
| **T4** | PR Ready：关 Draft → PR Body 贴 ④ 份证据 → 等你 Approve → 合并 main | 30 min | GitHub Review = Approved（非 Changes requested）才允许 merge |

---

## §6 · 验收标准（共 20 条，* 为硬红线 fail = 整体 fail）

### 6.1 导入层（T1 完跑即可验证）

*1. StarIsle 主仓新增目录 `projects/psych-assessment-miniapp/`，内含 `app.json / app.js / app.wxss / pages/ / cloudfunctions/ / utils/ / scripts/ / acceptance_check.py` 共 28+ 个源文件，且 `git diff main...feat-branch --stat` 显示对现有文件的修改数 = **0**。*
*2. StarIsle 主仓根目录下，未出现覆盖式文件变动：`README.md`、`docs/README.md`、根级 `.gitignore` 内容 SHA1 与 main 相比**完全一致**。*
3. `docs/psych-assessment/` 六份文件存在且大小非零；`acceptance-report-37-pass.md` 含 "37/37 PASS" 与时间戳。
4. `acceptance_check.py` 在 main 分支下的 `projects/psych-assessment-miniapp/` 目录内重跑（python 3.10+）仍输出 `Overall: 100% PASS`。

### 6.2 UI 层（T2 完跑即可验证）

5. `tokens/psych-healing/tokens.json` 八色令牌全部正确（值与 §4.1 表一致，不出现 `#4B3FE3` 品牌紫或星盘蓝混入）。
6. `starlisle-bridge.css` 仅包含三类 CSS：① 步长工具类（`gap-4/gap-8/…`、`p-4/p-16/…`）② 圆角工具类（`rounded-8/12/24`）③ 按钮 `.btn-primary/.btn-secondary/.btn-disabled` 交互类；**不包含任何卡片/页面布局样式**。
7. `miniapp-app.wxss` 所有颜色取值均通过 `var(--heal-*)`，不出现硬编码色值（可 grep 检测）。
8. 小程序主按钮（森林绿 `#3C765C`）禁用态实际 `opacity ≤ 0.45`（开发者工具 inspect 验证）。
9. `tailwind.preset.js` 通过 `presets: [require('./tokens/psych-healing/tailwind.preset')]` 引用后，`bg-heal-cream-50 text-heal-green-600 rounded-2xl` 三类工具类均生效。

### 6.3 MCP 层（T3 完跑即可验证）

10. `src/tools` 六个文件存在且函数名分别为 `listTasks / submitFeedback / aiAnalyze / reviewFeedback / exportResearch / accessPII`，handler 签名统一 `(args, meta) => Promise<{content, isError?}>`。
11. `scopeGuard` 被 `callTool` 包装层调用 6/6 次（单测 spy count 断言）；越权输入返回错误码 `4015`，不返回任何任务 ID 或 feedback 字段。
12. `submitFeedback` 调用 msSec **先于** DashScope / 云数据库调用；若 msSec 返回违规 → handler 立即返回 `status:ms_sec_blocked`，**dashscope 调用次数 = 0**（单测 mock 计数）。
13. `reviewFeedback` 当 arguments 出现 `confirm_3` 字段时：① 不影响任何数据库写入 ② 返回 `4015 + confirm_3_discarded` ③ `auditLogger` 写入 `confirm_3_discard=true`（后端 0 trust confirm_3）。
14. `exportResearch` 当 dimensions 含 "name/phone/class/school" 任一 PII 字段时：① 返回 `403 + pii_forbidden` ② 不生成任何本地/云存储文件。
15. `accessPII` 连续 5 次 passwordHash 错误 → 第 6 次返回 `429 + password_locked_10min`，即使第 6 次密码正确也拒绝；同一小时内 SMS 发送 > 5 次 → 第 6 次返回 `429 + sms_rate_limited`。
16. `accessPII` 成功返回的 payload 中包含 `expireAt=now+30s` 且时间戳误差 ≤±1s（单测 mock Date 验证）。
17. `piiGate.forceReMask` 对 6 个 Tool 中除 accessPII 外的 5 个 output 做扫描：若出现 `name/phone` 字段 → 自动置空或 anonymizedNo 替换；**单测构造 5 个带 name 的假 output**，调用后返回体不含任何 PII。
18. `auditLogger` 所有 output 中字段名不包含 `name/phone/password/pwd/totp/sms_code/otp` 等敏感字段（白名单之外），grep 所有 tests/ 覆盖率 ≥ 6/6。
19. `.env.example` 文件仅包含占位（`YOUR_DASHSCOPE_KEY`、`WX_CLOUD_ENV`、`2FA_SMS_PROVIDER`、`TOTP_ISSUER` 等），不出现真实密钥、真实手机号、真实 passwordHash。
20. `package.json` 的 `dependencies` 中：`@modelcontextprotocol/sdk`、`crypto-js`（用于 scopeGuard anonymousNo 哈希）、`qrcode`（TOTP 二维码生成，若需要）三者齐全；`devDependencies` 含 `vitest/jest + typescript`。

### 6.4 整体流程验收

*21. 合并 main 前的 GitHub Draft PR 中，PR Body 完整包含 4 份证据：导入目录清单 / Token 表 / 6 Tool 对照表 / 37 项验收截图链接；PR 状态为 *Ready for Review* 且 Review = *Approved* 后才允许合并。*

---

## §7 · 附件索引

| 名称 | 相对路径（StarIsle 主仓合入后） | 说明 |
| --- | --- | --- |
| 原小程序设计规范 v1.3 | `docs/psych-assessment/design.md` | 10 项需求 / 15 集合 / 8 云函数 |
| 37 项源码合规验收脚本 | `projects/psych-assessment-miniapp/acceptance_check.py` | Windows 2026-09-04 11.77s PASS |
| 34 条三端真机用例 | `docs/psych-assessment/test-cases-34.md` | S11·T10·A10·P3 = 34 |
| 导入后自检 8 项清单 | `docs/psych-assessment/import-checklist.md` | 导入后立即核对用 |
| T0 分支链接（未来真实 PR） | N/A | 将在 writing-plans 生成实施计划后附在 plan.md 顶部 |

---

## §8 · 版本记录

| 版本 | 日期 | 变更 | 审批 |
| --- | --- | --- | --- |
| v1.0 | 2026-09-04 | 初版：§1~§6 基于 Brainstorm B1~B6c 六节用户审批通过 | 待用户最终复审（B7d）→ writing-plans（B8） |
