// pages/teacher/class-manage/index.js
// 教师端 · 班级管理
// 功能：
//   · onLoad → classOperate(action=listMyClasses) 加载本人班级
//   · 创建新班级：输入 name + grade → action=createClass → 生成 6 位邀请码
//   · 邀请码胶囊 + 复制按钮（wx.setClipboardData）
//   · 重置邀请码按钮：action=resetInviteCode → 旧码立即作废
//   · 展开学生列表 + 移除学生：action=removeStudent → 弹层提示"保留历史匿名反馈"
//   · 删除班级：action=removeClass → 若 tasks 引用（409）toast "该班已有任务…先解除任务"

var cloud = require('../../../utils/cloud.js');

Page({
  data: {
    classList: [],
    loading: false,
    errorMsg: '',
    errorCode: '',
    newClassName: '',
    newClassGrade: '',
    expandedClassId: ''
  },

  onLoad: function () {
    this.refreshClasses();
  },

  onShow: function () {
    this.refreshClasses();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.refreshClasses(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  // ========== 输入绑定 ==========
  onNewClassNameInput: function (e) {
    this.setData({ newClassName: e.detail.value });
  },
  onNewClassGradeInput: function (e) {
    this.setData({ newClassGrade: e.detail.value });
  },

  // ========== 加载班级列表 ==========
  refreshClasses: function (done) {
    var that = this;
    that.setData({ loading: true, errorMsg: '', errorCode: '' });
    cloud.call('classOperate', { action: 'listMyClasses' })
      .then(function (r) {
        if (!r || r.code !== 0) throw r || { code: 500, msg: '加载失败' };
        that.setData({
          classList: r.data || [],
          loading: false
        });
        done && done();
      })
      .catch(function (err) {
        that.setData({
          loading: false,
          errorMsg: (err && err.msg) || '加载失败',
          errorCode: (err && err.code) || ''
        });
        done && done();
      });
  },

  // ========== 展开/收起学生列表 ==========
  onToggleStudents: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var cid = ds.classId;
    if (!cid) return;
    var next = this.data.expandedClassId === cid ? '' : cid;
    this.setData({ expandedClassId: next });
  },

  // ========== 创建班级 ==========
  onCreateClass: function () {
    var that = this;
    var name = String(this.data.newClassName || '').trim();
    var grade = String(this.data.newClassGrade || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写班级名称', icon: 'none' });
      return;
    }
    wx.showLoading && wx.showLoading({ title: '创建中…', mask: true });
    cloud.call('classOperate', {
      action: 'createClass',
      name: name,
      grade: grade
    }).then(function (r) {
      wx.hideLoading && wx.hideLoading();
      if (!r || r.code !== 0) throw r || { code: 500, msg: '创建失败' };
      var data = r.data || {};
      that.setData({
        newClassName: '',
        newClassGrade: '',
        expandedClassId: data.classId || ''
      });
      wx.showModal({
        title: '班级创建成功',
        content: '邀请码：' + (data.inviteCode || '') + '\n将邀请码分享给学生加入班级',
        confirmText: '复制邀请码',
        cancelText: '知道了',
        confirmColor: '#6366F1',
        success: function (res) {
          if (res && res.confirm && data.inviteCode) {
            that._copyToClipboard(data.inviteCode, '邀请码已复制');
          }
          that.refreshClasses();
        }
      });
    }).catch(function (err) {
      wx.hideLoading && wx.hideLoading();
      var msg = (err && err.msg) || '创建失败';
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  // ========== 复制邀请码 ==========
  onCopyInviteCode: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var code = ds.code;
    if (!code) return;
    this._copyToClipboard(code, '邀请码 ' + code + ' 已复制');
  },
  _copyToClipboard: function (text, toastMsg) {
    try {
      wx.setClipboardData({
        data: text,
        success: function () {
          wx.showToast({ title: toastMsg || '已复制', icon: 'success' });
        },
        fail: function () {
          wx.showToast({ title: '复制失败', icon: 'none' });
        }
      });
    } catch (e) {
      wx.showToast({ title: '复制失败', icon: 'none' });
    }
  },

  // ========== 重置邀请码 ==========
  onResetInviteCode: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var cid = ds.classId;
    if (!cid) return;
    wx.showModal({
      title: '重置班级邀请码？',
      content: '旧邀请码将立即作废，学生需使用新邀请码加入。',
      confirmColor: '#6366F1',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '重置中…', mask: true });
        cloud.call('classOperate', { action: 'resetInviteCode', classId: cid })
          .then(function (r) {
            wx.hideLoading && wx.hideLoading();
            if (!r || r.code !== 0) throw r || { code: 500, msg: '重置失败' };
            var newCode = (r.data && r.data.inviteCode) || '';
            wx.showModal({
              title: '新邀请码已生成',
              content: '新邀请码：' + newCode + '\n旧码已作废，请将新码分享给学生。',
              confirmText: '复制新码',
              cancelText: '知道了',
              confirmColor: '#6366F1',
              success: function (mRes) {
                if (mRes && mRes.confirm) {
                  that._copyToClipboard(newCode, '新邀请码已复制');
                }
                that.refreshClasses();
              }
            });
          })
          .catch(function (err) {
            wx.hideLoading && wx.hideLoading();
            var msg = (err && err.msg) || '重置失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  },

  // ========== 移除学生 ==========
  onRemoveStudent: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var cid = ds.classId;
    var sid = ds.studentId;
    var sIdx = ds.studentIndex || 1;
    if (!cid || !sid) return;
    wx.showModal({
      title: '移除第 ' + sIdx + ' 号学生？',
      content: '移除后该学生仅不可再接新任务；此前该学生的匿名反馈与历史数据将保留（用于数据合规追溯）。',
      confirmText: '确认移除',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '移除中…', mask: true });
        cloud.call('classOperate', {
          action: 'removeStudent',
          classId: cid,
          studentId: sid
        }).then(function (r) {
          wx.hideLoading && wx.hideLoading();
          if (!r) throw { code: 500, msg: '无返回' };
          if (r.code !== 0) throw r;
          wx.showToast({
            title: '已移除，历史反馈保留',
            icon: 'none',
            duration: 2400
          });
          that.refreshClasses();
        }).catch(function (err) {
          wx.hideLoading && wx.hideLoading();
          var msg = (err && err.msg) || '移除失败';
          wx.showToast({ title: msg, icon: 'none' });
        });
      }
    });
  },

  // ========== 删除班级 ==========
  onDeleteClass: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var cid = ds.classId;
    var cname = ds.className || '该班级';
    if (!cid) return;
    wx.showModal({
      title: '删除「' + cname + '」？',
      content: '⚠️ 若该班已有任务引用，将无法删除（409 Conflict），请先解除任务或关闭任务后再删除。删除后不可恢复。',
      confirmText: '确认删除',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '删除中…', mask: true });
        cloud.call('classOperate', { action: 'removeClass', classId: cid })
          .then(function (r) {
            wx.hideLoading && wx.hideLoading();
            if (!r) throw { code: 500, msg: '无返回' };
            if (r.code === 409) {
              // 冲突：后端返回 message + taskNames
              var extra = r.taskNames ? '\n涉及任务：' + r.taskNames : '';
              wx.showToast({
                title: (r.msg || '该班已有任务，先解除任务') + extra,
                icon: 'none',
                duration: 3200
              });
              return;
            }
            if (r.code !== 0) throw r;
            wx.showToast({ title: '班级已删除', icon: 'success' });
            that.setData({ expandedClassId: '' });
            that.refreshClasses();
          })
          .catch(function (err) {
            wx.hideLoading && wx.hideLoading();
            var msg = (err && err.msg) || '删除失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  }
});
