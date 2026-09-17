// pages/teacher/student-history/index.js · Task7 严格范围冻结
// 功能：
//  1) 顶部学生 picker：本人白名单 anonymousNo 下拉（queryMyStudentIds + 本地 fallback #S000001…）
//  2) 时间轴纵向反馈历史：queryFeedbacks(scope=student) 倒序；卡片显示日期、任务名、预警红胶囊、review 胶囊
//  3) 5 维度折线图：近 ≤20 条 feedbacks 的 scores（confirmedScores 优先 → aiAnalysis.scores），
//     用 canvas 2d ctx 简绘；5 色常量（见 DIM_COLORS）+ 图例说明。
//  4) 合规：PII sanitizeRow，WXML 层绝不渲染 studentName / className / teacherName 等；
//     className 若有 → `**级**班` 脱敏；学生仅 anonymousNo。
//  5) 诚实降级：云端接口未就绪 → 顶部橙色横幅「演示数据，未从云端拉取」+ 本地 Mock，不伪造通路。

var cloud = require('../../../utils/cloud.js');

/* ========== 5 维度颜色常量（严格与 Task7 一致） ========== */
var DIM_COLORS = {
  depression: '#6366F1',
  anxiety:    '#F59E0B',
  stress:     '#EF4444',
  wellBeing:  '#10B981',
  resilience: '#06B6D4'
};
var DIMENSIONS = [
  { key: 'depression', label: '抑郁', color: DIM_COLORS.depression },
  { key: 'anxiety',    label: '焦虑', color: DIM_COLORS.anxiety },
  { key: 'stress',     label: '压力', color: DIM_COLORS.stress },
  { key: 'wellBeing',  label: '幸福感', color: DIM_COLORS.wellBeing },
  { key: 'resilience', label: '韧性', color: DIM_COLORS.resilience }
];

