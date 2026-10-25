# DeepSeek 网页版（chat.deepseek.com）逆向分析报告

| 项目 | 内容 |
|------|------|
| 分析目标 | https://chat.deepseek.com/ |
| 构建 commit | `fd5d6ec3`（壳页 `meta[name="commit-id"]`） |
| 分析日期 | 2026-10-17 |
| 分析方法 | `web-app-reverse` 六阶段网页逆向流水线（静态取证 + 公开资料交叉核验） |
| 交付格式 | Markdown + HTML 双格式 |

---

## 1. 概述与核心结论

1. **当前线上模型为 DeepSeek-V4.1-Flash-1017**（2026-10-17 官方宣布网页 / App / API 三端同步）。但客户端代码中**不存在任何硬编码模型表**——模型清单、上下线状态、展示名全部由服务端 feature store 远程下发。
2. 前端技术栈：**rspack 构建 + React 渲染 + Rust/WASM（SHA3）+ PWA**。双 bundle（vendors + main）合计约 2.6 MB，带 SRI 完整性校验。
3. 会话为**树状结构**（`parent_message_id` / `child_message_id`），补全请求携带 `thinking_enabled` / `search_enabled` 能力开关。
4. 反滥用三层：**PoW 挑战（WASM SHA3 求解）+ hCaptcha + Cloudflare Turnstile**。
5. 遥测走**火山引擎 DataFinder**（app_id `0x13145AD`），可被远程开关（`volcengine_enabled`）；前端共 4 组远程 feature store。
6. **训练过程细节不存在于客户端代码中**。客户端逆向只能证明推理侧门面（模型 ID / 开关 / 端点）；训练方法论来自 DeepSeek 官方公开技术报告（本报告第 8 节，明确标注为非逆向结论）。

---

## 2. 分析方法与证据边界

### 2.1 流程

| 阶段 | 动作 | 产物 |
|------|------|------|
| Phase 0 | 拉取壳页（带浏览器 UA + Referer） | index.html（~8.5 KB） |
| Phase 1 | 枚举并下载静态资源 | main.js / vendors.js / manifest.json / wasm |
| Phase 2 | 构建系统与指纹识别 | rspack chunk 命名、commit-id、SRI、meta 注入 |
| Phase 3 | 壳页内联脚本取证 | 遥测启动链路、feature store 读取、兜底错误页 |
| Phase 4 | bundle 定向正则 sweep | 9 类模式：模型配置 / API 面会话 / 能力开关 / PoW / 认证 / 遥测 / 搜索 / 深链模式 / 远程配置 |
| Phase 5 | 公开资料交叉核验 | 官方公告 + arXiv 技术报告（标注非逆向结论） |
| Phase 6 | 报告产出 | 本文档（md + html） |

### 2.2 证据分级

- **A 类**：客户端静态证据（壳页 / bundle 字符串，可直接复核）
- **B 类**：公开资料（官方公告、arXiv 论文）——**非逆向结论**，仅用于补齐客户端不可见的部分

> 压缩后 JS 为单行巨串，全程采用 PowerShell `[regex]::Matches` + 上下文窗口定向取证，避免整行倾泻。

---

## 3. 技术栈与整体架构

### 3.1 技术栈

| 层 | 技术 | 证据（A 类） |
|----|------|-------------|
| 构建 | rspack | `self.rspackChunk_deepseek_chat` chunk 注册器 |
| UI | React | bundle 内 React runtime 特征 |
| 加密计算 | Rust → WASM（SHA3） | `static/sha3_wasm_bg.7b9ca65ddd.wasm`（wasm-bindgen `bg` 命名） |
| 遥测 | 火山引擎 DataFinder v5.2.11 | `collect-rangers-v5.2.11.js` |
| 人机验证 | hCaptcha / Cloudflare Turnstile | SDK 引用与配置字段 |
| 认证 | Apple OAuth / 微信 JS-SDK / Passkey / OTP | 端点与凭证字段（见 6.3） |
| PWA | manifest.json（standalone） | 192/512 图标、独立窗口模式 |

### 3.2 架构图

