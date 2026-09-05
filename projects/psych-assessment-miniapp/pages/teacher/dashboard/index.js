// pages/teacher/dashboard/index.js
// 教师端 Dashboard（严格范围冻结 · Task7）
// 功能：
//  1) KPI 4卡：今日预警 / 7日累计预警 / 待审核AI / 本人范围学生数
//  2) 7 日预警趋势条形图（纯 WXML + WXSS · day-bar 百分比）
//  3) 预警列表 TOP20（listWarnings 取前 20 · 红胶囊 · reviewStatus 三色 · 详情弹窗）
//  4) 顶部筛选器：全部范围 / 班级 / 特殊绑定一对一
//  5) 合规：PII sanitizeRow 兜底，只渲染 anonymousNo (#Sxxxxxx / #Txxx)
//
// ⚠️ 降级诚实性：
//   - 任一云函数接口 400/403/空列表 → 顶部橙色横幅显式提示「演示数据，未从云端拉取」
//     + 启用本地 Mock 占位数据，绝不伪造"云端通路已通"。
//   - 7 日趋势 / KPI：若 listWarnings 返回空，用 queryFeedbacks 的 7 日列表 + 本地
//     filter warning_tags 长度>0 降级计数；仍空→Mock。

var cloud = require('../../../utils/cloud.js');

/* ========== 工具函数 ========== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function startOfToday() {
  var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
}
function startOfNDaysAgo(n) {
  var d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n); return d.getTime();
}
function formatDateTime(ts) {
  if (!ts) return '';
  var d = new Date(Number(ts) || 0);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function formatDateMD(ts) {
  var d = new Date(Number(ts) || 0);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

/* reviewStatus → 胶囊 */
function reviewPillClass(s) {
  if (s === 'confirmed') return 'pill-confirmed';
  if (s === 'adjusted') return 'pill-adjusted';
  if (s === 'pending_review') return 'pill-pending-review';
  if (s === 'ai_failed') return 'pill-ai-failed';
  return 'pill-gray';
}
function reviewPillText(s) {
  if (s === 'confirmed') return '已确认';
  if (s === 'adjusted') return '已调整';
  if (s === 'pending_review') return '待审核';
  if (s === 'ai_failed') return 'AI失败';
  return '未知';
}

/** 安全 PII 清洗：绝不渲染 teacherName / 姓名 / phone / 证号 / school */
var PII_FORBIDDEN = [
  'studentName', 'name', 'nickname', 'teacherName', 'teacherPhone',
  'phone', 'studentPhone', 'teacherSchool', 'school', 'className',
  'grade', '手机号', '真名', '真实姓名', '学生姓名', '班级',
  'openid', 'unionid', 'teacherCertNo', 'teacherCertHash'
];
function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  PII_FORBIDDEN.forEach(function (k) { if (k in row) delete row[k]; });
  if (row.teacherReview && typeof row.teacherReview === 'object') {
    PII_FORBIDDEN.forEach(function (k) {
      if (k in row.teacherReview) delete row.teacherReview[k];
    });
  }
  if (row.task && typeof row.task === 'object') {
    PII_FORBIDDEN.forEach(function (k) { if (k in row.task) delete row.task[k]; });
  }
  return row;
}

/** 班级名脱敏（任务要求 className 不可显），用 "匿名班级 · 邀请码后4位" 替代 */
function maskClassOption(c) {
  var invite = (c.inviteCode || '****').slice(-4);
  var count = typeof c.countStudentIds === 'number' ? c.countStudentIds : 0;
  return '匿名班级 · ' + invite + '（' + count + '人）';
}

/* ========== 本地 Mock 数据（仅接口失败时启用） ========== */
function buildMockDashboard() {
  var today0 = startOfToday();
  var warnings = [];
  var anon = ['#S000128', '#S000074', '#S000213', '#S000091', '#S000156', '#S000301', '#S000045'];
  var tags = ['自我否定', '失眠', '情绪低落', '自杀意念', '社交退缩', '惊恐发作', '食欲变化'];
  for (var i = 0; i < 12; i++) {
    var ts = today0 - i * 1000 * 60 * 60 * (2 + Math.random() * 6);
    var tagN = 1 + Math.floor(Math.random() * 3);
    var wt = [];
    for (var k = 0; k < tagN; k++) {
      var t = tags[Math.floor(Math.random() * tags.length)];
      if (wt.indexOf(t) < 0) wt.push(t);
    }
    var statuses = ['pending_review', 'pending_review', 'confirmed', 'adjusted', 'ai_failed'];
    warnings.push({
      _id: 'mock-' + i,
      studentAnonymousNo: anon[i % anon.length],
      submitTime: ts,
      aiWarningTags: wt,
      confirmedWarningTags: [],
      reviewStatus: statuses[Math.floor(Math.random() * statuses.length)],
      summaryPreview: (i % 2 === 0)
        ? '近期睡眠质量下降，频繁惊醒，白天无法集中注意力…'
        : '感觉被孤立，没人理解我的感受，不想说话…'
    });
  }
  // 7 日趋势 Mock
  var dayCounts = [8, 5, 12, 7, 9, 14, 6];
  return {
    kpi: { todayWarn: dayCounts[6], week7Warn: 61, pendingAi: 11, studentCount: 87 },
    dayCounts: dayCounts,
    warnings: warnings
  };
}

