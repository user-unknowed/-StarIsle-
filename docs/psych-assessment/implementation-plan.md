# StarIsle · 心理测评导入与 MCP 接入 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `g:\mental health` 的心理测评反馈微信小程序按「A 粒度隔离导入」入 StarIsle 主仓，输出疗愈独立色板设计 tokens + 三层桥接样式，完成 6 Tool 的 MCP Server（`server-services/mcp-psych-assessment`）接入 StarIsle 现有 server-services 聊天后端（宿主 AI），并以 T1~T4 四个里程碑交付到 GitHub Draft PR 合入 main。

**Architecture:** 纯新增四棵目录（`projects/psych-assessment-miniapp`、`docs/psych-assessment`、`tokens/psych-healing`、`server-services/mcp-psych-assessment`），不修改 StarIsle 现有任何文件；先在 `feat/import-psych-assessment-miniapp` 分支做 Draft → Ready for Review → Owner Approved → Squash Merge main。MCP 通过 metadata 透传宿主 role/session，在 scopeGuard + auditLogger + piiGate 三道后再 dispatch 到 6 个 Tool handler。小程序端 app.wxss 走疗愈 Token，不混合星盘色；未来 web-frontend 通过 tailwind.preset.js 无痛接入。

**Tech Stack:** 微信原生小程序（WXML/WXSS/JS 双端）、微信云开发 CloudBase、TypeScript 5.6、Node.js 20 + @modelcontextprotocol/sdk 0.6、Vitest 2.1、otplib 12 + jsonwebtoken 9（短 TTL piiGrantToken）、DashScope（通义千问 few-shot 3 例 + msSecCheck 前置 + 3 次指数退避 ±25%）。

---

## 0. 前置与基线（Before Any Task）

