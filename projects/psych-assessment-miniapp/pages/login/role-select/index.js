// pages/login/role-select/index.js
const auth = require('../../../utils/auth.js');

Page({
  data: {
    loading: false,
    aboutShow: false,
    /** 合规入口（单入口，避免用户协议/隐私政策重复按钮） */
    aboutLinks: [
      { key: 'terms', title: '用户协议', url: 'https://example.com/legal/terms.html' },
      { key: 'privacy', title: '隐私政策', url: 'https://example.com/legal/privacy.html' }
    ]
  },

  onChooseRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role !== 'student' && role !== 'teacher') return;
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: role === 'student' ? '正在以学生身份登录…' : '正在以教师身份登录…', mask: true });

    auth.loginWithCode(role, {})
      .then((user) => {
        wx.hideLoading();
        const app = getApp();
        // 教师 pending → 跳审核中占位页；其余进主页并按角色切 TabBar
        if (user && user.role === 'teacher' && user.teacherStatus !== 'approved') {
          wx.reLaunch({ url: '/pages/login/teacher-pending' });
          return;
        }
        if (app && typeof app.switchTabBarByRole === 'function') {
          app.switchTabBarByRole(user ? user.role : role);
        }
        // 管理员/学生/已通过教师 → 跳对应主页
        let home = '/pages/student/task-hall';
        if (user && user.role === 'teacher') home = '/pages/teacher/dashboard';
        else if (user && user.role === 'admin') home = '/pages/admin/ops-overview';
        wx.reLaunch({ url: home });
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ loading: false });
        const msg = (err && err.msg) || '登录失败，请重试';
        wx.showModal({
          title: '登录提示',
          content: msg,
          showCancel: false,
          confirmText: '知道了'
        });
      });
  },

  openAbout() {
    this.setData({ aboutShow: true });
  },

  closeAbout() {
    this.setData({ aboutShow: false });
  },

  openLegal(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    // 合规：用内嵌 web-view 预览；真实部署可改为 wx.navigateTo 到承载 web-view 的壳页
    try {
      wx.setClipboardData({
        data: url,
        success: () => wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' })
      });
    } catch (e) {
      wx.showToast({ title: '无法打开链接', icon: 'none' });
    }
  }
});
