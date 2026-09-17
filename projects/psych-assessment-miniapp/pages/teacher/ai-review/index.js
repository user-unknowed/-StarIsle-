// pages/teacher/ai-review/index.js
// 教师 AI 审核工作流（单页三阶段 · TDD 严格版）
// —— 允许只读：utils/cloud.js, feedbackSubmit(queryFeedbacks / getFeedbackDetail / reviewAI)
// —— 合规红线：
//   (1) confirm 动作调用：绝对不传 confirmedScores / confirmedWarningTags / confirmedSummary
//       （或传 null）；后端 confirm 分支强制取 aiAnalysis（防绕过）
//   (2) 渲染层绝对不展示真名/手机/学校/PII，收到后 delete 再渲染
//   (3) teacherNote：此备注仅您本人可见，其他教师不可见

var cloud = require('../../../utils/cloud.js');

// ========== 10 个 warning_tags 枚举白名单（英文 key，前端展示有中文 label） ==========
var WARNING_TAG_ENUM = [
  { key: 'self_harm_risk',          label: '自伤风险' },
  { key: 'severe_depression',       label: '重度抑郁' },
  { key: 'suicide_ideation',        label: '自杀意念' },
  { key: 'trauma_signal',           label: '创伤信号' },
  { key: 'violence_risk',           label: '暴力风险' },
  { key: 'substance_abuse',         label: '物质滥用' },
  { key: 'eating_disorder',         label: '进食障碍' },
  { key: 'insomnia_severe',         label: '严重失眠' },
  { key: 'family_conflict',         label: '家庭冲突' },
  { key: 'bullying_victim',         label: '欺凌受害' }
];
var WARNING_TAG_KEYS = WARNING_TAG_ENUM.map(function (t) { return t.key; });
var WARNING_TAG_LABEL_MAP = {};
WARNING_TAG_ENUM.forEach(function (t) { WARNING_TAG_LABEL_MAP[t.key] = t.label; });

// 五维度（前端 0-10 step=1，提交给后端 *10 转 0-100）
var SCORE_DIMS = [
  { key: 'depression', label: '抑郁',     lowGood: false },
  { key: 'anxiety',    label: '焦虑',     lowGood: false },
  { key: 'stress',     label: '压力',     lowGood: false },
  { key: 'wellBeing',  label: '幸福感',   lowGood: true },
  { key: 'resilience', label: '韧性',     lowGood: true }
];

// 后端原始 warning_tags → 可能是英文 key 或 中文 label → 统一规范化为英文 key（白名单内）
function normalizeWarningTags(rawTags) {
  var out = [];
  var seen = {};
  (rawTags || []).forEach(function (t) {
    if (!t) return;
    var k = String(t);
    // 本身已是英文 key
    if (WARNING_TAG_KEYS.indexOf(k) >= 0) {
      if (!seen[k]) { seen[k] = true; out.push(k); }
      return;
    }
    // 否则尝试 label 反查 key（兼容中文 legacy 数据）
    for (var i = 0; i < WARNING_TAG_ENUM.length; i++) {
      if (WARNING_TAG_ENUM[i].label === k) {
        if (!seen[WARNING_TAG_ENUM[i].key]) {
          seen[WARNING_TAG_ENUM[i].key] = true;
          out.push(WARNING_TAG_ENUM[i].key);
        }
        return;
      }
    }
    // 否则丢弃（白名单外不留）
  });
  return out;
}

function warningTagToLabel(key) {
  return WARNING_TAG_LABEL_MAP[key] || key;
}

// 绝对禁止渲染的 PII 字段（renderSanitize）
var PII_BLACKLIST_DEEP = [
  'realName', 'name', 'phone', 'mobile', 'tel', 'email',
  'idCardNo', 'id_card_no', 'idNumber', 'id_no', 'identityNo',
  'schoolName', 'school', 'className', 'grade',
  'address', 'homeAddress', 'city', 'district',
  'wechat', 'wxid', 'qq',
  'studentId', 'teacherId', 'parentId', 'userId',
  'openid', 'unionid', 'reviewedByTeacherId',
  'avatarUrl'
];

function renderSanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) { renderSanitize(obj[i]); }
    return obj;
  }
  var keys = Object.keys(obj);
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j];
    var low = k.toLowerCase();
    var hit = false;
    for (var p = 0; p < PII_BLACKLIST_DEEP.length; p++) {
      if (k === PII_BLACKLIST_DEEP[p] || low === PII_BLACKLIST_DEEP[p].toLowerCase()) {
        hit = true; break;
      }
    }
    if (hit) {
      delete obj[k];
    } else {
      if (obj[k] && typeof obj[k] === 'object') renderSanitize(obj[k]);
    }
  }
  return obj;
}

Page({
  data: {
    // ===== 接口模式：真实云函数 / 本地 Mock（演示数据） =====
    useMock: false,
    // 演示数据提示显示在页面顶部
    mockBannerVisible: false,

    // ===== 加载状态 =====
    loading: false,
    loadingText: '',
    errorMsg: '',
    errorCode: '',

    // ===== 阶段 1/3 顶部双 Tab：待审核 / 已审核 =====
    topTab: 'pending',   // 'pending' | 'reviewed'

    // ===== 顶部筛选：范围 + 状态 =====
    scopeFilter: 'all',          // 'all' | 'class' | 'binding'
    statusFilter: 'pending',     // 'pending' | 'ai_failed' | 'ai_skipped' | 'all'
    // → 实际：当 topTab 切换，会把 statusFilter 自动修正到候选范围

    // ===== 列表数据 =====
    rawList: [],      // 后端返回 + sanitize 后的数据
    list: [],         // 应用了 topTab/scopeFilter/statusFilter 后展示的数据
    counts: { pending: 0, aiFailed: 0, aiSkipped: 0, reviewed: 0 },

    // ===== 阶段 2：详情（页内弹层，非新页面） =====
    showDetail: false,
    detailData: null,   // sanitize 后的详情对象，含派生字段

    // ===== 调整结论面板 (adjust) =====
    adjustPanelOpen: false,
    adjustScores: [],          // [{key,label,value:0..10}]
    adjustTags: [],            // 英文 key 数组（白名单内）
    adjustSummary: '',         // ≤300
    adjustTeacherNote: '',     // ≤500

    // ===== wxml 引用 =====
    warningTagEnum: WARNING_TAG_ENUM,
    warningTagLabelMap: WARNING_TAG_LABEL_MAP
  },

  // ===================================================================
  // 生命周期
  // ===================================================================
  onLoad: function () {
    this._viewerAnonymousNo = null;
    this.loadList();
  },

  onShow: function () {
    if (!this.data.loading) this.loadList();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.loadList(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  // ===================================================================
  // 工具函数
  // ===================================================================
  _fmtTime: function (ts) {
    if (!ts) return '';
    try {
      var d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '';
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate())
        + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  },

  // feedback.status / teacherReview.reviewStatus → 列表卡片状态胶囊
  // 三种颜色：pending 蓝 / ai_failed 橙 / ai_skipped 紫
  _statusMeta: function (fb) {
    var s = fb.status || '';
    var tr = fb.teacherReview || {};
    var rs = tr.reviewStatus || 'pending_review';
    if (s === 'ai_failed') return { text: 'AI失败', cls: 'st-ai-failed' };
    if (s === 'ai_failed_skipped_mssec') return { text: 'AI跳过', cls: 'st-ai-skipped' };
    if (rs === 'pending_review') return { text: '待审核', cls: 'st-pending' };
    if (rs === 'confirmed') return { text: '已确认', cls: 'st-reviewed' };
    if (rs === 'adjusted')  return { text: '已调整', cls: 'st-reviewed' };
    return { text: '待处理', cls: 'st-pending' };
  },

  _inStatusFilter: function (fb, statusFilter) {
    var s = fb.status || '';
    var tr = fb.teacherReview || {};
    var rs = tr.reviewStatus || 'pending_review';
    switch (statusFilter) {
      case 'pending':
        return rs === 'pending_review'
          && s !== 'ai_failed'
          && s !== 'ai_failed_skipped_mssec';
      case 'ai_failed':
        return s === 'ai_failed';
      case 'ai_skipped':
        return s === 'ai_failed_skipped_mssec';
      case 'all':
        return true;
      default:
        return true;
    }
  },

  _isReviewed: function (fb) {
    var rs = (fb.teacherReview && fb.teacherReview.reviewStatus) || '';
    return rs === 'confirmed' || rs === 'adjusted';
  },

  // 五维度分数（后端 0-100 / 前端 0-10 兼容） → 条形渲染数据
  _buildScoreRows: function (scores) {
    var rows = [];
    if (!scores) return rows;
    for (var i = 0; i < SCORE_DIMS.length; i++) {
      var dim = SCORE_DIMS[i];
      var raw = Number(scores[dim.key]);
      if (isNaN(raw)) raw = 0;
      var val = raw > 10 ? Math.round(raw / 10) : Math.round(raw);
      if (val < 0) val = 0;
      if (val > 10) val = 10;
      var pct = (val / 10) * 100;
      var color;
      if (dim.lowGood) {
        if (val >= 8) color = 'low-risk';
        else if (val >= 5) color = 'mid-risk';
        else color = 'high-risk';
      } else {
        if (val <= 3) color = 'low-risk';
        else if (val <= 6) color = 'mid-risk';
        else color = 'high-risk';
      }
      rows.push({
        key: dim.key, label: dim.label, val: val,
        barWidth: Math.round(pct), colorClass: color
      });
    }
    return rows;
  },

  // ===================================================================
  // Mock 数据（当 queryFeedbacks / getFeedbackDetail / reviewAI 未就绪，或 wx.cloud 不可用）
  // ===================================================================
  _mockList: function () {
    var now = Date.now();
    var base = [
      {
        _id: 'mfb_001',
        taskId: 'tk_demo_a',
        studentAnonymousNo: '#S100321',
        submitTime: now - 3600 * 1000 * 2,
        status: 'normal',
        teacherReview: { reviewStatus: 'pending_review' },
        aiAnalysis: {
          scores: { depression: 80, anxiety: 70, stress: 75, wellBeing: 20, resilience: 30 },
          warning_tags: ['self_harm_risk', 'severe_depression', 'insomnia_severe'],
          summary: '学生连续表达强烈低落情绪与自伤意念，伴随严重失眠，建议尽快进行危机评估与家校沟通。'
        },
        msSecCheckLabelsHit: [],
        previewText: '最近我真的撑不住了，每天都不想起床，觉得世界没意思，还想过用美工刀划手腕……'
      },
      {
        _id: 'mfb_002',
        taskId: 'tk_demo_a',
        studentAnonymousNo: '#S100458',
        submitTime: now - 3600 * 1000 * 20,
        status: 'ai_failed',
        teacherReview: { reviewStatus: 'pending_review' },
        aiAnalysis: null,
        msSecCheckLabelsHit: [],
        previewText: '（AI 服务返回失败，等待人工审核原文……）'
      },
      {
        _id: 'mfb_003',
        taskId: 'tk_demo_b',
        studentAnonymousNo: '#S100771',
        submitTime: now - 3600 * 1000 * 26,
        status: 'ai_failed_skipped_mssec',
        teacherReview: { reviewStatus: 'pending_review' },
        aiAnalysis: null,
        msSecCheckLabelsHit: ['risky','injury'],
        previewText: '（msSec 命中违规，AI 已跳过，请人工审核原文）'
      },
      {
        _id: 'mfb_004',
        taskId: 'tk_demo_a',
        studentAnonymousNo: '#S100912',
        submitTime: now - 3600 * 1000 * 50,
        status: 'reviewed_normal',
        teacherReview: {
          reviewStatus: 'confirmed',
          reviewedByAnonymousNo: '#T40001',
          reviewedAt: now - 3600 * 1000 * 48
        },
        aiAnalysis: {
          scores: { depression: 30, anxiety: 40, stress: 50, wellBeing: 70, resilience: 80 },
          warning_tags: [],
          summary: '整体状态良好，压力与焦虑在正常范围，幸福感与韧性高。'
        },
        msSecCheckLabelsHit: [],
        previewText: '这周过的挺不错，和家人一起吃了两次饭，学习也比较顺利。'
      },
      {
        _id: 'mfb_005',
        taskId: 'tk_demo_c',
        studentAnonymousNo: '#S100109',
        submitTime: now - 3600 * 1000 * 72,
        status: 'reviewed_normal',
        teacherReview: {
          reviewStatus: 'adjusted',
          reviewedByAnonymousNo: '#T40001',
          reviewedAt: now - 3600 * 1000 * 70,
          confirmedScores: { depression: 70, anxiety: 80, stress: 60, wellBeing: 30, resilience: 40 },
          confirmedWarningTags: ['family_conflict', 'bullying_victim'],
          confirmedSummary: '经人工复核，将抑郁/焦虑调高，新增家庭冲突与校园欺凌标签。'
        },
        aiAnalysis: {
          scores: { depression: 40, anxiety: 50, stress: 55, wellBeing: 50, resilience: 60 },
          warning_tags: ['family_conflict'],
          summary: 'AI 初步分析：存在一定家庭冲突，但情绪风险不显著。'
        },
        msSecCheckLabelsHit: [],
        previewText: '爸妈这两周一直吵架，班上还有同学给我起外号……'
      }
    ];
    return base;
  },

  _mockDetail: function (feedbackId) {
    // 优先从 mock list 找；找不到则造一条详情
    var list = this._mockList();
    for (var i = 0; i < list.length; i++) {
      if (list[i]._id === feedbackId) {
        var fb = JSON.parse(JSON.stringify(list[i]));
        fb.imageFeedbacks = [
          { index: 1, imageUrl: '', text: (fb.previewText || '学生原文第一段（演示数据）。') },
          { index: 2, imageUrl: '', text: '学生原文第二段（演示数据）：我最近总是一个人，吃饭也是，上课也不想发言。' }
        ];
        fb.task = { _id: fb.taskId, title: '《每周心语》班级心理反馈任务' };
        return fb;
      }
    }
    // 默认详情
    return {
      _id: feedbackId || 'mfb_demo',
      taskId: 'tk_demo',
      task: { _id: 'tk_demo', title: '演示任务' },
      studentAnonymousNo: '#S100001',
      submitTime: Date.now() - 3600 * 1000,
      status: 'normal',
      teacherReview: { reviewStatus: 'pending_review' },
      aiAnalysis: {
        scores: { depression: 60, anxiety: 50, stress: 50, wellBeing: 50, resilience: 60 },
        warning_tags: ['severe_depression'],
        summary: '演示用摘要：AI 发现轻度至中度抑郁风险信号。'
      },
      msSecCheckLabelsHit: [],
      imageFeedbacks: [
        { index: 1, text: '（演示数据）学生反馈原文第一段：我最近学习有点累，睡眠不太好。' },
        { index: 2, text: '（演示数据）第二段：有时候会觉得未来没有方向，但是也没什么具体的痛苦。' }
      ]
    };
  },

  // ===================================================================
  // 列表加载（真实优先，失败回退 Mock）
  // ===================================================================
  loadList: function (done) {
    var that = this;
    that.setData({
      loading: true,
      loadingText: '加载列表中…',
      errorMsg: '', errorCode: ''
    });

    var payload = {
      action: 'queryFeedbacks',
      scope: 'all',
      scopeId: null,
      filter: {},
      pageSize: 50,
      pageToken: 1
    };

    cloud.call('feedbackSubmit', payload).then(function (r) {
      if (!r || r.code !== 0) throw r || { code: 500, msg: '返回异常' };
      that._viewerAnonymousNo = (r.data && r.data.viewerAnonymousNo) || null;
      var raw = (r.data && r.data.list) || [];
      that._finishLoadList(raw, false, done);
    }).catch(function (err) {
      // ====== 降级：接口未就绪 → Mock 演示数据 ======
      var list = that._mockList();
      that._finishLoadList(list, true, done);
      var code = (err && err.code) || '';
      var msg = (err && err.msg) || '云端接口不可用';
      that.setData({
        errorMsg: '已加载演示数据（云端：' + msg + '）'
      });
    });
  },

  _finishLoadList: function (raw, useMock, done) {
    renderSanitize(raw);           // PII 兜底清理
    var that = this;
    var counts = { pending: 0, aiFailed: 0, aiSkipped: 0, reviewed: 0 };
    raw.forEach(function (fb) {
      var s = fb.status || '';
      if (s === 'ai_failed') counts.aiFailed++;
      else if (s === 'ai_failed_skipped_mssec') counts.aiSkipped++;
      else if (that._isReviewed(fb)) counts.reviewed++;
      else counts.pending++;
    });

    var withMeta = raw.map(function (fb) {
      var sm = that._statusMeta(fb);
      var ai = fb.aiAnalysis || {};
      var tr = fb.teacherReview || {};
      var tagsSrc = (tr.confirmedWarningTags && tr.confirmedWarningTags.length)
        ? tr.confirmedWarningTags : (ai.warning_tags || []);
      var normTags = normalizeWarningTags(tagsSrc).slice(0, 5);
      var tagLabels = normTags.map(warningTagToLabel);
      return Object.assign({}, fb, {
        _submitTimeStr: that._fmtTime(fb.submitTime),
        _statusText: sm.text,
        _statusCls: sm.cls,
        _warnTagsKeys: normTags,
        _warnTagsLabels: tagLabels
      });
    });

    that.setData({
      rawList: withMeta,
      counts: counts,
      useMock: !!useMock,
      mockBannerVisible: !!useMock,
      loading: false,
      loadingText: ''
    });
    that._applyFilters();
    done && done();
  },

  _applyFilters: function () {
    var that = this;
    var tab = this.data.topTab;
    var scopeFilter = this.data.scopeFilter;
    var statusFilter = this.data.statusFilter;
    var arr = (this.data.rawList || []).filter(function (fb) {
      var matchTopTab = (tab === 'pending') ? !that._isReviewed(fb) : that._isReviewed(fb);
      if (!matchTopTab) return false;
      // 范围筛选：演示模式下全部通过（无班级/绑定真实数据）
      if (scopeFilter !== 'all') {
        // 真实项目：这里应该按 fb.classId / fb.bindingId 过滤
      }
      // 状态筛选（已审核 tab 下忽略 statusFilter 或仅按 reviewStatus 过滤）
      if (tab === 'pending') {
        if (!that._inStatusFilter(fb, statusFilter)) return false;
      }
      return true;
    });
    this.setData({ list: arr });
  },

  // ===================================================================
  // 筛选交互
  // ===================================================================
  onTopTabChange: function (e) {
    var tab = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab) || 'pending';
    var st = this.data.statusFilter;
    if (tab === 'reviewed') {
      // 已审核 tab 下：状态筛选统一为 'all'（只展示 reviewed 集合）
      st = 'all';
    } else if (!st || st === 'all') {
      st = 'pending';
    }
    this.setData({ topTab: tab, statusFilter: st });
    this._applyFilters();
  },

  onScopeFilterChange: function (e) {
    var v = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.val) || 'all';
    this.setData({ scopeFilter: v });
    this._applyFilters();
  },

  onStatusFilterChange: function (e) {
    var v = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.val) || 'all';
    this.setData({ statusFilter: v });
    this._applyFilters();
  },

  // ===================================================================
  // 点击卡片 → 阶段 2：详情弹层
  // ===================================================================
  onOpenDetail: function (e) {
    var id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id);
    if (!id) return;
    this.loadDetail(id);
  },

  onCloseDetail: function () {
    // 取消按钮 → 回阶段 1/3
    this.setData({
      showDetail: false,
      detailData: null,
      adjustPanelOpen: false,
      adjustScores: [],
      adjustTags: [],
      adjustSummary: '',
      adjustTeacherNote: ''
    });
  },

  // ===================================================================
  // 详情加载（真实优先，失败回退 Mock）
  // ===================================================================
  loadDetail: function (feedbackId) {
    var that = this;
    this.setData({ loading: true, loadingText: '加载详情中…', errorMsg: '' });
    cloud.call('feedbackSubmit', {
      action: 'getFeedbackDetail',
      feedbackId: feedbackId
    }).then(function (r) {
      if (!r || r.code !== 0) throw r || { code: 500, msg: '返回异常' };
      that._finishLoadDetail(r.data || {}, false);
    }).catch(function (err) {
      var d = that._mockDetail(feedbackId);
      that._finishLoadDetail(d, true);
      var msg = (err && err.msg) || '云端接口不可用';
      that.setData({ errorMsg: '演示数据（云端：' + msg + '）' });
    });
  },

  _finishLoadDetail: function (d, useMock) {
    renderSanitize(d);
    var that = this;

    // teacherNote 私有性兜底：reviewedByAnonymousNo 不是本人则 delete
    var tr = d.teacherReview || {};
    if (tr.teacherNote && this._viewerAnonymousNo && tr.reviewedByAnonymousNo
        && tr.reviewedByAnonymousNo !== this._viewerAnonymousNo) {
      delete tr.teacherNote;
      if (d.teacherReview) delete d.teacherReview.teacherNote;
    }

    d._submitTimeStr = this._fmtTime(d.submitTime);

    var ai = d.aiAnalysis || {};
    // 优先级：teacherReview.confirmed* → aiAnalysis.*
    var displayScores = null;
    var displayTagsKeys = [];
    var displaySummary = '';
    var source = 'ai';
    if (tr.confirmedScores && typeof tr.confirmedScores === 'object') {
      source = 'confirmed'; displayScores = tr.confirmedScores;
    } else if (ai.scores) {
      displayScores = ai.scores;
    }
    if (Array.isArray(tr.confirmedWarningTags) && tr.confirmedWarningTags.length) {
      source = 'confirmed';
      displayTagsKeys = normalizeWarningTags(tr.confirmedWarningTags);
    } else {
      displayTagsKeys = normalizeWarningTags(ai.warning_tags || []);
    }
    if (tr.confirmedSummary) { source = 'confirmed'; displaySummary = tr.confirmedSummary; }
    else if (ai.summary) { displaySummary = ai.summary; }

    d._displayScoresSource = source;
    d._displayScoreRows = this._buildScoreRows(displayScores);
    d._displayTagsKeys = displayTagsKeys;
    d._displayTagsLabels = displayTagsKeys.map(warningTagToLabel);
    d._displaySummary = displaySummary;

    var sm = this._statusMeta(d);
    d._statusText = sm.text;
    d._statusCls = sm.cls;
    d._isMsSecSkipped = (d.status === 'ai_failed_skipped_mssec')
      || ((d.msSecCheckLabelsHit && d.msSecCheckLabelsHit.length) && !d.aiAnalysis);
    d._hasAIAnalysis = !!(ai && ai.scores && ai.scores.depression !== undefined);
    d._reviewedAtStr = this._fmtTime(tr.reviewedAt);

    // 学生反馈原文：逐图 (imageFeedbacks) 若缺则兜底 previewText
    var segs = [];
    if (d.imageFeedbacks && Array.isArray(d.imageFeedbacks) && d.imageFeedbacks.length) {
      d.imageFeedbacks.forEach(function (seg, idx) {
        segs.push({
          index: seg.index || (idx + 1),
          imageUrl: seg.imageUrl || seg.img || '',
          text: seg.text || ''
        });
      });
    } else if (d.previewText) {
      segs.push({ index: 1, imageUrl: '', text: d.previewText });
    }
    d._segments = segs;

    if (useMock && !this.data.useMock) {
      this.setData({ useMock: true, mockBannerVisible: true });
    }

    this.setData({
      detailData: d,
      showDetail: true,
      loading: false,
      loadingText: ''
    });

    // 初始化 adjust 表单默认值
    this._initAdjustForm(displayScores, displayTagsKeys, displaySummary, tr.teacherNote || '');
  },

  // ===================================================================
  // adjust 表单：默认值 / 切换 / 输入
  // ===================================================================
  _initAdjustForm: function (displayScores, displayTagsKeys, displaySummary, existingTeacherNote) {
    var scores = [];
    for (var i = 0; i < SCORE_DIMS.length; i++) {
      var dim = SCORE_DIMS[i];
      var raw = 0;
      if (displayScores && typeof displayScores[dim.key] === 'number') raw = displayScores[dim.key];
      var val = raw > 10 ? Math.round(raw / 10) : Math.round(raw);
      if (val < 0) val = 0; if (val > 10) val = 10;
      scores.push({ key: dim.key, label: dim.label, value: val });
    }
    var tags = normalizeWarningTags(displayTagsKeys || []);
    this.setData({
      adjustScores: scores,
      adjustTags: tags,
      adjustSummary: String(displaySummary || '').slice(0, 300),
      adjustTeacherNote: String(existingTeacherNote || '').slice(0, 500),
      adjustPanelOpen: false
    });
  },

  onToggleAdjustPanel: function () {
    // 打开面板前重新基准：以当前已显示的结论为默认值（防止多轮 adjust 叠加）
    var d = this.data.detailData;
    if (!d) return;
    if (!this.data.adjustPanelOpen) {
      var tr = d.teacherReview || {};
      var ai = d.aiAnalysis || {};
      var scores = tr.confirmedScores || ai.scores || null;
      var tags = (tr.confirmedWarningTags && tr.confirmedWarningTags.length)
        ? tr.confirmedWarningTags : (ai.warning_tags || []);
      var summary = tr.confirmedSummary || ai.summary || '';
      this._initAdjustForm(scores, tags, summary, tr.teacherNote || '');
    }
    this.setData({ adjustPanelOpen: !this.data.adjustPanelOpen });
  },

  onScoreSliderChange: function (e) {
    var key = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || '';
    var val = Number(e && e.detail && e.detail.value);
    if (!key || isNaN(val)) return;
    if (val < 0) val = 0; if (val > 10) val = 10;
    var scores = (this.data.adjustScores || []).map(function (s) {
      if (s.key === key) return Object.assign({}, s, { value: val });
      return s;
    });
    this.setData({ adjustScores: scores });
  },

  onToggleWarningTag: function (e) {
    var key = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || '';
    if (!key) return;
    // 仅允许 10 白名单 key
    if (WARNING_TAG_KEYS.indexOf(key) < 0) return;
    var cur = (this.data.adjustTags || []).slice();
    var pos = cur.indexOf(key);
    if (pos >= 0) cur.splice(pos, 1);
    else cur.push(key);
    this.setData({ adjustTags: cur });
  },

  onSummaryInput: function (e) {
    var v = (e && e.detail && e.detail.value) || '';
    this.setData({ adjustSummary: v.slice(0, 300) });
  },

  onTeacherNoteInput: function (e) {
    var v = (e && e.detail && e.detail.value) || '';
    this.setData({ adjustTeacherNote: v.slice(0, 500) });
  },

  // ===================================================================
  // 「确认 AI 结论」按钮：confirm 分支
  // ========== 🔴 合规红线：绝对不传 confirmedScores / confirmedWarningTags / confirmedSummary ==========
  // 后端 confirm 分支强制取 aiAnalysis.*
  // ===================================================================
  onTapConfirm: function () {
    var d = this.data.detailData;
    if (!d) return;
    if (d._isMsSecSkipped) {
      wx.showModal({
        title: '无法确认 AI 结论',
        content: '该条反馈因 msSec 违规已跳过 AI 分析，请使用「调整结论」人工填写审核结果。',
        showCancel: false, confirmText: '知道了'
      });
      return;
    }
    if (!d._hasAIAnalysis) {
      wx.showModal({
        title: '暂无 AI 分析',
        content: '该条反馈 AI 分析尚未生成，无法一键确认 AI 结论，请使用「调整结论」人工填写。',
        showCancel: false, confirmText: '知道了'
      });
      return;
    }
    var that = this;
    wx.showModal({
      title: '确认 AI 结论？',
      content: '将直接采用 AI 给出的分数 / 预警标签 / 摘要，后端将强制复用 aiAnalysis 并忽略前端传入的任何调整字段。',
      confirmText: '确认 AI 结论',
      cancelText: '取消',
      confirmColor: '#10B981',
      success: function (r) { if (r && r.confirm) that._doConfirm(); }
    });
  },

  _doConfirm: function () {
    var d = this.data.detailData;
    if (!d) return;
    var feedbackId = d._id;
    var that = this;
    wx.showLoading && wx.showLoading({ title: '提交中…', mask: true });

    // ======= 🔴 红线：不传 confirmedScores / confirmedWarningTags / confirmedSummary =======
    var params = {
      action: 'reviewAI',
      actionType: 'confirm',
      reviewAction: 'confirm',   // 兼容后端已有 reviewAction 字段
      feedbackId: feedbackId
      // confirmedScores: null,           ← 故意不传（留空让后端强制取 aiAnalysis）
      // confirmedWarningTags: null,      ← 故意不传
      // confirmedSummary: null,          ← 故意不传
      // teacherNote:                     ← 本按钮不提供 teacherNote，可在 adjust 中填
    };

    cloud.call('feedbackSubmit', params).then(function (r) {
      wx.hideLoading && wx.hideLoading();
      if (!r || r.code !== 0) throw r || { code: 500, msg: '提交失败' };
      wx.showModal({
        title: '已确认 AI 结论',
        content: '已确认 AI 结论，已同步到科研匿名数据集。',
        showCancel: false,
        confirmText: '好的',
        success: function () { that._afterReviewSuccess(); }
      });
    }).catch(function (err) {
      wx.hideLoading && wx.hideLoading();
      // 云端未就绪 → mock 成功演示
      that._mockReviewSuccess('confirm');
    });
  },

  // ===================================================================
  // 「保存调整」按钮：adjust 分支（传 5 维分数 *10 + 10 白名单 tags + summary + teacherNote）
  // ===================================================================
  onSubmitAdjust: function () {
    var d = this.data.detailData;
    if (!d) return;
    var that = this;
    var feedbackId = d._id;

    // 分数：0-10 → 0-100（后端标准）
    var confirmedScores = {};
    var hasScore = false;
    (this.data.adjustScores || []).forEach(function (s) {
      confirmedScores[s.key] = Number(s.value) * 10;
      if (Number(s.value) > 0) hasScore = true;
    });

    // 标签：二次规范到白名单
    var confirmedWarningTags = normalizeWarningTags(this.data.adjustTags || []);
    var confirmedSummary = String(this.data.adjustSummary || '').slice(0, 300);
    var teacherNote = String(this.data.adjustTeacherNote || '').slice(0, 500) || null;

    if (!hasScore && !confirmedWarningTags.length && !confirmedSummary.length) {
      wx.showToast({ title: '请至少填写分数或标签或摘要', icon: 'none' });
      return;
    }

    wx.showLoading && wx.showLoading({ title: '保存中…', mask: true });

    var params = {
      action: 'reviewAI',
      actionType: 'adjust',
      reviewAction: 'adjust',
      feedbackId: feedbackId,
      confirmedScores: confirmedScores,
      confirmedWarningTags: confirmedWarningTags,
      confirmedSummary: confirmedSummary,
      teacherNote: teacherNote
    };

    cloud.call('feedbackSubmit', params).then(function (r) {
      wx.hideLoading && wx.hideLoading();
      if (!r || r.code !== 0) throw r || { code: 500, msg: '保存失败' };
      wx.showToast({ title: '调整已保存', icon: 'success', duration: 1600 });
      that._afterReviewSuccess();
    }).catch(function (err) {
      wx.hideLoading && wx.hideLoading();
      that._mockReviewSuccess('adjust');
    });
  },

  _mockReviewSuccess: function (actionType) {
    // 云端不可用时：本地模拟成功，并刷新列表 mock 数据
    var d = this.data.detailData;
    if (!d) return;
    var that = this;
    if (actionType === 'confirm') {
      wx.showModal({
        title: '已确认 AI 结论（演示）',
        content: '已确认 AI 结论，已同步到科研匿名数据集。（接口未就绪，仅本地演示）',
        showCancel: false, confirmText: '好的',
        success: function () { that._mockMutateAndRefresh('confirmed'); }
      });
    } else {
      wx.showModal({
        title: '调整已保存（演示）',
        content: '您的人工调整已模拟保存。（接口未就绪，仅本地演示）',
        showCancel: false, confirmText: '好的',
        success: function () { that._mockMutateAndRefresh('adjusted'); }
      });
    }
  },

  _mockMutateAndRefresh: function (newStatus) {
    // 仅在 useMock=true 时把 rawList 中对应 feedback 标记为已审核
    if (!this.data.useMock) return;
    var d = this.data.detailData;
    if (!d) return;
    var that = this;
    var newList = this.data.rawList.map(function (fb) {
      if (fb._id === d._id) {
        var merged = Object.assign({}, fb);
        merged.teacherReview = Object.assign({}, fb.teacherReview || {}, {
          reviewStatus: newStatus,
          reviewedByAnonymousNo: '#T_DEMO',
          reviewedAt: Date.now()
        });
        merged.status = 'reviewed_normal';
        return merged;
      }
      return fb;
    });
    this._finishLoadList(newList.map(function (x) {
      // 去掉派生字段让 finish 重算
      var y = Object.assign({}, x);
      delete y._submitTimeStr; delete y._statusText; delete y._statusCls;
      delete y._warnTagsKeys; delete y._warnTagsLabels;
      return y;
    }), true);
    this.onCloseDetail();
  },

  _afterReviewSuccess: function () {
    var that = this;
    this.setData({ adjustPanelOpen: false });
    setTimeout(function () {
      that.onCloseDetail();
      that.loadList();
    }, 600);
  }
});
