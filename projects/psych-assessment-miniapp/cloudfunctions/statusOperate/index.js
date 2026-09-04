/**
 * cloudfunctions/statusOperate/index.js
 *
 * 状态打标云函数 — 9 个动作 dispatch（switch action）
 *
 *  动作 1: listStatusTags          — teacher(approved) 本人标签 + 系统内置 5 枚举
 *  动作 2: createTag               — teacher(approved) 创建自定义标签
 *  动作 3: updateTag               — teacher(approved) 修改自定义标签
 *  动作 4: removeTag               — teacher(approved) 删除自定义标签（内置不可删）
 *  动作 5: tagStudent              — teacher(approved) 打学生标签 → 写 status_snapshots
 *  动作 6: untagStudent            — teacher(approved) 撤销标签（validUntil=now，写新快照）
 *  动作 7: listSnapshotsByStudent  — teacher(approved) 按学生查快照列表
 *  动作 8: exportSnapshotsAuditCSV — admin 全量审计 CSV 导出（anonymousNo 化）
 *  动作 9: runBindingArchive       — admin/teacher(owner) 按 bindingId 批量归档快照
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
        neq: function (v) { return { neq: v }; },
        eq: function (v) { return { eq: v }; },
        nin: function (arr) { return { nin: arr }; }
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
    },
    uploadFile: function () { return Promise.resolve({ fileID: 'cloud://stub-export.csv' }); },
    deleteFile: function () { return Promise.resolve({}); }
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

// status_tags 集合名（collectionNames.js 中未列出，使用字符串常量）
var STATUS_TAGS = 'status_tags';

// ========== 系统内置 5 个枚举标签 ==========
var BUILTIN_TAGS = [
  { _id: 'builtin_normal',        name: '正常',     color: 'emerald', builtIn: true, teacherId: null },
  { _id: 'builtin_monitoring',    name: '监测中',   color: 'cyan',    builtIn: true, teacherId: null },
  { _id: 'builtin_intervention',  name: '干预中',   color: 'amber',   builtIn: true, teacherId: null },
  { _id: 'builtin_high_risk',     name: '高风险',   color: 'rose',    builtIn: true, teacherId: null },
  { _id: 'builtin_referral_crisis', name: '转介危机', color: 'indigo',  builtIn: true, teacherId: null }
];
var BUILTIN_TAG_IDS = BUILTIN_TAGS.map(function (t) { return t._id; });

// ========== color 白名单校验 ==========
var COLOR_PRESET_MAP = {
  indigo: '#6366F1',
  amber:  '#F59E0B',
  rose:   '#F43F5E',
  emerald:'#10B981',
  cyan:   '#06B6D4',
  slate:  '#64748B'
};
var COLOR_PRESET_KEYS = Object.keys(COLOR_PRESET_MAP);

function isValidColor(c) {
  if (!c) return false;
  if (/^#[0-9A-F]{6}$/.test(c)) return true;
  if (COLOR_PRESET_KEYS.indexOf(c) >= 0) return true;
  return false;
}
function normalizeColor(c) {
  if (COLOR_PRESET_MAP[c]) return COLOR_PRESET_MAP[c];
  return c;
}

// ========== 工具：获取教师本人自定义标签 ==========
async function getOwnCustomTags(teacherId) {
  var col = db.collection(STATUS_TAGS);
  var res = await col
    .where({ teacherId: teacherId })
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();
  return (res.data || []).map(function (t) {
    return {
      _id: t._id,
      name: t.name,
      color: t.color,
      builtIn: false,
      teacherId: t.teacherId
    };
  });
}

// ========== 工具：按 tagIds 批量查标签（用于 scope 校验 ③） ==========
async function getTagsByIds(tagIds) {
  if (!tagIds || !tagIds.length) return [];
  var builtin = BUILTIN_TAGS.filter(function (t) {
    return tagIds.indexOf(t._id) >= 0;
  });
  var customIds = tagIds.filter(function (id) {
    return BUILTIN_TAG_IDS.indexOf(id) < 0;
  });
  var customs = [];
  if (customIds.length) {
    var cmd = db.command;
    try {
      var res = await db.collection(STATUS_TAGS)
        .where({ _id: cmd.in(customIds) })
        .limit(customIds.length)
        .get();
      customs = (res.data || []).map(function (t) {
        return {
          _id: t._id,
          name: t.name,
          color: t.color,
          builtIn: false,
          teacherId: t.teacherId
        };
      });
    } catch (e) { customs = []; }
  }
  return builtin.concat(customs);
}

// ========== 工具：Date → YYYYMMDD ==========
function ymdStr(d) {
  if (!d) d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + m + day;
}

// ========== 工具：CSV 单元格转义 ==========
function csvCell(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ============================================================
// 动作 1: listStatusTags — teacher(approved)
// 返回：教师本人自定义标签 + 系统内置 5 枚举标签
// ============================================================
async function actionListStatusTags(ctx, user, event) {
  var custom = await getOwnCustomTags(ctx.OPENID);
  var all = BUILTIN_TAGS.slice().concat(custom);
  return ok(all);
}

// ============================================================
// 动作 2: createTag — teacher(approved) 创建自定义标签
// 输入: { name(≤20字), color(#RRGGBB 或预设色) }
// ============================================================
async function actionCreateTag(ctx, user, event) {
  event = event || {};
  var name = String(event.name || '').trim();
  var color = String(event.color || '').trim();

  if (!name) return fail(400, '标签名称不能为空');
  if (name.length > 20) return fail(400, '标签名称不得超过 20 字');
  if (!isValidColor(color)) {
    return fail(400, '颜色格式错误，应为 #RRGGBB 6 位 或 预设色: indigo/amber/rose/emerald/cyan/slate');
  }
  var normColor = normalizeColor(color);

  // 防重：同教师同名
  var tagsCol = db.collection(STATUS_TAGS);
  try {
    var dupRes = await tagsCol
      .where({ teacherId: ctx.OPENID, name: name })
      .limit(1)
      .get();
    if (dupRes.data && dupRes.data.length) {
      return fail(409, '您已存在同名标签：' + name);
    }
  } catch (e) { /* 集合不存在视为无冲突 */ }

  var now = Date.now();
  var addRes = await tagsCol.add({
    data: {
      teacherId: ctx.OPENID,
      teacherAnonymousNo: user.anonymousNo || '',
      name: name,
      color: normColor,
      builtIn: false,
      createdAt: now,
      updatedAt: now
    }
  });
  return ok({
    tagId: (addRes && addRes._id) || String(addRes)
  });
}

