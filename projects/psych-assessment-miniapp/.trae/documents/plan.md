# StarIsle · 心理测评导入与 MCP 接入 实施计划（镜像交付版 · 可追溯 HOTL 工作流）

> **原文源**：`docs/superpowers/plans/2026-09-04-starisle-psych-implementation-plan.md`
> **设计规范**：`docs/superpowers/specs/2026-09-04-starisle-psych-imp-design.md` v1.0（2026-09-04 用户审批通过 §1~§5 + spec 最终复审通过）
> **HOTL Workflow**：`docs/plans/2026-09-04-starisle-psych-imp-workflow.md`（Step T0~T4 + 回滚 R）
> **导入基线**：源项目 `g:\mental health`（心理测评反馈微信小程序，37 项源码合规 acceptance_check.py = 37/37 PASS，执行 11.77s）
> **目标仓库**：`https://github.com/user-unknowed/-StarIsle-` （默认分支 main，当前角色 = admin）
> **本文档为镜像交付**：位于 `.trae/documents/plan.md`（系统目标要求交付路径）。后续续作 / 中断恢复 / HOTL loop-execution 直接从此文件读起，可独立做「文件路径 → 阻塞条件 → Step 命令」三要素追溯。

---

## 0. 三大用户决策（不可变，除非改 Spec）

| # | 决策点 | 选项 | 说明 |
|---|---|---|---|
| 1 | 导入粒度（B2） | **A · projects/psych-assessment-miniapp 隔离目录** | 不合并 student-app/teacher-app / backend-java / parent-app 任何现有代码 |
| 2 | UI 统一（B3） | **方案 ② · 疗愈独立色板 + 三层桥接** | 奶油米 + 森林绿 + 薄纱粉；仅栅格/圆角/按钮交互与 StarIsle 对齐；不引入星盘色 |
| 3 | 技能宿主（B4） | **方案 3 · MCP Server 接入 server-services 聊天后端** | 6 Tool：listTasks / submitFeedback / aiAnalyze / reviewFeedback / exportResearch / accessPII |
| 4 | 合并总深度（B5） | **B · 完整闭环（工期 3~5 天，推荐）** | 含导入 / UI / MCP / Draft PR → Approved → Merge；四目录纯新增、主仓零修改 |

---

## 1. 总里程碑 T0 ~ T4（与 HOTL Workflow Step T 对齐）

| 代号 | 名称 | 工期 | 可恢复入口（本 Plan 的 Task 锚点） | 人工 Gate |
|---|---|---|---|---|
| T0 | 分支准备 · Draft PR | 30 min | Task 0 in plan.md | ✅ human |
| T1 | 导入 projects/ + docs/psych-assessment/ | 1.5 天 | Task 1 in plan.md | ✅ human |
| T2 | UI tokens/ + miniapp wxss + 三层桥接 | 1 天 | Task 2 in plan.md | ✅ human |
| T3 | server-services/mcp-psych-assessment 六 Tool + 六 Guard + mock 单测 | 2 天 | Task 3 in plan.md | ✅ human |
| T4 | PR Ready → Approved → Squash Merge main | 30 min | Task 4 in plan.md | ✅ human |
| R  | 回滚闸门三档 | < 5 min | Task R in plan.md | auto（任何阶段触发） |

---

## 2. 修改资产映射（Create ≈ 55 个文件，Modify = 0 = 硬红线）

