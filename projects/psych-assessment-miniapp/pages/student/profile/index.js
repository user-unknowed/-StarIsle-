// 学生端 个人中心
// 接口降级清单：
//   - login(action='updateProfile') 暂未提供 → 昵称用 wx.setStorageSync('localNickname', x) 本地暂存
//   - classOperate(action='listMyStudentClasses') 暂未提供 → 读本地 Storage 'myJoinedClasses'
//   - 退出登录：wx.clearStorageSync() 一次性清空 → wx.reLaunch 跳 role-select
var cloud = require('../../../utils/cloud.js');

Page({
  data: {
    anonymousNo: '#S000000',
    nickname: '',
    nicknameEditing: false,
    nicknameInput: '',
    classes: [],
    classesLoading: false,
    emptyClassHint: ''
  },

  onLoad: function () {
    this.loadProfile();
  },

  onShow: function () {
    this.loadClasses();
    var tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && typeof tabBar.setRole === 'function') tabBar.setRole('student');
    if (tabBar && typeof tabBar.setData === 'function') tabBar.setData({ selected: 2 });
  },

  loadProfile: function () {
    var that = this;
    // 1) 先从本地 loginUser / storage 取 anonymousNo
    var loginUser = wx.getStorageSync('loginUser') || {};
    var currentAnon = (loginUser && loginUser.anonymousNo)
      || wx.getStorageSync('anonymousNo')
      || '#S000000';

    // 2) 昵称：后端若未有 updateProfile 接口 → 本地 localNickname
    var localNick = wx.getStorageSync('localNickname')
      || (loginUser && loginUser.nickname)
      || '';

    that.setData({
      anonymousNo: currentAnon,
      nickname: localNick,
      nicknameInput: localNick
    });

    // 3) 异步尝试 jscode2session 刷新用户信息（非阻塞）
    try {
      cloud.call('login', { action: 'jscode2session' })
        .then(function (res) {
          if (res && res.code === 0 && res.data && res.data.user) {
            var u = res.data.user;
            var patch = {};
            if (u.anonymousNo) {
              patch.anonymousNo = u.anonymousNo;
              wx.setStorageSync('anonymousNo', u.anonymousNo);
            }
            // 若后端返回了 nickname 且本地无优先值，使用后端
            if (!wx.getStorageSync('localNickname') && u.nickname) {
              patch.nickname = u.nickname;
              patch.nicknameInput = u.nickname;
            }
            wx.setStorageSync('loginUser', u);
            if (Object.keys(patch).length) that.setData(patch);
          }
        })
        .catch(function () {});
    } catch (e) {}

    this.loadClasses();
  },

  loadClasses: function () {
    var that = this;
    this.setData({ classesLoading: true });
    cloud.call('classOperate', { action: 'listMyStudentClasses' })
      .then(function (res) {
        if (res && res.code === 0 && Array.isArray(res.data) && res.data.length) {
          var list = that.sanitizeClasses(res.data);
          wx.setStorageSync('myJoinedClasses', list);
          that.setData({
            classes: list,
            classesLoading: false,
            emptyClassHint: list.length ? '' : '尚未加入任何班级'
          });
        } else {
          that.useLocalClasses();
        }
      })
      .catch(function () {
        that.useLocalClasses();
      });
  },

  useLocalClasses: function () {
    var local = wx.getStorageSync('myJoinedClasses') || [];
    var list = this.sanitizeClasses(local);
    this.setData({
      classes: list,
      classesLoading: false,
      emptyClassHint: list.length
        ? ''
        : '尚未加入任何班级，请前往「任务大厅」输入邀请码加入'
    });
  },

  sanitizeClasses: function (list) {
    return (list || []).map(function (c) {
      var safe = c && typeof c === 'object' ? JSON.parse(JSON.stringify(c)) : {};
      // 学生端：教师信息只保留 anonymousNo
      delete safe.teacherName;
      delete safe.teacherPhone;
      delete safe.teacherSchool;
      delete safe.teacherId;
      if (!safe.teacherAnonymousNo) safe.teacherAnonymousNo = '#T000000';
      return safe;
    });
  },

  // ===== 昵称编辑 =====
  onTapEditNickname: function () {
    this.setData({
      nicknameEditing: true,
      nicknameInput: this.data.nickname
    });
  },

  onNicknameInput: function (e) {
    this.setData({ nicknameInput: (e.detail.value || '').slice(0, 40) });
  },

  onCancelEditNickname: function () {
    this.setData({
      nicknameEditing: false,
      nicknameInput: this.data.nickname
    });
  },

  onSaveNickname: function () {
    var that = this;
    var val = (this.data.nicknameInput || '').trim();
    if (!val) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (val.length > 40) {
      wx.showToast({ title: '昵称不得超过 40 字', icon: 'none' });
      return;
    }

    // 尝试调 login.updateProfile（若存在）；不存在时本地存
    cloud.call('login', { action: 'updateProfile', nickname: val })
      .then(function (res) {
        if (res && res.code === 0) {
          that.finalizeSaveNickname(val, true);
        } else {
          that.finalizeSaveNickname(val, false);
        }
      })
      .catch(function () {
        that.finalizeSaveNickname(val, false);
      });
  },

  finalizeSaveNickname: function (val, synced) {
    wx.setStorageSync('localNickname', val);
    // 同步更新本地 loginUser.nickname（若有）
    var loginUser = wx.getStorageSync('loginUser');
    if (loginUser && typeof loginUser === 'object') {
      loginUser.nickname = val;
      wx.setStorageSync('loginUser', loginUser);
    }
    this.setData({
      nickname: val,
      nicknameEditing: false
    });
    if (synced) {
      wx.showToast({ title: '昵称已保存', icon: 'success' });
    } else {
      // 诚实：不伪造云端同步
      wx.showToast({ title: '昵称已本地保存，正式版将同步云端', icon: 'none', duration: 2500 });
    }
  },

  // ===== 退出登录 =====
  onTapLogout: function () {
    var that = this;
    wx.showModal({
      title: '确认退出？',
      content: '退出后需重新登录',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#DC2626',
      success: function (res) {
        if (res.confirm) {
          that.doLogout();
        }
      }
    });
  },

  doLogout: function () {
    try {
      // 一次性清空所有本地缓存（role/session/loginUser/localNickname 等）
      wx.clearStorageSync();
    } catch (e) {
      // 兜底：关键键单独清除
      try {
        wx.removeStorageSync('role');
        wx.removeStorageSync('session');
        wx.removeStorageSync('loginUser');
        wx.removeStorageSync('localNickname');
        wx.removeStorageSync('token');
        wx.removeStorageSync('anonymousNo');
        wx.removeStorageSync('myJoinedClasses');
        wx.removeStorageSync('myFeedbackRecords');
      } catch (_) {}
    }
    wx.showToast({ title: '已退出登录', icon: 'success', duration: 1500 });
    setTimeout(function () {
      wx.reLaunch({ url: '/pages/login/role-select' });
    }, 1200);
  }
});
