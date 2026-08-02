# 通过 GitHub 插件开 PR 并合并 feat-web-frontend-app-GDsero → main

> 创建日期：2026-08-02
> 仓库：`user-unknowed/-StarIsle-`（origin: https://github.com/user-unknowed/-StarIsle-.git）
> 源分支：`feat-web-frontend-app-GDsero`（本地 fee389a，未推送到 origin）
> 目标分支：`main`（origin/main = ce1cb86）
> 用户已对 12 个文件的变更摘要"审核通过"，要求以"开 PR 并合并"方式发布到 GitHub。

---

## 一、Summary 概述

用户已审核通过 `feat-web-frontend-app-GDsero` 相对 `main` 的 12 个文件变更（AI 对话功能开关 + GitHub Pages 部署）。本计划使用 `trae-remote-official:github` 插件完成发布：推送功能分支 → 用 GitHub MCP 开 PR → 合并 PR → 同步本地 main。

注意：本地 `main`（7fa3653，领先 origin/main 4 个提交）已含合并提交，但 origin/main 尚未包含这些变更。PR 将以 origin/main（ce1cb86）为 base，diff 恰为用户审核的 12 个文件。合并后需将本地 main 重置到 origin/main 以对齐历史。

---

## 二、Current State Analysis 现状分析

### 2.1 Git 状态（已探查确认）
- 当前工作树：`C:\Users\ababa\.trae-cn\worktrees\-StarIsle-\feat-web-frontend-app-GDsero`，分支 `feat-web-frontend-app-GDsero`，工作树干净。
- `feat-web-frontend-app-GDsero` = `fee389a`（`docs: add web-frontend ai-disabled github pages deployment plan`），其上还有 `8ba0852`（`feat(web-frontend): 屏蔽 AI 对话功能并新增 GitHub Pages 部署`），基于 `ce1cb86`。
- 该分支**无 upstream**，origin 上不存在（`gh api .../branches/feat-web-frontend-app-GDsero` 返回 404）。
- 本地 `main` = `7fa3653`（`Merge branch 'feat-web-frontend-app-GDsero'`），含两个本地合并提交（`5e8e517`、`7fa3653`），**领先 origin/main 4 个提交**，checked out 于另一工作树 `G:/B_proj/Big_proj/-StarIsle-`。
- `origin/main` = `ce1cb86`（`Merge pull request #4 from user-unknowed/chore/rename-chinese-folders`）。
- merge-base(local main, feat) = `fee389a` = feat 本身（feat 已是本地 main 的祖先）。

### 2.2 PR diff 预期
- PR base = origin/main（`ce1cb86`），head = feat（`fee389a`）。
- diff = 2 个提交（`8ba0852` + `fee389a`）= 用户审核通过的 12 个文件（与首步 `git diff main...feat` 输出一致）。

### 2.3 GitHub 仓库设置（已探查）
- `gh` CLI v2.96.0，已认证为 `user-unknowed`（GH_TOKEN），git 协议 https。
- 仓库 `user-unknowed/-StarIsle-`，default_branch=`main`。
- 合并设置：`allow_merge_commit=true`、`allow_rebase_merge=true`、`allow_squash_merge=false`、`delete_branch_on_merge=true`。
- 历史仅 1 个 PR（#4，已合并）。本分支无既有 PR。
- 分支保护 API 返回 403（token 无 admin 权限读取保护规则），但 PR #4 曾成功合并，推断 PR 合并可用；若 main 有必需状态检查，合并可能需等待 CI。

