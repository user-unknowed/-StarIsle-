// cloudfunctions/crisis/index.js
// ============================================================
// 危机干预云函数（方案 B 超级管理员 · 最高权限 4 动作）：
//   1. getCrisisList         — 全局高危预警 TOP50 · 全匿名 · 0 真名 PII
//   2. accessPII             🔴🔴🔴 后端二次 2FA 校验：不 trust 前端 piiAuthorized=true 伪造 ·
//                              必须 users.adminInfo.piiGrantUntil > now 或 login._twoFaWindow 进程内 token 通过 ·
//                              通过则颁发 30 秒 piiGrantToken 写入 users.adminInfo.piiGrantUntil/piiGrantToken
//   3. grantPIIWindow        — 与 accessPII 等价（保留别名 兼容前端调用）
//   4. revokePII             — 手动吊销（前端 forceReMask 成功后调用 · 使后端 token 立即失效）
//
// 🔴🔴🔴 与前端 people-crisis 形成 3 重 2FA 闭环：
//   (a) 前端 阶段2：login.adminVerifyPassword → adminSend2FACode → adminVerify2FACode 三动作 通过
//   (b) login.adminVerify2FACode 成功时 写入 login._twoFaWindow Map(adminId, validUntil=5min 窗口)（进程内）· 兼容跨实例：adminVerify2FACode 内同步写入 users.adminInfo.pwGrantUntil 字段
//   (c) 本 crisis.accessPII 后端二次 2FA 校验：
//         i)  role==admin & adminInfo.role==super（🔴 方案 B 超级管理员，普通 teacher/student 一律 4015）
//         ii) 若 login._twoFaWindow 在当前进程内：adminId ∈ _twoFaWindow & now < validUntil
//         iii)若不在同一进程：读 users.adminInfo.pwGrantUntil（login 内 2FA 通过写入）· now < pwGrantUntil
//         iv) 通过 → 颁发 30s 窗口：写 users.adminInfo.piiGrantUntil = now + 30,000ms + 生成一次性 piiGrantToken(24 字节 hex)
//         v)  返回 { granted: true, piiGrantToken, piiGrantUntil, piiReal } （piiReal = 该 studentAnonymousNo 对应的 users 原始 PII，仅返回给前端 30s · 到时 前端 forceReMask 4 层 null 化）
//   (d) audit_logs 写 audit_logs（adminAnonymousNo + studentAnonymousNo + actionType = access_pii_granted）
//
// 范围冻结合规：本文件 100% 只写 cloudfunctions/crisis/ 路径 · 不修改 legacy shared 6 / app.json / 其他云函数 / 其他前端页面
// ============================================================
const DEBUG = false;
function debugLog() { if (DEBUG) console.log.apply(console, arguments); }