// ============================================================
// 动作 3: updateTag — teacher(approved) 修改本人自定义标签
// 输入: { tagId, name, color }
// ============================================================
async function actionUpdateTag(ctx, user, event) {
  event = event || {};
  var tagId = String(event.tagId || '').trim();
  var name = event.name !== undefined ? String(event.name).trim() : null;
  var color = event.color !== undefined ? String(event.color).trim() : null;

  if (!tagId) return fail(400, 'tagId 缺失');
  if (BUILTIN_TAG_IDS.indexOf(tagId) >= 0) {
    return fail(403, '系统内置标签不可修改');
  }

  // owner 校验
  var tagsCol = db.collection(STATUS_TAGS);
  var getRes;
  try {
    getRes = await tagsCol.doc(tagId).get();
  } catch (e) {
    return fail(404, '标签不存在');
  }
  var tag = getRes && getRes.data;
  if (!tag) return fail(404, '标签不存在');
  if (tag.teacherId !== ctx.OPENID) return fail(403, '无权修改非本人标签');

  // name 校验
  if (name !== null) {
    if (!name) return fail(400, '标签名称不能为空');
    if (name.length > 20) return fail(400, '标签名称不得超过 20 字');
  }
  // color 校验
  var normColor = tag.color;
  if (color !== null) {
    if (!isValidColor(color)) {
      return fail(400, '颜色格式错误，应为 #RRGGBB 6 位 或 预设色: indigo/amber/rose/emerald/cyan/slate');
    }
    normColor = normalizeColor(color);
  }

  // 同名防重（若改 name）
  if (name !== null && name !== tag.name) {
    try {
      var dupRes = await tagsCol
        .where({ teacherId: ctx.OPENID, name: name })
        .limit(1)
        .get();
      if (dupRes.data && dupRes.data.length && dupRes.data[0]._id !== tagId) {
        return fail(409, '您已存在同名标签：' + name);
      }
    } catch (e) {}
  }

  var patch = { updatedAt: Date.now() };
  if (name !== null) patch.name = name;
  if (color !== null) patch.color = normColor;

  await tagsCol.doc(tagId).update({ data: patch });
  return ok({ updated: true });
}

