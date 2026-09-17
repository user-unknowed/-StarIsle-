// pages/admin/global-export/index.js
// 超级管理员 · 全局科研/审计导出页（Task14 · 方案B 严格范围冻结）
// 功能：
//  Tab A: 科研数据导出（taskOperate.researchExport · admin scope=all · csv_flat · 默认最近 30 天）
//  Tab B: 状态快照审计 CSV 导出（statusOperate.exportSnapshotsAuditCSV · admin）
//  历史导出列表（taskOperate.listExports admin 全校）：
//     - ttlExpireAt < now → 灰色「已过期」胶囊 + 下载按钮 disabled
//     - 未过期 → 下载按钮 → downloadLinkByExportId → tempFileURL → wx.downloadFile → wx.openDocument
//  接口降级诚实性：失败 → 顶部橙色横幅 + applyMockFallback()

var cloud = require('../../../utils/cloud.js');

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function startOfNDaysAgo(n) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); }
function formatDateTime(ts) {
  if (!ts) return '';
  var d = new Date(Number(ts) || 0);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function daysRemain(ttlTs) {
  if (!ttlTs) return 0;
  var ms = Number(ttlTs) - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}
function scopeLabel(s) {
  if (s === 'all' || s === 'global') return '全校（admin）';
  if (s === 'class') return '班级';
  if (s === 'binding') return '一对一绑定';
  if (s === 'teacher_self') return '教师本人';
  return s || '未标记';
}
function exportTypeLabel(t) {
  if (t === 'research_csv_flat') return '科研 CSV';
  if (t === 'audit_snapshots_csv') return '快照审计 CSV';
  if (t === 'research') return '科研数据';
  if (t === 'audit') return '审计数据';
  return t || '数据导出';
}

/* Mock 历史（仅接口失败时启用） */
function buildMockHistory() {
  var now = Date.now();
  return [
    { _id: 'mock-1', exportName: '全校科研数据 · 2026-09-01 ~ 09-03', scopeType: 'all', rowCount: 1873,
      ttlExpireAt: now + 5 * 86400000, exportType: 'research_csv_flat', createdAt: now - 2 * 86400000,
      exportId: 'exp-00000001', cloudPath: 'mock/exp-00000001.csv', fileID: 'mock://exp-00000001.csv' },
    { _id: 'mock-2', exportName: '快照状态审计 CSV · 全校范围 9 月初', scopeType: 'all', rowCount: 4392,
      ttlExpireAt: now + 2 * 86400000, exportType: 'audit_snapshots_csv', createdAt: now - 5 * 86400000,
      exportId: 'exp-00000002', cloudPath: 'mock/exp-00000002.csv', fileID: 'mock://exp-00000002.csv' },
    { _id: 'mock-3', exportName: '全校科研数据 · 8 月中旬', scopeType: 'all', rowCount: 6120,
      ttlExpireAt: now - 1 * 86400000, exportType: 'research_csv_flat', createdAt: now - 14 * 86400000,
      exportId: 'exp-00000003', cloudPath: 'mock/exp-00000003.csv', fileID: 'mock://exp-00000003.csv', _expired: true }
  ];
}

Page({
  data: {
    // 诚实降级
    usingMockData: false,

    // 两个 Tab
    currentTab: 'A',   // 'A' 科研 / 'B' 审计快照

    // Tab A: 科研导出表单
    tabA_startDate: '',
    tabA_endDate: '',
    tabA_format: 'csv_flat',
    tabA_formatOptions: [
      { value: 'csv_flat', label: 'CSV 扁平表（推荐 · 仅匿名字段）' },
      { value: 'csv_wide', label: 'CSV 宽表' },
      { value: 'jsonl', label: 'JSONL' }
    ],
    tabA_formatIndex: 0,
    tabA_running: false,

    // Tab B: 快照审计导出
    tabB_running: false,

    // 历史列表
    historyList: [],
    loadingHistory: true,
    historyEmpty: false,

    errorMsg: ''
  },

  onLoad: function () {
    var d = new Date();
    var end = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var d30 = new Date(startOfNDaysAgo(29));
    var start = d30.getFullYear() + '-' + pad(d30.getMonth() + 1) + '-' + pad(d30.getDate());
    this.setData({ tabA_startDate: start, tabA_endDate: end });
    this.refreshHistory();
  },
  onShow: function () { this.refreshHistory(true); },
  onPullDownRefresh: function () {
    var that = this;
    this.refreshHistory(false, function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  /* ================ Tab 切换 ================ */
  switchTabA: function () { this.setData({ currentTab: 'A' }); },
  switchTabB: function () { this.setData({ currentTab: 'B' }); },

  /* ================ 日期选择 ================ */
  onStartDateChange: function (e) { this.setData({ tabA_startDate: e.detail.value }); },
  onEndDateChange:   function (e) { this.setData({ tabA_endDate: e.detail.value }); },
  onFormatChange:    function (e) {
    var idx = Number(e.detail.value);
    this.setData({ tabA_formatIndex: idx, tabA_format: this.data.tabA_formatOptions[idx].value });
  },

  /* ================ 历史导出列表 ================ */
  refreshHistory: function (silent, done) {
    var that = this;
    if (!silent) that.setData({ loadingHistory: true, errorMsg: '' });
    cloud.call('taskOperate', { action: 'listExports', scope: 'all' })
      .then(function (r) {
        var ok = !!(r && r.code === 0 && Array.isArray(r.list));
        var list = ok ? r.list : [];
        if (ok && list.length === 0) {
          that.setData({
            historyList: [], historyEmpty: true, loadingHistory: false
          });
          // 无数据：如果是接口 OK 但空，则仍然认为是"通路 OK"，不使用 Mock
          done && done();
          return;
        }
        if (ok) {
          that.setData({
            usingMockData: false,
            historyList: that.buildHistoryView(list),
            historyEmpty: list.length === 0,
            loadingHistory: false
          });
        } else {
          // 接口失败 → 显式降级
          that.applyMockFallback();
        }
        done && done();
      })
      .catch(function (e) {
        console.warn('[global-export] listExports catch:', e);
        that.setData({
          loadingHistory: false,
          errorMsg: (e && e.msg) || '列表加载失败，请下拉刷新'
        });
        that.applyMockFallback();
        done && done();
      });
  },

  buildHistoryView: function (rawList) {
    var now = Date.now();
    return rawList.slice()
      .sort(function (a, b) { return (Number(b.createdAt || 0)) - (Number(a.createdAt || 0)); })
      .map(function (ex) {
        var ttl = Number(ex.ttlExpireAt || 0);
        var expired = !ttl || ttl < now;
        return {
          _id: ex._id || ex.exportId || ('h-' + Math.random()),
          exportId: ex.exportId || '',
          exportName: ex.exportName || ('导出 · ' + (ex.exportId || '')),
          scopeTypeLabel: scopeLabel(ex.scopeType || ex.scope),
          rowCount: Number(ex.rowCount) || 0,
          ttlExpireAtLabel: expired ? '已过期' : (formatDateTime(ttl) + '（剩余 ' + daysRemain(ttl) + ' 天）'),
          expired: expired,
          remainDays: expired ? 0 : daysRemain(ttl),
          exportTypeLabel: exportTypeLabel(ex.exportType || ex.type),
          createdAtLabel: formatDateTime(ex.createdAt || ex.exportAt || 0),
          downloading: false
        };
      });
  },

  applyMockFallback: function () {
    var view = this.buildHistoryView(buildMockHistory());
    this.setData({
      usingMockData: true,
      historyList: view,
      historyEmpty: view.length === 0,
      loadingHistory: false
    });
  },

  /* ================ Tab A: 科研导出 ================ */
  onRunExportResearch: function () {
    var that = this;
    if (that.data.tabA_running) return;
    // 日期校验
    var s = that.data.tabA_startDate; var e = that.data.tabA_endDate;
    if (!s || !e) { wx.showToast({ title: '请选择起止日期', icon: 'none' }); return; }
    if (new Date(s).getTime() > new Date(e).getTime()) {
      wx.showToast({ title: '开始日期不可晚于结束日期', icon: 'none' }); return;
    }
    var startTs = new Date(s).getTime();
    var endTs = new Date(e).getTime() + 86400000 - 1;

    that.setData({ tabA_running: true });
    wx.showLoading({ title: '正在生成科研导出…', mask: true });
    cloud.call('taskOperate', {
      action: 'researchExport',
      scope: 'all',
      format: that.data.tabA_format,
      dateRange: { startTime: startTs, endTime: endTs }
    }).then(function (r) {
      wx.hideLoading();
      that.setData({ tabA_running: false });
      if (r && r.code === 0 && (r.exportId || (r.data && r.data.exportId))) {
        var info = r.data || r;
        wx.showToast({ title: '科研导出成功 · ' + (info.exportId || '').slice(-6), icon: 'success' });
        // 写回历史列表顶部
        that.prependHistory({
          _id: info.exportId,
          exportId: info.exportId,
          exportName: '全校科研数据 ' + s + ' ~ ' + e,
          scopeType: 'all',
          rowCount: Number(info.rowCount) || 0,
          ttlExpireAt: info.ttlExpireAt,
          exportType: 'research_' + (that.data.tabA_format),
          createdAt: Date.now(),
          cloudPath: info.cloudPath || '',
          fileID: info.fileID || ''
        });
      } else {
        // 未真实成功 → 诚实 Mock 回退 + 提示
        wx.showToast({ title: '接口暂未就绪，已生成本地演示条目', icon: 'none' });
        var mockNow = Date.now();
        that.prependHistory({
          _id: 'mock-new-r-' + mockNow,
          exportId: 'mock-exp-r-' + mockNow,
          exportName: '【演示】全校科研数据 ' + s + ' ~ ' + e,
          scopeType: 'all',
          rowCount: 2350,
          ttlExpireAt: mockNow + 7 * 86400000,
          exportType: 'research_' + (that.data.tabA_format),
          createdAt: mockNow,
          cloudPath: 'mock/demo.csv',
          fileID: 'mock://demo.csv'
        });
        if (!that.data.usingMockData) that.setData({ usingMockData: true });
      }
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ tabA_running: false });
      wx.showToast({ title: '导出失败 · ' + (err && err.msg ? err.msg : '网络异常'), icon: 'none' });
      that.applyMockFallback();
    });
  },

  /* ================ Tab B: 快照审计 CSV 导出 ================ */
  onRunExportAudit: function () {
    var that = this;
    if (that.data.tabB_running) return;
    that.setData({ tabB_running: true });
    wx.showLoading({ title: '正在生成快照审计 CSV…', mask: true });
    cloud.call('statusOperate', { action: 'exportSnapshotsAuditCSV' })
      .then(function (r) {
        wx.hideLoading();
        that.setData({ tabB_running: false });
        if (r && r.code === 0 && (r.exportId || (r.data && r.data.exportId))) {
          var info = r.data || r;
          wx.showToast({ title: '审计 CSV 生成成功', icon: 'success' });
          that.prependHistory({
            _id: info.exportId,
            exportId: info.exportId,
            exportName: '全校快照审计 CSV',
            scopeType: 'all',
            rowCount: Number(info.rowCount) || 0,
            ttlExpireAt: info.ttlExpireAt,
            exportType: 'audit_snapshots_csv',
            createdAt: Date.now(),
            cloudPath: info.cloudPath || '',
            fileID: info.fileID || ''
          });
        } else {
          wx.showToast({ title: '接口暂未就绪，已生成本地演示条目', icon: 'none' });
          var mockNow = Date.now();
          that.prependHistory({
            _id: 'mock-new-a-' + mockNow,
            exportId: 'mock-exp-a-' + mockNow,
            exportName: '【演示】全校快照审计 CSV',
            scopeType: 'all',
            rowCount: 5120,
            ttlExpireAt: mockNow + 7 * 86400000,
            exportType: 'audit_snapshots_csv',
            createdAt: mockNow,
            cloudPath: 'mock/demo-audit.csv',
            fileID: 'mock://demo-audit.csv'
          });
          if (!that.data.usingMockData) that.setData({ usingMockData: true });
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        that.setData({ tabB_running: false });
        wx.showToast({ title: '导出失败 · ' + (err && err.msg ? err.msg : '网络异常'), icon: 'none' });
        that.applyMockFallback();
      });
  },

  /* ================ 历史列表：下载 ================ */
  prependHistory: function (item) {
    var view = this.buildHistoryView([item]).concat(this.data.historyList || []);
    // 去重
    var seen = {}; var uniq = [];
    for (var i = 0; i < view.length; i++) {
      var key = view[i].exportId || view[i]._id;
      if (!seen[key]) { seen[key] = true; uniq.push(view[i]); }
    }
    this.setData({ historyList: uniq, historyEmpty: false });
  },

  onDownloadExport: function (e) {
    var that = this;
    var expId = e.currentTarget.dataset && e.currentTarget.dataset.expid;
    if (!expId) return;
    // 二次确认过期
    var target = null;
    for (var i = 0; i < this.data.historyList.length; i++) {
      if (this.data.historyList[i].exportId === expId) { target = this.data.historyList[i]; break; }
    }
    if (!target || target.expired) {
      wx.showToast({ title: '该导出已过期（TTL 到期），不可下载', icon: 'none' });
      return;
    }
    // 模拟标记 downloading
    var list = this.data.historyList.slice();
    for (var j = 0; j < list.length; j++) { if (list[j].exportId === expId) list[j].downloading = true; }
    this.setData({ historyList: list });

    if (this.data.usingMockData || String(expId).indexOf('mock') === 0) {
      setTimeout(function () {
        var list2 = that.data.historyList.slice();
        for (var k = 0; k < list2.length; k++) { if (list2[k].exportId === expId) list2[k].downloading = false; }
        that.setData({ historyList: list2 });
        wx.showToast({ title: '【演示】下载接口未就绪，未打开真实文件', icon: 'none' });
      }, 800);
      return;
    }

    cloud.call('taskOperate', { action: 'downloadLinkByExportId', exportId: expId })
      .then(function (r) {
        var list2 = that.data.historyList.slice();
        for (var k = 0; k < list2.length; k++) { if (list2[k].exportId === expId) list2[k].downloading = false; }
        that.setData({ historyList: list2 });
        var url = (r && r.data && r.data.tempFileURL) || (r && r.tempFileURL);
        if (!url) {
          var msg = (r && r.msg) ? r.msg : '未返回下载链接';
          if (r && r.code === 410) msg = '文件已过期（TTL）· 服务端 410 Gone';
          wx.showToast({ title: msg, icon: 'none' }); return;
        }
        wx.showLoading({ title: '正在下载并打开…', mask: true });
        wx.downloadFile({
          url: url,
          success: function (res) {
            wx.hideLoading();
            if (!res || !res.tempFilePath) {
              wx.showToast({ title: '下载失败', icon: 'none' }); return;
            }
            wx.openDocument({
              filePath: res.tempFilePath,
              showMenu: true,
              fail: function (err) {
                wx.showToast({ title: '打开失败 · ' + ((err && err.errMsg) || ''), icon: 'none' });
              }
            });
          },
          fail: function (err) {
            wx.hideLoading();
            wx.showToast({ title: '下载失败 · ' + ((err && err.errMsg) || ''), icon: 'none' });
          }
        });
      })
      .catch(function (err) {
        var list2 = that.data.historyList.slice();
        for (var k2 = 0; k2 < list2.length; k2++) { if (list2[k2].exportId === expId) list2[k2].downloading = false; }
        that.setData({ historyList: list2 });
        wx.showToast({ title: '获取下载链接失败 · ' + (err && err.msg ? err.msg : ''), icon: 'none' });
      });
  },

  _noop: function () {}
});