| 资产类型 | 新增路径 | 计 | 说明 |
|---|---|---|---|
| miniapp 源码镜像 | `projects/psych-assessment-miniapp/**` | 28+ | 来源 `g:\mental health` 全量（除 docs/.trae/.hotl/.superpowers） |
| 小程序端说明 + 忽略 | `projects/psych-assessment-miniapp/README.psych-assessment.md` · `.gitignore` | 2 | 主仓优先保留：永远不覆盖根 README/根 .gitignore |
| docs 镜像 4 + 报告 + 清单 | `docs/psych-assessment/{design,implementation-plan,test-cases-34,project-overview}.md` · `acceptance-report-37-pass.md` · `import-checklist.md` | 6 | 交付物镜像冻结 |
| UI Token 源真 + 桥接 | `tokens/psych-healing/{tokens.json, tokens.css, starisle-bridge.css, tailwind.preset.js, miniapp-app.wxss}` | 5 | 八色 + 间距/圆角/字号 DTCG；小程序端 app.wxss 备份到 .bak-2026-09-03-star-default |
| MCP 元文件 | `server-services/mcp-psych-assessment/{package.json, tsconfig.json, README.md, .env.example, .gitignore}` | 5 | .env.example 全占位，无真 key / 无真手机号 / 无真 passwordHash |
| MCP shared 守卫 | `server-services/mcp-psych-assessment/src/shared/{auditLogger, scopeGuard, piiGate, twoFA, cloudBridge, dashscope}.ts` | 6 | auditLogger 只存 anonymousNo；twoFA 密码 5×/10min + SMS 5×/hour；dashscope 3 次 5/10/20s ±25% 退避 + 80/95% 双档预算 |
| MCP 6 Tool | `server-services/mcp-psych-assessment/src/tools/{listTasks, submitFeedback, aiAnalyze, reviewFeedback, exportResearch, accessPII}.ts` | 6 | submitFeedback 必须 msSecCheck 先于 DashScope；reviewFeedback 0 trust confirm_3；exportResearch 禁 PII 维度；accessPII 双 2FA 30s Grant |
| MCP bootstrap | `server-services/mcp-psych-assessment/src/index.ts` | 1 | MCP SDK 0.6；middleware 顺序 audit → scope → piiGate.forceReMask → dispatch → audit；只信 metadata.callerRole，不信任 args.role |
| MCP 6×边界单测 | `server-services/mcp-psych-assessment/tests/{t1…t6}.test.ts` | 6 | scope 越权=4015；msSec 违规→dashscope call 计数 0；budget 81%→WARN；confirm_3→4015+audit flag；PII dim→403+0 files；密码 6th=429 lock10m |
| **合计** | — | **≈ 55** | **Modify = 0（严格，若 diff --stat 出现 M，立刻 git checkout main -- <path> 还原主仓版本）** |

---

## 3. 21 条验收断言速查（Spec §6）

执行顺序：T1 完 → #1~4；T2 完 → #5~9；T3 完 → #10~20；T4 完 → #21。全部 PASS 才算整体交付。