// ============================================================
// 动作 4: removeTag — teacher(approved) 删除自定义标签
// 内置标签不允许删；已有快照引用该 tagId 时 → 快照 tagId 改为 tag_deleted:oldTagId
// ============================================================
async function actionRemoveTag(ctx, user, event) {
  event = event || {};
  var tagId = String(event.tagId || '').trim();
  if (!tagId) return fail(400, 'tagId 缺失');
  if (BUILTIN_TAG_IDS.indexOf(tagId) >= 0) {
    return fail(403, '系统内置标签不可删除');
  }

  // owner 校验
  var tagsCol = db.collection(STATUS_TAGS);
  var getRes;
  try {
    getRes = await tagsCol.doc(tagId).get();
  } catch (e) {
    return fail(404, '标签不存在');
  }
  var tag = getRes && getRes.data;
  if (!tag) return fail(404, '标签不存在');
  if (tag.teacherId !== ctx.OPENID) return fail(403, '无权删除非本人标签');

  var deletedMarker = 'tag_deleted:' + tagId;
  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var cmd = db.command;

  // 批量更新快照：tagIds 数组中含该 tagId → 替换为 deletedMarker
  // 注意：此处只更新 tagIds 数组中的字符串元素（而非整个 tagId 字段）
  try {
    // 使用 count 先判断是否有引用（简化逻辑，循环分页更新）
    var hasMore = true;
    var pageSize = 100;
    var updatedSnap = 0;
    while (hasMore) {
      var page;
      try {
        page = await snapCol
          .where({ tagIds: cmd.in([tagId]) })
          .field({ _id: true, tagIds: true })
          .limit(pageSize)
          .get();
      } catch (e) { page = { data: [] }; }
      var rows = page.data || [];
      if (!rows.length) { hasMore = false; break; }
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var newArr = (row.tagIds || []).map(function (tid) {
          return tid === tagId ? deletedMarker : tid;
        });
        try {
          await snapCol.doc(row._id).update({
            data: { tagIds: newArr, updatedAt: Date.now() }
          });
          updatedSnap++;
        } catch (e) {}
      }
      if (rows.length < pageSize) hasMore = false;
    }
  } catch (outerErr) { /* 集合不存在或其他错误，不阻塞删除 */ }

  // 删除标签
  try {
    await tagsCol.doc(tagId).remove();
  } catch (e) {
    return fail(500, '标签删除失败：' + ((e && e.message) || String(e)));
  }
  return ok({ removed: true });
}

