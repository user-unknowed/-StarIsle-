// cloudfunctions/shared/verifyRole.js
var cloud = null;
var db = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  // 本地 Node 自检环境：wx-server-sdk 未安装时做轻量 stub，只保证 require 成功
  cloud = {
    init: function () {},
    database: function () { return { collection: function () { return { where: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; }, field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; } }; },
    DYNAMIC_CURRENT_ENV: 'local-stub'
  };
  db = cloud.database();
}

/**
 * 鉴权：读取 ctx.OPENID → 查 users → 校验 role 命中 allowed + 可选 teacherStatus 约束
 * @returns user object（云函数内部使用，调用方自行决定是否 stripPII）
 * @throws { code: 403, msg: '...' } 未授权；401 未登录
 */
async function verifyRole(ctx, allowedRoles, opts) {
  allowedRoles = allowedRoles || [];
  opts = opts || {};
  var requireTeacherApproved = opts.requireTeacherApproved !== false;
  if (!ctx || !ctx.OPENID) throw { code: 401, msg: '未登录' };
  var users = db.collection('users');
  var res = await users.where({ openid: ctx.OPENID }).limit(1).get();
  if (!res.data || !res.data.length) throw { code: 4011, msg: '登录态过期，请重新登录' };
  var user = res.data[0];
  if (!allowedRoles.includes(user.role)) throw { code: 403, msg: '无权访问，需要角色：' + allowedRoles.join('/') };
  if (user.role === 'teacher' && requireTeacherApproved && user.teacherStatus !== 'approved') {
    throw { code: 4032, msg: '教师账号尚未通过审核，暂不可使用本功能' };
  }
  if (user.loginExpireAt && user.loginExpireAt < Date.now()) {
    throw { code: 4011, msg: '登录态过期，请重新登录' };
  }
  return user;
}

/**
 * 查询：本人范围 studentIds 白名单（从 classes 和 bindings 反查）
 * used by 所有教师"取数据/科研导出"做 scope 越权拦截
 */
async function fetchOwnStudentIds(teacherId) {
  var pAll = await Promise.all([
    db.collection('classes').where({ teacherId: teacherId }).field({ studentIds: true }).get(),
    db.collection('bindings').where({ teacherId: teacherId }).field({ studentId: true }).get()
  ]);
  var classRes = pAll[0];
  var bindRes = pAll[1];
  var ids = new Set();
  (classRes.data || []).forEach(function (c) {
    (c.studentIds || []).forEach(function (sid) { ids.add(sid); });
  });
  (bindRes.data || []).forEach(function (b) { ids.add(b.studentId); });
  return Array.from(ids);
}

module.exports = { verifyRole: verifyRole, fetchOwnStudentIds: fetchOwnStudentIds };
