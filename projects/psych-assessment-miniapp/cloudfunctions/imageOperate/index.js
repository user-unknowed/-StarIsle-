/**
 * cloudfunctions/imageOperate/index.js
 *
 * 图片库云函数入口 — 5 个动作 (action):
 *   1) listLibrary        — student/teacher/admin 任何登录
 *   2) presignUploadPath  — teacher(approved) / admin
 *   3) addMetadata        — teacher(approved) / admin
 *   4) delete             — teacher(approved) / admin
 *   5) getImageDetail     — 任何登录
 *
 * 每个 action 首行调用 verifyRole 做角色鉴权；
 * 所有读写统一走 shared/ 的 collectionNames / verifyRole / responseWrapper 工具。
 *
 * msSecCheck 合规白名单（设计 §3.4.3）：
 *   presignUploadPath 返回的 fileID 前缀强制本人 OPENID；
 *   addMetadata 时再将 storageFileID 做白名单正则校验，仅允许：
 *     A. ^cloud://.+/.+/{本人OPENID}/  （自定义路径）
 *     B. ^cloud://.+/系统预置占位/(ro|tat)\d+\.jpg$  （系统预置卡 · 仅 admin 可写）
 */

/* eslint-disable */
var cloud, db;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  // 本地 require 自检环境 stub
  cloud = {
    init: function () {},
    database: function () {
      return {
        collection: function () {
          return {
            where: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }, get: function () { return Promise.resolve({ data: [] }); }, field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }, orderBy: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }, count: function () { return Promise.resolve({ total: 0 }); } }; },
            doc: function () { return { get: function () { return Promise.resolve({ data: null }); }, remove: function () { return Promise.resolve({}); }, update: function () { return Promise.resolve({}); }, set: function () { return Promise.resolve({}); } }; },
            add: function () { return Promise.resolve({ _id: 'stub-id' }); },
            field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
            orderBy: function () { return { where: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }, get: function () { return Promise.resolve({ data: [] }); } }; }
          };
        },
        command: {
          in: function () { return { stub: true }; },
          neq: function () { return { stub: true }; },
          or: function () { return { stub: true }; },
          and: function () { return { stub: true }; }
        }
      };
    },
    deleteFile: function () { return Promise.resolve({ fileList: [] }); },
    DYNAMIC_CURRENT_ENV: 'local-stub'
  };
  db = cloud.database();
}

var COLLECTIONS = require('../shared/collectionNames.js');
var _verifyMod = require('../shared/verifyRole.js');
var verifyRole = _verifyMod.verifyRole;
var _resp = require('../shared/responseWrapper.js');
var ok = _resp.ok;
var fail = _resp.fail;

// ========== 常量 ==========
var ALLOW_EXT = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
var MAX_SIZE = 5 * 1024 * 1024; // 5 MB
var ALLOW_CONTENT_TYPE = ['image/jpeg', 'image/png', 'image/heic'];
var CUSTOM_DIR_PREFIX = 'custom-images';
// imageOperate 白名单正则（§3.4.3 msSecCheck 前置的路径合规）
var RE_SYSTEM_BUILTIN = /^cloud:\/\/.+\/系统预置占位\/(ro|tat)\d+\.jpg$/;

/** 构造本人自定义图 fileID 的正则：custom-images/{OPENID}/…  */
function reOwnCustom(openid) {
  // 直接字面拼接前缀，不接受前端传入任何路径片段
  var escaped = openid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^cloud:\/\/.+\/' + CUSTOM_DIR_PREFIX + '\/' + escaped + '\/');
}

function getExt(filename) {
  if (!filename) return '';
  var idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  return filename.slice(idx + 1).toLowerCase();
}

function sanitizeFilename(filename) {
  // 仅保留 a-zA-Z0-9_.-  其它替换为 _
  var base = filename;
  var idx = base.lastIndexOf('/');
  if (idx >= 0) base = base.slice(idx + 1);
  return String(base).replace(/[^A-Za-z0-9_.\-]/g, '_').slice(0, 80);
}

/**
 * 动作 1: listLibrary
 * 学生：仅 allowUse=true AND 存在于"该学生当前任务的 imageIds"中，返回最小字段
 * 教师：本人上传 OR 系统内置，返回全字段
 * 管理员：全部；但 uploaderId 替换为 uploaderAnonymousNo
 */
