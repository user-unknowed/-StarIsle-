// app.js
const platform = require('./utils/platform.js');
const auth = require('./utils/auth.js');

App({
  globalData: {
    platform: 'unknown',      // android / ios / harmony / harmony-next
    isHarmonyNext: false,
    currentUser: null,        // { _id, role, anonymousNo, teacherStatus ... }
    cloudEnv: 'REPLACE_WITH_YOUR_CLOUD_ENV_ID'
  },

  onLaunch(options) {
    // 1. 初始化云开发（云环境 ID 在部署阶段替换）
    if (!wx.cloud) {
      wx.showModal({ title: '微信版本过低', content: '请升级微信到最新版后重试', showCancel: false });
      return;
    }
    wx.cloud.init({ env: this.globalData.cloudEnv, traceUser: true });

    // 2. 平台检测
    const p = platform.detect();
    this.globalData.platform = p.name;
    this.globalData.isHarmonyNext = !!p.isHarmonyNext;

    // 3. 纯血鸿蒙 NEXT：优雅降级
    if (p.isHarmonyNext) {
      wx.cloud.callFunction({
        name: 'login',
        data: { action: 'logIncompatibility', sys: p.raw }
      }).catch(function () { /* 即使云函数未部署也不阻塞提示 */ });
      wx.showModal({
        title: '暂不支持纯血鸿蒙',
        editable: false,
        showCancel: false,
        content: '当前微信版本尚未在纯血鸿蒙发布小程序运行时。请使用安卓/iOS/兼容版鸿蒙设备，我们会在微信官方适配后第一时间支持。',
        confirmText: '知道了'
      });
      return;
    }

    // 4. 会话尝试读取（双存储）
    const session = auth.getLoginSession();
    if (session) {
      this.globalData.currentUser = session.user;
    }

    // 5. 鸿蒙：额外 checkSession 强制校验
    if (p.name === 'harmony') {
      wx.checkSession({
        fail: function () { auth.forceRelogin(); },
        success: function () { if (!session) auth.forceRelogin(); }
      });
    }
  },

  // 动态切换学生/教师/管理员底部 TabBar（通过自定义TabBar组件实现）
  switchTabBarByRole(role) {
    if (role === 'student') {
      var tabBar = this.getTabBar && this.getTabBar();
      if (tabBar && typeof tabBar.setRole === 'function') tabBar.setRole('student');
    } else if (role === 'teacher') {
      var tabBar2 = this.getTabBar && this.getTabBar();
      if (tabBar2 && typeof tabBar2.setRole === 'function') tabBar2.setRole('teacher');
    } else if (role === 'admin') {
      var tabBar3 = this.getTabBar && this.getTabBar();
      if (tabBar3 && typeof tabBar3.setRole === 'function') tabBar3.setRole('admin');
    }
  }
});
