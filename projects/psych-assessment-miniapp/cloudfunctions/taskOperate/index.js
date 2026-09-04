/**
 * cloudfunctions/taskOperate/index.js
 *
 * 任务 CRUD + 科研导出云函数 — 7 个动作 dispatch（switch action）
 *
 *  动作 1: createTask           — teacher(approved) 创建任务草稿（scope class/binding 归属校验 + 图库 imageIds 合法性）
 *  动作 2: publishTask          — teacher(approved) owner 发布本人任务 draft→published
 *  动作 3: closeTask            — teacher(approved) owner 关闭本人任务 published→closed
 *  动作 4: listTasksByTeacher   — teacher(approved) 本人任务列表（分页+过滤）
 *  动作 5: researchExport 🔴    — teacher/admin 科研数据导出（3 层 scope 防漏 + 仅 anonymized_records + 7 天 TTL）
 *  动作 6: listExports          — teacher/admin 本人/全校 export_logs 列表（过期标记）
 *  动作 7: downloadLinkByExportId — teacher/admin 获取导出文件临时下载链接（410 若 TTL 过期）
 *
 * 所有鉴权走 shared/verifyRole，统一使用 responseWrapper.ok/fail。
 * 科研导出：严格 3 层 scope 防漏 + anonymized_records + 字段白名单（零真名 PII）。
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
        neq: function (v) { return { neq: v }; },
        eq: function (v) { return { eq: v }; },
        nin: function (arr) { return { nin: arr }; },
        gte: function (v) { return { gte: v }; },
        lte: function (v) { return { lte: v }; }
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
                skip: function () { return { limit: function () { return { get: function () { return _empty; } }; } }; },
                get: function () { return _empty; },
                count: function () { return Promise.resolve({ total: 0 }); },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); },
                remove: function () { return Promise.resolve({ stats: { removed: 0 } }); },
                field: function () { return { get: function () { return _empty; } }; },
                orderBy: function () { return { limit: function () { return { get: function () { return _empty; } }; }, skip: function () { return { limit: function () { return { get: function () { return _empty; } }; } }; }, get: function () { return _empty; } }; }
              };
            },
            doc: function () { return _stubDoc; },
            add: function () { return Promise.resolve({ _id: 'stub-id' }); },
            count: function () { return Promise.resolve({ total: 0 }); },
            orderBy: function () { return { limit: function () { return { get: function () { return _empty; } }; }, skip: function () { return { limit: function () { return { get: function () { return _empty; } }; } }; }, get: function () { return _empty; }, where: function () { return { get: function () { return _empty; } }; } }; },
            field: function () { return { get: function () { return _empty; } }; }
          };
        }
      };
    },
    uploadFile: function () { return Promise.resolve({ fileID: 'cloud://stub-exports-research.csv' }); },
    deleteFile: function () { return Promise.resolve({}); },
    getTempFileURL: function () { return Promise.resolve({ fileList: [{ fileID: 'stub', tempFileURL: 'https://stub.example.com/tmp.csv' }] }); }
  };
  db = cloud.database();
}

var COLLECTIONS = require('../shared/collectionNames.js');
var _verifyMod = require('../shared/verifyRole.js');
var verifyRole = _verifyMod.verifyRole;
var fetchOwnStudentIds = _verifyMod.fetchOwnStudentIds;
var _resp = require('../shared/responseWrapper.js');
var ok = _resp.ok;
var fail = _resp.fail;

// ================================================================
// 科研导出严格白名单 headers（17 字段，零真名 PII / 零可识别身份信息）
// 绝对不出现：studentId/teacherId/studentName/teacherName/className/
//              realName/phone/school/city/address/openid/weixin
// ================================================================
var RESEARCH_CSV_HEADERS = [
  'anonymousNo',                    // 1: 学生匿名编号 #Sxxxx
  'submitTime',                     // 2: 提交时间戳（毫秒）
  'taskHash',                       // 3: 任务哈希（非 task 真实 _id）
  'schemaVersion',                  // 4: 反馈 schema 版本
  'content',                        // 5: 反馈文本内容（anonymized_records 去 PII 版）
  'ai_depression',                  // 6: AI 抑郁评分 0-100
  'ai_anxiety',                     // 7: AI 焦虑评分 0-100
  'ai_stress',                      // 8: AI 压力评分 0-100
  'ai_wellBeing',                   // 9: AI 幸福感评分 0-100
  'ai_resilience',                  // 10: AI 心理韧性评分 0-100
  'ai_warning_tags_joined',         // 11: AI 预警标签 | 连接
  'ai_summary',                     // 12: AI 总结文本
  'teacher_review_status',          // 13: 教师审核状态 pending/confirmed/rejected
  'teacher_reviewed_by_anon_no',    // 14: 审核教师匿名号 #Txxx（非真实 teacherId）
  'teacher_confirmed_scores_json',  // 15: 教师确认分数 JSON 字符串
  'teacher_confirmed_warning_tags_joined', // 16: 教师确认预警标签 | 连接
  'teacher_confirmed_summary'       // 17: 教师确认总结文本
];
// 注：teacherNote（教师私有备注）即使存在也绝不导出（白名单内无此列）

// ============================================================
// 公用工具函数
// ============================================================
function ymdStr(d) {
  if (!d) d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + m + day;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 从 anonymized_records 行中安全抽取字段，严格按白名单。
 * 第二层兜底：即使数据库行含 PII，这里也只取 whitelist 内字段。
 */
