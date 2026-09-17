// cloudfunctions/login/index.js
// 登录云函数：8 动作 dispatch + Admin 双因子 SMS 限频 stub
// 调试日志开关（默认关闭：避免打印 password/code 等敏感信息）
const DEBUG = false;
function debugLog() { if (DEBUG) console.log.apply(console, arguments); }

// ---- wx-server-sdk 兼容：本地 node 自检 stub ----
let cloud = null;
let db = null;
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
        command: { set: function (v) { return v; }, inc: function (n) { return n; } },
        collection: function () {
          return {
            where: function () {
              return {
                limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
                get: function () { return Promise.resolve({ data: [] }); },
                count: function () { return Promise.resolve({ total: 0 }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                remove: function () { return Promise.resolve({ stats: { removed: 0 } }); }
              };
            },
            add: function () { return Promise.resolve({ _id: 'local-stub-id' }); },
            doc: function () {
              return {
                get: function () { return Promise.resolve({ data: null }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                set: function () { return Promise.resolve({ _id: 'local-stub-id' }); },
                remove: function () { return Promise.resolve({ stats: { removed: 0 } }); }
              };
            },
            count: function () { return Promise.resolve({ total: 0 }); },
            orderBy: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
            field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }
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
const { stripUserPII } = require('../shared/stripPII.js');

// ---- bcrypt 兼容：本地 node 自检时若无 bcryptjs 则以 stub 替代（仅 require 成功用） ----
let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch (e) {
  bcrypt = {
    compareSync: function () { return false; },
    compare: function (a, b, cb) { return Promise.resolve(false); },
    hashSync: function (s, cost) { return '$2b$10$stub$stubstubstubstubstubstubstubstubstubstubstub'; },
    hash: function (s, cost) { return Promise.resolve('$2b$10$stub$stubstubstubstubstubstubstubstubstubstubstub'); }
  };
}

// ============================================================
// 方案 B · Admin 双因子：SMS 客户端最小占位模块（+ 限频 5 次/小时）
// ============================================================
// 内存缓存：Map<adminId, { code, expireAt, sentCountHour, hourStartAt }>
const _smsCache = new Map();
const SMS_MAX_PER_HOUR = 5;
const SMS_CODE_TTL_MS = 10 * 60 * 1000;     // 10 分钟有效
const SMS_HOUR_MS = 60 * 60 * 1000;          // 限频窗口 1 小时

/**
 * ⚠️ 部署替换点：把此函数体替换为阿里云 dysmsapi / 腾讯云 sms SDK 真实调用。
 *   - 阿里云：https://help.aliyun.com/document_detail/419273.html （Node.js SDK @alicloud/dysmsapi20170525）
 *   - 腾讯云：https://cloud.tencent.com/document/product/382/43197 （Node.js SDK tencentcloud-sdk-nodejs-sms）
 * 仅需替换下列 stub 内部，其余限频/缓存逻辑不变。
 */
function _sendSmsCodeStub(phone, code) {
  // [部署时替换] TODO: 真实 SDK 调用，成功 resolve / 失败 reject
  // 示例（阿里云，伪代码）：
  //   const DysmsapiClient = require('@alicloud/dysmsapi20170525').default;
  //   const client = new DysmsapiClient({ accessKeyId, accessKeySecret, endpoint: 'dysmsapi.aliyuncs.com' });
  //   return client.sendSms({ phoneNumbers: phone, signName: '心语小程序', templateCode: 'SMS_XXX', templateParam: JSON.stringify({ code }) });
  debugLog('[SMS stub] 发送到', phone, '6位码=', code);   // 调试日志仅 DEBUG=true 才打印，绝不记录真实环境明文
  return Promise.resolve({ stub: true, phone: phone, sentAt: Date.now() });
}

/** 清理过期的小时窗口，并返回当前 admin 的小时发送计数 */
function _getSmsEntry(adminId) {
  const now = Date.now();
  let entry = _smsCache.get(adminId) || null;
  if (!entry || now - entry.hourStartAt >= SMS_HOUR_MS) {
    entry = { code: null, expireAt: 0, sentCountHour: 0, hourStartAt: now };
    _smsCache.set(adminId, entry);
  }
  return entry;
}

// ---- 公共 helpers ----
function sha256hex(str) {
  // 不依赖额外包；Node 原生 crypto；若云函数运行环境不含 crypto，退化为简单 hash
  try {
    return require('crypto').createHash('sha256').update(String(str || ''), 'utf8').digest('hex');
  } catch (e) {
    let h = 0; const s = String(str || '');
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return 'fallback_' + Math.abs(h).toString(16);
  }
}

function ipEnvOf(ctx) {
  return [ctx && ctx.CLIENTIP ? ctx.CLIENTIP : '', ctx && ctx.SOURCE ? ctx.SOURCE : ''].join('|');
}

async function writeAudit(adminUser, action, targetId, detail) {
  try {
    const col = db.collection(COLLECTIONS.audit_logs);
    await col.add({
      data: {
        adminId: adminUser._id,
        adminAnonymousNo: adminUser.anonymousNo || null,
        action: action,
        targetId: targetId || null,
        detail: detail || {},
        ipEnv: '',
        timestamp: Date.now()
      }
    });
  } catch (e) {
    // 审计日志写失败不阻塞主流程，但记录一条控制台错误（不含敏感字段）
    console.error('[login-cloudfn] audit_logs write failed, action=', action, 'err=', (e && e.errMsg) || e.message || e);
  }
}

async function nextAnonymousNo(role) {
  if (role === 'student') {
    const r = await db.collection(COLLECTIONS.users).where({ role: 'student' }).count();
    const n = (r.total || 0) + 1;
    return '#S' + String(n).padStart(6, '0');
  }
  if (role === 'teacher') {
    const r = await db.collection(COLLECTIONS.users).where({ role: 'teacher' }).count();
    const n = (r.total || 0) + 1;
    return '#T' + String(n).padStart(3, '0');
  }
  if (role === 'admin') {
    const r = await db.collection(COLLECTIONS.users).where({ role: 'admin' }).count();
    const n = (r.total || 0) + 1;
    return '#A' + String(n).padStart(2, '0');
  }
  throw { code: 400, msg: '未知角色' };
}

async function updateUser(userId, patch) {
  const col = db.collection(COLLECTIONS.users);
  return col.doc(userId).update({ data: patch }).catch(() => ({ stats: { updated: 0 } }));
}

// ============================================================
// 动作 1: jscode2session  （未登录也允许）
// ============================================================
async function actionJscode2session(event, ctx) {
  const roleChoice = event.roleChoice || null;
  const profile = event.profile || null;
  // ① 取 OPENID
  const wx = cloud.getWXContext ? cloud.getWXContext() : (ctx || {});
  const openid = (wx && wx.OPENID) || (ctx && ctx.OPENID) || null;
  if (!openid) return fail(4001, '无法获取微信身份，请重试');

  const usersCol = db.collection(COLLECTIONS.users);
  // ② 查 users.where({openid})
  const q = await usersCol.where({ openid: openid }).limit(1).get();
  let user = (q.data && q.data[0]) || null;

  const now = Date.now();
  const expire = now + 30 * 86400 * 1000;

  if (user) {
    // ②续期 loginExpireAt 30 天
    await updateUser(user._id, { loginExpireAt: expire });
    user.loginExpireAt = expire;
    return ok({ user: stripUserPII(user, { forSelf: true, includeTeacherStatus: true }) });
  }

  // ③ 首次 & roleChoice 为 student/teacher → 自动创建
  if (roleChoice !== 'student' && roleChoice !== 'teacher') {
    return fail(4010, '首次登录需选择角色');
  }
  const anonymousNo = await nextAnonymousNo(roleChoice);

  // 安全：profile 字段白名单
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const nickname = safeProfile.nickname ? String(safeProfile.nickname).slice(0, 40) : '';
  const avatarUrl = safeProfile.avatarUrl ? String(safeProfile.avatarUrl).slice(0, 500) : '';
  const grade = (safeProfile.grade || safeProfile.studentInfo || {}).grade
    ? String((safeProfile.grade || (safeProfile.studentInfo && safeProfile.studentInfo.grade) || '')).slice(0, 40)
    : '';
  // 不相信前端传的真实姓名/手机号 → 数据库写空；真姓名/手机号由后续 teacherApprovalSubmit / profile 编辑接口（Task3）再写。
  const doc = {
    openid: openid,
    role: roleChoice,
    anonymousNo: anonymousNo,
    nickname: nickname,
    name: '',
    avatarUrl: avatarUrl,
    phone: '',
    loginExpireAt: expire,
    teacherStatus: roleChoice === 'teacher' ? 'pending' : 'approved',
    teacherInfo: roleChoice === 'teacher' ? { name: '', school: '', teacherCertHash: '' } : undefined,
    studentInfo: roleChoice === 'student' ? { grade: grade, className: '' } : undefined,
    adminInfo: undefined,
    createTime: now
  };
  const add = await usersCol.add({ data: doc });
  user = Object.assign({}, doc, { _id: add._id || ('auto_' + now) });
  return ok({ user: stripUserPII(user, { forSelf: true, includeTeacherStatus: true }) });
}

// ============================================================
// 动作 2: teacherApprovalSubmit
// ============================================================
async function actionTeacherApprovalSubmit(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['teacher'], { requireTeacherApproved: false });

  const name = String(event.name || '').trim();
  const school = String(event.school || '').trim();
  const teacherCertNo = String(event.teacherCertNo || '').trim();
  if (name.length < 2 || school.length < 2 || teacherCertNo.length < 6) {
    return fail(4002, '请完整填写姓名 / 学校 / 教师资格证号');
  }
  const certHash = sha256hex(teacherCertNo);

  const patch = {
    teacherInfo: {
      name: name,
      school: school,
      teacherCertHash: certHash
    },
    teacherStatus: 'pending'
  };
  await updateUser(user._id, patch);

  const now = Date.now();
  await db.collection(COLLECTIONS.teacher_approvals).add({
    data: {
      _createTime: now,
      teacherId: user._id,
      snapshot: { name: name, school: school, teacherCertHash: certHash, teacherAnonymousNo: user.anonymousNo },
      status: 'pending',
      createdAt: now
    }
  }).catch(() => {});

  return ok({ ok: true });
}

// ============================================================
// 动作 3: queryApprovalStatus
// ============================================================
async function actionQueryApprovalStatus(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['teacher'], { requireTeacherApproved: false });

  const teacherStatus = user.teacherStatus || 'pending';
  let rejectionReason = '';
  if (teacherStatus === 'rejected') {
    // 取最近一条 rejection 记录的 reason
    try {
      const r = await db.collection(COLLECTIONS.teacher_approvals)
        .where({ teacherId: user._id, status: 'rejected' })
        .orderBy('createdAt', 'desc').limit(1).get();
      if (r.data && r.data[0] && r.data[0].rejectionReason) rejectionReason = r.data[0].rejectionReason;
    } catch (e) { /* ignore */ }
  }
  // 预计等待天数（近似）：pending 默认 2 天，超过 5 天 → 显示 1 天
  let waitingDays = 2;
  try {
    const r2 = await db.collection(COLLECTIONS.teacher_approvals)
      .where({ teacherId: user._id }).orderBy('createdAt', 'desc').limit(1).get();
    if (r2.data && r2.data[0] && r2.data[0].createdAt) {
      const diffDays = Math.max(0, Math.floor((Date.now() - r2.data[0].createdAt) / 86400000));
      waitingDays = diffDays >= 5 ? 1 : Math.max(1, 3 - diffDays);
    }
  } catch (e) { /* ignore */ }

  return ok({ teacherStatus: teacherStatus, rejectionReason: rejectionReason, waitingDays: waitingDays });
}

// ============================================================
// 动作 4: resubmitTeacherApproval
// ============================================================
async function actionResubmitTeacherApproval(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['teacher'], { requireTeacherApproved: false });
  if (user.teacherStatus !== 'rejected') {
    return fail(4033, '只有被驳回的教师账号才允许重新提交资质');
  }
  const name = String(event.name || '').trim();
  const school = String(event.school || '').trim();
  const teacherCertNo = String(event.teacherCertNo || '').trim();
  if (name.length < 2 || school.length < 2 || teacherCertNo.length < 6) {
    return fail(4002, '请完整填写姓名 / 学校 / 教师资格证号');
  }
  const certHash = sha256hex(teacherCertNo);
  await updateUser(user._id, {
    teacherInfo: { name: name, school: school, teacherCertHash: certHash },
    teacherStatus: 'pending'
  });
  const now = Date.now();
  await db.collection(COLLECTIONS.teacher_approvals).add({
    data: {
      _createTime: now,
      teacherId: user._id,
      snapshot: { name: name, school: school, teacherCertHash: certHash, teacherAnonymousNo: user.anonymousNo },
      status: 'pending',
      createdAt: now
    }
  }).catch(() => {});
  return ok({ ok: true });
}

// ============================================================
// 动作 5(admin): adminVerifyPassword
// ============================================================
async function actionAdminVerifyPassword(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['admin']);

  // 前置：账户锁定检查
  const adminInfo = user.adminInfo || {};
  if (adminInfo.loginLockedUntil && adminInfo.loginLockedUntil > Date.now()) {
    return fail(4039, '管理员账户已锁定30分钟');
  }
  const passwordPlainText = typeof event.passwordPlainText === 'string' ? event.passwordPlainText : '';
  const hash = adminInfo.passwordHash || '';
  let match = false;
  try {
    match = hash ? await bcrypt.compare(passwordPlainText, hash) : false;
  } catch (e) { match = false; }

  const now = Date.now();
  if (match) {
    // 成功：重置失败计数 + 记录 adminPwAuthTs
    const patch = {
      'adminInfo.adminPwAuthTs': now,
      'adminInfo.failedCount': 0,
      'adminInfo.loginLockedUntil': 0
    };
    await updateUser(user._id, patch);
    await writeAudit(user, 'admin_verify_password_success', user._id, { ipEnv: ipEnvOf(ctx) });

    // 90 天强制改密
    const lastPw = adminInfo.lastPwChange || 0;
    const expired = lastPw === 0 || (now - lastPw > 90 * 86400 * 1000);
    const body = { ok: true };
    if (expired) {
      body.passwordChangeRequired = true;
      body.msg = '密码已满90天，请立即修改';
    }
    return ok(body);
  }

  // 失败：failedCount++；>=5 → 锁定30min
  const curFailed = (adminInfo.failedCount || 0) + 1;
  const lockUntil = curFailed >= 5 ? now + 30 * 60 * 1000 : 0;
  await updateUser(user._id, {
    'adminInfo.failedCount': curFailed,
    'adminInfo.loginLockedUntil': lockUntil
  });
  await writeAudit(user, 'admin_verify_password_failed', user._id, {
    failedCount: curFailed,
    attemptHashPrefix: sha256hex(passwordPlainText).slice(0, 16),   // hash 前16位便于审计，不记明文
    locked: curFailed >= 5,
    ipEnv: ipEnvOf(ctx)
  });
  return fail(401, curFailed >= 5 ? '密码错误次数过多，账户已锁定30分钟' : '管理员密码错误');
}

// ============================================================
// 动作 6(admin): adminSend2FACode
// ============================================================
async function actionAdminSend2FACode(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['admin']);
  const adminInfo = user.adminInfo || {};

  // 必须：动作5 成功后 10 分钟内
  const ts = adminInfo.adminPwAuthTs || 0;
  if (!ts || Date.now() - ts > 10 * 60 * 1000) {
    return fail(401, '请先通过管理员密码验证（10分钟内有效）');
  }

  // 限频：5 次/小时
  const entry = _getSmsEntry(user._id);
  if (entry.sentCountHour >= SMS_MAX_PER_HOUR) {
    return fail(429, '本小时短信验证码已达5次上限');
  }

  const phone = adminInfo.mfaPhone || user.phone || '';
  if (!phone || phone.length < 6) return fail(4006, '管理员未配置 MFA 短信手机号，请联系运维');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  entry.code = code;
  entry.expireAt = Date.now() + SMS_CODE_TTL_MS;
  entry.sentCountHour += 1;
  _smsCache.set(user._id, entry);

  try {
    await _sendSmsCodeStub(phone, code);
  } catch (e) {
    // 真实发送失败：回滚计数
    entry.sentCountHour = Math.max(0, entry.sentCountHour - 1);
    entry.code = null;
    entry.expireAt = 0;
    _smsCache.set(user._id, entry);
    return fail(502, '短信发送失败，请稍后重试');
  }

  await writeAudit(user, 'admin_2fa_sent', user._id, {
    sentCountHour: entry.sentCountHour,
    expireAt: entry.expireAt,
    phoneTail: phone.length >= 4 ? phone.slice(-4) : '',
    ipEnv: ipEnvOf(ctx)
  });
  return ok({ ok: true, expireAt: entry.expireAt });
}