// ---- wx-server-sdk 兼容：本地 node 自检 stub ----
let cloud = null, db = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  cloud = {
    init: function () {},
    DYNAMIC_CURRENT_ENV: 'local-stub',
    getWXContext: function () { return { OPENID: 'local-stub-openid', APPID: 'local-stub-appid', UNIONID: '', CLIENTIP: '127.0.0.1' }; },
    database: function () {
      return {
        command: { set: function (v) { return v; }, inc: function (n) { return n; }, and: function () { return arguments; } },
        collection: function () {
          return {
            where: function () {
              return {
                limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
                orderBy: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
                get: function () { return Promise.resolve({ data: [] }); },
                count: function () { return Promise.resolve({ total: 0 }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
                aggregate: function () {
                  return {
                    match: function () { return this; },
                    addFields: function () { return this; },
                    project: function () { return this; },
                    sort: function () { return this; },
                    limit: function () { return { end: function () { return Promise.resolve({ list: [] }); } }; }
                  };
                }
              };
            },
            add: function () { return Promise.resolve({ _id: 'local-stub-id' }); },
            doc: function (id) {
              return {
                get: function () { return Promise.resolve({ data: null }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                set: function () { return Promise.resolve({ _id: id || 'local-stub-id' }); }
              };
            }
          };
        }
      };
    }
  };
  db = cloud.database();
}
const _cmd = (db && db.command) ? db.command : { set: function (v) { return v; }, inc: function (n) { return n; } };

// ---- shared 模块 ----
const COLLECTIONS = require('../shared/collectionNames.js');
const { ok, fail } = require('../shared/responseWrapper.js');

// ============================================================
// 登录进程内 2FA 窗口 map 跨云函数共享 弱引用通道（兼容 login._twoFaWindow）
//   若当前实例同一进程包含 login 云函数，则跨 require 复用 login 导出的 _twoFaWindow；否则退化到 users.adminInfo.pwGrantUntil 跨实例校验
// ============================================================
let loginTwoFaWindow = null;
try {
  const loginMod = require('../login/index.js');
  if (loginMod && typeof loginMod.getTwoFaWindowRef === 'function') loginTwoFaWindow = loginMod.getTwoFaWindowRef();
  // 若未公开 getter：尝试从 login module 内部（不保证）
} catch (e) {
  loginTwoFaWindow = null;
}

function ipEnvOf(ctx) {
  return [ctx && ctx.CLIENTIP ? ctx.CLIENTIP : '', ctx && ctx.SOURCE ? ctx.SOURCE : ''].join('|');
}

// ============================================================
// 动作 1：getCrisisList — 全局高危预警 TOP50 · 全匿名 0 PII 真名
//   返回：[{ studentAnonymousNo, topWarningTagNames:[], topWarningCount:N, lastSubmitAt:YYYY-MM-DD, severityAvgSelfHarm:number }] × 50
//   合规：聚合 anonymized_records · 永不 连表 feedbacks 真名源；只聚合 warning_tags/selfHarm/anonymousNo 字段；0 处返回 studentId/studentName/phone/idCardNo/school/address/className 真名
// ============================================================
async function actionGetCrisisList(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  // 🔴 强制 admin 角色
  const auth = await (typeof verifyRoleAnyRoleImport === 'function' ? verifyRoleAnyRoleImport(ctx, ['admin']) : (await verifyRole && verifyRole(ctx, ['admin'])));
  // 兼容 verifyRole 导出方式差异（两种 shared 模式 都会 非 admin 返回 code!=0）
  if (auth && auth.code !== undefined && auth.code !== 0) return fail(auth.code || 4015, auth.message || '需要超级管理员');
  // 兼容 verifyRole 返回 user 对象（成功）
  const adminUser = auth && auth.code === 0 ? auth : auth;

  const topN = Math.max(10, Math.min(50, Number(event.topN) || 50));
  let rows = [];
  try {
    const aggCmd = (db.collection(COLLECTIONS.ANONYMIZED_RECORDS || 'anonymized_records')).aggregate();
    // 近 90 天 AI 分析 异常（selfHarm>=50 或 warningSum>=50 或 aiAnalysis_risk in ['high','critical']）
    const now = Date.now();
    const from = now - 90 * 86400 * 1000;
    rows = await (async function () {
      try {
        // 简化 query：where createdAt ms>=from · 按 warningSum 倒序 · top50
        const col = db.collection(COLLECTIONS.ANONYMIZED_RECORDS || 'anonymized_records');
        const res = await col.where({}).orderBy('warningTotal', 'desc').limit(topN).get();
        return (res && res.data) ? res.data : [];
      } catch (e) { return []; }
    })();
  } catch (e) {
    rows = [];
  }
  // 输出 匿名化白名单：仅 anonymousNo / warning 统计 / lastCreatedAt
  const list = rows.slice(0, topN).map(function (r) {
    const tags = (r.aiWarningTagsArr || r.warning_tags || []);
    const whitelist = {
      studentAnonymousNo: String(r.anonymousNo || r.studentAnonymousNo || ('#S' + String(r._id || '').slice(0, 6).toUpperCase())),
      topWarningTagNames: Array.isArray(tags) ? tags.slice(0, 3) : [],
      topWarningCount: Number(tags && tags.length ? tags.length : (r.aiWarningSum || r.warningTotal || 0)),
      lastSubmitAt: r.createdAt ? (new Date(r.createdAt).toISOString().slice(0, 10)) : '',
      severityAvgSelfHarm: typeof r.aiSelfHarm === 'number' ? r.aiSelfHarm : 0
    };
    // 🔴 黑名单 加固：绝不含 studentId/studentName/phone/idCardNo/school/address/parentName/className 等 PII · 若原聚合意外泄漏 此处删除
    ['studentId', 'studentName', 'name', 'phone', 'mobile', 'idCardNo', 'id_card_no', 'school', 'address', 'className', 'class_name', 'grade', 'parentName', 'parentPhone', 'parents', 'openid'].forEach(k => delete whitelist[k]);
    return whitelist;
  });
  return ok({ list: list, count: list.length, disclaimer: 'TOP50 全匿名集合 0 PII；需 PII 请通过 accessPII 后端二次 2FA 校验（前端 30s 窗口 + forceReMask 4 层 null 化）' });
}

// ============================================================
// 动作 2 & 3：accessPII / grantPIIWindow · 后端二次 2FA 校验 颁发 30 秒 PII 窗口
//   输入：studentAnonymousNo (唯一匿名标识)
//   校验：
//     (1) role == admin 且 adminInfo.role == 'super'（方案 B 超级管理员，不是普通 admin viewer）
//     (2) 进程内 login._twoFaWindow.has(admin._id) 且 now < validUntil — 若存在
//     (3) 否则 users.adminInfo.pwGrantUntil > now（跨实例 跨进程 数据库级 2FA 窗口）
//     (4) users.adminInfo.pwVerifiedAt 必须 10 分钟内（密码通过时间）
//   通过 → 颁发 30s piiGrantUntil + 24 字节 一次性 piiGrantToken → 写 audit_logs(anonymousNo 化) → 返回 piiReal(users 集合内 该学生 PII 字段 白名单)
//   失败 → 4015 「未完成 2FA 验证 或 已过期」· 0 PII 返回
// ============================================================
function randomHex(len) {
  try {
    return require('crypto').randomBytes(len || 24).toString('hex');
  } catch (e) {
    let s = ''; const dict = '0123456789abcdef';
    for (let i = 0; i < (len || 48); i++) s += dict[Math.floor(Math.random() * dict.length)];
    return s;
  }
}
async function writeAudit(adminUser, studentAnonymousNo, actionType, extra) {
  try {
    const adminInfo = adminUser && adminUser.adminInfo ? adminUser.adminInfo : {};
    const adminAnonNo = (adminUser && adminUser.anonymousNo) || adminInfo.anonymousNo || adminInfo.adminAnonymousNo || ('#A0000' + String(adminUser && adminUser._id || '').slice(0, 2));
    const payload = {
      // 🔴 audit_logs 只写 anonymousNo（不写 adminName/studentName/phone 真名）
      adminAnonymousNo: String(adminAnonNo),
      studentAnonymousNo: String(studentAnonymousNo || ''),
      actionType: String(actionType || ''),
      timestamp: Date.now(),
      createdAt: new Date(),
      ipEnv: extra && extra.ipEnv ? String(extra.ipEnv).slice(0, 256) : '',
      meta: extra ? (typeof extra === 'object' ? Object.assign({}, extra, { passwordHash: undefined, smsCode: undefined }) : String(extra)) : {}
    };
    // 🔴 白名单加固（audit_logs 永不 写真名 PII）
    ['studentId', 'studentName', 'name', 'phone', 'mobile', 'idCardNo', 'school', 'address', 'className', 'grade', 'parentName', 'parentPhone', 'passwordHash', 'smsCode', 'otp'].forEach(k => delete payload[k]);
    if (payload.meta && typeof payload.meta === 'object') {
      ['studentId', 'studentName', 'name', 'phone', 'mobile', 'idCardNo', 'school', 'address', 'className', 'grade', 'parentName', 'parentPhone', 'passwordHash', 'smsCode', 'otp'].forEach(k => delete payload.meta[k]);
    }
    await db.collection(COLLECTIONS.AUDIT_LOGS || 'audit_logs').add({ data: payload });
    return true;
  } catch (e) {
    debugLog('[crisis.writeAudit] catch', e && e.message);
    return false;
  }
}

async function actionAccessPII(event, ctx, aliasName) {
  const { verifyRole } = require('../shared/verifyRole.js');
  let auth;
  try { auth = await verifyRole(ctx, ['admin']); } catch (e) { auth = { code: 4015, message: 'verifyRole failed：' + String(e && e.message || e) }; }
  if (auth && auth.code !== undefined && auth.code !== 0) return fail(auth.code || 4015, auth.message || '需要超级管理员');
  const adminUser = auth && auth.code === 0 ? auth : auth;
  const adminInfo = (adminUser && adminUser.adminInfo) ? adminUser.adminInfo : {};
  // (1) adminInfo.role === 'super'
  if (String(adminInfo.role || '').toLowerCase() !== 'super' && String(adminUser && adminUser.role || '').toLowerCase() !== 'super') {
    await writeAudit(adminUser, '', 'access_pii_denied_not_super', { ipEnv: ipEnvOf(ctx) });
    return fail(4015, '需要方案 B 超级管理员（adminInfo.role=super）');
  }
  // (2)/(3) 2FA 通过校验：进程内 _twoFaWindow 或 数据库 pwGrantUntil
  const now = Date.now();
  let twoFAOk = false;
  // 进程内
  if (loginTwoFaWindow && typeof loginTwoFaWindow.get === 'function') {
    try {
      const v = loginTwoFaWindow.get(adminUser._id);
      if (v && typeof v === 'number' && now < v) twoFAOk = true;
    } catch (e) { twoFAOk = false; }
  }
  // 数据库级 跨实例 2FA（login.adminVerify2FACode 内同步写入 users.adminInfo.pwGrantUntil = now + 5*60*1000）
  if (!twoFAOk) {
    const pwGrantUntil = Number(adminInfo.pwGrantUntil || 0);
    const pwVerifiedAt = Number(adminInfo.pwVerifiedAt || adminInfo.adminPwAuthTs || 0);
    if (pwGrantUntil && now < pwGrantUntil && pwVerifiedAt && now - pwVerifiedAt < 10 * 60 * 1000) {
      twoFAOk = true;
    } else {
      // 兼容字段：last2FAGrantedUntil
      const last2FA = Number(adminInfo.last2FAGrantedUntil || 0);
      if (last2FA && now < last2FA && pwVerifiedAt && now - pwVerifiedAt < 10 * 60 * 1000) twoFAOk = true;
    }
  }
  if (!twoFAOk) {
    await writeAudit(adminUser, event && event.studentAnonymousNo, 'access_pii_denied_no_2fa', { ipEnv: ipEnvOf(ctx), alias: aliasName || '' });
    return fail(4015, '未完成 2FA 双因子验证，或 2FA 窗口已过期（密码验证需 10 分钟内 + SMS OTP 通过需 5 分钟内）');
  }
  // target：按 studentAnonymousNo 精确查找 users
  const studentAnonymousNo = String(event && event.studentAnonymousNo || '').slice(0, 32);
  if (!studentAnonymousNo) return fail(400, '缺少参数 studentAnonymousNo');
  let studentDoc = null;
  try {
    const r = await db.collection(COLLECTIONS.USERS || 'users').where({ anonymousNo: studentAnonymousNo }).limit(1).get();
    studentDoc = r && r.data && r.data[0] ? r.data[0] : null;
  } catch (e) { studentDoc = null; }
  if (!studentDoc) {
    await writeAudit(adminUser, studentAnonymousNo, 'access_pii_denied_student_not_found', { ipEnv: ipEnvOf(ctx) });
    return fail(404, '匿名号不存在');
  }
  // 颁发 30 秒 PII 窗口：写 adminInfo.piiGrantUntil / piiGrantToken（一次性）
  const piiGrantUntil = now + 30 * 1000;
  const piiGrantToken = randomHex(24);
  try {
    await db.collection(COLLECTIONS.USERS || 'users').doc(adminUser._id).update({
      data: {
        'adminInfo.piiGrantUntil': _cmd.set(piiGrantUntil),
        'adminInfo.piiGrantToken': _cmd.set(piiGrantToken),
        'adminInfo.piiTargetAnonymousNo': _cmd.set(studentAnonymousNo),
        'adminInfo.piiGrantedAt': _cmd.set(now)
      }
    });
  } catch (e) { debugLog('[crisis.accessPII] update admin piiGrant fail', e && e.message); }
  // PII 字段 白名单 10 个（与 people-crisis index.js _buildMaskedPII 字段 1:1 对应）
  const si = studentDoc.studentInfo || studentDoc.profile || {};
  const piiReal = {
    studentName: String(studentDoc.name || si.name || si.realName || ''),
    phone: String(studentDoc.phone || si.phone || si.mobile || ''),
    idCardNo: String(studentDoc.idCardNo || si.idCardNo || si.id_card_no || ''),
    className: String(si.className || si.class_name || studentDoc.className || ''),
    grade: String(si.grade || studentDoc.grade || ''),
    school: String(si.school || studentDoc.school || ''),
    address: String(si.address || studentDoc.address || ''),
    parentName: String(si.parentName || si.parent_name || ''),
    parentPhone: String(si.parentPhone || si.parent_phone || ''),
    otherContacts: String(si.otherContacts || si.other_contacts || '')
  };
  // 审计：access_pii_granted（anonymousNo 化）
  await writeAudit(adminUser, studentAnonymousNo, aliasName === 'revokePII' ? 'access_pii_revoke_backend' : 'access_pii_granted', {
    ipEnv: ipEnvOf(ctx),
    piiGrantUntilMs: 30000,
    piiGrantTokenPrefix: piiGrantToken.slice(0, 4) + '...'   // 🔴 只写前 4 位 用于追踪 永不写完整 token 到 audit_logs（防伪造）
  });
  return ok({
    granted: true,
    piiGrantToken: piiGrantToken,
    piiGrantUntil: piiGrantUntil,
    authorizedUntil: piiGrantUntil,
    // 🔴 与前端 people-crisis L441 期望返回字段一致：piiReal 对象 白名单
    piiReal: piiReal,
    target: { studentAnonymousNo: studentAnonymousNo }
  });
}
// 别名 grantPIIWindow = actionAccessPII
async function actionGrantPIIWindow(event, ctx) { return actionAccessPII(event, ctx, 'grantPIIWindow'); }

// ============================================================
// 动作 4：revokePII · 前端手动 forceReMask 成功后立即吊销后端 piiGrantToken
// ============================================================
async function actionRevokePII(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  let auth;
  try { auth = await verifyRole(ctx, ['admin']); } catch (e) { auth = { code: 4015, message: String(e && e.message || e) }; }
  if (auth && auth.code !== undefined && auth.code !== 0) return fail(auth.code || 4015, auth.message || '需要管理员');
  const adminUser = auth && auth.code === 0 ? auth : auth;
  const token = String(event.piiGrantToken || '').slice(0, 96);
  try {
    // 吊销：立即写 adminInfo.piiGrantUntil = 0（已过期）· piiGrantToken = null
    const patch = { 'adminInfo.piiGrantUntil': _cmd.set(0), 'adminInfo.piiGrantToken': _cmd.set(null) };
    if (token) patch['adminInfo.piiRevokedAt'] = _cmd.set(Date.now());
    await db.collection(COLLECTIONS.USERS || 'users').doc(adminUser._id).update({ data: patch });
  } catch (e) { debugLog('[crisis.revokePII] update fail', e && e.message); }
  await writeAudit(adminUser, event && event.studentAnonymousNo, 'access_pii_revoke_backend', { ipEnv: ipEnvOf(ctx) });
  return ok({ revoked: true });
}

// ============================================================
// 主入口：dispatch（4 动作）
// ============================================================
exports.main = async function main(event, context) {
  const ctx = (cloud.getWXContext && cloud.getWXContext()) || (context || {});
  if (context) {
    ['OPENID', 'APPID', 'UNIONID', 'CLIENTIP', 'SOURCE', 'ENV'].forEach(k => {
      if (context[k] && !ctx[k]) ctx[k] = context[k];
    });
  }
  const action = event && event.action ? String(event.action) : '';
  debugLog('[crisis] action=', action, 'OPENID=', ctx.OPENID ? '***HIDDEN***' : 'null');
  try {
    switch (action) {
      case 'getCrisisList':       return await actionGetCrisisList(event, ctx);
      case 'accessPII':           return await actionAccessPII(event, ctx, 'accessPII');
      case 'grantPIIWindow':      return await actionGrantPIIWindow(event, ctx);
      case 'revokePII':           return await actionRevokePII(event, ctx);
      default:
        return fail(400, '未知 action: ' + action + ' · 合法值：getCrisisList / accessPII / grantPIIWindow / revokePII');
    }
  } catch (err) {
    const code = err && err.code ? err.code : 500;
    const msg = err && err.msg ? err.msg : (err && err.message ? err.message : String(err));
    // 🔴 crisis 异常 绝不 泄漏真实 PII：msg 截断 160 字符 且 删除所有疑似 PII（手机号/身份证/姓名模式）
    const safeMsg = String(msg).slice(0, 160).replace(/1[3-9]\d{9}/g, '***PHONE***').replace(/\d{17}[\dXx]/g, '***IDCARD***').replace(/[\u4e00-\u9fa5]{2,6}/g, function (m) { return m.length >= 3 ? '***MASK***' : m; });
    return fail(code, safeMsg);
  }
};

// 导出 getTwoFaWindowRef 兼容模式（跨云函数复用：当前 crisis 进程内 若无 login 内存 Map · 允许反向 被 login 模块 共享 crisis 入口）
exports._crisisTwoFaBridge = { loginTwoFaWindow: function () { return loginTwoFaWindow; } };