function rowToCsvMap(r) {
  var out = {};
  RESEARCH_CSV_HEADERS.forEach(function (key) {
    if (key === 'ai_warning_tags_joined') {
      out[key] = Array.isArray(r.ai_warning_tags) ? (r.ai_warning_tags || []).join('|') : (r.ai_warning_tags_joined || '');
    } else if (key === 'teacher_confirmed_warning_tags_joined') {
      out[key] = Array.isArray(r.teacher_confirmed_warning_tags) ? (r.teacher_confirmed_warning_tags || []).join('|') : (r.teacher_confirmed_warning_tags_joined || '');
    } else if (key === 'teacher_confirmed_scores_json') {
      if (r.teacher_confirmed_scores_json !== undefined) {
        out[key] = r.teacher_confirmed_scores_json;
      } else if (r.teacher_confirmed_scores && typeof r.teacher_confirmed_scores === 'object') {
        try { out[key] = JSON.stringify(r.teacher_confirmed_scores); } catch (e) { out[key] = ''; }
      } else { out[key] = ''; }
    } else if (r[key] !== undefined) {
      out[key] = r[key];
    } else {
      out[key] = '';
    }
  });
  return out;
}

// ============================================================
// 动作 1: createTask — teacher(approved)
// Scope 校验（本人）：
//   scope.type === 'class'   → classes WHERE teacherId==本人 AND _id in scopeIds → 403
//   scope.type === 'binding' → bindings WHERE teacherId==本人 AND _id in scopeIds → 403
// imageIds 合法性：查 images 集合 → 400 若不存在
// ============================================================
async function actionCreateTask(ctx, user, event) {
  event = event || {};
  var title = String(event.title || '').trim();
  var instruction = String(event.instruction || '').trim();
  var imageIds = Array.isArray(event.imageIds) ? event.imageIds.slice() : [];
  var requirementType = String(event.requirementType || 'per_image').trim();
  var feedbackSchema = event.feedbackSchema || null;
  var scope = event.scope || null;
  var deadline = event.deadline ? Number(event.deadline) : null;
  var minWordsPerImage = event.minWordsPerImage ? Number(event.minWordsPerImage) : 0;

  // ===== 参数基本校验 =====
  if (!title) return fail(400, '任务标题不能为空');
  if (!scope || typeof scope !== 'object') return fail(400, 'scope 参数缺失');
  if (scope.type !== 'class' && scope.type !== 'binding') {
    return fail(400, 'scope.type 仅支持 class 或 binding');
  }
  if (!Array.isArray(scope.scopeIds) || !scope.scopeIds.length) {
    return fail(400, 'scope.scopeIds 不能为空数组');
  }
  if (imageIds.length === 0) return fail(400, 'imageIds 不能为空（至少选择 1 张图片）');
  if (deadline && deadline < Date.now()) {
    return fail(400, 'deadline 不能早于当前时间');
  }
  if (minWordsPerImage < 0) minWordsPerImage = 0;

  var cmd = db.command;

  // ===== Scope 校验：本人 owner 校验 =====
  if (scope.type === 'class') {
    // scope.type=class：classes WHERE teacherId==本人 AND _id in scopeIds
    var classRes;
    try {
      classRes = await db.collection(COLLECTIONS.classes)
        .where({
          teacherId: ctx.OPENID,
          _id: cmd.in(scope.scopeIds)
        })
        .field({ _id: true })
        .limit(scope.scopeIds.length)
        .get();
    } catch (e) {
      return fail(500, '班级查询失败：' + ((e && e.message) || String(e)));
    }
    var foundClassIds = (classRes.data || []).map(function (c) { return c._id; });
    for (var ci = 0; ci < scope.scopeIds.length; ci++) {
      if (foundClassIds.indexOf(scope.scopeIds[ci]) < 0) {
        return fail(403, 'Scope 越权：班级不属于您或不存在 → ' + String(scope.scopeIds[ci]));
      }
    }
  } else {
    // scope.type=binding：bindings WHERE teacherId==本人 AND _id in scopeIds
    var bindRes;
    try {
      bindRes = await db.collection(COLLECTIONS.bindings)
        .where({
          teacherId: ctx.OPENID,
          _id: cmd.in(scope.scopeIds)
        })
        .field({ _id: true })
        .limit(scope.scopeIds.length)
        .get();
    } catch (e) {
      return fail(500, '绑定查询失败：' + ((e && e.message) || String(e)));
    }
    var foundBindIds = (bindRes.data || []).map(function (b) { return b._id; });
    for (var bi = 0; bi < scope.scopeIds.length; bi++) {
      if (foundBindIds.indexOf(scope.scopeIds[bi]) < 0) {
        return fail(403, 'Scope 越权：绑定不属于您或不存在 → ' + String(scope.scopeIds[bi]));
      }
    }
  }

  // ===== imageIds 合法性：图库 images 集合校验 =====
  try {
    var imgRes = await db.collection(COLLECTIONS.images)
      .where({ _id: cmd.in(imageIds) })
      .field({ _id: true })
      .limit(imageIds.length)
      .get();
    var foundImgIds = (imgRes.data || []).map(function (img) { return img._id; });
    for (var ii = 0; ii < imageIds.length; ii++) {
      if (foundImgIds.indexOf(imageIds[ii]) < 0) {
        return fail(400, 'imageId 不存在于图库 → ' + String(imageIds[ii]));
      }
    }
  } catch (e) {
    return fail(500, '图库查询失败：' + ((e && e.message) || String(e)));
  }

  // ===== 写 tasks 集合 =====
  var now = Date.now();
  var taskDoc = {
    teacherId: ctx.OPENID,
    teacherAnonymousNo: user.anonymousNo || '',
    title: title,
    instruction: instruction,
    imageIds: imageIds,
    requirementType: requirementType,
    feedbackSchema: feedbackSchema,
    scope: scope,
    status: 'draft',
    publishTime: null,
    deadline: deadline,
    minWordsPerImage: minWordsPerImage,
    createTime: now,
    updateTime: now
  };

  var addRes;
  try {
    addRes = await db.collection(COLLECTIONS.tasks).add({ data: taskDoc });
  } catch (e) {
    return fail(500, '任务创建失败：' + ((e && e.message) || String(e)));
  }

  return ok({
    taskId: (addRes && addRes._id) || String(addRes)
  });
}