// ============================================================
// 动作 5: tagStudent — teacher(approved) 打学生标签
// 三道 scope 校验 + reason ≤300 截断 + 历史同标签归档
// ============================================================
async function actionTagStudent(ctx, user, event) {
  event = event || {};
  var studentId = String(event.studentId || '').trim();
  var tagIds = Array.isArray(event.tagIds) ? event.tagIds.slice() : [];
  var reason = String(event.reason || '').trim();
  var relatedFeedbackId = event.relatedFeedbackId ? String(event.relatedFeedbackId).trim() : null;
  var bindingId = event.bindingId ? String(event.bindingId).trim() : null;

  if (!studentId) return fail(400, 'studentId 缺失');
  if (!tagIds.length) return fail(400, 'tagIds 不能为空数组');

  // ===== 三道 scope 校验 =====
  // ① 学生白名单校验：本人 classes + bindings
  var ownIds = await fetchOwnStudentIds(ctx.OPENID);
  if (ownIds.indexOf(studentId) < 0) {
    return fail(403, '学生越权：该学生不在您的班级或绑定白名单内');
  }

  // ② 若提供 bindingId → 必须是本人绑定
  if (bindingId) {
    var bindCol = db.collection(COLLECTIONS.bindings);
    var bRes;
    try {
      bRes = await bindCol.doc(bindingId).get();
    } catch (e) {
      return fail(404, 'bindingId 不存在');
    }
    var b = bRes && bRes.data;
    if (!b) return fail(404, 'bindingId 不存在');
    if (b.teacherId !== ctx.OPENID) {
      return fail(403, '绑定越权：该 bindingId 不属于您');
    }
  }

  // ③ tagIds 越权校验：每个 tag 必须是 builtIn 或 teacherId==本人
  var tagsFound = await getTagsByIds(tagIds);
  var foundIds = tagsFound.map(function (t) { return t._id; });
  for (var ti = 0; ti < tagIds.length; ti++) {
    var tid = tagIds[ti];
    // deleted marker 不允许打新标
    if (typeof tid === 'string' && tid.indexOf('tag_deleted:') === 0) {
      return fail(403, '标签越权：不允许使用已删除标签作为新打标');
    }
    if (foundIds.indexOf(tid) < 0) {
      return fail(403, '标签越权：非本人或内置标签 → ' + String(tid));
    }
    var theTag = tagsFound.find(function (t) { return t._id === tid; });
    if (theTag && !theTag.builtIn && theTag.teacherId !== ctx.OPENID) {
      return fail(403, '标签越权：非本人或内置标签 → ' + String(tid));
    }
  }

  // ===== reason ≤300 字截断（不报错，返回 msg_was_truncated）=====
  var wasTruncated = false;
  if (reason.length > 300) {
    reason = reason.slice(0, 300);
    wasTruncated = true;
  }

  // ===== 反查学生 anonymousNo（仅取 anonymousNo，不返真名）=====
  var studentAnon = '#S000000';
  try {
    var uRes = await db.collection(COLLECTIONS.users)
      .where({ _id: studentId })
      .field({ _id: true, anonymousNo: true })
      .limit(1)
      .get();
    if (uRes.data && uRes.data.length && uRes.data[0].anonymousNo) {
      studentAnon = uRes.data[0].anonymousNo;
    }
  } catch (e) {}

  // ===== 快照 tagId→name 映射（科研追溯，防止后续改 tag name）=====
  var tagNamesSnapshot = [];
  tagIds.forEach(function (tid) {
    var tt = tagsFound.find(function (t) { return t._id === tid; });
    tagNamesSnapshot.push({
      tagId: tid,
      name: tt ? tt.name : '(标签已删除)'
    });
  });

  // ===== 同一 studentId 下同一 bindingId 的之前有效同标签历史全部置 validUntil = now-1 =====
  var now = Date.now();
  var archiveTime = Math.max(0, now - 1);
  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var cmd = db.command;
  try {
    var whereClause = {
      studentId: studentId,
      validUntil: null,
      tagIds: cmd.in(tagIds)
    };
    if (bindingId) {
      whereClause.bindingId = bindingId;
    }
    await snapCol.where(whereClause).update({
      data: { validUntil: archiveTime }
    }).catch(function () {});
  } catch (e) {}

  // ===== 写新快照 =====
  var addRes = await snapCol.add({
    data: {
      studentId: studentId,
      studentAnonymousNo: studentAnon,
      teacherId: ctx.OPENID,
      teacherAnonymousNo: user.anonymousNo || '',
      reason: reason,
      relatedFeedbackId: relatedFeedbackId,
      bindingId: bindingId,
      tagIds: tagIds,
      tagNamesSnapshot: tagNamesSnapshot,
      validFrom: now,
      validUntil: null,
      createdAt: now
    }
  });

  return ok({
    snapshotId: (addRes && addRes._id) || String(addRes),
    msg_was_truncated: wasTruncated
  });
}

