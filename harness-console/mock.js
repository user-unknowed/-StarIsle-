/* ============================================================
   Harness Console · mock.js — 全部数据单一来源
   数据骨架对应两份逆向报告的领域模型（见各段落注释出处）
   stub only：不含任何真实服务调用
   ============================================================ */
(function () {
  "use strict";

  var DB = {};

  /* ---------- 运行时环境（桌面报告 §1/§5/§6.4/§6.7/§6.8） ---------- */
  DB.runtime = {
    node: "24.18.1",
    python: "3.12",
    pnpm: "11.7.0",
    cordis: "4.0.4",
    sharedPkgs: 282,
    runtimeFiles: 12319,
    pluginsTotal: 273,
    pluginGroups: 10,
    home: "~/.dsh",
    homeEnv: "DSH_HOME",
    anonymousId: "7f3c9a52-4e18-4b6e-9d2a-8c15f0b3e7a4",
    sessionFormat: "v4",
    migrationChain: ["v0", "v1", "v2", "v3", "v4"],
    batchWriteMs: 200,
    streamIdleTimeoutMs: 300000,
    lockState: "已持有 · Local\\dsh-session-lock-<sha256(小写路径)>",
    lockPosix: "session.lock · flock(2) 独占锁"
  };

  /* ---------- 遥测（网页报告 §6.4：远程可禁用 / settlement 缓冲） ---------- */
  DB.telemetry = {
    key: "volcengine_enabled",
    enabled: true,
    appId: "0x13145AD",
    collectDomain: "gator.volces.com",
    note: "关闭后不加载 SDK，不产生任何上报；状态未知时启动回调先进入 settlement 缓冲。"
  };

  /* ---------- 沙箱（桌面报告 §6.5：三模式 / 解析优先级 / sandbox:policy 注入） ---------- */
  DB.sandbox = {
    mode: "read-only", // read-only | workspace-write | danger-full-access
    deployDefault: "read-only",
    workspaceRoot: "~/projects/demo",
    modes: [
      {
        id: "read-only", label: "read-only", tone: "ok",
        claim: "沙箱不允许任何文件修改",
        writes: "全部写操作被拒绝", approvals: "写请求自动拒绝并说明原因",
        scene: "默认模式 · 只读分析、代码问答、检索",
        policy: "sandbox:policy → 你处于只读沙箱中。禁止创建、修改或删除任何文件；如需落盘，请先向用户申请切换沙箱模式或提交审批。"
      },
      {
        id: "workspace-write", label: "workspace-write", tone: "warn",
        claim: "仅允许修改会话工作目录下的文件",
        writes: "工作区内可直接写入", approvals: "工作区外写请求进入审批队列",
        scene: "受控开发 · 让 Agent 直接改项目内文件",
        policy: "sandbox:policy → 你处于工作区写入沙箱中。工作区根为 ~/projects/demo，仅允许修改该目录内的文件；目录外的写操作会被拦截并进入审批队列。"
      },
      {
        id: "danger-full-access", label: "danger-full-access", tone: "danger",
        claim: "不限制文件修改",
        writes: "任意路径可写", approvals: "无审批拦截",
        scene: "完全信任 · 系统级脚本与跨目录变更",
        policy: "sandbox:policy → 沙箱限制已完全关闭。允许对任意路径执行写操作，且不产生审批请求。请自行确认风险。"
      }
    ],
    overrides: [
      { ts: "10:26", from: "read-only", to: "workspace-write", session: "s1", by: "sandbox/mode 会话事件" }
    ]
  };

  /* ---------- 模型目录（网页报告 §5.1 服务端热控结构 + 桌面报告 §6.1 目录内容） ---------- */
  DB.models = [
    {
      model_type: "deepseek-flash", name: "DeepSeek-V41-Flash",
      enabled: true, switchable: true, show_model_name_in_session: true,
      contextWindow: 1000000, maxOutput: 256000, modalities: ["text", "image"],
      effort: ["off", "low", "high", "max"], defaultEffort: "high"
    },
    {
      model_type: "deepseek-v4-pro", name: "DeepSeek-V4-Pro",
      enabled: true, switchable: true, show_model_name_in_session: true,
      contextWindow: 1000000, maxOutput: 256000, modalities: ["text"],
      effort: ["off", "low", "high", "max"], defaultEffort: "high"
    },
    {
      model_type: "deepseek-chat-legacy", name: "deepseek-chat（旧 API 名）",
      enabled: false, switchable: false, show_model_name_in_session: false,
      contextWindow: 64000, maxOutput: 8192, modalities: ["text"],
      effort: ["off", "high"], defaultEffort: "off",
      note: "已映射至 deepseek-flash 非思考模式，服务端已下发 enabled=false"
    }
  ];

  /* ---------- Files API 配额（桌面报告 §6.1） ---------- */
  DB.filesApi = {
    maxFile: "128 MiB", storage: "25 GB", maxFiles: "10,000",
    ttl: "3,600 ~ 2,592,000 秒（默认 604,800 秒 = 7 天）",
    beta: "anthropic-beta: files-api-2025-04-14"
  };

  /* ---------- 会话与消息树（网页报告 §5.3：parent/child_message_id 树状结构） ----------
     block 类型：
       {type:"thinking", text, sec}
       {type:"text", text}
       {type:"tool", tool:"fs.write|bash|web_search", target, status, out, summary?, results?}
  -------------------------------------------------------------------------- */
  DB.sessions = [
    {
      id: "s1",
      title: "梳理 session-persistence 写入路径",
      createdAt: "2026-10-25 10:24",
      updatedAt: "10:32",
      cwd: "~/projects/demo",
      sandboxMode: "workspace-write",
      version: "v4",
      msgs: 7,
      // activeBranches: forkPointId -> active child id（分支切换状态）
      activeBranches: { m4: "m5a" }
    },
    {
      id: "s2",
      title: "PoW 挑战求解失败的排查",
      createdAt: "2026-10-25 09:12",
      updatedAt: "09:20",
      cwd: "~/projects/demo",
      sandboxMode: "read-only",
      version: "v4",
      msgs: 2,
      activeBranches: {}
    },
    {
      id: "s3",
      title: "新会话",
      createdAt: "2026-10-25 10:40",
      updatedAt: "10:40",
      cwd: "~/projects/demo",
      sandboxMode: "read-only",
      version: "v4",
      msgs: 0,
      activeBranches: {}
    }
  ];

  DB.messages = {
    s1: [
      { id: "m1", parentId: null, role: "user", ts: "10:24", blocks: [
        { type: "text", text: "帮我梳理 dsh-session-persistence 的写入路径，评估 200ms 批处理是否够用。" }
      ]},
      { id: "m2", parentId: "m1", role: "assistant", ts: "10:24", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "thinking", sec: 1.8, text: "写入路径的关键点：事件先进入批处理定时器（200ms 合并），追加写入 session.v4.jsonl，可选 zstd 压缩；落盘保证靠 Windows 的 MoveFileExW(MOVEFILE_WRITE_THROUGH) 与 POSIX flock。评估点在于 flush 时机与崩溃窗口。" },
        { type: "text", text: "写入路径分四段：\n\n1. 事件产生 — agent 循环产生会话事件（消息、工具结果、sandbox/mode 覆盖等）；\n2. 批处理合并 — 事件进入 200ms 定时器窗口，合并后一次性追加；session/flush 事件可强制立即落盘；\n3. 序列化追加 — 以 JSONL（每行一个事件）追加到 session.v4.jsonl，超过阈值走 zstd 压缩；\n4. 持久化保证 — Windows 用 MoveFileExW(..., MOVEFILE_WRITE_THROUGH) 写穿，POSIX 靠目录 staging-then-rename；并发由命名信号量（Windows）/ flock(2)（POSIX）串行化。\n\n结论：200ms 批处理对交互式会话足够（人两次输入间隔远大于此）；风险主要在崩溃窗口内最多丢 200ms 内的未合并事件，属可接受代价。" }
      ]},
      { id: "m3", parentId: "m2", role: "user", ts: "10:26", blocks: [
        { type: "text", text: "把 docs/locks.md 里的锁描述更新成 Windows 信号量方案，补充 flock 的对照。" }
      ]},
      { id: "m4", parentId: "m3", role: "assistant", ts: "10:26", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "tool", tool: "fs.write", target: "~/projects/demo/docs/locks.md", status: "awaiting_approval",
          summary: "更新锁机制描述：命名内核信号量 Local\\dsh-session-lock-<sha256>，对照 POSIX flock(2)",
          out: "" }
      ]},
      { id: "m5b", parentId: "m4", role: "assistant", ts: "10:26", branchLabel: "已拒绝", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "tool", tool: "fs.write", target: "~/projects/demo/docs/locks.md", status: "rejected",
          summary: "更新锁机制描述（被用户拒绝）",
          out: "✗ 写入请求已被拒绝：用户在审批队列中选择了拒绝。" },
        { type: "text", text: "写入请求被拒绝，文件未做任何修改。如果只是想先看建议措辞，我可以把拟更新的段落直接贴在对话里。" }
      ]},
      { id: "m5a", parentId: "m4", role: "assistant", ts: "10:27", branchLabel: "批准执行", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "tool", tool: "fs.write", target: "~/projects/demo/docs/locks.md", status: "executed",
          summary: "更新锁机制描述（审批通过后执行）",
          out: "patch docs/locks.md\n+ ## 跨进程锁（v4）\n+ Windows：命名内核信号量，不触碰文件系统，读/搜索/删除不受阻塞\n+ POSIX：session.lock 上的 flock(2) 独占锁\n+ 崩溃时由内核自动释放，无超时\n✓ 2 files changed" },
        { type: "text", text: "审批通过，已更新 docs/locks.md：把原 \"文件锁\" 段落替换为 Windows 命名信号量方案，并补了与 flock(2) 的行为对照（崩溃释放、无超时、不阻塞读路径）。需要我顺手更新 architecture.md 里的引用吗？" }
      ]},
      { id: "m6", parentId: "m5a", role: "user", ts: "10:31", blocks: [
        { type: "text", text: "先不用。再联网查一下 flock(2) 与 Windows 命名信号量在崩溃恢复行为上的对比资料。" }
      ]},
      { id: "m7", parentId: "m6", role: "assistant", ts: "10:32", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "tool", tool: "web_search", target: "flock(2) vs Windows named semaphore crash recovery", status: "executed", maxUses: 5,
          results: [
            { title: "flock(2) — Linux manual page", url: "https://man7.org/linux/man-pages/man2/flock.2.html", pageAge: "持续更新", quote: "If a process uses open(2) (or similar) to obtain more than one file descriptor for the same file, these file descriptors are treated independently by flock()." },
            { title: "Named Object Semaphores — Windows kernel objects", url: "https://learn.microsoft.com/windows/win32/api/syncapi/", pageAge: "2025-08", quote: "Kernel semaphore objects are released automatically when the owning process terminates." },
            { title: "Cross-platform file locking patterns", url: "https://example.dev/blog/cross-platform-file-locking", pageAge: "2025-03", quote: "A crash-safe pattern pairs flock with rename-based atomic replacement on POSIX and MoveFileExW with WRITE_THROUGH on Windows." }
          ] },
        { type: "text", text: "对比要点：\n\n• POSIX flock(2)——锁随打开文件描述关联，进程终止由内核释放；同进程多描述符彼此独立，需注意自锁。\n• Windows 命名信号量——内核对象，持有进程终止时自动释放；不占文件系统句柄，读/搜索/删除路径不受阻塞。\n• 两者的崩溃恢复语义一致：无超时、内核兜底释放——这正是 dsh 选择 \"锁崩溃由内核释放、无超时\" 的原因。\n\n资料已按 URL 去重，见上方引用卡片。" }
      ]}
    ],
    s2: [
      { id: "n1", parentId: null, role: "user", ts: "09:12", blocks: [
        { type: "text", text: "会话发送偶发失败，怀疑是 PoW 环节。帮我梳理 create_pow_challenge 的失败面。" }
      ]},
      { id: "n2", parentId: "n1", role: "assistant", ts: "09:12", model: "deepseek-flash", showModelName: true, blocks: [
        { type: "thinking", sec: 1.2, text: "PoW 链路：completion 前请求 /chat/create_pow_challenge 拿到挑战 → Rust 编译的 SHA3 WASM 在本地求解 → 解随 completion 提交。偶发失败的可能：挑战过期、WASM 初始化竞态、求解超时。" },
        { type: "text", text: "失败面按链路排查：\n\n1. 挑战获取 — /api/v0/chat/create_pow_challenge 网络抖动或限流；\n2. 本地求解 — sha3_wasm_bg.wasm 初始化失败（首次加载竞态）或求解耗时超预期；\n3. 提交 — 挑战已过期（服务端一次性校验）。\n\n建议：对 ①③ 加一次性重试；② 在控制台里看 PoW 进度条卡在哪一步即可定位。" }
      ]}
    ],
    s3: []
  };

  /* ---------- 审批队列（桌面报告 §6.5 沙箱联动） ---------- */
  DB.approvals = [
    { id: "ap1", sessionId: "s1", tool: "bash", target: "curl -s https://example.dev/api/lock-specs -o /tmp/lock-specs.json", summary: "把对比资料抓取到工作区外的 /tmp 目录", status: "pending", ts: "10:31", reason: "目标路径在工作区根之外（workspace-write 模式）" },
    { id: "ap2", sessionId: "s1", tool: "fs.write", target: "~/projects/demo/docs/locks.md", summary: "更新锁机制描述：Windows 信号量 + flock 对照", status: "approved", ts: "10:26", reason: "工作区内写入，等待用户确认措辞", decidedAt: "10:27", decision: "approved" },
    { id: "ap3", sessionId: "s2", tool: "fs.write", target: "~/.zshrc", summary: "把 DSH_HOME 写入 shell 配置", status: "rejected", ts: "09:14", reason: "read-only 模式下所有写操作被拒绝", decidedAt: "09:15", decision: "rejected" }
  ];

  /* ---------- 凭据（桌面报告 §6.6 双空间 / §7 环境变量） ---------- */
  DB.credentials = {
    refs: [
      { name: "DEEPSEEK_API_KEY", purpose: "LLM 对话与搜索鉴权", layer: "进程环境", resolved: true, masked: "sk-****…****3f7a" },
      { name: "DEEPSEEK_BASE_URL", purpose: "LLM 端点覆盖（默认 https://api.deepseek.com/anthropic）", layer: ".env 文件", resolved: true, masked: "https://api.deepseek.com/anthropic" },
      { name: "DEEPSEEK_SEARCH_BASE_URL", purpose: "搜索端点覆盖", layer: "—", resolved: false, masked: "未配置" },
      { name: "DSH_HOME", purpose: "运行时家目录覆盖（默认 ~/.dsh）", layer: "进程环境", resolved: false, masked: "未设置（使用默认）" }
    ],
    keys: [
      { key: "llm-pi-ai/default", purpose: "授权令牌（无环境变量来源的凭据）", masked: "eyJhbGciOi…****", updatedAt: "2026-10-24 18:03" },
      { key: "deepseek-account/platform-token", purpose: "平台账户 x-dsh-auth-token", masked: "dsh-****…****9c2e", updatedAt: "2026-10-25 09:40" }
    ],
    events: [
      { ts: "2026-10-25 09:40", kind: "credentials/record-updated", detail: "deepseek-account/platform-token 通过 modifyRecord 更新（读-决-替，加锁）" },
      { ts: "2026-10-24 18:03", kind: "credentials/record-updated", detail: "llm-pi-ai/default 记录写入" },
      { ts: "2026-10-24 17:52", kind: "credentials/reference-updated", detail: "DEEPSEEK_API_KEY 解析层级从 .env 变更为进程环境" },
      { ts: "2026-10-24 17:30", kind: "credentials/reference-updated", detail: "DEEPSEEK_SEARCH_BASE_URL 置空 → 视为未配置" }
    ],
    rule: "只存引用不存值；modifyRecord 是唯一记录写入路径（读-决-替，加锁）；上传索引的 scope 用 SHA-256(baseURL + 认证头) 派生，不持久化明文密钥。"
  };

  /* ---------- 端点清单（桌面报告 §7 + 网页报告 §7） ---------- */
  DB.endpoints = [
    { url: "https://api.deepseek.com/anthropic", purpose: "LLM 对话（Anthropic Messages 协议）", auth: "API Key（x-api-key + Bearer）", health: "healthy" },
    { url: "…/anthropic/v1/messages", purpose: "联网搜索（web_search_20250305，max_uses 默认 5）", auth: "API Key", health: "healthy" },
    { url: "…/v1/files", purpose: "图片上传 / 管理（Files API，redirect: error）", auth: "API Key", health: "healthy" },
    { url: "https://harness.deepseek.com", purpose: "自动更新源（强制更新策略校验）", auth: "anonymous", health: "healthy" },
    { url: "{platform}/auth-api/v0/dsh/*", purpose: "账户平台 DSH 方法（登录 / 登出 / 用户信息）", auth: "x-dsh-auth-token", health: "healthy" },
    { url: "{platform}/api/v0/users/get_unnotified_bonuses", purpose: "未读奖励查询 / 确认（钱包）", auth: "x-dsh-auth-token", health: "degraded" },
    { url: "POST /api/v0/chat/create_pow_challenge", purpose: "PoW 挑战下发（completion 前置）", auth: "会话", health: "healthy" },
    { url: "hif-leim / hif-dliq.deepseek.com/query", purpose: "搜索 poller（生产）", auth: "内部", health: "healthy" },
    { url: "hif-test.deepseek.com", purpose: "搜索 poller（测试环境，生产客户端可见）", auth: "内部", health: "unreachable" },
    { url: "gator.volces.com", purpose: "遥测采集（DataFinder，volcengine_enabled 可远程关闭）", auth: "SDK 内置", health: "healthy" }
  ];

  /* ---------- 插件运行时（桌面报告 §5：273 个 dsh-* / 10 分组 / Cordis 4.0.4） ---------- */
  DB.pluginGroups = [
    { id: "llm", name: "LLM 接入", count: 26, desc: "模型接入、重试与账户鉴权", plugins: [
      { pkg: "dsh-llm", ver: "0.1.7", role: "LLM 抽象层与会话补全编排", deps: 6, core: true },
      { pkg: "dsh-llm-deepseek", ver: "0.1.7", role: "DeepSeek 接入（Anthropic Messages 协议，默认 1M 上下文）", deps: 4, core: true },
      { pkg: "dsh-llm-deepseek-api-key", ver: "0.1.7", role: "API Key 凭据接入", deps: 2 },
      { pkg: "dsh-llm-deepseek-account", ver: "0.1.7", role: "平台账户态接入", deps: 3 },
      { pkg: "dsh-llm-pi-ai", ver: "0.1.7", role: "附加提供方接入（pi-ai）", deps: 2 },
      { pkg: "dsh-llm-retry", ver: "0.1.7", role: "补全重试策略（含流式空闲超时 300s）", deps: 1 }
    ]},
    { id: "agent", name: "Agent 循环", count: 18, desc: "agent loop、预设与子代理派生", plugins: [
      { pkg: "dsh-agent", ver: "0.1.7", role: "Agent 会话编排入口", deps: 8, core: true },
      { pkg: "dsh-agent-loop", ver: "0.1.7", role: "补全-工具循环核心", deps: 5, core: true },
      { pkg: "dsh-agent-preset", ver: "0.1.7", role: "Agent 预设（系统提示与工具集）", deps: 2 },
      { pkg: "dsh-subagent", ver: "0.1.7", role: "子代理定义与委派", deps: 4 },
      { pkg: "dsh-subagent-fork", ver: "0.1.7", role: "子代理 fork 派生", deps: 2 },
      { pkg: "dsh-subagent-spawn-in-process", ver: "0.1.7", role: "进程内子代理 spawn", deps: 2 }
    ]},
    { id: "tools", name: "工具", count: 41, desc: "bash / fs / web / workflow / todo / mcp", plugins: [
      { pkg: "dsh-tool-bash", ver: "0.1.7", role: "Shell 命令执行工具", deps: 3, core: true },
      { pkg: "dsh-tool-pwsh", ver: "0.1.7", role: "PowerShell 执行工具（Windows）", deps: 3 },
      { pkg: "dsh-tool-fs", ver: "0.1.7", role: "文件读写与补丁工具", deps: 2, core: true },
      { pkg: "dsh-tool-web", ver: "0.1.7", role: "网页抓取工具", deps: 3 },
      { pkg: "dsh-tool-web-search", ver: "0.1.7", role: "联网搜索工具（web_search_20250305）", deps: 3 },
      { pkg: "dsh-tool-workflow", ver: "0.1.7", role: "多步工作流工具", deps: 2 },
      { pkg: "dsh-tool-todo", ver: "0.1.7", role: "任务清单工具", deps: 1 },
      { pkg: "dsh-tool-subagent", ver: "0.1.7", role: "以工具形态委派子代理", deps: 2 },
      { pkg: "dsh-tool-cordis", ver: "0.1.7", role: "运行时自省工具（cordis 状态）", deps: 2 },
      { pkg: "dsh-mcp-client", ver: "0.1.7", role: "MCP 客户端（外部工具协议）", deps: 4 }
    ]},
    { id: "sandbox", name: "沙箱安全", count: 22, desc: "策略解析与 fs/bash/pwsh 沙箱实现", plugins: [
      { pkg: "dsh-sandbox", ver: "0.1.7", role: "沙箱能力聚合", deps: 3, core: true },
      { pkg: "dsh-sandbox-policy", ver: "0.1.7", role: "三模式策略解析（默认 read-only）", deps: 2, core: true },
      { pkg: "dsh-sandbox-windows-acl", ver: "0.1.7", role: "Windows ACL 沙箱实现", deps: 4 },
      { pkg: "dsh-fs-sandbox", ver: "0.1.7", role: "文件系统写拦截", deps: 2 },
      { pkg: "dsh-bash-sandbox", ver: "0.1.7", role: "Shell 命令沙箱", deps: 3 },
      { pkg: "dsh-pwsh-sandbox", ver: "0.1.7", role: "PowerShell 命令沙箱", deps: 3 }
    ]},
    { id: "session", name: "会话存储", count: 31, desc: "JSONL 持久化、查询、日志与遥测导出", plugins: [
      { pkg: "dsh-session", ver: "0.1.7", role: "会话生命周期与事件流", deps: 5, core: true },
      { pkg: "dsh-session-persistence-jsonl", ver: "0.1.7", role: "JSONL 落盘（zstd、写穿、跨进程锁）", deps: 4, core: true },
      { pkg: "dsh-session-query-sqlite", ver: "0.1.7", role: "会话 SQLite 查询索引", deps: 3 },
      { pkg: "dsh-session-log-deepseek", ver: "0.1.7", role: "会话日志上报", deps: 2 },
      { pkg: "dsh-session-telemetry-otel", ver: "0.1.7", role: "OTel 遥测导出", deps: 3 },
      { pkg: "dsh-session-format-v3-to-v4", ver: "0.1.7", role: "会话格式迁移链最后一环", deps: 1 }
    ]},
    { id: "account", name: "账户认证", count: 19, desc: "平台账户、匿名标识与凭据服务", plugins: [
      { pkg: "dsh-deepseek-account", ver: "0.1.7", role: "账户状态机（含 401/40003 → 重新登录）", deps: 4, core: true },
      { pkg: "dsh-deepseek-account-platform", ver: "0.1.7", role: "平台客户端头与 auth-api 对接", deps: 3 },
      { pkg: "dsh-credentials", ver: "0.1.7", role: "凭据双空间（Ref / Key，只存引用）", deps: 2, core: true },
      { pkg: "dsh-anonymous-user-id", ver: "0.1.7", role: "匿名 UUID（不派生自主机标识）", deps: 1 }
    ]},
    { id: "web", name: "Web 网络", count: 24, desc: "HTTP 抓取、搜索接入与代理", plugins: [
      { pkg: "dsh-web", ver: "0.1.7", role: "Web 能力聚合", deps: 2 },
      { pkg: "dsh-web-fetch-http", ver: "0.1.7", role: "HTTP 抓取（redirect: error）", deps: 2 },
      { pkg: "dsh-web-search-deepseek", ver: "0.1.7", role: "DeepSeek 搜索接入（引用去重）", deps: 3, core: true },
      { pkg: "dsh-http-proxy", ver: "0.1.7", role: "HTTP 代理支持", deps: 2 }
    ]},
    { id: "desktop", name: "桌面宿主", count: 35, desc: "窗口、托盘、IPC、更新与 headless", plugins: [
      { pkg: "dsh-desktop-host", ver: "0.1.7", role: "Electron 宿主（窗口 / 托盘 / IPC）", deps: 9, core: true },
      { pkg: "dsh-cordis-host-runner", ver: "0.1.7", role: "Cordis 内核运行器（版本一致性校验）", deps: 4, core: true },
      { pkg: "dsh-headless", ver: "0.1.7", role: "无界面运行模式", deps: 2 }
    ]},
    { id: "experimental", name: "实验性", count: 17, desc: "团队协作、语音与自动评审", plugins: [
      { pkg: "dsh-experimental-agent-team", ver: "0.1.7-rc", role: "多 Agent 协作实验", deps: 5 },
      { pkg: "dsh-experimental-speech-to-text", ver: "0.1.7-rc", role: "SenseVoice 语音转写", deps: 4 },
      { pkg: "dsh-experimental-voice-input", ver: "0.1.7-rc", role: "语音输入", deps: 2 },
      { pkg: "dsh-experimental-auto-review", ver: "0.1.7-rc", role: "自动评审实验", deps: 3 }
    ]},
    { id: "sdk", name: "SDK 协议", count: 40, desc: "协议、JSONRPC 与 ACP", plugins: [
      { pkg: "dsh-sdk-protocol", ver: "0.1.7", role: "SDK 协议定义", deps: 1, core: true },
      { pkg: "dsh-sdk-jsonrpc-server", ver: "0.1.7", role: "JSONRPC 服务端", deps: 2 },
      { pkg: "dsh-acp", ver: "0.1.7", role: "Agent Client Protocol 接入", deps: 3 },
      { pkg: "dsh-api-gateway-stream-protocol", ver: "0.1.7", role: "远程流复用协议（WebSocket mux）", deps: 2, core: true }
    ]}
  ];

  /* ---------- 会话 JSONL 事件样例（桌面报告 §6.4，用于总览页） ---------- */
  DB.jsonlSample = [
    { ev: '{ "type": "header", "version": 4, "id": "s1", "createdAt": "2026-10-25T10:24:03+08:00", "isSeeded": false, "delegationDepth": 0, "cwd": "~/projects/demo" }' },
    { ev: '{ "type": "message", "id": "m1", "parentId": null, "role": "user", "ts": 1761354240000 }' },
    { ev: '{ "type": "sandbox/mode", "from": "read-only", "to": "workspace-write", "source": "session-override" }' },
    { ev: '{ "type": "tool-result", "tool": "fs.write", "target": "docs/locks.md", "status": "executed" }' },
    { ev: '{ "type": "session/flush", "forced": true, "pending": 3 }' }
  ];

  /* ---------- 会话存储统计（总览页） ---------- */
  DB.storage = {
    sessions: 42, totalEvents: 18704, onDisk: "38.2 MiB", compressed: "zstd ×12 文件",
    lastFlush: "10:32（200ms 批处理 + session/flush 强制）"
  };

  /* ---------- 模型切换原因日志（网页报告 §5.1 selected_model_switch） ---------- */
  DB.modelSwitchLog = [
    { ts: "10:32", from: "deepseek-v4-pro", to: "deepseek-flash", reason: "verbosity_low 快速摘要" },
    { ts: "09:41", from: "deepseek-flash", to: "deepseek-v4-pro", reason: "复杂重构推理" }
  ];

  window.DB = DB;
})();