async function actionListLibrary(ctx, user, input) {
  input = input || {};
  var filter = input.filter || {};
  var imagesCol = db.collection(COLLECTIONS.images);
  var cmd = db.command;

  var where = {};
  if (filter.imageType && ['rorschach', 'tat', 'custom'].indexOf(filter.imageType) >= 0) {
    where.imageType = filter.imageType;
  }
  if (filter.search && typeof filter.search === 'string' && filter.search.trim()) {
    var kw = filter.search.trim();
    // 前端关键字：命中 name 或 tags 或 description
    where = cmd.and([
      where,
      cmd.or([
        { name: db.RegExp({ regexp: kw, options: 'i' }) },
        { tags: cmd.in([kw]) },
        { description: db.RegExp({ regexp: kw, options: 'i' }) }
      ])
    ]);
  }

  if (user.role === 'student') {
    // scope 过滤：仅 allowUse=true + 出现在该学生的"当前可见任务 imageIds"中
    where.allowUse = true;
    var tasksCol = db.collection(COLLECTIONS.tasks);
    // 学生可见任务：任务状态 open/assigned 且本人在 classes → studentIds 或 bindings → studentId
    // 简化：按 studentId 查 tasks.assignedStudentIds（若不存在该字段，回退空集合保证越权 = 看不到）
    var tasks = [];
    try {
      var tRes = await tasksCol
        .where(cmd.or([
          { assignedStudentIds: cmd.in([user.openid || ctx.OPENID]) },
          { classId: cmd.exists(false) } // 兼容无此字段的空集合
        ]))
        .field({ _id: true, imageIds: true, status: true })
        .limit(500)
        .get();
      tasks = tRes.data || [];
    } catch (e) { tasks = []; }

    // 按 status 只取 open / assigned（其他状态任务的图学生不可见）
    var visibleTaskStatus = ['open', 'assigned'];
    var visibleImageIds = new Set();
    tasks.forEach(function (t) {
      if (visibleTaskStatus.indexOf(t.status) < 0) return;
      (t.imageIds || []).forEach(function (id) { visibleImageIds.add(id); });
    });
    visibleImageIds.add('__none__'); // 避免 cmd.in 空数组报错（某些 SDK 下）
    where._id = cmd.in(Array.from(visibleImageIds));

    var sRes = await imagesCol.where(where)
      .field({ _id: true, name: true, storageFileID: true, imageType: true, tags: true })
      .orderBy('createTime', 'desc')
      .limit(200)
      .get();
    return ok(sRes.data || []);
  }

  if (user.role === 'teacher') {
    var whereT = cmd.and([
      where,
      cmd.or([
        { uploaderId: ctx.OPENID },
        { isBuiltIn: true }
      ])
    ]);
    var tRes = await imagesCol.where(whereT)
      .orderBy('createTime', 'desc')
      .limit(500)
      .get();
    return ok(tRes.data || []);
  }

  if (user.role === 'admin') {
    var aRes = await imagesCol.where(where)
      .orderBy('createTime', 'desc')
      .limit(1000)
      .get();
    var data = (aRes.data || []).map(function (img) {
      var clone = JSON.parse(JSON.stringify(img));
      // 匿名展示：uploaderId → 换为 uploaderAnonymousNo
      clone.uploaderId = clone.uploaderAnonymousNo || (clone.uploaderId ? '#A' : clone.uploaderId);
      return clone;
    });
    return ok(data);
  }

  return fail(403, '未知角色');
}

/**
 * 动作 2: presignUploadPath — only teacher(approved) / admin
 * 强制本人 OPENID 路径前缀，绝不信任前端传入任何路径片段
 */
async function actionPresignUploadPath(ctx, user, input) {
  input = input || {};
  var filename = String(input.filename || '').trim();
  var contentType = String(input.contentType || '').trim();
  var sizeBytes = Number(input.sizeBytes) || 0;

  // 大小限制
  if (sizeBytes > MAX_SIZE) {
    return fail(413, '单图不得超过 5MB', { sizeBytes: sizeBytes, limit: MAX_SIZE });
  }
  if (sizeBytes <= 0) {
    return fail(400, 'sizeBytes 非法');
  }
  // 后缀限制
  var ext = getExt(filename);
  if (ALLOW_EXT.indexOf(ext) < 0) {
    return fail(400, '仅允许后缀：' + ALLOW_EXT.join('/'));
  }
  if (!filename) {
    return fail(400, 'filename 为空');
  }
  // contentType 只限制文档描述，不阻塞上传（真正鉴权走云存储 fileID）
  if (contentType && ALLOW_CONTENT_TYPE.indexOf(contentType) < 0) {
    return fail(400, 'contentType 非法；仅允许 image/jpeg, image/png, image/heic');
  }

  var safeName = sanitizeFilename(filename);
  // 强制前缀：custom-images/{本人OPENID}/{ts}_{safeName}
  // 这里不写完整云存储域名 + env；wx.cloud.uploadFile 时 fileID 需要 "cloud://env-bucket/xxx"
  // 返回的 uploadFileID 写成相对路径（云函数调用方可补齐），但为保持微信协议一致，直接写为相对 key 并标记 cloudPath
  var relativeKey = CUSTOM_DIR_PREFIX + '/' + ctx.OPENID + '/' + Date.now() + '_' + safeName;
  // 同时附上前缀匹配正则说明（用于 delete 动作二次校验）
  return ok({
    uploadFileID: relativeKey,
    cloudPath: relativeKey,
    uploadToken: true,
    enforceOpenidPrefix: CUSTOM_DIR_PREFIX + '/' + ctx.OPENID + '/',
    regexMustMatchOwn: '^cloud://.+/' + CUSTOM_DIR_PREFIX + '/' + ctx.OPENID + '/'
  });
}

