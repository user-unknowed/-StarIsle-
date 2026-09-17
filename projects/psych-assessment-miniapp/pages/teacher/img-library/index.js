// pages/teacher/img-library/index.js
// 教师端 Tab4 设置 → ③ 图片库
// Tab: 罗夏 / TAT / 我的自定义
// 功能：
//   · onLoad 调 imageOperate(action=listLibrary) 三段并发加载
//   · 自定义 Tab 悬浮"+ 上传自定义图"按钮：presignUploadPath → wx.chooseMedia
//     → wx.cloud.uploadFile → addMetadata → 刷新
//   · 长按自定义卡片 → 确认删除 → delete（409 toast 显示冲突任务 IDs）

var cloud = require('../../../utils/cloud.js');

Page({
  data: {
    activeTab: 'rorschach',
    tabs: [
      { key: 'rorschach', label: '罗夏', count: -1 },
      { key: 'tat', label: 'TAT', count: -1 },
      { key: 'custom', label: '我的自定义', count: -1 }
    ],
    rorschachList: [],
    tatList: [],
    customList: [],
    loading: false,
    errorMsg: '',
    errorCode: ''
  },

  onLoad: function () {
    this.refreshAll();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.refreshAll(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  onSwitchTab: function (e) {
    var key = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ activeTab: key, errorMsg: '', errorCode: '' });
  },

  /**
   * 刷新三段列表；按 imageType 单独调用 imageOperate，便于分页/后续单独刷新
   */
  refreshAll: function (done) {
    var that = this;
    that.setData({ loading: true, errorMsg: '', errorCode: '' });
    Promise.all([
      cloud.call('imageOperate', { action: 'listLibrary', filter: { imageType: 'rorschach' } }),
      cloud.call('imageOperate', { action: 'listLibrary', filter: { imageType: 'tat' } }),
      cloud.call('imageOperate', { action: 'listLibrary', filter: { imageType: 'custom' } })
    ]).then(function (results) {
      var r = results[0] || {};
      var t = results[1] || {};
      var c = results[2] || {};
      if (r.code !== 0) throw r;
      if (t.code !== 0) throw t;
      if (c.code !== 0) throw c;
      that.setData({
        rorschachList: (r.data || []).slice(0, 200),
        tatList: (t.data || []).slice(0, 200),
        customList: (c.data || []).slice(0, 200),
        loading: false,
        tabs: [
          { key: 'rorschach', label: '罗夏', count: (r.data || []).length },
          { key: 'tat', label: 'TAT', count: (t.data || []).length },
          { key: 'custom', label: '我的自定义', count: (c.data || []).length }
        ]
      });
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

  // ========== 预览图片 ==========
  onPreviewImage: function (e) {
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var listKey = ds.list; // 'rorschach' | 'tat' | 'custom'
    var id = ds.id;
    var list = this.data[listKey + 'List'] || [];
    var urls = list.map(function (img) { return img.storageFileID; }).filter(Boolean);
    var currentIdx = -1;
    list.forEach(function (img, i) { if (img._id === id) currentIdx = i; });
    if (currentIdx < 0 || !urls.length) return;
    try {
      wx.previewImage({
        current: urls[currentIdx],
        urls: urls
      });
    } catch (err) { /* ignore */ }
  },

  // ========== 自定义上传 ==========
  onUploadCustom: function () {
    var that = this;
    // 1) 先取一张本地图（chooseMedia 拿 size / type / tempFilePath）
    wx.chooseMedia({
      count: 1,
      sizeType: ['compressed'],
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (cmRes) {
        var files = (cmRes && cmRes.tempFiles) || [];
        if (!files.length) return;
        var f = files[0];
        var filename = (f.tempFilePath && f.tempFilePath.split('/').pop()) || 'custom_image.jpg';
        var sizeBytes = f.size || (f.duration && f.duration * 1) || 0;
        // 猜 contentType：只根据后缀
        var ct = 'image/jpeg';
        var extIdx = filename.lastIndexOf('.');
        if (extIdx >= 0) {
          var ext = filename.slice(extIdx + 1).toLowerCase();
          if (ext === 'png') ct = 'image/png';
          else if (ext === 'heic' || ext === 'heif') ct = 'image/heic';
        }
        // 前端先行 size 限制（后端再强校验一次）
        if (sizeBytes > 5 * 1024 * 1024) {
          wx.showToast({ title: '单图不得超过 5MB', icon: 'none' });
          return;
        }
        that._stepPresignAndUpload(f.tempFilePath, filename, ct, sizeBytes);
      },
      fail: function () { /* 用户取消 */ }
    });
  },

  _stepPresignAndUpload: function (tempFilePath, filename, contentType, sizeBytes) {
    var that = this;
    wx.showLoading && wx.showLoading({ title: '准备上传…', mask: true });
    cloud.call('imageOperate', {
      action: 'presignUploadPath',
      filename: filename,
      contentType: contentType,
      sizeBytes: sizeBytes
    }).then(function (presign) {
      if (!presign || presign.code !== 0) throw presign || { code: 500, msg: 'presign 失败' };
      var data = presign.data || {};
      var cloudPath = data.cloudPath || data.uploadFileID;
      if (!cloudPath) throw { code: 500, msg: 'presign 返回 cloudPath 缺失' };
      wx.showLoading && wx.showLoading({ title: '上传中…', mask: true });
      return new Promise(function (resolve, reject) {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: function (up) {
            resolve({ storageFileID: up.fileID, cloudPath: cloudPath });
          },
          fail: function (e) {
            reject({ code: 901, msg: (e && e.errMsg) || '上传失败' });
          }
        });
      });
    }).then(function (uploaded) {
      // 最后：写 metadata
      var defaultName = filename;
      wx.showLoading && wx.showLoading({ title: '入库…', mask: true });
      return cloud.call('imageOperate', {
        action: 'addMetadata',
        storageFileID: uploaded.storageFileID,
        name: defaultName,
        description: '教师自定义上传 · 来自 img-library',
        tags: ['custom'],
        imageType: 'custom'
      });
    }).then(function (meta) {
      wx.hideLoading && wx.hideLoading();
      if (!meta || meta.code !== 0) throw meta || { code: 500, msg: 'addMetadata 失败' };
      wx.showToast({ title: '上传成功', icon: 'success' });
      that.refreshAll();
    }).catch(function (err) {
      wx.hideLoading && wx.hideLoading();
      var code = (err && err.code) || '';
      var msg = (err && err.msg) || '上传失败';
      if (code === 413) msg = '单图不得超过 5MB';
      wx.showToast({ title: msg, icon: 'none' });
    });
  },

  // ========== 长按删除自定义图 ==========
  onLongPressDelete: function (e) {
    var that = this;
    var ds = (e && e.currentTarget && e.currentTarget.dataset) || {};
    var imageId = ds.id;
    if (!imageId) return;
    wx.showModal({
      title: '删除该自定义图？',
      content: '若被任务引用将无法删除。删除后不可恢复。',
      confirmColor: '#DC2626',
      success: function (res) {
        if (!res || !res.confirm) return;
        wx.showLoading && wx.showLoading({ title: '删除中…', mask: true });
        cloud.call('imageOperate', { action: 'delete', imageId: imageId })
          .then(function (r) {
            wx.hideLoading && wx.hideLoading();
            if (!r) throw { code: 500, msg: '无返回' };
            if (r.code === 409) {
              // 冲突：toast 显示后端 message
              wx.showToast({
                title: (r.msg || '该图已被任务引用') + '',
                icon: 'none',
                duration: 2600
              });
              return;
            }
            if (r.code !== 0) throw r;
            var warnings = (r.data && r.data.warnings) || [];
            if (warnings.length) {
              wx.showToast({ title: '已删除 · ' + warnings.length + '项清理告警', icon: 'none' });
            } else {
              wx.showToast({ title: '已删除', icon: 'success' });
            }
            that.refreshAll();
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
