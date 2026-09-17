// pages/admin/audit-ai/index.js
// Task15 AI 端质量监控 Dashboard（独占 4 文件：index.js/json/wxml/wxss）
// 调用：aiAnalyze 云函数 dispatch（动作 manualRerun / getBudgetStatus / getQueueStats）
// 接口未就绪时 usingMockData=true 走本地 Mock 演示，顶部橙色 Banner 诚实提示

var cloud = require('../../../utils/cloud.js');

var FAILURE_CATEGORIES = ['timeout', 'bad_gateway', 'quota_exceeded', 'invalid_schema', 'ms_violation', '其他'];
var PIE_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#6B7280'];
var SCORE_DIMS = ['depression', 'anxiety', 'stress', 'wellBeing', 'resilience'];

// ---------- Mock 数据工厂 ----------
function buildMockBudget() {
  var monthlyBudget = 2000000;
  var used = Math.floor(monthlyBudget * 0.72); // 72% 展示用
  return {
    code: 0,
    data: {
      status: 'normal',
      totalTokensUsed: used,
      usedPct: used / monthlyBudget,
      monthlyBudget: monthlyBudget,
      tokenLeft: monthlyBudget - used,
      callCount: 328,
      failedCount: 9,
      successRate: 0.9726
    }
  };
}

function buildMockLast7Days() {
  var labels = [];
  var today = new Date();
  for (var i = 6; i >= 0; i--) {
    var d = new Date(today.getTime() - i * 24 * 3600 * 1000);
    labels.push(String(d.getMonth() + 1) + '/' + String(d.getDate()));
  }
  return [
    { label: labels[0], success: 42, failed: 3 },
    { label: labels[1], success: 55, failed: 2 },
    { label: labels[2], success: 38, failed: 6 },
    { label: labels[3], success: 61, failed: 1 },
    { label: labels[4], success: 47, failed: 4 },
    { label: labels[5], success: 53, failed: 2 },
    { label: labels[6], success: 32, failed: 1 }
  ];
}

function buildMockFailures() {
  var reasons = ['timeout', 'bad_gateway', 'quota_exceeded', 'invalid_schema', 'ms_violation', 'timeout'];
  var msLabels = ['', '', '', '', '政治敏感', ''];
  var out = [];
  for (var i = 0; i < 8; i++) {
    var id = 'fb_' + Math.random().toString(36).slice(2, 10) + 'A1B2C3D4';
    var rIdx = i % reasons.length;
    out.push({
      feedbackId: id,
      feedbackIdShort: id.slice(-8),
      failureReason: reasons[rIdx] + ': upstream request timed out after 30s at model endpoint',
      failureReasonShort: (reasons[rIdx] + ': upstream request timed out after 30s at model endpoint').slice(0, 28) + '…',
      msSecHitLabel: msLabels[rIdx] || '',
      retryCount: Math.floor(Math.random() * 4),
      createdAt: new Date(Date.now() - i * 3600 * 1000).toLocaleString('zh-CN', { hour12: false })
    });
  }
  return out;
}

function buildMockAvgLatency() {
  return 2380; // ms
}

function buildMockFailurePie() {
  return [
    { key: 'timeout', count: 12, color: PIE_COLORS[0] },
    { key: 'bad_gateway', count: 5, color: PIE_COLORS[1] },
    { key: 'quota_exceeded', count: 3, color: PIE_COLORS[2] },
    { key: 'invalid_schema', count: 4, color: PIE_COLORS[3] },
    { key: 'ms_violation', count: 2, color: PIE_COLORS[4] },
    { key: '其他', count: 2, color: PIE_COLORS[5] }
  ];
}