```
┌────────────────────────── 浏览器 ──────────────────────────┐
│  壳页 index.html (meta: commit-id / ip / region)           │
│    ├── default-vendors.js  (0.98 MB, SRI)                  │
│    ├── main.js             (1.49 MB, SRI)  React SPA       │
│    ├── sha3_wasm_bg.wasm   (Rust SHA3, PoW 求解)            │
│    └── feature store ×4    (localStorage, 服务端下发)        │
└──────┬─────────────────────────┬───────────────────────────┘
       │ /api/v0/* (45 端点)      │ 遥测
       ▼                         ▼
  chat.deepseek.com          gator/tab.volces.com
  ├─ chat/completion         (火山引擎 DataFinder,
  ├─ chat/create_pow_challenge   app_id 0x13145AD,
  ├─ index/prepare + /query      远程开关 volcengine_enabled)
  └─ 认证 / 会话 / 文件 …
       │
       ▼
  hif-leim / hif-dliq.deepseek.com (搜索 poller, 生产)
  hif-test.deepseek.com            (测试环境, 客户端可见)
```

### 3.3 静态资源清单

| 资源 | 大小 | 说明 |
|------|------|------|
| index.html | ~8.5 KB | 壳页，含内联遥测启动与错误兜底脚本 |
| default-vendors.3473f64207.js | 1,031,463 B (~0.98 MB) | 第三方依赖 bundle，SRI 保护 |
| main.a0ce88b684.js | 1,563,408 B (~1.49 MB) | 业务主 bundle，SRI 保护 |
| main.4591aecc90.css | — | 主样式表 |
| static/sha3_wasm_bg.7b9ca65ddd.wasm | — | Rust SHA3 WASM（PoW） |
| manifest.json | 491 B | PWA 清单（standalone） |
| 静态 CDN | — | fe-static.deepseek.com；品牌图 cdn.deepseek.com |

---

## 4. 壳页与构建指纹（A 类）

- **commit-id `fd5d6ec3`**：`meta[name="commit-id"]`，同时作为遥测 `commit_id` 字段上报。
- **服务端注入 meta**：
  - `meta[name="ip"]`——用户出口 IP（本次样例 `120.231.***.***`，已脱敏）
  - `meta[name="region"]`——`CN` / 海外，驱动国内/海外分支逻辑与遥测 `ds_region`
- **SRI 完整性**：双 bundle 均带 `sha384` integrity，`onerror` 触发 `_sriCk` 兜底：
  - 渲染 i18n 错误页（en / zh 文案内联于壳页），提供"重新加载"按钮
  - 上报 `scriptLoadError` 事件（含 `ds_src`、`dsp__commitId`、`ds_duration`、`ds_encodedBodySize`）
- **blankScreenCheck**：10 秒超时（`timeoutMs: 1e4`），检测 `#root` 是否空白，并核对三类资源加载状态（main.js / main.css / default-vendors.js 正则匹配 `performance` 资源条目），产出 `loaded / failed / missing` 状态串。
- **遥测启动采用"settlement"缓冲**：feature store 状态未知（`unknown`）时，启动回调先入 `__ds_report_settlers` 队列缓冲；后续读取 `localStorage["__ds_remote_feature_store"]`（schemaVersion 2）中 `volcengine_enabled` 的值决定是否真正加载 DataFinder SDK（`enabled` / `disabled` / 继续等待）。
- **翻译屏蔽**：`notranslate` / `translate="no"`，防止机器翻译破坏 UI 文案。

---

## 5. 模型识别

### 5.1 客户端零硬编码模型表（A 类）

模型可用性**完全服务端热控**：

- `model_configs` 数组由远程 feature store `__ds_remote_feature_store_model` 下发；
- 单条模型配置字段：`model_type` / `enabled` / `switchable` / `show_model_name_in_session` / `name`；
- 含义：模型上下线、可切换性、会话内展示名均可在不发版的情况下调整；前端不含任何模型版本字符串表；
- 遥测事件 `selected_model_switch` 携带 `model_switch_reason`，服务端可分析用户切换模型的原因。

### 5.2 能力开关与模式（A 类）