// ============================================================
// 动作 6: untagStudent — teacher(approved) 撤销标签（不删除，写 validUntil+新快照）
// 输入: { snapshotId }
// ============================================================
async function actionUntagStudent(ctx, user, event) {
  event = event || {};
  var snapshotId = String(event.snapshotId || '').trim();
  if (!snapshotId) return fail(400, 'snapshotId 缺失');

  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var getRes;
  try {
    getRes = await snapCol.doc(snapshotId).get();
  } catch (e) {
    return fail(404, '快照不存在');
  }
  var snap = getRes && getRes.data;
  if (!snap) return fail(404, '快照不存在');
  // owner 校验
  if (snap.teacherId !== ctx.OPENID) {
    return fail(403, '无权撤销非本人打标');
  }
  // 已经撤销的不再重复
  if (snap.validUntil !== null && snap.validUntil !== undefined && snap.validUntil !== 0) {
    return ok({ untagged: false, reason: 'already_untagged' });
  }

  var now = Date.now();
  // ① 原快照写 validUntil = now
  await snapCol.doc(snapshotId).update({
    data: { validUntil: now }
  });

  // ② 新增撤销快照（reason 记录"撤销：原理由"），保留科研追溯
  var oldReason = snap.reason || '(无理由)';
  var revokeReason = '撤销：原 snapshotId ' + snapshotId + ' 理由 → ' + oldReason;
  if (revokeReason.length > 300) revokeReason = revokeReason.slice(0, 300);

  await snapCol.add({
    data: {
      studentId: snap.studentId,
      studentAnonymousNo: snap.studentAnonymousNo || '#S000000',
      teacherId: ctx.OPENID,
      teacherAnonymousNo: user.anonymousNo || '',
      reason: revokeReason,
      relatedFeedbackId: snap.relatedFeedbackId || null,
      bindingId: snap.bindingId || null,
      tagIds: (snap.tagIds || []).slice(),
      tagNamesSnapshot: (snap.tagNamesSnapshot || []).slice(),
      validFrom: now,
      validUntil: now, // 撤销快照本身即一次性，validFrom === validUntil 表示"撤销动作"
      revokeOfSnapshotId: snapshotId,
      createdAt: now
    }
  });

  return ok({ untagged: true });
}

// ============================================================
// 动作 7: listSnapshotsByStudent — teacher(approved) 学生查快照列表
// 输入: { studentId }
// ============================================================
async function actionListSnapshotsByStudent(ctx, user, event) {
  event = event || {};
  var studentId = String(event.studentId || '').trim();
  if (!studentId) return fail(400, 'studentId 缺失');

  // 本人白名单校验
  var ownIds = await fetchOwnStudentIds(ctx.OPENID);
  if (ownIds.indexOf(studentId) < 0) {
    return fail(403, '学生越权：该学生不在您的白名单内');
  }

  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var cmd = db.command;
  var res;
  try {
    res = await snapCol
      .where({ studentId: studentId })
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
  } catch (e) {
    res = { data: [] };
  }
  var list = (res.data || []).map(function (s) {
    return {
      _id: s._id,
      studentAnonymousNo: s.studentAnonymousNo || '#S000000',
      teacherAnonymousNo: s.teacherAnonymousNo || '#T000',
      teacherId: s.teacherId,  // 用于前端判断"本人快照是否可撤销"
      tagIds: s.tagIds || [],
      tagNamesSnapshot: s.tagNamesSnapshot || [],
      reason: s.reason || '',
      relatedFeedbackId: s.relatedFeedbackId || null,
      bindingId: s.bindingId || null,
      validFrom: s.validFrom,
      validUntil: s.validUntil,
      createdAt: s.createdAt,
      revokeOfSnapshotId: s.revokeOfSnapshotId || null,
      isOwn: s.teacherId === ctx.OPENID,
      isActive: (s.validUntil === null || s.validUntil === undefined || s.validUntil === 0) && !s.revokeOfSnapshotId
    };
  });
  return ok(list);
}