function buildMockDivergenceTop10() {
  var rows = [];
  for (var i = 0; i < 7; i++) {
    var div = 28 + Math.floor(Math.random() * 30); // 28-58
    var fbId = 'fb_' + Math.random().toString(36).slice(2, 10) + 'E5F6G7H8';
    var aiScores = [], teacherScores = [];
    for (var d = 0; d < 5; d++) {
      var base = 3 + Math.floor(Math.random() * 6);
      var diff = Math.floor(Math.random() * 4) + 1;
      var sign = Math.random() > 0.5 ? 1 : -1;
      aiScores.push(base);
      teacherScores.push(Math.max(0, Math.min(10, base + sign * diff)));
    }
    rows.push({
      feedbackId: fbId,
      feedbackIdShort: fbId.slice(-8),
      studentAnonymousNo: 'S' + String(2025000 + i),
      divergence: div,
      divergenceColor: div >= 40 ? '#EF4444' : '#F59E0B',
      aiScores: aiScores,
      teacherScores: teacherScores,
      dimLabels: SCORE_DIMS.slice()
    });
  }
  rows.sort(function (a, b) { return b.divergence - a.divergence; });
  return rows;
}

// ---------- 工具 ----------
function safeNum(v, d) {
  if (typeof v === 'number' && isFinite(v)) return v;
  return d;
}

function gaugeColorFor(usedPct) {
  if (usedPct < 0.80) return '#10B981'; // 绿
  if (usedPct < 0.95) return '#F59E0B'; // 黄
  return '#EF4444'; // 红
}

function budgetAlertInfo(usedPct) {
  if (usedPct < 0.80) return { status: 'normal', text: 'Token 用量正常', color: '#10B981', bg: '#D1FAE5' };
  if (usedPct < 0.95) return { status: 'warning', text: '⚠️ 已用 80%，建议控制 AI 调用量', color: '#B45309', bg: '#FEF3C7' };
  return { status: 'critical', text: '🔴 已超 95%，建议停止大任务或升级预算', color: '#991B1B', bg: '#FEE2E2' };
}

function successRateColorBorder(sr) {
  if (sr >= 0.95) return '#10B981';
  if (sr >= 0.85) return '#F59E0B';
  return '#EF4444';
}

function classifyFailureReason(reason) {
  var r = String(reason || '').toLowerCase();
  if (r.indexOf('timeout') !== -1) return 'timeout';
  if (r.indexOf('bad_gateway') !== -1 || r.indexOf('502') !== -1) return 'bad_gateway';
  if (r.indexOf('quota') !== -1 || r.indexOf('rate limit') !== -1 || r.indexOf('exceed') !== -1) return 'quota_exceeded';
  if (r.indexOf('schema') !== -1 || r.indexOf('json') !== -1 || r.indexOf('invalid') !== -1) return 'invalid_schema';
  if (r.indexOf('mssec') !== -1 || r.indexOf('ms_violation') !== -1 || r.indexOf('违规') !== -1) return 'ms_violation';
  return '其他';
}

// divergence 辅助：把 aiScores/teacherScores 转成 WXML 友好的 {dim,aiScore,teacherScore,aiH,teacherH} 数组
function normalizeDivRow(x) {
  var aiArr = Array.isArray(x.aiScores) ? x.aiScores : [0, 0, 0, 0, 0];
  var tcArr = Array.isArray(x.teacherScores) ? x.teacherScores : [0, 0, 0, 0, 0];
  var dims = [];
  for (var d = 0; d < SCORE_DIMS.length; d++) {
    var a = safeNum(aiArr[d], 0);
    var t = safeNum(tcArr[d], 0);
    dims.push({
      key: SCORE_DIMS[d],
      ai: a,
      tc: t,
      aiH: String(Math.round((a / 10) * 60)) + 'rpx',
      tcH: String(Math.round((t / 10) * 60)) + 'rpx'
    });
  }
  var div = safeNum(x.divergence, 0) || safeNum(x.teacherAIDivergence, 0);
  return {
    feedbackId: String(x.feedbackId || ''),
    feedbackIdShort: String(x.feedbackId || '').slice(-8),
    studentAnonymousNo: String(x.studentAnonymousNo || ''),
    divergence: div,
    divergenceColor: div >= 40 ? '#EF4444' : '#F59E0B',
    dims: dims
  };
}