### 2.4 可用工具
- GitHub MCP（server `mcp_plugin_GitHub_github`）：`create_pull_request`（args: owner, repo, title, head, base, body, draft）、`merge_pull_request`（args: owner, repo, pullNumber, merge_method, commit_title, commit_message）。
- `gh` CLI（`C:\Program Files\GitHub CLI\`）作为 PR 创建/合并的回退。
- `git`（`C:\Program Files\Git\cmd\git.exe`）用于推送。
- 合并后 main 的 push 会触发 `.github/workflows/deploy-pages.yml`（构建并部署到 GitHub Pages，注入 `VITE_AI_CHAT_ENABLED=false`）——预期行为。

---

## 三、Proposed Changes 拟定变更（执行步骤）

### 步骤 1：确保 git 推送鉴权
**What**：运行 `gh auth setup-git` 配置 git 凭据助手，使 `git push` 到 github.com 可用 GH_TOKEN 鉴权。
**Why**：origin URL 不含凭据（`https://github.com/user-unknowed/-StarIsle-.git`），需 credential helper 供应 token。
**How**：`gh auth setup-git`（在 feat 工作树执行）。若已配置则无害。

### 步骤 2：推送功能分支到 origin
**What**：`git push -u origin feat-web-frontend-app-GDsero`，推送 `8ba0852`、`fee389a` 两个提交并设置 upstream。
**Why**：GitHub PR 的 head 分支必须存在于 origin。
**How**：在 feat 工作树用完整路径 git 执行推送。推送后用 `gh api .../branches/feat-web-frontend-app-GDsero` 确认存在。
**回退**：若推送因鉴权失败，重跑 `gh auth setup-git` 后重试；若因远端已存在不同历史失败，停止并报告。

### 步骤 3：用 GitHub MCP 开 PR
**What**：调用 `create_pull_request`：
- `owner`: `user-unknowed`
- `repo`: `-StarIsle-`
- `title`: `feat(web-frontend): AI 对话功能开关与 GitHub Pages 部署`
- `head`: `feat-web-frontend-app-GDsero`
- `base`: `main`
- `draft`: `false`（用户已审核通过，开为 ready 而非 draft）
- `body`：（见下方 PR body）

**PR body**（Markdown，real newlines）：
```
## 概述
引入 AI 对话功能开关 VITE_AI_CHAT_ENABLED（默认启用，仅 GitHub Pages 演示部署时关闭），使现有 Web 应用可作为静态演示站点部署而不影响开发与 Docker 链路。同时新增 GitHub Pages 自动部署 workflow 与项目名 StarIsleONweb 标识。

## 变更内容
- 新增功能开关配置 src/config/features.ts，通过环境变量控制 AI 对话启停
- Header 三端 AI 对话入口保留但禁用（降透明度 + "即将上线"徽章 + Toast 提示）
- 三端 Chat 页面在功能关闭时渲染统一占位组件，保留紧急帮助按钮
- 新增 GitHub Pages 部署 workflow（构建时注入 VITE_AI_CHAT_ENABLED=false）
- 页面标题与登录页副标题新增 StarIsleONweb 项目名标识

## 影响
- 对现有开发与 Docker 部署零影响（开关默认启用）
- Pages 演示版本屏蔽 AI 对话但保留入口可见与危机帮助通道

## 验证
- 本地构建预览（VITE_AI_CHAT_ENABLED=false）已审核通过
- 默认构建回归 AI 对话功能正常
```

**Why**：用插件的 connector 优先路径开 PR，结构化数据优于本地 git。
**How**：`run_mcp` 调用 `create_pull_request`，记录返回的 `pullNumber` 与 PR URL。
**回退**：若 MCP 创建失败（如无法推断仓库/分支），用 `gh pr create --repo user-unknowed/-StarIsle- --base main --head feat-web-frontend-app-GDsero --title "..." --body-file <tmp>`。

### 步骤 4：用 GitHub MCP 合并 PR
**What**：调用 `merge_pull_request`：
- `owner`: `user-unknowed`
- `repo`: `-StarIsle-`
- `pullNumber`: 步骤 3 返回的编号
- `merge_method`: `merge`（仓库禁用 squash，允许 merge commit）
- `commit_title`: `Merge pull request #<n> from user-unknowed/feat-web-frontend-app-GDsero`
- `commit_message`: `AI 对话功能开关与 GitHub Pages 部署`

