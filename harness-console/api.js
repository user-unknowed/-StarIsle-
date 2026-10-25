/* ============================================================
   Harness Console · api.js — 桩 API 层（stub only，不调用真实服务）
   函数签名即"未来真实 API"的形态；接入点以 // TODO 标注
   ============================================================ */
(function () {
  "use strict";
  window.HCA = window.HCA || {};
  var DB = window.DB;

  HCA.delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ------------------------------------------------------------
     PoW（网页报告 §6.1：completion 前置 create_pow_challenge + SHA3 WASM 求解）
     TODO: replace with POST /api/v0/chat/create_pow_challenge
  ------------------------------------------------------------ */
  HCA.api.createPowChallenge = async function () {
    await HCA.delay(380 + Math.random() * 220);
    return { algorithm: "SHA3-256 (wasm)", difficulty: "0x1b", challenge: "9f" + Math.random().toString(16).slice(2, 10) };
  };

  /* 三步 PoW：获取挑战 → 本地求解 → 提交证明；onStep(step, percent) */
  HCA.api.runPow = async function (onStep) {
    var c = await HCA.api.createPowChallenge();
    onStep && onStep("获取挑战 · " + c.algorithm, 18);
    await HCA.delay(520);
    onStep && onStep("SHA3 WASM 本地求解 · difficulty " + c.difficulty, 62);
    await HCA.delay(640);
    onStep && onStep("提交证明 · " + c.challenge.slice(0, 6) + "…", 100);
    await HCA.delay(240);
    return c;
  };

  /* ------------------------------------------------------------
     沙箱写操作裁决（桌面报告 §6.5：解析优先级 + 三模式）
     返回 { action: "allow" | "approval" | "reject", reason }
     read-only → 一律拒绝；workspace-write → 工作区内放行、区外送审批；
     danger-full-access → 放行
  ------------------------------------------------------------ */
  HCA.api.evaluateWrite = function (target, modeOverride) {
    var mode = modeOverride || DB.sandbox.mode, root = DB.sandbox.workspaceRoot;
    if (mode === "danger-full-access") return { action: "allow", reason: "沙箱限制已关闭（danger-full-access）" };
    if (mode === "read-only") return { action: "reject", reason: "read-only 沙箱不允许任何文件修改" };
    var inRoot = target.indexOf(root) === 0;
    if (inRoot) return { action: "allow", reason: "目标在工作区根之内" };
    return { action: "approval", reason: "目标路径在工作区根之外（workspace-write 模式）" };
  };

  /* ------------------------------------------------------------
     补全计划器：根据参数与关键词生成一次"将要流式输出"的完整计划
     TODO: replace with POST /api/v0/chat/completion（stream）
  ------------------------------------------------------------ */
  var CANNED = {
    session: "会话树的关键是 parent/child 关系：每条消息记录 parentId，重新生成会为同一父节点创建新子分支；持久化按 JSONL 追加，回放时沿 active 分支重建可见路径。",
    pow: "PoW 链路分三步：create_pow_challenge 拿挑战 → WASM SHA3 本地求解 → 解随 completion 提交。控制台里可以看到每一步的进度，卡在哪一步就排查哪一段。",
    sandbox: "沙箱的解析优先级是：显式批准的模式 > 会话级 sandbox/mode 覆盖 > 部署默认（read-only）。策略文本会以 sandbox:policy 注入系统提示，所以模式切换后下一轮请求即生效。",
    plugin: "运行时共 273 个 dsh-* 插件，由 Cordis 内核按依赖动态装配；启停只是标记，重启运行时后才真正卸载/加载。核心插件（dsh-llm、dsh-session 等）停用会影响基本能力。",
    credential: "凭据分两个空间：CredentialRef 是环境变量引用（进程环境 → 提供者存储 → .env），CredentialKey 是 <scope>/<id> 记录。界面永远只显示掩码，modifyRecord 是唯一写入路径。"
  };

  HCA.api.planCompletion = function (p) {
    var prompt = (p.prompt || "").trim();
    var lower = prompt.toLowerCase();
    var plan = { thinking: null, tool: null, text: "", sessionEvent: null };

    var topicText = /会话|树|分支|session/i.test(prompt) ? CANNED.session
      : /pow|挑战/i.test(prompt) ? CANNED.pow
      : /沙箱|sandbox|审批/i.test(prompt) ? CANNED.sandbox
      : /插件|plugin/i.test(prompt) ? CANNED.plugin
      : /凭据|密钥|key|credential/i.test(prompt) ? CANNED.credential
      : null;

    /* 场景一：联网搜索（search_enabled 开启，或明确要求检索且已开启） */
    var wantsSearch = p.search || /联网|搜一下|查一下|搜索/i.test(prompt);
    if (wantsSearch && p.search) {
      plan.tool = {
        type: "tool", tool: "web_search", target: prompt.slice(0, 40), status: "executed", maxUses: 5,
        results: [
          { title: "Tree-structured conversation design notes", url: "https://example.dev/notes/tree-conversations", pageAge: "2025-11", quote: "Branching on regeneration keeps every candidate answer addressable by (parent, child) pairs." },
          { title: "Anthropic Messages API — web_search tool", url: "https://docs.example.dev/web-search-tool", pageAge: "2026-01", quote: "The web_search_20250305 server tool returns web_search_result blocks with url, title and page_age; dedupe by URL." }
        ]
      };
      plan.text = "检索完成，已按 URL 去重。\n\n要点：会话树用 (parent, child) 对定位每条消息；重新生成即新增分支；引用摘要来自 citations[].cited_text。详见上方引用卡片。\n\n" + (topicText ? "\n另外，结合本地上下文：" + topicText : "");
      if (p.thinking) plan.thinking = { sec: 1.1, text: "用户要的是外部佐证。计划：先发起 web_search（max_uses 5），拿到 url/title/page_age 后去重，再提炼与本地领域模型对应的结论。" };
      return plan;
    }
    if (wantsSearch && !p.search) {
      plan.text = "这条请求看起来需要外部资料，但当前 search_enabled 处于关闭状态。请在输入区上方的参数条打开\"联网搜索\"后重新发送，我会在本地知识范围内先给出结论：" + (topicText || "等待你开启后重试。");
      return plan;
    }

    /* 场景二：文件写入（触发沙箱裁决） */
    var m = prompt.match(/([\w\-\/]+\.(?:md|json|py|js|ts|txt|yaml|yml))/i);
    if (/更新|修改|写入|创建|保存|落盘|生成/.test(prompt) && m) {
      var fname = m[1];
      var target = fname.indexOf("/") === 0 || fname.indexOf("~") === 0 ? fname : DB.sandbox.workspaceRoot + "/" + fname;
      var verdict = HCA.api.evaluateWrite(target, p.sandboxMode);
      var toolBlock = { type: "tool", tool: "fs.write", target: target, status: "executed",
        summary: "按请求写入 " + fname,
        out: "patch " + fname + "\n+ (由 Harness Console 原型生成的示例补丁)\n✓ 1 file changed" };
      if (verdict.action === "allow") {
        plan.tool = toolBlock;
        plan.text = "已写入 " + fname + "（沙箱裁决：" + verdict.reason + "）。补丁摘要见上方工具块，diff 已并入会话事件流。";
      } else if (verdict.action === "approval") {
        plan.tool = toolBlock; plan.tool.status = "awaiting_approval"; plan.tool.out = "";
        plan.approvalNeeded = { tool: "fs.write", target: target, summary: "写入 " + fname + "（工作区外路径）" };
        plan.text = "该写入请求需要你审批：目标路径在工作区根（" + DB.sandbox.workspaceRoot + "）之外。批准后我会继续执行；也可以到「沙箱与审批」页集中处理。";
      } else {
        plan.tool = toolBlock; plan.tool.status = "rejected";
        plan.tool.out = "✗ 已拒绝：" + verdict.reason;
        plan.text = "写入被沙箱拒绝：" + verdict.reason + "\n\n可选项：\n1. 到「沙箱与审批」页切换为 workspace-write；\n2. 或保持只读，由我把拟写入的内容直接贴在对话里。";
      }
      if (p.thinking) plan.thinking = { sec: 1.4, text: "写文件前先过沙箱裁决：当前模式 " + DB.sandbox.mode + "，目标 " + target + "。按裁决结果组织回复：放行 → 执行并汇报；区外 → 送审批；只读 → 拒绝并给出替代路径。" };
      return plan;
    }

    /* 场景三：命令执行 */
    if (/命令|运行|执行|curl|npm|python/i.test(prompt)) {
      var cmd = prompt.match(/(?:curl|npm|python|pnpm)[^\n；;]*/i);
      cmd = cmd ? cmd[0].trim() : "ls -la";
      var outTarget = (cmd.match(/(?:-o|>|--output)[\s=]+(\S+)/i) || [])[1];
      if (outTarget) {
        var v2 = HCA.api.evaluateWrite(outTarget.indexOf("/") === 0 ? outTarget : DB.sandbox.workspaceRoot + "/" + outTarget, p.sandboxMode);
        if (v2.action === "approval") {
          plan.tool = { type: "tool", tool: "bash", target: cmd, status: "awaiting_approval", out: "" };
          plan.approvalNeeded = { tool: "bash", target: cmd, summary: "命令会把输出写到工作区外：" + outTarget };
          plan.text = "这条命令要把输出写到工作区外，等待审批后执行。";
          return plan;
        }
        if (v2.action === "reject") {
          plan.tool = { type: "tool", tool: "bash", target: cmd, status: "rejected", out: "✗ 已拒绝：" + v2.reason };
          plan.text = "命令被沙箱拒绝：" + v2.reason + "。可切换沙箱模式后重试，或改为仅输出到终端。";
          return plan;
        }
      }
      plan.tool = { type: "tool", tool: "bash", target: cmd, status: "executed",
        out: "$ " + cmd + "\n（Harness Console 原型：示例输出）\ntotal 8\ndrwxr-xr-x  4 pc  staff  128 Oct 25 10:24 ." };
      plan.text = "命令已在沙箱内执行，输出见工具块。需要把结果整理进文档的话告诉我目标文件。";
      if (p.thinking) plan.thinking = { sec: 1.0, text: "命令是否产生写副作用？检查重定向/输出参数；有则先过沙箱裁决，无则直接执行并回显。" };
      return plan;
    }

    /* 场景四：默认解释型 */
    plan.text = topicText || ("已收到：「" + prompt.slice(0, 60) + (prompt.length > 60 ? "…" : "") + "」。\n\n在原型模式下我按 Harness 运行时的话术回应：会话以树状结构组织（parent/child_message_id），运行参数（模型 / 思考 / 搜索 / 推理强度）逐请求生效，写操作受沙箱三模式约束。试着让我\"更新某个 .md 文件\"或\"联网查一下\"，可以触发工具调用与审批链路。");
    if (p.thinking) plan.thinking = { sec: 0.9, text: "默认场景：结合运行时领域知识作答；若问题命中会话/PoW/沙箱/插件/凭据主题，使用对应的结构化要点。" };
    if (p.verbosity === "low") plan.text = plan.text.split("\n")[0];
    return plan;
  };

  /* 流式执行：把 plan 按块流给页面；handlers: onThinking(sec,text), onTool(block), onToken(chunk), onDone(plan) */
  HCA.api.streamCompletion = async function (plan, handlers) {
    if (plan.thinking && handlers.onThinking) {
      var t = plan.thinking.text, i = 0;
      handlers.onThinking(plan.thinking.sec, "");
      while (i < t.length) {
        var step = Math.min(6, t.length - i);
        i += step;
        handlers.onThinking(plan.thinking.sec, t.slice(0, i));
        await HCA.delay(26);
      }
    }
    if (plan.tool && handlers.onTool) { handlers.onTool(plan.tool); await HCA.delay(560); }
    if (handlers.onToken) {
      var s = plan.text, j = 0;
      while (j < s.length) {
        var k = Math.min(3 + Math.floor(Math.random() * 3), s.length - j);
        var chunk = s.slice(j, j + k);
        j += k;
        handlers.onToken(chunk);
        await HCA.delay(20);
      }
    }
    handlers.onDone && handlers.onDone(plan);
    return plan;
  };

  /* ------------------------------------------------------------
     审批状态机（桌面报告 §6.5：批准/拒绝 → 事件回流会话）
     TODO: replace with POST /sandbox/approvals/:id/decision
  ------------------------------------------------------------ */
  HCA.api.decideApproval = async function (id, decision) {
    await HCA.delay(320);
    var ap = DB.approvals.find(function (a) { return a.id === id; });
    if (!ap) throw new Error("approval not found: " + id);
    ap.status = decision;
    ap.decision = decision;
    ap.decidedAt = "刚刚";
    return ap;
  };

  HCA.api.addApproval = function (entry) {
    var id = "ap" + (DB.approvals.length + 1) + Math.floor(Math.random() * 90 + 10);
    var ap = Object.assign({ id: id, status: "pending", ts: "刚刚", sessionId: "s1", reason: "由会话内操作产生" }, entry);
    DB.approvals.unshift(ap);
    return ap;
  };

  /* ------------------------------------------------------------
     会话/参数/状态变更类桩
  ------------------------------------------------------------ */
  HCA.api.createSession = function (title) {
    var n = DB.sessions.length + 1;
    var s = { id: "s" + n, title: title || "新会话", createdAt: "刚刚", updatedAt: "刚刚", cwd: DB.sandbox.workspaceRoot, sandboxMode: DB.sandbox.mode, version: "v4", msgs: 0, activeBranches: {} };
    DB.sessions.unshift(s);
    DB.messages[s.id] = [];
    return s;
  };

  HCA.api.renameSession = function (id, title) {
    var s = DB.sessions.find(function (x) { return x.id === id; });
    if (s) s.title = title;
    return s;
  };

  HCA.api.appendMessage = function (sessionId, msg) {
    DB.messages[sessionId] = DB.messages[sessionId] || [];
    DB.messages[sessionId].push(msg);
    var s = DB.sessions.find(function (x) { return x.id === sessionId; });
    if (s) { s.msgs = DB.messages[sessionId].length; s.updatedAt = "刚刚"; }
    return msg;
  };

  HCA.api.setSandboxMode = async function (mode) {
    await HCA.delay(260);
    DB.sandbox.mode = mode;
    DB.sandbox.overrides.unshift({ ts: "刚刚", from: DB.sandbox.deployDefault === mode ? "workspace-write" : "read-only", to: mode, session: "s1", by: "sandbox/mode 会话事件" });
    return DB.sandbox;
  };

  HCA.api.setTelemetry = async function (v) {
    await HCA.delay(200);
    DB.telemetry.enabled = !!v;
    return DB.telemetry;
  };

  HCA.api.setPluginEnabled = function (pkg, enabled) {
    DB.pluginGroups.forEach(function (g) {
      g.plugins.forEach(function (pl) { if (pl.pkg === pkg) pl.enabled = enabled; });
    });
    return pkg;
  };

  HCA.api.appendMessage.apiNote = "state helper";
})();