// ============================================================
// 动作 7(admin): adminVerify2FACode
// ============================================================
async function actionAdminVerify2FACode(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['admin']);
  const adminInfo = user.adminInfo || {};
  // 动作5必须通过（10 分钟内）
  const ts = adminInfo.adminPwAuthTs || 0;
  if (!ts || Date.now() - ts > 10 * 60 * 1000) {
    return fail(401, '请先通过管理员密码验证（10分钟内有效）');
  }
  const code = String(event.code || '').trim();
  const entry = _smsCache.get(user._id);
  const now = Date.now();
  const match = !!(entry && entry.code && entry.expireAt > now && entry.code === code);
  if (!match) {
    await writeAudit(user, 'admin_2fa_failed', user._id, {
      reason: entry ? (entry.expireAt <= now ? 'expired' : 'mismatch') : 'no_code_sent',
      ipEnv: ipEnvOf(ctx)
    });
    return fail(401, '验证码错误或已过期');
  }
  // 成功：清缓存 code，记录 5 分钟高敏窗口
  entry.code = null;
  entry.expireAt = 0;
  _smsCache.set(user._id, entry);
  const validUntil = now + 5 * 60 * 1000;
  // 写一个瞬时 2FA 通过标记（内存，供动作8等使用；跨实例场景下会退化为不校验 → 线上建议用 Redis / 数据库 TTL）
  _twoFaWindow.set(user._id, validUntil);
  await writeAudit(user, 'admin_2fa_verified', user._id, { validUntil: validUntil, ipEnv: ipEnvOf(ctx) });
  return ok({ verified: true, validUntil: validUntil });
}
const _twoFaWindow = new Map();    // adminId -> validUntil ms（进程内）

