/* 星屿 StarIsle · MVP Web 前端（学生 / 教师 / 家长三端共用）
   ---------------------------------------------------------------
   零第三方依赖、零 CDN，可直接以 file:// 打开 index.html 走演示模式。
   三端不是三份页面：同一套视图 + 导航，由 session.role 决定渲染分支。
   数据统一走 window.StarIsleAPI（assets/api.js），USE_MOCK 是唯一切换点。
   API 契约见 ../docs/api-contract.md，接入步骤见 ../docs/integration.md。
*/
(function () {
  'use strict';

  var API = window.StarIsleAPI;
  var MD = window.SIMD;

  var APP_NAME = '星屿';
  var TAGLINE = '让每一个情绪，都被看见';

  /* ========== 1. 常量 ========== */

  var MOODS = [
    { v: 1, emo: '😔', lbl: '很低落' },
    { v: 2, emo: '😞', lbl: '有点低落' },
    { v: 3, emo: '😐', lbl: '一般般' },
    { v: 4, emo: '😊', lbl: '还不错' },
    { v: 5, emo: '😄', lbl: '很开心' }
  ];

  var MOOD_TAGS = ['学习压力', '考试焦虑', '人际关系', '家庭', '睡眠', '身体不适', '其他'];

  var RISK_TEXT = { green: '平稳', yellow: '关注', orange: '预警', red: '高危' };
  var RISK_COLOR = { green: '#22c55e', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444' };

  var REVIEW_OPTIONS = [
    { v: 'observe', label: '持续观察', desc: '保持关注，暂不介入，记录在案' },
    { v: 'intervene', label: '介入干预', desc: '安排个别谈话或课堂支持' },
    { v: 'refer', label: '转介专业', desc: '转介校心理中心或专业机构' },
    { v: 'close', label: '结案归档', desc: '风险已解除，归档处理' }
  ];

  var ROLE_COLOR = { student: '#6b7bff', teacher: '#8b5cf6', parent: '#f97316' };

  var ROLES = {
    student: {
      key: 'student', label: '学生端', short: '学生', home: '/student',
      nav: [
        { path: '/student', label: '心情', icon: 'home' },
        { path: '/student/knowledge', label: '知识库', icon: 'book' },
        { path: '/student/community', label: '互助', icon: 'users' },
        { path: '/student/relax', label: '放松', icon: 'spa' },
        { path: '/student/profile', label: '我的', icon: 'user' }
      ]
    },
    teacher: {
      key: 'teacher', label: '教师端', short: '教师', home: '/teacher',
      nav: [
        { path: '/teacher', label: '班级总览', icon: 'home' },
        { path: '/teacher/students', label: '学生状态', icon: 'users' },
        { path: '/teacher/alerts', label: '预警复核', icon: 'bell' },
        { path: '/teacher/profile', label: '我的', icon: 'user' }
      ]
    },
    parent: {
      key: 'parent', label: '家长端', short: '家长', home: '/parent',
      nav: [
        { path: '/parent', label: '总览', icon: 'home' },
        { path: '/parent/children', label: '我的孩子', icon: 'users' },
        { path: '/parent/emergency', label: '紧急支持', icon: 'phone' },
        { path: '/parent/knowledge', label: '知识库', icon: 'book' },
        { path: '/parent/profile', label: '我的', icon: 'user' }
      ]
    }
  };

  var ICONS = {
    star: 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4 6.2 20.4l1.1-6.4L2.6 9.4l6.5-.9z',
    home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21zM4 18.5A2.5 2.5 0 0 1 6.5 16H20',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 19 7a4 4 0 0 1-3 3.87',
    spa: 'M12 21s-7-4.2-9.3-8.4A5.5 5.5 0 0 1 12 5.8a5.5 5.5 0 0 1 9.3 6.8C19 16.8 12 21 12 21z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    plus: 'M12 5v14M5 12h14',
    chevron: 'M9 18l6-6-6-6',
    check: 'M20 6L9 17l-5-5',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2'
  };

  function ico(name, cls) {
    var p = ICONS[name] || ICONS.star;
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="' + p + '"/></svg>';
  }

  /* ========== 2. 状态 ========== */

  var S = {
    session: null,
    role: '',
    route: '/entry',
    theme: 'light',
    data: {},
    draft: {},
    busy: {},
    ui: {
      sheet: null,
      crisis: false,
      alertBlock: null,
      roleMenu: false,
      answerScale: null,
      answers: {},
      filterRisk: 'all',
      expandedChild: '',
      breathing: null
    },
    toast: []
  };

  function hasRole() { return !!(S.session && S.role && ROLES[S.role]); }
  function me() { return S.session || {}; }
  function cls() { return me().classId || 'cls-201'; }

  /* ========== 3. 路由 ========== */

  var ROUTES = {
    '/entry': { view: entryView },
    '/student': { role: 'student', view: studentHome },
    '/student/knowledge': { role: 'student', view: studentKnowledge },
    '/student/community': { role: 'student', view: studentCommunity },
    '/student/relax': { role: 'student', view: studentRelax },
    '/student/profile': { role: 'student', view: studentProfile },
    '/teacher': { role: 'teacher', view: teacherHome },
    '/teacher/students': { role: 'teacher', view: teacherStudents },
    '/teacher/alerts': { role: 'teacher', view: teacherAlerts },
    '/teacher/profile': { role: 'teacher', view: teacherProfile },
    '/parent': { role: 'parent', view: parentHome },
    '/parent/children': { role: 'parent', view: parentChildren },
    '/parent/emergency': { role: 'parent', view: parentEmergency },
    '/parent/knowledge': { role: 'parent', view: parentKnowledge },
    '/parent/profile': { role: 'parent', view: parentProfile }
  };

  function normPath(p) {
    var s = String(p || '').replace(/^#/, '');
    if (!s) return '';
    if (s.charAt(0) !== '/') s = '/' + s;
    if (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    return s;
  }

  function allowedPath(p) {
    var r = ROUTES[p];
    if (!r) return hasRole() ? ROLES[S.role].home : '/entry';
    if (!r.role) return p;
    if (!hasRole() || r.role !== S.role) {
      return hasRole() ? ROLES[S.role].home : '/entry';
    }
    return p;
  }

  function go(path) {
    var p = normPath(path) || '/entry';
    if (('#' + p) === location.hash) { S.route = p; render(); return; }
    location.hash = p;
  }

  function onHash() {
    var p = allowedPath(normPath(location.hash) || (hasRole() ? ROLES[S.role].home : '/entry'));
    if (p !== normPath(location.hash)) {
      try { history.replaceState(null, '', '#' + p); } catch (e) { location.hash = p; return; }
    }
    S.route = p;
    closeSheet();
    if (S.ui.crisis) S.ui.crisis = false;
    window.scrollTo(0, 0);
    render();
  }

  /* ========== 4. 渲染主干 ========== */

  function render() {
    var app = document.getElementById('app');
    if (!app) return;
    app.removeAttribute('aria-busy');
    if (!hasRole()) {
      app.className = 'app';
      S.route = '/entry';
      app.innerHTML = entryView();
    } else {
      app.className = 'app role-' + S.role;
      app.innerHTML = shell();
    }
    applyTheme();
    ensureData();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', S.theme === 'dark' ? '#111527' : '#6b7bff');
  }

  function shell() {
    var cfg = ROLES[S.role];
    var path = S.route;
    var alertsN = alertCount();

    var nav = cfg.nav.map(function (n) {
      var active = n.path === path;
      var badge = (n.path === '/teacher/alerts' && alertsN) ? '<span class="nav-badge">' + alertsN + '</span>' : '';
      return '<a class="nav-item' + (active ? ' is-active' : '') + '" href="#' + n.path + '">' +
        ico(n.icon, 'nav-ico') + '<span class="nav-label">' + n.label + '</span>' + badge + '</a>';
    }).join('');

    var tabs = cfg.nav.map(function (n) {
      var active = n.path === path;
      return '<a class="tab' + (active ? ' is-active' : '') + '" href="#' + n.path + '">' +
        ico(n.icon, 'nav-ico') + '<span class="nav-label">' + n.label + '</span></a>';
    }).join('');

    return '' +
      '<div class="shell">' +
        '<aside class="sidenav">' +
          '<a class="brand" href="#' + cfg.home + '">' +
            '<span class="brand-mark">' + ico('star') + '</span>' +
            '<span><span class="brand-name">' + APP_NAME + '</span>' +
            '<span class="brand-sub">' + TAGLINE + '</span></span>' +
          '</a>' +
          '<div class="nav-group-label">' + cfg.label + '</div>' +
          nav +
        '</aside>' +
        '<div class="shell-body">' +
          '<header class="topbar">' +
            '<a class="topbar-brand" href="#' + cfg.home + '">' +
              ico('star', 'nav-ico') + '<span>' + APP_NAME + '</span>' +
            '</a>' +
            '<div class="topbar-spacer"></div>' +
            roleChip(cfg) +
            '<button class="icon-btn" data-act="theme:toggle" aria-label="切换深浅色">' +
              ico(S.theme === 'dark' ? 'sun' : 'moon') +
            '</button>' +
          '</header>' +
          '<main class="main">' + viewHtml() + '</main>' +
        '</div>' +
      '</div>' +
      '<nav class="tabbar" aria-label="主导航">' + tabs + '</nav>' +
      fab() +
      roleMenu() +
      sheetLayer() +
      crisisLayer() +
      alertBlockLayer() +
      toastLayer();
  }

  function roleChip(cfg) {
    return '<button class="role-chip role-' + cfg.key + '" data-act="role:menu" aria-expanded="' + (S.ui.roleMenu ? 'true' : 'false') + '">' +
      '<span class="dot"></span>' + cfg.label + ico('chevron', 'ico') + '</button>';
  }

  function roleMenu() {
    if (!S.ui.roleMenu) return '';
    var items = ['student', 'teacher', 'parent'].map(function (k) {
      var on = k === S.role;
      return '<button class="role-menu-item" data-act="role:switch" data-role="' + k + '"' + (on ? ' aria-current="true"' : '') + '>' +
        '<span class="dot" style="background:' + ROLE_COLOR[k] + '"></span>' +
        '<strong>' + ROLES[k].label + (on ? ' · 当前' : '') + '</strong>' +
        '<span>' + roleBlurb(k) + '</span></button>';
    }).join('');
    return '<div class="role-menu" role="menu">' +
      '<div class="nav-group-label">切换身份</div>' + items +
      '<div class="divider"></div>' +
      '<button class="role-menu-item" data-act="logout"><strong>退出登录</strong><span>回到身份选择</span></button>' +
      '</div>';
  }

  function roleBlurb(k) {
    if (k === 'student') return '心情打卡 · 知识库 · 互助';
    if (k === 'teacher') return '班级状态 · 预警复核';
    return '孩子情绪 · 紧急支持';
  }

  function fab() {
    if (S.ui.crisis) return '';
    if (S.role === 'teacher') return '';
    return '<button class="fab" data-act="crisis:open" aria-label="紧急帮助">' + ico('phone') + '</button>';
  }

  function toastLayer() {
    if (!S.toast.length) return '';
    var body = S.toast.map(function (t) {
      return '<div class="toast' + (t.type === 'err' ? ' is-err' : t.type === 'ok' ? ' is-ok' : '') + '">' + esc(t.msg) + '</div>';
    }).join('');
    return '<div class="toast-wrap" role="status" aria-live="polite">' + body + '</div>';
  }

  function sheetLayer() {
    var s = S.ui.sheet;
    if (!s) return '';
    return '<div class="overlay" data-act="sheet:close">' +
      '<div class="sheet' + (s.wide ? ' sheet-wide' : '') + '" role="dialog" aria-modal="true">' +
      sheetBody(s) + '</div></div>';
  }

  function crisisLayer() {
    if (!S.ui.crisis) return '';
    var box = st('hotlines');
    var list = '';
    if (box === 'loading') {
      list = skeleton(3);
    } else if (box === 'err') {
      list = errorBox('hotlines', d('hotlines').error || '加载失败');
    } else {
      var hs = (d('hotlines').hotlines || []);
      list = hs.map(function (h) {
        return '<div class="hotline"><div><div class="strong">' + esc(h.title) + '</div>' +
          '<div class="tiny muted">' + esc(h.content || '') + '</div></div>' +
          '<a class="num" href="tel:' + esc(h.phone || h.contact) + '">' + esc(h.contact || h.phone) + '</a></div>';
      }).join('');
    }
    return '<div class="crisis" role="dialog" aria-modal="true" aria-label="紧急帮助">' +
      '<div class="crisis-inner">' +
        '<div class="crisis-pulse">' + ico('phone') + '</div>' +
        '<h2 class="page-title">如果你此刻很危险</h2>' +
        '<p class="page-desc">请立刻联系身边信任的大人，或拨打下面的 24 小时热线。你不需要一个人扛。</p>' +
        list +
        '<div class="stack" style="margin-top:16px">' +
          '<button class="btn btn-danger btn-block" data-act="crisis:call">拨打 12355</button>' +
          '<button class="btn btn-ghost btn-block" data-act="crisis:close">我还好，先返回</button>' +
        '</div>' +
      '</div></div>';
  }

  function alertBlockLayer() {
    var a = S.ui.alertBlock;
    if (!a && S.role === 'parent') {
      var al = d('parentAlert').alert;
      if (al && !al.confirmed) {
        a = {
          alertId: al.alertId,
          studentName: al.studentName,
          reason: al.reason,
          createdAt: al.createdAt,
          level: al.level || 'red'
        };
      }
    }
    if (!a) return '';
    return '<div class="alert-block" role="alertdialog" aria-modal="true">' +
      '<div class="inner">' +
        '<div class="badge badge-red">高危预警</div>' +
        '<h2 class="page-title" style="margin-top:12px">' + esc(a.studentName || '你的孩子') + ' 需要你的关注</h2>' +
        '<p class="page-desc">' + esc(a.reason || '系统检测到持续的低落情绪，请尽快与孩子沟通。') + '</p>' +
        '<div class="card" style="margin-top:16px"><div class="card-body tight">' +
          '<div class="tiny muted">触发时间</div><div class="strong">' + fmtTime(a.createdAt) + '</div>' +
        '</div></div>' +
        '<button class="btn btn-primary btn-block" style="margin-top:16px" data-act="alert:confirm" data-id="' + esc(a.alertId) + '">' +
          '我已知晓，会尽快联系孩子</button>' +
        '<a class="btn btn-ghost btn-block" style="margin-top:8px" href="#/parent/emergency" data-act="sheet:none">查看紧急支持资源</a>' +
      '</div></div>';
  }

  /* ========== 5. 数据装载 ========== */

  function st(key) {
    var box = S.data[key];
    return box ? box.status : 'idle';
  }

  function d(key) {
    var box = S.data[key];
    return (box && box.status === 'ok' && box.data) ? box.data : {};
  }

  function load(key, thunk, force) {
    var cur = S.data[key];
    if (!force && cur && cur.status !== 'idle') return;
    S.data[key] = { status: 'loading' };
    thunk().then(function (res) {
      if (res && res.ok) {
        S.data[key] = { status: 'ok', data: res.data || {} };
      } else {
        S.data[key] = { status: 'err', error: errMsg(res), code: res && res.error ? res.error.code : 0 };
      }
      render();
    }).catch(function (e) {
      S.data[key] = { status: 'err', error: '加载失败：' + ((e && e.message) || e) };
      render();
    });
  }

  function ensureData() {
    if (!hasRole()) return;
    var path = S.route;
    var role = S.role;

    if (role === 'student') {
      if (path === '/student') {
        load('moodChart', function () { return API.mood.chart(); });
        load('moodHistory', function () { return API.mood.history({ days: 14 }); });
        load('risk', function () { return API.risk.level(); });
      } else if (path === '/student/knowledge') {
        load('kbCats', function () { return API.knowledge.categories(); });
        load('kbStats', function () { return API.knowledge.stats(); });
        load('kbResults', function () { return API.knowledge.search({ query: S.draft.kbQuery || '', category: S.draft.kbCat || '', topK: 20 }); });
        load('assessTypes', function () { return API.assessment.types(); });
      } else if (path === '/student/community') {
        load('posts', function () { return API.community.list({ page: 1, pageSize: 20 }); });
      } else if (path === '/student/relax') {
        load('breathing478', function () { return API.content.breathing('478'); });
        load('meditations', function () { return API.content.meditations(''); });
      } else if (path === '/student/profile') {
        load('assessMine', function () { return API.assessment.mine(); });
        load('risk', function () { return API.risk.level(); });
      }
    } else if (role === 'teacher') {
      load('classStats', function () { return API.classroom.stats(cls()); });
      if (path === '/teacher' || path === '/teacher/students') {
        load('classStudents', function () { return API.classroom.students(cls()); });
      }
      if (path === '/teacher' || path === '/teacher/alerts') {
        load('classAlerts', function () { return API.classroom.alerts(cls()); });
      }
    } else if (role === 'parent') {
      load('children', function () { return API.parents.children(); });
      load('parentAlert', function () { return API.parents.emergencyAlert(); });
      if (path === '/parent' || path === '/parent/children') {
        var kids = (d('children').children || []);
        kids.forEach(function (c) {
          if (!c.authorized) return;
          load('childMood:' + c.bindingId, function () {
            return API.parents.childMood(c.bindingId, { days: 14 });
          });
        });
      }
      if (path === '/parent/emergency') {
        load('resources', function () { return API.parents.resources(''); });
      }
      if (path === '/parent/knowledge') {
        load('kbCats', function () { return API.knowledge.categories(); });
        load('kbStats', function () { return API.knowledge.stats(); });
        load('kbResults', function () { return API.knowledge.search({ query: S.draft.kbQuery || '', category: S.draft.kbCat || '', topK: 20 }); });
      }
    }

    if (S.ui.crisis) load('hotlines', function () { return API.risk.hotlines(); });
  }

  function alertCount() {
    var box = S.data.classAlerts;
    if (!box || box.status !== 'ok') return 0;
    return (box.data.alerts || []).length;
  }

  /* ========== 6. 入口页 ========== */

  function entryView() {
    var roles = ['student', 'teacher', 'parent'].map(function (k) {
      return '<button class="entry-role" data-act="entry:role" data-role="' + k + '">' +
        '<span class="dot" style="background:' + ROLE_COLOR[k] + '"></span>' +
        '<span style="flex:1;text-align:left"><span class="strong">' + ROLES[k].label + '</span>' +
        '<span class="tiny muted" style="display:block">' + roleBlurb(k) + '</span></span>' +
        ico('chevron', 'ico') + '</button>';
    }).join('');

    return '<div class="entry">' +
      '<div class="entry-card">' +
        '<div class="entry-brand"><span class="brand-mark">' + ico('star') + '</span>' + APP_NAME + '</div>' +
        '<h1 class="entry-title">' + TAGLINE + '</h1>' +
        '<p class="entry-sub">学生、教师、家长共用同一份页面，选择你的身份开始。</p>' +
        '<div class="entry-roles">' + roles + '</div>' +
        '<div class="entry-note">演示模式：无需账号，选择身份即可体验完整流程；数据保存在本机。</div>' +
      '</div></div>';
  }

  /* ========== 7. 通用片段 ========== */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function errMsg(res) {
    if (!res) return '网络异常，请稍后重试';
    if (res.error && res.error.message) return res.error.message;
    return '请求失败，请稍后重试';
  }

  function errText(key) {
    var b = S.data[key];
    return (b && b.error) || '请稍后重试';
  }

  /* 统一的「加载中 / 失败 / 成功」外壳，避免每个卡片各写一遍 */
  function panel(key, render, n) {
    var s = st(key);
    if (s === 'ok') return render(d(key));
    if (s === 'err') return errorBox(key, errText(key));
    return skeleton(n || 3);
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var dt = new Date(iso);
    if (isNaN(dt.getTime())) return String(iso);
    var now = new Date();
    var hh = ('0' + dt.getHours()).slice(-2);
    var mm = ('0' + dt.getMinutes()).slice(-2);
    if (dt.toDateString() === now.toDateString()) return '今天 ' + hh + ':' + mm;
    var yd = new Date(now.getTime() - 86400000);
    if (dt.toDateString() === yd.toDateString()) return '昨天 ' + hh + ':' + mm;
    return (dt.getMonth() + 1) + '月' + dt.getDate() + '日 ' + hh + ':' + mm;
  }

  function fmtDay(s) {
    var p = String(s || '').split('-');
    return p.length >= 3 ? (Number(p[1]) + '/' + Number(p[2])) : String(s || '');
  }

  function trunc(s, n) {
    var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  function dur(sec) {
    var m = Math.round((Number(sec) || 0) / 60);
    return m > 0 ? m + ' 分钟' : (Number(sec) || 0) + ' 秒';
  }

  function moodLabel(v) {
    var m = MOODS[Number(v) - 1];
    return m ? m.lbl : '未记录';
  }

  function pageHead(title, desc, right) {
    return '<div class="page-head"><div style="flex:1;min-width:0">' +
      '<h1 class="page-title">' + esc(title) + '</h1>' +
      (desc ? '<p class="page-desc">' + esc(desc) + '</p>' : '') +
      '</div>' + (right || '') + '</div>';
  }

  function skeleton(n) {
    var out = '';
    for (var i = 0; i < (n || 3); i++) {
      out += '<div class="skel"><div class="skel-line"></div><div class="skel-line w60"></div></div>';
    }
    return '<div class="stack">' + out + '</div>';
  }

  function errorBox(key, msg) {
    return '<div class="empty">' +
      '<div class="empty-title">加载失败</div>' +
      '<div class="tiny muted">' + esc(msg || '请稍后重试') + '</div>' +
      '<button class="btn btn-sm btn-ghost" style="margin-top:10px" data-act="reload" data-key="' + esc(key) + '">重新加载</button>' +
      '</div>';
  }

  function emptyState(icon, title, desc) {
    return '<div class="empty">' +
      '<div class="empty-ico">' + ico(icon || 'star') + '</div>' +
      '<div class="empty-title">' + esc(title) + '</div>' +
      (desc ? '<div class="tiny muted">' + esc(desc) + '</div>' : '') +
      '</div>';
  }

  function riskBadge(level) {
    var lv = RISK_TEXT[level] ? level : 'green';
    var tone = lv === 'green' ? 'green' : lv === 'yellow' ? 'yellow' : lv === 'orange' ? 'orange' : 'red';
    return '<span class="badge badge-' + tone + '">' +
      '<i style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;background:' + RISK_COLOR[lv] + '"></i>' +
      RISK_TEXT[lv] + '</span>';
  }

  function moodBars(data) {
    if (!data || !data.length) {
      return emptyState('sun', '还没有记录', '完成第一次心情打卡后，这里会出现最近两周的情绪走势。');
    }
    var bars = data.map(function (p) {
      var v = Number(p.value) || 0;
      var h = Math.max(8, Math.round((v / 5) * 100));
      var low = v > 0 && v <= 2;
      return '<i class="trend-bar' + (low ? ' is-peak' : '') + '" style="flex:1;height:' + h + '%" title="' +
        esc(p.date) + ' · ' + esc(moodLabel(v)) + '"></i>';
    }).join('');
    var first = fmtDay(data[0].date);
    var last = fmtDay(data[data.length - 1].date);
    return '<div class="trend" style="display:flex;align-items:flex-end;gap:3px;height:132px;padding-top:6px">' + bars + '</div>' +
      '<div class="row tiny muted" style="margin-top:6px"><span>' + esc(first) + '</span>' +
      '<span style="margin-left:auto">' + esc(last) + '</span></div>';
  }

  function quickLink(icon, title, desc, href) {
    return '<a class="card" href="#' + href + '" style="text-decoration:none;color:inherit">' +
      '<div class="card-body tight"><div class="row">' +
      '<span class="brand-mark" style="width:34px;height:34px;flex:0 0 34px">' + ico(icon) + '</span>' +
      '<span style="flex:1;min-width:0"><span class="strong" style="display:block">' + esc(title) + '</span>' +
      '<span class="tiny muted">' + esc(desc) + '</span></span>' +
      ico('chevron', 'ico') +
      '</div></div></a>';
  }

  /* 演示用二维码图案：不做真实编码，只表达「扫码下载」的视觉占位 */
  function qrSvg() {
    var cells = [], seed = 19, x, y;
    function inFinder(px, py) {
      return (px < 8 && py < 8) || (px > 20 && py < 8) || (px < 8 && py > 20);
    }
    for (y = 0; y < 29; y++) {
      for (x = 0; x < 29; x++) {
        if (inFinder(x, y)) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if ((seed >> 9) % 3 === 0) {
          cells.push('<rect x="' + x + '" y="' + y + '" width="1" height="1"/>');
        }
      }
    }
    function finder(px, py) {
      return '<rect x="' + (px + 0.5) + '" y="' + (py + 0.5) + '" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/>' +
        '<rect x="' + (px + 2) + '" y="' + (py + 2) + '" width="4" height="4"/>';
    }
    return '<svg class="qr" viewBox="-1 -1 31 31" fill="currentColor" aria-hidden="true">' +
      cells.join('') + finder(0, 0) + finder(22, 0) + finder(0, 22) + '</svg>';
  }

  function appCard(role) {
    var desc = role === 'teacher'
      ? '预警推送、随堂记录与家校沟通在移动端完成。'
      : role === 'parent'
        ? '孩子情绪提醒、咨询预约与紧急联系在移动端更及时。'
        : 'AI 陪伴对话、语音打卡与离线放松音频，仅在 App 内提供。';
    return '<div class="card"><div class="card-body"><div class="appcard">' +
      '<div class="appcard-qr">' + qrSvg() + '</div>' +
      '<div class="appcard-main">' +
      '<div class="appcard-title">下载星屿 App</div>' +
      '<div class="appcard-desc">' + esc(desc) + '</div>' +
      '<button class="btn btn-sm btn-primary" style="margin-top:10px" data-act="app:how">查看下载方式</button>' +
      '</div></div></div></div>';
  }

  /* ========== 8. 学生端 ========== */

  function studentHome() {
    var m = me();
    var risk = d('risk');
    var hist = d('moodHistory');
    var chart = d('moodChart');
    var trendTxt = hist.trend === 'up' ? '最近的整体状态在回升'
      : hist.trend === 'down' ? '最近几天的情绪在下滑，别硬扛'
        : '最近的状态比较平稳';

    var picked = S.draft.mood || 0;
    var tags = S.draft.moodTags || [];
    var moodBtns = MOODS.map(function (o) {
      return '<button class="mood-btn' + (picked === o.v ? ' is-on' : '') + '" data-act="mood:pick" data-v="' + o.v + '"' +
        ' aria-pressed="' + (picked === o.v ? 'true' : 'false') + '">' +
        '<span class="emo">' + o.emo + '</span><span class="lbl">' + o.lbl + '</span></button>';
    }).join('');

    var tagBtns = MOOD_TAGS.map(function (t) {
      var on = tags.indexOf(t) >= 0;
      return '<button class="chip' + (on ? ' is-on' : '') + '" data-act="mood:tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');

    var done = S.draft.checkinDone
      ? '<div class="row" style="margin-bottom:12px"><span class="badge badge-green">今天已打卡</span>' +
        '<span class="tiny muted">' + esc(S.draft.checkinMsg || '记录已保存') + '</span></div>'
      : '';

    return pageHead('今天感觉怎么样，' + (m.nickname || '同学') + '？',
      '每天一次，30 秒就够。你的记录只有你自己和被授权的人能看到。') +

      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-head"><div class="card-title">心情打卡</div>' +
          '<div class="tiny muted">' + esc(fmtDay(new Date().toISOString().slice(0, 10))) + '</div></div>' +
          '<div class="card-body">' + done +
            '<div class="mood-picker">' + moodBtns + '</div>' +
            '<div class="field" style="margin-top:14px"><div class="field-label">是什么影响了心情？<span class="tiny muted">（可多选）</span></div>' +
              '<div class="tag-wrap">' + tagBtns + '</div></div>' +
            '<div class="field" style="margin-top:12px"><div class="field-label">想补充点什么？<span class="tiny muted">（选填）</span></div>' +
              '<textarea class="textarea" rows="3" placeholder="今天发生了什么…" data-draft="moodNote">' + esc(S.draft.moodNote || '') + '</textarea></div>' +
            '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="mood:submit"' +
              (picked ? '' : ' disabled') + '>' + (picked ? '记录今天的心情' : '先选一个心情') + '</button>' +
          '</div></div>' +

        '<div class="card"><div class="card-head"><div class="card-title">最近 14 天</div>' +
          '<div class="tiny muted">' + esc(trendTxt) + '</div></div>' +
          '<div class="card-body">' + panel('moodChart', function (box) { return moodBars(box.data); }, 2) + '</div></div>' +
      '</div>' +

      riskCard(risk, true) +

      '<div class="grid grid-3" style="margin-top:14px">' +
        quickLink('book', '心理知识库', '先理解自己的情绪', '/student/knowledge') +
        quickLink('users', '树人互助', '匿名求助，同辈回应', '/student/community') +
        quickLink('spa', '放松一下', '呼吸练习与冥想', '/student/relax') +
      '</div>' +

      '<div style="margin-top:14px">' + appCard('student') + '</div>';
  }

  function riskCard(risk, self) {
    var lv = risk.level || 'green';
    var low = Number(risk.lowDays) || 0;
    var hint = lv === 'green' ? '最近情绪比较稳定，继续保持记录。'
      : lv === 'yellow' ? (low ? '近 7 天有 ' + low + ' 天情绪偏低' : '有几天情绪偏低') + '，可以多留意睡眠和压力。'
        : lv === 'orange' ? '连续多天情绪偏低，建议找信任的人聊聊，或预约心理老师。'
          : '持续低落，请尽快联系心理老师、家长，或拨打 12355。';
    return '<div class="card" style="margin-top:14px"><div class="card-body">' +
      '<div class="row"><div style="flex:1">' +
      '<div class="tiny muted">' + (self ? '你的情绪风险等级' : '风险等级') + '</div>' +
      '<div class="strong" style="font-size:16px;margin-top:2px">' + RISK_TEXT[lv] + '</div></div>' +
      riskBadge(lv) + '</div>' +
      '<p class="tiny muted" style="margin-top:8px">' + esc(hint) + '</p>' +
      '</div></div>';
  }

  function kbSearchBlock() {
    var cats = d('kbCats').categories || [];
    var stats = d('kbStats');
    var chips = '<button class="chip' + (!S.draft.kbCat ? ' is-on' : '') + '" data-act="kb:cat" data-key="">全部</button>' +
      cats.map(function (c) {
        return '<button class="chip' + (S.draft.kbCat === c.key ? ' is-on' : '') + '" data-act="kb:cat" data-key="' + esc(c.key) + '">' +
          esc(c.label) + (c.count ? ' ' + c.count : '') + '</button>';
      }).join('');
    return '<div class="card"><div class="card-body">' +
      '<div class="row">' +
      '<input class="input" style="flex:1;min-width:0" placeholder="搜索：焦虑、失眠、和父母吵架…" value="' +
      esc(S.draft.kbQuery || '') + '" data-draft="kbQuery" data-enter="kb:search">' +
      '<button class="btn btn-primary" data-act="kb:search">搜索</button>' +
      '</div>' +
      '<div class="tag-wrap" style="margin-top:12px">' + chips + '</div>' +
      (stats.total_documents ? '<div class="tiny muted" style="margin-top:8px">共 ' + stats.total_documents +
        ' 篇科普内容，来自学校心理中心与合作机构。</div>' : '') +
      '</div></div>';
  }

  function kbResultsBlock() {
    return '<div class="card"><div class="card-head"><div class="card-title">结果</div>' +
      '<div class="tiny muted">按相关度排序</div></div><div class="card-body tight">' +
      panel('kbResults', function (box) {
        var rows = box.results || [];
        if (!rows.length) {
          return emptyState('book', '没有找到相关内容', '换个说法试试，比如「睡不着」「不想上学」。');
        }
        return '<div class="list">' + rows.map(function (a) {
          return '<button class="list-item" data-act="kb:open" data-id="' + esc(a.id) + '" style="width:100%;text-align:left">' +
            '<span class="avatar">' + ico('book') + '</span>' +
            '<span class="list-main">' +
            '<span class="list-title">' + esc(a.title) + '</span>' +
            '<span class="list-sub">' + esc(a.content_preview || '') + '</span>' +
            '<span class="row-wrap tiny muted" style="margin-top:6px">' +
            (a.category ? '<span class="badge badge-blue">' + esc(a.category) + '</span>' : '') +
            (a.source ? '<span>' + esc(a.source) + '</span>' : '') +
            (a.score ? '<span>匹配度 ' + Math.round(a.score * 100) + '%</span>' : '') +
            '</span></span></button>';
        }).join('') + '</div>';
      }) + '</div></div>';
  }

  function kbScaleBlock() {
    return '<div class="card"><div class="card-head"><div class="card-title">量表测评</div>' +
      '<div class="tiny muted">结果仅自己可见</div></div><div class="card-body tight">' +
      panel('assessTypes', function (box) {
        var list = box.types || [];
        if (!list.length) return emptyState('check', '暂无可用量表', '稍后再来看看。');
        return '<div class="list">' + list.map(function (t) {
          return '<button class="list-item" data-act="as:start" data-type="' + esc(t.type) + '" style="width:100%;text-align:left">' +
            '<span class="avatar">' + ico('check') + '</span>' +
            '<span class="list-main"><span class="list-title">' + esc(t.title) + '</span>' +
            '<span class="list-sub">' + esc(t.intro || '') + '</span>' +
            '<span class="tiny muted" style="margin-top:4px">' + (t.count ? t.count + ' 题 · ' : '') +
            '约 ' + Math.max(1, Math.round((Number(t.duration) || 180) / 60)) + ' 分钟</span></span>' +
            ico('chevron', 'ico') + '</button>';
        }).join('') + '</div>';
      }) + '</div></div>';
  }

  function studentKnowledge() {
    return pageHead('心理知识库', '关于情绪、睡眠、人际与压力的科普内容。先理解，再行动。') +
      '<div class="stack">' + kbSearchBlock() + kbResultsBlock() + kbScaleBlock() + '</div>';
  }

  function studentCommunity() {
    return pageHead('树人互助', '匿名求助与同辈支持。这里没有评判，只有一起长大的人。',
      '<button class="btn btn-primary" data-act="post:new">' + ico('plus') + ' 发起求助</button>') +
      '<div class="card"><div class="card-body tight">' +
      panel('posts', function (box) {
        var list = box.posts || [];
        if (!list.length) return emptyState('users', '还没有人开口', '你可以成为第一个分享的人。');
        return '<div class="stack">' + list.map(function (p) {
          return '<button class="post" data-act="post:open" data-id="' + esc(p.id) + '" style="width:100%;text-align:left">' +
            '<div class="row" style="align-items:flex-start">' +
            '<span class="avatar">' + esc(p.avatar || (p.nickname || '?').slice(0, 1)) + '</span>' +
            '<span style="flex:1;min-width:0">' +
            '<span class="row"><span class="strong">' + esc(p.nickname || '匿名同学') + '</span>' +
            (p.urgencyLevel === 'high' ? '<span class="badge badge-red">急</span>' : '') +
            '<span class="tiny muted" style="margin-left:auto">' + esc(fmtTime(p.createdAt)) + '</span></span>' +
            '<span class="post-title" style="display:block;margin-top:6px">' + esc(p.title) + '</span>' +
            '<span class="post-preview" style="display:block">' + esc(trunc(p.content, 110)) + '</span>' +
            '<span class="row-wrap tiny muted" style="margin-top:8px">' +
            (p.tags || []).map(function (t) { return '#' + esc(t); }).join(' ') +
            '<span style="margin-left:auto">' + (Number(p.replyCount) || 0) + ' 条回应</span>' +
            '</span></span></div></button>';
        }).join('') + '</div>';
      }) +
      '</div></div>' +
      '<p class="tiny muted" style="margin-top:12px">互助区不是急救通道。如果你或同学有即时危险，请立刻使用右下角的紧急帮助。</p>';
  }

  function breathRunning(ex) {
    var b = S.ui.breathing;
    var steps = ex.steps || [];
    var step = steps[b.idx] || steps[0] || { name: '吸气', duration: 4, instruction: '' };
    return '<div class="center" style="padding:18px 0">' +
      '<div class="tiny muted">第 ' + Math.min(b.idx + 1, steps.length) + ' / ' + steps.length + ' 步</div>' +
      '<div style="font-size:46px;font-weight:700;line-height:1.1;margin:6px 0">' + b.left + '</div>' +
      '<div class="strong">' + esc(step.name) + '</div>' +
      '<div class="tiny muted">' + esc(step.instruction || '') + '</div>' +
      '<button class="btn btn-ghost btn-block" style="margin-top:14px" data-act="br:stop">结束练习</button>' +
      '</div>';
  }

  function breathCard() {
    return '<div class="card"><div class="card-head"><div class="card-title">呼吸练习</div>' +
      '<div class="tiny muted">随时可做</div></div><div class="card-body">' +
      panel('breathing478', function (box) {
        var ex = box.exercise || {};
        var steps = ex.steps || [];
        if (S.ui.breathing) return breathRunning(ex);
        return '<div class="strong">' + esc(ex.name || '4-7-8 呼吸') + '</div>' +
          '<p class="tiny muted" style="margin-top:4px">' + esc(ex.desc || '') + '</p>' +
          '<ol class="soft" style="margin:10px 0 0 18px">' + steps.map(function (s) {
            return '<li>' + esc(s.name) + ' ' + s.duration + ' 秒 · ' + esc(s.instruction || '') + '</li>';
          }).join('') + '</ol>' +
          '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="br:start" data-type="' +
          esc(ex.type || '478') + '">开始练习</button>';
      }) + '</div></div>';
  }

  function meditationCard() {
    return '<div class="card"><div class="card-head"><div class="card-title">冥想音频</div>' +
      '<div class="tiny muted">音频在 App 内播放</div></div><div class="card-body tight">' +
      panel('meditations', function (box) {
        var list = box.meditations || [];
        if (!list.length) return emptyState('spa', '暂无音频', '稍后再来看看。');
        return '<div class="list">' + list.map(function (m) {
          return '<div class="list-item">' +
            '<span class="avatar">' + ico('spa') + '</span>' +
            '<span class="list-main"><span class="list-title">' + esc(m.title) + '</span>' +
            '<span class="list-sub">' + esc(m.description || '') + '</span></span>' +
            '<span class="tiny muted nowrap">' + dur(m.duration) + '</span>' +
            (m.audioUrl
              ? '<a class="btn btn-sm btn-ghost" href="' + esc(m.audioUrl) + '" target="_blank" rel="noopener">播放</a>'
              : '<span class="badge">App 内</span>') +
            '</div>';
        }).join('') + '</div>';
      }) + '</div></div>';
  }

  function studentRelax() {
    return pageHead('放松一下', '焦虑上来的时候，先把身体稳住，再处理事情。') +
      '<div class="grid grid-2">' + breathCard() + meditationCard() + '</div>' +
      '<div style="margin-top:14px">' + appCard('student') + '</div>';
  }

  function assessMineCard() {
    return '<div class="card"><div class="card-head"><div class="card-title">我的测评</div>' +
      '<div class="tiny muted">仅自己可见</div></div><div class="card-body tight">' +
      panel('assessMine', function (box) {
        var rs = box.results || [];
        if (!rs.length) {
          return emptyState('check', '还没有测评记录', '去知识库做一次量表，了解自己的状态。');
        }
        return '<div class="list">' + rs.map(function (r) {
          return '<button class="list-item" data-act="as:openResult" data-id="' + esc(r.resultId) + '" style="width:100%;text-align:left">' +
            '<span class="avatar">' + ico('check') + '</span>' +
            '<span class="list-main"><span class="list-title">' + esc(r.title) + '</span>' +
            '<span class="list-sub">' + esc(r.levelLabel || '') + ' · ' + esc(fmtTime(r.createdAt)) + '</span></span>' +
            ico('chevron', 'ico') + '</button>';
        }).join('') + '</div>';
      }) + '</div></div>';
  }

  function profileCard(roleLabel) {
    var m = me();
    return '<div class="card"><div class="card-body"><div class="row">' +
      '<span class="avatar" style="width:52px;height:52px;font-size:24px">' + esc(m.avatar || '🌱') + '</span>' +
      '<span style="flex:1;min-width:0">' +
      '<span class="strong" style="font-size:17px;display:block">' + esc(m.nickname || '未命名') + '</span>' +
      '<span class="tiny muted">星屿号 ' + esc(m.userId || '—') + ' · ' + esc(roleLabel) + '</span>' +
      '</span></div></div></div>';
  }

  function logoutCard() {
    return '<div class="card"><div class="card-body">' +
      '<button class="btn btn-ghost btn-block" data-act="logout">退出登录</button></div></div>';
  }

  function studentProfile() {
    var risk = d('risk');
    return pageHead('我的', '账号信息、测评记录与 App 下载。') +
      '<div class="stack">' +
      profileCard('学生端') +
      riskCard(risk, true) +
      assessMineCard() +
      appCard('student') +
      logoutCard() +
      '</div>';
  }

  /* ========== 10. 教师端：共用行组件 ========== */

  function statTile(label, value, hint) {
    return '<div class="card"><div class="card-body tight">' +
      '<div class="stat-val">' + esc(String(value)) + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      (hint ? '<div class="stat-hint">' + esc(hint) + '</div>' : '') +
      '</div></div>';
  }

  function alertRow(a) {
    return '<button class="list-item" data-act="alert:open" data-id="' + esc(a.id) + '" style="width:100%;text-align:left">' +
      '<span class="avatar">' + esc(a.studentAvatar || '🌱') + '</span>' +
      '<span class="list-main">' +
        '<span class="list-title">' + esc(a.studentName || '同学') + riskBadge(a.riskLevel) + '</span>' +
        '<span class="list-sub">' + esc(a.reason || '情绪出现波动，建议关注') + '</span>' +
        '<span class="list-sub">' + esc(a.source || '系统预警') + ' · ' + esc(fmtTime(a.createdAt)) + '</span>' +
      '</span>' + ico('chevron') + '</button>';
  }

  function studentRow(s) {
    var mood = s.latestMood ? moodLabel(s.latestMood) : '暂无心情记录';
    var tail = (s.latestMoodDate ? ' · ' + fmtDay(s.latestMoodDate) : '') +
      (s.tags && s.tags.length ? ' · ' + s.tags.join(' / ') : '');
    return '<button class="list-item" data-act="stu:open" data-id="' + esc(s.id) + '" style="width:100%;text-align:left">' +
      '<span class="avatar">' + esc(s.avatar || '🌱') + '</span>' +
      '<span class="list-main">' +
        '<span class="list-title">' + esc(s.nickname || '同学') + riskBadge(s.riskLevel) +
          (s.checkinToday ? '<span class="badge badge-blue">今日已打卡</span>' : '') + '</span>' +
        '<span class="list-sub">' + esc(mood + tail) + '</span>' +
      '</span>' + ico('chevron') + '</button>';
  }

  /* ========== 11. 教师端：页面 ========== */

  function teacherHome() {
    return pageHead('班级总览', '早发现、早介入，把关注放在最需要的同学身上。',
        '<button class="btn btn-sm btn-ghost" data-act="reload" data-key="classStats">刷新</button>') +
      '<div class="stack">' +
        panel('classStats', function (box) {
          return '<div class="grid grid-4">' +
            statTile('班级人数', box.totalStudents || 0, box.className || '') +
            statTile('今日打卡', (box.checkinRate || 0) + '%', (box.todayCheckinCount || 0) + ' 人已打卡') +
            statTile('平均心情', Number(box.averageMood || 0).toFixed(1), '满分 5.0') +
            statTile('待复核预警', box.alertCount || 0, '需要老师确认') +
            '</div>';
        }, 4) +
        '<div class="grid grid-2">' +
          '<div class="card"><div class="card-head">' +
            '<div class="card-title">待复核预警<small>' + alertCount() + ' 条</small></div>' +
            '<a class="tiny" href="#/teacher/alerts">查看全部</a></div>' +
            '<div class="card-body tight">' +
            panel('classAlerts', function (box) {
              var list = box.alerts || [];
              if (!list.length) return emptyState('shield', '暂无待复核预警', '有新的预警会自动出现在这里。');
              return '<div class="list">' + list.slice(0, 3).map(alertRow).join('') + '</div>';
            }, 3) +
            '</div></div>' +
          '<div class="card"><div class="card-head">' +
            '<div class="card-title">需重点关注<small>高危与较高风险</small></div>' +
            '<a class="tiny" href="#/teacher/students">全部学生</a></div>' +
            '<div class="card-body tight">' +
            panel('classStudents', function (box) {
              var list = (box.students || []).filter(function (s) {
                return s.riskLevel === 'red' || s.riskLevel === 'orange';
              });
              if (!list.length) return emptyState('check', '暂时没有高风险学生', '保持日常关注即可。');
              return '<div class="list">' + list.slice(0, 4).map(studentRow).join('') + '</div>';
            }, 3) +
            '</div></div>' +
        '</div>' +
      '</div>';
  }

  function teacherStudents() {
    var cur = S.ui.filterRisk || 'all';
    var loaded = st('classStudents') === 'ok';
    var all = loaded ? (d('classStudents').students || []) : [];
    var opts = [['all', '全部'], ['red', '高危'], ['orange', '较高'], ['yellow', '关注'], ['green', '平稳']];
    var chips = opts.map(function (o) {
      var n = o[0] === 'all' ? all.length : all.filter(function (s) { return s.riskLevel === o[0]; }).length;
      return '<button class="chip' + (cur === o[0] ? ' is-on' : '') + '" data-act="filter:risk" data-key="' + o[0] + '">' +
        o[1] + (loaded ? ' ' + n : '') + '</button>';
    }).join('');

    return pageHead('学生列表', '按风险等级查看全班，点击任意同学查看详情。') +
      '<div class="row row-wrap" style="gap:8px;margin-bottom:14px">' + chips + '</div>' +
      panel('classStudents', function (box) {
        var list = (box.students || []).filter(function (s) {
          return cur === 'all' || s.riskLevel === cur;
        });
        if (!list.length) return emptyState('users', '没有符合条件的同学', '换个风险等级看看。');
        return '<div class="card"><div class="card-body tight"><div class="list">' +
          list.map(studentRow).join('') + '</div></div></div>';
      }, 4);
  }

  function teacherAlerts() {
    var defs = REVIEW_OPTIONS.map(function (o) {
      return '<div class="row" style="align-items:flex-start;padding:5px 0">' +
        '<span class="badge badge-blue">' + esc(o.label) + '</span>' +
        '<span class="tiny muted" style="flex:1">' + esc(o.desc) + '</span></div>';
    }).join('');

    return pageHead('预警复核', '每一条预警都需要老师给出处理意见，避免遗漏。') +
      '<div class="stack">' +
        '<div class="card"><div class="card-head">' +
          '<div class="card-title">复核选项<small>四选一</small></div></div>' +
          '<div class="card-body tight">' + defs + '</div></div>' +
        '<div class="card"><div class="card-head">' +
          '<div class="card-title">待复核<small>' + alertCount() + ' 条</small></div></div>' +
          '<div class="card-body tight">' +
          panel('classAlerts', function (box) {
            var list = box.alerts || [];
            if (!list.length) return emptyState('check', '全部处理完了', '新的预警会实时出现在这里。');
            return '<div class="list">' + list.map(alertRow).join('') + '</div>';
          }, 4) +
          '</div></div>' +
      '</div>';
  }

  function teacherProfile() {
    var stats = d('classStats');
    var line = stats.className
      ? '<div class="card"><div class="card-body"><div class="row">' +
        '<span class="brand-mark" style="width:40px;height:40px;flex:0 0 40px">' + ico('users') + '</span>' +
        '<span style="flex:1;min-width:0"><span class="strong" style="display:block">' + esc(stats.className) + '</span>' +
        '<span class="tiny muted">共 ' + esc(stats.totalStudents || 0) + ' 名学生 · 待复核 ' + alertCount() + ' 条</span></span>' +
        '</div></div></div>'
      : '';
    return pageHead('我的', '教师账号与班级信息。') +
      '<div class="stack">' + profileCard('教师端') + line + appCard('teacher') + logoutCard() + '</div>';
  }

  /* ========== 12. 家长端：页面 ========== */

  var TREND_TEXT = { up: '近期情绪在回升', down: '近期情绪在下滑，建议主动聊聊', flat: '近期整体平稳' };

  function parentHome() {
    var alert = d('parentAlert').alert;
    var top = '';
    if (alert && !alert.confirmed) {
      top = '<div class="card" style="border-color:var(--danger-500)">' +
        '<div class="card-body">' +
          '<span class="badge badge-red">高危提醒</span>' +
          '<div class="strong" style="display:block;font-size:17px;margin-top:8px">' +
            esc(alert.studentName || '你的孩子') + ' 需要你的关注</div>' +
          '<div class="tiny muted" style="margin-top:4px">' +
            esc(alert.reason || '系统检测到持续的低落情绪，请尽快与孩子沟通。') + ' · ' + esc(fmtTime(alert.createdAt)) + '</div>' +
          '<button class="btn btn-primary btn-block" style="margin-top:12px" data-act="alert:confirm" data-id="' +
            esc(alert.alertId) + '">我已知晓</button>' +
          '<a class="btn btn-ghost btn-block" style="margin-top:8px" href="#/parent/emergency">查看紧急支持资源</a>' +
        '</div></div>';
    }

    var kids = panel('children', function (box) {
      var list = box.children || [];
      if (!list.length) {
        return '<div class="card"><div class="card-body">' +
          emptyState('users', '还没有绑定孩子', '输入孩子的星屿号，就能看到他的情绪状态。') +
          '<a class="btn btn-primary btn-block" href="#/parent/children">去绑定</a></div></div>';
      }
      return list.map(function (c) {
        var head = '<div class="row">' +
          '<span class="avatar" style="width:44px;height:44px;font-size:20px">' + esc(c.studentAvatar || '🌱') + '</span>' +
          '<span style="flex:1;min-width:0">' +
            '<span class="strong" style="display:block">' + esc(c.studentNickname || '孩子') + '</span>' +
            '<span class="tiny muted">' + esc(c.relation || '监护人') + ' · 星屿号 ' + esc(c.studentId) + '</span>' +
          '</span>' +
          (c.authorized ? '<span class="badge badge-green">已授权</span>' : '<span class="badge badge-yellow">待授权</span>') +
        '</div>';

        if (!c.authorized) {
          return '<div class="card"><div class="card-body">' + head +
            '<div class="tiny muted" style="margin-top:12px">孩子还没有开启情绪共享。授权开关在孩子那边打开后，你才能看到情绪记录。</div>' +
            '<a class="btn btn-sm btn-ghost" style="margin-top:10px" href="#/parent/children">去管理绑定</a>' +
            '</div></div>';
        }

        return '<div class="card"><div class="card-body">' + head +
          '<div style="margin-top:14px">' +
          panel('childMood:' + c.bindingId, function (m) {
            var sum = m.summary || {};
            var hist = (m.history || []).map(function (r) {
              return { date: r.checkinDate, value: r.moodLevel };
            });
            return '<div class="grid grid-3" style="gap:10px">' +
              statTile('近 ' + (sum.days || 14) + ' 天打卡', (sum.checkinCount || 0) + ' 天') +
              statTile('平均心情', Number(sum.averageMood || 0).toFixed(1)) +
              statTile('低落天数', (sum.lowDays || 0) + ' 天') +
              '</div>' +
              '<div style="margin-top:12px">' + moodBars(hist) + '</div>' +
              '<div class="tiny muted" style="margin-top:8px">最近打卡 ' +
                esc(sum.lastCheckinDate ? fmtDay(sum.lastCheckinDate) : '暂无') +
                ' · ' + esc(TREND_TEXT[m.trend] || TREND_TEXT.flat) + '</div>';
          }, 2) +
          '</div></div>';
      }).join('');
    }, 2);

    return pageHead('孩子情绪', '只在你和孩子都同意的前提下共享情绪记录。') +
      '<div class="stack">' + top + kids + appCard('parent') + '</div>';
  }

  function parentChildren() {
    var rel = S.draft.bindRelation || '妈妈';
    var rels = ['妈妈', '爸爸', '爷爷', '奶奶', '其他监护人'];
    var form = '<div class="card"><div class="card-head">' +
      '<div class="card-title">绑定孩子<small>需要孩子的星屿号</small></div></div>' +
      '<div class="card-body">' +
        '<label class="field"><span class="field-label">孩子的星屿号</span>' +
          '<input class="input" data-draft="bindStudentId" data-enter="child:bind" placeholder="例如 stu-1001" value="' +
            esc(S.draft.bindStudentId || '') + '" /></label>' +
        '<label class="field"><span class="field-label">你是孩子的</span>' +
          '<select class="select" data-draft="bindRelation">' +
            rels.map(function (r) {
              return '<option value="' + esc(r) + '"' + (r === rel ? ' selected' : '') + '>' + esc(r) + '</option>';
            }).join('') +
          '</select></label>' +
        '<button class="btn btn-primary btn-block" data-act="child:bind"' + (S.busy.childBind ? ' disabled' : '') + '>绑定</button>' +
        '<div class="field-hint" style="margin-top:8px">星屿号在孩子的「我的」页面可以看到，绑定后需要孩子授权才能查看情绪。</div>' +
      '</div></div>';

    var list = panel('children', function (box) {
      var kids = box.children || [];
      if (!kids.length) return emptyState('users', '还没有绑定记录', '绑定后可以在这里管理授权。');
      return '<div class="stack">' + kids.map(function (c) {
        return '<div class="card"><div class="card-body">' +
          '<div class="row">' +
            '<span class="avatar">' + esc(c.studentAvatar || '🌱') + '</span>' +
            '<span class="list-main"><span class="list-title">' + esc(c.studentNickname || '孩子') +
              (c.authorized ? '<span class="badge badge-green">已授权</span>' : '<span class="badge badge-yellow">未授权</span>') +
              '</span><span class="list-sub">' + esc(c.relation || '监护人') + ' · 星屿号 ' + esc(c.studentId) +
              ' · 绑定于 ' + esc(fmtDay(c.createdAt)) + '</span></span>' +
          '</div>' +
          '<div class="row row-wrap" style="gap:8px;margin-top:12px">' +
            '<button class="btn btn-sm' + (c.authorized ? ' btn-ghost' : ' btn-primary') +
              '" data-act="child:authorize" data-id="' + esc(c.bindingId) + '" data-on="' + (c.authorized ? '0' : '1') + '">' +
              (c.authorized ? '关闭情绪共享' : '开启情绪共享') + '</button>' +
            '<button class="btn btn-sm btn-ghost" data-act="child:unbind" data-id="' + esc(c.bindingId) + '">解除绑定</button>' +
          '</div>' +
        '</div></div>';
      }).join('') + '</div>';
    }, 2);

    return pageHead('我的孩子', '绑定、授权与解除绑定都在这里。') +
      '<div class="stack">' + form + list + '</div>';
  }

  function parentEmergency() {
    var groups = [
      ['hotline', '24 小时心理热线', '随时可以打，接线员会陪你一起想办法'],
      ['hospital', '医院心理科', '需要专业评估时尽快就诊'],
      ['school', '学校心理中心', '也可以先联系班主任或心理老师'],
      ['emergency', '紧急联系', '出现立即危险时请直接拨打']
    ];

    return pageHead('紧急支持', '当孩子或你感到撑不住时，这些渠道可以立刻用。') +
      panel('resources', function (box) {
        var rs = box.resources || [];
        if (!rs.length) return emptyState('phone', '暂时没有资源信息', '请拨打 12355 青少年服务台。');
        return '<div class="stack">' + groups.map(function (g) {
          var items = rs.filter(function (r) { return r.type === g[0]; });
          if (!items.length) return '';
          return '<div class="card"><div class="card-head">' +
            '<div class="card-title">' + esc(g[1]) + '<small>' + esc(g[2]) + '</small></div></div>' +
            '<div class="card-body tight"><div class="list">' +
            items.map(function (r) {
              var tel = r.phone || r.contact || '';
              return '<div class="list-item" style="cursor:default">' +
                '<span class="brand-mark" style="width:34px;height:34px;flex:0 0 34px">' + ico('phone') + '</span>' +
                '<span class="list-main"><span class="list-title">' + esc(r.title) + '</span>' +
                '<span class="list-sub">' + esc(r.content || '') + '</span></span>' +
                (tel ? '<a class="btn btn-sm btn-ghost" href="tel:' + esc(tel) + '">' +
                  esc(r.contact || tel) + '</a>' : '') +
                '</div>';
            }).join('') + '</div></div></div>';
        }).join('') + '</div>';
      }, 3);
  }

  function parentKnowledge() {
    return pageHead('心理知识', '了解孩子正在经历什么，也知道该怎么开口。') +
      '<div class="stack">' +
        kbSearchBlock() +
        kbResultsBlock() +
        '<div class="card"><div class="card-body tight">' +
          '<div class="tiny muted">量表测评需要在孩子自己的账号里完成，家长端只提供知识与支持资源。</div>' +
        '</div></div>' +
      '</div>';
  }

  function parentProfile() {
    return pageHead('我的', '家长账号与 App 下载。') +
      '<div class="stack">' + profileCard('家长端') + appCard('parent') + logoutCard() + '</div>';
  }

  /* ========== 9. 视图分发与弹层 ========== */

  var POST_TAGS = ['学习压力', '考试焦虑', '人际关系', '家庭', '睡眠', '情绪'];
  var THEME_KEY = 'starisle-theme';
  var toastSeq = 0;
  var breathTimer = null;

  function viewHtml() {
    var r = ROUTES[S.route];
    if (!r || typeof r.view !== 'function') {
      return errorBox('route', '页面不存在：' + S.route);
    }
    try { return r.view(); }
    catch (e) { return errorBox('view', '页面渲染出错：' + ((e && e.message) || e)); }
  }

  function sheetHead(title, sub) {
    return '<div class="sheet-head">' +
      '<div style="min-width:0">' +
        '<div class="sheet-title">' + esc(title) + '</div>' +
        (sub ? '<div class="tiny muted">' + esc(sub) + '</div>' : '') +
      '</div>' +
      '<button class="btn btn-sm btn-ghost" data-act="sheet:close" aria-label="关闭">✕</button>' +
      '</div>';
  }

  function sheetWith(key, title, sub, body, n) {
    var box = S.data[key];
    if (!box || box.status === 'idle') {
      load(key, thunkFor(key));
      box = S.data[key];
    }
    var inner;
    if (!box || box.status === 'loading' || box.status === 'idle') {
      inner = skeleton(n || 3);
    } else if (box.status === 'err') {
      inner = errorBox(key, errText(key));
    } else {
      try { inner = body(box.data || {}); }
      catch (e) { inner = errorBox(key, '内容渲染出错：' + ((e && e.message) || e)); }
    }
    return sheetHead(title, sub) + '<div class="sheet-body">' + inner + '</div>';
  }

  function openSheet(obj) {
    if (!obj || !obj.kind) return;
    if (obj.kind !== 'assessment') S.ui.answers = {};
    S.ui.sheet = obj;
    S.ui.roleMenu = false;
    render();
  }

  function closeSheet() {
    S.ui.sheet = null;
    S.ui.answerScale = null;
    S.ui.answers = {};
  }

  function sheetBody(s) {
    switch (s.kind) {
      case 'student': return sheetStudent(s);
      case 'alert': return sheetAlert(s);
      case 'article': return sheetArticle(s);
      case 'post': return sheetPost(s);
      case 'newPost': return sheetNewPost(s);
      case 'assessment': return sheetAssessment(s);
      case 'result': return sheetResult(s);
      case 'app': return sheetApp(s);
      default:
        return sheetHead('提示', '') + '<div class="sheet-body">' +
          emptyState('bell', '暂无内容', '请关闭后重试。') + '</div>';
    }
  }

  function sheetStudent(s) {
    return sheetWith('classStudents', '学生状态', '风险聚合与打卡状态', function (data) {
      var list = data.students || [];
      var stu = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(s.id)) { stu = list[i]; break; }
      }
      if (!stu) return emptyState('users', '没有找到这名学生', '学生可能已不在当前班级。');
      var tags = (stu.tags || []).map(function (t) {
        return '<span class="chip">' + esc(t) + '</span>';
      }).join('');
      return '<div class="card"><div class="card-body">' +
        '<div class="row" style="align-items:center;gap:12px">' +
          '<span class="avatar" style="width:56px;height:56px">' +
            esc(String(stu.avatar || stu.nickname || '?').slice(0, 2)) + '</span>' +
          '<div style="min-width:0">' +
            '<div style="font-weight:600">' + esc(stu.nickname || '学生') + '</div>' +
            '<div class="row" style="gap:6px;margin-top:6px">' + riskBadge(stu.riskLevel) +
              '<span class="badge ' + (stu.checkinToday ? 'badge-green' : 'badge-gray') + '">' +
              (stu.checkinToday ? '今日已打卡' : '今日未打卡') + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="tiny muted">最近心情</div>' +
        '<div style="font-weight:600;margin-top:2px">' + esc(moodLabel(stu.latestMood)) + '</div>' +
        '<div class="tiny muted" style="margin-top:2px">' + esc(fmtDay(stu.latestMoodDate)) + '</div>' +
        (tags ? '<div class="tag-wrap" style="margin-top:10px">' + tags + '</div>' : '') +
        '</div></div>' +
        '<div class="card" style="margin-top:10px"><div class="card-body tight">' +
          '<div class="tiny muted">教师端仅展示风险聚合与打卡状态，不展示学生的心情正文与测评结果。</div>' +
        '</div></div>';
    }, 4);
  }

  function decisionLabel(v) {
    for (var i = 0; i < REVIEW_OPTIONS.length; i++) {
      if (REVIEW_OPTIONS[i].v === v) return REVIEW_OPTIONS[i].label;
    }
    return '已处理';
  }

  function reviewForm(a) {
    var pick = S.draft.reviewPick || '';
    var opts = REVIEW_OPTIONS.map(function (o) {
      var on = pick === o.v;
      return '<button class="list-item" data-act="review:pick" data-v="' + esc(o.v) + '">' +
        '<div style="min-width:0">' +
          '<div style="font-weight:600">' + esc(o.label) + '</div>' +
          '<div class="tiny muted">' + esc(o.desc) + '</div>' +
        '</div>' +
        (on ? '<span class="badge badge-blue">已选</span>' : ico('chevron', 'ico-sm')) +
        '</button>';
    }).join('');
    return '<div class="card"><div class="card-body">' +
      '<div class="row" style="align-items:center;gap:8px">' +
        '<div style="font-weight:600">' + esc(a.studentName || '学生') + '</div>' + riskBadge(a.riskLevel) +
      '</div>' +
      '<div class="tiny muted" style="margin-top:6px">' + esc(a.reason || '系统检测到风险信号。') + '</div>' +
      '<div class="tiny muted" style="margin-top:4px">来源：' + esc(a.source || '系统') +
        ' · ' + esc(fmtTime(a.createdAt)) + '</div>' +
      '</div></div>' +
      '<div class="tiny muted" style="margin:12px 2px 6px">处理结论</div>' +
      '<div class="stack" style="gap:8px">' + opts + '</div>' +
      '<div class="field" style="margin-top:12px">' +
        '<div class="field-label">备注（可选）</div>' +
        '<textarea class="textarea" rows="3" data-draft="reviewNote" placeholder="记录沟通情况或后续安排">' +
          esc(S.draft.reviewNote || '') + '</textarea>' +
      '</div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:12px" data-act="review:submit" data-id="' +
        esc(a.id) + '"' + (pick ? '' : ' disabled') + '>提交复核结论</button>' +
      '<div class="tiny muted" style="margin-top:8px">按 MVP 规则，教师端只记录处理结论，不触碰学生的心情正文。</div>';
  }

  function sheetAlert(s) {
    return sheetWith('classAlerts', '预警复核', '仅记录处理结论，不展示学生心情正文', function (data) {
      var list = data.alerts || [];
      var a = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(s.id)) { a = list[i]; break; }
      }
      if (!a) return emptyState('bell', '预警已处理或不存在', '请返回预警列表刷新。');
      if (!a.handled) return reviewForm(a);
      return '<div class="card"><div class="card-body">' +
        '<div class="row" style="align-items:center;gap:8px">' +
          '<div style="font-weight:600">' + esc(a.studentName || '学生') + '</div>' + riskBadge(a.riskLevel) +
        '</div>' +
        '<div class="tiny muted" style="margin-top:6px">' + esc(a.reason || '') + '</div>' +
        '<div class="divider"></div>' +
        '<div class="tiny muted">处理结论</div>' +
        '<div style="font-weight:600;margin-top:2px">' + esc(decisionLabel(a.reviewDecision)) + '</div>' +
        '<div class="tiny muted" style="margin-top:2px">' + esc(fmtTime(a.reviewedAt)) + '</div>' +
        (a.reviewNote ? '<div class="tiny" style="margin-top:8px">' + esc(a.reviewNote) + '</div>' : '') +
        '</div></div>';
    }, 4);
  }

  function sheetArticle(s) {
    var key = 'article:' + s.id;
    return sheetWith(key, '心理知识', '来自星屿知识库', function (data) {
      var a = data.article || {};
      var text = Array.isArray(a.content) ? a.content.join('\n') : (a.content || a.summary || '');
      var tech = (a.techniques || []).map(function (t) {
        return '<span class="chip">' + esc(t) + '</span>';
      }).join('');
      return '<div style="font-weight:600;font-size:17px;line-height:1.4">' + esc(a.title || '文章') + '</div>' +
        '<div class="tiny muted" style="margin-top:4px">' + esc(a.category || '') +
          ' · ' + esc(a.source || '星屿') + '</div>' +
        (tech ? '<div class="tag-wrap" style="margin-top:10px">' + tech + '</div>' : '') +
        '<div class="prose" style="margin-top:12px">' + MD.render(text) + '</div>' +
        '<div class="card" style="margin-top:14px"><div class="card-body tight">' +
          '<div class="tiny muted">本文仅作心理科普参考，不能替代专业诊断与治疗。如持续困扰，请通过「紧急支持」联系专业人员。</div>' +
        '</div></div>';
    }, 4);
  }

  function sheetPost(s) {
    var key = 'post:' + s.id;
    return sheetWith(key, '树人互助', '同学之间的匿名支持', function (data) {
      var p = data.post || {};
      var replies = data.replies || [];
      var head = '<div class="card"><div class="card-body">' +
        '<div class="row" style="align-items:center;gap:8px">' +
          '<span class="avatar">' + esc(String(p.avatar || p.nickname || '?').slice(0, 2)) + '</span>' +
          '<div style="min-width:0">' +
            '<div style="font-weight:600">' + esc(p.nickname || '匿名同学') + '</div>' +
            '<div class="tiny muted">' + esc(fmtTime(p.createdAt)) + '</div>' +
          '</div>' +
          (p.urgencyLevel === 'high' ? '<span class="badge badge-red">急</span>' : '') +
        '</div>' +
        '<div style="font-weight:600;margin-top:10px">' + esc(p.title || '') + '</div>' +
        '<div style="white-space:pre-wrap;margin-top:8px;line-height:1.6">' + esc(p.content || '') + '</div>' +
        '</div></div>';
      var list = replies.length ? replies.map(function (r) {
        return '<div class="card" style="margin-top:8px"><div class="card-body">' +
          '<div class="row" style="align-items:center;gap:8px">' +
            '<span class="avatar">' + esc(String(r.avatar || r.nickname || '?').slice(0, 2)) + '</span>' +
            '<div style="font-weight:600">' + esc(r.nickname || '匿名同学') + '</div>' +
            '<span class="tiny muted">' + esc(fmtTime(r.createdAt)) + '</span>' +
          '</div>' +
          '<div style="white-space:pre-wrap;margin-top:8px;line-height:1.6">' + esc(r.content || '') + '</div>' +
          '</div></div>';
      }).join('') : '<div class="card" style="margin-top:8px"><div class="card-body tight">' +
        '<div class="tiny muted">还没有回应，说点什么吧。</div></div></div>';
      var pid = p.id || s.id;
      return head +
        '<div class="tiny muted" style="margin:14px 2px 6px">回应（' + replies.length + '）</div>' + list +
        '<div class="field" style="margin-top:12px">' +
          '<div class="field-label">写下你的回应</div>' +
          '<textarea class="textarea" rows="3" data-draft="replyContent" placeholder="分享你的经验或一句支持"></textarea>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" style="margin-top:10px" data-act="reply:submit" data-id="' +
          esc(pid) + '">发送回应</button>';
    }, 4);
  }

  function sheetNewPost() {
    var urgency = S.draft.postUrgency || 'normal';
    var tags = S.draft.postTags || [];
    var tagHtml = POST_TAGS.map(function (t) {
      return '<button class="chip' + (tags.indexOf(t) >= 0 ? ' is-on' : '') +
        '" data-act="post:tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    return sheetHead('发起求助', '匿名发布，同学之间互相支持') +
      '<div class="sheet-body">' +
        '<div class="field"><div class="field-label">标题</div>' +
          '<input class="input" data-draft="postTitle" maxlength="40" placeholder="用一句话说说你遇到的事"></div>' +
        '<div class="field" style="margin-top:10px"><div class="field-label">详细描述</div>' +
          '<textarea class="textarea" rows="5" data-draft="postContent" placeholder="发生了什么？你希望得到什么样的支持？"></textarea></div>' +
        '<div class="field" style="margin-top:10px"><div class="field-label">紧急程度</div>' +
          '<div class="tag-wrap">' +
            '<button class="chip' + (urgency === 'normal' ? ' is-on' : '') + '" data-act="post:urgency" data-v="normal">一般</button>' +
            '<button class="chip' + (urgency === 'high' ? ' is-on' : '') + '" data-act="post:urgency" data-v="high">需要尽快帮助</button>' +
          '</div></div>' +
        '<div class="field" style="margin-top:10px"><div class="field-label">相关标签（最多 4 个）</div>' +
          '<div class="tag-wrap">' + tagHtml + '</div></div>' +
        '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="post:submit"' +
          (S.busy.postSubmit ? ' disabled' : '') + '>发布</button>' +
        '<div class="tiny muted" style="margin-top:10px">如果你正处于紧急危险中，请立即使用右上角的「紧急支持」联系 12355。</div>' +
      '</div>';
  }

  function sheetAssessment(s) {
    var key = 'scale:' + s.type;
    var title = s.type === 'phq9' ? 'PHQ-9 情绪自评'
      : (s.type === 'gad7' ? 'GAD-7 焦虑自评' : '压力自评');
    return sheetWith(key, title, '结果仅自己可见', function (data) {
      var sc = data.scale || {};
      var qs = sc.questions || [];
      var ans = S.ui.answers || {};
      var answered = 0;
      for (var i = 0; i < qs.length; i++) {
        if (typeof ans[qs[i].id] === 'number') answered++;
      }
      var body = qs.map(function (q) {
        var opts = q.options || sc.options || [];
        var choices = opts.map(function (o) {
          var on = ans[q.id] === o.value;
          return '<button class="chip' + (on ? ' is-on' : '') + '" data-act="as:answer" data-qid="' +
            esc(q.id) + '" data-v="' + esc(o.value) + '">' + esc(o.label) + '</button>';
        }).join('');
        return '<div class="card" style="margin-top:8px"><div class="card-body">' +
          '<div style="font-weight:600;line-height:1.5">' + q.index + '. ' + esc(q.text) + '</div>' +
          '<div class="tag-wrap" style="margin-top:10px">' + choices + '</div>' +
          '</div></div>';
      }).join('');
      return '<div class="tiny muted">' + esc(sc.intro || '') + '</div>' +
        body +
        '<div class="row" style="justify-content:space-between;align-items:center;margin-top:14px">' +
          '<div class="tiny muted">已完成 ' + answered + ' / ' + qs.length + ' 题</div>' +
          '<button class="btn btn-primary btn-sm" data-act="as:submit" data-type="' +
            esc(sc.type || s.type) + '"' +
            (qs.length && answered === qs.length ? '' : ' disabled') + '>提交</button>' +
        '</div>' +
        '<div class="tiny muted" style="margin-top:10px">量表结果仅自己可见，不进入班级预警。如感到明显困扰，请使用「紧急支持」。</div>';
    }, 4);
  }

  function sheetResult(s) {
    var key = 'result:' + s.id;
    return sheetWith(key, '测评结果', '结果仅自己可见', function (data) {
      var r = data.result || {};
      var advice = Array.isArray(r.advice) ? r.advice : (r.advice ? [r.advice] : []);
      return '<div class="card"><div class="card-body">' +
        '<div class="tiny muted">' + esc(r.title || '量表测评') + '</div>' +
        '<div class="row" style="align-items:center;gap:8px;margin-top:6px">' + riskBadge(r.level) +
          '<span style="font-weight:700;font-size:20px">' + esc(String(r.totalScore)) + '</span>' +
          '<span class="tiny muted">/ ' + esc(String(r.maxScore)) + ' 分</span></div>' +
        '<div style="font-weight:600;margin-top:10px">' + esc(r.levelLabel || '') + '</div>' +
        '<div class="tiny muted" style="margin-top:4px">' + esc(r.levelDesc || '') + '</div>' +
        '<div class="tiny muted" style="margin-top:6px">' + esc(fmtTime(r.createdAt)) + '</div>' +
        '</div></div>' +
        (advice.length ? '<div class="card" style="margin-top:10px"><div class="card-body">' +
          '<div style="font-weight:600">建议</div>' +
          '<ul style="margin:8px 0 0 18px;padding:0">' +
            advice.map(function (x) { return '<li class="tiny" style="margin-bottom:4px">' + esc(x) + '</li>'; }).join('') +
          '</ul></div></div>' : '') +
        '<div class="tiny muted" style="margin-top:12px">测评结果不等同于诊断，仅供参考。</div>';
    }, 4);
  }

  function sheetApp() {
    return sheetHead('下载星屿 App', '完整能力在手机上体验') +
      '<div class="sheet-body">' +
        '<div class="appcard" style="margin-top:0">' +
          '<div class="appcard-qr">' + qrSvg() + '</div>' +
          '<div class="appcard-main">' +
            '<div style="font-weight:600">星屿 App</div>' +
            '<div class="tiny muted" style="margin-top:4px">在应用商店搜索「星屿」即可下载。</div>' +
          '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px"><div class="card-body">' +
          '<div style="font-weight:600">Web 端与 App 的能力边界</div>' +
          '<ul style="margin:8px 0 0 18px;padding:0">' +
            '<li class="tiny" style="margin-bottom:4px">Web 端：心情打卡、心理知识库与量表、树人互助、教师预警复核、家长情绪查看。</li>' +
            '<li class="tiny" style="margin-bottom:4px">App / 小程序：在以上能力之外提供 AI 陪伴对话与更完整的放松练习。</li>' +
            '<li class="tiny">紧急情况请直接拨打 12355 青少年服务台。</li>' +
          '</ul>' +
        '</div></div>' +
      '</div>';
  }

  /* ========== 10. 数据源映射 ========== */

  function thunkFor(key) {
    var k = String(key || '');
    if (k === 'hotlines') return function () { return API.risk.hotlines(); };
    if (k === 'classStats') return function () { return API.classroom.stats(cls()); };
    if (k === 'classStudents') return function () { return API.classroom.students(cls()); };
    if (k === 'classAlerts') return function () { return API.classroom.alerts(cls()); };
    if (k === 'posts') return function () { return API.community.list({ page: 1, pageSize: 20 }); };
    if (k === 'children') return function () { return API.parents.children(); };
    if (k === 'parentAlert') return function () { return API.parents.emergencyAlert(); };
    if (k === 'resources') return function () { return API.parents.resources(''); };
    if (k === 'kbCats') return function () { return API.knowledge.categories(); };
    if (k === 'kbStats') return function () { return API.knowledge.stats(); };
    if (k === 'kbResults') {
      return function () {
        return API.knowledge.search({
          query: S.draft.kbQuery || '',
          category: S.draft.kbCat || '',
          topK: 20
        });
      };
    }
    if (k === 'assessTypes') return function () { return API.assessment.types(); };
    if (k === 'assessMine') return function () { return API.assessment.mine(); };
    if (k === 'moodChart') return function () { return API.mood.chart(); };
    if (k === 'moodHistory') return function () { return API.mood.history({ days: 14 }); };
    if (k === 'risk') return function () { return API.risk.level(); };
    if (k === 'breathing478') return function () { return API.content.breathing('478'); };
    if (k === 'meditations') return function () { return API.content.meditations(''); };
    var m1 = /^article:(.+)$/.exec(k);
    if (m1) return function () { return API.knowledge.article(m1[1]); };
    var m2 = /^post:(.+)$/.exec(k);
    if (m2) return function () { return API.community.get(m2[1]); };
    var m3 = /^scale:(.+)$/.exec(k);
    if (m3) return function () { return API.assessment.questions(m3[1]); };
    var m4 = /^result:(.+)$/.exec(k);
    if (m4) return function () { return API.assessment.result(m4[1]); };
    var m5 = /^childMood:(.+)$/.exec(k);
    if (m5) return function () { return API.parents.childMood(m5[1], { days: 14 }); };
    return function () {
      return Promise.resolve({
        ok: false,
        error: { code: 404, message: '没有对应的数据源：' + k }
      });
    };
  }

  /* ========== 11. 轻提示 ========== */

  function toast(msg, type) {
    var id = 't' + (++toastSeq);
    S.toast.push({ id: id, msg: String(msg || ''), type: type || 'ok' });
    render();
    setTimeout(function () {
      S.toast = S.toast.filter(function (t) { return t.id !== id; });
      render();
    }, 2600);
  }

  /* ========== 12. 动作处理 ========== */

  function doLogout() {
    try { API.auth.logout(); } catch (e) { /* 忽略 */ }
    S.session = null;
    S.role = '';
    S.data = {};
    S.draft = {};
    S.busy = {};
    S.ui.sheet = null;
    S.ui.roleMenu = false;
    S.ui.crisis = false;
    S.ui.answers = {};
    S.ui.answerScale = null;
    if (normPath(location.hash) === '/entry') render();
    else location.hash = '/entry';
  }

  function submitMood() {
    var lvl = Number(S.draft.mood || 0);
    if (!lvl) { toast('先选一个心情', 'err'); return; }
    if (S.busy.moodSubmit) return;
    S.busy.moodSubmit = true;
    API.mood.checkin({
      moodLevel: lvl,
      tags: S.draft.moodTags || [],
      note: S.draft.moodNote || ''
    }).then(function (res) {
      S.busy.moodSubmit = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      S.draft.mood = 0;
      S.draft.moodTags = [];
      S.draft.moodNote = '';
      S.draft.checkinDone = true;
      S.draft.checkinMsg = '今天的打卡已记录，感谢你愿意记录自己。';
      delete S.data.moodChart;
      delete S.data.moodHistory;
      delete S.data.risk;
      toast('已记录今天的心情', 'ok');
    });
  }

  function submitAssessment(type) {
    var t = type || (S.ui.sheet && S.ui.sheet.type);
    if (!t) { toast('量表类型缺失', 'err'); return; }
    if (S.busy.asSubmit) return;
    S.busy.asSubmit = true;
    API.assessment.submit({ type: t, answers: S.ui.answers || {} }).then(function (res) {
      S.busy.asSubmit = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      var r = (res.data && res.data.result) || {};
      delete S.data.assessMine;
      S.ui.answers = {};
      S.ui.sheet = { kind: 'result', id: r.resultId };
      toast('测评已完成', 'ok');
    });
  }

  function submitPost() {
    var title = String(S.draft.postTitle || '').trim();
    var content = String(S.draft.postContent || '').trim();
    if (title.length < 2) { toast('请填写标题', 'err'); return; }
    if (content.length < 5) { toast('请多写一点描述', 'err'); return; }
    if (S.busy.postSubmit) return;
    S.busy.postSubmit = true;
    render();
    API.community.create({
      title: title,
      content: content,
      tags: S.draft.postTags || [],
      urgencyLevel: S.draft.postUrgency || 'normal'
    }).then(function (res) {
      S.busy.postSubmit = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      S.draft.postTitle = '';
      S.draft.postContent = '';
      S.draft.postTags = [];
      S.draft.postUrgency = 'normal';
      delete S.data.posts;
      closeSheet();
      toast('已发布，愿意说出来已经很勇敢。', 'ok');
    });
  }

  function submitReply(pid) {
    var text = String(S.draft.replyContent || '').trim();
    if (!text) { toast('写点什么再发送吧', 'err'); return; }
    if (S.busy.replySubmit) return;
    S.busy.replySubmit = true;
    API.community.reply(pid, { content: text }).then(function (res) {
      S.busy.replySubmit = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      S.draft.replyContent = '';
      delete S.data['post:' + pid];
      delete S.data.posts;
      toast('回应已发送', 'ok');
    });
  }

  function submitReview(alertId) {
    var pick = S.draft.reviewPick;
    if (!pick) { toast('请选择一个处理结论', 'err'); return; }
    if (S.busy.reviewSubmit) return;
    S.busy.reviewSubmit = true;
    render();
    API.classroom.review(alertId, { decision: pick, note: S.draft.reviewNote || '' }).then(function (res) {
      S.busy.reviewSubmit = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      S.draft.reviewPick = '';
      S.draft.reviewNote = '';
      delete S.data.classAlerts;
      delete S.data.classStats;
      closeSheet();
      toast('复核结论已提交', 'ok');
    });
  }

  function bindChild() {
    var sid = String(S.draft.bindStudentId || '').trim();
    if (!sid) { toast('请输入孩子的星屿号', 'err'); return; }
    if (S.busy.childBind) return;
    S.busy.childBind = true;
    render();
    API.parents.bind({ studentId: sid, relation: S.draft.bindRelation || '妈妈' }).then(function (res) {
      S.busy.childBind = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      S.draft.bindStudentId = '';
      delete S.data.children;
      delete S.data.parentAlert;
      toast('已绑定，授权后即可查看孩子的情绪状态', 'ok');
    });
  }

  function setAuthorize(bindingId, on) {
    API.parents.authorize(bindingId, on).then(function (res) {
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      delete S.data.children;
      delete S.data['childMood:' + bindingId];
      toast(on ? '已授权，孩子会看到这个变化' : '已取消授权', 'ok');
    });
  }

  function unbindChild(bindingId) {
    API.parents.unbind(bindingId).then(function (res) {
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      delete S.data.children;
      delete S.data['childMood:' + bindingId];
      toast('已解除绑定', 'ok');
    });
  }

  function runAction(act, el, e) {
    var v = el.getAttribute('data-v');
    var id = el.getAttribute('data-id');
    var role = el.getAttribute('data-role') || v;
    switch (act) {
      case 'entry:role': loginAs(role); return;
      case 'role:menu': S.ui.roleMenu = !S.ui.roleMenu; render(); return;
      case 'role:switch':
        S.ui.roleMenu = false;
        if (role && role !== S.role) loginAs(role);
        else render();
        return;
      case 'logout': doLogout(); return;
      case 'theme:toggle':
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, S.theme); } catch (err) { /* 忽略 */ }
        render();
        return;
      case 'crisis:open': S.ui.crisis = true; render(); return;
      case 'crisis:close': S.ui.crisis = false; render(); return;
      case 'crisis:call':
        try { location.href = 'tel:12355'; } catch (err) { /* 忽略 */ }
        return;
      case 'alert:confirm':
        API.parents.confirmAlert(id).then(function (res) {
          if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
          delete S.data.parentAlert;
          toast('已记录，建议尽快与孩子沟通。', 'ok');
        });
        return;
      case 'reload': {
        var rk = el.getAttribute('data-key');
        load(rk, thunkFor(rk), true);
        render();
        return;
      }
      case 'app:how': openSheet({ kind: 'app' }); return;
      case 'mood:pick': S.draft.mood = Number(v) || 0; render(); return;
      case 'mood:tag': {
        var tag = el.getAttribute('data-tag');
        var arr = S.draft.moodTags || [];
        var at = arr.indexOf(tag);
        if (at >= 0) arr.splice(at, 1); else arr.push(tag);
        S.draft.moodTags = arr;
        render();
        return;
      }
      case 'mood:submit': submitMood(); return;
      case 'kb:cat':
        S.draft.kbCat = el.getAttribute('data-key') || '';
        delete S.data.kbResults;
        render();
        return;
      case 'kb:search': delete S.data.kbResults; render(); return;
      case 'kb:open': openSheet({ kind: 'article', id: id, wide: true }); return;
      case 'as:start':
        S.ui.answers = {};
        openSheet({ kind: 'assessment', type: el.getAttribute('data-type') || v, wide: true });
        return;
      case 'as:answer':
        S.ui.answers[el.getAttribute('data-qid')] = Number(v);
        render();
        return;
      case 'as:submit': submitAssessment(el.getAttribute('data-type')); return;
      case 'as:openResult': openSheet({ kind: 'result', id: id }); return;
      case 'post:new':
        S.draft.postTitle = '';
        S.draft.postContent = '';
        S.draft.postTags = [];
        S.draft.postUrgency = 'normal';
        openSheet({ kind: 'newPost', wide: true });
        return;
      case 'post:open': openSheet({ kind: 'post', id: id, wide: true }); return;
      case 'post:urgency': S.draft.postUrgency = v; render(); return;
      case 'post:tag': {
        var t2 = el.getAttribute('data-tag');
        var a2 = S.draft.postTags || [];
        var i2 = a2.indexOf(t2);
        if (i2 >= 0) a2.splice(i2, 1);
        else if (a2.length < 4) a2.push(t2);
        else { toast('最多选择 4 个标签', 'err'); return; }
        S.draft.postTags = a2;
        render();
        return;
      }
      case 'post:submit': submitPost(); return;
      case 'reply:submit': submitReply(id); return;
      case 'br:start': startBreathing(el.getAttribute('data-type') || v || '478'); return;
      case 'br:stop': stopBreathing(false); return;
      case 'filter:risk':
        S.ui.filterRisk = el.getAttribute('data-key') || 'all';
        render();
        return;
      case 'alert:open': openSheet({ kind: 'alert', id: id, wide: true }); return;
      case 'stu:open': openSheet({ kind: 'student', id: id }); return;
      case 'child:bind': bindChild(); return;
      case 'child:authorize': setAuthorize(id, el.getAttribute('data-on') === '1'); return;
      case 'child:unbind': unbindChild(id); return;
      case 'review:pick': S.draft.reviewPick = v; render(); return;
      case 'review:submit': submitReview(id); return;
      default: return;
    }
  }

  /* ========== 13. 事件绑定 ========== */

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (S.ui.roleMenu && !t.closest('.role-menu') && !t.closest('[data-act="role:menu"]')) {
      S.ui.roleMenu = false;
      render();
    }
    var el = t.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'sheet:none') return;
    if (act === 'sheet:close' && el.classList.contains('overlay') && e.target !== el) return;
    if (el.hasAttribute('disabled')) return;
    runAction(act, el, e);
  }

  function onInput(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var key = el.getAttribute('data-draft');
    if (!key) return;
    S.draft[key] = el.value;
  }

  function onKey(e) {
    if (e.key !== 'Enter') return;
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var act = el.getAttribute('data-enter');
    if (!act) return;
    e.preventDefault();
    runAction(act, el, e);
  }

  /* ========== 14. 呼吸练习 ========== */

  function beginBreath(ex) {
    var steps = ex.steps || [];
    if (!steps.length) { toast('练习数据缺失', 'err'); return; }
    S.ui.breathing = { idx: 0, left: Number(steps[0].duration) || 4 };
    render();
    startTimer(ex);
  }

  function startBreathing(type) {
    var box = d('breathing478');
    var ex = box && box.exercise;
    if (!ex || (ex.type && ex.type !== type)) {
      load('breathing478', function () { return API.content.breathing(type); }, true);
      setTimeout(function () {
        var b2 = d('breathing478');
        if (b2 && b2.exercise) beginBreath(b2.exercise);
      }, 600);
      return;
    }
    beginBreath(ex);
  }

  function startTimer(ex) {
    stopTimer();
    breathTimer = setInterval(function () {
      var b = S.ui.breathing;
      if (!b) { stopTimer(); return; }
      b.left = (Number(b.left) || 0) - 1;
      if (b.left <= 0) {
        b.idx += 1;
        if (b.idx >= (ex.steps || []).length) { stopBreathing(true); return; }
        b.left = Number(ex.steps[b.idx].duration) || 4;
      }
      render();
    }, 1000);
  }

  function stopTimer() {
    if (breathTimer) { clearInterval(breathTimer); breathTimer = null; }
  }

  function stopBreathing(done) {
    stopTimer();
    S.ui.breathing = null;
    render();
    if (done) toast('练习完成，感觉好些了吗？', 'ok');
  }

  /* ========== 15. 登录与启动 ========== */

  function loginAs(role) {
    if (!ROLES[role]) return;
    S.busy.login = true;
    render();
    API.auth.login({ role: role }).then(function (res) {
      S.busy.login = false;
      if (!res || !res.ok) { toast(errMsg(res), 'err'); render(); return; }
      var sess = (res.data && res.data.session) || res.data;
      if (sess && !sess.role) sess.role = role;
      S.session = sess;
      S.role = role;
      S.data = {};
      S.draft = {};
      S.busy = {};
      S.ui.sheet = null;
      S.ui.roleMenu = false;
      S.ui.crisis = false;
      S.ui.answers = {};
      S.ui.answerScale = null;
      go(ROLES[role].home);
    });
  }

  function boot() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') S.theme = saved;
    } catch (e) { /* 忽略 */ }
    var sess = API.auth.current();
    if (sess && ROLES[sess.role]) {
      S.session = sess;
      S.role = sess.role;
    }
    document.addEventListener('click', onClick, false);
    document.addEventListener('input', onInput, false);
    document.addEventListener('change', onInput, false);
    document.addEventListener('keydown', onKey, false);
    window.addEventListener('hashchange', onHash, false);
    onHash();
  }

  boot();
})();
