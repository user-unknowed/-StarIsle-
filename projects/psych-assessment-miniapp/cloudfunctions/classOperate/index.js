/**
 * cloudfunctions/classOperate/index.js
 *
 * 班级与绑定管理云函数 — 9 个动作 dispatch（switch action）
 *
 *  动作 1: listMyClasses      — teacher(approved)  本人班级列表
 *  动作 2: createClass        — teacher(approved)  创建班级+6位邀请码
 *  动作 3: resetInviteCode    — teacher(approved)  重置班级邀请码
 *  动作 4: joinClassByInvite  — student            学生凭邀请码加入班级
 *  动作 5: removeStudent      — teacher(approved)  教师移除学生（保留历史数据）
 *  动作 6: removeClass        — teacher(approved)  删除班级（tasks 引用时 409）
 *  动作 7: listMyBindings     — teacher(approved)  本人绑定列表
 *  动作 8: createBinding      — teacher(approved)  按学生 anonymousNo 精确绑定
 *  动作 9: removeBinding      — teacher(approved)  解绑（归档 + status_snapshots 失效）
 *
 * 所有鉴权走 shared/verifyRole，统一使用 responseWrapper.ok/fail。
 */

/* eslint-disable */
var cloud, db;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  // 本地 Node 自检环境 stub（wx-server-sdk 未安装时）
  cloud = {
    init: function () {},
    DYNAMIC_CURRENT_ENV: 'local-stub',
    getWXContext: function () { return { OPENID: 'local-stub-openid', APPID: 'local-stub-appid', UNIONID: '' }; },
    database: function () {
      var _cmd = {
        set: function (v) { return v; },
        push: function (v) { return v; },
        pull: function (v) { return v; },
        in: function (arr) { return { in: arr }; },
        and: function (arr) { return { and: arr }; },
        or: function (arr) { return { or: arr }; },
        exists: function (b) { return { exists: b }; },
        neq: function (v) { return { neq: v }; }
      };
      var _empty = Promise.resolve({ data: [] });
      var _stubDoc = {
        get: function () { return Promise.resolve({ data: null }); },
        update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
        remove: function () { return Promise.resolve({ stats: { removed: 0 } }); },
        set: function () { return Promise.resolve({ _id: 'stub-doc' }); }
      };
      return {
        command: _cmd,
        collection: function () {
          return {
            where: function () {
              return {
                limit: function () { return { get: function () { return _empty; } }; },
                get: function () { return _empty; },
                count: function () { return Promise.resolve({ total: 0 }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                remove: function () { return Promise.resolve({ stats: { removed: 0 } }); },
                field: function () { return { get: function () { return _empty; } }; },
                orderBy: function () { return { limit: function () { return { get: function () { return _empty; } }; }, get: function () { return _empty; } }; }
              };
            },
            doc: function () { return _stubDoc; },
            add: function () { return Promise.resolve({ _id: 'stub-id' }); },
            count: function () { return Promise.resolve({ total: 0 }); },
            orderBy: function () { return { limit: function () { return { get: function () { return _empty; } }; }, get: function () { return _empty; }, where: function () { return { get: function () { return _empty; } }; } }; },
            field: function () { return { get: function () { return _empty; } }; }
          };
        }
      };
    }
  };
  db = cloud.database();
}

var COLLECTIONS = require('../shared/collectionNames.js');
var _verifyMod = require('../shared/verifyRole.js');
var verifyRole = _verifyMod.verifyRole;
var _resp = require('../shared/responseWrapper.js');
var ok = _resp.ok;
var fail = _resp.fail;

// ========== 邀请码生成常量 ==========
// 排除易混淆字符：O / 0 / I / 1
var INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
var INVITE_LEN = 6;
var INVITE_MAX_RETRY = 20;

/**
 * 生成 6 位唯一邀请码
 * 规则：字母 A-Z / 数字 2-9（不含 O/0/I/1）
 * 生成后必须查重，最多 20 次循环避免冲突
 */
async function generateUniqueInviteCode() {
  var classesCol = db.collection(COLLECTIONS.classes);
  for (var i = 0; i < INVITE_MAX_RETRY; i++) {
    var code = '';
    for (var j = 0; j < INVITE_LEN; j++) {
      code += INVITE_CHARS.charAt(Math.floor(Math.random() * INVITE_CHARS.length));
    }
    try {
      var res = await classesCol.where({ inviteCode: code }).limit(1).get();
      if (!res.data || res.data.length === 0) {
        return code;
      }
    } catch (e) {
      // 集合不存在或查询失败，当无冲突处理（首次部署降级）
      return code;
    }
  }
  throw { code: 500, msg: '邀请码生成冲突，请重试' };
}

// ============================================================
// 动作 1: listMyClasses — teacher(approved)
// ============================================================
async function actionListMyClasses(ctx, user, event) {
  var classesCol = db.collection(COLLECTIONS.classes);
  var res = await classesCol
    .where({ teacherId: ctx.OPENID })
    .orderBy('createTime', 'desc')
    .limit(200)
    .get();
  var list = (res.data || []).map(function (c) {
    return {
      _id: c._id,
      name: c.name,
      grade: c.grade || '',
      inviteCode: c.inviteCode,
      studentIds: c.studentIds || [],
      countStudentIds: (c.studentIds || []).length,
      createTime: c.createTime,
      updateTime: c.updateTime
    };
  });
  return ok(list);
}

// ============================================================
// 动作 2: createClass — teacher(approved)
// ============================================================
async function actionCreateClass(ctx, user, event) {
  event = event || {};
  var name = String(event.name || '').trim();
  var grade = event.grade ? String(event.grade).trim() : '';
  if (!name) return fail(400, '班级名称不能为空');

  var inviteCode = await generateUniqueInviteCode();
  var now = Date.now();
  var classesCol = db.collection(COLLECTIONS.classes);
  var addRes = await classesCol.add({
    data: {
      teacherId: ctx.OPENID,
      teacherAnonymousNo: user.anonymousNo || '',
      name: name,
      grade: grade,
      inviteCode: inviteCode,
      studentIds: [],
      joinHistory: [],
      createTime: now,
      updateTime: now
    }
  });
  return ok({
    classId: (addRes && addRes._id) || String(addRes),
    inviteCode: inviteCode
  });
}

// ============================================================
// 动作 3: resetInviteCode — teacher(approved)
// ============================================================
async function actionResetInviteCode(ctx, user, event) {
  event = event || {};
  var classId = String(event.classId || '').trim();
  if (!classId) return fail(400, 'classId 缺失');

  var classesCol = db.collection(COLLECTIONS.classes);
  var getRes;
  try {
    getRes = await classesCol.doc(classId).get();
  } catch (e) {
    return fail(404, '班级不存在');
  }
  var cls = getRes && getRes.data;
  if (!cls) return fail(404, '班级不存在');
  if (cls.teacherId !== ctx.OPENID) return fail(403, '无权操作非本人班级');

  var newCode = await generateUniqueInviteCode();
  await classesCol.doc(classId).update({
    data: {
      inviteCode: newCode,
      updateTime: Date.now()
    }
  });
  return ok({ inviteCode: newCode });
}

// ============================================================
// 动作 4: joinClassByInvite — role=student
// ============================================================
async function actionJoinClassByInvite(ctx, user, event) {
  event = event || {};
  var inviteCode = String(event.inviteCode || '').trim().toUpperCase();
  if (!inviteCode) return fail(400, '邀请码不能为空');

  var classesCol = db.collection(COLLECTIONS.classes);
  var cmd = db.command;
  var res;
  try {
    res = await classesCol.where({ inviteCode: inviteCode }).limit(1).get();
  } catch (e) {
    return fail(404, '邀请码无效');
  }
  if (!res.data || !res.data.length) return fail(404, '邀请码不存在');

  var cls = res.data[0];
  var studentId = user._id;
  var studentIds = cls.studentIds || [];
  if (studentIds.indexOf(studentId) >= 0) {
    return ok({
      joined: false,
      reason: 'already_member',
      class: {
        _id: cls._id,
        name: cls.name,
        grade: cls.grade || '',
        teacherAnonymousNo: cls.teacherAnonymousNo || '#T000'
      }
    });
  }

  // 追加 studentIds + 写入 joinHistory
  var now = Date.now();
  var historyEntry = { studentId: studentId, joinedAt: now };
  var patch = {
    studentIds: cmd.push([studentId]),
    updateTime: now
  };
  // 如果 joinHistory 字段已存在则 push，否则初始化
  if (Array.isArray(cls.joinHistory)) {
    patch.joinHistory = cmd.push([historyEntry]);
  } else {
    patch.joinHistory = [historyEntry];
  }
  try {
    await classesCol.doc(cls._id).update({ data: patch });
  } catch (e) {
    // joinHistory 字段不存在时，某些 SDK 可能在 push 时报错，降级重写
    await classesCol.doc(cls._id).update({
      data: {
        studentIds: cmd.push([studentId]),
        joinHistory: [historyEntry],
        updateTime: now
      }
    });
  }

  return ok({
    ok: true,
    class: {
      _id: cls._id,
      name: cls.name,
      grade: cls.grade || '',
      // 学生端仅返回教师匿名编号（#Txxx），不返回真实身份
      teacherAnonymousNo: cls.teacherAnonymousNo || '#T000'
    }
  });
}

// ============================================================
// 动作 5: removeStudent — teacher(approved)
// ============================================================
async function actionRemoveStudent(ctx, user, event) {
  event = event || {};
  var classId = String(event.classId || '').trim();
  var studentId = String(event.studentId || '').trim();
  if (!classId) return fail(400, 'classId 缺失');
  if (!studentId) return fail(400, 'studentId 缺失');

  var classesCol = db.collection(COLLECTIONS.classes);
  var cmd = db.command;
  var getRes;
  try {
    getRes = await classesCol.doc(classId).get();
  } catch (e) {
    return fail(404, '班级不存在');
  }
  var cls = getRes && getRes.data;
  if (!cls) return fail(404, '班级不存在');
  if (cls.teacherId !== ctx.OPENID) return fail(403, '无权操作非本人班级');

  var studentIds = cls.studentIds || [];
  if (studentIds.indexOf(studentId) < 0) {
    return fail(404, '该学生不在此班级中');
  }

  await classesCol.doc(classId).update({
    data: {
      studentIds: cmd.pull(studentId),
      updateTime: Date.now()
    }
  });

  return ok({
    removed: true,
    message: '该学生此前匿名反馈仍保留，仅不可再接新任务'
  });
}

// ============================================================
// 动作 6: removeClass — teacher(approved)
// ============================================================
async function actionRemoveClass(ctx, user, event) {
  event = event || {};
  var classId = String(event.classId || '').trim();
  if (!classId) return fail(400, 'classId 缺失');

  var classesCol = db.collection(COLLECTIONS.classes);
  var tasksCol = db.collection(COLLECTIONS.tasks);
  var cmd = db.command;

  var getRes;
  try {
    getRes = await classesCol.doc(classId).get();
  } catch (e) {
    return fail(404, '班级不存在');
  }
  var cls = getRes && getRes.data;
  if (!cls) return fail(404, '班级不存在');
  if (cls.teacherId !== ctx.OPENID) return fail(403, '无权操作非本人班级');

  // 409 冲突检查：tasks 集合引用该 classId
  var conflictTasks = [];
  try {
    var tRes = await tasksCol
      .where({ classId: classId })
      .field({ _id: true, name: true, status: true })
      .limit(200)
      .get();
    conflictTasks = tRes.data || [];
  } catch (e) { conflictTasks = []; }

  if (conflictTasks.length) {
    var taskNames = conflictTasks.map(function (t) { return t.name || '(未命名)'; }).join(' / ');
    return fail(409, '该班级下已有关联任务，不允许删除；如需删除先解除任务或关闭任务', {
      count: conflictTasks.length,
      taskNames: taskNames
    });
  }

  await classesCol.doc(classId).remove();
  return ok({ removed: true, classId: classId });
}

// ============================================================
// 动作 7: listMyBindings — teacher(approved)
// ============================================================
async function actionListMyBindings(ctx, user, event) {
  var bindingsCol = db.collection(COLLECTIONS.bindings);
  var usersCol = db.collection(COLLECTIONS.users);
  var cmd = db.command;

  // 只返回当前有效绑定（validUntil = null）+ 历史（若有）也一并列出
  var res = await bindingsCol
    .where({ teacherId: ctx.OPENID })
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  var bindings = res.data || [];

  // 收集 studentId，批量反查 anonymousNo（仅取 anonymousNo，不返真名）
  var studentIdSet = new Set();
  bindings.forEach(function (b) {
    if (b.studentId) studentIdSet.add(b.studentId);
  });
  var studentIdArr = Array.from(studentIdSet);
  var anonMap = {};
  if (studentIdArr.length) {
    try {
      var uRes = await usersCol
        .where({ _id: cmd.in(studentIdArr) })
        .field({ _id: true, anonymousNo: true })
        .limit(studentIdArr.length)
        .get();
      (uRes.data || []).forEach(function (u) {
        anonMap[u._id] = u.anonymousNo;
      });
    } catch (e) { /* 集合未就绪降级 */ }
  }

  var out = bindings.map(function (b) {
    var studentAnon = b.studentAnonymousNo || anonMap[b.studentId] || '#S000000';
    return {
      _id: b._id,
      studentId: b.studentId,
      studentAnonymousNo: studentAnon,
      reason: b.reason || '',
      createdAt: b.createdAt,
      validFrom: b.validFrom || b.createdAt,
      validUntil: b.validUntil || null
    };
  });
  return ok(out);
}

// ============================================================
// 动作 8: createBinding — teacher(approved)
// 输入: { studentAnonymousNo(精确匹配 #Sxxxxxx), reason ≤300 字 }
// ============================================================
async function actionCreateBinding(ctx, user, event) {
  event = event || {};
  var studentAnonymousNo = String(event.studentAnonymousNo || '').trim();
  var reason = String(event.reason || '').trim();
  if (!studentAnonymousNo) return fail(400, '学生匿名编号不能为空');
  if (!/^#S\d{6}$/.test(studentAnonymousNo)) {
    return fail(400, '学生匿名编号格式错误，应为 #S 加 6 位数字（如 #S000001）');
  }
  if (reason.length > 300) {
    return fail(400, '绑定理由不得超过 300 字');
  }

  var usersCol = db.collection(COLLECTIONS.users);
  var bindingsCol = db.collection(COLLECTIONS.bindings);
  var cmd = db.command;

  // 精确匹配学生 anonymousNo，且 role=student
  var uRes;
  try {
    uRes = await usersCol
      .where({ anonymousNo: studentAnonymousNo, role: 'student' })
      .limit(1)
      .get();
  } catch (e) {
    return fail(404, '学生匿名编号不存在');
  }
  if (!uRes.data || !uRes.data.length) {
    return fail(404, '学生匿名编号不存在');
  }
  var matched = uRes.data[0];
  var studentId = matched._id;

  // 防重复：同一教师 + 同一学生 且当前有效 validUntil = null
  try {
    var dupRes = await bindingsCol
      .where({
        teacherId: ctx.OPENID,
        studentId: studentId,
        validUntil: null
      })
      .limit(1)
      .get();
    if (dupRes.data && dupRes.data.length) {
      return fail(409, '该学生已绑定');
    }
  } catch (e) { /* 集合不存在视为无重复 */ }

  var now = Date.now();
  var addRes = await bindingsCol.add({
    data: {
      teacherId: ctx.OPENID,
      teacherAnonymousNo: user.anonymousNo || '',
      studentId: studentId,
      studentAnonymousNo: studentAnonymousNo,
      reason: reason,
      validFrom: now,
      validUntil: null,
      createdAt: now
    }
  });
  return ok({
    bindingId: (addRes && addRes._id) || String(addRes)
  });
}

// ============================================================
// 动作 9: removeBinding — teacher(approved)
// 解绑不是删除，而是写 validUntil = now（保留历史）
// 同时归档 status_snapshots：该 bindingId 下所有 validUntil=null 的快照 → validUntil = now - 1
// ============================================================
async function actionRemoveBinding(ctx, user, event) {
  event = event || {};
  var bindingId = String(event.bindingId || '').trim();
  if (!bindingId) return fail(400, 'bindingId 缺失');

  var bindingsCol = db.collection(COLLECTIONS.bindings);
  var cmd = db.command;
  var getRes;
  try {
    getRes = await bindingsCol.doc(bindingId).get();
  } catch (e) {
    return fail(404, '绑定不存在');
  }
  var b = getRes && getRes.data;
  if (!b) return fail(404, '绑定不存在');
  if (b.teacherId !== ctx.OPENID) return fail(403, '无权操作非本人绑定');

  var now = Date.now();
  await bindingsCol.doc(bindingId).update({
    data: { validUntil: now }
  });

  // 归档 status_snapshots（Task9 才有数据，try/catch 降级）
  try {
    var snapCol = db.collection(COLLECTIONS.status_snapshots);
    var archiveTime = Math.max(0, now - 1);
    // 使用 where + update 批量失效该绑定下所有有效快照
    await snapCol
      .where({
        bindingId: bindingId,
        validUntil: null
      })
      .update({
        data: { validUntil: archiveTime }
      }).catch(function () { /* 集合或索引不存在降级 */ });
  } catch (snapErr) {
    // status_snapshots 集合当前不存在（Task9 才部署）——不阻塞
  }

  return ok({ removed: true });
}

// ============================================================
// 统一入口
// ============================================================
exports.main = async function (event, context) {
  event = event || {};
  var action = String(event.action || '').trim();
  var ctx = cloud.getWXContext
    ? cloud.getWXContext()
    : { OPENID: event.__OPENID || 'LOCAL_STUB_OPENID', APPID: '', UNIONID: '' };

  try {
    var user;
    switch (action) {
      case 'listMyClasses':
        user = await verifyRole(ctx, ['teacher']);
        return await actionListMyClasses(ctx, user, event);
      case 'createClass':
        user = await verifyRole(ctx, ['teacher']);
        return await actionCreateClass(ctx, user, event);
      case 'resetInviteCode':
        user = await verifyRole(ctx, ['teacher']);
        return await actionResetInviteCode(ctx, user, event);
      case 'joinClassByInvite':
        user = await verifyRole(ctx, ['student'], { requireTeacherApproved: false });
        return await actionJoinClassByInvite(ctx, user, event);
      case 'removeStudent':
        user = await verifyRole(ctx, ['teacher']);
        return await actionRemoveStudent(ctx, user, event);
      case 'removeClass':
        user = await verifyRole(ctx, ['teacher']);
        return await actionRemoveClass(ctx, user, event);
      case 'listMyBindings':
        user = await verifyRole(ctx, ['teacher']);
        return await actionListMyBindings(ctx, user, event);
      case 'createBinding':
        user = await verifyRole(ctx, ['teacher']);
        return await actionCreateBinding(ctx, user, event);
      case 'removeBinding':
        user = await verifyRole(ctx, ['teacher']);
        return await actionRemoveBinding(ctx, user, event);
      default:
        return fail(400, '未知 action：' + action + '；支持: listMyClasses/createClass/resetInviteCode/joinClassByInvite/removeStudent/removeClass/listMyBindings/createBinding/removeBinding');
    }
  } catch (e) {
    if (e && typeof e === 'object' && typeof e.code === 'number') {
      return fail(e.code, e.msg || ('错误 ' + e.code));
    }
    return fail(500, (e && e.message) ? e.message : String(e));
  }
};

// Node 语法自检辅助：导出动作名数组供 dispatch 验证
Object.assign(exports, {
  _actions: [
    'listMyClasses',
    'createClass',
    'resetInviteCode',
    'joinClassByInvite',
    'removeStudent',
    'removeClass',
    'listMyBindings',
    'createBinding',
    'removeBinding'
  ],
  _generateUniqueInviteCode: generateUniqueInviteCode,
  _INVITE_CHARS: INVITE_CHARS
});
