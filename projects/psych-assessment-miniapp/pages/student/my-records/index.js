// 学生端 我的反馈 页面
// 接口降级清单：
//   - feedbackSubmit(action='queryMyFeedbacks') 暂未就绪 → 读本地 Storage 'myFeedbackRecords'
//   - 详情：teacherNote 字段永远不渲染（学生端不应看到教师备注）
var cloud = require('../../../utils/cloud.js');

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatTime(ts) {
  if (!ts) return '-';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function reviewText(status) {
  switch (status) {
    case 'confirmed': return '已确认';
    case 'adjusted': return '已调整';
    case 'pending_review':
    case 'pending':
    default: return '待审核';
  }
}

Page({
  data: {
    records: [],
    loading: true,
    emptyHint: '',
    usingLocalDemo: false,
    showDetailModal: false,
    selectedRecord: null
  },

  onLoad: function () {
    this.loadRecords();
  },

  onShow: function () {
    if (!this.data.loading) this.loadRecords();
    var tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && typeof tabBar.setRole === 'function') tabBar.setRole('student');
    if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 1 });
  },

  loadRecords: function () {
    var that = this;
    this.setData({ loading: true });

    cloud.call('feedbackSubmit', { action: 'queryMyFeedbacks' })
      .then(function (res) {
        if (res && res.code === 0 && res.data && Array.isArray(res.data.list) && res.data.list.length) {
          var list = that.sanitizeRecords(res.data.list);
          that.setData({
            records: list,
            loading: false,
            emptyHint: '',
            usingLocalDemo: false
          });
        } else {
          that.useLocalFallback();
        }
      })
      .catch(function () {
        that.useLocalFallback();
      });
  },

  // 降级：读本地 Storage
  useLocalFallback: function () {
    var raw = wx.getStorageSync('myFeedbackRecords') || [];
    var list = this.sanitizeRecords(raw);
    list.sort(function (a, b) {
      return (b.submitTime || 0) - (a.submitTime || 0);
    });
    this.setData({
      records: list,
      loading: false,
      emptyHint: list.length ? '' : '您还没有提交过反馈，前往「任务大厅」开始吧',
      usingLocalDemo: !!list.length
    });
  },

  sanitizeRecords: function (list) {
    var that = this;
    return (list || []).map(function (r) {
      var safe = r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : {};
      // 教师 PII 强制过滤
      delete safe.teacherName;
      delete safe.teacherPhone;
      delete safe.teacherSchool;
      delete safe.reviewedByTeacherId;
      // 学生端绝对不可见 teacherNote
      if (safe.teacherReview) {
        delete safe.teacherReview.teacherNote;
        delete safe.teacherReview.reviewedByTeacherId;
      }
      // reviewStatus 映射为三色状态
      var status = (safe.teacherReview && safe.teacherReview.reviewStatus) || 'pending_review';
      safe._reviewStatus = status;
      safe._reviewText = reviewText(status);
      safe._reviewClass = status === 'confirmed' ? 'green'
        : status === 'adjusted' ? 'orange' : 'gray';
      // AI warning_tags
      var tags = [];
      if (safe.aiAnalysis && Array.isArray(safe.aiAnalysis.warning_tags) && safe.aiAnalysis.warning_tags.length) {
        tags = safe.aiAnalysis.warning_tags.slice();
      } else if (safe.teacherReview && Array.isArray(safe.teacherReview.confirmedWarningTags)) {
        tags = safe.teacherReview.confirmedWarningTags.slice();
      }
      safe._warningTags = tags;
      safe._warningCount = tags.length;
      // 时间格式化
      safe._submitTimeText = formatTime(safe.submitTime);
      // 预览文案
      safe._preview = '';
      if (typeof safe.content === 'string' && safe.content) {
        safe._preview = safe.content.slice(0, 60);
      } else if (safe.imageFeedbacks && safe.imageFeedbacks[0] && safe.imageFeedbacks[0].text) {
        safe._preview = safe.imageFeedbacks[0].text.slice(0, 60);
      }
      // summary
      safe._aiSummary = '';
      if (safe.aiAnalysis && safe.aiAnalysis.summary) safe._aiSummary = safe.aiAnalysis.summary;
      else if (safe.teacherReview && safe.teacherReview.confirmedSummary) safe._aiSummary = safe.teacherReview.confirmedSummary;
      return safe;
    });
  },

  onTapRecord: function (e) {
    var id = e.currentTarget.dataset.id;
    var rec = (this.data.records || []).find(function (r) { return r._id === id; });
    if (!rec) return;
    // 详情二次强过滤 teacherNote（绝不渲染）
    var safeDetail = JSON.parse(JSON.stringify(rec));
    if (safeDetail.teacherReview) delete safeDetail.teacherReview.teacherNote;
    this.setData({ showDetailModal: true, selectedRecord: safeDetail });
  },

  onCloseDetail: function () {
    this.setData({ showDetailModal: false, selectedRecord: null });
  }
});