// ============================================================
// 动作 8: exportSnapshotsAuditCSV — admin 导出审计 CSV
// 字段白名单（anonymousNo 化）：createdAt, validFrom, validUntil,
//   studentAnonymousNo, teacherAnonymousNo, tagNamesSnapshot, reason,
//   relatedFeedbackId, bindingId, scopeType
// 云存储：exports-research/audit-snapshots-YYYYMMDD.csv（7天生命周期由云存储规则管理）
// 写 export_logs 集合
// ============================================================
async function actionExportSnapshotsAuditCSV(ctx, user, event) {
  // admin 身份校验
  if (user.role !== 'admin') {
    return fail(403, '无权：仅管理员可导出审计 CSV');
  }

  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var PAGE_SIZE = 500;
  var allRows = [];
  var hasMore = true;
  var skip = 0;

  // 全量分页拉取（匿名化字段，只取白名单）
  while (hasMore) {
    var page;
    try {
      page = await snapCol
        .orderBy('createdAt', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .field({
          _id: true,
          createdAt: true,
          validFrom: true,
          validUntil: true,
          studentAnonymousNo: true,
          teacherAnonymousNo: true,
          tagNamesSnapshot: true,
          reason: true,
          relatedFeedbackId: true,
          bindingId: true,
          scopeType: true,
          revokeOfSnapshotId: true
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
    // 兜底：超过 5 万条停止（避免内存爆）
    if (allRows.length > 50000) hasMore = false;
  }

  // CSV 表头
  var headers = [
    'createdAt',
    'validFrom',
    'validUntil',
    'studentAnonymousNo',
    'teacherAnonymousNo',
    'tagNamesSnapshot',
    'reason',
    'relatedFeedbackId',
    'bindingId',
    'scopeType'
  ];
  var csvLines = [headers.map(csvCell).join(',')];

  for (var ri = 0; ri < allRows.length; ri++) {
    var r = allRows[ri];
    var tagNames = '';
    if (r.tagNamesSnapshot && Array.isArray(r.tagNamesSnapshot)) {
      tagNames = r.tagNamesSnapshot.map(function (tn) {
        return (tn.name || '') + '[' + (tn.tagId || '') + ']';
      }).join(' | ');
    }
    var line = [
      r.createdAt || '',
      r.validFrom || '',
      r.validUntil || '',
      r.studentAnonymousNo || '',
      r.teacherAnonymousNo || '',
      tagNames,
      r.reason || '',
      r.relatedFeedbackId || '',
      r.bindingId || '',
      r.scopeType || (r.revokeOfSnapshotId ? 'revoke' : 'tag')
    ].map(csvCell).join(',');
    csvLines.push(line);
  }
  var csvContent = csvLines.join('\r\n');

  // 写云存储 exports-research/audit-snapshots-YYYYMMDD.csv
  var fileName = 'audit-snapshots-' + ymdStr(new Date()) + '.csv';
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
    // 云存储失败：仍然写 export_logs，返回 fileID 为空
    fileID = '';
  }

  // 写 export_logs 集合
  var now = Date.now();
  try {
    await db.collection(COLLECTIONS.export_logs).add({
      data: {
        adminId: ctx.OPENID,
        adminAnonymousNo: user.anonymousNo || '',
        exportType: 'audit_snapshots_csv',
        fileName: fileName,
        cloudPath: cloudPath,
        fileID: fileID,
        rowCount: allRows.length,
        fields: headers.slice(),
        // 严格不包含真名/手机/学校，仅 anonymousNo
        createdAt: now,
        ttlExpireAt: now + 7 * 24 * 60 * 60 * 1000  // 7 天 TTL 元数据标记
      }
    });
  } catch (e) {}

  return ok({
    fileID: fileID,
    cloudPath: cloudPath,
    rowCount: allRows.length,
    fields: headers
  });
}

// ============================================================
// 动作 9: runBindingArchive — admin / teacher(owner) 按 bindingId 归档快照
// 语义与 Task2 classOperate.removeBinding L504-518 完全一致：
//   WHERE bindingId + validUntil=null → update validUntil = now - 1
// ============================================================
async function actionRunBindingArchive(ctx, user, event) {
  event = event || {};
  var bindingId = String(event.bindingId || '').trim();
  if (!bindingId) return fail(400, 'bindingId 缺失');

  var isAdmin = user.role === 'admin';

  // 非 admin → 必须是绑定 owner
  if (!isAdmin) {
    var bindCol = db.collection(COLLECTIONS.bindings);
    var bRes;
    try {
      bRes = await bindCol.doc(bindingId).get();
    } catch (e) {
      return fail(404, '绑定不存在');
    }
    var b = bRes && bRes.data;
    if (!b) return fail(404, '绑定不存在');
    if (b.teacherId !== ctx.OPENID) {
      return fail(403, '无权归档非本人绑定的快照');
    }
  }

  var now = Date.now();
  var archiveTime = Math.max(0, now - 1);
  var snapCol = db.collection(COLLECTIONS.status_snapshots);
  var updated = 0;

  // 与 Task2 L504-518 语义完全等价：
  //   WHERE bindingId = bindingId AND validUntil = null
  //   UPDATE validUntil = archiveTime (= now - 1)
  try {
    var updRes = await snapCol
      .where({
        bindingId: bindingId,
        validUntil: null
      })
      .update({
        data: { validUntil: archiveTime }
      });
    updated = (updRes && updRes.stats && typeof updRes.stats.updated === 'number')
      ? updRes.stats.updated
      : 0;
  } catch (e) {
    updated = 0;
  }

  return ok({
    updatedCount: updated,
    bindingId: bindingId,
    archiveTime: archiveTime
  });
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
      case 'listStatusTags':
        user = await verifyRole(ctx, ['teacher']);
        return await actionListStatusTags(ctx, user, event);
      case 'createTag':
        user = await verifyRole(ctx, ['teacher']);
        return await actionCreateTag(ctx, user, event);
      case 'updateTag':
        user = await verifyRole(ctx, ['teacher']);
        return await actionUpdateTag(ctx, user, event);
      case 'removeTag':
        user = await verifyRole(ctx, ['teacher']);
        return await actionRemoveTag(ctx, user, event);
      case 'tagStudent':
        user = await verifyRole(ctx, ['teacher']);
        return await actionTagStudent(ctx, user, event);
      case 'untagStudent':
        user = await verifyRole(ctx, ['teacher']);
        return await actionUntagStudent(ctx, user, event);
      case 'listSnapshotsByStudent':
        user = await verifyRole(ctx, ['teacher']);
        return await actionListSnapshotsByStudent(ctx, user, event);
      case 'exportSnapshotsAuditCSV':
        user = await verifyRole(ctx, ['admin'], { requireTeacherApproved: false });
        return await actionExportSnapshotsAuditCSV(ctx, user, event);
      case 'runBindingArchive':
        user = await verifyRole(ctx, ['teacher', 'admin']);
        return await actionRunBindingArchive(ctx, user, event);
      default:
        return fail(400, '未知 action：' + action + '；支持: listStatusTags/createTag/updateTag/removeTag/tagStudent/untagStudent/listSnapshotsByStudent/exportSnapshotsAuditCSV/runBindingArchive');
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
    'listStatusTags',
    'createTag',
    'updateTag',
    'removeTag',
    'tagStudent',
    'untagStudent',
    'listSnapshotsByStudent',
    'exportSnapshotsAuditCSV',
    'runBindingArchive'
  ],
  _BUILTIN_TAGS: BUILTIN_TAGS,
  _isValidColor: isValidColor,
  _normalizeColor: normalizeColor
});
