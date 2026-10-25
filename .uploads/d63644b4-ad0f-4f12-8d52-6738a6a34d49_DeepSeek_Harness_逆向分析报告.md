# DeepSeek Harness 桌面端逆向分析报告

> **目标版本**：DeepSeek Harness v0.1.7-rc.2 (win-x64)
> **分析日期**：2026-10-18
> **分析方法**：PE 结构解析 + ASAR 解包 + 定向源码静态分析（REA 全量图因 222 MB JSON 超出内存改为定向分析）
> **交付物**：本报告（Markdown） + 自包含 HTML 版本

---

## 目录

1. [概述](#1-概述)
2. [技术栈与整体架构](#2-技术栈与整体架构)
3. [PE 二进制结构分析](#3-pe-二进制结构分析)
4. [ASAR 应用包结构](#4-asar-应用包结构)
5. [插件系统（Cordis）](#5-插件系统cordis)
6. [关键子系统逆向](#6-关键子系统逆向)
   - 6.1 LLM 接入层（dsh-llm-deepseek）
   - 6.2 联网搜索（dsh-web-search-deepseek）
   - 6.3 账户与认证（dsh-deepseek-account / platform）
   - 6.4 会话持久化（dsh-session-persistence-jsonl）
   - 6.5 沙箱策略（dsh-sandbox-policy）
   - 6.6 凭据管理（dsh-credentials）
   - 6.7 家目录与匿名标识（dsh-home-paths / dsh-anonymous-user-id）
   - 6.8 Electron 主进程（lib/main.js）
7. [网络端点清单](#7-网络端点清单)
8. [安全与隐私观察](#8-安全与隐私观察)
9. [证据清单](#9-证据清单)
10. [分析局限性](#10-分析局限性)

---

## 1. 概述

DeepSeek Harness（dsh）是 DeepSeek 推出的桌面端 AI Agent 运行环境。本次逆向的目标为官方发布的 Windows x64 安装包 `deepseek-harness-0.1.7-rc.2-win-x64.exe`（288 MB），来源 `https://download.deepseek.com/dsh-desk/bin/win-x64/`。

**核心结论**：DeepSeek Harness 采用 **Electron 外壳 + dsh Cordis 插件运行时** 架构。Electron 主进程（`lib/main.js`，约 244 KB）只负责窗口、托盘、自动更新、IPC 与 WebSocket 流式协议；所有业务能力（LLM、工具、沙箱、会话、账户、搜索等）均以 **273 个 `@deepseek-ai/dsh-*` 插件** 的形式通过 Cordis 内核动态加载。安装包捆绑了完整的 **Node.js 24.18.1 + Python 3.12 + pnpm 11.7.0** 运行时，使 Agent 能在本地执行 shell / Python 工具。

---

## 2. 技术栈与整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                  DeepSeek Harness.exe (Electron)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  lib/main.js  (主进程)                                │  │
│  │  - BrowserWindow / Tray / Menu                       │  │
│  │  - IPC: DESKTOP_IPC / WELCOME_IPC / PLATFORM_IPC ... │  │
│  │  - WebSocket 流式协议 (REMOTE_STREAM_MUX_PATH)       │  │
│  │  - electron-updater 自动更新                         │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  dsh/  (Cordis 插件运行时)                            │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────────┐    │  │
│  │  │ dsh-llm │  │ dsh-tool │  │ dsh-session-*    │    │  │
│  │  │ -deep-  │  │ -bash/fs │  │ -persistence-    │    │  │
│  │  │  seek   │  │ -web/... │  │  jsonl / sqlite  │    │  │
│  │  └─────────┘  └──────────┘  └──────────────────┘    │  │
│  │  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ dsh-sandbox- │  │ dsh-deep-│  │ dsh-web-search│  │  │
│  │  │ policy/acl   │  │ seek-acc│  │ -deepseek     │  │  │
│  │  └──────────────┘  └──────────┘  └───────────────┘  │  │
│  │  ... 273 个 dsh-* 插件 ...                            │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  resources/runtime/  (Node 24 + Python 3.12 + pnpm)  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

| 层级 | 技术 | 版本 / 说明 |
|------|------|------------|
| 桌面壳 | Electron | 主程序 `DeepSeek Harness.exe`，244 MB |
| UI | WebContentsView + 自定义渲染器 | `renderer/` 目录 |
| 插件内核 | Cordis | `@deepseek-ai/cordis` 4.0.4 |
| 配置 Schema | Schemastery | `@deepseek-ai/schemastery` 3.18.4 |
| 运行时 | Node.js | 24.18.1（捆绑） |
| 运行时 | Python | 3.12（捆绑，用于工具执行） |
| 包管理 | pnpm | 11.7.0（捆绑） |
| 自动更新 | electron-updater | ^6.8.9 |
| 流式协议 | ws | ^8.21.0 |

---

## 3. PE 二进制结构分析

### 3.1 安装器（NSIS 存根）

| 字段 | 值 |
|------|-----|
| 文件 | `deepseek-harness-win-x64.exe` |
| 大小 | 288,245,480 字节 (≈275 MB) |
| 架构 | x86 (0x014C) — NSIS 安装器为 32 位存根 |
| 子系统 | 2 (Windows GUI) |
| 节区数 | 5 |
| 时间戳 | 2018-12-15（NSIS 默认存根时间） |
| 静态导入 DLL | 7 个 |
| 导入函数 | 165 个 |
| 延迟导入 | 0 |
| 数字签名 | 有（Certificate 目录，13,288 字节） |

**导入 DLL**：KERNEL32.dll (67)、USER32.dll (63)、GDI32.dll (8)、SHELL32.dll (6)、ADVAPI32.dll (13)、COMCTL32.dll (4)、ole32.dll (4)

这是典型的 **NSIS（Nullsoft Scriptable Install System）** 安装器存根，负责解压并安装真正的应用。核心逻辑不在此二进制内。

### 3.2 主程序（Electron）

| 字段 | 值 |
|------|-----|
| 文件 | `DeepSeek Harness.exe` |
| 大小 | 244,481,512 字节 (≈233 MB) |
| 架构 | x64 PE32+ (0x8664) |
| 时间戳 | 2026-08-24 15:25:04Z |
| 入口点 RVA | 0x3048500 |
| ImageBase | 0x140000000 |
| 子系统 | 2 (Windows GUI) |
| 节区数 | **15** |
| 导出函数 | **3,241**（V8 / Node.js C++ 符号） |
| 静态导入 DLL | 7 个 / 537 函数 |
| 延迟导入 DLL | 51 个 / 746 函数 |
| 数字签名 | 有（13,288 字节证书） |

**节区布局**：

| 节区 | 虚拟大小 | 特征 | 说明 |
|------|---------|------|------|
| .text | 191,591,836 | 代码 | V8 + Node + Electron 主体 |
| .rdata | 44,534,992 | 只读数据 | 常量、字符串、VTBL |
| .data | 2,760,480 | 读写数据 | 全局变量 |
| .pdata | 5,585,928 | 异常表 | x64 异常处理元数据 |
| .rsrc | 126,917 | 资源 | 图标、版本信息 |
| .reloc | 1,224,528 | 重定位 | 基址重定位 |
| .eh_fram / .fptable / .rodata / .tls / CPADinfo / LZMADEC / _RDATA / malloc_h / prot | 小 | — | Electron/Chromium 特有节区 |

**静态导入（7 DLL / 537 fn）**：

| DLL | 函数数 | 用途 |
|-----|-------|------|
| KERNEL32.dll | 409 | 进程/线程/内存/文件 |
| WS2_32.dll | 54 | 网络套接字 |
| CRYPT32.dll | 28 | 加密/证书 |
| WINMM.dll | 31 | 多媒体（音频） |
| ntdll.dll | 11 | 底层系统调用 |
| VERSION.dll | 3 | 版本信息 |
| DWrite.dll | 1 | 文字排版 |

**延迟导入（51 DLL / 746 fn，前 20）**：ffmpeg.dll (45)、USER32.dll (215)、GDI32.dll (95)、ADVAPI32.dll (83)、ole32.dll (32)、SHELL32.dll (24)、OLEAUT32.dll (19)、COMCTL32.dll (5)、UIAutomationCore.DLL (9)、WTSAPI32.dll (4)、SHLWAPI.dll (7)、dwmapi.dll (5)、IPHLPAPI.DLL (13)、SETUPAPI.dll (10)、dbghelp.dll (14)、pdh.dll (5) 等。

**导出特征**：3,241 个导出全部为 V8 和 Node.js 的 C++ mangled 符号（如 `??0Isolate@v8@@QEAA@PEAV01@@Z`、`??0ArrayBufferAllocator@node@@...`），确认这是 **Chromium + V8 + Node.js 编译产物**，即 Electron 运行时本身。应用层逻辑位于 ASAR 包中。

---

## 4. ASAR 应用包结构

`resources/app.asar`（112 MB）解包后根目录结构：

```
asar_extract/
├── package.json              # @deepseek-ai/dsh-desktop v0.1.7-rc.2
├── lib/
│   ├── main.js               # Electron 主进程（≈244 KB）
│   ├── preload-app.cjs
│   ├── preload-mandatory.cjs
│   ├── preload-platform-account.cjs
│   ├── preload-update-dialog.cjs
│   ├── preload-welcome.cjs
│   └── welcome/              # 欢迎页资源
├── renderer/                 # 渲染层 HTML/CSS/JS
└── dsh/                      # Cordis 插件运行时
    ├── package.json          # @deepseek-ai/dsh-desktop-runtime
    ├── desktop-runtime.json  # 运行时清单（282 包 / 12319 文件）
    └── node_modules/@deepseek-ai/   # 273 个 dsh-* 插件
```

**根 `package.json` 关键字段**：

```json
{
  "name": "@deepseek-ai/dsh-desktop",
  "version": "0.1.7-rc.2",
  "main": "lib/main.js",
  "dshDesktopAppId": "com.deepseek.dsh",
  "dshMandatoryUpdatePolicy": {
    "origin": "https://harness.deepseek.com",
    "allowedPageOrigins": ["https://harness.deepseek.com"],
    "authentication": "anonymous"
  },
  "dshBuildCommit": "c1275515b6b97551ec358c926c479ab750c687c0"
}
```

---

## 5. 插件系统（Cordis）

DeepSeek Harness 的所有能力都通过 **Cordis 插件框架** 实现。`dsh/desktop-runtime.json` 声明了 **282 个共享包**，其中 **273 个为 `@deepseek-ai/dsh-*` 插件**，5 个为 Cordis 内核包，其余为工具库（schemastery、cosmokit、node-addon-system 等）。

运行时清单包含 `files` 字段（12,319 条记录），每条记录含 `path`、`bytes`、`sha256`、`executable`，用于**完整性校验**——主进程启动时验证 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-desktop-host` 的版本必须匹配 `release.version`（0.1.7-rc.2）。

### 插件分组概览

| 子系统 | 代表插件 |
|--------|---------|
| **LLM 接入** | dsh-llm, dsh-llm-deepseek, dsh-llm-deepseek-api-key, dsh-llm-deepseek-account, dsh-llm-pi-ai, dsh-llm-retry |
| **Agent 循环** | dsh-agent, dsh-agent-loop, dsh-agent-preset, dsh-subagent, dsh-subagent-fork/spawn-in-process |
| **工具** | dsh-tool-bash, dsh-tool-fs, dsh-tool-web, dsh-tool-workflow, dsh-tool-subagent, dsh-tool-todo, dsh-tool-pwsh, dsh-tool-cordis, dsh-mcp-client |
| **沙箱/安全** | dsh-sandbox, dsh-sandbox-policy, dsh-sandbox-windows-acl, dsh-fs-sandbox, dsh-bash-sandbox, dsh-pwsh-sandbox |
| **会话/存储** | dsh-session, dsh-session-persistence-jsonl, dsh-session-query-sqlite, dsh-session-log-deepseek, dsh-session-telemetry-otel |
| **账户/认证** | dsh-deepseek-account, dsh-deepseek-account-platform, dsh-anonymous-user-id, dsh-credentials |
| **Web/网络** | dsh-web, dsh-web-fetch-http, dsh-web-search-deepseek, dsh-http-proxy |
| **桌面宿主** | dsh-desktop-host, dsh-cordis-host-runner, dsh-headless |
| **实验性** | dsh-experimental-agent-team, dsh-experimental-speech-to-text (sensevoice), dsh-experimental-voice-input, dsh-experimental-auto-review |
| **SDK/协议** | dsh-sdk-protocol, dsh-sdk-jsonrpc-server, dsh-acp (Agent Client Protocol) |

---

## 6. 关键子系统逆向

### 6.1 LLM 接入层（dsh-llm-deepseek）

**API 端点**：
- 默认 base URL：`https://api.deepseek.com/anthropic`
- 环境变量覆盖：`DEEPSEEK_BASE_URL`
- 协议：**Anthropic Messages API**（`anthropic-version: 2023-06-01`），在 base URL 后追加 `/v1`

**默认模型目录**：

| 模型 ID | 名称 | 上下文 | 模态 |
|--------|------|--------|------|
| `deepseek-flash` | DeepSeek-V41-Flash | 1,000,000 | text + image |
| `deepseek-v4-pro` | DeepSeek-V4-Pro | 1,000,000 | text |

**关键参数**：
- 默认上下文窗口：1,000,000 tokens
- 默认最大输出：256,000 tokens
- 推理强度（reasoning_effort）：off / low / high / max（默认 high）
- 流式空闲超时：300,000 ms（5 分钟）

**Files API（图片上传）**：
- 端点：`{baseURL}/v1/files`（upload/list/retrieve/delete）
- 最大单文件上传：128 MiB
- 每密钥存储配额：25 GB / 10,000 文件
- 文件过期：3,600 ~ 2,592,000 秒（默认 604,800 秒 = 7 天）
- Beta header：`anthropic-beta: files-api-2025-04-14`
- 工具变更 Beta：`mid-conversation-tool-changes-2026-07-01`

**本地上传索引**：
- 路径：`$DSH_HOME/llm-deepseek/files-v3.json`（format v3）
- 命名空间：`SHA-256(baseURL + "\0" + 序列化认证头)`，避免在日志中持久化密钥
- 作用：跨会话复用已上传图片的 file_id，减少重复上传
- 并发控制：单例 inflight Map + withFileLock 原子写入

**视觉 Token 计费**（移植自 DeepSeek 官方 v41 计算器）：
- Patch 大小：14px，下采样比 3:1，单图上限 1024 tokens
- 小图（< 544×544 像素）放大后对齐 patch 网格
- 请求图片最大尺寸：4096px（≥15 张图时）
- 单请求图片上限：600 张

### 6.2 联网搜索（dsh-web-search-deepseek）

**端点**：
- 默认：`https://api.deepseek.com/anthropic/v1`（与对话端点独立）
- 环境变量覆盖：`DEEPSEEK_SEARCH_BASE_URL`
- 请求路径：`{baseURL}/messages`

**配置**：
- 默认模型：`deepseek-v4-flash`
- max_tokens：4,096
- `web_search_20250305` 原生服务端工具，`max_uses` 默认 5
- API 版本：`2023-06-01`
- API Key 环境变量：`DEEPSEEK_API_KEY`
- User-Agent：`deepseek-harness/0.0.1`

**请求头**：同时发送 `x-api-key` 和 `authorization: Bearer <key>`。

**响应解析**：从 `web_search_tool_result` 内容块提取 `web_search_result` 项（url/title/page_age），引用文本块中 `citations[].cited_text` 作为摘要，按 URL 去重。

### 6.3 账户与认证（dsh-deepseek-account / platform）

**平台端点**（HTTPS only，开发环境允许 loopback HTTP）：

| 端点 | 用途 |
|------|------|
| `/auth-api/v0/dsh/<method>` | DSH 平台方法 |
| `/auth-api/v0/users/current` | 当前用户信息 |
| `/auth-api/v0/users/logout` | 登出 |
| `/api/v0/users/get_unnotified_bonuses` | 未读奖励（钱包） |
| `/api/v0/users/ack_bonus_notified` | 确认奖励已读 |

**认证机制**：
- 请求头：`x-dsh-auth-token: <token>`
- HTTP 401 或响应 `code: 40003` → 未授权，触发 `ACCOUNT_SIGN_IN_REQUIRED`
- 登录流程：浏览器 OAuth 风格，通过 loopback HTTP 回调接收授权码
- 平台客户端头：`x-client-platform`（desktop-win / desktop-mac / web）、`x-client-version`、`x-client-locale`（zh_CN / en_US）、`x-client-timezone-offset`

**奖励/钱包功能**：存在未读奖励查询与确认接口，表明桌面端集成了 DeepSeek 平台的积分/奖励体系。

### 6.4 会话持久化（dsh-session-persistence-jsonl）

**存储格式**：JSONL（每行一个事件），支持 **Zstandard 压缩**（`.jsonl.zstd`）。

**路径布局**：
```
<session root>/<project key>/<encoded session id>/session.v<N>.jsonl[.zstd]
```
- `project key`：由 cwd 派生，分隔符替换为 `-`，包裹在 `--...--` 中（如 `--C--Users-pc--project--`）
- `session id`：`~XXXX` 转义编码，防止路径穿越
- 文件名含格式版本号：`session.v4.jsonl`

**会话格式版本**：当前 v4，内置 v0→v1→v2→v3→v4 迁移链（`dsh-session-format-v0-to-v1` 等独立插件）。

**Header 字段**：`type`、`version`、`id`、`createdAt`、`isSeeded`、`delegationDepth`、可选 `cwd` / `parentSession` / `origin` / `agentPreset`。

**跨进程写锁**：
- **Windows**：命名内核信号量 `Local\dsh-session-lock-<SHA256(小写路径)>`（不触碰文件系统，读/搜索/删除不受阻塞）
- **POSIX**：`session.lock` 文件上的 `flock(2)` 独占锁
- 锁在进程崩溃时由内核自动释放，无超时（防止撕裂日志）

**Windows 持久化**：通过 `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)` 实现写入穿透（Windows 无 POSIX fsync 等价物），目录创建也使用 staging-then-rename 模式确保持久性。

**实时写入**：事件经 200ms 批处理定时器合并写入，`session/flush` 事件强制落盘。

### 6.5 沙箱策略（dsh-sandbox-policy）

**三种模式**：

| 模式 | 行为 |
|------|------|
| `read-only`（默认） | 沙箱不允许任何文件修改 |
| `workspace-write` | 仅允许修改会话工作目录（session cwd）下的文件 |
| `danger-full-access` | 不限制文件修改 |

**解析优先级**：显式批准的模式 > 会话 `sandbox/mode` 事件覆盖 > 部署默认模式。

**工作区根目录**：会话 header 的 `cwd`，无 cwd 时回退到 `process.cwd()`。

**会话级覆盖**：通过追加 `sandbox/mode` 事件到会话日志实现，重启后通过回放重建状态——两个会话互不干扰，无外部配置存储。策略文本注入系统提示上下文（`sandbox:policy`）。

### 6.6 凭据管理（dsh-credentials）

**两种密钥空间**：

1. **CredentialRef（引用）**：环境变量名（如 `DEEPSEEK_API_KEY`），解析层级：进程环境 → 提供者存储 → `.env` 文件。空值视为未配置。
2. **CredentialKey（记录）**：`<scope>/<id>` 格式（如 `llm-pi-ai/default`），用于授权令牌等无环境变量来源的凭据。唯一写入路径为 `modifyRecord`（读-决-替，加锁）。

**变更通知**：`credentials/reference-updated` 和 `credentials/record-updated` 事件，监听器失败被隔离（INVARIANT 编码除外）。

### 6.7 家目录与匿名标识

**DSH Home**（`dsh-home-paths`）：
- 默认：`~/.dsh`
- 覆盖环境变量：`DSH_HOME`
- 优先级：显式配置 > `$DSH_HOME` > `~/.dsh`
- 缓存目录：`<home>/cache/`

**匿名用户 ID**（`dsh-anonymous-user-id`）：
- 存储：`$DSH_HOME/.anonymous-user-id`（裸 UUID 行，无包装格式）
- 生成：`crypto.randomUUID()`，**不**派生自主机名/网络地址/git remote 等标识源
- 范围：harness home 级，共享同一 `$DSH_HOME` 的进程报告同一 ID
- 用途：遥测与反馈
- 删除文件后下次启动生成新 ID

### 6.8 Electron 主进程（lib/main.js）

**窗口与 UI**：
- `BrowserWindow` 主窗口 + `WebContentsView` 平台账户视图
- 欢迎页（welcome.html）：首次启动引导，可保存 API Key
- 托盘图标（tray.ico）+ 后台关闭确认标记 `userData/background-close-confirmed`

**IPC 通道**：

| 通道组 | 主要方法 |
|--------|---------|
| DESKTOP_IPC | boot, bootFailed, browserAcquire/Release, directoryPick, shortcutsGet/Edit/Recording/CloseWindow, nativeThemeSet, localeBootstrap/Changed, updatesStatus/Open/Presentation, onboardingApiKey/Active, windowsMenu/Appearance |
| WELCOME_IPC | takeNotice, saveApiKey, skip, start, cancel, copyLink |
| MANDATORY_IPC | status, action（强制更新） |
| UPDATE_DIALOG_IPC | status, respond（更新对话框） |
| PLATFORM_IPC | bootstrap, open, bounds, close（账户平台视图） |

**流式协议**：
- 使用 `ws` 库连接 `${origin}${REMOTE_STREAM_MUX_PATH}`
- `REMOTE_STREAM_MUX_PATH` 来自 `@deepseek-ai/dsh-api-gateway/stream-protocol`
- 通过 `parseRemoteStreamServerMessage` 解析服务端消息

**自动更新**：
- `electron-updater`，检查 `resources/app-update.yml`
- 更新源：`https://harness.deepseek.com`，认证方式 `anonymous`
- 强制更新策略：`dshMandatoryUpdatePolicy`

**协议处理**：
- 注册 `shell://` 协议，服务 `renderer/` 下的文档
- 自定义协议 `app.getAppPath()` 解析

**捆绑运行时路径**：
- Node：`resources/runtime/bin`
- pnpm：`resources/runtime/pnpm/bin/pnpm.mjs`
- dsh：`app.getAppPath()/dsh`（开发态为 `.desktop-build/development/project`）

**崩溃报告**：写入 `app.getPath("logs")`，含版本信息。

---

## 7. 网络端点清单

| 端点 | 用途 | 认证 |
|------|------|------|
| `https://api.deepseek.com/anthropic` | LLM 对话（Anthropic Messages 协议） | API Key (Bearer + x-api-key) |
| `https://api.deepseek.com/anthropic/v1` | 联网搜索（web_search 工具） | API Key |
| `{base}/v1/files` | 图片上传/管理（Files API） | API Key |
| `https://harness.deepseek.com` | 自动更新 | anonymous |
| `{platform}/auth-api/v0/dsh/*` | 账户平台 DSH 方法 | x-dsh-auth-token |
| `{platform}/auth-api/v0/users/current` | 当前用户 | x-dsh-auth-token |
| `{platform}/auth-api/v0/users/logout` | 登出 | x-dsh-auth-token |
| `{platform}/api/v0/users/get_unnotified_bonuses` | 奖励查询 | x-dsh-auth-token |
| `{platform}/api/v0/users/ack_bonus_notified` | 奖励确认 | x-dsh-auth-token |

**环境变量**：
- `DSH_HOME`：家目录覆盖
- `DEEPSEEK_BASE_URL`：LLM 端点覆盖
- `DEEPSEEK_SEARCH_BASE_URL`：搜索端点覆盖
- `DEEPSEEK_API_KEY`：API Key
- `DSH_DESKTOP_DSH_DIR` / `DSH_DESKTOP_PNPM_ENTRY`：开发态路径覆盖

---

## 8. 安全与隐私观察

### 设计良好的方面

1. **沙箱默认只读**：`sandbox-policy` 默认 `read-only`，Agent 无法擅自修改文件，需用户切换或批准。
2. **凭据引用而非值**：配置中只存环境变量名，不存密钥值；`modifyRecord` 是唯一记录写入路径且加锁。
3. **上传索引不持久化密钥**：file scope 用 `SHA-256(baseURL + 认证头)` 派生，不记录明文密钥。
4. **匿名 ID 与机器标识解耦**：UUID 随机生成，不派生自主机名/MAC/git remote。
5. **跨进程锁无超时**：会话写锁在进程崩溃时由内核释放，且无超时——防止并发写入撕裂日志。
6. **Windows 写入穿透**：`MOVEFILE_WRITE_THROUGH` + staging-rename 确保持久性。
7. **重定向拒绝**：Files API 与搜索请求均设置 `redirect: "error"`，防止凭据被重定向带出源站。
8. **baseURL 校验**：必须是无凭据/查询/片段的 HTTP(S) 根路径。

### 需要关注的方面

1. **`danger-full-access` 模式**：存在完全关闭沙箱的模式，需用户明确选择。
2. **奖励/钱包端点**：账户平台集成了奖励体系，`x-dsh-auth-token` 是长期凭据，泄露风险需关注。
3. **自动更新 anonymous 认证**：更新源认证为 `anonymous`，依赖 HTTPS 与代码签名保证完整性（安装包有数字签名）。
4. **会话日志明文**：JSONL 存储对话内容（虽支持 zstd 压缩但非加密），`~/.dsh` 下的会话文件可被本机其他进程读取。
5. **API Key 保存**：欢迎页可直接保存 API Key，需确认存储位置是否加密（凭据服务依赖提供者存储实现）。

---

## 9. 证据清单

| 证据 | 来源 |
|------|------|
| PE 结构（安装器 5 节区/主程序 15 节区/3241 导出/537+746 导入） | `harness_pe.json` / `harness_main_pe.json`（pe_dump.ps1） |
| 版本 0.1.7-rc.2、App ID com.deepseek.dsh | `asar_extract/package.json` |
| 282 共享包 / 273 dsh-* 插件 / 12319 文件 | `dsh/desktop-runtime.json` |
| Node 24.18.1 / pnpm 11.7.0 / hostProtocol 4 | `dsh/desktop-runtime.json` release 字段 |
| LLM 端点 `https://api.deepseek.com/anthropic`、模型目录、Files API | `dsh-llm-deepseek/lib/index.js` |
| 搜索端点、web_search_20250305、User-Agent | `dsh-web-search-deepseek/lib/index.js` |
| 账户端点 `/auth-api/v0/*`、x-dsh-auth-token | `dsh-deepseek-account-platform/lib/index.js` |
| 会话 JSONL/zstd 格式、Windows 信号量锁、MoveFileExW | `dsh-session-persistence-jsonl/lib/index.js` |
| 沙箱三模式、默认 read-only | `dsh-sandbox-policy/lib/index.js` |
| 凭据 ref/key 双空间 | `dsh-credentials/lib/index.js` |
| ~/.dsh 家目录、匿名 UUID | `dsh-home-paths/lib/index.js`、`dsh-anonymous-user-id/lib/index.js` |
| IPC 通道、WebSocket 流、自动更新 | `lib/main.js` |

---

## 10. 分析局限性

1. **REA 全量图未生成**：`analyze-javascript-application` 对 10,123 个源文件产出 222 MB JSON，超出 PowerShell 读取内存。改为定向读取关键插件源码，未覆盖全部 273 个插件。
2. **未做动态分析**：未在沙箱中运行程序抓包，网络端点均来自源码静态提取，运行时可能有动态构造的 URL。
3. **原生模块未逆向**：`app.asar.unpacked/` 下的原生 Node 模块（如 `node-addon-system` 的 flock）未做 Ghidra 分析。
4. **渲染层未深入**：`renderer/` 与各 `dsh-client-ui-*` 插件的前端逻辑未分析。
5. **凭据存储实现未确认**：`dsh-credentials` 定义了服务接口，但具体的持久化实现（是否加密、存储位置）在提供者插件中，本次未追踪到底。
6. **会话日志内容**：未实际生成会话查看 JSONL 的事件类型全集，格式基于 `dsh-session-format-*` 迁移插件推断。

---

*报告结束。本报告基于静态逆向分析，仅供技术研究与架构理解之用。*