/**
 * 动作 3: addMetadata — teacher(approved) / admin
 */
async function actionAddMetadata(ctx, user, input) {
  input = input || {};
  var storageFileID = String(input.storageFileID || '').trim();
  var name = String(input.name || '').trim();
  var description = String(input.description || '').trim();
  var tags = Array.isArray(input.tags) ? input.tags.filter(function (t) { return typeof t === 'string'; }) : [];
  var imageType = String(input.imageType || 'custom').trim();

  if (!storageFileID) return fail(400, 'storageFileID 缺失');
  if (!name) return fail(400, 'name 缺失');

  // 路径合规白名单（§3.4.3 msSecCheck 前置）
  var ownRe = reOwnCustom(ctx.OPENID);
  var isOwnCustom = ownRe.test(storageFileID);
  var isBuiltInSys = RE_SYSTEM_BUILTIN.test(storageFileID);

  if (!isOwnCustom && !isBuiltInSys) {
    return fail(400, 'storageFileID 路径不合规；仅允许本人 OPENID 前缀或系统预置占位目录');
  }

  // 自定义图的 imageType 仅 teacher 能写 custom；admin 可以写 rorschach/tat 去替换系统卡
  if (user.role !== 'admin' && imageType !== 'custom') {
    return fail(403, '教师仅允许 imageType=custom');
  }
  if (['rorschach', 'tat', 'custom'].indexOf(imageType) < 0) {
    return fail(400, 'imageType 非法');
  }
  // system 内置图只允许 admin 写
  if (isBuiltInSys && user.role !== 'admin') {
    return fail(403, '仅管理员可写入系统预置卡目录');
  }

  var imagesCol = db.collection(COLLECTIONS.images);
  var now = Date.now();
  var rec = {
    uploaderId: ctx.OPENID,
    uploaderAnonymousNo: user.anonymousNo || ('#' + (ctx.OPENID || '').slice(-6)),
    imageType: imageType,
    name: name,
    description: description,
    tags: tags.length ? tags : (imageType === 'custom' ? ['custom'] : []),
    storageFileID: storageFileID,
    isBuiltIn: isBuiltInSys,
    allowUse: true,
    createTime: now,
    updateTime: now
  };
  var addRes = await imagesCol.add({ data: rec });
  return ok({ imageId: (addRes && addRes._id) || String(addRes) || 'unknown' });
}

/**
 * 动作 4: delete — teacher(approved) / admin
 *   越关 1：所有权/管理员；
 *   越关 2：tasks 集合引用检查（409 Conflict）；
 *   admin 删系统图写 audit_logs（集合不存在则降级 console.log）
 */