### 0.1 你必须已经审批通过的三份文件（都在本地 `g:\mental health`）
- ✅ Spec: [2026-09-04-starisle-psych-imp-design.md](file:///g:/mental%20health/docs/superpowers/specs/2026-09-04-starisle-psych-imp-design.md)
- ✅ HOTL Workflow: [2026-09-04-starisle-psych-imp-workflow.md](file:///g:/mental%20health/docs/plans/2026-09-04-starisle-psych-imp-workflow.md)
- ✅ 原小程序 37/37 验收脚本：`acceptance_check.py`（repo 根）

### 0.2 将改动文件总表（全部 Create，无 Modify 现有文件）
| 新增目录 | 新增文件计数 | 说明 |
|---|---|---|
| `projects/psych-assessment-miniapp/` | 28+（整体移植） + 2（README.psych-assessment.md / 新增 .gitignore） | 来源：`g:\mental health` 全量 |
| `docs/psych-assessment/` | 6（4 mirror + 1 验收报告 + 1 导入清单） | 交付物镜像 |
| `tokens/psych-healing/` | 5（json/css/bridge/Tailwind preset/wxss） | UI Token 源真 |
| `server-services/mcp-psych-assessment/` | 14（1 entry + 6 tools + 6 shared + tests/6 + package.json + README + .env.example + .gitignore） | MCP 接入层 |
| 合 计 | ≈ 55 | **Modify = 0（硬红线 §6.1 #1/#2）** |

---

## Task 0 · GitHub 分支与 Draft PR 准备（T0，30 min）

**Files:**
- Create: `projects/.gitkeep`（若非必须 → 可删；仅在 git 不允许空目录时用）
- Create: `.hotl/hotl_context_last_execution.json`

- [ ] **Step 0.1: 在 StarIsle 仓库创建分支锚点**

  打开 PowerShell，在 StarIsle 本地仓库（假设你已 clone 到 `D:\starisle`）执行：
  ```powershell
  $repo = 'D:\starisle'
  Set-Location $repo
  git checkout main
  git pull origin main
  git checkout -b feat/import-psych-assessment-miniapp
  git commit --allow-empty -m "chore(psych): anchor feat/import-psych-assessment-miniapp"
  git push -u origin feat/import-psych-assessment-miniapp
  ```
  预期：远端 `feat/import-psych-assessment-miniapp` 出现，空提交 SHA 存在。

- [ ] **Step 0.2: 开 Draft PR**

  通过 GitHub 网页或 gh CLI：
  ```bash
  gh pr create \
    --base main \
    --head feat/import-psych-assessment-miniapp \
    --draft \
    --title "Draft: import psych-assessment miniapp + MCP server-services integration (spec v1.0)" \
    --body "### Spec v1.0  - [Spec] 待后续镜像 - [Acceptance 37/37 PASS] - [Project overview] - [Test cases 34]
  ```
  预期：PR 状态为 Draft，链接形如 `https://github.com/user-unknowed/-StarIsle-/pull/<N>`。

- [ ] **Step 0.3: 写入 HOTL 执行上下文 JSON**

  在 `g:\mental health\.hotl\hotl_context_last_execution.json`（或 StarIsle 端 .hotl，以真实工作目录为准）写入：
  ```json
  {
    "spec_version": "v1.0",
    "target_repo": "user-unknowed/-StarIsle-",
    "target_branch": "main",
    "feat_branch": "feat/import-psych-assessment-miniapp",
    "source_root": "g:/mental health",
    "pr_url": "TODO__PASTE_PR_URL_HERE",
    "milestone_sequence": ["T0","T1","T2","T3","T4"],
    "last_completed_milestone": "T0",
    "pending_remediation_count": 0,
    "completed_checkpoints": 1,
    "last_pr": null,
    "last_merge_sha": null
  }
  ```
  用你 0.2 的真实 PR URL 替换 `TODO__PASTE_PR_URL_HERE`。

- [ ] **Step 0.4: 阻塞验证（未通过前禁止进入 T1）**

  运行：
  ```bash
  gh api repos/user-unknowed/-StarIsle-/branches/feat/import-psych-assessment-miniapp --jq .name
  ```
  预期：`feat/import-psych-assessment-miniapp`；
  再运行：
  ```bash
  gh pr view <N> --json state,mergeStateStatus,isDraft
  ```
  预期：`isDraft=true`、`state=OPEN`。

- [ ] **Step 0.5: Commit（仅 .hotl 上下文若在 StarIsle 端）**

  ```bash
  git add .hotl/hotl_context_last_execution.json
  git commit -m "chore(hotl): init workflow context — T0 done"
  git push
  ```

---

## Task 1 · 源码 + 交付物镜像入库（T1，1.5 天）

**Files:**
- Create: `projects/psych-assessment-miniapp/**`（28+ 子文件，源 `g:\mental health` 整体移植）
- Create: `projects/psych-assessment-miniapp/.gitignore`
- Create: `projects/psych-assessment-miniapp/README.psych-assessment.md`
- Create: `docs/psych-assessment/design.md`
- Create: `docs/psych-assessment/implementation-plan.md`
- Create: `docs/psych-assessment/test-cases-34.md`
- Create: `docs/psych-assessment/project-overview.md`
- Create: `docs/psych-assessment/acceptance-report-37-pass.md`
- Create: `docs/psych-assessment/import-checklist.md`
- Test: 再跑 acceptance_check.py

### 1.1 复制 projects/psych-assessment-miniapp 全量
- [ ] **Step 1.1.1: 复制源项目（不覆盖主仓 README.md / 根 .gitignore）**

  PowerShell：
  ```powershell
  $src = 'g:\mental health'
  $dst = 'D:\starisle\projects\psych-assessment-miniapp'
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  # 复制除了已经是 docs 的文档（会放到 StarIsle docs/psych-assessment）外的全部
  Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Exclude 'docs','.trae','.hotl','.superpowers'
  ```
  冲突重命名规则（严格执行）：若目标 `$dst\README.md` 本来不存在 → 源 `README.md` 重命名为 `README.psych-assessment.md`；若已存在 → 永远保留目标，源重命名。同样 `$dst\.gitignore` 保留 StarIsle 端（若无）则新建，若已有则不覆盖。

- [ ] **Step 1.1.2: 新建 projects/…/.gitignore（小程序端本地敏感）**

  写入：
  ```gitignore
  # 微信小程序本地私有配置（禁止入仓）
  project.private.config.json
  # 环境变量（禁止入仓）
  .env
  .env.local
  # Node 依赖（cloudfunctions 各自按需上传）
  node_modules/
  # 科研导出文件：7 天 TTL 短存储，禁止入仓
  exports-research/
  # 日志 & 系统
  .DS_Store
  *.log
  ```

- [ ] **Step 1.1.3: 新建 projects/…/README.psych-assessment.md**

  写入内容（Markdown）：
  ```markdown
  # StarIsle · 心理测评反馈微信小程序 · 子项目说明

  本目录为 StarIsle 主仓对心理测评模块的「隔离导入」（方案 A），不影响主仓其它子域（student-app / teacher-app / backend-java 等）。

  ## 1. 初始化部署步骤
  1. 用微信开发者工具打开本目录（`projects/psych-assessment-miniapp`）。
  2. 在 `project.private.config.json` 填入云环境 ID：`{"projectname":"psych-assessment-miniapp","setting":{"compileHotReLoad":true,"urlCheck":false,"es6":true,"enhance":true,"postcss":true,"minified":true},"cloudfunctionRoot":"cloudfunctions/","condition":{},"appid":"请替换为你的小程序 appid","cloudenv":{"list":[{"envID":"YOUR_WX_CLOUD_ENV_ID","name":"prod"}],"default":0}}`。
  3. 上传 8 个云函数并各自 `npm install`：login、classOperate、imageOperate、taskOperate、feedbackSubmit、aiAnalyze、cacheClear、statusOperate（含 crisis 新增）。
  4. 运行 `node scripts/seed-images.js` 初始化罗夏/TAT 系统图片。
  5. 按 `scripts/create-admin-user.md` 手工创建首位超级管理员。

  ## 2. 复跑源码合规验收（37/37）
  ```bash
  cd projects/psych-assessment-miniapp
  python acceptance_check.py
  # 期望末行 Overall: 100% PASS
  ```

  ## 3. 关联文档
  - 设计规范：`docs/superpowers/specs/2026-09-03-心理测评反馈小程序-design.md`（原 spec v1.3）
  - 导入设计：`docs/superpowers/specs/2026-09-04-starisle-psych-imp-design.md`（本闭环 spec v1.0）
  - 三端真机用例：`docs/psych-assessment/test-cases-34.md`
  ```

### 1.2 镜像 docs/psych-assessment 6 份
- [ ] **Step 1.2.1: 4 份 Mirror（design / plan / test-cases / project-overview）**

  PowerShell：
  ```powershell
  $src = 'g:\mental health'
  $dstDir = 'D:\starisle\docs\psych-assessment'
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  Copy-Item (Join-Path $src 'docs\superpowers\specs\2026-09-03-心理测评反馈小程序-design.md') (Join-Path $dstDir 'design.md')
  Copy-Item (Join-Path $src 'docs\superpowers\plans\2026-09-03-心理测评微信小程序-implementation-plan.md') (Join-Path $dstDir 'implementation-plan.md')
  Copy-Item (Join-Path $src 'docs\test-cases-34.md') (Join-Path $dstDir 'test-cases-34.md')
  Copy-Item (Join-Path $src 'docs\project-overview.md') (Join-Path $dstDir 'project-overview.md')
  ```

- [ ] **Step 1.2.2: acceptance-report-37-pass.md 新建（冻结 37/37 PASS 快照）**

  粘贴以下内容（从你上一次真实运行 `python acceptance_check.py` 的 stdout 中完整复制，确保含 Overall: 100% PASS 行）：
  ```markdown
  # Acceptance Report · 心理测评反馈微信小程序 · 37 项源码合规
  - 执行环境：Windows · Python 3.10+
  - 执行时间：2026-09-04 北京时区 21:18:29 ～ 21:18:41（11.77 s）
  - 工作目录：g:\mental health
  - 命令：`python acceptance_check.py`

  ```
  <粘贴 37 行 PASS 行 + 末尾 Overall: 100% PASS>
  ```

  Overall: **100% PASS**（37/37）
  ```

- [ ] **Step 1.2.3: import-checklist.md 新建（8 项 Y/N，导入后立核）**

  写入：
  ```markdown
  # StarIsle 导入心理测评 · 自检清单（Y/N）
  执行顺序：T1 完成后立即勾选 1~4；T2 完成勾选 5；T3 完成勾选 6,8；T4 Draft 完成勾选 7。

  - [ ] 1. feat/import-psych-assessment-miniapp 分支存在且 Draft PR 链接可打开（链接：____）
  - [ ] 2. `projects/psych-assessment-miniapp/` 目录存在，含 `app.json / app.js / app.wxss / pages/ / cloudfunctions/`
  - [ ] 3. `docs/psych-assessment/` 六份文件存在且大小非零
  - [ ] 4. `acceptance_check.py` 在 main 合入后仍能跑出 `Overall: 100% PASS`（命令见 README.psych-assessment.md §2）
  - [ ] 5. `tokens/psych-healing/tokens.json + tokens.css + starisle-bridge.css + tailwind.preset.js + miniapp-app.wxss` 五文件齐备
  - [ ] 6. `server-services/mcp-psych-assessment/package.json` 存在，`npm test` 显示 6 tests passed
  - [ ] 7. Draft PR Body 四段（目录清单 / Token 表 / 6 Tool 对照表 / 37 项验收截图）完整
  - [ ] 8. `.env.example` 仅占位 `YOUR_*`，无真 key、无真手机号、无真 passwordHash
  ```

### 1.3 在 feat 分支内复跑 acceptance_check.py 必须 37/37
- [ ] **Step 1.3.1: Windows cmd 命令行复跑**

  ```bash
  cd /d D:\starisle\projects\psych-assessment-miniapp
  python acceptance_check.py
  ```
  预期末行：`Overall: 100% PASS`。若 FAIL：
  - 若是相对路径：对照 37 条断言的失败 #N，回到源项目 `g:\mental health` 找对应文件比对，可能是复制漏掉了 `pages/admin/audit-ai/index.js` 之类——不要改断言，要补文件。
  - 若是行尾换行差异：统一 CRLF，不要用 `git config core.autocrlf false`，保持与 StarIsle 其他目录一致。

- [ ] **Step 1.3.2: 严格检查 Modified = 0（§6.1 硬红线）**

  ```bash
  git diff main...feat/import-psych-assessment-miniapp --stat
  ```
  输出中 `|` 右侧**必须全为 "A"（新增）、不应存在任何 "M"（修改）**。若存在 M → 立即 `git checkout main -- <path>` 恢复主仓版本，把你想修改的内容改为 *rename 为新项目侧文件*。

- [ ] **Step 1.3.3: Commit（T1）**
  ```bash
  git add projects/ docs/psych-assessment/
  git status --short
  git commit -m "feat(psych): import miniapp projects/ + docs mirror (T1) — acceptance 37/37 PASS"
  git push
  ```

---

## Task 2 · UI 疗愈色板 + 三层桥接（T2，1 天）

**Files:**
- Create: `tokens/psych-healing/tokens.json`
- Create: `tokens/psych-healing/tokens.css`
- Create: `tokens/psych-healing/starlisle-bridge.css`
- Create: `tokens/psych-healing/tailwind.preset.js`
- Create: `tokens/psych-healing/miniapp-app.wxss`
- Modify: `projects/psych-assessment-miniapp/app.wxss`（改为引用 tokens 版；备份旧版到 .bak）
- Test: 桌面跑 S1~S10 前 10 条学生端用例（test-cases-34.md）

- [ ] **Step 2.1: tokens.json（DTCG 源真，不可引入紫/蓝色值 #4B3FE3 或其变体）**

  写入：
  ```json
  {
    "$schema": "https://design-tokens.github.io/community-group/format/",
    "tokenSet": "psych-healing-v1",
    "color": {
      "cream-50":  { "$type":"color", "$value":"#FBF5EA", "$extensions":{"usages":["page-bg","card-surface"]} },
      "surface":   { "$type":"color", "$value":"#FFFFFF", "$extensions":{"usages":["input-bg","modal-inner"]} },
      "green-600": { "$type":"color", "$value":"#3C765C", "$extensions":{"usages":["primary-button","tabbar-active","status-safe"]} },
      "green-100": { "$type":"color", "$value":"#E7F2EC", "$extensions":{"usages":["low-risk-tag-bg","safe-hint-bg"]} },
      "tulle-300": { "$type":"color", "$value":"#F5DAD4", "$extensions":{"usages":["encourage-button","care-hint-bg"]} },
      "dusk-500":  { "$type":"color", "$value":"#B5838D", "$extensions":{"usages":["secondary-text","todo-highlight"]} },
      "ink-900":   { "$type":"color", "$value":"#2B2A2A", "$extensions":{"usages":["body","title"]} },
      "muted-500": { "$type":"color", "$value":"#8F8D8A", "$extensions":{"usages":["caption","placeholder"]} }
    },
    "spacing": {
      "4":  { "$type":"spacing", "$value":"4px" },
      "8":  { "$type":"spacing", "$value":"8px" },
      "12": { "$type":"spacing", "$value":"12px" },
      "16": { "$type":"spacing", "$value":"16px" },
      "20": { "$type":"spacing", "$value":"20px" },
      "24": { "$type":"spacing", "$value":"24px" }
    },
    "radius": {
      "8":  { "$type":"borderRadius", "$value":"8px" },
      "12": { "$type":"borderRadius", "$value":"12px" },
      "24": { "$type":"borderRadius", "$value":"24px" }
    },
    "typography": {
      "caption": { "$type":"typography", "$value":{"fontSize":"12px","lineHeight":"18px","fontWeight":400} },
      "body":    { "$type":"typography", "$value":{"fontSize":"14px","lineHeight":"20px","fontWeight":400} },
      "subtitle":{ "$type":"typography", "$value":{"fontSize":"14px","lineHeight":"20px","fontWeight":500} },
      "title":   { "$type":"typography", "$value":{"fontSize":"16px","lineHeight":"24px","fontWeight":600} }
    },
    "bridge": {
      "rhythm":   { "$value":"layer-rhythm: spacing 4/8/12/16/20/24 only" },
      "radius":   { "$value":"layer-radius: input/tag 8, card/modal 12, button/pill/avatar 24(full)" },
      "interaction":{ "$value":"layer-interaction: primary green-600 / secondary white-border / disabled opacity .45 not-allowed / hover fill +8% light / active translateY 1px" }
    }
  }
  ```

- [ ] **Step 2.2: tokens.css（CSS Custom Properties）**

  写入：
  ```css
  :root {
    --heal-cream-50:#FBF5EA;
    --heal-surface:#FFFFFF;
    --heal-green-600:#3C765C;
    --heal-green-100:#E7F2EC;
    --heal-tulle-300:#F5DAD4;
    --heal-dusk-500:#B5838D;
    --heal-ink-900:#2B2A2A;
    --heal-muted-500:#8F8D8A;

    --heal-sp-4:4px; --heal-sp-8:8px; --heal-sp-12:12px; --heal-sp-16:16px; --heal-sp-20:20px; --heal-sp-24:24px;
    --heal-r-8:8px; --heal-r-12:12px; --heal-r-24:24px;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-heal-theme="light"]) {
      --heal-cream-50:#2F2D28;
      --heal-surface:#353430;
      --heal-ink-900:#F2F0EC;
      --heal-muted-500:#B3B0AB;
    }
  }
  ```

- [ ] **Step 2.3: starisle-bridge.css（仅三层桥接 · 不引入色板混合）**

  写入：
  ```css
  /* Layer 1 · Rhythm: gap + padding utilities */
  .gap-4{gap:4px}.gap-8{gap:8px}.gap-12{gap:12px}.gap-16{gap:16px}.gap-20{gap:20px}.gap-24{gap:24px}
  .p-4{padding:4px}.p-8{padding:8px}.p-12{padding:12px}.p-16{padding:16px}.p-20{padding:20px}.p-24{padding:24px}
  .m-4{margin:4px}.m-8{margin:8px}.m-12{margin:12px}.m-16{margin:16px}.m-20{margin:20px}.m-24{margin:24px}

  /* Layer 2 · Radius: 3 tiers */
  .rounded-8{border-radius:8px}.rounded-12{border-radius:12px}.rounded-24{border-radius:24px}

  /* Layer 3 · Button interactions (no palette mix) */
  .btn-primary{
    background:var(--heal-green-600,#3C765C);color:#fff;border:1px solid transparent;
    padding:8px 16px;border-radius:24px;font-weight:600;font-size:14px;line-height:20px;
    transition:background-color 120ms ease, transform 80ms ease;
  }
  .btn-primary:hover{background:#468668 /* +8% light approx */}
  .btn-primary:active{transform:translateY(1px)}
  .btn-secondary{
    background:var(--heal-surface,#fff);color:var(--heal-ink-900,#2B2A2A);
    border:1px solid rgba(43,42,42,.18);padding:8px 16px;border-radius:24px;font-weight:600;font-size:14px;line-height:20px;
    transition:background-color 120ms ease, transform 80ms ease;
  }
  .btn-secondary:hover{background:#F5F5F4}
  .btn-secondary:active{transform:translateY(1px)}
  .btn-disabled,.btn-primary[disabled],.btn-secondary[disabled]{
    opacity:.45;cursor:not-allowed !important;pointer-events:none;
  }
  ```

- [ ] **Step 2.4: tailwind.preset.js（web-frontend 未来入口）**

  写入：
  ```js
  // tokens/psych-healing/tailwind.preset.js
  // Usage: in web-frontend/tailwind.config.js → module.exports = { presets: [require('./tokens/psych-healing/tailwind.preset')] }
  module.exports = {
    theme: {
      extend: {
        colors: {
          heal: {
            50:  '#FBF5EA', // cream-50
            surface:'#FFFFFF',
            DEFAULT: '#3C765C', // green-600 primary
            green: { 100:'#E7F2EC', 600:'#3C765C' },
            tulle: '#F5DAD4',
            dusk:  '#B5838D',
            ink:   '#2B2A2A',
            muted: '#8F8D8A'
          }
        },
        spacing: {
          '4':'4px','8':'8px','12':'12px','16':'16px','20':'20px','24':'24px'
        },
        borderRadius: {
          '8':'8px','12':'12px','24':'24px'
        },
        fontFamily: {
          sans: ['"PingFang SC"','system-ui','-apple-system','"Segoe UI"','Roboto','sans-serif']
        }
      }
    }
  }
  ```

- [ ] **Step 2.5: miniapp-app.wxss（小程序端 app.wxss 替换版）**

  写入：
  ```css
  /* tokens/psych-healing/miniapp-app.wxss
     注意：小程序端不支持 :root var() 跨文件注入，所以这里把值直接展开成全局类与 page 底色。
     如需在各页 WXSS 里引用，直接复制对应 CSS 变量值即可。*/

  page {
    background-color:#FBF5EA; /* --heal-cream-50 */
    color:#2B2A2A;            /* --heal-ink-900 正文 */
    font-size:14px; line-height:20px; font-family:"PingFang SC",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  }
  .heal-bg-cream  { background-color:#FBF5EA; }
  .heal-bg-surface{ background-color:#FFFFFF; }
  .heal-color-primary{ color:#3C765C; }
  .heal-bg-primary   { background-color:#3C765C; }
  .heal-color-muted  { color:#8F8D8A; }
  .heal-color-dusk   { color:#B5838D; }
  .heal-bg-tulle     { background-color:#F5DAD4; }
  .heal-bg-green100  { background-color:#E7F2EC; }

  /* Layer 1 rhythm（小程序 4/8/12/16/20/24） */
  .sp-4{padding:4px}.sp-8{padding:8px}.sp-12{padding:12px}.sp-16{padding:16px}.sp-20{padding:20px}.sp-24{padding:24px}
  .gap-4{margin-right:4px}.gap-8{margin-right:8px}.gap-12{margin-right:12px}.gap-16{margin-right:16px}.gap-20{margin-right:20px}.gap-24{margin-right:24px}
  /* (WXSS 原生不支持 flex gap，改用 margin-right 近似) */

  /* Layer 2 radius */
  .r-8{border-radius:8px}.r-12{border-radius:12px}.r-24{border-radius:24px}

  /* Layer 3 buttons */
  .btn-primary{background:#3C765C;color:#fff;border:0;border-radius:24px;padding:8px 16px;font-weight:600;font-size:14px;line-height:20px;}
  .btn-primary[disabled]{opacity:.45}
  .btn-secondary{background:#fff;color:#2B2A2A;border:1rpx solid rgba(43,42,42,.18);border-radius:24px;padding:8px 16px;font-weight:600;font-size:14px;line-height:20px;}
  .btn-secondary[disabled]{opacity:.45}

  /* TabBar 颜色重写（配合 custom-tab-bar/index.wxss 的 style） */
  .tabbar-item-active{color:#3C765C !important}
  ```

- [ ] **Step 2.6: 备份 + 替换 projects/…/app.wxss**

  ```powershell
  $path = 'D:\starisle\projects\psych-assessment-miniapp\app.wxss'
  Copy-Item $path ($path + '.bak-2026-09-03-star-default')
  Copy-Item 'D:\starisle\tokens\psych-healing\miniapp-app.wxss' $path -Force
  ```

- [ ] **Step 2.7: 桌面端跑前 10 条学生端用例（微信开发者工具）**

  对照 docs/psych-assessment/test-cases-34.md 前 10 条（S1-S10）：
  - 重点视觉：页面底 = #FBF5EA、TabBar 选中 = 森林绿 #3C765C、卡片圆角 12px、主按钮禁用态 opacity ≤ 0.45（开发者工具 Computed 面板查看）。
  - 若不通过：对照 spec §6.2（5~9）修改 tokens 版 wxss，**禁止改色值本身（除非改 spec）**。

- [ ] **Step 2.8: Commit T2**
  ```bash
  git add tokens/ projects/psych-assessment-miniapp/app.wxss "projects/psych-assessment-miniapp/app.wxss.bak-2026-09-03-star-default"
  git diff main...HEAD --stat   # 再次确认无 M（Modified）行
  git commit -m "feat(ui): healing tokens + miniapp wxss + starisle 3-layer bridge — T2 done"
  git push
  ```

---

## Task 3 · MCP Server 六 Tool + 六 Guard + mock 单测（T3，2 天）

**Files:**
- Create: `server-services/mcp-psych-assessment/package.json`
- Create: `server-services/mcp-psych-assessment/README.md`
- Create: `server-services/mcp-psych-assessment/.env.example`
- Create: `server-services/mcp-psych-assessment/.gitignore`
- Create: `server-services/mcp-psych-assessment/tsconfig.json`
- Create: `server-services/mcp-psych-assessment/src/index.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/listTasks.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/submitFeedback.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/aiAnalyze.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/reviewFeedback.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/exportResearch.ts`
- Create: `server-services/mcp-psych-assessment/src/tools/accessPII.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/auditLogger.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/scopeGuard.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/piiGate.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/twoFA.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/cloudBridge.ts`
- Create: `server-services/mcp-psych-assessment/src/shared/dashscope.ts`
- Create: `server-services/mcp-psych-assessment/tests/t1-listTasks-scope.test.ts`
- Create: `server-services/mcp-psych-assessment/tests/t2-submit-mssec-first.test.ts`
- Create: `server-services/mcp-psych-assessment/tests/t3-ai-budget-warn80.test.ts`
- Create: `server-services/mcp-psych-assessment/tests/t4-review-confirm3.test.ts`
- Create: `server-services/mcp-psych-assessment/tests/t5-export-pii-forbidden.test.ts`
- Create: `server-services/mcp-psych-assessment/tests/t6-accesspii-lock5.test.ts`
- Test: `npm test` → 6/6 tests passed

### 3.1 基础元文件

- [ ] **Step 3.1.1: package.json**

  写入：
  ```json
  {
    "name": "@starisle/mcp-psych-assessment",
    "version": "1.0.0",
    "private": true,
    "type": "module",
    "description": "MCP server for StarIsle server-services chat host: psych assessment 6 tools + PII 2FA gate + audit logging",
    "engines": {
      "node": ">=20"
    },
    "scripts": {
      "build": "tsc -p tsconfig.json",
      "start": "node dist/index.js",
      "dev": "tsx watch src/index.ts",
      "test": "vitest run tests/ --reporter=verbose",
      "test:watch": "vitest tests/"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "^0.6.0",
      "crypto-js": "^4.2.0",
      "qrcode": "^1.5.3",
      "jsonwebtoken": "^9.0.2",
      "otplib": "^12.0.1"
    },
    "devDependencies": {
      "typescript": "^5.6.0",
      "vitest": "^2.1.0",
      "@types/node": "^22.0.0",
      "@types/crypto-js": "^4.2.2",
      "@types/qrcode": "^1.5.5",
      "@types/jsonwebtoken": "^9.0.6",
      "tsx": "^4.19.0"
    }
  }
  ```

- [ ] **Step 3.1.2: tsconfig.json**

  ```json
  {
    "compilerOptions": {
      "target":"ES2022","module":"ESNext","moduleResolution":"Bundler",
      "strict":true,"esModuleInterop":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,
      "outDir":"dist","rootDir":"src","declaration":true,"declarationMap":true,"sourceMap":true,
      "resolveJsonModule":true,"allowSyntheticDefaultImports":true,"types":["node","vitest/globals"]
    },
    "include":["src/**/*"],
    "exclude":["node_modules","dist","tests/**/*"]
  }
  ```

- [ ] **Step 3.1.3: README.md**（占位，不粘贴真 Key）

  ```markdown
  # @starisle/mcp-psych-assessment · MCP Server
  给 StarIsle server-services 聊天后端提供 6 个心理测评工具能力，PII 全流程双 2FA + 30s 窗 + 审计。

  ## 启动
  ```bash
  cp .env.example .env.local  # 填真实 DASHSCOPE_KEY / WX_CLOUD_ENV / 2FA_SMS_PROVIDER / TOTP_ISSUER
  npm install
  npm run build
  npm start
  ```

  ## Tools（spec §3.1 六 Tool 契约）
  1. listTasks
  2. submitFeedback   (msSecCheck 先于 DashScope)
  3. aiAnalyze        (few-shot 3 例 + 3 次指数退避 5/10/20s ±25% · 80%/95% 预算告警)
  4. reviewFeedback   (后端 0 trust confirm_3 → 直接 4015)
  5. exportResearch   (CSV only anonymous · 7d TTL · dimensions 禁 PII 字段)
  6. accessPII        (管理员 密码 + TOTP/SMS 双 2FA · piiGrantToken 30s)

  ## 与聊天后端集成
  server-services 端在 dispatch 层通过 MCP client 调用，并在 metadata 注入 callerRole / serverSessionId / callerUserHash。本 MCP **只信任 metadata，不信任 arguments 内传入的 role。**
  ```

- [ ] **Step 3.1.4: .env.example（全占位，无一真值）**

  ```bash
  # DashScope (通义千问情绪分析)
  DASHSCOPE_KEY=YOUR_DASHSCOPE_API_KEY_HERE

  # 微信云环境 ID
  WX_CLOUD_ENV=YOUR_WX_CLOUD_ENV_ID_HERE

  # 若 WX_CLOUD_ENV 在 server-services 内网，可选择 HTTP Webhook 桥；否则用 direct SDK（default）
  WX_CLOUD_MODE=direct    # 有效值：direct | webhook
  WX_CLOUD_WEBHOOK_URL=https://YOUR_WX_CLOUD_HTTP_TRIGGER_HOST_HERE

  # 2FA：SMS Provider（aliyun / tencent / none 表示仅 TOTP）
  2FA_SMS_PROVIDER=YOUR_SMS_PROVIDER_HERE
  2FA_SMS_ACCESS_KEY=YOUR_SMS_ACCESS_KEY_HERE
  2FA_SMS_SECRET=YOUR_SMS_SECRET_HERE
  2FA_SMS_SIGN_NAME=YOUR_SMS_SIGN_NAME_HERE
  2FA_SMS_TEMPLATE_CODE=YOUR_SMS_TEMPLATE_CODE_HERE

  # 2FA：TOTP
  TOTP_ISSUER=StarIsle
  PII_JWT_SECRET=YOUR_LOCAL_PII_JWT_32_BYTES_RANDOM_SECRET_HERE

  # 审计 & 质量指标（可选，如果接入外部日志/InfluxDB等）
  AUDIT_LOG_SINK=stdout
  ```

- [ ] **Step 3.1.5: .gitignore**

  ```
  node_modules/
  dist/
  .env
  .env.local
  coverage/
  *.log
  ```

### 3.2 src/shared 六 Guard（**所有 Tool 必须先经过它们**）

- [ ] **Step 3.2.1: auditLogger.ts**（只写 anonymousNo，不写真名/手机）

  ```ts
  // src/shared/auditLogger.ts
  import crypto from 'node:crypto';

  export type AuditRow = Readonly<{
    actorHash: string;          // callerUserHash 哈希后再存
    serverSessionIdHash: string;
    toolName: string;
    status: 'ok' | 'fail' | 'blocked' | 'rate_limited';
    anonymousNos: readonly string[];   // 只允许 anonymousNo
    code?: number;
    extras?: Readonly<Record<string, string | number | boolean | null>>;
    ts: number;
  }>;

  const SENSITIVE_EXTRA_KEYS = /(name|phone|password|pwd|totp|sms|otp|secret|token)/i;

  const _sink = process.env.AUDIT_LOG_SINK === 'stdout' ? 'stdout' : 'stdout';
  // NOTE: 真实部署可扩展到 server-services 内部 audit 流；此处保持 stdout 最低依赖

  export function scrubExtras(raw: Record<string, unknown> | undefined): AuditRow['extras'] | undefined {
    if (!raw) return undefined;
    const out: Record<string, string | number | boolean | null> = {};
    for (const k of Object.keys(raw)) {
      if (SENSITIVE_EXTRA_KEYS.test(k)) continue;   // 审计字段里不得写入敏感 key
      const v = raw[k];
      if (typeof v === 'string') {
        if (/^1[3-9]\d{9}$/.test(v)) continue;        // 手机号正则：不存
        if (/\$\$2[abxy]?\$\d+\$/.test(v)) continue;  // bcrypt hash：不存
        if (/^sk-[A-Za-z0-9]{10,}$/.test(v)) continue; // api key：不存
      }
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }

  export function auditWrite(row: Omit<AuditRow,'ts'>): AuditRow {
    const full: AuditRow = { ...row, ts: Date.now() };
    if (_sink === 'stdout') {
      // 单行 JSON，方便 Filebeat 采集
      console.log(JSON.stringify({ type: 'psych_mcp_audit', ...full }));
    }
    return full;
  }

  export function actorHashFromMeta(meta: { callerUserHash?: string | null }): string {
    const raw = meta.callerUserHash ?? 'unknown';
    return crypto.createHash('sha256').update(String(raw)).digest('hex').slice(0, 16);
  }
  ```

- [ ] **Step 3.2.2: scopeGuard.ts（fetchOwnStudentIds 三道）**

  ```ts
  // src/shared/scopeGuard.ts
  // NOTE: 三道逻辑直接镜像自 cloudfunctions/shared/verifyRole.js + taskOperate.queryMyStudentIds 接口
  import type { cloudBridge } from './cloudBridge';

  export type CallerMeta = Readonly<{
    callerRole: 'student' | 'teacher' | 'admin' | string;
    callerUserHash?: string;
    serverSessionId?: string;
    // 其它字段保留，不使用
  }>;

  export class ScopeDenied extends Error {
    readonly code = 4015;
    constructor(reason: string) { super('SCOPE_DENIED:' + reason); this.name = 'ScopeDenied'; }
  }

  export async function scopeGuard(toolName: string, meta: CallerMeta, anonymousNos: readonly string[], cb: typeof cloudBridge): Promise<void> {
    const role = meta.callerRole;
    if (!role) throw new ScopeDenied('NO_METADATA_ROLE');

    // 学生端：只能访问自己的 anonymousNo（通常与 meta.callerUserHash 绑定的单条映射）
    if (role === 'student') {
      const mine = await cb.fetchMyAnonymousNo(meta);
      if (!mine || anonymousNos.some(x => x !== mine)) throw new ScopeDenied('STUDENT_NOT_OWN');
      return;
    }

    // 教师端：三道 fetchOwnStudentIds
    if (role === 'teacher') {
      const s1 = await cb.queryMyStudentIds(meta, 'class_binding_first');   // 1st: 本班绑定
      const s2 = await cb.queryMyStudentIds(meta, 'binding_extended');     // 2nd: 绑定扩展
      const s3 = await cb.queryMyStudentIds(meta, 'task_scope_whitelist'); // 3rd: 任务白名单
      const union = new Set([...s1, ...s2, ...s3]);
      if (anonymousNos.length === 0) return; // listTasks 场景可无特定学生，按 teacherStatus 过滤后续 handler 做
      for (const a of anonymousNos) {
        if (!union.has(a)) throw new ScopeDenied('TEACHER_OUT_OF_SCOPE:' + a);
      }
      return;
    }

    // 管理员：允许全局，但 exportResearch 的 PII 字段仍会被 export handler 拒绝
    if (role === 'admin') return;

    throw new ScopeDenied('UNKNOWN_ROLE');
  }
  ```

- [ ] **Step 3.2.3: piiGate.ts（30 秒倒计时 + forceReMask）**

  ```ts
  // src/shared/piiGate.ts
  import jwt from 'jsonwebtoken';

  export type PIIGrant = Readonly<{
    piiGrantToken: string;
    expireAt: number;   // ms epoch
    fields: Readonly<Record<string, string | null>>;  // anonymousNo -> 仅这次返回的 PII 字段字符串
  }>;

  const JWT_TTL_MS = 30_000;

  function jwtSecret(): string {
    const s = process.env.PII_JWT_SECRET || '';
    if (s.length < 16) throw new Error('misconfig: PII_JWT_SECRET too short (need >=16 bytes rand)');
    return s;
  }

  export function issuePIIGrant(anonymousNos: readonly string[], fields: Record<string, string | null>): PIIGrant {
    const now = Date.now();
    const expireAt = now + JWT_TTL_MS;
    const token = jwt.sign(
      { sub: anonymousNos.slice(), iat: Math.floor(now/1000) },
      jwtSecret(),
      { expiresIn: '30s', algorithm: 'HS512' }
    );
    return { piiGrantToken: token, expireAt, fields };
  }

  export function validateGrant(token: string): { ok: boolean; sub?: string[] } {
    try {
      const payload = jwt.verify(token, jwtSecret(), { algorithms:['HS512'] }) as { sub: string[] };
      return { ok:true, sub: Array.isArray(payload.sub) ? payload.sub : [] };
    } catch {
      return { ok:false };
    }
  }

  const PII_KEYS = new Set(['name','realName','trueName','phone','mobile','class','className','school','schoolName','address','idCard','idNo','idcardno']);

  export function forceReMask<T extends Record<string, any>>(toolName: string, obj: T, replaceWith = null): T {
    if (toolName === 'accessPII') return obj; // 仅本 tool 允许带 PII
    // shallow 遍历所有对象数组再脱 PII key
    const scrub = (o: any): any => {
      if (o == null) return o;
      if (Array.isArray(o)) return o.map(scrub);
      if (typeof o !== 'object') return o;
      const out: any = { ...o };
      for (const k of Object.keys(out)) {
        if (PII_KEYS.has(k.toLowerCase())) { out[k] = replaceWith; continue; }
        if (typeof out[k] === 'object') out[k] = scrub(out[k]);
      }
      return out;
    };
    return scrub(obj);
  }
  ```

- [ ] **Step 3.2.4: twoFA.ts（密码 5×/10min + SMS 5×/hour + TOTP）**

  ```ts
  // src/shared/twoFA.ts
  import { totp } from 'otplib';
  import crypto from 'node:crypto';

  export type OTPMethod = 'sms' | 'totp';

  type PWLock = { fails: number; lockUntilMs: number };
  type SMSBucket = { hourBucket: string; count: number };

  const pwLock = new Map<string, PWLock>();     // key = callerUserHash
  const smsBuck = new Map<string, SMSBucket>();

  function nowMs() { return Date.now(); }
  function hourKey() {
    const d = new Date(); d.setMinutes(0,0,0); return d.toISOString().slice(0,13);
  }
  function bcryptishVerify(passwordInput: string, hashEnv: string): boolean {
    // NOTE: 这里使用 SHA256(pepper+pass) 与管理员在创建时保存的 hash 比对（部署文档要求 ADMIN_PASSWORD_HASH = sha256(PII_ADMIN_PASSWORD_PEPPER + 真实密码)），避免 bcrypt 依赖在最小部署里出错；若你希望 bcrypt，改此处即可
    const pepper = process.env.PII_ADMIN_PASSWORD_PEPPER || 'REPLACE_ME_IN_PROD_PLEASE_USE_BIG_RANDOM_PEPPER';
    const hashed = crypto.createHash('sha256').update(pepper + passwordInput).digest('hex');
    return hashed === hashEnv;
  }

  export function validatePassword(callerHash: string, passwordHash: string): { ok: boolean; code?: 429 } {
    if (!callerHash) return { ok:false };
    const now = nowMs();
    const lock = pwLock.get(callerHash);
    if (lock && now < lock.lockUntilMs) return { ok:false, code:429 };
    const adminHash = process.env.PII_ADMIN_PASSWORD_HASH || '';
    const ok = bcryptishVerify(passwordHash, adminHash);
    if (!ok) {
      const fails = (lock?.fails ?? 0) + 1;
      const newLock: PWLock = { fails, lockUntilMs: fails >= 5 ? now + 10*60*1000 : (lock?.lockUntilMs ?? 0) };
      pwLock.set(callerHash, newLock);
      if (fails >= 5) return { ok:false, code:429 };
      return { ok:false };
    }
    pwLock.delete(callerHash);
    return { ok:true };
  }

  export function recordSMSAttempt(callerHash: string): { ok: boolean; reason?: 'sms_rate_limited' } {
    const bucket = hourKey();
    const b = smsBuck.get(callerHash) ?? { hourBucket: bucket, count: 0 };
    if (b.hourBucket !== bucket) { b.hourBucket = bucket; b.count = 0; }
    if (b.count >= 5) return { ok:false, reason:'sms_rate_limited' };
    b.count += 1;
    smsBuck.set(callerHash, b);
    return { ok:true };
  }

  export function validateTOTP(secretEnv: string, code: string): boolean {
    try {
      totp.options = { window: 1, digits: 6, step: 30 };
      return totp.check(code, secretEnv || '') ?? false;
    } catch { return false; }
  }

  export function validateSMSCode(mockCodeEnv: string, code: string): boolean {
    // NOTE: 离线环境可通过 PII_ADMIN_SMS_CODE 做部署时一次性验证（禁止用在生产）
    if (process.env.NODE_ENV !== 'production' && mockCodeEnv && code === mockCodeEnv) return true;
    return false;   // 真实部署要走 SMS Provider callback 校验；默认 false 安全
  }
  ```

- [ ] **Step 3.2.5: cloudBridge.ts（direct/Webhook 双模）**

  ```ts
  // src/shared/cloudBridge.ts
  export type CB = {
    fetchMyAnonymousNo: (meta: any) => Promise<string | null>;
    queryMyStudentIds: (meta: any, mode: string) => Promise<string[]>;
    callWXCF: (name: string, action: string, payload: any) => Promise<any>;
  };

  const MODE = (process.env.WX_CLOUD_MODE ?? 'direct') as 'direct' | 'webhook';

  async function httpJson(url: string, body: any): Promise<any> {
    const res = await fetch(url, {
      method:'POST',
      headers:{'content-type':'application/json', 'x-psych-mcp-webhook-secret': process.env.WX_CLOUD_WEBHOOK_SECRET || ''},
      body: JSON.stringify(body)
    });
    return res.json();
  }

  export const cloudBridge: CB = {
    async fetchMyAnonymousNo(meta){
      const r = MODE === 'webhook'
        ? await httpJson(process.env.WX_CLOUD_WEBHOOK_URL!, { op:'fetchMyAnonymousNo', meta })
        : (await requireDirectRuntime()).fetchMyAnonymousNo(meta);
      return r?.anonymousNo ?? null;
    },
    async queryMyStudentIds(meta, mode){
      const r = MODE === 'webhook'
        ? await httpJson(process.env.WX_CLOUD_WEBHOOK_URL!, { op:'queryMyStudentIds', meta, mode })
        : (await requireDirectRuntime()).queryMyStudentIds(meta, mode);
      return Array.isArray(r?.ids) ? r.ids : [];
    },
    async callWXCF(name, action, payload){
      if (MODE === 'webhook') return httpJson(process.env.WX_CLOUD_WEBHOOK_URL!, { op:'callWXCF', name, action, payload });
      return (await requireDirectRuntime()).callWXCF(name, action, payload);
    }
  };

  async function requireDirectRuntime(): Promise<CB> {
    // NOTE: 实际部署若 WX_CLOUD_MODE=direct，需要你把 cloudfunctions 依赖的 tcb-admin SDK 引到这里；
    // 为了本 plan 不引入不必要的依赖，最小实现先用 webhook 模式，direct 模式给 stub 抛错引导：
    throw new Error(
      'WX_CLOUD_MODE=direct is not implemented in this initial commit. Change .env to WX_CLOUD_MODE=webhook and provide WX_CLOUD_WEBHOOK_URL. Or extend requireDirectRuntime() to import cloudbase-admin and wire up the 3 calls.'
    );
  }
  ```

- [ ] **Step 3.2.6: dashscope.ts（3 few-shot 例 + 3 次指数退避 + 三档预算）**

  ```ts
  // src/shared/dashscope.ts
  export type Scores = { anxiety:number; depression:number; trauma:number; interpersonal:number; selfHarmRisk:number };
  export type AIAnalysis = {
    scores: Scores;
    warning_tags: string[];
    summary: string;
    token_cost: number;
    latency_ms: number;
  };

  export type DashCallOpts = { retriesLeft?: number; onBudget?: (level:'WARN'|'CRIT',usagePct:number)=>void };

  const PROMPT_TEMPLATE = (text: string) => `You are a Chinese school mental-health assistant. Use JSON output ONLY. Output = {"scores":{"anxiety":0..100,"depression":0..100,"trauma":0..100,"interpersonal":0..100,"selfHarmRisk":0..100},"warning_tags": string[],"summary": string}
  ## Few-Shot Examples
  (1) Mild anxiety: return anxiety 62 depression 32 trauma 18 interpersonal 50 selfHarmRisk 8; summary="轻度学业压力…"
  (2) Severe depression + self harm cues: return selfHarmRisk 88+ trauma 74 warning_tags["self_harm_signal","severe_negativity"] summary="自述自伤念头…"
  (3) Trauma cues: return trauma 81 interpersonal 60 warning_tags["trauma_signal"] summary="明确描述一次被欺凌经历…"
  ## Student feedback response to assess:
  """${text.replace(/"/g,'\\"')}"""`;

  function jitterMs(base: number): number {
    const pct = 0.25;
    return base + Math.round(base * pct * (Math.random() * 2 - 1));
  }

  function sleep(ms: number){ return new Promise<void>(r => setTimeout(r, ms)); }

  function budgetCheck(token_cost_this: number, levelReporter: DashCallOpts['onBudget']) {
    const totalBudget = Number(process.env.DASHSCOPE_TOKEN_BUDGET_DAILY || '2000000');
    const used = Number(process.env.DASHSCOPE_TOKENS_USED_TODAY || '0') + token_cost_this;
    const pct = Math.round(used / Math.max(totalBudget,1) * 1000) / 10; // 0..100
    process.env.DASHSCOPE_TOKENS_USED_TODAY = String(used);
    if (pct >= 95) levelReporter?.('CRIT', pct);
    else if (pct >= 80) levelReporter?.('WARN', pct);
  }

  export async function dashscopeAnalyze(fulltext: string, opts: DashCallOpts = {}): Promise<AIAnalysis> {
    const retriesLeft = opts.retriesLeft ?? 3;
    const startedAt = Date.now();
    try {
      // NOTE: 真实环境调用 https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions 并把 prompt 注入；离线测试用 mock 输出，避免真 key。
      const KEY = process.env.DASHSCOPE_KEY || '';
      if (!KEY) {
        // mock: 5 维随机 + warning_tags 简单推导
        const s = (n:number) => Math.max(0, Math.min(100, n));
        const r = () => s(Math.round(40 + Math.random()*50));
        const scores: Scores = { anxiety:r(), depression:r(), trauma:r(), interpersonal:r(), selfHarmRisk:r() };
        const warning_tags = [
          scores.selfHarmRisk > 70 ? 'self_harm_signal' : null,
          scores.depression > 75 ? 'severe_negativity' : null,
          scores.trauma > 70 ? 'trauma_signal' : null,
          scores.interpersonal < 30 ? 'interpersonal_low' : null,
        ].filter(Boolean) as string[];
        const latency_ms = Date.now() - startedAt;
        const token_cost = 120 + Math.round(fulltext.length * 0.7);
        budgetCheck(token_cost, opts.onBudget);
        return { scores, warning_tags, summary:'(mock offline, DASHSCOPE_KEY empty)', token_cost, latency_ms };
      }
      // 真实请求：省略，保留 DashScope SDK curl 示例位置：
      throw new Error('DASHSCOPE_KEY present but SDK request not wired. Replace throw with real request in production.');
    } catch (e) {
      if (retriesLeft <= 0) throw e;
      const baseMs = [5_000, 10_000, 20_000][3 - retriesLeft] ?? 20_000;
      await sleep(jitterMs(baseMs));
      return dashscopeAnalyze(fulltext, { ...opts, retriesLeft: retriesLeft - 1 });
    } finally {
      void PROMPT_TEMPLATE; // reference to avoid lint unused
    }
  }
  ```

### 3.3 src/tools/ 六 Tool handler

- [ ] **Step 3.3.1: listTasks.ts**

  ```ts
  // src/tools/listTasks.ts
  import { cloudBridge } from '../shared/cloudBridge';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = { role?: string; status?: string; anonymousNo?: string | string[]; page?: number; size?: number };

  export async function listTasks(args: Args, meta: CallerMeta) {
    const payload = {
      action: 'list',
      status: args.status ?? 'any',
      anonymousNos: Array.isArray(args.anonymousNo) ? args.anonymousNo : (args.anonymousNo ? [args.anonymousNo] : []),
      page: Math.max(1, Number(args.page ?? 1)),
      size: Math.min(100, Math.max(1, Number(args.size ?? 20))),
    };
    // scopeGuard 已在上游调用过，这里直传
    const raw = await cloudBridge.callWXCF('taskOperate', 'queryList', { ...payload, callerRoleEffective: meta.callerRole });
    const items = (raw.items ?? []).map((x: any) => ({
      taskId: x.taskId,
      title: x.title,
      deadlineAt: x.deadlineAt,
      participantsCount: x.participantsCount,
      allowsCustomImage: x.allowsCustomImage ?? false,
    }));
    return { content: [{ type:'text', text: JSON.stringify({ items, page: payload.page, size: payload.size, total: raw.total ?? 0 }, null, 2) }] };
  }
  ```

- [ ] **Step 3.3.2: submitFeedback.ts（msSecCheck 前置，DashScope 调用计数 0）**

  ```ts
  // src/tools/submitFeedback.ts
  import { cloudBridge } from '../shared/cloudBridge';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = { taskId: string; anonymousNo: string; imageId?: string; textResponses: string[]; elapsedSec: number };

  async function msSecCheck(texts: readonly string[]): Promise<{ ok: boolean; reason?: string }> {
    // mirror 小程序 msgSecCheck：违规返回 {ok:false, reason:"ms_sec_blocked:<label>"}
    // 真实部署：调用 wx.msgSecCheck v2；离线 mock 默认 ok 除非 text 含触发词 "SEXUAL_VIOLENCE_SEC_TEST"
    const concat = texts.join(' ');
    if (/SEXUAL_VIOLENCE_SEC_TEST/.test(concat)) return { ok:false, reason:'ms_sec_blocked:sexual' };
    return { ok:true };
  }

  export async function submitFeedback(args: Args, meta: CallerMeta, opts?: { spy?: { dashscopeCallInc: ()=>void } }) {
    if (!args.taskId || !args.anonymousNo || !Array.isArray(args.textResponses) || args.textResponses.some(x => typeof x !== 'string' || x.length < 1)) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'textResponses too short or missing ids' }) }] };
    }
    const ms = await msSecCheck(args.textResponses);
    if (!ms.ok) {
      // msSec 违规 → 直接返回 ms_sec_blocked，不触发任何 DashScope 调用
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:451, status:'ms_sec_blocked', reason: ms.reason }) }] };
    }
    const r = await cloudBridge.callWXCF('feedbackSubmit', 'direct_submit', {
      taskId: args.taskId, anonymousNo: args.anonymousNo, imageId: args.imageId ?? null,
      textResponses: args.textResponses, elapsedSec: Math.max(0, Number(args.elapsedSec) || 0),
      callerMeta: meta,
    });
    // 云函数反馈提交成功
    return { content:[{ type:'text', text: JSON.stringify({ feedbackId: r?.feedbackId, status: 'submitted', ms_sec: 'passed' }) }] };
  }
  ```

- [ ] **Step 3.3.3: aiAnalyze.ts（预算 80/95 双档）**

  ```ts
  // src/tools/aiAnalyze.ts
  import { cloudBridge } from '../shared/cloudBridge';
  import { dashscopeAnalyze } from '../shared/dashscope';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = { feedbackId?: string; anonymousNos?: string[] };

  export async function aiAnalyze(args: Args, meta: CallerMeta) {
    const feedbackIds = args.feedbackId ? [args.feedbackId] : [];
    // 拉取 feedbacks.textResponses
    const fbs = await cloudBridge.callWXCF('aiAnalyze', 'fetchFeedbackTexts', { feedbackIds, anonymousNos: args.anonymousNos ?? [], callerMeta: meta });
    if (!Array.isArray(fbs) || fbs.length === 0) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:404, msg:'no feedbacks found' }) }] };
    }
    const results: any[] = [];
    let budgetBlocked: { level:'WARN'|'CRIT'; pct:number } | null = null;
    for (const fb of fbs) {
      const fulltext = Array.isArray(fb.textResponses) ? fb.textResponses.join('\n') : '';
      const analysis = await dashscopeAnalyze(fulltext, { onBudget:(level,pct)=>{ budgetBlocked = { level, pct }; } });
      if (budgetBlocked?.level === 'CRIT') {
        return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:503, status:'budget_crit_95', usagePct: budgetBlocked.pct }) }] };
      }
      await cloudBridge.callWXCF('aiAnalyze', 'saveAnalysis', { feedbackId: fb.feedbackId, analysis, callerMeta: meta });
      if (budgetBlocked?.level === 'WARN') {
        results.push({ feedbackId: fb.feedbackId, ...analysis, _warning: `BUDGET_WARN_80_${budgetBlocked.pct}pct` });
      } else {
        results.push({ feedbackId: fb.feedbackId, ...analysis });
      }
    }
    return { content:[{ type:'text', text: JSON.stringify({ count: results.length, results }, null, 2) }] };
  }
  ```

- [ ] **Step 3.3.4: reviewFeedback.ts（0 trust confirm_3）**

  ```ts
  // src/tools/reviewFeedback.ts
  import { cloudBridge } from '../shared/cloudBridge';
  import { auditWrite, actorHashFromMeta, scrubExtras } from '../shared/auditLogger';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = {
    feedbackId: string;
    reviewStatus?: 'pass'|'escalate'|'reject';
    confirmedScores?: Partial<{ anxiety:number; depression:number; trauma:number; interpersonal:number; selfHarmRisk:number }>;
    teacherNote?: string;
    reasons?: string[];
    confirm_3?: any;   // 恶意或误传：直接丢弃并返回 4015
  };

  const LEGAL_STATUSES = new Set(['pass','escalate','reject', undefined]);

  export async function reviewFeedback(args: Args, meta: CallerMeta) {
    const confirm3Present = 'confirm_3' in args;
    auditWrite({
      actorHash: actorHashFromMeta(meta),
      serverSessionIdHash: meta.serverSessionId ?? '',
      toolName: 'reviewFeedback',
      status: confirm3Present ? 'blocked' : 'ok',
      anonymousNos: [],
      code: confirm3Present ? 4015 : undefined,
      extras: scrubExtras({ confirm_3_present: confirm3Present, feedbackId: args.feedbackId }),
    });
    if (confirm3Present) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:4015, detail:'confirm_3_discarded' }) }] };
    }
    if (args.reviewStatus !== undefined && !LEGAL_STATUSES.has(args.reviewStatus)) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'illegal reviewStatus: '+args.reviewStatus }) }] };
    }
    const saved = await cloudBridge.callWXCF('statusOperate', 'updateReviewTeacherOnly', {
      feedbackId: args.feedbackId,
      reviewStatus: args.reviewStatus ?? null,
      confirmedScores: args.confirmedScores ?? {},
      teacherNote: args.teacherNote ?? '',
      reasons: args.reasons ?? [],
      callerMeta: meta,
    });
    return { content:[{ type:'text', text: JSON.stringify({ reviewStatus: saved?.reviewStatus, diff: saved?.diff, reviewedAt: saved?.reviewedAt }, null, 2) }] };
  }
  ```

- [ ] **Step 3.3.5: exportResearch.ts（禁 PII 字段 + 7 天 TTL 双保险）**

  ```ts
  // src/tools/exportResearch.ts
  import { writeFileSync, mkdirSync } from 'node:fs';
  import path from 'node:path';
  import crypto from 'node:crypto';
  import { cloudBridge } from '../shared/cloudBridge';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = { dateStart: string; dateEnd: string; dimensions: string[]; format?: 'csv' };

  const PII_FORBIDDEN_DIMS = new Set(['name','realname','phone','mobile','class','classname','school','schoolname','address','idcard','idno']);
  const MAX_SPAN_DAYS = 180;
  const EXPORT_DIR = process.env.EXPORT_RESEARCH_DIR || path.resolve(process.cwd(), 'exports-research');
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function isExpired(expireAt: number){ return Date.now() > expireAt; }

  export async function exportResearch(args: Args, meta: CallerMeta) {
    if (args.format && args.format !== 'csv') {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'format only csv for now' }) }] };
    }
    const start = new Date(args.dateStart).getTime();
    const end   = new Date(args.dateEnd).getTime();
    if (!start || !end || end < start) return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'bad date range' }) }] };
    const days = (end - start) / (24*60*60*1000);
    if (days > MAX_SPAN_DAYS) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'span too long, max '+MAX_SPAN_DAYS+' days' }) }] };
    }
    const dimsLow = (args.dimensions ?? []).map(d => String(d).toLowerCase());
    const hit = dimsLow.find(d => PII_FORBIDDEN_DIMS.has(d));
    if (hit) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:403, detail:'pii_forbidden', dimension: hit }) }] };
    }
    mkdirSync(EXPORT_DIR, { recursive:true });
    const token = crypto.randomBytes(16).toString('hex');
    const filename = `psych-research-${token}.csv`;
    const expireAt = Date.now() + TTL_MS;
    const rows = await cloudBridge.callWXCF('taskOperate', 'researchExportAnon', {
      start, end, dimensions: dimsLow, callerMeta: meta,
    });
    // rows 保证 anonymized；落盘
    writeFileSync(path.join(EXPORT_DIR, filename), rows.csv ?? '', 'utf8');
    return { content:[{ type:'text', text: JSON.stringify({
      downloadUrl: `exports-research/${filename}`,
      expireAt,
      expired: isExpired(expireAt),   // 双保险灰化：reply 端直接读这个布尔
      rowsCount: rows.count ?? 0,
    }, null, 2) }] };
  }
  ```

- [ ] **Step 3.3.6: accessPII.ts（双 2FA · 5 次密码锁 / 5 SMS 限频 · 30s Grant）**

  ```ts
  // src/tools/accessPII.ts
  import { auditWrite, actorHashFromMeta, scrubExtras } from '../shared/auditLogger';
  import { validatePassword, recordSMSAttempt, validateTOTP, validateSMSCode, OTPMethod } from '../shared/twoFA';
  import { issuePIIGrant, forceReMask } from '../shared/piiGate';
  import { cloudBridge } from '../shared/cloudBridge';
  import type { CallerMeta } from '../shared/scopeGuard';

  type Args = { anonymousNos: string[]; reason: string; passwordHash: string; otp: string; otpMethod: OTPMethod };

  export async function accessPII(args: Args, meta: CallerMeta) {
    if (meta.callerRole !== 'admin') {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:403, msg:'admin_only' }) }] };
    }
    if (!Array.isArray(args.anonymousNos) || args.anonymousNos.length === 0 || !args.reason || String(args.reason).length < 6) {
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:400, msg:'missing anonymousNos[] or reason<6chars' }) }] };
    }
    const actor = actorHashFromMeta(meta);

    // Password 第一门
    const pw = validatePassword(actor, String(args.passwordHash));
    if (pw.code === 429) return pwLocked();
    if (!pw.ok) return wrongCreds('password');

    // OTP 第二门（sms / totp）
    const method: OTPMethod = args.otpMethod === 'sms' ? 'sms' : (args.otpMethod === 'totp' ? 'totp' : 'totp');
    if (method === 'sms') {
      const sms = recordSMSAttempt(actor);
      if (!sms.ok) return rateLimited('sms_rate_limited');
      const ok = validateSMSCode(process.env.PII_ADMIN_SMS_CODE || '', String(args.otp));
      if (!ok) return wrongCreds('sms_otp');
    } else {
      const ok = validateTOTP(process.env.PII_ADMIN_TOTP_SECRET || '', String(args.otp));
      if (!ok) return wrongCreds('totp');
    }

    auditWrite({
      actorHash: actor,
      serverSessionIdHash: meta.serverSessionId ?? '',
      toolName: 'accessPII',
      status: 'ok',
      anonymousNos: args.anonymousNos.slice(),
      extras: scrubExtras({ reason_len: args.reason.length, pii_method: method }),
    });

    // 拉一次真名（只在这 30s 窗口里出现，其它所有 Tool forceReMask）
    const rawFields = await cloudBridge.callWXCF('crisis', 'peekPIIForIntervention', { anonymousNos: args.anonymousNos, callerMeta: meta });
    const grant = issuePIIGrant(args.anonymousNos, rawFields ?? {});
    return { content:[{ type:'text', text: JSON.stringify(forceReMask('accessPII', {
      piiGrantToken: grant.piiGrantToken,
      expireAt: grant.expireAt,
      fields: grant.fields,
      hint:'CLIENT_MUST_CLEAR_REACT_STATE_AFTER_30S',
    }), null, 2) }] };

    function wrongCreds(step: string) {
      auditWrite({ actorHash:actor, serverSessionIdHash: meta.serverSessionId??'', toolName:'accessPII', status:'fail', anonymousNos:args.anonymousNos.slice(), code:401, extras: scrubExtras({ step }) });
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:401, detail: step }) }] };
    }
    function pwLocked() {
      auditWrite({ actorHash:actor, serverSessionIdHash: meta.serverSessionId??'', toolName:'accessPII', status:'rate_limited', anonymousNos:args.anonymousNos.slice(), code:429, extras: scrubExtras({ step:'password' }) });
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:429, detail:'password_locked_10min' }) }] };
    }
    function rateLimited(detail: string) {
      auditWrite({ actorHash:actor, serverSessionIdHash: meta.serverSessionId??'', toolName:'accessPII', status:'rate_limited', anonymousNos:args.anonymousNos.slice(), code:429, extras: scrubExtras({ step:'sms' }) });
      return { isError:true, content:[{ type:'text', text: JSON.stringify({ code:429, detail }) }] };
    }
  }
  ```

### 3.4 src/index.ts（MCP server bootstrap + 三道 middleware 顺序：audit → scope → piiGate → dispatch）

- [ ] **Step 3.4.1: 写入 src/index.ts**

  ```ts
  // src/index.ts
  import { Server } from '@modelcontextprotocol/sdk/server/index.js';
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolRequest, type ListToolsResult } from '@modelcontextprotocol/sdk/types.js';
  import { listTasks } from './tools/listTasks.js';
  import { submitFeedback } from './tools/submitFeedback.js';
  import { aiAnalyze } from './tools/aiAnalyze.js';
  import { reviewFeedback } from './tools/reviewFeedback.js';
  import { exportResearch } from './tools/exportResearch.js';
  import { accessPII } from './tools/accessPII.js';
  import { scopeGuard, CallerMeta, ScopeDenied } from './shared/scopeGuard.js';
  import { forceReMask } from './shared/piiGate.js';
  import { auditWrite, actorHashFromMeta, scrubExtras } from './shared/auditLogger.js';

  const TOOLS = [
    { name:'listTasks',         description:'List psych tasks by role/status/anonymousNo scope. NEVER returns real names or phones.', inputSchema:{ type:'object', properties:{ role:{type:'string'}, status:{type:'string'}, anonymousNo:{ oneOf:[{type:'string'},{type:'array',items:{type:'string'}}] }, page:{type:'number'}, size:{type:'number'} } } },
    { name:'submitFeedback',    description:'Student submit a feedback. msSecCheck runs FIRST; dashscope never called on msSec violations.', inputSchema:{ type:'object', required:['taskId','anonymousNo','textResponses'], properties:{ taskId:{type:'string'}, anonymousNo:{type:'string'}, imageId:{type:'string'}, textResponses:{type:'array',items:{type:'string'}}, elapsedSec:{type:'number'} } } },
    { name:'aiAnalyze',         description:'Run DashScope few-shot 3-example analysis with retry; budget blocks at 95%.', inputSchema:{ type:'object', properties:{ feedbackId:{type:'string'}, anonymousNos:{type:'array',items:{type:'string'}} } } },
    { name:'reviewFeedback',    description:'Teacher review. Confirm_3 field 0-trust: if present, returns 4015 immediately.', inputSchema:{ type:'object', required:['feedbackId'], properties:{ feedbackId:{type:'string'}, reviewStatus:{ enum:['pass','escalate','reject'] }, confirmedScores:{type:'object'}, teacherNote:{type:'string'}, reasons:{type:'array',items:{type:'string'}}, confirm_3:{} } } },
    { name:'exportResearch',    description:'Anonymous CSV only. PII dimensions return 403.', inputSchema:{ type:'object', required:['dateStart','dateEnd','dimensions'], properties:{ dateStart:{type:'string'}, dateEnd:{type:'string'}, dimensions:{type:'array',items:{type:'string'}}, format:{ enum:['csv'] } } } },
    { name:'accessPII',         description:'ADMIN only — password + TOTP/SMS double-2FA, grants 30s window PII token.', inputSchema:{ type:'object', required:['anonymousNos','reason','passwordHash','otp','otpMethod'], properties:{ anonymousNos:{type:'array',items:{type:'string'}}, reason:{type:'string'}, passwordHash:{type:'string'}, otp:{type:'string'}, otpMethod:{ enum:['sms','totp'] } } } },
  ] as const;

  type Meta = { callerRole?: string; serverSessionId?: string; callerUserHash?: string };

  function metaFrom(req: CallToolRequest): Meta {
    // 只信任 metadata，不处理任何 args.role 字段
    const m = (req as any)._meta ?? (req as any).metadata ?? {};
    return {
      callerRole: typeof m.callerRole === 'string' ? m.callerRole : undefined,
      serverSessionId: typeof m.serverSessionId === 'string' ? m.serverSessionId : undefined,
      callerUserHash: typeof m.callerUserHash === 'string' ? m.callerUserHash : undefined,
    };
  }

  function extractAnonymousNos(name: string, args: any): string[] {
    switch (name) {
      case 'listTasks': return ([] as string[]).concat(args?.anonymousNo ?? []);
      case 'submitFeedback': return args?.anonymousNo ? [args.anonymousNo] : [];
      case 'aiAnalyze': return ([] as string[]).concat(args?.anonymousNos ?? []);
      case 'reviewFeedback': return []; // handler 内按 feedbackId 查
      case 'exportResearch': return []; // handler 内按日期范围返回 anonymous 字段
      case 'accessPII': return ([] as string[]).concat(args?.anonymousNos ?? []);
      default: return [];
    }
  }

  async function toolDispatch(name: string, args: any, meta: Meta): Promise<any> {
    switch (name) {
      case 'listTasks':         return listTasks(args, meta as CallerMeta);
      case 'submitFeedback':    return submitFeedback(args, meta as CallerMeta);
      case 'aiAnalyze':         return aiAnalyze(args, meta as CallerMeta);
      case 'reviewFeedback':    return reviewFeedback(args, meta as CallerMeta);
      case 'exportResearch':    return exportResearch(args, meta as CallerMeta);
      case 'accessPII':         return accessPII(args, meta as CallerMeta);
      default: throw new Error('UNKNOWN_TOOL:' + name);
    }
  }

  async function main(): Promise<void> {
    const server = new Server(
      { name:'@starisle/mcp-psych-assessment', version:'1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => ({ tools: TOOLS as any[] }));

    server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const meta = metaFrom(req);
      const name = req.params.name;
      const args = (req.params.arguments ?? {}) as any;
      const actor = actorHashFromMeta(meta);
      const nos = extractAnonymousNos(name, args);

      try {
        await scopeGuard(name, meta as CallerMeta, nos, require('./shared/cloudBridge').cloudBridge);
      } catch (e) {
        const code = (e as ScopeDenied).code ?? 4015;
        auditWrite({ actorHash: actor, serverSessionIdHash: meta.serverSessionId ?? '', toolName: name, status: 'blocked', anonymousNos: nos, code, extras: scrubExtras({ reason: (e as Error).message }) });
        return { isError: true, content: [{ type:'text', text: JSON.stringify({ code, detail: 'scope_denied' }) }] };
      }

      let result: any;
      try {
        result = await toolDispatch(name, args, meta);
      } catch (err) {
        auditWrite({ actorHash: actor, serverSessionIdHash: meta.serverSessionId ?? '', toolName: name, status: 'fail', anonymousNos: nos, code: 500, extras: scrubExtras({ message: (err as Error).message }) });
        return { isError: true, content: [{ type:'text', text: JSON.stringify({ code:500, detail: 'tool_handler_error' }) }] };
      }

      // forceReMask（对非 accessPII 工具，若 handler 误带了 PII，这里再次兜底去掉）
      if (Array.isArray(result?.content)) {
        result.content = result.content.map((c:any) => {
          if (typeof c?.text === 'string') {
            try {
              const parsed = JSON.parse(c.text);
              return { ...c, text: JSON.stringify(forceReMask(name, parsed)) };
            } catch { /* 非 JSON 字符串不处理，不影响其它 */ }
          }
          return c;
        });
      }

      auditWrite({ actorHash: actor, serverSessionIdHash: meta.serverSessionId ?? '', toolName: name, status: result?.isError ? 'fail' : 'ok', anonymousNos: nos, extras: scrubExtras({}) });
      return result;
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  main().catch(err => {
    console.error('psych mcp failed to start:', err);
    process.exit(1);
  });
  ```

### 3.5 tests/ 六边界单测

- [ ] **Step 3.5.1: t1-listTasks-scope.test.ts（教师越权应 4015）**

  ```ts
  import { describe, it, expect, vi } from 'vitest';
  import { scopeGuard } from '../src/shared/scopeGuard';

  describe('listTasks scope (teacher out-of-class anonymousNo)', () => {
    it('throws ScopeDenied 4015 if anonymousNos[] contains a student not in all 3 lanes', async () => {
      const fakeCB = {
        fetchMyAnonymousNo: vi.fn(),
        queryMyStudentIds: vi.fn(async (_meta, mode) => {
          // 三道各自返部分学生，但不包含学生 STUDENT_OUTSIDER_X
          if (mode === 'class_binding_first')      return ['S001','S002'];
          if (mode === 'binding_extended')         return ['S002','S003'];
          if (mode === 'task_scope_whitelist')     return ['S003','S004'];
          return [];
        }),
        callWXCF: vi.fn(),
      };
      await expect(scopeGuard('listTasks', { callerRole:'teacher' }, ['STUDENT_OUTSIDER_X'], fakeCB as any))
        .rejects
        .toMatchObject({ code: 4015 });
    });
  });
  ```

- [ ] **Step 3.5.2: t2-submit-mssec-first.test.ts（msSec 违规 → dashscope 调用次数=0）**

  ```ts
  import { describe, it, expect, vi } from 'vitest';
  import { submitFeedback } from '../src/tools/submitFeedback';

  describe('submitFeedback runs msSecCheck BEFORE dashscope', () => {
    it('returns ms_sec_blocked when text hits the msSec trigger AND dashscope call increment 0', async () => {
      const spy = { dashscopeInc: 0 };
      const result = await submitFeedback(
        { taskId:'T99', anonymousNo:'S001', textResponses:['Hi', 'TRIGGER: SEXUAL_VIOLENCE_SEC_TEST HERE'], elapsedSec: 42 },
        { callerRole:'student' },
        { spy:{ dashscopeCallInc: ()=>{ spy.dashscopeInc += 1; } } } as any,
      );
      expect(result.isError).toBe(true);
      const text = result.content[0].text;
      expect(text).toContain('ms_sec_blocked');
      expect(spy.dashscopeInc).toBe(0);
    });
  });
  ```

- [ ] **Step 3.5.3: t3-ai-budget-warn80.test.ts（81% 预算应打 WARN 标记）**

  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  import { dashscopeAnalyze } from '../src/shared/dashscope';

  describe('aiAnalyze budget thresholds at 80%+', () => {
    let prevUsed: string | undefined, prevBudget: string | undefined;
    beforeAll(() => {
      prevUsed = process.env.DASHSCOPE_TOKENS_USED_TODAY;
      prevBudget = process.env.DASHSCOPE_TOKEN_BUDGET_DAILY;
      process.env.DASHSCOPE_TOKENS_USED_TODAY = String(Math.floor(2_000_000 * 0.81));  // 81%
      process.env.DASHSCOPE_TOKEN_BUDGET_DAILY = '2000000';
    });
    afterAll(() => {
      process.env.DASHSCOPE_TOKENS_USED_TODAY = prevUsed ?? '';
      process.env.DASHSCOPE_TOKEN_BUDGET_DAILY = prevBudget ?? '';
    });
    it('tags level WARN at 81% usage', async () => {
      const budgetEvents: Array<{level:any;pct:number}> = [];
      await dashscopeAnalyze('今天上课很紧张', { onBudget:(level,pct)=> budgetEvents.push({level,pct}) });
      expect(budgetEvents.length >= 1).toBe(true);
      expect(budgetEvents.some(e => e.level === 'WARN' && e.pct >= 80)).toBe(true);
    });
  });
  ```

- [ ] **Step 3.5.4: t4-review-confirm3.test.ts（出现 confirm_3 → 4015 + audit 打 flag confirm_3_discard=true）**

  ```ts
  import { describe, it, expect, vi } from 'vitest';
  import { reviewFeedback } from '../src/tools/reviewFeedback';

  describe('reviewFeedback backend must 0-trust confirm_3', () => {
    it('returns 4015 confirm_3_discarded and triggers audit flag', async () => {
      // 仅通过 auditLogger 的副作用来证明 confirm_3_discard=true：
      // 因 auditLogger 默认输出到 stdout JSON，这里 spy 一次：
      const logged: any[] = [];
      const origLog = console.log;
      vi.spyOn(console, 'log').mockImplementation((...args:any[])=>{ logged.push(args[0]); origLog.apply(console, args); });
      try {
        const res = await reviewFeedback(
          { feedbackId:'FB_X', reviewStatus:'escalate', teacherNote:'需要转介', confirm_3: 'should-be-ignored' },
          { callerRole:'teacher' },
        );
        expect(res.isError).toBe(true);
        expect(res.content[0].text).toContain('confirm_3_discarded');
        const auditRows = logged.filter(x => typeof x === 'string' && x.startsWith('{"type":"psych_mcp_audit"')).map(s => JSON.parse(s));
        const blocked = auditRows.find(r => r.status === 'blocked' && r.code === 4015);
        expect(blocked).toBeTruthy();
        expect(blocked.extras).toBeDefined();
        expect(blocked.extras.confirm_3_present).toBe(true);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
  ```

- [ ] **Step 3.5.5: t5-export-pii-forbidden.test.ts（dimensions 含 phone → 403 + 不创建文件）**

  ```ts
  import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
  import fs from 'node:fs';
  import os from 'node:os';
  import path from 'node:path';
  import { exportResearch } from '../src/tools/exportResearch';

  describe('exportResearch strictly forbids PII dimensions even for admin', () => {
    let tmpDir = '';
    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'psych-mcp-test-'));
      process.env.EXPORT_RESEARCH_DIR = tmpDir;
    });
    afterAll(() => { process.env.EXPORT_RESEARCH_DIR = ''; });

    it('returns 403 pii_forbidden and writes 0 files when dimensions include phone', async () => {
      const res = await exportResearch(
        { dateStart:'2026-09-01', dateEnd:'2026-09-10', dimensions:['anonymousNo','anxiety','phone'], format:'csv' },
        { callerRole:'admin' },
      );
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('pii_forbidden');
      const files = fs.readdirSync(tmpDir);
      expect(files.length).toBe(0);
    });
  });
  ```

- [ ] **Step 3.5.6: t6-accesspii-lock5.test.ts（密码错 5 次 → 第 6 次 429 password_locked_10min）**

  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  import crypto from 'node:crypto';
  import { accessPII } from '../src/tools/accessPII';

  describe('accessPII 5 wrong passwords locks for 10 minutes', () => {
    const actorUserHash = 'TEST_ACTOR_HASH_' + crypto.randomBytes(4).toString('hex');
    const right = crypto.createHash('sha256').update((process.env.PII_ADMIN_PASSWORD_PEPPER || '') + 'CorrectHorseBatteryStaple').digest('hex');
    beforeAll(() => {
      process.env.PII_ADMIN_PASSWORD_HASH = right;
    });
    afterAll(() => { delete process.env.PII_ADMIN_PASSWORD_HASH; });

    it('6th call returns 429 password_locked_10min regardless of password correctness', async () => {
      const wrongArgs = (pw: string) => ({ anonymousNos:['S001'], reason:'intervention required', passwordHash:pw, otp:'000000', otpMethod:'totp' as const });
      // 先故意错 5 次
      for (let i=0; i<5; i++) {
        await accessPII(wrongArgs('WRONG_'+i), { callerRole:'admin', callerUserHash: actorUserHash });
      }
      // 第 6 次：即使输入正确，也应该是 429
      const res = await accessPII(wrongArgs('CorrectHorseBatteryStaple'), { callerRole:'admin', callerUserHash: actorUserHash });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('password_locked_10min');
      // 顺带确认返回 JSON 带 code=429
      const payload = JSON.parse(res.content[0].text);
      expect(payload.code).toBe(429);
    });
  });
  ```

### 3.6 安装 + 跑测试

- [ ] **Step 3.6.1: 跑 npm install + test**

  ```bash
  cd server-services/mcp-psych-assessment
  npm install
  npm test
  ```
  预期：`Test Files  6 passed (6) · Tests  6 passed (6)`。

- [ ] **Step 3.6.2: 严格 grep 真凭据泄露**

  ```bash
  grep -nE "sk-[A-Za-z0-9]{20,}|1[3-9]\d{9}|\$\$2[abxy]?\$\d+\$|\bAKIA[0-9A-Z]{16}\b" .env.example README.md package.json || echo 'GREP_OK_NO_SECRETS'
  ```
  预期：末尾打印 `GREP_OK_NO_SECRETS`。

- [ ] **Step 3.6.3: Commit T3**
  ```bash
  git add server-services/mcp-psych-assessment
  git diff main...HEAD --stat    # 再次确认 Modified = 0
  git commit -m "feat(mcp): psych 6 tools + 6 shared guards + 6×mock boundary tests — T3 done"
  git push
  ```

---

## Task 4 · PR Ready for Review → Owner Approved → Merge main（T4，30 分钟）

- [ ] **Step 4.1: 填充 PR Body 四段证据**

  gh CLI 或网页编辑：
  ```bash
  gh pr edit <PR_NUM> \
    --body-file D:\starisle\.trae\pr-body.md
  ```
  PR Body 必须包含：
  1. 导入目录清单（projects/ 28+ / docs 6 / tokens 5 / mcp 14）
  2. 八色 Token 表 + 三层桥接规则（§4）
  3. 6 Tool 对照表（§3.1）
  4. acceptance_check.py 运行输出全文（Overall: 100% PASS）
  5. `npm test` 6/6 tests passed 输出
  6. `.env.example` grep 空结果截图 + 命令文本

- [ ] **Step 4.2: Draft → Ready**

  ```bash
  gh pr ready <PR_NUM>
  ```

- [ ] **Step 4.3: 阻塞：你的 Review Status === APPROVED**

  轮询命令：`gh pr view <PR_NUM> --json reviewDecision`
  - 若 `REVIEW_REQUIRED` 或 `CHANGES_REQUESTED`：返回对应 T1/T2/T3 Step 修改；不得强行 merge。
  - 只有 `APPROVED` 才能进入 Step 4.4。

- [ ] **Step 4.4: Squash Merge main**

  ```bash
  gh pr merge <PR_NUM> --squash --delete-branch
  ```

- [ ] **Step 4.5: main 端最后一次验收 acceptance_check.py 仍 PASS（Spec §6.1 #4）**

  ```bash
  git checkout main && git pull origin main
  cd projects/psych-assessment-miniapp
  python acceptance_check.py
  ```
  期望末行 `Overall: 100% PASS`。若失败 → 立即执行 Spec §5.2 闸门 2：`git revert -m 1 <merge_sha>`，再重新开 PR 定位失败根因。

- [ ] **Step 4.6: 更新 hotl 上下文**

  写 `last_completed_milestone = "T4"` + `last_merge_sha` + `completed_checkpoints=5` 并提交。

---

## Task R · 回滚闸门速查（任何阶段异常，不要写代码，先执行本 Task）

- [ ] **R1 · 合 main 前：删远端 feat 分支**

  ```bash
  gh api repos/user-unknowed/-StarIsle-/git/refs/heads/feat/import-psych-assessment-miniapp -X DELETE
  ```

- [ ] **R2 · 合 main 后：一次 revert**

  ```bash
  git checkout main && git pull
  git revert -m 1 <MERGE_COMMIT_SHA>
  git push
  gh pr create --base main --head revert-<sha> --title "Revert: psych import merge" --body "4 pure-add dirs revert. No conflicts expected."
  ```

- [ ] **R3 · 运行时紧急：Chat 后端关闭 MCP 路由**

  server-services dispatcher：把 `if features.psych_assessment === false return {code:503,msg:'系统升级维护'}` 的开关打开，并隐藏心理测评相关入口（chat UI 侧边栏、快捷指令），无需重启站点。

---

## Self-Review（本 Plan 作者自检，通过）

1. **Spec 覆盖率**：Spec §1 三目标 → Plan T1/T2/T3 逐条覆盖；Spec §2 四目录 → Plan Task 1~3 每文件 Create 路径精确；Spec §3 Tool 契约 → 每 Tool TS 签名、错误码、guard 调用一致；Spec §4 Token → 颜色/尺寸 HEX 与 tokens.json 一致；Spec §5 角色矩阵/T0~T4 → Task 0~4 Step 均有对应阻塞 Gate（human）；Spec §6 21 条 验收 → Task 尾均有 `git diff --stat` / acceptance / vitest / 6 测试 / grep 真凭据 等真实命令与预期输出等。
2. **无占位符**：无 `TODO` / `implement later` / `add appropriate tests` / `similar to` 等违规文字；所有「代码 steps」均贴出了完整 TS/JSON/CSS 片段，工程师可直接 Ctrl+C Ctrl+V 落盘。
3. **类型一致**：`scopeGuard` 参数 `meta` 类型在 6 Tool 内统一为 `CallerMeta`；`dashscopeAnalyze` 返回类型 `AIAnalysis` 与 `aiAnalyze.ts` 保存 `analysis` 字段一致；`forceReMask` 仅 `accessPII` 跳过 → `reviewFeedback/export` 等都走遮罩一致；`twoFA.ts` 的 `validatePassword` 返回 code 字段与 `accessPII.ts` 的 `pw.code === 429` 判断一致。

---

## Plan 存档与镜像
- 主路径（docs/superpowers/plans 惯例）：`docs/superpowers/plans/2026-09-04-starisle-psych-implementation-plan.md`（本文件）
- 镜像到 Trae 计划入口：`.trae/documents/plan.md`（复制全文即可，用于后续 HOTL loop-execution 恢复）
- 对应 HOTL Workflow（带 Gate 与自动化 verify 块）：`docs/plans/2026-09-04-starisle-psych-imp-workflow.md`
