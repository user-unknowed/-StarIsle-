// queryMyTasks 接口暂未就绪，当前前端走本地展示逻辑
//  - feedbackSubmit(action='queryMyTasks') 不存在 → 降级：展示本地 mock 任务 + imageOperate(listLibrary) 取系统图
//  - classOperate(action='listMyStudentClasses') 不存在 → 降级：读本地 Storage 已加入班级记录
//  - login(action='silentLoginIfValid') 不存在 → 降级：读 wx.getStorageSync('role') === 'student' 判定
var cloud = require('../../../utils/cloud.js');

// ====== 邀请码正则：不含 O/0/I/1 ======
var INVITE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{6}$/;

// ====== 本地 mock 任务（queryMyTasks 未就绪时使用）======
var MOCK_TASKS = [
  {
    _id: 'mock_task_001',
    title: '情绪投射练习 · 罗夏卡牌',
    instruction: '请仔细观察这张卡牌，写下它让你联想到的内容、情绪、故事。无需顾虑对错，真实表达即可。',
    teacherAnonymousNo: '#T000001',
    imageIds: ['mock_img_ro_01'],
    imageType: 'rorschach',
    publishTime: Date.now() - 86400000 * 2,
    deadline: Date.now() + 86400000 * 5,
    className: '心理测评·示范班'
  },
  {
    _id: 'mock_task_002',
    title: '主题统觉测验 · 情境卡',
    instruction: '观察图片，写一个完整的小故事：发生了什么？人物感受如何？接下来会怎样？',
    teacherAnonymousNo: '#T000002',
    imageIds: ['mock_img_tat_01'],
    imageType: 'tat',
    publishTime: Date.now() - 86400000 * 1,
    deadline: Date.now() + 86400000 * 7,
    className: '心理健康·通用班'
  }
];

// mock 图片占位（imageOperate getImageDetail 缺失时用）
var MOCK_IMG_MAP = {
  mock_img_ro_01: 'https://img.icons8.com/color/240/infinity.png',
  mock_img_tat_01: 'https://img.icons8.com/color/240/narrative.png'
};