| # | 断言 | 归属任务 | 快速命令 | 预期 |
|---|---|---|---|---|
| *1 | feat 分支相对于 main：**0 M 行**（纯新增） | T1 | `git diff main...feat --name-status \| grep '^M' \| wc -l` | 0 |
| *2 | StarIsle 根 README.md / .gitignore / docs/README.md SHA 合前合后 **一致** | T1 | 对比 `git hash-object README.md` | main 与 feat 端两 hash 相同 |
| 3  | docs/psych-assessment 六文件存在且 size > 0 | T1 | `ls -la docs/psych-assessment/ \| wc -l` ≥ 8（含 . / ..）| Y |
| 4  | acceptance_check.py 重跑仍 Overall: 100% PASS | T1 / T4 | `cd projects/psych-assessment-miniapp && python acceptance_check.py` | Overall 100% |
| 5  | tokens.json 八色 HEX 与 Spec §4.1 表一致 | T2 | `jq -r '.color[][]?.$value' tokens/psych-healing/tokens.json` | 8 色顺序匹配 |
| 6  | starisle-bridge.css 仅包含 gap/p/m classes + rounded 三档 + btn-primary/secondary/disabled 三态，不含 card 布局样式 | T2 | `wc -l tokens/psych-healing/starlisle-bridge.css` 且 grep -c 'card-\|grid-cols' = 0 | 0 命中 |
| 7  | miniapp-app.wxss 无硬编码色值（全部通过八色 HEX 常量展开，WXSS 直接用值但不准出现 #4B3FE3 / #3C765C 之外的星盘色）| T2 | grep '#4B3FE3\|#22A5F7\|#6054F1' = 0 | 0 |
| 8  | 主按钮禁用态 opacity ≤ 0.45 | T2 | 微信开发者工具 Computed opacity | 0.45 或 0.4 |
| 9  | tailwind.preset.js 可 `require()`，执行 `preset.theme.extend.colors.heal.green[600] === '#3C765C'` | T2 | node -e "..." | true |
| 10 | 6 Tool 签名统一 `(args, meta) => Promise<{content, isError?}>`，且 handler 文件数 = 6 | T3 | `ls server-services/mcp-psych-assessment/src/tools \| wc -l` | 6 |
| 11 | scopeGuard mock 对越权 anonymousNo 返回 code 4015 | T3 | `npm test -- t1` | PASS |
| 12 | submitFeedback msSec 违规返回 ms_sec_blocked 且 DashScope call count === 0 | T3 | `npm test -- t2` | PASS |
| 13 | reviewFeedback 传 confirm_3 → code 4015 + audit.extras.confirm_3_present = true | T3 | `npm test -- t4` | PASS |
| 14 | exportResearch dimension='phone' → 403 pii_forbidden 且导出目录文件数 0 | T3 | `npm test -- t5` | PASS |
| 15 | accessPII 密码 5 次错误 → 第 6 次 429 password_locked_10min；SMS 5 次/小时 → 第 6 次 429 sms_rate_limited | T3 | `npm test -- t6` | PASS |
| 16 | accessPII 成功返 expireAt = now + 30s，mock Date 误差 ≤ 1s | T3 | 在 tests 加 mock date 断言（可在 t6 中扩展）| ≤ 1s |
| 17 | piiGate.forceReMask 对 5 个非 accessPII Tool 输出自动置空 name/phone 字段 | T3 | 手工调用各 handler 5 次 → 检查输出 JSON | 0 字段泄漏 |
| 18 | auditLogger stdout JSON 输出行不包含 name/phone/password/otp/sms_code | T3 | `npm test 2>&1 \| grep -E '"type":"psych_mcp_audit"' \| grep -iE 'name|phone|password|otp|sms_code' \| wc -l` | 0 |
| 19 | .env.example 仅占位 YOUR_*，不包含 sk- / 手机号 / bcrypt hash / AKIA… | T3 | grep 正则（T3 Step 3.6.2）| GREP_OK_NO_SECRETS |
| 20 | package.json deps 包含 `@modelcontextprotocol/sdk` + `crypto-js` + `qrcode` + `jsonwebtoken` + `otplib`，devDeps 含 `typescript` + `vitest` | T3 | cat package.json | 全部存在 |
| *21 | PR Ready for Review → GitHub Review Decision = APPROVED → Squash Merge main 成功 | T4 | `gh pr view <N> --json reviewDecision,state` + `gh pr merge --squash` exit=0 | APPROVED & merged |

> `*` = 硬红线（Spec §6 标星），任一失败 = 整体 FAIL。

---

## 4. 中断续作入口（BRAINSHOT T0~T4 精确落点）

若会话 / 工作流中断，接手工程师按以下两行命令即可从上次完成的里程碑精确恢复，无需翻聊天记录：

| 上次完成里程碑 | 续作入口命令 | 关键检查文件 |
|---|---|---|
| 未开始 / Spec 刚通过 | `cd D:\starisle && git checkout main && git pull && git checkout -b feat/import-psych-assessment-miniapp` 然后跳到本镜像 **Task 0 Step 0.2** | `docs/superpowers/plans/2026-09-04-starisle-psych-implementation-plan.md` Task 0 |
| T0 完成（feat 分支 + Draft PR 已存在）| 跳到 **Task 1 Step 1.1**（拷贝源项目）| PR URL 写在 `.hotl/hotl_context_last_execution.json` 的 `pr_url` |
| T1 完成（projects/ + docs/ 入库 + 37/37 重跑通过）| 跳到 **Task 2 Step 2.1**（tokens.json 五文件） | `git log --oneline -1` 应包含 `feat(psych): import miniapp projects/ + docs mirror (T1)` |
| T2 完成（UI 五文件 + app.wxss 重写 + S1~S10 桌面 PASS）| 跳到 **Task 3 Step 3.1.1**（package.json） | `git log --oneline -1` 含 `feat(ui): healing tokens — T2 done` |
| T3 完成（MCP 6 Tool + vitest 6/6 PASS + grep 0 密钥）| 跳到 **Task 4 Step 4.1**（PR Body 编辑） | `git log --oneline -1` 含 `feat(mcp): psych 6 tools — T3 done` |
| T4 完成（已合入 main + acceptance 仍 PASS）| 交付结束。开始手动部署清单（见下 §5） | acceptance 末行 Overall 100% PASS |

