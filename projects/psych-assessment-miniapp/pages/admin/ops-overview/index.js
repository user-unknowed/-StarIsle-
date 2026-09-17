// pages/admin/ops-overview/index.js
// 超级管理员 · 全局监控 Dashboard（Task14 · 方案B 严格范围冻结）
// 功能：
//  1) KPI 4卡：
//     ① 今日全校预警总数（feedbackSubmit.listWarnings scope=global）
//     ② AI 今日成功/失败率（aiAnalyze.getBudgetStatus successRate+callCount/failedCount）
//     ③ 本月导出总数（taskOperate.listExports admin 全校）
//     ④ 教师审核通过率（feedbackSubmit.queryFeedbacks scope=all → (confirmed+adjusted)/totalReviewed）
//  2) 近 7 日全校预警趋势条形图（纯 WXML/WXSS · count/max × 180rpx）
//  3) 预警 TOP20（全匿名，点击 → 匿名化概览卡，0 PII）
//  4) 接口降级诚实性：4 接口任一失败 → applyMockFallback + 橙色演示 Banner

var cloud = require('../../../utils/cloud.js');

/* ========== 工具函数 ========== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function startOfMonth0() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); }
function startOfNDaysAgo(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); }
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

/* ========== 本地 Mock（仅接口失败时启用） ========== */
function buildMockData() {
  var today0 = startOfToday();
  var anon = ['#S000128', '#S000074', '#S000213', '#S000091', '#S000156', '#S000301', '#S000045', '#S000287', '#S000319', '#S000056'];
  var tags = ['自我否定', '失眠', '情绪低落', '自杀意念', '社交退缩', '惊恐发作', '食欲变化', '创伤信号', '自伤风险', '重度抑郁'];
  var warnings = [];
  for (var i = 0; i < 20; i++) {
    var ts = today0 - i * 1000 * 60 * 60 * (1 + Math.random() * 8);
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
      warningTags: wt,
      reviewStatus: statuses[Math.floor(Math.random() * statuses.length)]
    });
  }
  var dayCounts = [12, 7, 15, 9, 11, 18, 14];
  return {
    kpi: {
      todayWarnTotal: 14,
      aiSuccessRate: 92.6,
      monthExportCount: 37,
      reviewPassRate: 81.3
    },
    dayCounts: dayCounts,
    warnings: warnings
  };
}