// ============================================================
// 动作 8(admin): adminChangePassword
// ============================================================
async function actionAdminChangePassword(event, ctx) {
  const { verifyRole } = require('../shared/verifyRole.js');
  const user = await verifyRole(ctx, ['admin']);
  const adminInfo = user.adminInfo || {};

  // 动作5 密码验证必须通过（10分钟内）
  const pwTs = adminInfo.adminPwAuthTs || 0;
  if (!pwTs || Date.now() - pwTs > 10 * 60 * 1000) {
    return fail(401, '请先通过管理员密码验证（10分钟内有效）');
  }
  // passwordChangeRequired 必须为 true （lastPwChange 超过90天 或 从未改密）
  const lastPw = adminInfo.lastPwChange || 0;
  const required = lastPw === 0 || (Date.now() - lastPw > 90 * 86400 * 1000);
  if (!required) return fail(403, '当前无需强制修改密码');

  const oldPassword = typeof event.oldPassword === 'string' ? event.oldPassword : '';
  const newPassword = typeof event.newPassword === 'string' ? event.newPassword : '';
  if (!newPassword || newPassword.length < 6 || newPassword.length > 20) {
    return fail(400, '新密码长度要求 6~20 位');
  }
  const hash = adminInfo.passwordHash || '';
  let oldOk = false;
  try { oldOk = hash ? await bcrypt.compare(oldPassword, hash) : false; } catch (e) { oldOk = false; }
  if (!oldOk) {
    await writeAudit(user, 'admin_password_change_failed', user._id, { reason: 'old_mismatch', ipEnv: ipEnvOf(ctx) });
    return fail(401, '原密码错误');
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  const now = Date.now();
  await updateUser(user._id, {
    'adminInfo.passwordHash': newHash,
    'adminInfo.lastPwChange': now,
    'adminInfo.failedCount': 0,
    'adminInfo.loginLockedUntil': 0
  });
  await writeAudit(user, 'admin_password_changed', user._id, { ipEnv: ipEnvOf(ctx) });
  return ok({ ok: true });
}

// ============================================================
// 主入口：exports.main(event, context)
// ============================================================
exports.main = async function main(event, context) {
  const ctx = (cloud.getWXContext && cloud.getWXContext()) || (context || {});
  // 合并 context 到 ctx（让 verifyRole 能取到 OPENID / CLIENTIP）
  if (context) {
    ['OPENID', 'APPID', 'UNIONID', 'CLIENTIP', 'SOURCE', 'ENV'].forEach(function (k) {
      if (context[k] && !ctx[k]) ctx[k] = context[k];
    });
  }
  const action = event && event.action ? String(event.action) : '';
  debugLog('[login] action=', action, 'OPENID=', ctx.OPENID ? '***HIDDEN***' : 'null');
  try {
    switch (action) {
      case 'jscode2session':          return await actionJscode2session(event, ctx);
      case 'teacherApprovalSubmit':   return await actionTeacherApprovalSubmit(event, ctx);
      case 'queryApprovalStatus':     return await actionQueryApprovalStatus(event, ctx);
      case 'resubmitTeacherApproval': return await actionResubmitTeacherApproval(event, ctx);
      case 'adminVerifyPassword':     return await actionAdminVerifyPassword(event, ctx);
      case 'adminSend2FACode':        return await actionAdminSend2FACode(event, ctx);
      case 'adminVerify2FACode':      return await actionAdminVerify2FACode(event, ctx);
      case 'adminChangePassword':     return await actionAdminChangePassword(event, ctx);
      // TODO(admin, optional): adminReset2FAForAdmin — super 角色 给另一个 crisis admin 重置 SMS 限频（运维用）
      default:
        return fail(404, '未知 action: ' + action + '（支持：jscode2session / teacherApprovalSubmit / queryApprovalStatus / resubmitTeacherApproval / adminVerifyPassword / adminSend2FACode / adminVerify2FACode / adminChangePassword）');
    }
  } catch (err) {
    // 所有写操作首行已调 verifyRole，抛出的 {code,msg} 统一转成 fail
    if (err && typeof err === 'object' && (err.code || err.msg)) {
      return fail(err.code || 500, err.msg || '服务异常');
    }
    console.error('[login cloudfn] unhandled error:', err && err.stack ? err.stack : err);
    return fail(500, '服务异常');
  }
};

// Node 语法自检辅助：把 8 动作名作为 keys 挂载到 exports（task1 dispatch keys 可见）
Object.assign(exports, {
  _actions: [
    'jscode2session',
    'teacherApprovalSubmit',
    'queryApprovalStatus',
    'resubmitTeacherApproval',
    'adminVerifyPassword',
    'adminSend2FACode',
    'adminVerify2FACode',
    'adminChangePassword'
  ],
  _sendSmsCodeStub: _sendSmsCodeStub
});