// ============================================================
// 动作 2: publishTask — teacher(approved) owner 校验
// tasks.teacherId==本人 → status draft→published + publishTime=now
// ============================================================
async function actionPublishTask(ctx, user, event) {
  event = event || {};
  var taskId = String(event.taskId || '').trim();
  if (!taskId) return fail(400, 'taskId 缺失');

  var tasksCol = db.collection(COLLECTIONS.tasks);
  var getRes;
  try {
    getRes = await tasksCol.doc(taskId).get();
  } catch (e) {
    return fail(404, '任务不存在');
  }
  var task = getRes && getRes.data;
  if (!task) return fail(404, '任务不存在');
  if (task.teacherId !== ctx.OPENID) return fail(403, '无权发布非本人任务');
  if (task.status === 'published') return ok({ published: true, reason: 'already_published' });
  if (task.status === 'closed') return fail(409, '任务已关闭，无法发布');

  var now = Date.now();
  try {
    await tasksCol.doc(taskId).update({
      data: {
        status: 'published',
        publishTime: now,
        updateTime: now
      }
    });
  } catch (e) {
    return fail(500, '任务发布失败：' + ((e && e.message) || String(e)));
  }
  return ok({ published: true });
}

// ============================================================
// 动作 3: closeTask — teacher(approved) owner 校验
// tasks.teacherId==本人 → status published→closed
// ============================================================
async function actionCloseTask(ctx, user, event) {
  event = event || {};
  var taskId = String(event.taskId || '').trim();
  if (!taskId) return fail(400, 'taskId 缺失');

  var tasksCol = db.collection(COLLECTIONS.tasks);
  var getRes;
  try {
    getRes = await tasksCol.doc(taskId).get();
  } catch (e) {
    return fail(404, '任务不存在');
  }
  var task = getRes && getRes.data;
  if (!task) return fail(404, '任务不存在');
  if (task.teacherId !== ctx.OPENID) return fail(403, '无权关闭非本人任务');
  if (task.status === 'closed') return ok({ closed: true, reason: 'already_closed' });
  if (task.status === 'draft') return fail(409, '草稿任务无需关闭（可直接删除或先发布）');

  var now = Date.now();
  try {
    await tasksCol.doc(taskId).update({
      data: {
        status: 'closed',
        updateTime: now
      }
    });
  } catch (e) {
    return fail(500, '任务关闭失败：' + ((e && e.message) || String(e)));
  }
  return ok({ closed: true });
}