/* ========== 页面 ========== */
Page({
  data: {
    // 诚实降级：演示数据横幅
    usingMockData: false,

    // KPI 4 卡
    kpiTodayWarnTotal: 0,
    kpiAiSuccessRate: 0,   // 百分比字符串（如 92.6%）
    kpiAiSuccessRateNum: 0,
    kpiMonthExportCount: 0,
    kpiReviewPassRate: 0,  // 百分比字符串
    kpiReviewPassRateNum: 0,

    loadingKpi: true,

    // 近 7 日趋势
    dayBars: [],
    dayMaxCount: 0,
    loadingTrend: true,

    // 预警 TOP20
    warningList: [],
    warningsTotal: 0,
    loadingWarnings: true,

    // 详情匿名弹窗（0 PII）
    anonModalOpen: false,
    anonModalData: null,

    errorMsg: '',
    emptyState: false
  },

  onLoad: function () { this.refreshAll(); },
  onShow: function () { /* pass */ },
  onPullDownRefresh: function () {
    var that = this;
    this.refreshAll(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  /** 4 接口并行拉取 · 全部 Promise 安全兜底（不 reject） */
  refreshAll: function (done) {
    var that = this;
    that.setData({
      usingMockData: false,
      loadingKpi: true, loadingTrend: true, loadingWarnings: true,
      errorMsg: '', emptyState: false
    });

    Promise.all([
      that.callSafe('feedbackSubmit', { action: 'listWarnings', scope: 'global', pageSize: 200 }, 'listWarnings_global'),
      that.callSafe('aiAnalyze', { action: 'getBudgetStatus' }, 'getBudgetStatus'),
      that.callSafe('taskOperate', { action: 'listExports', scope: 'all' }, 'listExports_all'),
      that.callSafe('feedbackSubmit', {
        action: 'queryFeedbacks',
        scope: 'all',
        filter: { reviewStatus_in: ['confirmed', 'adjusted', 'pending_review'] },
        pageSize: 500
      }, 'queryFeedbacks_allReviewed')
    ]).then(function (results) {
      var rWarn = results[0] || {};   // 今日预警 + 7 日 + TOP20
      var rAI = results[1] || {};     // AI 预算 / 成功率
      var rExp = results[2] || {};    // 本月导出
      var rRev = results[3] || {};    // 教师审核通过率

      // 严格判定：每个接口真的成功吗？
      var warnOk = !!(rWarn && rWarn.code === 0);
      var aiOk = !!(rAI && rAI.code === 0);
      var expOk = !!(rExp && rExp.code === 0);
      var revOk = !!(rRev && rRev.code === 0);
      var allOk = warnOk && aiOk && expOk && revOk;

      var warnList = (warnOk && Array.isArray(rWarn.list)) ? rWarn.list.slice() : [];
      var exportList = (expOk && Array.isArray(rExp.list)) ? rExp.list.slice() : [];
      var revList = (revOk && Array.isArray(rRev.list)) ? rRev.list.slice() : [];

      // ===== KPI 1: 今日全校预警总数 =====
      var d0 = startOfToday();
      var todayWarn = 0;
      warnList.forEach(function (w) { if ((Number(w.submitTime) || 0) >= d0) todayWarn++; });
      if (!warnOk) todayWarn = 0;

      // ===== KPI 2: AI 今日成功/失败率 =====
      var aiRateNum = 0;
      if (aiOk) {
        var callCount = Number(rAI.callCount) || 0;
        var failedCount = Number(rAI.failedCount) || 0;
        var succRate = Number(rAI.successRate);
        if (typeof succRate === 'number' && !isNaN(succRate)) {
          aiRateNum = succRate;
        } else if (callCount > 0) {
          aiRateNum = Math.max(0, Math.min(100, ((callCount - failedCount) / callCount) * 100));
        }
      }

      // ===== KPI 3: 本月导出总数 =====
      var month0 = startOfMonth0();
      var monthExpCount = 0;
      exportList.forEach(function (ex) {
        var t = Number(ex.createdAt || ex.exportAt || 0);
        if (t >= month0) monthExpCount++;
      });
      if (!expOk) monthExpCount = 0;

      // ===== KPI 4: 教师审核通过率 =====
      var passRateNum = 0;
      if (revOk) {
        var totalReviewed = 0, passed = 0;
        revList.forEach(function (r) {
          var rs = (r.teacherReview && r.teacherReview.reviewStatus) || r.reviewStatus || '';
          if (rs === 'confirmed' || rs === 'adjusted') { totalReviewed++; passed++; }
          else if (rs === 'pending_review' || rs === 'rejected') { totalReviewed++; }
        });
        if (totalReviewed > 0) passRateNum = (passed / totalReviewed) * 100;
      }

      // ===== 近 7 日趋势（基于 listWarnings） =====
      var dayCounts = [0, 0, 0, 0, 0, 0, 0];
      var d7 = startOfNDaysAgo(6);
      warnList.forEach(function (w) {
        var ts = Number(w.submitTime) || 0;
        if (ts < d7 || ts > (d0 + 86400000)) return;
        var dayIdx = Math.floor((ts - d7) / 86400000);
        if (dayIdx < 0 || dayIdx > 6) return;
        dayCounts[dayIdx] = (dayCounts[dayIdx] || 0) + 1;
      });
      var bars = that.buildDayBars(dayCounts);

      // ===== 预警 TOP20 视图 =====
      var viewWarnings = that.buildWarningsView(warnList);

      var isEmpty = (todayWarn === 0) && bars.max === 0 && (viewWarnings.length === 0)
        && (aiRateNum === 0) && (monthExpCount === 0) && (passRateNum === 0);

      that.setData({
        kpiTodayWarnTotal: todayWarn,
        kpiAiSuccessRateNum: +(aiRateNum.toFixed(1)),
        kpiAiSuccessRate: (aiRateNum.toFixed(1)) + '%',
        kpiMonthExportCount: monthExpCount,
        kpiReviewPassRateNum: +(passRateNum.toFixed(1)),
        kpiReviewPassRate: (passRateNum.toFixed(1)) + '%',
        dayBars: bars.bars,
        dayMaxCount: bars.max,
        warningList: viewWarnings,
        warningsTotal: (rWarn && typeof rWarn.count === 'number') ? rWarn.count : warnList.length,
        loadingKpi: false, loadingTrend: false, loadingWarnings: false,
        emptyState: isEmpty
      });

      // ===== 诚实降级：任一接口未真正成功 → 显式启用 Mock =====
      if (!allOk || isEmpty) {
        that.applyMockFallback();
      }
      done && done();
    }).catch(function (err) {
      console.warn('[ops-overview] refreshAll catch:', err);
      that.setData({
        loadingKpi: false, loadingTrend: false, loadingWarnings: false,
        errorMsg: (err && err.msg) || '加载失败，请下拉刷新',
        emptyState: true
      });
      that.applyMockFallback();
      done && done();
    });
  },

  /** 构造 7 day-bars 数组（等价 Task7 公式：count_i/maxCount × 180rpx） */
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
    var arr = warnings.slice().sort(function (a, b) {
      return (Number(b.submitTime) || 0) - (Number(a.submitTime) || 0);
    }).slice(0, 20);
    return arr.map(function (w) {
      var tags = []; var seen = {};
      var source = (w.warningTags || w.aiWarningTags || []).concat(w.confirmedWarningTags || []);
      source.forEach(function (t) { if (!seen[t]) { seen[t] = true; tags.push(t); } });
      var rs = w.reviewStatus || 'pending_review';
      return {
        _id: w._id || String(w.submitTime || Math.random()),
        studentAnonymousNo: w.studentAnonymousNo || '#S000000',
        submitTimeText: formatDateTime(w.submitTime),
        warningTags: tags,
        reviewStatus: rs,
        reviewPillClass: reviewPillClass(rs),
        reviewPillText: reviewPillText(rs)
      };
    });
  },

  /** 显式启用 Mock（诚实性：绝不伪造通路已通） */
  applyMockFallback: function () {
    var that = this;
    var mock = buildMockData();
    var bars = that.buildDayBars(mock.dayCounts);
    var viewWarns = that.buildWarningsView(mock.warnings);
    that.setData({
      usingMockData: true,
      kpiTodayWarnTotal: mock.kpi.todayWarnTotal,
      kpiAiSuccessRateNum: mock.kpi.aiSuccessRate,
      kpiAiSuccessRate: mock.kpi.aiSuccessRate + '%',
      kpiMonthExportCount: mock.kpi.monthExportCount,
      kpiReviewPassRateNum: mock.kpi.reviewPassRate,
      kpiReviewPassRate: mock.kpi.reviewPassRate + '%',
      dayBars: bars.bars,
      dayMaxCount: bars.max,
      warningList: viewWarns,
      warningsTotal: mock.warnings.length,
      loadingKpi: false, loadingTrend: false, loadingWarnings: false,
      emptyState: false
    });
  },

  /** 云函数调用安全包装：永远 resolve，绝不 throw */
  callSafe: function (fnName, payload, tag) {
    return new Promise(function (resolve) {
      cloud.call(fnName, payload)
        .then(function (r) { resolve(r || { code: -1 }); })
        .catch(function (e) {
          console.warn('[ops-overview][' + tag + '] 异常:', e && e.msg);
          resolve({ code: 900, msg: (e && e.msg) || '调用失败' });
        });
    });
  },

  /* ====== 预警卡片点击 → 匿名化概览弹窗（0 PII） ====== */
  onWarningTap: function (e) {
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    var item = null;
    for (var i = 0; i < this.data.warningList.length; i++) {
      if (this.data.warningList[i]._id === id) { item = this.data.warningList[i]; break; }
    }
    if (!item) return;
    this.setData({
      anonModalOpen: true,
      anonModalData: {
        studentAnonymousNo: item.studentAnonymousNo,
        warningTags: item.warningTags,
        submitTimeText: item.submitTimeText,
        reviewPillText: item.reviewPillText,
        reviewPillClass: item.reviewPillClass
      }
    });
  },
  onCloseAnonModal: function () { this.setData({ anonModalOpen: false, anonModalData: null }); },
  _noop: function () {}
});