/* ========== 页面 ========== */
Page({
  data: {
    // 顶部提示：是否使用演示数据
    usingMockData: false,
    // KPI 4 卡
    kpiTodayWarn: 0,
    kpiWeek7Warn: 0,
    kpiPendingAi: 0,
    kpiStudentCount: 0,
    // 范围下拉
    scopeOptions: [],
    scopeIndex: 0,
    currentScope: null,
    // 7 日趋势条形图（day-bars 纯 WXML）
    dayBars: [],       // [{ dateLabel, count, heightRpx }]
    dayMaxCount: 0,
    // 预警列表 TOP20
    warningList: [],
    warningsTotal: 0,
    // 详情弹窗
    detailModalOpen: false,
    detailLoading: false,
    detailData: null,
    // 加载 / 空态
    loadingAll: true,
    loadingKpi: true,
    loadingWarnings: true,
    loadingDetail: false,
    errorMsg: '',
    emptyState: false
  },

  onLoad: function () { this.initAll(); },
  onShow: function () {
    if (this.data.currentScope) this.refreshKpiWarningsTrend();
  },
  onPullDownRefresh: function () {
    var that = this;
    this.initAll(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  /* ========== 初始化 ========== */
  initAll: function (done) {
    var that = this;
    that.setData({
      loadingAll: true, loadingKpi: true, loadingWarnings: true,
      errorMsg: '', emptyState: false, usingMockData: false,
      detailModalOpen: false, detailData: null
    });
    // 并行：scopeOptions + studentCount（queryMyStudentIds）
    Promise.all([
      that.loadScopeOptionsAsync(),
      that.callFeedbackSubmit({ action: 'queryMyStudentIds' }, 'queryMyStudentIds')
    ]).then(function (res) {
      var opts = res[0].opts;
      var st = res[0].status; // 'ok' | 'fallback'
      var stuRes = res[1] || {};
      var studentCount = 0;
      if (stuRes && stuRes.code === 0 && Array.isArray(stuRes.studentIds)) {
        studentCount = stuRes.studentIds.length;
      }
      that.setData({
        scopeOptions: opts,
        scopeIndex: 0,
        currentScope: (opts[0] || null),
        kpiStudentCount: studentCount
      });
      // 若 scope 加载失败或 studentIds 失败 → 进入 mock 模式
      var baseOk = (st === 'ok') && (stuRes && stuRes.code === 0);
      that.refreshKpiWarningsTrend(function () {
        that.setData({ loadingAll: false });
        // 如果最终列表空 + 此前任意基础接口非 ok → 显式启用演示数据
        if (!baseOk || that.data.warningList.length === 0 && that.data.dayBars.every(function (d) { return d.count === 0; })) {
          if (!baseOk) {
            that.applyMockFallback();
          }
        }
        done && done();
      }, /*passThrough baseOk*/ baseOk);
    });
  },

  /* 接口失败 → 显式启用演示数据 + 顶部橙色横幅提示 */
  applyMockFallback: function () {
    var that = this;
    var mock = buildMockDashboard();
    var bars = that.buildDayBars(mock.dayCounts);
    var viewWarns = that.buildWarningsView(mock.warnings);
    that.setData({
      usingMockData: true,
      kpiTodayWarn: mock.kpi.todayWarn,
      kpiWeek7Warn: mock.kpi.week7Warn,
      kpiPendingAi: mock.kpi.pendingAi,
      kpiStudentCount: that.data.kpiStudentCount || mock.kpi.studentCount,
      dayBars: bars.bars,
      dayMaxCount: bars.max,
      warningList: viewWarns,
      warningsTotal: mock.warnings.length,
      loadingKpi: false,
      loadingWarnings: false,
      emptyState: false
    });
  },

  /* ========== scope 下拉 ========== */
  loadScopeOptionsAsync: function () {
    var that = this;
    return new Promise(function (resolve) {
      cloud.call('classOperate', { action: 'listMyClasses' })
        .then(function (rCls) {
          var classes = [];
          if (rCls && rCls.code === 0 && Array.isArray(rCls.data)) classes = rCls.data;
          else if (Array.isArray(rCls)) classes = rCls;
          var opts = [{ value: 'all', label: '全部范围', type: 'all', scopeId: null }];
          (classes || []).forEach(function (c) {
            opts.push({
              value: 'class_' + (c._id || ''),
              label: maskClassOption(c),
              type: 'class',
              scopeId: c._id || null
            });
          });
          // 读 bindings（若失败不阻塞）
          cloud.call('classOperate', { action: 'listMyBindings' })
            .then(function (rBin) {
              var bindings = [];
              if (rBin && rBin.code === 0 && Array.isArray(rBin.data)) bindings = rBin.data;
              else if (Array.isArray(rBin)) bindings = rBin;
              (bindings || []).forEach(function (b) {
                var anon = b.studentAnonymousNo || '#S000000';
                var label = '一对一绑定 ' + anon + (b.validUntil ? '（已失效）' : '');
                opts.push({
                  value: 'binding_' + (b._id || ''),
                  label: label, type: 'binding', scopeId: b._id || null
                });
              });
              resolve({ opts: opts, status: 'ok' });
            })
            .catch(function () { resolve({ opts: opts, status: 'ok' }); });
        })
        .catch(function (e) {
          var opts = [{ value: 'all', label: '全部范围（班级接口未就绪）', type: 'all', scopeId: null }];
          resolve({ opts: opts, status: 'fallback' });
        });
    });
  },

  onScopeChange: function (e) {
    var idx = Number(e.detail.value);
    var opts = this.data.scopeOptions;
    if (idx < 0 || idx >= opts.length) return;
    this.setData({ scopeIndex: idx, currentScope: opts[idx] });
    // 切换范围后：退出演示数据模式，重新拉云端
    this.setData({ usingMockData: false });
    this.refreshKpiWarningsTrend();
  },

  /* ========== 核心加载：KPI + 趋势 + TOP20 ========== */
  refreshKpiWarningsTrend: function (done, baseOkFromInit) {
    var that = this;
    var scope = that.data.currentScope || { type: 'all', scopeId: null };
    var qScope = 'all', qScopeId = null;
    if (scope.type === 'class') { qScope = 'class'; qScopeId = scope.scopeId; }
    if (scope.type === 'binding') { qScope = 'binding'; qScopeId = scope.scopeId; }

    that.setData({
      loadingKpi: true, loadingWarnings: true,
      errorMsg: '', emptyState: false
    });

    var d0 = startOfToday();
    var d7 = startOfNDaysAgo(6); // 包含今天共 7 天

    // 并行：listWarnings(top50 → top20 显示) + queryFeedbacks(7日全量 → 本地计数 kpi/趋势)
    Promise.all([
      that.callFeedbackSubmit({
        action: 'queryFeedbacks',
        scope: qScope, scopeId: qScopeId,
        filter: { startTime: d7 },
        pageSize: 500, pageToken: null
      }, 'queryFeedbacks 7d'),
      that.callFeedbackSubmit({ action: 'listWarnings' }, 'listWarnings top50')
    ]).then(function (results) {
      var fb7 = results[0] || {};
      var wRes = results[1] || {};

      // ====== 接口是否真的成功：严格要求 code===0 + 数组存在 ======
      var fbOk = !!(fb7 && fb7.code === 0 && Array.isArray(fb7.list));
      var wOk = !!(wRes && wRes.code === 0 && Array.isArray(wRes.list));
      var rows7 = fbOk ? fb7.list.slice() : [];
      var warn50 = wOk ? wRes.list.slice() : [];
      rows7.forEach(sanitizeRow); warn50.forEach(sanitizeRow);

      // ====== 7 日趋势数组：按天汇总 warning_tags.length>0 的条数 ======
      var dayCounts = [0, 0, 0, 0, 0, 0, 0];
      // 用 warn50 补：它的范围是"全部本人范围"，我们按 filter 的 scope 过滤尽量准确
      // 简化：主数据用 rows7；若 rows7 空，则用 warn50 作降级基准
      var baseArr = (rows7.length > 0) ? rows7 : warn50;
      baseArr.forEach(function (r) {
        var ts = Number(r.submitTime) || 0;
        if (ts < d7 || ts > (d0 + 86400000)) return;
        // warning_tags 或 confirmedWarningTags 长度>0 → 记为当日预警
        var aiT = (r.aiAnalysis && r.aiAnalysis.warning_tags) || [];
        var cfT = (r.teacherReview && r.teacherReview.confirmedWarningTags) || [];
        if (aiT.length + cfT.length === 0) return;
        var dayIdx = Math.floor((ts - d7) / 86400000);
        if (dayIdx < 0 || dayIdx > 6) return;
        dayCounts[dayIdx] = (dayCounts[dayIdx] || 0) + 1;
      });

      // ====== KPI 4 卡 ======
      var todayWarn = dayCounts[6] || 0;
      var week7Warn = dayCounts.reduce(function (s, v) { return s + (v || 0); }, 0);
      // 待审核 AI：teacherReview.reviewStatus==='pending_review'
      var pendingCnt = 0;
      (rows7.length ? rows7 : warn50).forEach(function (r) {
        var rs = (r.teacherReview && r.teacherReview.reviewStatus) || '';
        if (rs === 'pending_review') pendingCnt++;
      });
      // studentCount 已在 initAll 用 queryMyStudentIds 写入；保留不变

      // ====== 预警 TOP20 ======
      var finalWarns = warn50.slice();
      if (finalWarns.length === 0) {
        // 降级：rows7 中本地过滤
        finalWarns = rows7.filter(function (r) {
          var aiT = (r.aiAnalysis && r.aiAnalysis.warning_tags) || [];
          var cfT = (r.teacherReview && r.teacherReview.confirmedWarningTags) || [];
          var rs = (r.teacherReview && r.teacherReview.reviewStatus) || '';
          return aiT.length > 0 || cfT.length > 0 || rs === 'pending_review' || r.status === 'ai_failed';
        }).map(function (r) {
          return {
            _id: r._id,
            studentAnonymousNo: r.studentAnonymousNo || '#S000000',
            submitTime: r.submitTime,
            aiWarningTags: (r.aiAnalysis && r.aiAnalysis.warning_tags) || [],
            confirmedWarningTags: (r.teacherReview && r.teacherReview.confirmedWarningTags) || [],
            reviewStatus: (r.teacherReview && r.teacherReview.reviewStatus) || 'pending_review',
            summaryPreview: r.previewText ? String(r.previewText).slice(0, 40) : '',
            status: r.status || ''
          };
        });
      }

      var bars = that.buildDayBars(dayCounts);
      var viewWarns = that.buildWarningsView(finalWarns);
      var isEmpty = (week7Warn === 0) && (viewWarns.length === 0) && (pendingCnt === 0);

      that.setData({
        kpiTodayWarn: todayWarn,
        kpiWeek7Warn: week7Warn,
        kpiPendingAi: pendingCnt,
        // kpiStudentCount 保持 initAll 的 queryMyStudentIds 结果
        dayBars: bars.bars,
        dayMaxCount: bars.max,
        warningList: viewWarns,
        warningsTotal: (wRes && typeof wRes.count === 'number') ? wRes.count : viewWarns.length,
        loadingKpi: false,
        loadingWarnings: false,
        emptyState: isEmpty
      });

      // ====== 诚实降级：若接口未返回真实数据 → 显式用 Mock + 横幅"演示数据，未从云端拉取" ======
      var realData = (fbOk || wOk) && (rows7.length > 0 || warn50.length > 0);
      if (!realData && (baseOkFromInit !== true)) {
        that.applyMockFallback();
      }
      done && done();
    }).catch(function (err) {
      that.setData({
        loadingKpi: false, loadingWarnings: false,
        errorMsg: (err && err.msg) ? err.msg : '加载失败，请下拉刷新',
        emptyState: true
      });
      if (baseOkFromInit !== true) that.applyMockFallback();
      done && done();
    });
  },

  /** 构造 7 day-bars 数组（纯 WXML/WXSS 条形图，按 maxCount 百分比） */
  buildDayBars: function (dayCounts) {
    var max = 0;
    for (var i = 0; i < 7; i++) if ((dayCounts[i] || 0) > max) max = dayCounts[i] || 0;
    if (max < 1) max = 1;
    var bars = [];
    var d7 = startOfNDaysAgo(6);
    for (var i = 0; i < 7; i++) {
      var c = dayCounts[i] || 0;
      var h = Math.max(4, Math.round((c / max) * 180));
      bars.push({
        dateLabel: formatDateMD(d7 + i * 86400000),
        count: c,
        heightRpx: h + 'rpx'
      });
    }
    return { bars: bars, max: max };
  },

  buildWarningsView: function (warnings) {
    var out = warnings.slice(0, 20).map(function (w) {
      var mergedTags = [];
      var seen = {};
      ((w.aiWarningTags || []).concat(w.confirmedWarningTags || [])).forEach(function (t) {
        if (!seen[t]) { seen[t] = true; mergedTags.push(t); }
      });
      var rs = w.reviewStatus || 'pending_review';
      return {
        _id: w._id,
        studentAnonymousNo: w.studentAnonymousNo || '#S000000',
        submitTimeText: formatDateTime(w.submitTime),
        warningTags: mergedTags,
        reviewStatus: rs,
        reviewPillClass: reviewPillClass(rs),
        reviewPillText: reviewPillText(rs),
        summaryPreview: w.summaryPreview || ''
      };
    });
    return out;
  },

  /** feedbackSubmit 调用兜底：永远不 throw，确保 Promise.all 不中断 */
  callFeedbackSubmit: function (payload, tag) {
    return new Promise(function (resolve) {
      cloud.call('feedbackSubmit', payload)
        .then(function (r) {
          if (!r) return resolve({ code: -1, list: [] });
          if (r.code === 0) return resolve(r);
          console.warn('[dashboard][' + tag + '] code!=0 降级空:', r.code, r.msg);
          resolve(Object.assign({ code: r.code || -1, list: [], msg: r.msg || '' }, r));
        })
        .catch(function (e) {
          console.warn('[dashboard][' + tag + '] 异常降级空:', e && e.msg);
          resolve({ code: 900, list: [], msg: (e && e.msg) || '' });
        });
    });
  },

  /* ========== 预警详情弹窗（云函数 getFeedbackDetail） ========== */
  onWarningViewDetail: function (e) {
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ detailModalOpen: true, detailLoading: true, detailData: null });
    var that = this;
    that.callFeedbackSubmit({ action: 'getFeedbackDetail', feedbackId: id }, 'getFeedbackDetail')
      .then(function (r) {
        if (r && r.code === 0 && r._id) {
          var d = sanitizeRow(JSON.parse(JSON.stringify(r)));
          // 展示字段渲染
          var view = {
            _id: d._id,
            studentAnonymousNo: d.studentAnonymousNo || '#S000000',
            submitTimeText: formatDateTime(d.submitTime),
            taskTitle: (d.task && d.task.title) ? String(d.task.title).slice(0, 24) : '（未命名任务）',
            aiSummary: (d.aiAnalysis && d.aiAnalysis.summary) || '',
            aiWarningTags: (d.aiAnalysis && d.aiAnalysis.warning_tags) || [],
            confirmedWarningTags: (d.teacherReview && d.teacherReview.confirmedWarningTags) || [],
            reviewStatus: (d.teacherReview && d.teacherReview.reviewStatus) || 'pending_review',
            reviewPillText: reviewPillText((d.teacherReview && d.teacherReview.reviewStatus) || 'pending_review'),
            reviewPillClass: reviewPillClass((d.teacherReview && d.teacherReview.reviewStatus) || 'pending_review'),
            reviewedByAnonymousNo: (d.teacherReview && d.teacherReview.reviewedByAnonymousNo) || '',
            previewTexts: (d.imageFeedbacks || []).map(function (f, i) {
              return { idx: i + 1, text: (f.text || '').slice(0, 120) };
            })
          };
          // 合并 tags
          var seen = {}; var mt = [];
          view.aiWarningTags.concat(view.confirmedWarningTags).forEach(function (t) {
            if (!seen[t]) { seen[t] = true; mt.push(t); }
          });
          view.mergedTags = mt;
          that.setData({ detailLoading: false, detailData: view });
        } else {
          that.setData({
            detailLoading: false,
            detailData: {
              _id: id,
              errorMsg: (r && r.msg) ? r.msg : '详情加载失败（范围越权或反馈不存在）'
            }
          });
        }
      });
  },
  onCloseDetail: function () {
    this.setData({ detailModalOpen: false, detailData: null, detailLoading: false });
  },

  /** 点击预警卡片 → 打开详情弹窗（Task7 要求：弹窗，不跳页） */
  onWarningTap: function (e) {
    this.onWarningViewDetail(e);
  },

  /** 阻止弹层内冒泡 */
  _noop: function () {}
});