**Why**：用户审核通过，直接合并。
**How**：`run_mcp` 调用 `merge_pull_request`。
**注意**：若 main 有必需状态检查且未通过，合并会失败 → 改用 `gh pr merge <n> --merge --repo user-unknowed/-StarIsle-`，或等待/排查 CI（必要时路由到 `gh-fix-ci` skill）。合并后 origin 自动删除 head 分支（`delete_branch_on_merge=true`）。

### 步骤 5：同步本地 main（关键，避免历史分叉）
**What**：合并后 origin/main 含 GitHub 生成的 merge commit，本地 main（7fa3653，含本地合并提交 5e8e517/7fa3653）与之分叉。需在 main 所在工作树 `G:/B_proj/Big_proj/-StarIsle-` 将本地 main 对齐到 origin/main。
**Why**：避免后续 `git push origin main` 因分叉冲突；丢弃冗余的本地合并提交，采用 GitHub 合并历史。内容相同（均含 feat 的 12 文件变更），重置安全。
**How**：
1. 先检查 main 工作树是否干净：`git -C "G:/B_proj/Big_proj/-StarIsle-" status -sb`。若有未提交改动，**停止并报告**，不自动重置。
2. 干净则：`git -C "G:/B_proj/Big_proj/-StarIsle-" fetch origin` → `git -C "G:/B_proj/Big_proj/-StarIsle-" reset --hard origin/main`。
3. 确认：`git -C "G:/B_proj/Big_proj/-StarIsle-" log --oneline -3` 顶部为 GitHub 的 merge commit。

**说明**：因 main 在另一工作树 checked out，无法在当前 feat 工作树用 `git branch -f main` 更新其引用，必须到该工作树操作。

### 步骤 6：清理本地功能分支（可选）
**What**：合并后远端 head 分支已被自动删除；本地 `feat-web-frontend-app-GDsero` 为当前工作树分支，可保留或切换后删除。
**Why**：整洁；非必需。
**How**：若用户希望删除，需先切到其他分支（如 main）再 `git branch -D feat-web-frontend-app-GDsero`，并考虑移除该 worktree。**默认保留**，由用户决定。

### 步骤 7：小规模网页测试（过关条件，必做）
**What**：合并触发 `deploy-pages.yml` 部署到 GitHub Pages 后，对部署站点做小规模浏览测试——逐页访问，**每个页面能看见其内容（非空白/非 404）即视为过关**。
**Why**：用户明确的过关条件；验证 Pages 静态部署在 HashRouter + 相对路径下各路由可渲染。
**How**：
1. 等待 deploy-pages 工作流完成：轮询 `gh run list --repo user-unknowed/-StarIsle- --workflow=deploy-pages.yml --limit 1 --json status,conclusion,databaseId`，至 `status=completed`；若 `conclusion != success`，先排查（路由到 `gh-fix-ci`）。
2. 取 Pages URL：`gh api repos/user-unknowed/-StarIsle-/pages --jq .html_url`（预期形如 `https://user-unknowed.github.io/-StarIsle-/`）。若 Pages 未启用（404），回退本地预览测试：在 `web-frontend/` 执行 `VITE_AI_CHAT_ENABLED=false npm run build` + `npm run preview`，取本地预览 URL。
3. 用 browser 子代理（`browser_use`）访问站点并逐路由验证内容可见。HashRouter 路由用 `/#/...`：
   - 登录页 `/#/`：标题"星屿心理健康管理系统"+ StarIsleONweb 副标题可见。
   - 完成登录（选角色 + 登录，依赖 mock 降级）后逐页：
     - 学生：`/#/student`（今日心情）、`/#/student/chat`（应为 AI 禁用占位页）、`/#/student/relax`、`/#/student/profile`
     - 教师：`/#/teacher`、`/#/teacher/chat`（禁用占位）、`/#/teacher/relax`、`/#/teacher/profile`
     - 家长：`/#/parent`、`/#/parent/chat`（禁用占位）、`/#/parent/children`、`/#/parent/emergency`、`/#/parent/profile`
   - 每页用 `browser_snapshot`/`browser_take_screenshot` 确认有可见正文内容（非空白、无整页 404/白屏）。