// ============================================================
// 动作 4: listTasksByTeacher — teacher(approved) 本人任务
// 参数: scopeFilter? / statusFilter? / pageToken? / pageSize=20
// 仅返回本人；字段：_id/title/status/scope/publishTime/deadline/imageCount/lastSubmitCount
// ============================================================
async function actionListTasksByTeacher(ctx, user, event) {
  event = event || {};
  var statusFilter = event.statusFilter ? String(event.statusFilter).trim() : null;
  var scopeFilter = event.scopeFilter ? String(event.scopeFilter).trim() : null; // 'class' | 'binding' | null
  var pageSize = event.pageSize ? Math.min(100, Math.max(1, Number(event.pageSize))) : 20;
  var pageToken = event.pageToken ? Number(event.pageToken) || 0 : 0;

  var tasksCol = db.collection(COLLECTIONS.tasks);
  var where = { teacherId: ctx.OPENID };
  if (statusFilter) where.status = statusFilter;
  if (scopeFilter) where['scope.type'] = scopeFilter;

  var cmd = db.command;
  var res;
  try {
    res = await tasksCol
      .where(where)
      .orderBy('updateTime', 'desc')
      .skip(pageToken)
      .limit(pageSize)
      .field({
        _id: true,
        title: true,
        status: true,
        scope: true,
        publishTime: true,
        deadline: true,
        imageIds: true,
        lastSubmitCount: true,
        updateTime: true
      })
      .get();
  } catch (e) {
    res = { data: [] };
  }

  var list = (res.data || []).map(function (t) {
    return {
      _id: t._id,
      title: t.title,
      status: t.status,
      scope: t.scope,
      publishTime: t.publishTime || null,
      deadline: t.deadline || null,
      imageCount: Array.isArray(t.imageIds) ? t.imageIds.length : 0,
      lastSubmitCount: t.lastSubmitCount || 0
    };
  });

  // 下一 pageToken
  var nextPageToken = list.length < pageSize ? null : (pageToken + list.length);

  return ok({
    list: list,
    nextPageToken: nextPageToken,
    pageSize: pageSize
  });
}