| 机制 | 取值 | 说明 |
|------|------|------|
| URL 深链 | `mode ∈ {default, expert, vision}` | 直接进入对应模式会话 |
| 请求级开关 | `thinking_enabled` / `search_enabled` | 思考链 / 联网搜索 |
| 重新生成选项 | `verbosity_high` / `verbosity_low` | 输出详略控制 |

### 5.3 补全请求载荷（A 类）

```
chat_session_id, parent_message_id, child_message_id,
model_type, prompt, ref_file_ids,
thinking_enabled, search_enabled,
source, action, user_options
```

`parent/child message id` 表明会话为**树状结构**（支持分支/重新生成）；`ref_file_ids` 引用文件上传体系。

### 5.4 当前模型结论（B 类，公开资料，非逆向结论）

- **2026-10-17 官方公告**：网页 / App / API 同步为 **DeepSeek-V4.1-Flash-1017**。
- V4 系列参数：V4-Flash **284B 总参 / 13B 激活**（MoE）、V4-Pro 1.6T 总参 / 49B 激活、**1M 上下文窗口**。
- 旧 API 模型名 `deepseek-chat` / `deepseek-reasoner` 已映射至 v4-flash 的非思考 / 思考模式。
- 与客户端证据吻合：`thinking_enabled` 开关 ↔ 思考/非思考双模式发布形态；服务端下发 `model_configs` ↔ "发版即换模型"的同步节奏。

---

## 6. 核心子系统逆向

### 6.1 反滥用与 PoW（A 类）

- completion 前先请求 **`/api/v0/chat/create_pow_challenge`** 获取挑战；
- 客户端用 Rust 编译的 **SHA3 WASM** 求解，解随请求提交，服务端前置拦截滥用；
- 另有 **hCaptcha** 与 **Cloudflare Turnstile** 双人机验证通道。

### 6.2 搜索子系统（A 类）

- 入口：`/api/v0/index/prepare` + `/api/v0/index/query`；
- poller 目标（生产）：`hif-leim.deepseek.com/query`、`hif-dliq.deepseek.com/query`；
- **测试环境域名 `hif-test.deepseek.com` 在客户端可见**（见第 9 节安全观察）。

### 6.3 认证体系（A 类）

| 方式 | 证据 |
|------|------|
| Apple OAuth | OAuth 回调字段 |
| 微信 JS-SDK | wx 配置与票据字段 |
| OTP | 验证码发送/校验端点 |
| Passkey | ES256 签名；`mfa_challenge` / `mfa_ticket` / `credential_id` 字段链 |

### 6.4 遥测与远程配置（A 类）

- 4 组远程 feature store（localStorage 键 `__ds_remote_feature_store*`）：
  `main` / `_model` / `_webUpgrade` / `_provider`；
- 火山引擎 DataFinder：app_id `0x13145AD`，采集域 `gator.volces.com`，A/B 域 `tab.volces.com`，SDK 自 `lf3-data.volccdn.com`；
- `volcengine_enabled` 远程开关为 false 时不加载 SDK；
- 观测事件：`scriptLoadError`、`blankScreenCheck`、`selected_model_switch`。

---

## 7. 网络端点清单

bundle 静态可见 **45 条 `/api/v0/*` 端点**（完整清单属中间产物，此处列关键端点）：

| 端点 / 域 | 用途 |
|-----------|------|
| `/api/v0/chat/create_pow_challenge` | PoW 挑战下发 |
| `/api/v0/chat/completion` | 补全（流式） |
| `/api/v0/index/prepare` / `/api/v0/index/query` | 搜索入口 |
| `/api/v0/*`（会话 / 文件 / 认证等 40+ 条） | 业务面 |
| `fe-static.deepseek.com` | 前端静态资源 CDN |
| `cdn.deepseek.com` | 品牌图片 |
| `hif-leim` / `hif-dliq.deepseek.com` | 搜索 poller（生产） |
| `hif-test.deepseek.com` | 搜索 poller（测试环境） |
| `gator.volces.com` / `tab.volces.com` | DataFinder 采集 / A-B |
| `lf3-data.volccdn.com` | DataFinder SDK 分发 |

---

## 8. 训练过程（B 类，公开资料，非逆向结论）