4. **过关判定**：上述全部页面均可见内容 → 通过；任一页空白/404 → 不通过，记录该页并排查（可能是 base 路径/资源 404 或路由问题）。
**注意**：仅验证"内容可见"，不做功能深度测试（不验证真实对话、真实 API），符合"小规模测试"要求。

---

## 四、Assumptions & Decisions 假设与决策

| 项 | 决策 | 理由 |
|----|------|------|
| 发布方式 | 开 PR 并合并（用户选定） | 用户在澄清问题中明确选择 |
| PR head | `feat-web-frontend-app-GDsero`（fee389a） | 含用户审核的 2 提交/12 文件；origin/main 为 base |
| PR draft | 否（ready） | 用户已审核通过 |
| 合并方法 | `merge`（merge commit） | 仓库禁用 squash；merge commit 与历史 PR #4 风格一致 |
| 本地 main 处理 | 合并后 `reset --hard origin/main`（仅在 main 工作树干净时） | 本地 main 含冗余合并提交且与 origin 分叉；内容相同，重置安全 |
| 推送鉴权 | `gh auth setup-git` 预配置 | origin URL 无凭据 |
| MCP 优先 | `create_pull_request` / `merge_pull_request` | 插件 connector 优先；`gh` 为回退 |
| 必需状态检查 | 未知（保护 API 403） | 若合并被阻塞，回退 `gh pr merge` 或路由 `gh-fix-ci` |
| 功能分支清理 | 默认保留 | 当前工作树分支；删除需切分支，由用户决定 |
| deploy-pages 触发 | 预期 | main push 后自动构建部署 Pages（AI 屏蔽），符合设计 |
| 过关条件 | 逐页浏览、每页可见内容即通过 | 用户明确要求；用 browser 子代理验证，仅看内容可见不做功能深测 |
| 测试站点 | 优先部署后的 Pages 站点，未启用则回退本地 preview | 验证真实部署效果；本地 preview 作兜底 |

---

## 五、Verification 验证步骤

1. **分支推送**：`gh api repos/user-unknowed/-StarIsle-/branches/feat-web-frontend-app-GDsero` 返回 200 且 sha=fee389a。
2. **PR 创建**：MCP 返回 pullNumber 与 PR URL；`gh pr view <n> --repo user-unknowed/-StarIsle-` 显示 base=main、head=feat、12 文件。
3. **PR 合并**：`gh pr view <n> --json state,mergedAt` 显示 MERGED；origin/main 顶部为 GitHub merge commit。
4. **origin/main 内容**：`gh api repos/user-unknowed/-StarIsle-/branches/main --jq .commit.sha` 已前进；`gh api .../contents/web-frontend/src/config/features.ts` 存在。
5. **本地 main 同步**：`git -C "G:/B_proj/Big_proj/-StarIsle-" log --oneline -1` = GitHub merge commit；`git -C "G:/B_proj/Big_proj/-StarIsle-" status -sb` 显示与 origin/main 同步。
6. **Pages 部署**：`gh run list --repo user-unknowed/-StarIsle- --workflow=deploy-pages.yml --limit 1 --json status,conclusion` 显示 `completed/success`；`gh api repos/user-unknowed/-StarIsle-/pages --jq .html_url` 返回站点 URL。
7. **网页过关测试（用户过关条件）**：按步骤 7 逐页浏览，**全部页面可见内容 → 通过**；任一空白/404 → 不通过并排查。此为最终过关门槛。

---

## 六、不在范围内
- 不修改任何源码（变更已在 feat 分支，审核通过）。
- 不处理 Gitee 远端（仅 origin/GitHub）。
- 不重命名仓库（部署阶段事项，本计划外）。
- 不强制推送 main（`reset --hard` 仅作用于本地 main 对齐 origin）。
