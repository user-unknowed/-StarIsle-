// pages/teacher/status-tag/index.js
// 教师端 · 状态标签管理
// Tab 1：标签库 — 内置 5 枚举（只读）+ 本人自定义标签（新建/编辑/删除）
// Tab 2：打标记录 — 选择学生打标签 + 查看历史快照 + 撤销本人打标

var cloud = require('../../../utils/cloud.js');

var COLOR_OPTIONS = [
  { key: 'indigo',  value: '#6366F1', label: '靛蓝' },
  { key: 'amber',   value: '#F59E0B', label: '琥珀' },
  { key: 'rose',    value: '#F43F5E', label: '玫红' },
  { key: 'emerald', value: '#10B981', label: '翠绿' },
  { key: 'cyan',    value: '#06B6D4', label: '青蓝' },
  { key: 'slate',   value: '#64748B', label: '石板' }
];

Page({
  data: {
    // ===== Tab =====
    activeTab: 'library',  // 'library' | 'records'

    // ===== 公共 =====
    loading: false,
    errorMsg: '',
    errorCode: '',

    // ===== Tab 1：标签库 =====
    builtinList: [],
    customList: [],
    // 新建/编辑表单
    showTagForm: false,
    formMode: 'create',   // 'create' | 'edit'
    formTagId: '',
    formName: '',
    formNameLen: 0,
    formColorKey: 'indigo',  // 选择的预设色 key
    formCustomColor: '',     // 用户输入 #RRGGBB
    colorOptions: COLOR_OPTIONS,
    // 编辑中目标（用于 wxml 回显）
    editingTag: null,

    // ===== Tab 2：打标记录 =====
    // 本人绑定列表（学生下拉选择）
    bindingList: [],
    bindingOptions: [],       // [{ value: studentId, label: studentAnonymousNo, bindingId }]
    selectedStudentId: '',    // 已选学生
    selectedStudentAnon: '',
    selectedBindingId: '',

    // 可选标签（打标时多选）
    availableTags: [],
    selectedTagIds: [],       // 已选 tagId

    // 打标表单
    tagReason: '',
    reasonLen: 0,
    tagRelatedFeedbackId: '',
    submittingTag: false,

    // 快照列表
    snapshotList: [],
    snapshotCount: 0
  },

  // ======================================================
  onLoad: function () {
    this.refreshAll();
  },

  onShow: function () {
    this.refreshAll();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.refreshAll(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  // ============== 刷新入口 ==============
  refreshAll: function (done) {
    var that = this;
    that.setData({ loading: true, errorMsg: '', errorCode: '' });
    Promise.all([
      cloud.call('statusOperate', { action: 'listStatusTags' }),
      cloud.call('classOperate', { action: 'listMyBindings' })
    ]).then(function (results) {
      var tagsRes = results[0];
      var bindRes = results[1];
      if (tagsRes && tagsRes.code !== 0) throw tagsRes;
      if (bindRes && bindRes.code !== 0) throw bindRes;

      var allTags = (tagsRes.data || []).slice();
      var builtins = allTags.filter(function (t) { return t.builtIn === true; });
      var customs  = allTags.filter(function (t) { return t.builtIn !== true; });

      // 本人有效绑定（学生下拉）
      var bindings = (bindRes.data || []).filter(function (b) {
        return b.validUntil === null || b.validUntil === undefined || b.validUntil === 0;
      });
      var bindOpts = bindings.map(function (b) {
        return {
          value: b.studentId,
          label: b.studentAnonymousNo || '#S000000',
          bindingId: b._id
        };
      });

      that.setData({
        builtinList: builtins,
        customList: customs,
        availableTags: allTags,
        bindingList: bindings,
        bindingOptions: bindOpts,
        loading: false
      });

      // 如果当前已选学生，刷新其快照
      if (that.data.selectedStudentId) {
        that.refreshSnapshots();
      }
      done && done();
    }).catch(function (err) {
      that.setData({
        loading: false,
        errorMsg: (err && err.msg) || '加载失败',
        errorCode: (err && err.code) || ''
      });
      done && done();
    });
  },

  // ============== 切换 Tab ==============
  onSwitchTab: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var tab = ds.tab;
    if (!tab) return;
    this.setData({ activeTab: tab, errorMsg: '', errorCode: '' });
  },

  // ========== 工具：时间格式化 ==========
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

  // ======================================================
  // Tab 1：标签库 — 新建/编辑/删除
  // ======================================================
  // ---- 打开新建表单 ----
  onOpenCreateForm: function () {
    this.setData({
      showTagForm: true,
      formMode: 'create',
      formTagId: '',
      formName: '',
      formNameLen: 0,
      formColorKey: 'indigo',
      formCustomColor: '',
      editingTag: null,
      errorMsg: '',
      errorCode: ''
    });
  },

  // ---- 打开编辑表单 ----
  onOpenEditForm: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var tagId = ds.tagId;
    if (!tagId) return;
    var tag = this.data.customList.find(function (t) { return t._id === tagId; });
    if (!tag) return;
    var colorKey = 'indigo';
    var customColor = '';
    var colorMap = {};
    COLOR_OPTIONS.forEach(function (c) { colorMap[c.value] = c.key; });
    if (colorMap[tag.color]) {
      colorKey = colorMap[tag.color];
    } else {
      colorKey = 'custom';
      customColor = tag.color;
    }
    this.setData({
      showTagForm: true,
      formMode: 'edit',
      formTagId: tagId,
      formName: tag.name,
      formNameLen: String(tag.name || '').length,
      formColorKey: colorKey,
      formCustomColor: customColor,
      editingTag: tag,
      errorMsg: '',
      errorCode: ''
    });
  },

  // ---- 关闭表单 ----
  onCloseTagForm: function () {
    this.setData({ showTagForm: false, editingTag: null });
  },

  // ---- 表单输入 ----
  onFormNameInput: function (e) {
    var val = e.detail.value || '';
    this.setData({ formName: val, formNameLen: String(val).length });
  },

  onPickColor: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var key = ds.key;
    if (!key) return;
    this.setData({ formColorKey: key });
  },

  onCustomColorInput: function (e) {
    var val = (e.detail.value || '').trim().toUpperCase();
    if (val && val.charAt(0) !== '#') val = '#' + val;
    this.setData({ formCustomColor: val, formColorKey: 'custom' });
  },

  // ---- 提交标签（创建/编辑）----
  onSubmitTagForm: function () {
    var that = this;
    var name = String(this.data.formName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写标签名称', icon: 'none' });
      return;
    }
    if (name.length > 20) {
      wx.showToast({ title: '标签名称不得超过 20 字', icon: 'none' });
      return;
    }
    var color;
    if (this.data.formColorKey === 'custom') {
      color = String(this.data.formCustomColor || '').trim().toUpperCase();
      if (!/^#[0-9A-F]{6}$/.test(color)) {
        wx.showToast({ title: '自定义颜色应为 #RRGGBB 6 位', icon: 'none' });
        return;
      }
    } else {
      color = this.data.formColorKey;
    }

    var action = this.data.formMode === 'edit' ? 'updateTag' : 'createTag';
    var payload = this.data.formMode === 'edit'
      ? { action: action, tagId: this.data.formTagId, name: name, color: color }
      : { action: action, name: name, color: color };

    wx.showLoading && wx.showLoading({ title: this.data.formMode === 'edit' ? '修改中…' : '创建中…', mask: true });
    cloud.call('statusOperate', payload)
      .then(function (r) {
        wx.hideLoading && wx.hideLoading();
        if (!r || r.code !== 0) throw r || { code: 500, msg: '操作失败' };
        that.setData({ showTagForm: false, editingTag: null });
        wx.showToast({ title: that.data.formMode === 'edit' ? '已修改' : '标签已创建', icon: 'success' });
        that.refreshAll();
      })
      .catch(function (err) {
        wx.hideLoading && wx.hideLoading();
        var msg = (err && err.msg) || '操作失败';
        if (err && err.code === 409) {
          msg = '您已存在同名标签';
        }
        wx.showToast({ title: msg, icon: 'none', duration: 2600 });
      });
  },

  // ---- 删除自定义标签 ----
  onDeleteTag: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var tagId = ds.tagId;
    var tagName = ds.tagName || '该标签';
    if (!tagId) return;
    wx.showModal({
      title: '删除标签「' + tagName + '」？',
      content: '⚠️ 系统内置标签不可删。若该标签已用于历史打标，对应快照中的 tagId 将被标记为「tag_deleted:原ID」以保留科研追溯，删除不可恢复。',
      confirmText: '确认删除',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '删除中…', mask: true });
        cloud.call('statusOperate', { action: 'removeTag', tagId: tagId })
          .then(function (r) {
            wx.hideLoading && wx.hideLoading();
            if (!r || r.code !== 0) throw r || { code: 500, msg: '删除失败' };
            wx.showToast({ title: '标签已删除', icon: 'success' });
            that.refreshAll();
          })
          .catch(function (err) {
            wx.hideLoading && wx.hideLoading();
            var msg = (err && err.msg) || '删除失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  },

  // ======================================================
  // Tab 2：打标记录 — 选学生 / 多选标签 / 打标 / 撤销
  // ======================================================
  // ---- 选学生（从本人绑定列表 picker-style 点击）----
  onPickStudent: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var idx = Number(ds.index);
    if (isNaN(idx) || idx < 0) return;
    var opt = this.data.bindingOptions[idx];
    if (!opt) return;
    this.setData({
      selectedStudentId: opt.value,
      selectedStudentAnon: opt.label,
      selectedBindingId: opt.bindingId || '',
      errorMsg: '',
      errorCode: ''
    });
    this.refreshSnapshots();
  },

  onClearPickStudent: function () {
    this.setData({
      selectedStudentId: '',
      selectedStudentAnon: '',
      selectedBindingId: '',
      snapshotList: [],
      snapshotCount: 0
    });
  },

  // ---- 打标：标签多选切换 ----
  onToggleTagPick: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var tagId = ds.tagId;
    if (!tagId) return;
    var selected = (this.data.selectedTagIds || []).slice();
    var pos = selected.indexOf(tagId);
    if (pos >= 0) {
      selected.splice(pos, 1);
    } else {
      selected.push(tagId);
    }
    this.setData({ selectedTagIds: selected });
  },

  // ---- 打标：reason 输入 ----
  onTagReasonInput: function (e) {
    var val = e.detail.value || '';
    this.setData({ tagReason: val, reasonLen: String(val).length });
  },

  onTagFeedbackInput: function (e) {
    var val = (e.detail.value || '').trim();
    this.setData({ tagRelatedFeedbackId: val });
  },

  // ---- 提交打标 ----
  onSubmitTagStudent: function () {
    var that = this;
    var studentId = this.data.selectedStudentId;
    var tagIds = (this.data.selectedTagIds || []).slice();
    var reason = String(this.data.tagReason || '').trim();
    var relatedFeedbackId = this.data.tagRelatedFeedbackId || null;
    var bindingId = this.data.selectedBindingId || null;

    if (!studentId) {
      wx.showToast({ title: '请先选择学生', icon: 'none' });
      return;
    }
    if (!tagIds.length) {
      wx.showToast({ title: '请至少选择一个标签', icon: 'none' });
      return;
    }
    if (!reason) {
      wx.showToast({ title: '请填写打标理由（便于追溯）', icon: 'none' });
      return;
    }

    this.setData({ submittingTag: true });
    cloud.call('statusOperate', {
      action: 'tagStudent',
      studentId: studentId,
      tagIds: tagIds,
      reason: reason,
      relatedFeedbackId: relatedFeedbackId,
      bindingId: bindingId
    }).then(function (r) {
      that.setData({ submittingTag: false });
      if (!r) throw { code: 500, msg: '无返回' };
      if (r.code !== 0) throw r;
      if (r.data && r.data.msg_was_truncated) {
        wx.showToast({ title: '已打标（理由超长已自动截断）', icon: 'none', duration: 2800 });
      } else {
        wx.showToast({ title: '打标成功', icon: 'success' });
      }
      // 重置表单
      that.setData({
        selectedTagIds: [],
        tagReason: '',
        reasonLen: 0,
        tagRelatedFeedbackId: ''
      });
      that.refreshSnapshots();
    }).catch(function (err) {
      that.setData({ submittingTag: false });
      var msg = (err && err.msg) || '打标失败';
      wx.showToast({ title: msg, icon: 'none', duration: 2600 });
    });
  },

  // ---- 刷新快照列表（按已选学生）----
  refreshSnapshots: function () {
    var that = this;
    if (!this.data.selectedStudentId) return;
    cloud.call('statusOperate', {
      action: 'listSnapshotsByStudent',
      studentId: this.data.selectedStudentId
    }).then(function (r) {
      if (!r || r.code !== 0) throw r || { code: 500, msg: '加载失败' };
      var list = (r.data || []).map(function (s) {
        var tagNames = (s.tagNamesSnapshot || []).map(function (tn) {
          return tn.name || '(已删除)';
        }).join(' · ');
        var tagStr = tagNames || '（无标签名）';
        var statusText;
        var statusClass;
        if (s.revokeOfSnapshotId) {
          statusText = '撤销动作';
          statusClass = 'revoke';
        } else if (s.isActive) {
          statusText = '生效中';
          statusClass = 'active';
        } else {
          statusText = '已归档';
          statusClass = 'archived';
        }
        return Object.assign({}, s, {
          tagText: tagStr,
          statusText: statusText,
          statusClass: statusClass,
          createdAtText: that._fmtTime(s.createdAt),
          validFromText: that._fmtTime(s.validFrom),
          validUntilText: that._fmtTime(s.validUntil)
        });
      });
      that.setData({
        snapshotList: list,
        snapshotCount: list.length
      });
    }).catch(function (err) {
      that.setData({
        errorMsg: (err && err.msg) || '快照加载失败',
        errorCode: (err && err.code) || ''
      });
    });
  },

  // ---- 撤销本人打标 ----
  onUntagStudent: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var snapshotId = ds.snapshotId;
    var tagText = ds.tagText || '该标签';
    if (!snapshotId) return;
    wx.showModal({
      title: '撤销「' + tagText + '」打标？',
      content: '撤销不是删除：将标记原快照 validUntil=当前时间，并新增一条撤销记录用于科研追溯。',
      confirmText: '确认撤销',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '撤销中…', mask: true });
        cloud.call('statusOperate', { action: 'untagStudent', snapshotId: snapshotId })
          .then(function (r) {
            wx.hideLoading && wx.hideLoading();
            if (!r || r.code !== 0) throw r || { code: 500, msg: '撤销失败' };
            wx.showToast({ title: '已撤销（已记录追溯）', icon: 'none', duration: 2200 });
            that.refreshSnapshots();
          })
          .catch(function (err) {
            wx.hideLoading && wx.hideLoading();
            var msg = (err && err.msg) || '撤销失败';
            wx.showToast({ title: msg, icon: 'none' });
          });
      }
    });
  }
});