// ---------- 页面 ----------
Page({
  data: {
    usingMockData: false,
    mockBannerText: '🧪 演示数据：云端 aiAnalyze.getBudgetStatus/manualRerun/getQueueStats 接口未就绪或无权限',

    // KPI
    kpiCallCount: 0,
    kpiAvgLatencyMs: 0,
    kpiTotalTokensUsed: 0,
    kpiSuccessRate: 0,
    kpiSuccessRateColor: '#10B981',

    // 7 日条形图
    last7Days: [],
    maxCount: 1,
    gridLines: [],

    // 失败列表 TOP20
    failureList: [],
    failureEmpty: true,

    // Token 预算仪表盘
    gaugeColor: '#10B981',
    usedPct: 0,
    usedPctRounded: 0,
    totalTokensUsed: 0,
    monthlyBudget: 0,
    tokenLeft: 0,
    budgetAlert: { status: 'normal', text: 'Token 用量正常', color: '#10B981', bg: '#D1FAE5' },

    // 失败饼图
    pieData: [],
    pieTotal: 0,

    // divergence TOP10
    divergenceList: [],
    divergenceEmpty: true,

    // 加载
    loading: true,
    rerunningId: ''
  },

  onLoad: function () {
    this.loadAll();
  },

  onPullDownRefresh: function () {
    var self = this;
    this.loadAll().then(function () {
      try { wx.stopPullDownRefresh(); } catch (e) {}
    }).catch(function () {
      try { wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  loadAll: function () {
    var self = this;
    self.setData({ loading: true });
    var usingMock = false;

    // 1) getBudgetStatus (注意云函数中是 getModelPricingInfo 动作，但规格声明 getBudgetStatus；因此这里先试 getBudgetStatus，失败再降级 Mock)
    var pBudget = cloud.call('aiAnalyze', { action: 'getBudgetStatus', params: {} }).then(function (r) {
      if (!r || r.code !== 0) { usingMock = true; return buildMockBudget().data; }
      return r.data || buildMockBudget().data;
    }).catch(function () { usingMock = true; return buildMockBudget().data; });

    // 2) getQueueStats (顺便拿 pending 等，但 KPI 里 callCount 主要来自 budget)
    var pStats = cloud.call('aiAnalyze', { action: 'getQueueStats', params: {} }).then(function (r) {
      if (!r || r.code !== 0) return null;
      return r.data || null;
    }).catch(function () { return null; });

    // 3) 失败列表 + 时延 + 饼图 + divergence：走单独云函数动作 getBudgetStatus 未覆盖，这里尝试调用预留动作 aiQualitySnapshot；不存在 → Mock
    var pSnapshot = cloud.call('aiAnalyze', { action: 'aiQualitySnapshot', params: {} }).then(function (r) {
      if (!r || r.code !== 0) { usingMock = true; return null; }
      return r.data || null;
    }).catch(function () { usingMock = true; return null; });

    return Promise.all([pBudget, pStats, pSnapshot]).then(function (res) {
      var budget = res[0] || buildMockBudget().data;
      var stats = res[1];
      var snap = res[2];

      // ---- KPI 处理 ----
      var callCount = safeNum(budget.callCount, 0);
      var totalTokensUsed = safeNum(budget.totalTokensUsed, 0);
      var failedCount = safeNum(budget.failedCount, 0);
      var successRate = safeNum(budget.successRate, -1);
      if (successRate < 0) {
        var denom = callCount + failedCount;
        successRate = denom > 0 ? callCount / denom : 1;
      }
      // 若 stats 覆盖（例如 getQueueStats 也没 succeededLast7Days）不覆盖 budget.callCount（KPIa 明确：今日 AI 调用数 = budget.callCount）

      var avgLatency = 0;
      if (snap && typeof snap.avgLatencyMs === 'number') {
        avgLatency = snap.avgLatencyMs;
      } else {
        usingMock = true;
        avgLatency = buildMockAvgLatency();
      }

      // ---- 7 日条形图 ----
      var last7Raw = (snap && Array.isArray(snap.last7Days) && snap.last7Days.length) ? snap.last7Days : (usingMock = true, buildMockLast7Days());
      var maxC = 1;
      for (var i = 0; i < last7Raw.length; i++) {
        var tot = (safeNum(last7Raw[i].success, 0) + safeNum(last7Raw[i].failed, 0));
        if (tot > maxC) maxC = tot;
      }
      // WXML 无法直接做算术表达式，预计算 bar 高度 rpx 值
      var last7 = last7Raw.map(function (d) {
        var s = safeNum(d.success, 0);
        var f = safeNum(d.failed, 0);
        return {
          label: d.label,
          success: s,
          failed: f,
          successHeightRpx: String(Math.round((s / maxC) * 180)) + 'rpx',
          failedHeightRpx: String(Math.round((f / maxC) * 180)) + 'rpx'
        };
      });
      var gridLines = [
        { label: maxC, top: '0rpx' },
        { label: Math.floor(maxC / 2), top: '90rpx' },
        { label: 0, top: '180rpx' }
      ];

      // ---- 失败列表 TOP20 ----
      var failures = [];
      if (snap && Array.isArray(snap.failureList) && snap.failureList.length) {
        var raw = snap.failureList.slice(0, 20);
        failures = raw.map(function (it) {
          var id = String(it.feedbackId || '');
          return {
            feedbackId: id,
            feedbackIdShort: id.slice(-8),
            failureReason: String(it.failureReason || ''),
            failureReasonShort: (String(it.failureReason || '').slice(0, 28)) + '…',
            msSecHitLabel: String(it.msSecHitLabel || ''),
            retryCount: safeNum(it.retryCount, 0),
            createdAt: it.createdAt ? new Date(it.createdAt).toLocaleString('zh-CN', { hour12: false }) : ''
          };
        });
      } else {
        usingMock = true;
        failures = buildMockFailures();
      }

      // ---- 失败原因饼图 ----
      var pieData = [];
      if (snap && Array.isArray(snap.failureCategories) && snap.failureCategories.length) {
        pieData = FAILURE_CATEGORIES.map(function (k, idx) {
          var hit = snap.failureCategories.find(function (x) { return x.key === k; });
          return { key: k, count: hit ? safeNum(hit.count, 0) : 0, color: PIE_COLORS[idx] };
        });
      } else if (failures.length) {
        // 用失败列表现场统计
        var counts = {};
        for (var k = 0; k < FAILURE_CATEGORIES.length; k++) counts[FAILURE_CATEGORIES[k]] = 0;
        for (var f = 0; f < failures.length; f++) {
          var cat = classifyFailureReason(failures[f].failureReason);
          counts[cat] = (counts[cat] || 0) + 1;
        }
        pieData = FAILURE_CATEGORIES.map(function (k, idx) {
          return { key: k, count: counts[k] || 0, color: PIE_COLORS[idx] };
        });
      } else {
        usingMock = true;
        pieData = buildMockFailurePie();
      }
      var pieTotal = 0;
      for (var pi = 0; pi < pieData.length; pi++) pieTotal += pieData[pi].count;

      // ---- divergence TOP10 ----
      var divergenceList = [];
      if (snap && Array.isArray(snap.divergenceTop) && snap.divergenceTop.length) {
        var rawDiv = snap.divergenceTop.filter(function (x) { return safeNum(x.teacherAIDivergence, 0) >= 25; }).slice(0, 10);
        rawDiv.sort(function (a, b) { return safeNum(b.teacherAIDivergence, 0) - safeNum(a.teacherAIDivergence, 0); });
        divergenceList = rawDiv.map(function (x) { return normalizeDivRow(x); });
      } else {
        usingMock = true;
        divergenceList = buildMockDivergenceTop10().map(function (x) { return normalizeDivRow(x); });
      }

      // ---- Token 仪表盘颜色 三档 switch ----
      var usedPctNum = safeNum(budget.usedPct, 0);
      usedPctNum = Math.max(0, Math.min(1, usedPctNum));
      var color = gaugeColorFor(usedPctNum); // 三档：usedPct < 0.80 → 绿 #10B981；0.80-0.95 → 黄 #F59E0B；≥0.95 → 红 #EF4444
      var usedPct100 = Math.round(usedPctNum * 100);
      // WXML 无法直接做 usedPct*100 运算，直接拼成完整 style 字符串
      var gaugeBgStyle = 'background: conic-gradient(' + color + ' 0% ' + usedPct100 + '%, #E5E7EB ' + usedPct100 + '% 100%);';

      self.setData({
        usingMockData: !!usingMock,
        kpiCallCount: callCount,
        kpiAvgLatencyMs: Math.round(avgLatency),
        kpiTotalTokensUsed: totalTokensUsed,
        kpiSuccessRate: Math.round(successRate * 10000) / 100,
        kpiSuccessRateColor: successRateColorBorder(successRate),

        last7Days: last7,
        maxCount: maxC,
        gridLines: gridLines,

        failureList: failures,
        failureEmpty: failures.length === 0,

        gaugeColor: color,
        usedPct: usedPctNum,
        usedPct100: usedPct100,
        usedPctRounded: usedPct100,
        gaugeBgStyle: gaugeBgStyle,
        totalTokensUsed: totalTokensUsed,
        monthlyBudget: safeNum(budget.monthlyBudget, 0),
        tokenLeft: safeNum(budget.tokenLeft, 0),
        budgetAlert: budgetAlertInfo(usedPctNum),

        pieData: pieData,
        pieTotal: pieTotal,

        divergenceList: divergenceList,
        divergenceEmpty: divergenceList.length === 0,

        loading: false
      }, function () {
        // canvas 饼图重绘
        self.drawPieChart();
      });
    });
  },

  // ---------- 失败原因分类饼图（canvas 2d ctx 简绘）----------
  drawPieChart: function () {
    var self = this;
    try {
      var query = wx.createSelectorQuery().in(this);
      query.select('#pieCanvas').fields({ node: true, size: true }).exec(function (res) {
        if (!res || !res[0] || !res[0].node) return;
        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        var dpr = wx.getSystemInfoSync().pixelRatio || 1;
        var w = res[0].width;
        var h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        // 清空
        ctx.clearRect(0, 0, w, h);

        var cx = w / 2;
        var cy = h / 2;
        var R = Math.min(w, h) / 2 - 4;
        var data = self.data.pieData || [];
        var total = 0;
        for (var i = 0; i < data.length; i++) total += (data[i].count || 0);
        if (total <= 0) {
          ctx.fillStyle = '#E5E7EB';
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#9CA3AF';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('无数据', cx, cy + 4);
          return;
        }
        var start = -Math.PI / 2;
        for (var k = 0; k < data.length; k++) {
          var item = data[k];
          var c = item.count || 0;
          if (c <= 0) continue;
          var angle = (c / total) * Math.PI * 2;
          var end = start + angle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, start, end);
          ctx.closePath();
          ctx.fillStyle = item.color;
          ctx.fill();
          start = end;
        }
      });
    } catch (e) {
      // 绘制失败静默，不影响页面
    }
  },

  // ---------- 手动重跑 ----------
  onManualRerun: function (e) {
    var self = this;
    var feedbackId = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!feedbackId) return;
    self.setData({ rerunningId: feedbackId });
    // 真实调用：action: 'manualRerun', params: { feedbackId: feedbackId }
    cloud.call('aiAnalyze', { action: 'manualRerun', params: { feedbackId: feedbackId } }).then(function (r) {
      self.setData({ rerunningId: '' });
      if (r && r.code === 0) {
        wx.showToast({ title: '已入队重新分析，预计 10 秒内完成', icon: 'none', duration: 2000 });
        // 重新拉取数据
        setTimeout(function () { self.loadAll(); }, 1500);
      } else {
        var msg = (r && r.msg) ? (r.code + ' ' + r.msg) : '未知错误';
        wx.showToast({ title: msg, icon: 'none', duration: 2500 });
      }
    }).catch(function (err) {
      self.setData({ rerunningId: '' });
      var msg = (err && err.code ? (err.code + ' ') : '') + ((err && err.msg) || (err && err.errMsg) || '调用失败');
      wx.showToast({ title: msg, icon: 'none', duration: 2500 });
    });
  },

  // bar 高度辅助（不可在 wxml 直接计算，走 setData 预处理 last7Days 已经有 success/failed，这里再暴露 ratio）
  // 但 WXML 内可用 style="height: {{(item.success*180/maxCount)}}rpx" 直接写，无需额外处理
});
