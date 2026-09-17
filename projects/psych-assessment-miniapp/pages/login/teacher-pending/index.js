// pages/login/teacher-pending/index.js
const auth = require('../../../utils/auth.js');
const cloud = require('../../../utils/cloud.js');

Page({
  data: {
    teacherStatus: 'pending',   // pending / rejected / approved
    rejectionReason: '',
    waitingDays: 2,
    refreshing: false,
    submitting: false,
    /** 重新提交表单 */
    showResubmitForm: false,
    form: { name: '', school: '', teacherCertNo: '' }
  },

  onShow() {
    this.queryApprovalStatus(true);
  },

  /** 下拉刷新：调用 queryApprovalStatus */
  onPullDownRefresh() {
    this.queryApprovalStatus(false).then(() => wx.stopPullDownRefresh());
  },

  queryApprovalStatus(silent) {
    if (!silent) this.setData({ refreshing: true });
    return cloud.call('login', { action: 'queryApprovalStatus' })
      .then((r) => {
        if (r.code !== 0) throw r;
        const data = r.data || {};
        const patch = {
          teacherStatus: data.teacherStatus || 'pending',
          rejectionReason: data.rejectionReason || '',
          waitingDays: typeof data.waitingDays === 'number' ? data.waitingDays : 2
        };
        // 若已通过 → 跳转教师主页
        if (patch.teacherStatus === 'approved') {
          this.setData(patch);
          wx.showToast({ title: '审核已通过', icon: 'success' });
          const app = getApp();
          if (app && typeof app.switchTabBarByRole === 'function') app.switchTabBarByRole('teacher');
          wx.reLaunch({ url: '/pages/teacher/dashboard' });
          return;
        }
        this.setData(patch);
        if (!silent) this.setData({ refreshing: false });
      })
      .catch((err) => {
        this.setData({ refreshing: false });
        const msg = (err && err.msg) || '查询失败，请重试';
        if (msg.indexOf('登录态') !== -1) {
          auth.forceRelogin();
          return;
        }
        if (!silent) wx.showToast({ title: msg, icon: 'none' });
      });
  },

  onTapRefreshButton() {
    wx.showLoading({ title: '查询审核状态…', mask: true });
    this.queryApprovalStatus(true).then(() => wx.hideLoading()).catch(() => wx.hideLoading());
  },

  openResubmit() {
    if (this.data.teacherStatus !== 'rejected') {
      wx.showToast({ title: '只有被驳回才能重新提交', icon: 'none' });
      return;
    }
    this.setData({ showResubmitForm: true });
  },

  closeResubmit() {
    this.setData({ showResubmitForm: false });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value || '';
    const patch = {};
    patch['form.' + key] = val;
    this.setData(patch);
  },

  submitResubmit() {
    const f = this.data.form || {};
    if (!f.name || f.name.trim().length < 2) return wx.showToast({ title: '请填写真实姓名', icon: 'none' });
    if (!f.school || f.school.trim().length < 2) return wx.showToast({ title: '请填写所在学校', icon: 'none' });
    if (!f.teacherCertNo || f.teacherCertNo.trim().length < 6) return wx.showToast({ title: '请填写教师资格证号', icon: 'none' });
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: '正在提交…', mask: true });
    cloud.call('login', {
      action: 'resubmitTeacherApproval',
      name: f.name.trim(),
      school: f.school.trim(),
      teacherCertNo: f.teacherCertNo.trim()
    }).then((r) => {
      wx.hideLoading();
      this.setData({ submitting: false });
      if (r.code !== 0) throw r;
      wx.showToast({ title: '已提交，等待审核', icon: 'success' });
      this.setData({
        showResubmitForm: false,
        teacherStatus: 'pending',
        rejectionReason: '',
        form: { name: '', school: '', teacherCertNo: '' }
      });
    }).catch((err) => {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showModal({
        title: '提交失败',
        content: (err && err.msg) || '请稍后重试',
        showCancel: false
      });
    });
  },

  switchToStudent() {
    wx.showModal({
      title: '切换为学生角色',
      content: '将以学生身份继续使用，教师资质审核会在后台继续进行。确定切换？',
      success: (r) => {
        if (!r.confirm) return;
        // 先清登录态 → 回 role-select 让用户选学生
        auth.forceRelogin();
      }
    });
  }
});