/* ========== 工具函数 ========== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatDateTime(ts) {
  var d = new Date(Number(ts) || 0);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function formatShortDate(ts) {
  var d = new Date(Number(ts) || 0);
  return pad(d.getMonth() + 1) + '/' + pad(d.getDate());
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

/* PII 兜底：JS 层 delete 过滤 */
var PII_FORBIDDEN = [
  'studentName', 'name', 'nickname', 'teacherName',
  'teacherPhone', 'phone', 'studentPhone', 'teacherSchool',
  'school', '手机号', '真名', '真实姓名', '学生姓名',
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

/** className 脱敏：`XX级YY班` → `**级**班`；没有 className 时返回空串 */
function maskClassName(name) {
  if (!name || typeof name !== 'string') return '';
  // 全量脱敏：中间替换为 **，保留前后结构（简化："**级**班"）
  if (/级.*班/.test(name)) return '**级**班';
  if (/班/.test(name)) return '**班';
  if (/年级/.test(name)) return '**级';
  return '（匿名班级）';
}

/**
 * feedback → 最终 scores：优先 confirmedScores，次 aiAnalysis.scores，否则 0
 */
function resolveScores(row) {
  var out = { depression: 0, anxiety: 0, stress: 0, wellBeing: 0, resilience: 0 };
  var review = row.teacherReview || {};
  var src = null;
  if ((review.reviewStatus === 'confirmed' || review.reviewStatus === 'adjusted')
      && review.confirmedScores && typeof review.confirmedScores === 'object') {
    src = review.confirmedScores;
  } else if (row.aiAnalysis && row.aiAnalysis.scores && typeof row.aiAnalysis.scores === 'object') {
    src = row.aiAnalysis.scores;
  }
  if (src) {
    DIMENSIONS.forEach(function (d) {
      var n = Number(src[d.key]);
      if (isNaN(n)) n = 0;
      if (n < 0) n = 0;
      if (n > 100) n = 100;
      out[d.key] = n;
    });
  }
  return out;
}

/* ========== Mock 数据 ========== */
function buildMockStudent(studentId, anonymousNo) {
  var now = Date.now();
  var rows = [];
  var titles = [
    '校园生活日常感受', '压力情境投射任务', '情绪自我觉察绘画',
    '人际关系困扰评估', '睡眠与作息反馈', '自我价值感探索'
  ];
  var baseT = now - 1000 * 60 * 60 * 24 * 20;
  for (var i = 0; i < 14; i++) {
    var st = baseT + i * 1000 * 60 * 60 * (34 + Math.random() * 12);
    var scores = {
      depression: Math.max(5, Math.min(95, 32 + Math.round((Math.random() - 0.3) * 30) + i * 2)),
      anxiety:    Math.max(5, Math.min(95, 42 + Math.round((Math.random() - 0.5) * 20) + i)),
      stress:     Math.max(5, Math.min(95, 48 + Math.round((Math.random() - 0.4) * 25) + i)),
      wellBeing:  Math.max(5, Math.min(95, 58 + Math.round((Math.random() - 0.5) * 18) - i)),
      resilience: Math.max(5, Math.min(95, 52 + Math.round((Math.random() - 0.5) * 20) - i * 1.5))
    };
    var tags = [];
    if (scores.depression >= 65) tags.push('情绪低落');
    if (scores.anxiety >= 70) tags.push('焦虑');
    if (scores.stress >= 75) tags.push('高压力');
    if (scores.wellBeing <= 30) tags.push('幸福感缺失');
    if (scores.resilience <= 35) tags.push('低韧性');
    var statuses = ['pending_review', 'confirmed', 'confirmed', 'adjusted'];
    var rs = statuses[Math.floor(Math.random() * statuses.length)];
    rows.push({
      _id: 'mock-' + studentId + '-' + i,
      studentId: studentId,
      studentAnonymousNo: anonymousNo,
      submitTime: st,
      taskId: 'mock-task-' + (i % titles.length),
      taskTitle: titles[i % titles.length],
      previewText: (i % 2 === 0)
        ? '今天感觉有些疲惫，上课听不进去，和同学也没怎么说话…'
        : '晚上常常醒来，很难入睡，脑子里反复想一件事…',
      status: 'reviewed',
      aiAnalysis: { scores: scores, warning_tags: tags.slice() },
      teacherReview: {
        reviewStatus: rs,
        reviewedByAnonymousNo: rs === 'pending_review' ? '' : '#T0042',
        confirmedScores: (rs === 'pending_review') ? null : Object.assign({}, scores),
        confirmedWarningTags: (rs === 'pending_review') ? null : tags.slice()
      }
    });
  }
  // 按 submitTime 倒序
  rows.sort(function (a, b) { return Number(b.submitTime) - Number(a.submitTime); });
  return rows;
}

/* ========== 页面 ========== */
Page({
  data: {
    // 诚实降级横幅
    usingMockData: false,
    // 学生 picker
    studentOptions: [],
    studentIndex: -1,
    myWhitelist: [],
    currentStudentId: '',
    currentAnonymousNo: '',
    // 时间轴
    timelineList: [],
    totalCount: 0,
    // 5 维度折线图
    chartXLabels: [],  // x 轴日期标签数组
    chartLegend: DIMENSIONS.map(function (d) {
      return { key: d.key, label: d.label, color: d.color };
    }),
    // 状态
    loadingWhitelist: true,
    loadingHistory: false,
    errorMsg: '',
    emptyState: true
  },

  onLoad: function () { this.loadWhitelist(); },
  onShow: function () {
    if (this.data.currentStudentId) this.loadStudentHistory(this.data.currentStudentId);
  },
  onPullDownRefresh: function () {
    var that = this;
    that.loadWhitelist(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  /* ========== 白名单 & picker ========== */
  loadWhitelist: function (done) {
    var that = this;
    that.setData({
      loadingWhitelist: true, errorMsg: '', emptyState: true,
      timelineList: [], totalCount: 0, chartXLabels: [],
      usingMockData: false
    });
    that.safeCall({ action: 'queryMyStudentIds' }, 'queryMyStudentIds')
      .then(function (r) {
        var ids = [];
        var ok = !!(r && r.code === 0 && Array.isArray(r.studentIds));
        if (ok) ids = r.studentIds;
        if (!ids.length) {
          that.setData({
            studentOptions: [], studentIndex: -1, myWhitelist: [],
            currentStudentId: '', currentAnonymousNo: '',
            loadingWhitelist: false, emptyState: true
          });
          done && done();
          return;
        }
        that.buildStudentOptions(ids).then(function (opts) {
          that.setData({
            studentOptions: opts, studentIndex: -1,
            myWhitelist: ids.slice(),
            currentStudentId: '', currentAnonymousNo: '',
            loadingWhitelist: false, emptyState: !opts.length
          });
          done && done();
        });
      });
  },

  /** picker 选项（诚实降级：仅 anonymousNo；若无映射 → #S000001… 占位，不造真实号） */
  buildStudentOptions: function (ids) {
    var that = this;
    return new Promise(function (resolve) {
      // try login(queryUserMap) action（不存在则 fallback）
      cloud.call('feedbackSubmit', {
        action: 'queryFeedbacks', scope: 'all', scopeId: null, pageSize: ids.length, pageToken: null
      }).then(function (rFb) {
        // 利用 queryFeedbacks 返回来尝试建立 studentId → anonymousNo 映射
        var map = {};
        if (rFb && rFb.code === 0 && Array.isArray(rFb.list)) {
          rFb.list.forEach(function (f) {
            if (f.studentId && f.studentAnonymousNo) map[f.studentId] = f.studentAnonymousNo;
          });
        }
        resolve(ids.map(function (id, i) {
          return { value: id, label: map[id] || that._fallbackAnon(i) };
        }));
      }).catch(function () {
        resolve(ids.map(function (id, i) {
          return { value: id, label: that._fallbackAnon(i) };
        }));
      });
    });
  },
  _fallbackAnon: function (idx) {
    var n = (Number(idx) || 0) + 1;
    var s = '000000' + n;
    return '#S' + s.slice(-6);
  },

  /* ========== picker 变更 → 加载历史 + 画 canvas ========== */
  onStudentChange: function (e) {
    var idx = Number(e.detail.value);
    var opts = this.data.studentOptions;
    if (idx < 0 || idx >= opts.length) return;
    var chosen = opts[idx];
    var studentId = chosen.value;
    if (this.data.myWhitelist.indexOf(studentId) < 0) {
      this.setData({
        studentIndex: -1, currentStudentId: '', currentAnonymousNo: '',
        timelineList: [], chartXLabels: [], totalCount: 0, emptyState: true
      });
      wx.showToast && wx.showToast({ title: '越权：该学生不在您范围内', icon: 'none' });
      return;
    }
    this.setData({
      studentIndex: idx,
      currentStudentId: studentId,
      currentAnonymousNo: chosen.label,
      usingMockData: false
    });
    this.loadStudentHistory(studentId);
  },

  /* ========== 加载学生历史 + 画 canvas 折线图 ========== */
  loadStudentHistory: function (studentId) {
    var that = this;
    if (!studentId) return;
    if (that.data.myWhitelist.indexOf(studentId) < 0) {
      that.setData({ errorMsg: '越权：该学生不在您范围内', emptyState: true });
      return;
    }
    that.setData({ loadingHistory: true, errorMsg: '', emptyState: false });

    that.safeCall({
      action: 'queryFeedbacks',
      scope: 'student', scopeId: studentId,
      filter: { startTime: null },
      pageSize: 200, pageToken: null
    }, 'queryFeedbacks student').then(function (r) {
      var ok = !!(r && r.code === 0 && Array.isArray(r.list));
      var rows = ok ? r.list.slice() : [];
      rows.forEach(sanitizeRow);

      // 若接口无真实数据 → 诚实 Mock + 顶部横幅
      if (!ok || rows.length === 0) {
        that.setData({ usingMockData: true });
        rows = buildMockStudent(studentId, that.data.currentAnonymousNo || '#S000001');
      }
      rows.sort(function (a, b) { return Number(b.submitTime || 0) - Number(a.submitTime || 0); });

      // ====== 时间轴视图 ======
      var tl = rows.map(function (row) {
        var rs = (row.teacherReview && row.teacherReview.reviewStatus) || 'pending_review';
        var tags = [];
        var aiT = (row.aiAnalysis && row.aiAnalysis.warning_tags) || [];
        var cfT = (row.teacherReview && row.teacherReview.confirmedWarningTags) || [];
        var seen = {};
        aiT.concat(cfT).forEach(function (t) {
          if (!seen[t]) { seen[t] = true; tags.push(t); }
        });
        var taskTitle = (row.task && row.task.title) || row.taskTitle || '（未命名任务）';
        // className 若有 → **级**班 脱敏（此处任务名为任务本身标题，不直接含班级；安全起见再做一次 PII 字符串脱敏替换）
        taskTitle = String(taskTitle).replace(/[\u4e00-\u9fa5A-Za-z0-9]{0,2}级[\u4e00-\u9fa5A-Za-z0-9]{0,3}班/g, '**级**班');
        return {
          _id: row._id,
          taskTitle: taskTitle,
          submitTimeText: formatDateTime(row.submitTime),
          previewText: row.previewText || (((row.imageFeedbacks || [])[0] || {}).text || '').slice(0, 80),
          warningTags: tags,
          reviewStatus: rs,
          reviewPillClass: reviewPillClass(rs),
          reviewPillText: reviewPillText(rs),
          isReviewed: (rs === 'confirmed' || rs === 'adjusted')
        };
      });

      // ====== 折线图数据：近 20 条，升序（时间早→晚，左→右） ======
      var chartRows = rows.slice(0, 20).reverse();
      var xLabels = chartRows.map(function (r) { return formatShortDate(r.submitTime); });
      var seriesData = {};
      DIMENSIONS.forEach(function (d) { seriesData[d.key] = []; });
      chartRows.forEach(function (row) {
        var s = resolveScores(row);
        DIMENSIONS.forEach(function (d) {
          seriesData[d.key].push(Number(s[d.key]) || 0);
        });
      });

      that.setData({
        timelineList: tl,
        totalCount: tl.length,
        chartXLabels: xLabels,
        loadingHistory: false,
        emptyState: tl.length === 0
      }, function () {
        // setData 完成 → 触发 canvas 绘制
        that.drawLineChart(seriesData, xLabels);
      });
    });
  },

  /* ========== Canvas 2d 折线图绘制（5 色 + 网格 + 节点） ========== */
  drawLineChart: function (seriesData, xLabels) {
    var that = this;
    var query = wx.createSelectorQuery && wx.createSelectorQuery();
    if (!query) return;
    query.select('#scoreLineChart')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return;
        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var dpr = (wx.getSystemInfoSync && wx.getSystemInfoSync().pixelRatio) || 2;
        var cssW = res[0].width  || 300;
        var cssH = res[0].height || 280;
        canvas.width  = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx.scale(dpr, dpr);

        // 布局参数
        var PAD_L = 44, PAD_R = 18, PAD_T = 24, PAD_B = 34;
        var plotW = cssW - PAD_L - PAD_R;
        var plotH = cssH - PAD_T - PAD_B;
        if (plotW <= 0 || plotH <= 0) return;

        // 背景
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cssW, cssH);

        var N = Math.max(1, xLabels.length);
        // Y 轴：0-100，刻度 0 / 25 / 50 / 75 / 100
        var yTicks = [0, 25, 50, 75, 100];
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94A3B8';
        for (var i = 0; i < yTicks.length; i++) {
          var yv = yTicks[i];
          var y = PAD_T + plotH - (yv / 100) * plotH;
          // 网格线（点线）
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.moveTo(PAD_L, y);
          ctx.lineTo(PAD_L + plotW, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillText(String(yv), PAD_L - 6, y);
        }

        // 无数据：绘制 N/A
        if (N <= 0 || !xLabels.length) {
          ctx.fillStyle = '#CBD5E1';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('暂无评分数据', cssW / 2, cssH / 2);
          return;
        }

        // X 轴标签：根据 N 稀疏显示（N>8 时步长）
        ctx.fillStyle = '#64748B';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var xLabelStep = N > 8 ? Math.ceil(N / 6) : 1;
        for (var xi = 0; xi < N; xi++) {
          if (xi % xLabelStep !== 0 && xi !== N - 1) continue;
          var xPos = PAD_L + (N === 1 ? plotW / 2 : (xi / (N - 1)) * plotW);
          ctx.fillText(xLabels[xi] || '', xPos, PAD_T + plotH + 8);
        }

        // 绘图区域右边界
        ctx.strokeStyle = '#E2E8F0';
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
        ctx.strokeRect(PAD_L, PAD_T, plotW, plotH);

        // 5 条折线 + 节点
        DIMENSIONS.forEach(function (d) {
          var arr = seriesData[d.key] || [];
          if (arr.length === 0) return;
          ctx.strokeStyle = d.color;
          ctx.fillStyle = d.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (var p = 0; p < arr.length; p++) {
            var v = Number(arr[p]) || 0;
            if (v < 0) v = 0; if (v > 100) v = 100;
            var px = PAD_L + (N === 1 ? plotW / 2 : (p / (N - 1)) * plotW);
            var py = PAD_T + plotH - (v / 100) * plotH;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          // 节点小圆点
          for (var p2 = 0; p2 < arr.length; p2++) {
            var v2 = Number(arr[p2]) || 0;
            if (v2 < 0) v2 = 0; if (v2 > 100) v2 = 100;
            var px2 = PAD_L + (N === 1 ? plotW / 2 : (p2 / (N - 1)) * plotW);
            var py2 = PAD_T + plotH - (v2 / 100) * plotH;
            ctx.beginPath();
            ctx.arc(px2, py2, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = d.color;
            ctx.stroke();
          }
        });
      });
  },

  /* ========== 安全调用（永不抛错） ========== */
  safeCall: function (payload, tag) {
    return new Promise(function (resolve) {
      cloud.call('feedbackSubmit', payload)
        .then(function (r) {
          if (r && r.code === 0) return resolve(r);
          console.warn('[student-history][' + tag + '] 非0 code 降级空:', r && r.code, r && r.msg);
          resolve({ code: -1, list: [], msg: (r && r.msg) || '' });
        })
        .catch(function (e) {
          console.warn('[student-history][' + tag + '] 异常降级空:', e && e.msg);
          resolve({ code: 900, list: [], msg: (e && e.msg) || '' });
        });
    });
  },

  /* ========== 跳 AI 审核 ========== */
  onTimelineItemTap: function (e) {
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/teacher/ai-review/index?feedbackId=' + encodeURIComponent(id),
      fail: function () {
        wx.showToast && wx.showToast({ title: '审核页未部署', icon: 'none' });
      }
    });
  }
});