// ============================================================
// 动作 5: researchExport 🔴🔴🔴 最高风险功能（3 层 scope 防漏）
//
// 身份: verifyRole(['teacher','admin'])
// 输入: { exportName, scope: {type:'all_my'|'class'|'binding'|'task', scopeId,
//          dateRange:{start,end}}, format: 'csv_multi' | 'csv_flat' }
//
// 🔴 3 层 scope 防线（逐层失败即 403；3 层全部通过才执行查询）：
//   层① 本人白名单：
//     - teacher: 本人 studentIds = fetchOwnStudentIds(ctx.OPENID)
//     - admin: allowAll=true 全校
//     - class scopeId: classes.doc → classes.teacherId==本人
//     - task scopeId: tasks.teacherId==本人
//     - binding scopeId: bindings.teacherId==本人
//     - all_my: 无条件（层③ 再白名单 AND）
//   层② scopeId 归属后端强查：
//     前端传 scopeId 无论什么，后端都重新查 tasks/classes/bindings 集合
//     对应 ownerId 比对 ctx.OPENID（admin 跳过）；任何越权 → 403
//   层③ 最终 SQL WHERE：**从 anonymized_records 集合读取**
//     （绝对不读 feedbacks 真名 PII 集合）：
//     - admin：无 studentId 限制
//     - teacher：anonymousNo 白名单 WHERE anonymousNo IN (anonsArray)
//     - AND createTime >= dateRange.start AND createTime <= dateRange.end
//     - scope.type='task' → AND taskId==taskId
//     - scope.type='class'|'binding' → 先查 studentIds → anonymousNo 白名单 AND
//
// 🔴 导出字段严格白名单 17 字段 + 写 export_logs + ttlExpireAt=now+7d
// ============================================================
async function actionResearchExport(ctx, user, event) {
  event = event || {};
  var exportName = String(event.exportName || ('research_export_' + ymdStr(new Date()))).slice(0, 80);
  var scope = event.scope || null;
  var format = event.format === 'csv_multi' ? 'csv_multi' : 'csv_flat';

  if (!scope || typeof scope !== 'object') return fail(400, 'scope 参数缺失');
  var scopeType = String(scope.type || '').trim();
  var validScopeTypes = ['all_my', 'class', 'binding', 'task'];
  if (validScopeTypes.indexOf(scopeType) < 0) {
    return fail(400, 'scope.type 必须是: all_my/class/binding/task');
  }
  if (scopeType !== 'all_my' && !scope.scopeId) {
    return fail(400, '非 all_my 类型 scope.scopeId 不能为空');
  }

  // dateRange 校验
  var dateRange = scope.dateRange || null;
  if (!dateRange || typeof dateRange !== 'object') {
    return fail(400, 'scope.dateRange {start,end} 必传（时间戳毫秒）');
  }
  var drStart = Number(dateRange.start) || 0;
  var drEnd = Number(dateRange.end) || 0;
  if (!drStart || !drEnd || drStart > drEnd) {
    return fail(400, 'dateRange 无效（start 必须 ≤ end，均为毫秒时间戳）');
  }
  // 兜底：最多跨度 2 年
  if (drEnd - drStart > 2 * 365 * 24 * 3600 * 1000) {
    return fail(400, 'dateRange 跨度不得超过 2 年');
  }

  var isAdmin = user.role === 'admin';
  var cmd = db.command;
  var scopeId = scope.scopeId || null;

  // ============================================================
  // 层① 本人白名单 — teacher 必须有本人覆盖学生；class/binding/task 必须本人 owner
  // 层①本人白名单标记（用于合规 grep 核查）
  // ============================================================
  var ownStudentIds = [];
  if (!isAdmin) {
    ownStudentIds = await fetchOwnStudentIds(ctx.OPENID);
    // all_my 范围：若本人名下无任何学生 → 403
    if (scopeType === 'all_my' && ownStudentIds.length === 0) {
      return fail(403, '层①本人白名单：您名下暂无任何学生，无法导出');
    }
  }

  // ============================================================
  // 层② scopeId 归属后端强查（admin 跳过）
  // 层②scopeId归属标记（用于合规 grep 核查）
  // ============================================================
  var resolvedStudentIds = null; // 针对 class/binding scope，先在层② 精确算出 studentIds
  var resolvedTaskId = null;

  if (scopeType === 'task') {
    var taskRes;
    try {
      taskRes = await db.collection(COLLECTIONS.tasks).doc(scopeId).get();
    } catch (e) {
      return fail(404, '层②scopeId归属：task 不存在');
    }
    var theTask = taskRes && taskRes.data;
    if (!theTask) return fail(404, '层②scopeId归属：task 不存在');
    if (!isAdmin && theTask.teacherId !== ctx.OPENID) {
      return fail(403, '层②scopeId归属越权：该 task 不属于您');
    }
    resolvedTaskId = scopeId;
    // task 场景：层③ 仍需白名单 anonymousNo 限制（teacher）
  } else if (scopeType === 'class') {
    var classRes2;
    try {
      classRes2 = await db.collection(COLLECTIONS.classes).doc(scopeId).get();
    } catch (e) {
      return fail(404, '层②scopeId归属：class 不存在');
    }
    var theClass = classRes2 && classRes2.data;
    if (!theClass) return fail(404, '层②scopeId归属：class 不存在');
    if (!isAdmin && theClass.teacherId !== ctx.OPENID) {
      return fail(403, '层②scopeId归属越权：该 class 不属于您');
    }
    resolvedStudentIds = theClass.studentIds || [];
    // 非 admin：resolvedStudentIds 还要和 ownStudentIds 交集
    if (!isAdmin) {
      var ownSet = new Set(ownStudentIds);
      resolvedStudentIds = resolvedStudentIds.filter(function (sid) { return ownSet.has(sid); });
    }
  } else if (scopeType === 'binding') {
    var bindRes2;
    try {
      bindRes2 = await db.collection(COLLECTIONS.bindings).doc(scopeId).get();
    } catch (e) {
      return fail(404, '层②scopeId归属：binding 不存在');
    }
    var theBinding = bindRes2 && bindRes2.data;
    if (!theBinding) return fail(404, '层②scopeId归属：binding 不存在');
    if (!isAdmin && theBinding.teacherId !== ctx.OPENID) {
      return fail(403, '层②scopeId归属越权：该 binding 不属于您');
    }
    resolvedStudentIds = theBinding.studentId ? [theBinding.studentId] : [];
    if (!isAdmin) {
      var _ownSet = new Set(ownStudentIds);
      resolvedStudentIds = resolvedStudentIds.filter(function (sid) { return _ownSet.has(sid); });
    }
  }

  // ============================================================
  // 层③ 最终 SQL WHERE：从 anonymized_records 集合读取（绝对不读 feedbacks）
  // 层③最终SQL anonymized_records 标记（用于合规 grep 核查）
  // ============================================================
  var anonWhiteListSet = null; // 匿名号白名单 Set（teacher 用；admin 为空 = 全校）

  if (!isAdmin) {
    // teacher：确定 studentIds 白名单 → anonymousNo 数组
    var effectiveStudentIds;
    if (resolvedStudentIds !== null) {
      effectiveStudentIds = resolvedStudentIds; // 已在层② 计算且和 ownStudentIds 求过交集
    } else {
      effectiveStudentIds = ownStudentIds; // all_my / task（task 情形 layer3 再 AND taskId）
    }
    if (!effectiveStudentIds.length) {
      // 无任何学生覆盖 → 返回空结果（非 403，是正常"无可导出数据"）
      anonWhiteListSet = new Set();
    } else {
      try {
        var uRes = await db.collection(COLLECTIONS.users)
          .where({ _id: cmd.in(effectiveStudentIds) })
          .field({ _id: true, anonymousNo: true })
          .limit(effectiveStudentIds.length)
          .get();
        var anonsArr = [];
        (uRes.data || []).forEach(function (u) {
          if (u.anonymousNo) anonsArr.push(u.anonymousNo);
        });
        anonWhiteListSet = new Set(anonsArr);
      } catch (e) {
        anonWhiteListSet = new Set();
      }
    }
  }
  // admin：anonWhiteListSet=null 表示无匿名号限制（全校）

  // ====== 层③ 最终 SQL WHERE 组装 anonymized_records ======
  var whereClause = {};
  whereClause.createTime = cmd.and([cmd.gte(drStart), cmd.lte(drEnd)]);
  if (!isAdmin) {
    // teacher：强制 anonymousNo 白名单 AND
    if (!anonWhiteListSet || anonWhiteListSet.size === 0) {
      // 空白名单 → 无数据可导，但仍正常走完流程（返回 0 行结果）
      whereClause.anonymousNo = cmd.in(['__NO_MATCH__PLACEHOLDER__']);
    } else {
      whereClause.anonymousNo = cmd.in(Array.from(anonWhiteListSet));
    }
  }
  if (resolvedTaskId) {
    whereClause.taskId = resolvedTaskId;
  }

  // ====== 分页查 anonymized_records（避免内存爆；最大 5 万行兜底）======
  var PAGE_SIZE = 500;
  var allRows = [];
  var hasMore = true;
  var skip = 0;
  var anonCol = db.collection(COLLECTIONS.anonymized_records);
  var MAX_ROWS = 50000;

  while (hasMore) {
    var page;
    try {
      page = await anonCol
        .where(whereClause)
        .orderBy('createTime', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        // 🔴 只查白名单相关字段，绝不拖入额外 PII
        .field({
          _id: true,
          anonymousNo: true,
          submitTime: true,
          createTime: true,
          taskHash: true,
          taskId: true,
          schemaVersion: true,
          content: true,
          ai_depression: true,
          ai_anxiety: true,
          ai_stress: true,
          ai_wellBeing: true,
          ai_resilience: true,
          ai_warning_tags: true,
          ai_warning_tags_joined: true,
          ai_summary: true,
          teacher_review_status: true,
          teacher_reviewed_by_anon_no: true,
          teacher_confirmed_scores: true,
          teacher_confirmed_scores_json: true,
          teacher_confirmed_warning_tags: true,
          teacher_confirmed_warning_tags_joined: true,
          teacher_confirmed_summary: true
        })
        .get();
    } catch (e) {
      page = { data: [] };
    }
    var rows = page.data || [];
    if (!rows.length) { hasMore = false; break; }
    allRows = allRows.concat(rows);
    if (rows.length < PAGE_SIZE) hasMore = false;
    else skip += PAGE_SIZE;
    if (allRows.length > MAX_ROWS) hasMore = false;
  }

  // ====== CSV 构造（严格字段白名单 + 二次剥离）======
  var csvLines = [RESEARCH_CSV_HEADERS.map(csvCell).join(',')];
  for (var ri = 0; ri < allRows.length; ri++) {
    var raw = allRows[ri];
    var safe = rowToCsvMap(raw);
    var line = RESEARCH_CSV_HEADERS.map(function (k) { return csvCell(safe[k]); }).join(',');
    csvLines.push(line);
  }
  var csvContent = csvLines.join('\r\n');
  var rowCount = allRows.length;

  // ====== 写云存储 exports-research/ 目录 ======
  var now = Date.now();
  var ext = format === 'csv_multi' ? 'zip' : 'csv'; // csv_multi 占位：当前统一 CSV；未来可扩展多 CSV zip
  var fileName = 'research-' + scopeType + '-' + ymdStr(new Date(now)) + '-' + Math.floor(now / 1000) + '.csv';
  var cloudPath = 'exports-research/' + fileName;
  var fileID = '';
  try {
    var buf = Buffer.from(csvContent, 'utf-8');
    var upRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buf
    });
    fileID = (upRes && upRes.fileID) || '';
  } catch (e) {
    fileID = '';
  }

  // ====== 写 export_logs 集合 + 7 天 TTL 元数据 ======
  var ttlExpireAt = now + 7 * 24 * 60 * 60 * 1000; // 7 天 = 7 * 86400000 毫秒
  var exportType = 'research_' + scopeType + '_' + format;
  var logData = {
    exportName: exportName,
    exportType: exportType,
    scopeType: scopeType,
    scopeId: scopeId,
    dateRangeStart: drStart,
    dateRangeEnd: drEnd,
    format: format,
    rowCount: rowCount,
    fields: RESEARCH_CSV_HEADERS.slice(),
    cloudPath: cloudPath,
    fileID: fileID,
    ttlExpireAt: ttlExpireAt, // 7 天 TTL 自动过期标记（配合云存储 lifecycle）
    createTime: now
  };
  if (user.role === 'teacher') {
    logData.teacherId = ctx.OPENID;
    logData.teacherAnonymousNo = user.anonymousNo || '';
  } else if (user.role === 'admin') {
    logData.adminId = ctx.OPENID;
    logData.adminAnonymousNo = user.anonymousNo || '';
  }

  var exportId = '';
  try {
    var logAddRes = await db.collection(COLLECTIONS.export_logs).add({ data: logData });
    exportId = (logAddRes && logAddRes._id) || String(logAddRes);
  } catch (e) {
    exportId = 'log-save-failed';
  }

  return ok({
    exportId: exportId,
    cloudPath: cloudPath,
    fileID: fileID,
    rowCount: rowCount,
    fields: RESEARCH_CSV_HEADERS.slice(),
    ttlExpireAt: ttlExpireAt
  });
}

