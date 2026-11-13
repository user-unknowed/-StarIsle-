/* ima 复刻版 · 前端主逻辑
   零第三方依赖、零 CDN。双模式：
   - live：同源探测 /api（三级基址），所有写操作按 { ok, state } 全量回传后重渲染
   - demo：file:// 打开或服务端不可达时，用 localStorage 内的演示数据完整跑通五页
   依赖：./md.js 暴露的 window.IMAMD（render / inline / escape） */
(function () {
  'use strict';

  var KEY_DB = 'ima.demo.v2';
  var KEY_VIEW = 'ima.view';
  var KEY_THEME = 'ima.theme';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function uid() {
    try {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (e) { /* file:// 下不是安全上下文 */ }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* 与 Kotlin TimeFmt.short 对齐：MM-dd HH:mm */
  function fmtShort(ts) {
    var d = new Date(ts || Date.now());
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtHuman(ts) {
    var diff = Date.now() - (ts || 0);
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 86400000 * 7) return Math.floor(diff / 86400000) + ' 天前';
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function md(src) {
    if (window.IMAMD && typeof window.IMAMD.render === 'function') return window.IMAMD.render(src);
    return '<p>' + esc(src) + '</p>';
  }

  /* ---------------- 轻提示与确认框 ---------------- */

  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = String(msg == null ? '' : msg);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  var dlgResolve = null;
  function confirmDlg(title, text, danger) {
    var dlg = $('#dlg');
    if (!dlg || typeof dlg.showModal !== 'function') {
      return Promise.resolve(window.confirm(title + '\n' + text));
    }
    $('#dlgTitle').textContent = title;
    $('#dlgText').textContent = text;
    $('#dlgOk').className = 'btn ' + (danger === false ? '' : 'danger');
    dlg.returnValue = '';
    return new Promise(function (resolve) {
      dlgResolve = resolve;
      dlg.showModal();
    });
  }

  /* ---------------- 文本工具：存储 ---------------- */

  var memStore = {};
  var ls = {
    get: function (k) {
      try { return window.localStorage.getItem(k); } catch (e) { return memStore[k] == null ? null : memStore[k]; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) { memStore[k] = v; }
    }
  };

  /* ============================================================
     演示数据（与 Kotlin 侧 App.seed / Catalog 保持一致）
     ============================================================ */

  var SEED_WELCOME = [
    '# 欢迎使用 ima 复刻版',
    '',
    '这是一个用 Kotlin 自绘实现的 ima.copilot 复刻工程：桌面端是 Swing，手机端复用同一套核心逻辑，由 JDK 内置 HttpServer 暴露 JSON API 并托管这份响应式前端。',
    '',
    '## 已还原的部分',
    '',
    '- 暗色主题与品牌绿 `#079d55` 的左侧导航',
    '- 会话式对话界面、消息气泡、“检索中”占位、本地持久化',
    '- 知识库导入 + 本地倒排检索 + 命中片段引用',
    '- 笔记编辑与 Markdown 实时预览',
    '- 设置：主题 / 数据目录 / 引擎状态',
    '',
    '## 逆向到的事实（摘要）',
    '',
    '| 维度 | 实测结论 |',
    '| --- | --- |',
    '| 运行时 | 定制 Chromium 150.0.7871.x，不是 Electron |',
    '| 壳页面 | `chrome://home` 原生壳页 + 24 个 MV3 扩展 |',
    '| 前端 | React + TDesign React，Markdown 用 markdown-it 系 |',
    '| 内置扩展 | 知识库 / 笔记 / 脑图 / PDF / Office / EPUB 等 |',
    '| 安装器 | mini_installer.exe，尾部追加 7z 压缩包 |',
    '',
    '## 没有伪造的部分',
    '',
    '云端问答、全网搜索、登录同步都依赖 `ima.qq.com` 私有后端（登录态 Cookie、设备指纹 QIMEI、请求签名），本复刻版不伪造这套调用。',
    '',
    '试试在下方输入一个问题，或先到「知识库」导入一个 Markdown 文件。'
  ].join('\n');

  var SEED_NOTE = [
    '# 逆向速记',
    '',
    '## 制品',
    '',
    '- `mini_installer.exe` · 202,875,160 字节 · EV 签名 · FileVersion 150.0.7871.5317',
    '- 安装目录 `%LOCALAPPDATA%\\ima.copilot\\Application\\150.0.7871.5522`',
    '- Shiply 增量更新 2.6.15 / 2.6.16 / 2.6.17',
    '',
    '## 解包链',
    '',
    '```text',
    'mini_installer.exe',
    '└─ 尾部 7z @ 2,583,688（200,291,472 字节）',
    '   └─ chrome.7z（560,027,153 字节）',
    '      └─ Chrome-bin/150.0.7871.5317/*.dll, *.pak, ima.copilot.exe',
    '```',
    '',
    '## 关键模块',
    '',
    '| 模块 | 体积 | 作用 |',
    '| --- | --- | --- |',
    '| chrome.dll | 278 MB | Chromium 内核 |',
    '| ImSDK.dll | — | 即时通讯 |',
    '| shiply.dll | — | 增量更新 |',
    '| beacon_sdk.dll | — | 埋点上报 |',
    '| bugly_logger.dll | — | 崩溃上报 |',
    '| qimei.dll | — | 设备指纹 |',
    '| client_extension.dll | — | 扩展加载 |',
    '',
    '> 后续要补：`resources.pak` 中 `chrome_url_overrides` 的完整映射。'
  ].join('\n');

  var SEED_DOC_NAME = 'ima 逆向要点.md';
  var SEED_DOC = [
    'ima.copilot 逆向要点备忘',
    '',
    '一、产品形态',
    '',
    'ima.copilot 不是 Electron 应用。安装目录里没有 app.asar，取而代之的是一份定制 Chromium（150.0.7871.x）与一个 ima.copilot.exe 壳进程。启动后加载的是 chrome://home 原生壳页，界面由 24 个 Manifest V3 扩展拼装而成，其中「IMA知识库」「问问ima」「记笔记」通过 chrome_url_overrides 接管 allknowledge、note、history、global_settings 四个内置页面。扩展还声明了专有权限 imaFrame，用来在壳页与扩展页之间传递消息。',
    '',
    '二、前端技术栈',
    '',
    '壳页与扩展页统一使用 React + TDesign React 组件库。Markdown 渲染链是 markdown-it，公式走 KaTeX，脑图走 markmap，流程图走 mermaid，关系图走 cytoscape，导出图片用 html2canvas。这套组合决定了若要一比一还原需要引入大量第三方库；本工程选择零依赖自绘，只保留可迁移的交互范式。',
    '',
    '三、能力边界',
    '',
    '对话能力由 ima.qq.com 私有后端提供，请求带登录态 Cookie、设备指纹 QIMEI 与签名参数，无法离线复现。PDF、Office、EPUB 阅读依赖 PDFium、POI 之类的原生解析器；音视频与 TTS 依赖系统媒体栈。因此这些模块在复刻版中统一标注为占位，界面上给出明确说明，而不是做一个点了没反应的假按钮。',
    '',
    '四、工程取舍',
    '',
    '复刻工程使用 Kotlin 1.9.25 + Gradle 8.9 + JDK 17，仅依赖 kotlin-stdlib。桌面端 Swing 自绘；手机端复用同一份核心逻辑，通过 JDK 内置 HttpServer 暴露 JSON API 并托管这份 PWA。知识库检索使用中文单字加 bigram 分词与 IDF 打分，纯内存实现，导入时按 600 字切块、80 字重叠。',
    '',
    '五、已知问题',
    '',
    'exFAT 盘上 Gradle 清理 build 目录会报 not empty，需要改名重建；125% DPI 缩放下 Robot 截图会混入桌面区域，应改用浏览器验证；Markdown 表格单元格的内联样式此前被解析两次，导致粗体嵌套错乱，现已改为单元格原文只走一次 inline 解析。'
  ].join('\n');

  var CATALOG = [
    { name: 'IMA知识库', extId: 'nkohmbngmopdajidckglcoehlaeepeoi', version: '5.22.5', state: '部分实装', note: 'chrome_url_overrides: allknowledge；本工程复刻为本地知识库 + 检索' },
    { name: '问问ima', extId: 'cnpjbkidlfannncommmljnmmmjijfdgg', version: '5.20.4', state: '占位', note: '对话入口，依赖 ima.qq.com 私有后端' },
    { name: '记笔记', extId: 'cninonkgpcmdognjppglnkelbkhlhhee', version: '4.62.2', state: '已实装', note: '笔记 CRUD + Markdown 预览' },
    { name: 'imaHub', extId: 'kelliennekihkkpejaejdbaaindamfkh', version: '5.12.1', state: '占位', note: '首页聚合模块' },
    { name: 'IMA设置', extId: 'khmgfdkajnigikondkcjbaflpjflfiee', version: '5.12.0', state: '部分实装', note: '主题 / 数据目录 / 引擎状态' },
    { name: 'IMA搜索', extId: 'akncmfemomfkkgiffphoedpiioanbflo', version: '5.19.3', state: '部分实装', note: '知识库内检索已实现；全网搜索未接' },
    { name: 'IMA收藏', extId: 'egkgeljgkehpdelhobnmbpkjjjfmacfl', version: '5.8.2', state: '占位', note: '收藏夹' },
    { name: 'IMA历史', extId: 'lbkbcakndpflbdfccignkdljhbkaglha', version: '5.1.4', state: '占位', note: '浏览历史' },
    { name: 'IMA 网页翻译', extId: 'jgbkoppinnkajdckajmppgnefifmgnld', version: '1.13.0', state: '占位', note: '翻译' },
    { name: '脑图编辑器', extId: 'plpfbadbocioapeolmdippopkebeapof', version: '5.8.3', state: '占位', note: '原版使用 markmap' },
    { name: 'PDF Extension', extId: 'elhgpcianbbmeilccnddimfddkgegeee', version: '5.14.3', state: '占位', note: 'PDF 渲染需要 PDFium / PDFBox' },
    { name: 'office 查看器', extId: 'jmfjadjclplhcchkjjnjoinbfmdhjkhh', version: '5.13.3', state: '占位', note: 'docx / xlsx 解析需要 POI' },
    { name: 'epub查看器', extId: 'oaifjdgehbjmnnfkjagnadaipgjdkbaa', version: '5.10.3', state: '占位', note: 'EPUB 解析' },
    { name: 'markdown查看器', extId: 'cbgfjbdckbpenliighcjcbjfiihnnkfe', version: '5.14.3', state: '已实装', note: '自绘 Markdown 渲染器' },
    { name: 'code查看器', extId: 'eelcllbacbedmhanfdfaapgmmnckpbhh', version: '5.12.3', state: '部分实装', note: '代码块等宽渲染' },
    { name: 'HTML沙箱', extId: 'ocabijiofglkcngiibeoenlbhgaffkki', version: '5.7.0', state: '占位', note: '需要隔离渲染环境' },
    { name: '播客播放器', extId: 'emagenjhmpjalpoconjkojjhiljigfoh', version: '5.9.0', state: '占位', note: '音频播放' },
    { name: '音频播放器', extId: 'jkfgholpigobipmfnpckjghnfbbkpecn', version: '5.8.3', state: '占位', note: '音频播放' },
    { name: '录音插件', extId: 'hgpacghgeonehmbpbfgfceodbeaohlfb', version: '5.7.0', state: '占位', note: '麦克风采集' },
    { name: '图片工具', extId: 'jhnkclbnlaofmbgaepmgiedepkbafipg', version: '5.9.4', state: '占位', note: 'OCR / 图片处理' },
    { name: 'txt查看器', extId: 'edmepjlhfjgindglnlieahgkijdampma', version: '5.10.3', state: '已实装', note: '由知识库导入 + 预览覆盖' },
    { name: 'copilot', extId: 'miolgkmpainjjfndkopicefgbjdmpllk', version: '4.8.5', state: '占位', note: '侧边 Copilot 面板' },
    { name: 'qo_documents', extId: 'gbkeegbaiigmenfmjfclcdgdpimamgkj', version: '152.160.162', state: '占位', note: 'Chromium 内置文档组件' },
    { name: '用量统计活动', extId: 'cdldgbooaochlonaceckeeooaajplpef', version: '5.2.0', state: '占位', note: '账号用量' }
  ];

  var DEMO_TAIL = [
    '---',
    '',
    '### 为什么是“占位回答”',
    '',
    '这个复刻版没有接入真实大模型。逆向确认 ima 的对话能力由 `ima.qq.com` 私有后端提供，调用链依赖登录态 Cookie、设备指纹（QIMEI）与请求签名，仓库里不伪造这套调用。',
    '',
    '若要在本工程里接真实模型：实现 `com.ima.clone.core.AiEngine` 接口，替换 `App.engine` 即可，界面层无需改动。',
    '',
    '> 提示：在「知识库」导入一段资料后再提问，可以看到本地检索链路真实工作。'
  ].join('\n');

  /* ---------------- 检索算法：逐行移植 Knowledge.kt ---------------- */

  function splitText(text, size, overlap) {
    if (text.length <= size) return [text];
    var out = [];
    var start = 0;
    while (start < text.length) {
      var end = Math.min(start + size, text.length);
      if (end < text.length) {
        var nl = text.lastIndexOf('\n', end);
        if (nl > start + Math.floor(size / 2)) end = nl;
      }
      out.push(text.slice(start, end));
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
    return out;
  }

  var WORD_RE = null;
  try { WORD_RE = new RegExp('[\\p{L}\\p{N}]', 'u'); } catch (e) { WORD_RE = /[0-9A-Za-z\u00c0-\u024f]/; }

  function tokenize(s) {
    var out = [];
    var buf = '';
    var prev = null;
    var chars = Array.from(String(s == null ? '' : s).toLowerCase());
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      var code = c.codePointAt(0);
      var isCjk = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
      if (isCjk) {
        if (buf) { out.push(buf); buf = ''; }
        out.push(c);
        if (prev) out.push(prev + c);
        prev = c;
        continue;
      }
      if (WORD_RE.test(c)) {
        buf += c;
        prev = null;
      } else {
        if (buf) { out.push(buf); buf = ''; }
        prev = null;
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  function countOcc(hay, needle) {
    if (!needle) return 0;
    var c = 0;
    var i = 0;
    while (true) {
      var idx = hay.indexOf(needle, i);
      if (idx < 0) break;
      c++;
      i = idx + needle.length;
      if (c > 50) break;
    }
    return c;
  }

  /* chunks: [{ docId, docName, seq, text }] */
  function searchChunks(chunks, query, topK) {
    var q = [];
    var seen = Object.create(null);
    tokenize(query).forEach(function (t) {
      if (!seen[t]) { seen[t] = 1; q.push(t); }
    });
    if (!q.length || !chunks.length) return [];

    var n = chunks.length;
    var lows = chunks.map(function (c) { return c.text.toLowerCase(); });
    var df = Object.create(null);
    q.forEach(function (t) {
      var d = 0;
      for (var i = 0; i < lows.length; i++) if (lows[i].indexOf(t) >= 0) d++;
      df[t] = d;
    });

    var scored = [];
    for (var i = 0; i < lows.length; i++) {
      var score = 0;
      for (var j = 0; j < q.length; j++) {
        var t = q[j];
        var tf = countOcc(lows[i], t);
        if (tf > 0) {
          var idf = Math.log(1 + (n + 1) / (df[t] + 0.5));
          score += (1 + Math.log(tf)) * idf;
        }
      }
      if (score > 0) scored.push({ chunk: chunks[i], score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, topK || 6);
  }

  function snippetOf(text, query, len) {
    len = len || 160;
    var toks = tokenize(query);
    var low = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < toks.length; i++) {
      var p = low.indexOf(toks[i]);
      if (p >= 0) { pos = p; break; }
    }
    if (pos < 0) return text.slice(0, len);
    var start = Math.max(0, pos - Math.floor(len / 3));
    var end = Math.min(start + len, text.length);
    var s = text.slice(start, end);
    if (start > 0) s = '…' + s;
    if (end < text.length) s = s + '…';
    return s.replace(/\n/g, ' ');
  }

  function stripHtml(raw) {
    return String(raw)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  /* ============================================================
     P2 · 运行时状态、传输层、演示数据层
     ============================================================ */

  var S = {
    state: null,
    session: null,
    catalog: null,
    view: 'chat',
    busy: false,
    noteId: null,
    noteDirty: false,
    catFilter: 'all',
    installEvent: null,
    searchQuery: ''
  };

  var API = { mode: 'demo', base: null };

  function fail(err) {
    toast('操作失败：' + (err && err.message ? err.message : '未知错误'));
  }

  /* ---------------- HTTP ---------------- */

  function http(base, path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', cache: 'no-store', headers: {} };
    if (opts.body !== undefined && opts.body !== null) {
      if (typeof opts.body === 'string') {
        init.body = opts.body;
        init.headers['Content-Type'] = 'text/plain;charset=utf-8';
      } else {
        init.body = JSON.stringify(opts.body);
        init.headers['Content-Type'] = 'application/json;charset=utf-8';
      }
    }
    var timer = null;
    if (typeof AbortController === 'function') {
      var ctrl = new AbortController();
      init.signal = ctrl.signal;
      timer = setTimeout(function () { try { ctrl.abort(); } catch (e) { /* ignore */ } }, opts.timeout || 15000);
    }
    return fetch((base || '') + path, init).then(function (res) {
      return res.text().then(function (body) {
        var data;
        try {
          data = body ? JSON.parse(body) : null;
        } catch (e) {
          throw new Error('服务端返回的不是 JSON（HTTP ' + res.status + '）');
        }
        if (!res.ok) throw new Error((data && (data.error || data.message)) || ('HTTP ' + res.status));
        if (data == null) throw new Error('服务端返回为空');
        return data;
      });
    }).then(function (d) {
      clearTimeout(timer);
      return d;
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  /* 三级基址探测：同源根 → ./ → ../。file:// 直接进演示模式。 */
  var BASES = ['', '.', '..'];

  function probeBase() {
    if (location.protocol === 'file:' || typeof fetch !== 'function') return Promise.resolve(null);
    var i = 0;
    function step() {
      if (i >= BASES.length) return Promise.resolve(null);
      var base = BASES[i++];
      return http(base, '/api/state', { timeout: 1600 }).then(function (d) {
        return (d && Array.isArray(d.sessions)) ? base : step();
      }, function () { return step(); });
    }
    return step();
  }

  /* ---------------- 演示数据 ---------------- */

  var Demo = {
    db: null,
    seed: function () {
      var now = Date.now();
      return {
        dark: true,
        currentSessionId: 's-demo-welcome',
        currentNoteId: 'n-demo-seed',
        sessions: [{
          id: 's-demo-welcome',
          title: '欢迎使用 ima 复刻版',
          updatedAt: now,
          messages: [{ role: 'assistant', content: SEED_WELCOME, ts: now }]
        }],
        notes: [{ id: 'n-demo-seed', title: '逆向速记', updatedAt: now, content: SEED_NOTE }],
        docs: [{ id: 'd-demo-seed', name: SEED_DOC_NAME, text: SEED_DOC, time: now }]
      };
    },
    load: function () {
      if (this.db) return this.db;
      var raw = ls.get(KEY_DB);
      var db = null;
      if (raw) {
        try { db = JSON.parse(raw); } catch (e) { db = null; }
      }
      if (!db || !Array.isArray(db.sessions) || !Array.isArray(db.notes)) db = this.seed();
      if (!Array.isArray(db.docs)) db.docs = [];
      if (typeof db.dark !== 'boolean') db.dark = true;
      if (!db.sessions.length) db.sessions = this.seed().sessions;
      var ids = db.sessions.map(function (s) { return s.id; });
      if (!db.currentSessionId || ids.indexOf(db.currentSessionId) < 0) db.currentSessionId = db.sessions[0].id;
      this.db = db;
      return db;
    },
    save: function (db) {
      if (db) this.db = db;
      try { ls.set(KEY_DB, JSON.stringify(this.db)); } catch (e) { /* 配额满时静默降级为内存模式 */ }
    }
  };

  function demoNotesSorted(db) {
    return db.notes.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  }

  function demoChunks(db) {
    var out = [];
    (db.docs || []).forEach(function (d) {
      splitText(String(d.text || ''), 600, 80).forEach(function (t, i) {
        out.push({ docId: d.id, docName: d.name, seq: i, text: t });
      });
    });
    return out;
  }

  function demoDerive(db) {
    var chunks = demoChunks(db);
    var chars = 0;
    (db.docs || []).forEach(function (d) { chars += String(d.text || '').length; });
    var sorted = db.sessions.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return {
      app: 'ima 复刻版',
      version: '1.1.0 · 演示',
      engine: 'ima 本地占位引擎 · 浏览器演示',
      dark: !!db.dark,
      dataDir: '浏览器 localStorage（演示数据）',
      currentSessionId: db.currentSessionId,
      sessions: sorted.map(function (s) {
        var msgs = s.messages || [];
        var last = msgs[msgs.length - 1];
        return {
          id: s.id,
          title: s.title || '新对话',
          updatedAt: s.updatedAt || 0,
          time: fmtShort(s.updatedAt || Date.now()),
          count: msgs.length,
          preview: last ? String(last.content || '').replace(/\n/g, ' ').slice(0, 56) : ''
        };
      }),
      notes: demoNotesSorted(db).map(function (n) {
        return {
          id: n.id,
          title: n.title || '未命名笔记',
          updatedAt: n.updatedAt || 0,
          time: fmtShort(n.updatedAt || Date.now()),
          preview: String(n.content || '').replace(/\n/g, ' ').slice(0, 64),
          content: String(n.content || '')
        };
      }),
      kb: {
        chunks: chunks.length,
        chars: chars,
        docs: (db.docs || []).map(function (d) {
          return { id: d.id, name: d.name, chars: String(d.text || '').length, time: fmtShort(d.time || Date.now()) };
        })
      }
    };
  }

  function demoSessJson(s) {
    return {
      id: s.id,
      title: s.title || '新对话',
      updatedAt: s.updatedAt || 0,
      messages: (s.messages || []).map(function (m) {
        return {
          role: m.role,
          content: m.content,
          ts: m.ts || 0,
          time: fmtShort(m.ts || Date.now())
        };
      })
    };
  }

  function demoSession(id) {
    var db = Demo.load();
    for (var i = 0; i < db.sessions.length; i++) {
      if (db.sessions[i].id === id) return demoSessJson(db.sessions[i]);
    }
    return null;
  }

  /* 与 AiEngine.reply 同构：topK=4，四类分支 + 固定尾段 */
  function demoReply(db, prompt) {
    var hits = searchChunks(demoChunks(db), prompt, 4);
    var head;
    if (!hits.length) {
      if (!(db.docs || []).length) {
        head = '当前还没有可检索的知识。请到「知识库」导入 txt / md / csv / json 等文件。\n\n';
      } else {
        head = '本地知识库（' + db.docs.length + ' 个文档）中没有命中这个问题。\n\n';
      }
    } else {
      head = '已从本地知识库检索到 **' + hits.length + '** 段相关内容：\n\n';
      hits.forEach(function (h, i) {
        head += '**[' + (i + 1) + '] ' + h.chunk.docName + '** · 相关度 ' + h.score.toFixed(2) + '\n\n';
        head += '> ' + String(h.chunk.text).slice(0, 240).replace(/\n/g, ' ') + '\n\n';
      });
    }
    return head + DEMO_TAIL;
  }

  function demoFindSession(db, id) {
    for (var i = 0; i < db.sessions.length; i++) {
      if (db.sessions[i].id === id) return db.sessions[i];
    }
    return null;
  }

  /* 演示模式下的 /api 等价实现；调用方统一走 call() */
  function demoRequest(path, opts) {
    opts = opts || {};
    var db = Demo.load();
    var qi = path.indexOf('?');
    var p = qi < 0 ? path : path.slice(0, qi);
    var q = {};
    if (qi >= 0) {
      path.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var i = kv.indexOf('=');
        var k = i < 0 ? kv : kv.slice(0, i);
        var v = i < 0 ? '' : kv.slice(i + 1);
        try { q[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { q[k] = v; }
      });
    }
    var body = opts.body;
    var payload = (body && typeof body === 'object') ? body : {};
    var raw = typeof body === 'string' ? body : '';
    var now = Date.now();
    var self, i;

    if (p === '/api/state') return demoDerive(db);

    if (p === '/api/catalog') return { modules: CATALOG };

    if (p === '/api/session') {
      self = demoFindSession(db, String(q.id || ''));
      if (!self) throw new Error('会话不存在');
      return demoSessJson(self);
    }

    if (p === '/api/sessions/new') {
      self = { id: uid(), title: '新对话', updatedAt: now, messages: [] };
      db.sessions.unshift(self);
      db.currentSessionId = self.id;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/sessions/select') {
      self = demoFindSession(db, String(payload.id || ''));
      if (!self) throw new Error('会话不存在');
      db.currentSessionId = self.id;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/sessions/delete') {
      var did = String(payload.id || '');
      db.sessions = db.sessions.filter(function (s) { return s.id !== did; });
      if (!db.sessions.length) {
        db.sessions = [{ id: uid(), title: '新对话', updatedAt: Date.now(), messages: [] }];
      }
      if (!demoFindSession(db, db.currentSessionId)) {
        var sorted = db.sessions.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        db.currentSessionId = sorted[0].id;
      }
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/chat') {
      var text = String(payload.text == null ? '' : payload.text).trim();
      if (!text) throw new Error('消息不能为空');
      self = demoFindSession(db, String(payload.sessionId || db.currentSessionId || ''));
      if (!self) throw new Error('会话不存在');
      db.currentSessionId = self.id;
      self.messages.push({ role: 'user', content: text, ts: now });
      if (!self.title || self.title === '新对话') self.title = text.replace(/\n/g, ' ').slice(0, 20);
      self.messages.push({ role: 'assistant', content: demoReply(db, text), ts: Date.now() });
      self.updatedAt = Date.now();
      Demo.save(db);
      return { ok: true, session: demoSessJson(self), state: demoDerive(db) };
    }

    if (p === '/api/notes/new') {
      self = { id: uid(), title: '未命名笔记', updatedAt: now, content: '# 未命名笔记\n\n开始书写…\n' };
      db.notes.unshift(self);
      db.currentNoteId = self.id;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/notes/save') {
      var nid = String(payload.id || '');
      self = null;
      for (i = 0; i < db.notes.length; i++) if (db.notes[i].id === nid) self = db.notes[i];
      if (!self) throw new Error('笔记不存在');
      self.title = String(payload.title == null ? '' : payload.title).trim() || '未命名笔记';
      self.content = String(payload.content == null ? '' : payload.content);
      self.updatedAt = Date.now();
      db.currentNoteId = self.id;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/notes/delete') {
      var nid2 = String(payload.id || '');
      db.notes = db.notes.filter(function (n) { return n.id !== nid2; });
      if (!db.notes.length) db.notes = Demo.seed().notes;
      if (!db.notes.some(function (n) { return n.id === db.currentNoteId; })) db.currentNoteId = demoNotesSorted(db)[0].id;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/kb/upload') {
      var name = String(q.name || '未命名.txt');
      var content = raw;
      if (content.length > 8 * 1024 * 1024) {
        return { ok: false, message: name + '：超过 8MB 上限', state: demoDerive(db) };
      }
      if (/\.html?$/i.test(name)) content = stripHtml(content);
      content = content.trim();
      if (!content) {
        return { ok: false, message: name + '：文件内容为空', state: demoDerive(db) };
      }
      db.docs = db.docs.filter(function (d) { return d.name !== name; });
      db.docs.unshift({ id: uid(), name: name, text: content, time: Date.now() });
      Demo.save(db);
      var nChunks = splitText(content, 600, 80).length;
      return { ok: true, message: name + '：已导入 ' + nChunks + ' 个片段', state: demoDerive(db) };
    }

    if (p === '/api/kb/remove') {
      var docId = String(payload.id || '');
      db.docs = db.docs.filter(function (d) { return d.id !== docId; });
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/kb/clear') {
      db.docs = [];
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/kb/search') {
      var query = String(q.q || '').trim();
      var hits = [];
      if (query) {
        searchChunks(demoChunks(db), query, 8).forEach(function (h) {
          hits.push({
            doc: h.chunk.docName,
            seq: h.chunk.seq,
            score: Math.round(h.score * 100) / 100,
            snippet: snippetOf(h.chunk.text, query, 180)
          });
        });
      }
      return { query: query, hits: hits };
    }

    if (p === '/api/settings') {
      db.dark = !!payload.dark;
      Demo.save(db);
      return { ok: true, state: demoDerive(db) };
    }

    if (p === '/api/reset') {
      Demo.db = Demo.seed();
      Demo.save();
      return { ok: true, state: demoDerive(Demo.db) };
    }

    throw new Error('接口不存在：' + (opts.method || 'GET') + ' ' + path);
  }

  function call(path, opts) {
    if (API.mode === 'live') return http(API.base, path, opts || {});
    return Promise.resolve().then(function () { return demoRequest(path, opts || {}); });
  }

  function fetchSession(id) {
    if (API.mode === 'live') return http(API.base, '/api/session?id=' + encodeURIComponent(id), {});
    return Promise.resolve(demoSession(id));
  }

  /* ---------------- 全量状态应用 ---------------- */

  function applyState(d, session) {
    if (!d) return Promise.resolve();
    S.state = d;
    setTheme(!!d.dark);
    if (session) S.session = session;
    if (!d.sessions || !d.sessions.length) {
      S.session = null;
      renderAll();
      return Promise.resolve();
    }
    var need = d.currentSessionId && (!S.session || S.session.id !== d.currentSessionId);
    if (!need) {
      renderAll();
      return Promise.resolve();
    }
    return fetchSession(d.currentSessionId).then(function (s) {
      if (s) S.session = s;
      renderAll();
    }, function () { renderAll(); });
  }

  /* ============================================================
     P3 · 主题、视图切换、会话与对话
     ============================================================ */

  var THEME_COLOR = { dark: '#101011', light: '#f5f7f7' };

  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
    var use = $('#btnTheme use');
    if (use) use.setAttribute('href', dark ? '#i-sun' : '#i-moon');
    var sw = $('#swDark');
    if (sw) sw.checked = !!dark;
    ls.set(KEY_THEME, dark ? 'dark' : 'light');
  }

  function currentDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  var VIEW_META = {
    chat: { title: '对话', sub: '本地知识库增强 · 不联网' },
    kb: { title: '知识库', sub: '导入文件，建立本地索引，检索命中片段' },
    notes: { title: '笔记', sub: 'Markdown 编辑与实时预览 · 防抖自动保存' },
    discover: { title: '发现', sub: '24 个内置扩展模块与实现状态' },
    settings: { title: '设置', sub: '外观、运行信息与数据重置' }
  };

  function setView(v) {
    if (!VIEW_META[v]) v = 'chat';
    S.view = v;
    $$('.view').forEach(function (el) {
      el.classList.toggle('active', el.id === 'view-' + v);
    });
    $$('.rail-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    $$('#tabbar button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === v);
    });
    var t = $('#pageTitle');
    if (t) t.textContent = VIEW_META[v].title;
    var s = $('#pageSub');
    if (s) s.textContent = VIEW_META[v].sub;
    ls.set(KEY_VIEW, v);
    closeDrawer();

    if (v === 'chat') { renderSessions(); renderMessages(); updateConvHead(); }
    else if (v === 'kb') renderKb();
    else if (v === 'notes') renderNotes();
    else if (v === 'discover') renderCatalog(S.catFilter);
    else if (v === 'settings') renderSettings();
  }

  function setMode(mode) {
    API.mode = mode;
    var chip = $('#modeChip');
    var label = mode === 'live' ? '本地服务' : (mode === 'connecting' ? '连接中' : '演示模式');
    if (chip) {
      chip.className = 'mode-chip' + (mode === 'connecting' ? '' : ' ' + mode);
      chip.textContent = mode === 'connecting' ? '连接中' : label;
      chip.title = mode === 'live'
        ? '数据来自本地 HttpServer（/api）'
        : (mode === 'connecting' ? '正在探测本地服务' : '未连接到本地服务，使用浏览器演示数据');
    }
    var rail = $('#railStatus');
    if (rail) rail.textContent = mode === 'connecting' ? '连接中…' : label;
    var dot = $('.rail-foot .dot');
    if (dot) dot.classList.toggle('off', mode !== 'live');
  }

  /* ---------------- 会话列表 ---------------- */

  function renderSessions() {
    var box = $('#sessionList');
    if (!box) return;
    var list = (S.state && S.state.sessions) || [];
    if (!list.length) {
      box.innerHTML = '<div class="empty sm">还没有会话</div>';
      return;
    }
    var cur = (S.session && S.session.id) || (S.state && S.state.currentSessionId) || '';
    box.innerHTML = list.map(function (s) {
      return '<div class="session-item' + (s.id === cur ? ' active' : '') + '" data-id="' + esc(s.id) + '" role="button" tabindex="0">' +
        '<div class="s-top">' +
        '<span class="s-title">' + esc(s.title || '新对话') + '</span>' +
        '<span class="s-time">' + esc(s.time || (s.updatedAt ? fmtShort(s.updatedAt) : '')) + '</span>' +
        '</div>' +
        '<div class="s-prev">' + esc(s.preview || '（空会话）') + '</div>' +
        '<button class="s-del" type="button" data-del="' + esc(s.id) + '" aria-label="删除会话">' +
        '<svg class="ic"><use href="#i-trash"/></svg></button>' +
        '</div>';
    }).join('');
  }

  /* ---------------- 消息流 ---------------- */

  function scrollBottom() {
    var box = $('#messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function renderMessages() {
    var box = $('#messages');
    if (!box) return;
    var msgs = (S.session && S.session.messages) || [];
    if (!msgs.length) {
      box.innerHTML = '<div class="msg welcome"><div class="avatar">ima</div>' +
        '<div class="bubble md">' +
        md('### 开始一个新话题\n\n直接提问即可。先去「知识库」导入文件，回答会引用命中的本地片段；每条回答底部会标注来源。') +
        '</div></div>';
      return;
    }
    box.innerHTML = msgs.map(function (m) {
      var user = m.role === 'user';
      var time = m.time || (m.ts ? fmtShort(m.ts) : '');
      return '<div class="msg' + (user ? ' user' : '') + '">' +
        '<div class="avatar">' + (user ? '我' : 'ima') + '</div>' +
        '<div class="bubble' + (user ? '' : ' md') + '">' +
        (user ? esc(m.content).replace(/\n/g, '<br>') : md(m.content)) +
        (time ? '<div class="meta">' + esc(time) + '</div>' : '') +
        '</div></div>';
    }).join('');
    scrollBottom();
  }

  function removePending() {
    var el = $('#pendingMsg');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function appendPending(label) {
    removePending();
    var box = $('#messages');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'msg';
    el.id = 'pendingMsg';
    el.innerHTML = '<div class="avatar">ima</div><div class="bubble">' +
      '<div class="pending"><span class="dots"><i></i><i></i><i></i></span>' +
      '<span>' + esc(label || '检索中…') + '</span></div></div>';
    box.appendChild(el);
    scrollBottom();
  }

  function updateConvHead() {
    var title = $('#convTitle');
    if (title) title.textContent = (S.session && S.session.title) || '新对话';
    var sub = $('#convSub');
    if (sub) {
      sub.textContent = API.mode === 'demo'
        ? '演示模式 · 数据保存在浏览器本地'
        : '本地知识库增强 · 不联网';
    }
  }

  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 148) + 'px';
  }

  /* ---------------- 对话动作 ---------------- */

  function send() {
    var ta = $('#input');
    if (!ta || S.busy) return;
    var text = ta.value.trim();
    if (!text) return;
    if (!S.session) { toast('请先新建一个会话'); return; }

    var sid = S.session.id;
    S.busy = true;
    ta.value = '';
    autoGrow(ta);

    var now = Date.now();
    S.session.messages = S.session.messages || [];
    S.session.messages.push({ role: 'user', content: text, ts: now, time: fmtShort(now) });
    if (!S.session.title || S.session.title === '新对话') {
      S.session.title = text.replace(/\n/g, ' ').slice(0, 18);
    }
    renderMessages();
    updateConvHead();
    appendPending('检索中…');

    call('/api/chat', { method: 'POST', body: { text: text, sessionId: sid } }).then(function (r) {
      S.busy = false;
      removePending();
      if (r && r.session) {
        S.session = r.session;
      } else if (S.session) {
        var ts = Date.now();
        S.session.messages.push({
          role: 'assistant',
          content: (r && r.reply) || '（服务端没有返回内容）',
          ts: ts,
          time: fmtShort(ts)
        });
      }
      if (r && r.state) S.state = r.state;
      renderSessions();
      renderMessages();
      updateConvHead();
    }).catch(function (e) {
      S.busy = false;
      removePending();
      if (S.session) {
        var ts2 = Date.now();
        S.session.messages.push({
          role: 'assistant',
          content: '**请求失败**：' + (e && e.message ? e.message : '未知错误') +
            '\n\n> 检查本地服务是否仍在运行；也可以打开「设置」点「重新连接 / 刷新状态」重试。',
          ts: ts2,
          time: fmtShort(ts2)
        });
      }
      renderMessages();
      fail(e);
    });
  }

  function newSession() {
    if (S.busy) return;
    call('/api/sessions/new', { method: 'POST' }).then(function (r) {
      applyState(r.state && r.state.sessions ? r.state : demoStateAfterNew(r, 'session'));
      if (r && r.session) S.session = r.session;
      return finishSessionSwitch();
    }).catch(fail);
  }

  function demoStateAfterNew(r, key) {
    if (r && r.state) return r.state;
    return S.state;
  }

  function finishSessionSwitch() {
    if (S.state && S.state.currentSessionId && (!S.session || S.session.id !== S.state.currentSessionId)) {
      return fetchSession(S.state.currentSessionId).then(function (s) {
        if (s) S.session = s;
        setView('chat');
        renderSessions();
        renderMessages();
        updateConvHead();
      });
    }
    setView('chat');
    renderSessions();
    renderMessages();
    updateConvHead();
    return Promise.resolve();
  }

  function selectSession(id) {
    if (!id || S.busy) return;
    if (S.session && S.session.id === id) { closeDrawer(); return; }
    call('/api/sessions/select', { method: 'POST', body: { id: id } }).then(function (r) {
      if (r && r.state) S.state = r.state;
      S.session = null;
      return finishSessionSwitch();
    }).then(closeDrawer).catch(fail);
  }

  function deleteSession(id) {
    if (!id || S.busy) return;
    var item = null;
    ((S.state && S.state.sessions) || []).forEach(function (s) { if (s.id === id) item = s; });
    confirmDlg('删除会话', '「' + ((item && item.title) || '该会话') + '」将被永久删除，此操作不可撤销。').then(function (ok) {
      if (!ok) return;
      return call('/api/sessions/delete', { method: 'POST', body: { id: id } }).then(function (r) {
        if (S.session && S.session.id === id) S.session = null;
        applyState(r.state);
      }).catch(fail);
    });
  }

  /* ---------------- 会话抽屉（窄屏） ---------------- */

  function openDrawer() {
    var pane = $('#sessionPane');
    var scrim = $('#scrim');
    if (pane) pane.classList.add('open');
    if (scrim) scrim.classList.add('show');
    var b = $('#btnSessions');
    if (b) b.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    var pane = $('#sessionPane');
    var scrim = $('#scrim');
    if (pane) pane.classList.remove('open');
    if (scrim) scrim.classList.remove('show');
    var b = $('#btnSessions');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  /* ============================================================
     知识库视图
     ============================================================ */

  var UPLOAD_EXT = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'log',
    'kt', 'java', 'py', 'js', 'ts', 'xml', 'yml', 'yaml'];
  var UPLOAD_MAX = 8 * 1024 * 1024;

  function kbData() {
    var kb = (S.state && S.state.kb) || {};
    return {
      docs: kb.docs || [],
      chunks: kb.chunks || 0,
      chars: kb.chars || 0
    };
  }

  function extOf(name) {
    var i = String(name || '').lastIndexOf('.');
    return i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
  }

  function renderKb() {
    var kb = kbData();
    var stats = $('#kbStats');
    if (stats) {
      stats.textContent = kb.docs.length
        ? kb.docs.length + ' 个文档 · ' + kb.chunks + ' 个片段 · ' + kb.chars + ' 字符'
        : '尚未导入文件';
    }
    var box = $('#kbDocs');
    if (!box) return;
    if (!kb.docs.length) {
      box.innerHTML = '<div class="empty sm">还没有文档。点「上传文件」导入 txt / md / csv 等纯文本资料，' +
        '导入后会按 600 字切块、80 字重叠建立本地索引。</div>';
      return;
    }
    box.innerHTML = kb.docs.map(function (d) {
      return '<div class="doc-item">' +
        '<svg class="ic"><use href="#i-doc"/></svg>' +
        '<div class="doc-main">' +
        '<div class="doc-name">' + esc(d.name) + '</div>' +
        '<div class="doc-meta">' + (d.chars || 0) + ' 字符 · ' + esc(d.time || '') + '</div>' +
        '</div>' +
        '<button class="doc-del" type="button" data-doc-del="' + esc(d.id) + '" ' +
        'aria-label="移除 ' + esc(d.name) + '"><svg class="ic"><use href="#i-close"/></svg></button>' +
        '</div>';
    }).join('');
  }

  function uploadFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var okCount = 0;
    var skip = [];
    var lastState = null;
    var chain = Promise.resolve();

    list.forEach(function (file) {
      chain = chain.then(function () {
        var ext = extOf(file.name);
        if (UPLOAD_EXT.indexOf(ext) < 0) {
          skip.push(file.name + '（不支持的类型）');
          return;
        }
        if (file.size > UPLOAD_MAX) {
          skip.push(file.name + '（超过 8 MB）');
          return;
        }
        return file.text().then(function (text) {
          return call('/api/kb/upload?name=' + encodeURIComponent(file.name), {
            method: 'POST',
            body: text
          }).then(function (r) {
            if (r && r.ok === false) {
              skip.push(file.name + '（' + (r.message || '导入失败') + '）');
            } else {
              okCount++;
            }
            if (r && r.state) lastState = r.state;
          });
        });
      });
    });

    chain.then(function () {
      if (lastState) applyState(lastState);
      else renderKb();
      var msg = [];
      if (okCount) msg.push('已导入 ' + okCount + ' 个文件');
      if (skip.length) msg.push(skip.join('；'));
      toast(msg.length ? msg.join('；') : '没有可导入的文件');
    }).catch(fail).then(function () {
      var input = $('#fileInput');
      if (input) input.value = '';
    });
  }

  function removeDoc(id) {
    if (!id) return;
    confirmDlg('移除文档', '该文档及其索引片段将被删除，此操作不可撤销。').then(function (ok) {
      if (!ok) return;
      return call('/api/kb/remove', { method: 'POST', body: { id: id } }).then(function (r) {
        if (r.state) applyState(r.state);
        toast('已移除');
      }).catch(fail);
    });
  }

  function clearKb() {
    confirmDlg('清空知识库', '所有文档与索引片段都会被删除，此操作不可撤销。').then(function (ok) {
      if (!ok) return;
      return call('/api/kb/clear', { method: 'POST' }).then(function (r) {
        if (r.state) applyState(r.state);
        S.searchQuery = '';
        renderHits([]);
        toast('知识库已清空');
      }).catch(fail);
    });
  }

  function highlight(text, query) {
    var src = String(text == null ? '' : text);
    var terms = String(query || '').split(/\s+/).filter(function (t) { return t.length > 0; });
    if (!terms.length) return esc(src);
    var lower = src.toLowerCase();
    var ranges = [];
    terms.forEach(function (t) {
      var needle = t.toLowerCase();
      var from = 0;
      while (needle && from <= lower.length) {
        var at = lower.indexOf(needle, from);
        if (at < 0) break;
        ranges.push([at, at + needle.length]);
        from = at + needle.length;
      }
    });
    if (!ranges.length) return esc(src);
    ranges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    var out = '';
    var cursor = 0;
    merged.forEach(function (r) {
      out += esc(src.slice(cursor, r[0]));
      out += '<mark>' + esc(src.slice(r[0], r[1])) + '</mark>';
      cursor = r[1];
    });
    out += esc(src.slice(cursor));
    return out;
  }

  function renderHits(list) {
    var box = $('#kbHits');
    if (!box) return;
    var hits = list || [];
    if (!hits.length) {
      box.innerHTML = '<div class="empty sm">' + (S.searchQuery
        ? '没有命中片段，换个关键词试试。'
        : '输入关键词后在本地索引里检索，结果会给出片段序号与打分。') + '</div>';
      return;
    }
    box.innerHTML = hits.map(function (h) {
      var score = Number(h.score);
      var doc = h.doc || h.docName || '未知文档';
      return '<div class="hit">' +
        '<div class="hit-head"><b>' + esc(doc) + '</b>' +
        '<span>片段 ' + (((h.seq == null ? 0 : h.seq) | 0) + 1) + '</span>' +
        '<span class="hit-score">' + (isNaN(score) ? '—' : score.toFixed(2)) + '</span></div>' +
        '<p class="hit-snippet">' + highlight(h.snippet, S.searchQuery) + '</p>' +
        '</div>';
    }).join('');
  }

  function doSearch() {
    var input = $('#kbQuery');
    var q = input ? input.value.trim() : '';
    if (!q) {
      S.searchQuery = '';
      renderHits([]);
      return;
    }
    S.searchQuery = q;
    call('/api/kb/search?q=' + encodeURIComponent(q)).then(function (r) {
      renderHits((r && r.hits) || []);
    }).catch(function (e) {
      renderHits([]);
      fail(e);
    });
  }

  /* ============================================================
     笔记视图
     ============================================================ */

  var noteSaveTimer = null;
  var previewTimer = null;

  function noteList() {
    return (S.state && S.state.notes) || [];
  }

  function activeNoteId() {
    return S.noteId || (S.state && S.state.currentNoteId) || null;
  }

  function findNote(id) {
    var found = null;
    noteList().forEach(function (n) { if (n.id === id) found = n; });
    return found;
  }

  function renderNotes() {
    var box = $('#noteList');
    if (!box) return;
    var notes = noteList();
    var active = activeNoteId();
    if (!notes.length) {
      box.innerHTML = '<div class="empty sm">还没有笔记。</div>';
    } else {
      box.innerHTML = notes.map(function (n) {
        var title = n.title || '未命名笔记';
        var preview = String(n.preview || n.content || '').replace(/\s+/g, ' ').slice(0, 48);
        return '<button class="note-item' + (n.id === active ? ' active' : '') + '" type="button" ' +
          'data-id="' + esc(n.id) + '">' +
          '<span class="note-item-title">' + esc(title) + '</span>' +
          '<span class="note-item-preview">' + esc(preview || '空笔记') + '</span>' +
          '</button>';
      }).join('');
    }
    if (active) {
      var note = findNote(active);
      if (note) fillEditor(note);
      else fillEditor(null);
    } else {
      fillEditor(null);
    }
    updateNoteStatus();
  }

  function fillEditor(note) {
    var title = $('#noteTitle');
    var body = $('#noteBody');
    if (!title || !body) return;
    if (!note) {
      title.value = '';
      body.value = '';
      S.noteId = null;
      updatePreview();
      return;
    }
    S.noteId = note.id;
    var nextTitle = note.title || '';
    if (title.value !== nextTitle) title.value = nextTitle;
    /* 用户正在输入时不覆盖正文，避免光标跳动 */
    if (!S.noteDirty) {
      var nextBody = note.content == null ? '' : note.content;
      if (body.value !== nextBody) body.value = nextBody;
    }
    updatePreview();
  }

  function updatePreview() {
    var layout = $('#notesLayout');
    var preview = $('#notePreview');
    var body = $('#noteBody');
    if (!layout || !preview || !body) return;
    if (!layout.classList.contains('split')) return;
    preview.innerHTML = md(body.value);
  }

  function updateNoteStatus(extra) {
    var el = $('#noteStatus');
    if (!el) return;
    if (extra) { el.textContent = extra; return; }
    var note = S.noteId ? findNote(S.noteId) : null;
    if (!note) { el.textContent = '未选择笔记'; return; }
    var when = note.updatedAt ? fmtHuman(note.updatedAt) : '';
    el.textContent = (S.noteDirty ? '有未保存的修改 · ' : '') +
      (when ? '最后修改 ' + when : '') +
      (S.noteDirty ? '' : ' · 自动保存已开启');
  }

  function selectNote(id) {
    if (!id) return;
    if (S.noteId === id) return;
    if (S.noteDirty) saveNote(true);
    S.noteId = id;
    var note = findNote(id);
    S.noteDirty = false;
    if (note) fillEditor(note);
    renderNotes();
  }

  function newNote() {
    if (S.noteDirty) saveNote(true);
    call('/api/notes/new', { method: 'POST' }).then(function (r) {
      S.noteDirty = false;
      if (r.state) applyState(r.state);
      var id = (r.note && r.note.id) || (r.state && r.state.currentNoteId);
      if (id) S.noteId = id;
      renderNotes();
      var input = $('#noteTitle');
      if (input) { input.focus(); input.select(); }
    }).catch(fail);
  }

  function saveNote(immediate) {
    clearTimeout(noteSaveTimer);
    var titleEl = $('#noteTitle');
    var bodyEl = $('#noteBody');
    if (!titleEl || !bodyEl || !S.noteId) return;
    var doIt = function () {
      if (!S.noteId) return Promise.resolve();
      return call('/api/notes/save', {
        method: 'POST',
        body: { id: S.noteId, title: titleEl.value, content: bodyEl.value }
      }).then(function (r) {
        S.noteDirty = false;
        if (r.state) applyState(r.state);
        else renderNotes();
        updateNoteStatus('已保存 ' + fmtShort(Date.now()).slice(6));
      });
    };
    if (immediate === true) {
      doIt().catch(fail);
    } else {
      noteSaveTimer = setTimeout(function () { doIt().catch(fail); }, 900);
    }
  }

  function deleteNote() {
    var id = S.noteId;
    if (!id) { toast('当前没有笔记'); return; }
    var note = findNote(id);
    confirmDlg('删除笔记', '「' + ((note && note.title) || '该笔记') + '」将被永久删除。').then(function (ok) {
      if (!ok) return;
      return call('/api/notes/delete', { method: 'POST', body: { id: id } }).then(function (r) {
        S.noteDirty = false;
        S.noteId = null;
        if (r.state) applyState(r.state);
        else renderNotes();
        toast('笔记已删除');
      }).catch(fail);
    });
  }

  function togglePreview() {
    var layout = $('#notesLayout');
    var preview = $('#notePreview');
    var btn = $('#btnNotePreview');
    if (!layout || !preview || !btn) return;
    var on = layout.classList.toggle('split');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) {
      preview.removeAttribute('hidden');
      updatePreview();
    } else {
      preview.setAttribute('hidden', '');
    }
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 250);
  }

  /* ============================================================
     第五段：发现页 / 设置页 / 全量重绘 / 事件绑定 / 启动
     ============================================================ */

  var STATE_CLASS = { '已实装': 'done', '部分实装': 'part', '占位': '' };

  function catalogData() {
    var list = S.catalog || CATALOG;
    if (list && !Array.isArray(list)) list = list.modules || list.items || CATALOG;
    return Array.isArray(list) ? list : CATALOG;
  }

  function renderCatalog(filter) {
    S.catFilter = filter || S.catFilter || 'all';
    $$('#catalogFilter .chip').forEach(function (b) {
      var on = (b.getAttribute('data-state') || 'all') === S.catFilter;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var box = $('#catalogGrid');
    if (!box) return;
    var all = catalogData();
    var list = all.filter(function (m) {
      return S.catFilter === 'all' || m.state === S.catFilter;
    });
    if (!list.length) {
      box.innerHTML = '<div class="empty sm">该状态下没有模块</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      var cls = STATE_CLASS[m.state] || '';
      var id = m.extId || m.id || '';
      return '<div class="mod-card">' +
        '<div class="mod-top">' +
        '<span class="mod-name">' + esc(m.name || '未命名模块') + '</span>' +
        '<span class="mod-state ' + cls + '">' + esc(m.state || '占位') + '</span>' +
        '</div>' +
        (id ? '<div class="mod-id">' + esc(id) + (m.version ? ' · v' + esc(m.version) : '') + '</div>' : '') +
        (m.note ? '<div class="mod-note">' + esc(m.note) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  function renderSettings() {
    var d = S.state || {};
    var kb = (d.kb || {});
    var set = function (sel, v) {
      var el = $(sel);
      if (el) el.textContent = v == null || v === '' ? '—' : String(v);
    };
    set('#stEngine', d.engine || '未知');
    set('#stData', d.dataDir || '未知');
    set('#stCounts', (d.sessions ? d.sessions.length : 0) + ' / ' + (d.notes ? d.notes.length : 0));
    set('#stKb', (kb.docs ? kb.docs.length : 0) + ' 个文档 · ' + (kb.chunks || 0) + ' 个片段');
    set('#stSource', API.mode === 'live' ? '本机服务 ' + (API.base || '/') : '浏览器演示数据（localStorage）');
    set('#stVersion', d.version || '1.1.0');

    var sw = $('#swDark');
    if (sw) sw.checked = currentDark();

    var inst = $('#btnInstall');
    if (inst) {
      var ready = !!S.installEvent;
      inst.disabled = !ready;
      inst.title = ready ? '浏览器已允许安装此应用' : '用浏览器打开并通过 http(s) 访问时可安装';
    }
  }

  /* 修改类接口统一 { ok, state } 后的全量重绘入口 */
  function renderAll() {
    renderSessions();
    renderMessages();
    updateConvHead();
    renderKb();
    if (!S.searchQuery) renderHits([]);
    if (!S.noteDirty) renderNotes();
    renderCatalog(S.catFilter);
    renderSettings();
  }

  function persistTheme(dark) {
    setTheme(dark);
    call('/api/settings', { method: 'POST', body: { dark: !!dark } }).then(function (r) {
      if (r && r.state) applyState(r.state);
      else renderSettings();
    }).catch(function (e) {
      /* 服务端未落盘不影响本地主题 */
      console.warn('[ima] 主题保存失败：', e && e.message);
    });
  }

  function resetAll() {
    confirmDlg('重置全部数据', '会话、笔记、知识库文档与偏好设置都会恢复为初始状态，且无法撤销。').then(function (ok) {
      if (!ok) return;
      return call('/api/reset', { method: 'POST' }).then(function (r) {
        S.session = null;
        S.noteId = null;
        S.noteDirty = false;
        S.searchQuery = '';
        var q = $('#kbQuery');
        if (q) q.value = '';
        clearTimeout(noteSaveTimer);
        clearTimeout(previewTimer);
        if (r && r.state) applyState(r.state);
        else renderAll();
        toast('已重置全部数据');
      }).catch(fail);
    });
  }

  /* ---------------- 事件绑定（幂等） ---------------- */

  var bound = false;

  function bindEvents() {
    if (bound) return;
    bound = true;

    /* 导航：rail / 底部 tab 共用 data-view */
    document.addEventListener('click', function (e) {
      var nav = e.target.closest ? e.target.closest('[data-view]') : null;
      if (nav) { setView(nav.getAttribute('data-view')); }
    });

    /* 会话列表：选中 / 删除 / 键盘操作 */
    var sessionList = $('#sessionList');
    if (sessionList) {
      sessionList.addEventListener('click', function (e) {
        var del = e.target.closest('[data-del]');
        if (del) { e.stopPropagation(); deleteSession(del.getAttribute('data-del')); return; }
        var item = e.target.closest('.session-item');
        if (item) { selectSession(item.getAttribute('data-id')); closeDrawer(); }
      });
      sessionList.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var item = e.target.closest('.session-item');
        if (!item) return;
        e.preventDefault();
        selectSession(item.getAttribute('data-id'));
        closeDrawer();
      });
    }

    var railNew = $('#btnRailNew');
    if (railNew) railNew.addEventListener('click', newSession);
    var newSessionBtn = $('#btnNewSession');
    if (newSessionBtn) newSessionBtn.addEventListener('click', newSession);

    var themeBtn = $('#btnTheme');
    if (themeBtn) themeBtn.addEventListener('click', function () { persistTheme(!currentDark()); });

    /* 输入区 */
    var sendBtn = $('#btnSend');
    if (sendBtn) sendBtn.addEventListener('click', send);
    var input = $('#input');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          send();
        }
      });
      input.addEventListener('input', function () { autoGrow(input); });
    }

    /* 会话抽屉 */
    var s1 = $('#btnSessions');
    if (s1) s1.addEventListener('click', openDrawer);
    var s2 = $('#btnSessions2');
    if (s2) s2.addEventListener('click', openDrawer);
    var scrim = $('#scrim');
    if (scrim) scrim.addEventListener('click', closeDrawer);

    /* 知识库 */
    var uploadBtn = $('#btnUpload');
    var fileInput = $('#fileInput');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        uploadFiles(fileInput.files);
        fileInput.value = '';
      });
    }
    var kbClear = $('#btnKbClear');
    if (kbClear) kbClear.addEventListener('click', clearKb);
    var searchForm = $('#kbSearchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        doSearch();
      });
    }
    var kbDocs = $('#kbDocs');
    if (kbDocs) {
      kbDocs.addEventListener('click', function (e) {
        var del = e.target.closest('[data-doc-del]');
        if (del) removeDoc(del.getAttribute('data-doc-del'));
      });
    }

    /* 笔记 */
    var noteNew = $('#btnNoteNew');
    if (noteNew) noteNew.addEventListener('click', newNote);
    var noteSave = $('#btnNoteSave');
    if (noteSave) noteSave.addEventListener('click', function () { saveNote(true); });
    var notePreview = $('#btnNotePreview');
    if (notePreview) notePreview.addEventListener('click', togglePreview);
    var noteDel = $('#btnNoteDel');
    if (noteDel) noteDel.addEventListener('click', deleteNote);
    var noteTitle = $('#noteTitle');
    if (noteTitle) {
      noteTitle.addEventListener('input', function () {
        S.noteDirty = true;
        updateNoteStatus();
        saveNote();
      });
    }
    var noteBody = $('#noteBody');
    if (noteBody) {
      noteBody.addEventListener('input', function () {
        S.noteDirty = true;
        updateNoteStatus();
        schedulePreview();
        saveNote();
      });
      noteBody.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          var st = noteBody.selectionStart;
          var en = noteBody.selectionEnd;
          noteBody.value = noteBody.value.slice(0, st) + '  ' + noteBody.value.slice(en);
          noteBody.selectionStart = noteBody.selectionEnd = st + 2;
          S.noteDirty = true;
          schedulePreview();
          saveNote();
        }
      });
    }
    var noteListEl = $('#noteList');
    if (noteListEl) {
      noteListEl.addEventListener('click', function (e) {
        var item = e.target.closest('.note-item');
        if (item) selectNote(item.getAttribute('data-id'));
      });
    }

    /* 发现：状态筛选 */
    var filter = $('#catalogFilter');
    if (filter) {
      filter.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (chip) renderCatalog(chip.getAttribute('data-state') || 'all');
      });
    }

    /* 设置 */
    var swDark = $('#swDark');
    if (swDark) swDark.addEventListener('change', function () { persistTheme(swDark.checked); });
    var reloadBtn = $('#btnReload');
    if (reloadBtn) reloadBtn.addEventListener('click', function () { boot(); });
    var installBtn = $('#btnInstall');
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        if (!S.installEvent) { toast('当前浏览器未提供安装入口，可用浏览器菜单「添加到主屏幕」'); return; }
        S.installEvent.prompt();
        S.installEvent = null;
        renderSettings();
      });
    }
    var resetBtn = $('#btnReset');
    if (resetBtn) resetBtn.addEventListener('click', resetAll);

    /* 确认框 */
    var dlg = $('#dlg');
    if (dlg) {
      dlg.addEventListener('close', function () {
        var ok = dlg.returnValue === 'ok';
        var fn = dlgResolve;
        dlgResolve = null;
        if (fn) fn(ok);
      });
    }

    /* 全局快捷键 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setView('kb');
        var q = $('#kbQuery');
        if (q) { q.focus(); q.select(); }
        return;
      }
      if (e.altKey && !mod && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        setView(['chat', 'kb', 'notes', 'discover', 'settings'][Number(e.key) - 1]);
      }
    });

    /* PWA 安装提示 */
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      S.installEvent = e;
      renderSettings();
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 900px)');
      var onChange = function () { if (mq.matches) closeDrawer(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function (e) {
      console.warn('[ima] Service Worker 注册失败：', e && e.message);
    });
  }

  /* ---------------- 启动 ---------------- */

  var booting = false;

  function boot() {
    if (booting) return;
    booting = true;
    setTheme(ls.get(KEY_THEME) !== 'light');
    setView(ls.get(KEY_VIEW) || 'chat');
    bindEvents();
    setMode('connecting');

    probeBase().then(function (base) {
      if (base === null) {
        /* 关键：'' 是合法基址，必须用 null 判断失败 */
        API.base = null;
        S.catalog = CATALOG;
        setMode('demo');
        applyState(demoDerive(Demo.load()));
        booting = false;
        return;
      }
      API.base = base;
      setMode('live');
      Promise.all([
        http(base, '/api/state'),
        http(base, '/api/catalog').catch(function () { return { modules: CATALOG }; })
      ]).then(function (arr) {
        S.catalog = (arr[1] && (arr[1].modules || arr[1].items)) || CATALOG;
        applyState(arr[0]);
        booting = false;
      }).catch(function (e) {
        console.warn('[ima] 服务端状态读取失败，回退演示数据：', e && e.message);
        API.mode = 'demo';
        API.base = null;
        S.catalog = CATALOG;
        setMode('demo');
        applyState(demoDerive(Demo.load()));
        booting = false;
      });
    }).catch(function (e) {
      console.warn('[ima] 探测 /api 失败，使用演示数据：', e && e.message);
      API.mode = 'demo';
      API.base = null;
      S.catalog = CATALOG;
      setMode('demo');
      applyState(demoDerive(Demo.load()));
      booting = false;
    });
  }

  registerSW();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