---

## 5. 手动部署两步（最终上线前必须执行，不可自动化）

> 与本轮 Spec / Plan 解耦：两步都要在部署端手工填真凭据，禁止入仓。本镜像文档不包含任何真 Key。

### 5.1 小程序端初始化（对应 projects/psych-assessment-miniapp/README.md §1）

1. 微信开发者工具打开 `projects/psych-assessment-miniapp/`，在 **project.private.config.json** 填：
   - `appid` = 你的小程序 AppID（严禁入仓，本文件已 .gitignore）
   - `cloudenv.default.envID` = 你的 CloudBase 环境 ID
2. 逐个上传 8 个云函数并 `npm install`：login、classOperate、imageOperate、taskOperate、feedbackSubmit、aiAnalyze、cacheClear、statusOperate（含 crisis 新增）—— 每个云函数上传前确保其 package.json 已安装依赖。
3. 运行系统图片初始化脚本：`node projects/psych-assessment-miniapp/scripts/seed-images.js`（会把罗夏 10 张 + TAT 6 张 JSON 清单落到云存储 system-images/）。
4. 按 `projects/psych-assessment-miniapp/scripts/create-admin-user.md`，在云开发控制台 users 集合手工写一条 `{role:'admin', anonymousNo:'ADMIN-ROOT-0001', adminInfo:{ password_hash:'…', mfaPhone:'+86 你的手机号', role:'super_root', createdAt: now }}`，**password_hash 计算公式与 MCP twoFA.ts 中 `PII_ADMIN_PASSWORD_PEPPER + 密码` SHA256 保持一致（见 twoFA.ts bcryptishVerify 注释）**。
5. 真机 34 条用例复跑（安卓基准 / iOS ≥ 4 / 鸿蒙 ≥ 4），参考 `docs/psych-assessment/test-cases-34.md`。

### 5.2 MCP 接入 server-services 聊天后端（对应 mcp README）

1. `cd server-services/mcp-psych-assessment && cp .env.example .env.local`，填入真键：
   - `DASHSCOPE_KEY` = 通义千问 API Key（建议用量限额每日 ≤ 2M tokens）
   - `WX_CLOUD_MODE` = `webhook` 最安全；HTTP Webhook Secret 两端一致
   - `2FA_SMS_PROVIDER` = aliyun / tencent；如果上线前想只靠 TOTP 先跑，填 `none` 并把 `PII_ADMIN_TOTP_SECRET` 用 `otplib` 生成一次给管理员扫码
   - `PII_ADMIN_PASSWORD_PEPPER`（≥ 32 字节随机）+ `PII_ADMIN_PASSWORD_HASH`（SHA256(pepper + 真实管理员密码) 的 hex）
   - `PII_JWT_SECRET`（≥ 32 字节随机，用于 30s piiGrantToken 签发）
   - 如果选 `PII_ADMIN_SMS_CODE` 离线模式（仅测试环境）填一个 6 位数字，生产必须清空；生产 SMS Provider callback 校验应接入真实短信模板回传
2. 聊天后端 dispatcher 集成：在 server-services 的 `chat-dispatch.ts`（或同等文件）里：
   - 通过 MCP Client stdio spawn 方式拉起本 MCP：`spawn("node", ["dist/index.js"], { cwd: "server-services/mcp-psych-assessment", env: { ...process.env, ...loadEnv('.env.local') } })`
   - `metadata = { callerRole: session.role, serverSessionId: session.id, callerUserHash: sha256(session.userId + session.serverIdSalt) }` → 每个 `callTool(name, args, metadata)` 都要传；**绝不从用户 arguments 取 role**。
   - features 开关：`config.features.psych_assessment`（默认 true）；false 时所有工具请求都返回 503「系统升级维护」并隐藏 Chat UI 中的快捷入口。
   - 30s 软清零：`accessPII` 成功后设置一个 30s `setTimeout` 把 Chat React state 中的 `lastPIIResponse` 置空 + 触发 Toast「PII 查看窗口已关闭」。