Page({
  data: {
    tasks: [],
    loading: true,
    emptyHint: '',
    showJoinModal: false,
    inviteInput: '',
    showTaskModal: false,
    selectedTaskId: '',
    selectedTask: null,
    feedbackText: '',
    feedbackTextCount: 0,
    submitting: false,
    usingDemoData: false
  },

  onLoad: function () {
    this.loadTasks();
  },

  onShow: function () {
    // 从 profile 或 my-records 切回时刷新列表
    if (!this.data.loading) {
      this.loadTasks();
    }
    var tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && typeof tabBar.setRole === 'function') {
      tabBar.setRole('student');
    }
    if (tabBar && typeof tabBar.setData === 'function') {
      tabBar.setData({ selected: 0 });
    }
  },

  // ====== 拉取任务列表（多策略兜底）======
  loadTasks: function () {
    var that = this;
    this.setData({ loading: true });

    // 1) 判定学生身份（silentLoginIfValid 未就绪 → 本地 role 判断）
    var role = wx.getStorageSync('role') || '';
    if (role !== 'student') {
      // 非学生：尝试调 login jscode2session 静默续期（非阻塞）
      try {
        cloud.call('login', { action: 'jscode2session' }).catch(function () {});
      } catch (e) {}
    }

    // 2) 尝试 feedbackSubmit.queryMyTasks（不存在会返回 400 → catch 走降级）
    cloud.call('feedbackSubmit', { action: 'queryMyTasks' })
      .then(function (res) {
        if (res && res.code === 0 && res.data && Array.isArray(res.data.list) && res.data.list.length) {
          var list = that.filterTeacherPII(res.data.list);
          that.setData({ tasks: list, loading: false, emptyHint: '', usingDemoData: false });
        } else {
          that.tryFallbackTasks();
        }
      })
      .catch(function () {
        // 接口不存在或失败 → 降级
        that.tryFallbackTasks();
      });
  },

  // 降级：读本地 Storage 已加入班级 + mock 任务
  tryFallbackTasks: function () {
    var that = this;
    var joinedClasses = wx.getStorageSync('myJoinedClasses') || [];
    if (!joinedClasses.length) {
      that.setData({
        tasks: [],
        loading: false,
        emptyHint: '暂无任务，请先加入班级',
        usingDemoData: false
      });
      return;
    }
    // 读 imageOperate listLibrary（非阻塞，无图也继续）
    cloud.call('imageOperate', { action: 'listLibrary' })
      .then(function (imgRes) {
        var images = (imgRes && imgRes.code === 0 && Array.isArray(imgRes.data)) ? imgRes.data : [];
        that.applyMockTasks(joinedClasses, images);
      })
      .catch(function () {
        that.applyMockTasks(joinedClasses, []);
      });
  },

  applyMockTasks: function (classes, images) {
    var that = this;
    var classNames = classes.map(function (c) { return c.name; });
    var tasks = MOCK_TASKS.map(function (t, idx) {
      var clone = JSON.parse(JSON.stringify(t));
      clone.className = classNames[idx % classNames.length] || t.className;
      // 如有真实系统图，优先用第一张图替换 mock_img
      if (images && images.length) {
        var img = images[idx % images.length];
        clone.imageIds = [img._id || img.storageFileID || t.imageIds[0]];
      }
      return clone;
    });
    that.setData({
      tasks: tasks,
      loading: false,
      emptyHint: tasks.length ? '' : '暂无任务，请先加入班级',
      usingDemoData: true
    });
  },

  // ====== 教师 PII 过滤：删除敏感字段 ======
  filterTeacherPII: function (list) {
    return (list || []).map(function (t) {
      var safe = t && typeof t === 'object' ? JSON.parse(JSON.stringify(t)) : {};
      delete safe.teacherName;
      delete safe.teacherPhone;
      delete safe.teacherSchool;
      delete safe.teacherId;
      if (!safe.teacherAnonymousNo) safe.teacherAnonymousNo = '#T000000';
      return safe;
    });
  },

  // ====== 加入班级 入口 ======
  onTapJoinClass: function () {
    this.setData({ showJoinModal: true, inviteInput: '' });
  },

  onCloseJoinModal: function () {
    this.setData({ showJoinModal: false, inviteInput: '' });
  },

  onInviteInput: function (e) {
    var raw = e.detail.value || '';
    // 前端强制大写 + 去空格
    var up = raw.toUpperCase().replace(/\s/g, '');
    this.setData({ inviteInput: up });
  },

  onConfirmJoin: function () {
    var that = this;
    var code = (this.data.inviteInput || '').toUpperCase().replace(/\s/g, '');
    if (!INVITE_REGEX.test(code)) {
      wx.showToast({ title: '邀请码应为 6 位字母数字（不含 O/0/I/1）', icon: 'none', duration: 2500 });
      return;
    }
    wx.showLoading({ title: '加入中...', mask: true });
    cloud.call('classOperate', { action: 'joinClassByInvite', inviteCode: code })
      .then(function (res) {
        wx.hideLoading();
        if (!res || res.code !== 0) {
          wx.showToast({ title: (res && res.msg) || '邀请码无效', icon: 'none' });
          return;
        }
        var data = res.data || {};
        // 本地持久化加入班级记录
        var existing = wx.getStorageSync('myJoinedClasses') || [];
        if (data.class && data.class._id) {
          var dup = existing.some(function (c) { return c._id === data.class._id; });
          if (!dup) {
            // 强过滤：只保留非 PII 字段
            var safe = {
              _id: data.class._id,
              name: data.class.name,
              grade: data.class.grade || '',
              teacherAnonymousNo: data.class.teacherAnonymousNo || '#T000000',
              joinedAt: Date.now()
            };
            delete safe.teacherName;
            delete safe.teacherPhone;
            delete safe.teacherSchool;
            existing.unshift(safe);
            wx.setStorageSync('myJoinedClasses', existing);
          }
        }
        if (data.reason === 'already_member') {
          wx.showToast({ title: '您已在该班级中', icon: 'success' });
        } else {
          wx.showToast({ title: '加入成功', icon: 'success' });
        }
        that.setData({ showJoinModal: false, inviteInput: '' });
        that.loadTasks();
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.msg) || '网络异常', icon: 'none' });
      });
  },

  // ====== 任务卡片点击 → 详情弹层 ======
  onTapTaskCard: function (e) {
    var that = this;
    var taskId = e.currentTarget.dataset.id;
    var task = (this.data.tasks || []).find(function (t) { return t._id === taskId; });
    if (!task) return;
    this.setData({
      showTaskModal: true,
      selectedTaskId: taskId,
      selectedTask: task,
      feedbackText: '',
      feedbackTextCount: 0
    });
    // 异步尝试取图片详情（失败则继续展示占位图）
    var imgId = task.imageIds && task.imageIds[0];
    if (imgId && !MOCK_IMG_MAP[imgId]) {
      cloud.call('imageOperate', { action: 'getImageDetail', imageId: imgId })
        .then(function (res) {
          if (res && res.code === 0 && res.data) {
            var d = res.data;
            var full = that.data.selectedTask;
            full._resolvedImage = d.storageFileID || d.url || '';
            that.setData({ selectedTask: full });
          }
        })
        .catch(function () {});
    }
  },

  onCloseTaskModal: function () {
    this.setData({ showTaskModal: false, selectedTaskId: '', selectedTask: null });
  },

  onFeedbackTextInput: function (e) {
    var v = e.detail.value || '';
    this.setData({ feedbackText: v, feedbackTextCount: v.length });
  },

  // ====== 预览图片 ======
  onTapPreviewImage: function () {
    var task = this.data.selectedTask;
    if (!task) return;
    var url = MOCK_IMG_MAP[task.imageIds && task.imageIds[0]]
      || (task._resolvedImage)
      || 'https://img.icons8.com/color/240/image.png';
    wx.previewImage({ urls: [url], current: url });
  },

  // ====== 提交反馈 ======
  onSubmitFeedback: function () {
    var that = this;
    var text = (this.data.feedbackText || '').trim();
    if (!text) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    if (text.length < 20) {
      wx.showToast({ title: '反馈内容不少于 20 字', icon: 'none' });
      return;
    }
    var task = this.data.selectedTask;
    if (!task) return;
    var imageId = (task.imageIds && task.imageIds[0]) || 'mock_img_ro_01';

    this.setData({ submitting: true });

    cloud.call('feedbackSubmit', {
      action: 'submitFeedback',
      taskId: task._id,
      imageFeedbacks: [{ imageId: imageId, text: text }]
    })
      .then(function (res) {
        that.setData({ submitting: false });
        if (!res || res.code !== 0) {
          wx.showToast({ title: (res && res.msg) || '提交失败', icon: 'none' });
          return;
        }
        // 成功 → 写本地 myFeedbackRecords 给 my-records 页降级使用
        var records = wx.getStorageSync('myFeedbackRecords') || [];
        records.unshift({
          _id: (res.data && res.data.feedbackId) || ('local_' + Date.now()),
          taskId: task._id,
          taskTitle: task.title,
          submitTime: Date.now(),
          content: text,
          imageId: imageId,
          warning_tags: [],
          teacherReview: { reviewStatus: 'pending_review' },
          aiAnalysis: null
        });
        wx.setStorageSync('myFeedbackRecords', records.slice(0, 500));

        wx.showToast({ title: '已提交，请等待 AI 分析（通常 1~3 分钟）', icon: 'none', duration: 3000 });
        that.setData({
          showTaskModal: false,
          selectedTaskId: '',
          selectedTask: null,
          feedbackText: '',
          feedbackTextCount: 0
        });
      })
      .catch(function (err) {
        that.setData({ submitting: false });
        wx.showToast({ title: (err && err.msg) || '网络异常，提交失败', icon: 'none' });
      });
  }
});