// ============================================================
// 动作 6: listExports — 本人 export_logs
// teacher 角色：仅看本人 teacherAnonymousNo / teacherId
// admin 角色：看全校最新
// 按 createTime desc；ttlExpireAt < now 行标记"已过期"，不显示完整 fileID 链接
// ============================================================
async function actionListExports(ctx, user, event) {
  event = event || {};
  var pageSize = event.pageSize ? Math.min(100, Math.max(1, Number(event.pageSize))) : 20;
  var pageToken = event.pageToken ? Number(event.pageToken) || 0 : 0;
  var isAdmin = user.role === 'admin';

  var logCol = db.collection(COLLECTIONS.export_logs);
  var where = {};
  if (!isAdmin) {
    // teacher：本人 teacherId OR teacherAnonymousNo == 本人 anonymousNo
    // 优先用 teacherId 精确匹配（跨匿名号变更兼容）
    where.teacherId = ctx.OPENID;
  }

  var res;
  try {
    res = await logCol
      .where(where)
      .orderBy('createTime', 'desc')
      .skip(pageToken)
      .limit(pageSize)
      .field({
        _id: true,
        exportName: true,
        scopeType: true,
        scopeId: true,
        dateRangeStart: true,
        dateRangeEnd: true,
        rowCount: true,
        ttlExpireAt: true,
        cloudPath: true,
        fileID: true,
        format: true,
        createTime: true,
        teacherId: true,
        adminId: true
      })
      .get();
  } catch (e) {
    res = { data: [] };
  }

  var now = Date.now();
  var list = (res.data || []).map(function (log) {
    var expired = !!(log.ttlExpireAt && log.ttlExpireAt < now);
    return {
      exportId: log._id,
      exportName: log.exportName || '',
      scopeType: log.scopeType || '',
      dateRange: { start: log.dateRangeStart || 0, end: log.dateRangeEnd || 0 },
      rowCount: log.rowCount || 0,
      ttlExpireAt: log.ttlExpireAt || 0,
      cloudPath: log.cloudPath || '',
      expired: expired,
      // 🔴 TTL 过期：不提供下载链接提示
      downloadAvailable: !expired && !!log.fileID,
      format: log.format || 'csv_flat',
      createTime: log.createTime || 0
    };
  });

  var nextPageToken = list.length < pageSize ? null : (pageToken + list.length);

  return ok({
    list: list,
    nextPageToken: nextPageToken,
    pageSize: pageSize
  });
}