> **边界声明**：客户端代码只包含推理侧门面（模型 ID、开关、端点），**任何训练过程细节都不存在于前端 bundle**。以下内容全部来自 DeepSeek 官方公开技术报告，与客户端证据无直接因果关系。

| 来源 | 关键内容 |
|------|---------|
| V4 技术报告（arXiv 2606.19348） | 混合注意力 MoE 架构；**>32T tokens 预训练**；Muon 优化器；MegaMoE；On-Policy Distillation + GRM（生成式奖励模型） |
| V3.2 技术报告（arXiv 2512.02556） | DSA 稀疏注意力；可扩展 RL 后训练 |

客户端侧仅有间接佐证（A 类）：
- `thinking_enabled` 开关与"非思考 / 思考"双模式发布形态一致；
- `verbosity_high/low` 与后训练输出风格控制能力吻合；
- `model_configs` 服务端热控机制与"三端同步换模型"的运营节奏一致。

---

## 9. 安全与隐私观察

**设计良好**：
- SRI 完整性校验 + 失败兜底页 + 加载失败上报，资源投毒面小；
- 模型配置服务端热控，客户端不含模型表，减少信息泄露与篡改面；
- PoW 前置于 completion，服务端可低成本拦截脚本滥用；
- 遥测可远程禁用（`volcengine_enabled=false` 时不加载 SDK）。

**需关注**：
- 壳页 HTML 明文注入用户出口 IP（`meta[name="ip"]`）——任何能读到壳页的中间层均可获取；
- 遥测默认倾向开启：feature store 状态未知时先缓冲、后启动；
- 测试环境域名 `hif-test.deepseek.com` 暴露在生产客户端中；
- localStorage feature store 可被用户本地篡改（仅影响本地体验，服务端仍需校验）。

---

## 10. 证据清单

| # | 结论 | 证据来源 | 级别 |
|---|------|---------|------|
| 1 | rspack 构建 | main.js：`rspackChunk_deepseek_chat` | A |
| 2 | commit `fd5d6ec3` | 壳页 `meta[name="commit-id"]` | A |
| 3 | SRI + 兜底 | 壳页 integrity 属性 + `_sriCk` 内联脚本 | A |
| 4 | 服务端注入 IP/地区 | 壳页 `meta[name="ip"]` / `meta[name="region"]` | A |
| 5 | 模型配置热控 | main.js：`model_configs` + `__ds_remote_feature_store_model` | A |
| 6 | 树状会话 | main.js：completion 载荷字段 | A |
| 7 | PoW 机制 | main.js：`create_pow_challenge` + wasm 文件名 | A |
| 8 | 搜索子系统 | main.js：`index/prepare`、`hif-*` 域名 | A |
| 9 | 认证方式 | main.js：OAuth / wx / Passkey / OTP 字段 | A |
| 10 | 火山遥测 | 壳页 DataFinder 配置（app_id `0x13145AD`） | A |
| 11 | 45 条 API 端点 | main.js 静态计数 | A |
| 12 | 当前模型 V4.1-Flash-1017 | 官方公告（2026-10-17） | B |
| 13 | V4 架构与训练 | arXiv 2606.19348 / 2512.02556 | B |

---

## 11. 分析局限性

1. 静态分析仅覆盖**推理侧门面**；登录后下发的 `model_configs` 实际取值未采集（需登录会话）。
2. 45 条端点为静态计数，部分端点语义靠命名推断，未逐一动态验证。
3. SSE 流式协议细节、PoW 难度参数属运行时行为，静态样本不可见。
4. 训练过程结论全部来自公开资料（B 类），客户端证据只能提供间接佐证。
5. 服务端渲染 / 下发的动态配置（feature store 实值）随时间变化，本报告反映 2026-10-17 快照。

---

## 附录：中间产物

- 壳页与 bundle 缓存目录：`C:\Users\pc\AppData\Local\Temp\dsh_web\`（index.html、main.js、vendors.js、manifest.json）
- 分析方法沉淀：`.trae/skills/web-app-reverse/SKILL.md`（含 `scripts/sweep_bundle.ps1` 定向扫描器）
