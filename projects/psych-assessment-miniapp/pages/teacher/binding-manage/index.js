// pages/teacher/binding-manage/index.js
// 教师端 · 一对一学生绑定管理
// 功能：
//   · onLoad → classOperate(action=listMyBindings) 加载本人全部绑定（有效 + 历史）
//   · 新增绑定：输入 studentAnonymousNo（#S000000 精确匹配）+ reason ≤300
//       → action=createBinding → 404 学生不存在 / 409 已绑定
//   · 当前有效 Tab：展示 validUntil=null 的绑定 → 解绑按钮
//       → action=removeBinding → 弹层提示"解绑将归档该绑定下所有状态标签历史快照"
//   · 历史解绑 Tab：展示 validUntil!==null 的归档记录（只读）

var cloud = require('../../../utils/cloud.js');

Page({
  data: {
    activeTab: 'active',    // 'active' | 'archived'
    activeList: [],
    archivedList: [],
    activeCount: 0,
    archivedCount: 0,
    loading: false,
    errorMsg: '',
    errorCode: '',
    searchAnonymousNo: '',
    bindingReason: '',
    reasonLen: 0
  },

  onLoad: function () {
    this.refreshBindings();
  },

  onShow: function () {
    this.refreshBindings();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.refreshBindings(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  // ========== 输入绑定 ==========
  onSearchAnonymousNoInput: function (e) {
    var val = e.detail.value || '';
    // 自动补 #S 前缀（若用户只输数字）
    if (/^\d+$/.test(val) && val.length <= 6) {
      val = '#S' + ('000000' + val).slice(-6);
    } else if (/^s\d+$/i.test(val)) {
      var digits = val.slice(1);
      val = '#S' + ('000000' + digits).slice(-6);
    }
    this.setData({ searchAnonymousNo: val });
  },
  onBindingReasonInput: function (e) {
    var val = e.detail.value || '';
    this.setData({
      bindingReason: val,
      reasonLen: String(val).length
    });
  },

  // ========== 切换 Tab ==========
  onSwitchTab: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var tab = ds.tab;
    if (!tab) return;
    this.setData({ activeTab: tab, errorMsg: '', errorCode: '' });
  },

  // ========== 时间格式化工具 ==========
  _fmtTime: function (ts) {
    if (!ts) return '-';
    try {
      var d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '-';
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    } catch (e) { return '-'; }
  },

  // ========== 加载绑定列表 ==========
  refreshBindings: function (done) {
    var that = this;
    that.setData({ loading: true, errorMsg: '', errorCode: '' });
    cloud.call('classOperate', { action: 'listMyBindings' })
      .then(function (r) {
        if (!r || r.code !== 0) throw r || { code: 500, msg: '加载失败' };
        var all = r.data || [];
        var actives = [];
        var archived = [];
        all.forEach(function (b) {
          var enriched = Object.assign({}, b, {
            createdAtText: that._fmtTime(b.createdAt),
            validFromText: that._fmtTime(b.validFrom || b.createdAt),
            validUntilText: that._fmtTime(b.validUntil)
          });
          if (b.validUntil === null || b.validUntil === undefined || b.validUntil === 0) {
            actives.push(enriched);
          } else {
            archived.push(enriched);
          }
        });
        that.setData({
          activeList: actives,
          archivedList: archived,
          activeCount: actives.length,
          archivedCount: archived.length,
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

  // ========== 新增绑定 ==========
  onCreateBinding: function () {
    var that = this;
    var anon = String(this.data.searchAnonymousNo || '').trim();
    var reason = String(this.data.bindingReason || '').trim();

    // 前端格式预校验（后端再严格校验一次）
    if (!anon) {
      wx.showToast({ title: '请填写学生匿名编号', icon: 'none' });
      return;
    }
    if (!/^#S\d{6}$/.test(anon)) {
      wx.showToast({ title: '编号格式应为 #S + 6 位数字，如 #S000001', icon: 'none', duration: 2600 });
      return;
    }
    if (!reason) {
      wx.showToast({ title: '请填写绑定理由', icon: 'none' });
      return;
    }
    if (reason.length > 300) {
      wx.showToast({ title: '绑定理由不得超过 300 字', icon: 'none' });
      return;
    }

    wx.showLoading && wx.showLoading({ title: '绑定中…', mask: true });
    cloud.call('classOperate', {
      action: 'createBinding',
      studentAnonymousNo: anon,
      reason: reason
    }).then(function (r) {
      wx.hideLoading && wx.hideLoading();
      if (!r) throw { code: 500, msg: '无返回' };
      if (r.code === 404) {
        wx.showModal({
          title: '未找到学生',
          content: (r.msg || '学生匿名编号不存在') + '\n请确认编号是否正确（注意区分大小写，必须为 #S 加 6 位数字）。',
          showCancel: false,
          confirmColor: '#6366F1'
        });
        return;
      }
      if (r.code === 409) {
        wx.showToast({
          title: r.msg || '该学生已绑定，无需重复操作',
          icon: 'none',
          duration: 2400
        });
        return;
      }
      if (r.code !== 0) throw r;

      that.setData({
        searchAnonymousNo: '',
        bindingReason: '',
        reasonLen: 0,
        activeTab: 'active'
      });
      wx.showToast({ title: '绑定成功', icon: 'success' });
      that.refreshBindings();
    }).catch(function (err) {
      wx.hideLoading && wx.hideLoading();
      var msg = (err && err.msg) || '绑定失败';
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  // ========== 解绑（归档） ==========
  onRemoveBinding: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var bid = ds.bindingId;
    var sAnon = ds.studentAnon || '该学生';
    if (!bid) return;
    wx.showModal({
      title: '解绑 ' + sAnon + '？',
      content: '⚠️ 解绑将归档原绑定下的所有状态标签历史快照（validUntil 置为失效），用于科研追溯。解绑后若需重新绑定可再次发起。',
      confirmText: '确认解绑并归档',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '解绑归档中…', mask: true });
        cloud.call('classOperate', {
          action: 'removeBinding',
          bindingId: bid
        }).then(function (r) {
          wx.hideLoading && wx.hideLoading();
          if (!r || r.code !== 0) throw r || { code: 500, msg: '解绑失败' };
          wx.showToast({
            title: '已解绑，快照已归档',
            icon: 'none',
            duration: 2200
          });
          that.refreshBindings();
        }).catch(function (err) {
          wx.hideLoading && wx.hideLoading();
          var msg = (err && err.msg) || '解绑失败';
          wx.showToast({ title: msg, icon: 'none' });
        });
      }
    });
  }
});