// ============================================================
// 动作 7: downloadLinkByExportId — 按 exportId 返回临时下载 URL
// teacher：需本人 owner；admin：全校
// TTL 过期 → 410 文件已过期删除
// ============================================================
async function actionDownloadLinkByExportId(ctx, user, event) {
  event = event || {};
  var exportId = String(event.exportId || '').trim();
  if (!exportId) return fail(400, 'exportId 缺失');

  var logCol = db.collection(COLLECTIONS.export_logs);
  var getRes;
  try {
    getRes = await logCol.doc(exportId).get();
  } catch (e) {
    return fail(404, '导出记录不存在');
  }
  var log = getRes && getRes.data;
  if (!log) return fail(404, '导出记录不存在');

  var isAdmin = user.role === 'admin';
  // ====== owner 校验 ======
  if (!isAdmin) {
    if (log.teacherId !== ctx.OPENID) {
      return fail(403, '无权下载非本人导出文件');
    }
  }

  // ====== TTL 过期检查 ======
  var now = Date.now();
  if (log.ttlExpireAt && log.ttlExpireAt < now) {
    return fail(410, '文件已过期并从云端删除，无法下载');
  }
  if (!log.fileID) {
    return fail(404, '文件缺失（fileID 为空）');
  }

  // ====== 获取云存储临时下载 URL ======
  var tempURL = '';
  try {
    var urlRes = await cloud.getTempFileURL({
      fileList: [log.fileID]
    });
    if (urlRes && urlRes.fileList && urlRes.fileList.length) {
      tempURL = urlRes.fileList[0].tempFileURL || '';
    }
  } catch (e) {
    return fail(500, '获取临时下载链接失败：' + ((e && e.message) || String(e)));
  }

  if (!tempURL) return fail(500, '获取临时下载链接失败');

  return ok({
    exportId: exportId,
    tempFileURL: tempURL,
    cloudPath: log.cloudPath || '',
    expiresIn: Math.max(0, Math.floor(((log.ttlExpireAt || now) - now) / 1000))
  });
}