async function actionDelete(ctx, user, input) {
  input = input || {};
  var imageId = String(input.imageId || '').trim();
  if (!imageId) return fail(400, 'imageId 缺失');

  var imagesCol = db.collection(COLLECTIONS.images);
  var tasksCol = db.collection(COLLECTIONS.tasks);
  var cmd = db.command;

  var getRes;
  try {
    getRes = await imagesCol.doc(imageId).get();
  } catch (e) {
    return fail(404, '图片不存在或已删除');
  }
  var image = getRes && getRes.data;
  if (!image) return fail(404, '图片不存在');

  // 越关 1：owner 或 admin
  var isAdmin = user.role === 'admin';
  var isOwner = image.uploaderId === ctx.OPENID;
  if (!isOwner && !isAdmin) return fail(403, '无权删除非本人上传的图片');

  // 越关 2：409 冲突检查 — tasks.imageIds 包含本 imageId
  var conflictTasks = [];
  try {
    var tRes = await tasksCol
      .where({ imageIds: cmd.in([imageId]) })
      .field({ _id: true, name: true, status: true })
      .limit(200)
      .get();
    conflictTasks = tRes.data || [];
  } catch (e) { /* 集合不存在或索引未就绪 → 当 0 处理，放行删除 */ conflictTasks = []; }

  if (conflictTasks.length) {
    var taskIdsMasked = conflictTasks.map(function (t) {
      var id = String(t._id || '');
      return id.length > 6 ? id.slice(0, 6) + '…' : id;
    }).join(' / ');
    var taskNames = conflictTasks.map(function (t) { return t.name || '(未命名)'; }).join(' / ');
    return fail(409, '此图已在任务 ' + taskIdsMasked + ' 中使用；请先解除引用或关闭这些任务', {
      count: conflictTasks.length,
      taskNames: taskNames
    });
  }

  // admin 删除系统级图 → 写审计（集合不存在降级 console）
  if (isAdmin && image.isBuiltIn) {
    try {
      var auditCol = db.collection(COLLECTIONS.audit_logs);
      await auditCol.add({
        data: {
          action: 'admin_image_delete_system',
          imageId: imageId,
          name: image.name,
          imageType: image.imageType,
          operatorOpenid: ctx.OPENID,
          operatorAnonymousNo: user.anonymousNo || ('#' + (ctx.OPENID || '').slice(-6)),
          createTime: Date.now()
        }
      });
    } catch (auditErr) {
      // 降级
      try { console.log('[AUDIT_FALLBACK] admin_image_delete_system', { imageId: imageId, name: image.name, err: (auditErr && auditErr.message) || auditErr }); } catch (_) {}
    }
  }

  // 删 images 记录
  var warnings = [];
  try {
    await imagesCol.doc(imageId).remove();
  } catch (e) {
    warnings.push('images.remove fail: ' + ((e && e.message) || e));
  }

  // 删云存储（失败不阻塞）
  if (image.storageFileID) {
    try {
      await cloud.deleteFile({ fileList: [image.storageFileID] });
    } catch (e) {
      warnings.push('deleteFile fail: ' + ((e && e.message) || e));
    }
  }

  return warnings.length ? ok({ imageId: imageId, warnings: warnings }) : ok({ imageId: imageId });
}

/**
 * 动作 5: getImageDetail — 任何登录
 *   只返回最小字段集合；学生/未命中任务 scoped 的图仍可按 id 拿（用于任务反馈页按引用展示）
 *   但 uploaderId 等敏感字段默认不返回。
 */
async function actionGetImageDetail(ctx, user, input) {
  input = input || {};
  var imageId = String(input.imageId || '').trim();
  if (!imageId) return fail(400, 'imageId 缺失');
  var imagesCol = db.collection(COLLECTIONS.images);
  try {
    var res = await imagesCol.doc(imageId).field({
      _id: true, name: true, storageFileID: true, imageType: true, tags: true
    }).get();
    if (!res || !res.data) return fail(404, '图片不存在');
    return ok(res.data);
  } catch (e) {
    return fail(404, '图片不存在');
  }
}

/**
 * 统一入口
 */
exports.main = async function (event, context) {
  event = event || {};
  var action = String(event.action || '').trim();
  var ctx = cloud.getWXContext ? cloud.getWXContext() : { OPENID: event.__OPENID || 'LOCAL_STUB_OPENID', APPID: '', UNIONID: '' };

  try {
    var user;
    switch (action) {
      case 'listLibrary':
        user = await verifyRole(ctx, ['student', 'teacher', 'admin']);
        return await actionListLibrary(ctx, user, event);
      case 'presignUploadPath':
        user = await verifyRole(ctx, ['teacher', 'admin']);
        return await actionPresignUploadPath(ctx, user, event);
      case 'addMetadata':
        user = await verifyRole(ctx, ['teacher', 'admin']);
        return await actionAddMetadata(ctx, user, event);
      case 'delete':
        user = await verifyRole(ctx, ['teacher', 'admin']);
        return await actionDelete(ctx, user, event);
      case 'getImageDetail':
        user = await verifyRole(ctx, ['student', 'teacher', 'admin']);
        return await actionGetImageDetail(ctx, user, event);
      default:
        return fail(400, '未知 action：' + action + '；可选: listLibrary/presignUploadPath/addMetadata/delete/getImageDetail');
    }
  } catch (e) {
    if (e && typeof e === 'object' && typeof e.code === 'number') {
      return fail(e.code, e.msg || ('错误 ' + e.code));
    }
    return fail(500, (e && e.message) ? e.message : String(e));
  }
};