3. 重启 server-services，做一次真实 E2E：管理员用 Chat 输入「请申请查看 S001 匿名学生的真实姓名与手机号用于危机干预」→ dispatcher 路由到 accessPII → 管理员输入密码 + TOTP/SMS → 客户端拿到 piiGrantToken → 30s 后自动被清空 → 同时 stdout audit_logs 行包含「status: ok / anonymousNos: ['S001']」但**不包含真姓名/手机**。

---

## 6. Plan 文件索引表（全局唯一定位）

| 内容 | 绝对路径（本地） | 用途 |
|---|---|---|
| Spec v1.0（用户最终复审） | [2026-09-04-starisle-psych-imp-design.md](file:///g:/mental%20health/docs/superpowers/specs/2026-09-04-starisle-psych-imp-design.md) | 设计基线 · 不覆盖 §1~§8 即视为对 Spec 的 Deviation 需改 Spec |
| Plan 主文件（本 Plan 的源真） | [2026-09-04-starisle-psych-implementation-plan.md](file:///g:/mental%20health/docs/superpowers/plans/2026-09-04-starisle-psych-implementation-plan.md) | 含全部 Step 代码块 & 命令粘贴 |
| HOTL 工作流（带 Gate） | [2026-09-04-starisle-psych-imp-workflow.md](file:///g:/mental%20health/docs/plans/2026-09-04-starisle-psych-imp-workflow.md) | HOTL loop-execution 消费；每个 T 尾带有 human gate checkpoint |
| **本镜像 plan.md（Trae 默认消费）** | [plan.md](file:///g:/mental%20health/.trae/documents/plan.md) | 中断恢复 / 续作入口；与 HOTL Step 一一对应 |

---

## 7. 10/10 功能 F1~F10 速查表（镜像交付）

| 编号 | 功能模块 | 对应角色 | 关键落点 |
|---|---|---|---|
| F1 | 学生端任务大厅与测评提交 | student | pages/student/task-hall + feedbackSubmit 云函数 |
| F2 | 学生端历史记录与个人资料 | student | pages/student/{my-records,profile} |
| F3 | 教师端仪表板 | teacher | pages/teacher/dashboard + statusOperate |
| F4 | 教师端任务管理 | teacher | pages/teacher/{dashboard,img-library} |
| F5 | 教师端 AI 审核 | teacher | pages/teacher/ai-review + aiAnalyze 云函数 |
| F6 | 教师端班级/图片库/状态打标 | teacher | class-manage / img-library / status-tag |
| F7 | 管理员端运营总览 | admin | pages/admin/ops-overview |
| F8 | 管理员端全局科研导出 | admin | pages/admin/global-export + cacheClear 7d TTL |
| F9 | 管理员端人员危机干预（PII 双 2FA） | admin | pages/admin/people-crisis + crisis 云函数 |
| F10 | 管理员端 AI 质量审计 | admin | pages/admin/audit-ai + ai_quality_metrics |

> 10/10 功能模块均已镜像交付，源码位于 `projects/psych-assessment-miniapp/`，设计 Token 位于 `tokens/psych-healing/`，MCP 接入位于 `server-services/mcp-psych-assessment/`。

---

> **最后备注**：本镜像 plan.md 与源 spec / workflow / plan 四份文件，任何日期、Token 色值、Tool 名、错误码、验收断言号都**必须完全一致**。若你在 Spec 基础上做了一次 Design Change → 先改 Spec → 再重新生成以上 3 份下游文件（源计划 / workflow / 本镜像）并整体更新，避免出现「Spec 改了色值，但 tokens.json 仍用旧 HEX」的不一致性交付事故。