// ============================================================
// 统一入口：7 动作 dispatch（switch action）
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
      case 'createTask':
        user = await verifyRole(ctx, ['teacher']);
        return await actionCreateTask(ctx, user, event);
      case 'publishTask':
        user = await verifyRole(ctx, ['teacher']);
        return await actionPublishTask(ctx, user, event);
      case 'closeTask':
        user = await verifyRole(ctx, ['teacher']);
        return await actionCloseTask(ctx, user, event);
      case 'listTasksByTeacher':
        user = await verifyRole(ctx, ['teacher']);
        return await actionListTasksByTeacher(ctx, user, event);
      case 'researchExport':
        user = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        return await actionResearchExport(ctx, user, event);
      case 'listExports':
        user = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        return await actionListExports(ctx, user, event);
      case 'downloadLinkByExportId':
        user = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        return await actionDownloadLinkByExportId(ctx, user, event);
      default:
        return fail(400, '未知 action：' + action + '；支持: createTask/publishTask/closeTask/listTasksByTeacher/researchExport/listExports/downloadLinkByExportId');
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
    'createTask',
    'publishTask',
    'closeTask',
    'listTasksByTeacher',
    'researchExport',
    'listExports',
    'downloadLinkByExportId'
  ],
  _RESEARCH_CSV_HEADERS: RESEARCH_CSV_HEADERS
});
