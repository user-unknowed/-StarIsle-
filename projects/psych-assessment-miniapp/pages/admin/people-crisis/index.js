// pages/admin/people-crisis/index.js
// 超级管理员 · 危机高危学生 PII 访问页（🔴 最高红线 · 1477217 隐私合规）
//
// 🔴 红线 3 条：
// 1. 列表 / 详情 默认 100% 匿名 · 0 处真名 PII 渲染（WXML 只绑定 piiMasked）
// 2. 必须通过双因子 2FA（Factor1: 密码 adminVerifyPassword → Factor2: SMS adminSend2FACode → adminVerify2FACode）
//    通过后，PII 只在 30 秒窗口内 setData 写入 piiReal；30 秒到时后：
//    setData({ piiReal: null, piiMasked, piiAuthorized: false }) 强制回脱敏 + 闭包缓存 null 化
// 3. 每次 PII 访问写 audit_logs（grant / auto_clear_30s / manual_close），仅写 anonymousNo，不写明文 PII
// 4. page.onShow 重新检查 authorizedUntil < now → 立即回 mask（防 tab 切换后台后泄漏）

var cloud = require('../../../utils/cloud.js');

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatDateTime(ts) {
  if (!ts) return '';
  var d = new Date(Number(ts) || 0);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* =================== PII 脱敏 mask 规则（_buildMaskedPII） =================== */
function maskName(s) {
  if (!s) return '***';
  var str = String(s);
  if (str.length <= 1) return '*';
  if (str.length === 2) return str.charAt(0) + '*';
  // 3 字及以上 / 复姓：第 1 字保留，其余 *
  return str.charAt(0) + new Array(str.length).join('*');
}
function maskPhone(s) {
  if (!s) return '****';
  var p = String(s).replace(/\D/g, '');
  if (p.length < 7) return '****';
  return p.slice(0, 3) + '****' + p.slice(-4);
}
function maskIdCard(s) {
  if (!s) return '****';
  var id = String(s).replace(/\s/g, '');
  if (id.length < 8) return '****';
  return id.slice(0, 4) + '**********' + id.slice(-4);
}
function maskClassName(s) {
  // 例如：高一3班 → **级**班 / 一年级 1 班 → **级**班
  if (!s) return '**级**班';
  return '**级**班';
}
function maskStars(s) { return s ? '***' : '***'; }

/**
 * 🔴 全局唯一的 PII mask 构造器（保证输出 100% 脱敏，绝不残留原文）
 */
function _buildMaskedPII(p) {
  if (!p) p = {};
  return {
    studentName: maskName(p.studentName),
    phone: maskPhone(p.phone),
    idCardNo: maskIdCard(p.idCardNo),
    className: maskClassName(p.className),
    grade: maskStars(p.grade),
    school: maskStars(p.school),
    address: maskStars(p.address),
    parentName: maskName(p.parentName),
    parentPhone: maskPhone(p.parentPhone),
    otherContacts: maskName(p.otherContacts)
  };
}

/* =================== Mock 高危学生列表 =================== */
function buildMockCrisisList() {
  var anon = ['#S000128', '#S000074', '#S000213', '#S000091', '#S000156', '#S000301', '#S000045', '#S000287'];
  var crisisTags = ['self_harm_risk', 'suicide_ideation', 'severe_depression', 'trauma_signal', 'violence_risk'];
  var tagCn = {
    self_harm_risk: '自伤风险', suicide_ideation: '自杀意念',
    severe_depression: '重度抑郁', trauma_signal: '创伤信号', violence_risk: '暴力风险'
  };
  var now = Date.now();
  var list = [];
  for (var i = 0; i < 8; i++) {
    var ts = now - i * 1000 * 60 * 60 * (2 + Math.random() * 6);
    var nTags = 1 + Math.floor(Math.random() * 3);
    var wt = [];
    for (var k = 0; k < nTags; k++) {
      var t = crisisTags[Math.floor(Math.random() * crisisTags.length)];
      if (wt.indexOf(t) < 0) wt.push(t);
    }
    list.push({
      _id: 'mock-crisis-' + i,
      studentAnonymousNo: anon[i],
      submitTime: ts,
      warningTags: wt,
      warningTagLabels: wt.map(function (t) { return tagCn[t] || t; }),
      _mockPII: {
        studentName: ['张伟', '欧阳思思', '王梓涵', '李娜', '赵星辰', '陈墨轩', '刘诗涵', '孙一航'][i],
        phone: '138' + (10000000 + i * 7 + 12345678),
        idCardNo: '110101' + (20080101 + i * 1000 + 321) + '1234',
        className: '高三' + (i + 1) + '班',
        grade: '高三',
        school: '北京市第一零一中学',
        address: '北京市海淀区颐和园路 ' + (100 + i) + ' 号',
        parentName: ['张建国', '欧阳建国', '王建国', '李建国', '赵建国', '陈建国', '刘建国', '孙建国'][i],
        parentPhone: '139' + (20000000 + i * 9 + 87654321),
        otherContacts: ['班主任 · 王老师', '班主任 · 李老师', '心理委员 · 林', '班主任 · 张老师', '', '', '校医 · 黄医生', '班主任 · 周老师'][i]
      }
    });
  }
  return list;
}

/* =================== 页面主逻辑 =================== */
Page({
  data: {
    // 诚实降级：演示数据横幅
    usingMockData: false,

    // 阶段 1：危机学生列表（100% 匿名）
    crisisList: [],
    loadingList: true,
    listEmpty: false,

    // 阶段 2：2FA 弹窗
    faModalOpen: false,
    faTarget: null,       // 当前要查看的记录
    faStep: 1,            // 1: 输入密码 / 2: 短信验证码
    faPassword: '',
    faCode: '',
    faSending: false,
    faVerifying: false,
    faMfaPhone: '',       // 后端若返回 SMS 发送号码尾号，则显示
    faMessage: '',        // 提示信息（限频/错误）
    faPasswordAttemptsLeft: 5,

    // 阶段 3：30 秒 PII 实名窗口
    piiAuthorized: false,     // 未授权时：WXML 只绑定 piiMasked → 全部脱敏
    authorizedUntil: 0,       // 到期时间戳
    piiMasked: _buildMaskedPII(null),   // 🔴 默认脱敏值，未授权时 WXML 只绑这个
    piiReal: null,            // 授权时才 setData 为真实对象，30s 后立即=null
    piiTargetAnonNo: '',      // 仅 anonymousNo 用于 UI 头部显示 + audit_logs 匿名写入

    // 倒计时显示
    countdownText: '30s',

    errorMsg: ''
  },

  // 🔴 闭包缓存（不通过 setData 持久化）：_piiCache 在 30s 到时 null 化
  _piiCache: null,
  _piiTimer: null,
  _countdownTimer: null,

  onLoad: function () {
    this.loadCrisisList();
  },

  // 🔴 合规红线：页面回到前台时，立即检查 piiAuthorized 时间窗口
  onShow: function () {
    if (this.data.piiAuthorized && Number(this.data.authorizedUntil) < Date.now()) {
      this.forceReMask('auto_onShow_expired');
    }
  },

  onHide: function () { /* pass — onShow 回前台时检查 */ },
  onUnload: function () {
    // 页面销毁：清内存 + 脱敏
    this.clearTimers();
    this.forceReMask('auto_page_unload', /*silent*/ true);
  },

  onPullDownRefresh: function () {
    var that = this;
    this.loadCrisisList(function () {
      try { wx.stopPullDownRefresh && wx.stopPullDownRefresh(); } catch (e) {}
    });
  },

  clearTimers: function () {
    if (this._piiTimer) { clearTimeout(this._piiTimer); this._piiTimer = null; }
    if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
  },

  /* ========== 阶段 1：加载高危列表 ========== */
  loadCrisisList: function (done) {
    var that = this;
    that.setData({ loadingList: true, errorMsg: '' });
    var CRISIS_TAGS = ['self_harm_risk', 'suicide_ideation', 'severe_depression', 'trauma_signal', 'violence_risk'];
    cloud.call('feedbackSubmit', {
      action: 'queryFeedbacks',
      scope: 'global',
      filter: { warning_tags_contains_any: CRISIS_TAGS },
      pageSize: 50
    }).then(function (r) {
      var ok = !!(r && r.code === 0 && Array.isArray(r.list));
      if (ok && r.list.length > 0) {
        var view = that.buildCrisisView(r.list);
        that.setData({
          usingMockData: false,
          crisisList: view,
          listEmpty: view.length === 0,
          loadingList: false
        });
      } else if (ok) {
        // 空列表但通路通了
        that.setData({ crisisList: [], listEmpty: true, loadingList: false });
      } else {
        // 通路未就绪 → 诚实降级
        that.applyMockFallback();
      }
      done && done();
    }).catch(function (e) {
      console.warn('[people-crisis] queryFeedbacks catch:', e);
      that.setData({
        loadingList: false,
        errorMsg: (e && e.msg) || '加载失败，请下拉刷新'
      });
      that.applyMockFallback();
      done && done();
    });
  },

  buildCrisisView: function (rows) {
    var CRISIS_TAGS = ['self_harm_risk', 'suicide_ideation', 'severe_depression', 'trauma_signal', 'violence_risk'];
    var tagCn = {
      self_harm_risk: '自伤风险', suicide_ideation: '自杀意念',
      severe_depression: '重度抑郁', trauma_signal: '创伤信号', violence_risk: '暴力风险'
    };
    return rows
      .filter(function (r) {
        var tags = [].concat(r.warningTags || [], r.aiWarningTags || [],
          (r.aiAnalysis && r.aiAnalysis.warning_tags) || [],
          (r.teacherReview && r.teacherReview.confirmedWarningTags) || []);
        for (var i = 0; i < CRISIS_TAGS.length; i++) {
          if (tags.indexOf(CRISIS_TAGS[i]) >= 0) return true;
        }
        return false;
      })
      .sort(function (a, b) { return (Number(b.submitTime) || 0) - (Number(a.submitTime) || 0); })
      .slice(0, 50)
      .map(function (r) {
        var rawTags = [].concat(r.warningTags || [], r.aiWarningTags || [],
          (r.aiAnalysis && r.aiAnalysis.warning_tags) || [],
          (r.teacherReview && r.teacherReview.confirmedWarningTags) || []);
        var crisisOnly = rawTags.filter(function (t) { return CRISIS_TAGS.indexOf(t) >= 0; });
        var seen = {}; var uniq = [];
        crisisOnly.forEach(function (t) { if (!seen[t]) { seen[t] = true; uniq.push(t); } });
        return {
          _id: r._id || String(r.submitTime || Math.random()),
          studentAnonymousNo: r.studentAnonymousNo || '#S000000',
          submitTimeText: formatDateTime(r.submitTime),
          warningTags: uniq,
          warningTagLabels: uniq.map(function (t) { return tagCn[t] || t; })
        };
      });
  },

  applyMockFallback: function () {
    var mockRaw = buildMockCrisisList();
    // 🔴 注意：mock 的 _mockPII 不保存在 data 字段里，只放在 JS 闭包的临时对象中
    var that = this;
    that._mockFullRows = mockRaw; // 闭包缓存 mock 明细
    var viewList = mockRaw.map(function (r) {
      return {
        _id: r._id,
        studentAnonymousNo: r.studentAnonymousNo,
        submitTimeText: formatDateTime(r.submitTime),
        warningTags: r.warningTags,
        warningTagLabels: r.warningTagLabels
      };
    });
    this.setData({
      usingMockData: true,
      crisisList: viewList,
      listEmpty: viewList.length === 0,
      loadingList: false
    });
  },

  /* ========== 🔴 阶段 2：2FA 双因子验证 ========== */
  openPIIRequest: function (e) {
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    var record = null;
    for (var i = 0; i < this.data.crisisList.length; i++) {
      if (this.data.crisisList[i]._id === id) { record = this.data.crisisList[i]; break; }
    }
    if (!record) return;
    this.setData({
      faModalOpen: true,
      faTarget: record,
      faStep: 1,
      faPassword: '',
      faCode: '',
      faSending: false,
      faVerifying: false,
      faMessage: '此操作涉及实名 PII，需完成「密码 + SMS」双因子验证，后方可限时 30 秒查看。',
      faPasswordAttemptsLeft: 5
    });
  },
  onFaPasswordInput: function (e) { this.setData({ faPassword: (e.detail && e.detail.value) || '' }); },
  onFaCodeInput: function (e) { this.setData({ faCode: (e.detail && e.detail.value) || '' }); },
  closeFaModal: function () {
    this.setData({ faModalOpen: false, faTarget: null, faMessage: '' });
  },

  // Factor 1：密码验证（login.action=adminVerifyPassword）
  onFaVerifyPassword: function () {
    var that = this;
    var pwd = that.data.faPassword;
    if (!pwd) { wx.showToast({ title: '请输入管理员密码', icon: 'none' }); return; }
    that.setData({ faVerifying: true, faMessage: '' });

    // 读 adminId（本地已缓存 / 或用匿名 openid 对应的 adminId）
    var adminInfo = (wx.getStorageSync && wx.getStorageSync('adminInfo')) || {};
    var adminId = adminInfo.adminId || adminInfo.anonymousNo || '#A00001';

    if (that.data.usingMockData) {
      // 🔴 诚实降级：Mock 模式下明确提示"演示 2FA · 密码=demo123"
      setTimeout(function () {
        that.setData({ faVerifying: false });
        if (pwd === 'demo123') {
          that.setData({
            faStep: 2,
            faMfaPhone: 'mfaPhone · 尾号 5678（演示）',
            faMessage: 'Factor1 密码验证通过（演示）。下一步：发送短信验证码（演示 · 正确码=123456）'
          });
        } else {
          var left = Math.max(0, that.data.faPasswordAttemptsLeft - 1);
          that.setData({
            faPasswordAttemptsLeft: left,
            faMessage: left > 0
              ? ('密码错误（演示）· 剩余 ' + left + ' 次，5 次失败将锁定 30 分钟')
              : '已连续 5 次密码错误 · 前端提示锁定 30 分钟（后端硬执行）'
          });
          if (left === 0) { wx.showToast({ title: '30 分钟锁定中', icon: 'none' }); }
        }
      }, 600);
      return;
    }

    cloud.call('login', { action: 'adminVerifyPassword', adminId: adminId, password: pwd })
      .then(function (r) {
        that.setData({ faVerifying: false });
        if (r && r.code === 0) {
          that.setData({
            faStep: 2,
            faMfaPhone: (r.data && r.data.mfaPhoneMasked) || '已登记手机号',
            faMessage: '密码验证通过，请点击「发送验证码」获取 SMS 6 位码。'
          });
        } else {
          var remain = (r && typeof r.attemptsLeft === 'number') ? r.attemptsLeft : Math.max(0, that.data.faPasswordAttemptsLeft - 1);
          var lock = (r && r.lockedMinutes) ? ('账号已锁定 ' + r.lockedMinutes + ' 分钟') : '';
          that.setData({
            faPasswordAttemptsLeft: remain,
            faMessage: (lock || ('密码错误 · 剩余 ' + remain + ' 次')) + '（后端硬执行限频）'
          });
          if (lock) wx.showToast({ title: lock, icon: 'none' });
        }
      })
      .catch(function (e) {
        that.setData({ faVerifying: false, faMessage: '密码验证调用失败 · ' + ((e && e.msg) || '网络异常') });
      });
  },

  // Factor2：发送短信验证码（login.action=adminSend2FACode）
  onFaSendCode: function () {
    var that = this;
    if (that.data.faSending) return;
    if (that.data.faStep !== 2) { wx.showToast({ title: '请先完成密码验证', icon: 'none' }); return; }
    that.setData({ faSending: true });

    var adminInfo = (wx.getStorageSync && wx.getStorageSync('adminInfo')) || {};
    var mfaPhone = adminInfo.mfaPhone || '';

    if (that.data.usingMockData) {
      setTimeout(function () {
        that.setData({
          faSending: false,
          faMessage: '【演示】短信验证码已发送（限频 5 次/小时 · 正确演示码=123456）'
        });
        wx.showToast({ title: '演示 SMS 已发送', icon: 'success' });
      }, 500);
      return;
    }

    cloud.call('login', { action: 'adminSend2FACode', mfaPhone: mfaPhone })
      .then(function (r) {
        that.setData({ faSending: false });
        if (r && r.code === 0) {
          that.setData({ faMessage: '验证码已发送（5 分钟有效 · 5 次/小时 · 后端硬限频）' });
          wx.showToast({ title: 'SMS 已发送', icon: 'success' });
        } else if (r && r.code === 429) {
          that.setData({ faMessage: '429 限频：本小时短信发送次数已达上限（后端硬执行）' });
        } else {
          that.setData({ faMessage: (r && r.msg) || '发送失败' });
        }
      })
      .catch(function (e) {
        that.setData({ faSending: false, faMessage: '发送验证码失败 · ' + ((e && e.msg) || '网络异常') });
      });
  },

  // Factor2：验证 6 位验证码（login.action=adminVerify2FACode） → 通过则进入阶段 3
  onFaVerifyCode: function () {
    var that = this;
    if (that.data.faVerifying) return;
    var code = that.data.faCode;
    if (!/^\d{6}$/.test(code)) { wx.showToast({ title: '请输入 6 位数字验证码', icon: 'none' }); return; }
    that.setData({ faVerifying: true });

    if (that.data.usingMockData) {
      setTimeout(function () {
        that.setData({ faVerifying: false });
        if (code === '123456') {
          // 演示通路：从 _mockFullRows 取出 PII，但明确写入 audit_logs（Mock）
          var target = that.data.faTarget;
          var mockPII = null;
          if (that._mockFullRows && target) {
            for (var i = 0; i < that._mockFullRows.length; i++) {
              if (that._mockFullRows[i]._id === target._id) { mockPII = that._mockFullRows[i]._mockPII; break; }
            }
          }
          if (!mockPII) mockPII = {};
          that.grantPIIWindow(target, mockPII, /*mock*/ true);
        } else {
          that.setData({ faMessage: '验证码错误（演示）· 请输入 123456' });
        }
      }, 500);
      return;
    }

    cloud.call('login', { action: 'adminVerify2FACode', code: code })
      .then(function (r) {
        that.setData({ faVerifying: false });
        if (r && r.code === 0) {
          // 成功：调用 crisis.accessPII 获取 PII
          wx.showLoading({ title: '加载实名信息…', mask: true });
          var target = that.data.faTarget;
          cloud.call('crisis', { action: 'accessPII', studentAnonymousNo: target.studentAnonymousNo })
            .then(function (r2) {
              wx.hideLoading();
              if (r2 && r2.code === 0 && r2.data && r2.data.pii) {
                that.grantPIIWindow(target, r2.data.pii, /*mock*/ false);
              } else {
                that.setData({ faMessage: 'PII 拉取失败 · ' + ((r2 && r2.msg) || '接口未就绪') });
              }
            })
            .catch(function (e2) {
              wx.hideLoading();
              that.setData({ faMessage: 'PII 拉取异常 · ' + ((e2 && e2.msg) || '网络异常') });
            });
        } else {
          that.setData({ faMessage: (r && r.msg) || '验证码错误 / 已过期' });
        }
      })
      .catch(function (e) {
        that.setData({ faVerifying: false, faMessage: '验证调用失败 · ' + ((e && e.msg) || '网络异常') });
      });
  },

  /* ========== 🔴🔴🔴 阶段 3：30 秒 PII 实名窗口 ========== */
  grantPIIWindow: function (target, piiObj, isMock) {
    var that = this;
    // 1. 先写 audit_logs（grant）
    that.writeAuditPIIAccess(target.studentAnonymousNo, 'grant', isMock);

    // 2. 🔴 只把匿名 No 写 data；真实 PII 先入闭包 _piiCache，再 setData 到 piiReal
    that._piiCache = piiObj || {};
    var untilTs = Date.now() + 30000;

    that.setData({
      piiReal: that._piiCache,               // 🔴 setData 写入 data.piiReal（30s 后强制 null）
      piiMasked: _buildMaskedPII(that._piiCache), // 同步生成 mask 版（备用 + 默认 UI 绑这个）
      piiAuthorized: true,
      authorizedUntil: untilTs,
      piiTargetAnonNo: target.studentAnonymousNo,
      countdownText: '30s',
      faModalOpen: false,
      faTarget: null
    });

    // 3. 启动倒计时显示（每秒刷新）
    that.clearTimers();
    that._countdownTimer = setInterval(function () {
      var remain = Math.max(0, untilTs - Date.now());
      var secs = Math.ceil(remain / 1000);
      that.setData({ countdownText: secs + 's' });
    }, 500);

    // 4. 🔴 30 秒到时：强制回 mask + null 化内存 + audit_logs（auto_clear_30s）
    that._piiTimer = setTimeout(function () {
      that.forceReMask('auto_clear_30s', /*silent*/ false);
    }, 30000);

    wx.showToast({ title: (isMock ? '【演示】' : '') + '实名窗口已开启（30 秒）', icon: 'none' });
  },

  /**
   * 🔴 1477217 核心红线：强制回脱敏
   *  - setData({ piiReal: null, piiAuthorized: false }) 立即覆盖 WXML 绑定为 mask 版
   *  - this.data.piiReal = null 加速 GC
   *  - 闭包 _piiCache = null 销毁
   *  - 写 audit_logs(actionType)
   */
  forceReMask: function (actionType, silent) {
    var that = this;
    that.clearTimers();
    var anonNo = that.data.piiTargetAnonNo || '';
    var wasAuthorized = !!that.data.piiAuthorized;

    // UI 层立即脱敏：WXML 在未授权时只显示 piiMasked（*** / 张* / 138****5678）
    that.setData({
      piiReal: null,             // 🔴 WXML {{piiReal.*}} 立即无值 → 回退显示 piiMasked
      piiAuthorized: false,      // 🔴 未授权 flag
      piiMasked: that.data.piiMasked || _buildMaskedPII(null), // 继续保留 mask 版
      countdownText: '0s'
    });
    // data 层直接 null 化（加速 GC）
    that.data.piiReal = null;
    that.data.authorizedUntil = 0;
    // 闭包缓存 null 化
    that._piiCache = null;

    if (wasAuthorized && anonNo) {
      that.writeAuditPIIAccess(anonNo, actionType || 'auto_clear_30s', !!that.data.usingMockData);
    }
    if (!silent && wasAuthorized) {
      wx.showToast({ title: '实名窗口已过期（30s），返回匿名视图', icon: 'none' });
    }
  },

  /* 用户主动关闭实名视图 */
  onManualClosePII: function () {
    this.forceReMask('manual_close', /*silent*/ false);
  },

  /* ========== 🔴 audit_logs 写入 ========== */
  writeAuditPIIAccess: function (studentAnonymousNo, actionType, isMock) {
    if (!studentAnonymousNo || !actionType) return;
    // 读 adminAnonymousNo（不写 admin 真名）
    var adminInfo = (wx.getStorageSync && wx.getStorageSync('adminInfo')) || {};
    var adminAnonNo = adminInfo.anonymousNo || adminInfo.adminAnonymousNo || '#A00001';
    var payload = {
      action: 'auditPIIAccess',
      audit: {
        adminAnonymousNo: adminAnonNo,
        studentAnonymousNo: studentAnonymousNo,  // 🔴 不写 studentId/studentName，仅 anonymousNo
        actionType: actionType,
        timestamp: Date.now()
      }
    };
    if (isMock) {
      // Mock 模式：不写云，仅 console 本地留痕
      console.log('[people-crisis][audit_logs][MOCK]', JSON.stringify(payload.audit));
      return;
    }
    // 调用 login 或 audit_logs 专用云函数（永远不 throw）
    cloud.call('login', payload)
      .then(function () {})
      .catch(function (err) {
        // 降级：尝试 feedbackSubmit
        cloud.call('feedbackSubmit', { action: 'reviewAI', _side_channel_audit: payload.audit })
          .then(function () {})
          .catch(function () {
            console.warn('[people-crisis][audit_logs] 写入失败 · 本地留痕：', JSON.stringify(payload.audit));
          });
      });
  },

  _noop: function () {}
});
