// cloudfunctions/feedbackSubmit/index.js
// 8 动作 dispatch：学生提交反馈(+草稿同步) / 教师读列表·详情·预警清单·审核AI / 教师取本人学生范围 / Admin读待审批教师
// 三集合原子写入: feedbacks + anonymized_records + status_snapshots (All-or-Nothing)

var cloud = null;
var db = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  // 本地 Node 自检环境 stub
  cloud = {
    init: function () {},
    database: function () {
      return {
        collection: function (name) {
          return {
            doc: function (id) {
              return {
                get: function () { return Promise.resolve({ data: null }); },
                set: function () { return Promise.resolve({ _id: id || 'stub-id' }); },
                update: function () { return Promise.resolve({ stats: { updated: 1 } }); },
                remove: function () { return Promise.resolve({ stats: { removed: 1 } }); },
                add: function () { return Promise.resolve({ _id: 'stub-id-' + Date.now() }); }
              };
            },
            where: function () {
              return {
                count: function () { return Promise.resolve({ total: 0 }); },
                limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
                orderBy: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
                skip: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
                get: function () { return Promise.resolve({ data: [] }); },
                field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; },
                update: function () { return Promise.resolve({ stats: { updated: 0 } }); }
              };
            },
            add: function () { return Promise.resolve({ _id: 'stub-id-' + Date.now() }); },
            count: function () { return Promise.resolve({ total: 0 }); }
          };
        }
      };
    },
    DYNAMIC_CURRENT_ENV: 'local-stub',
    openapi: {
      security: {
        msgSecCheck: function () { return Promise.resolve({ label: 'normal' }); }
      }
    },
    callFunction: function () { return Promise.resolve({ result: { code: 0 } }); }
  };
  db = cloud.database();
}

var _ = null;
try { _ = db.command; } catch (e) { _ = { in: function () { return {}; }, or: function () { return {}; }, and: function () { return {}; }, exists: function () { return {}; } }; }

// ============ 共享模块（只读引用）============
var COL = require('../shared/collectionNames.js');
var wrap = require('../shared/responseWrapper.js');
var verifyRoleMod = require('../shared/verifyRole.js');
var stripMod = require('../shared/stripPII.js');

var verifyRole = verifyRoleMod.verifyRole;
var fetchOwnStudentIds = verifyRoleMod.fetchOwnStudentIds;
var stripFeedbackReviewForList = stripMod.stripFeedbackReviewForList;

// ============ 工具函数 ============
function hashTaskId(taskId) {
  // 简单 hash：taskId 前 8 位，不足补 0
  if (!taskId) return '00000000';
  var s = String(taskId);
  if (s.length >= 8) return s.slice(0, 8);
  while (s.length < 8) s = '0' + s;
  return s;
}

/**
 * Admin 角色白名单：全校学生（简化：返回 null 作为"无限制"标记，后续 where 分支跳过 studentId in 过滤）
 * 在具体动作里 admin 角色不应该全表扫，这里保留接口统一返回空数组占位（实际在动作 3 中 admin 分支特殊处理）
 */
function fetchOwnStudentIdsAdmin() {
  return Promise.resolve(null);
}

/**
 * scope 三道防线：第二道 —— 校验前端传入 scopeId 是否真的属于本人 teacherId
 * 返回 true=通过；false=拦截
 */
function validateScopeIdBelongsToTeacher(scope, scopeId, teacherId, userRole) {
  return new Promise(function (resolve, reject) {
    if (userRole === 'admin') return resolve(true); // admin 跳过二道防线
    if (!scopeId) return resolve(true); // scopeId 空不需要校验二道
    (async function () {
      try {
        if (scope === 'task') {
          var t = await db.collection(COL.tasks).doc(scopeId).get();
          if (!t.data) return resolve(false);
          return resolve(t.data.teacherId === teacherId);
        }
        if (scope === 'class') {
          var c = await db.collection(COL.classes).doc(scopeId).get();
          if (!c.data) return resolve(false);
          return resolve(c.data.teacherId === teacherId);
        }
        if (scope === 'binding') {
          var b = await db.collection(COL.bindings).doc(scopeId).get();
          if (!b.data) return resolve(false);
          return resolve(b.data.teacherId === teacherId);
        }
        // scope='all' 无 scopeId
        resolve(true);
      } catch (e) { resolve(false); }
    })();
  });
}

/**
 * 根据 scope + scopeId 反查 taskId / classId / bindingId 用于 studentIds 辅助过滤（额外安全）
 * 返回 { taskId, classIds, bindingIds }
 */
function resolveScopeIds(scope, scopeId) {
  return new Promise(function (resolve) {
    var out = { taskId: null, classIds: null, bindingIds: null };
    if (!scopeId) return resolve(out);
    (async function () {
      try {
        if (scope === 'task') {
          out.taskId = scopeId;
          var t = await db.collection(COL.tasks).doc(scopeId).get();
          if (t.data && t.data.scope) {
            out.classIds = (t.data.scope.classIds) || null;
            out.bindingIds = (t.data.scope.bindingIds) || null;
          }
        } else if (scope === 'class') {
          out.classIds = [scopeId];
        } else if (scope === 'binding') {
          out.bindingIds = [scopeId];
        }
      } catch (e) { /* ignore */ }
      resolve(out);
    })();
  });
}

/**
 * fetchOwnStudentIds 的 admin 增强版：若 admin 则通过 classes 全表 studentIds 并集（不推荐全量大表，仅用于动作 8 外的场景）
 * 实际动作 3/4/5 中 admin 用第三道防线的方式：全量走 where studentId exists，再靠第二道 scopeId 限制
 */
function getWhitelistStudentIds(userRole, userId) {
  if (userRole === 'admin') return Promise.resolve(null); // null = 管理员不做白名单 studentId in 过滤
  return fetchOwnStudentIds(userId);
}

/**
 * 动作 1 子流程：校验任务是否在学生范围内
 */
function isStudentInTaskScope(task, studentId) {
  if (!task || !task.scope) return false;
  var classIds = task.scope.classIds || [];
  var bindingIds = task.scope.bindingIds || [];
  // 先快检 bindings：一对一绑定 studentId
  return new Promise(function (resolve) {
    (async function () {
      try {
        // 1) 检查 bindings：bindingId 对应的 studentId
        if (bindingIds && bindingIds.length) {
          var bindRes = await db.collection(COL.bindings)
            .where({ _id: _.in(bindingIds), studentId: studentId })
            .count();
          if (bindRes.total > 0) return resolve(true);
        }
        // 2) 检查 classes：班级中是否包含 studentId
        if (classIds && classIds.length) {
          var classRes = await db.collection(COL.classes)
            .where({ _id: _.in(classIds) })
            .field({ studentIds: true })
            .get();
          for (var i = 0; i < (classRes.data || []).length; i++) {
            var c = classRes.data[i];
            if (c.studentIds && c.studentIds.indexOf(studentId) >= 0) return resolve(true);
          }
        }
        resolve(false);
      } catch (e) { resolve(false); }
    })();
  });
}

/**
 * 三写原子：feedbacks + anonymized_records + status_snapshots
 * 任一失败 → throw Error 整体回滚（手动 try/catch 回滚已写入）
 */
function atomicWriteThree(user, task, feedbackDoc, anonymizedDoc, snapshotDoc) {
  var feedbackId = null;
  var anonymizedId = null;
  var snapshotId = null;
  return new Promise(function (resolve, reject) {
    (async function () {
      try {
        // Write A: feedbacks
        var addA = await db.collection(COL.feedbacks).add({ data: feedbackDoc });
        feedbackId = addA._id;
        snapshotDoc.relatedFeedbackIds = [feedbackId];
        anonymizedDoc.feedbackId = feedbackId;

        // Write B: anonymized_records
        var addB = await db.collection(COL.anonymized_records).add({ data: anonymizedDoc });
        anonymizedId = addB._id;

        // Write C: status_snapshots
        var addC = await db.collection(COL.status_snapshots).add({ data: snapshotDoc });
        snapshotId = addC._id;

        resolve({ feedbackId: feedbackId, anonymizedId: anonymizedId, snapshotId: snapshotId });
      } catch (e) {
        // ====== 手动回滚：三写缺一失败则整体失败 ======
        var rollbackErrors = [];
        if (snapshotId) {
          try { await db.collection(COL.status_snapshots).doc(snapshotId).remove(); }
          catch (re) { rollbackErrors.push('snapshot:' + (re.errMsg || re.message || String(re))); }
        }
        if (anonymizedId) {
          try { await db.collection(COL.anonymized_records).doc(anonymizedId).remove(); }
          catch (re) { rollbackErrors.push('anonymized:' + (re.errMsg || re.message || String(re))); }
        }
        if (feedbackId) {
          try { await db.collection(COL.feedbacks).doc(feedbackId).remove(); }
          catch (re) { rollbackErrors.push('feedback:' + (re.errMsg || re.message || String(re))); }
        }
        reject({
          code: 5001,
          msg: '三写原子事务失败，已执行手工回滚',
          originalError: (e.errMsg || e.message || String(e)).slice(0, 200),
          rollbackErrors: rollbackErrors
        });
      }
    })();
  });
}

/**
 * msSecCheck 调用：合并所有 text 字段 → 调 cloud.openapi.security.msgSecCheck
 * 若 label!='normal'：不阻止入库，但 msSecHitLabelsHit 记录 + 后续不送往千问
 */
function runMsSecCheck(imageFeedbacks) {
  return new Promise(function (resolve) {
    (async function () {
      var texts = (imageFeedbacks || []).map(function (f) { return f.text || ''; }).filter(Boolean);
      var content = texts.join('\n');
      if (!content || !content.trim()) return resolve({ label: 'normal', content: '' });
      if (!cloud.openapi || !cloud.openapi.security || typeof cloud.openapi.security.msgSecCheck !== 'function') {
        return resolve({ label: 'normal', content: content });
      }
      try {
        var res = await cloud.openapi.security.msgSecCheck({ content: content });
        resolve({ label: res.label || 'normal', content: content });
      } catch (e) {
        // msgSecCheck 调用失败降级为 normal（但记录日志）
        console.warn('[msSecCheck] 调用失败，降级放行:', e.errMsg || e.message || String(e));
        resolve({ label: 'normal', content: content, callFailed: true });
      }
    })();
  });
}

/**
 * 构造 feedback 对象（动作 1 核心）
 */
function buildFeedbackDoc(user, task, imageFeedbacks, msSecResult, draftBatchId) {
  var now = Date.now();
  var msHit = [];
  if (msSecResult && msSecResult.label && msSecResult.label !== 'normal') {
    msHit.push(msSecResult.label);
  }
  return {
    studentId: user._id,
    taskId: task._id,
    teacherId: task.teacherId,
    scope: task.scope || { classIds: [], bindingIds: [] },
    imageFeedbacks: (imageFeedbacks || []).map(function (f) {
      return { imageId: f.imageId, text: f.text || '' };
    }),
    submitTime: now,
    aiRetryCount: 0,
    status: 'pending_ai',
    msSecCheckLabelsHit: msHit,
    aiAnalysis: null,
    teacherReview: {
      reviewStatus: 'pending_review',
      reviewedByTeacherId: null,
      reviewedAt: null,
      reviewedByAnonymousNo: null,
      confirmedScores: null,
      confirmedWarningTags: null,
      confirmedSummary: null,
      teacherNote: null
    },
    draftBatchId: draftBatchId || null,
    createTime: now
  };
}

/**
 * 构造 anonymized_records 对象（PII-free 白名单）
 */
function buildAnonymizedDoc(user, task, imageFeedbacks, msSecResult, draftBatchId) {
  var now = Date.now();
  var contentParts = (imageFeedbacks || []).map(function (f, i) {
    return '【图片' + (i + 1) + '】' + (f.text || '');
  });
  return {
    anonymousNo: user.anonymousNo,
    taskId: task._id,
    imageType: task.imageType || 'custom',
    imageFeedbacks: (imageFeedbacks || []).map(function (f) { return { text: f.text || '' }; }),
    content: contentParts.join('\n'),
    aiAnalysis: null,
    imageIds: (imageFeedbacks || []).map(function (f) { return f.imageId; }),
    submitTime: now,
    taskHash: hashTaskId(task._id),
    batchId: draftBatchId || null,
    msSecCheckLabelsHit: (msSecResult && msSecResult.label && msSecResult.label !== 'normal') ? [msSecResult.label] : [],
    schemaVersion: 1,
    createTime: now
  };
}

/**
 * 构造 status_snapshots 空壳归档对象（系统初始化）
 */
function buildSnapshotDoc(user, task, feedbackId) {
  var now = Date.now();
  return {
    studentId: user._id,
    anonymousNo: user.anonymousNo,
    teacherId: task.teacherId,
    reason: '系统初始化：首次加入，无打标',
    tagIds: [],
    tagNamesSnapshot: [],
    relatedFeedbackIds: feedbackId ? [feedbackId] : [],
    validFrom: now,
    validUntil: null,
    createTime: now
  };
}

/**
 * 异步触发 aiAnalyze（即使失败也不阻塞主流程，retry_queue 后续补齐）
 */
function triggerAiAnalyzeAsync(feedbackId, msSecLabel) {
  // msSec 命中 label!='normal' → 不送往千问（防违规送外部模型），直接返回
  if (msSecLabel && msSecLabel !== 'normal') {
    console.log('[triggerAiAnalyze] msSec 命中 label=' + msSecLabel + '，跳过送往千问（后续 retry_queue 也不补，因为内容合规不通过外部模型）');
    // 标为 ai_failed，给教师看原文人工评估
    db.collection(COL.feedbacks).doc(feedbackId).update({
      data: { status: 'ai_failed', msSecSkippedAi: true }
    }).catch(function () { /* ignore */ });
    return;
  }
  if (typeof cloud.callFunction !== 'function') return;
  cloud.callFunction({
    name: 'aiAnalyze',
    data: { action: 'analyzeOne', feedbackId: feedbackId }
  }).catch(function (e) {
    console.warn('[triggerAiAnalyze] 异步触发失败，将由 retry_queue 后续重试:', (e.errMsg || e.message || String(e)).slice(0, 200));
  });
}

/**
 * 审核 AI 质量指标写入（若集合不存在则降级 console.log）
 */
function writeAiQualityMetric(record) {
  return new Promise(function (resolve) {
    (async function () {
      try {
        await db.collection(COL.ai_quality_metrics).add({ data: record });
        resolve(true);
      } catch (e) {
        console.log('[ai_quality_metrics] 集合写入失败降级，记录:', JSON.stringify(record).slice(0, 300));
        resolve(false);
      }
    })();
  });
}

// ============ 8 动作主入口 ============
exports.main = async function (event, context) {
  var action = event.action || '';
  var ctx = context || {};

  try {
    switch (action) {

      // =====================================================
      // 动作 1: submitFeedback (学生提交直接走)
      // =====================================================
      case 'submitFeedback': {
        var user1 = await verifyRole(ctx, ['student']);
        var taskId = event.taskId;
        var imageFeedbacks = event.imageFeedbacks || [];
        var draftBatchId = event.draftBatchId || null;

        if (!taskId) return wrap.fail(400, '缺少 taskId');
        if (!Array.isArray(imageFeedbacks) || imageFeedbacks.length === 0) {
          return wrap.fail(400, 'imageFeedbacks 不能为空');
        }

        // ② 任务校验
        var taskRes = await db.collection(COL.tasks).doc(taskId).get();
        if (!taskRes.data) return wrap.fail(404, '任务不存在');
        var task1 = taskRes.data;

        if (task1.status !== 'published') {
          return wrap.fail(403, '任务未发布或已关闭');
        }

        // 学生 scope 校验
        var inScope = await isStudentInTaskScope(task1, user1._id);
        if (!inScope) {
          return wrap.fail(403, '该任务不在您的班级或特殊绑定范围内');
        }

        // 文字反馈要求校验：若任务要求文字，每题≥20字
        // 若 feedbackSchema 存在 form 类型则按题意
        if (task1.feedbackMode === 'form' && task1.feedbackSchema && task1.feedbackSchema.questions) {
          var textQuestions = task1.feedbackSchema.questions.filter(function (q) { return q.type === 'text_area' && q.required; });
          if (textQuestions.length > imageFeedbacks.length) {
            return wrap.fail(400, '文字题数量不匹配，请完整填写');
          }
          for (var ti = 0; ti < Math.min(textQuestions.length, imageFeedbacks.length); ti++) {
            var txt = (imageFeedbacks[ti].text || '').trim();
            if (txt.length < 20) return wrap.fail(400, '第' + (ti + 1) + '题文字反馈不少于 20 字');
          }
        } else {
          // free/mixed 模式：每张图文字反馈若任务要求文字则 ≥20 字（宽松：仅当全字段长度为 0 才拒绝）
          var allEmpty = imageFeedbacks.every(function (f) { return !(f.text || '').trim(); });
          if (allEmpty) return wrap.fail(400, '请至少填写一张图片的文字反馈');
        }

        // ③ msSecCheck 前置
        var msSecResult = await runMsSecCheck(imageFeedbacks);

        // ④ 构造三写对象
        var feedbackDoc = buildFeedbackDoc(user1, task1, imageFeedbacks, msSecResult, draftBatchId);
        var anonymizedDoc = buildAnonymizedDoc(user1, task1, imageFeedbacks, msSecResult, draftBatchId);
        var snapshotDoc = buildSnapshotDoc(user1, task1, null);

        // ⑤ 三写原子 All-or-Nothing
        var threeResult = await atomicWriteThree(user1, task1, feedbackDoc, anonymizedDoc, snapshotDoc);

        // ⑥ 立即异步触发 aiAnalyze（msSec 违规不送）
        triggerAiAnalyzeAsync(threeResult.feedbackId, msSecResult.label);

        return wrap.ok({
          feedbackId: threeResult.feedbackId,
          anonymizedId: threeResult.anonymizedId,
          msSecHitLabel: msSecResult.label || 'normal'
        });
      }

      // =====================================================
      // 动作 2: submitFinalFromCacheClear (草稿同步最终提交)
      // =====================================================
      case 'submitFinalFromCacheClear': {
        var user2 = await verifyRole(ctx, ['student']);
        var draftBatchId = event.draftBatchId;
        var batchRows = event.batchRows || [];

        if (!draftBatchId) return wrap.fail(400, '缺少 draftBatchId');
        if (!Array.isArray(batchRows) || batchRows.length === 0) {
          return wrap.ok({ successCount: 0, failItems: [], msg: 'batchRows 为空' });
        }

        var successItems = [];
        var failItems = [];

        for (var ri = 0; ri < batchRows.length; ri++) {
          var row = batchRows[ri];
          try {
            // ======== 白名单字段强制过滤（不信前端）========
            var safeRow = {
              taskId: row.taskId,
              imageFeedbacks: Array.isArray(row.imageFeedbacks)
                ? row.imageFeedbacks.map(function (f) { return { imageId: f.imageId, text: (f.text || '').toString().slice(0, 2000) }; }).filter(function (f) { return f.text || f.imageId; })
                : []
            };
            if (!safeRow.taskId || safeRow.imageFeedbacks.length === 0) {
              failItems.push({ idx: ri, reason: 'taskId 或 imageFeedbacks 为空' });
              continue;
            }

            // 任务校验
            var tRes = await db.collection(COL.tasks).doc(safeRow.taskId).get();
            if (!tRes.data) { failItems.push({ idx: ri, reason: 'taskId 不存在' }); continue; }
            var tRow = tRes.data;
            if (tRow.status !== 'published') { failItems.push({ idx: ri, reason: '任务未发布或已关闭' }); continue; }
            var inS = await isStudentInTaskScope(tRow, user2._id);
            if (!inS) { failItems.push({ idx: ri, reason: '任务不在学生范围内' }); continue; }

            // msSecCheck（逐行）
            var msR = await runMsSecCheck(safeRow.imageFeedbacks);

            // 强制后端覆盖 anonymousNo（不信前端传任何 name/nickname/openid）
            // buildAnonymizedDoc 内部使用 user.anonymousNo 已经是 verifyRole 返回的
            var fbDoc = buildFeedbackDoc(user2, tRow, safeRow.imageFeedbacks, msR, draftBatchId);
            var anDoc = buildAnonymizedDoc(user2, tRow, safeRow.imageFeedbacks, msR, draftBatchId);
            var snDoc = buildSnapshotDoc(user2, tRow, null);

            var tWrite = await atomicWriteThree(user2, tRow, fbDoc, anDoc, snDoc);
            triggerAiAnalyzeAsync(tWrite.feedbackId, msR.label);
            successItems.push({
              idx: ri,
              feedbackId: tWrite.feedbackId,
              anonymizedId: tWrite.anonymizedId,
              msSecHitLabel: msR.label || 'normal'
            });
          } catch (rowErr) {
            failItems.push({
              idx: ri,
              reason: (rowErr.msg || rowErr.message || String(rowErr)).slice(0, 200)
            });
          }
        }

        return wrap.ok({
          draftBatchId: draftBatchId,
          successCount: successItems.length,
          failCount: failItems.length,
          successItems: successItems,
          failItems: failItems
        });
      }

      // =====================================================
      // 动作 3: queryFeedbacks (教师读列表)
      // =====================================================
      case 'queryFeedbacks': {
        // --- Task12 追加：缺参数 DEFAULT 兜底 START ---
        event.scope = event.scope || 'all';
        event.pageSize = Number(event.pageSize) > 0 ? Number(event.pageSize) : 50;
        event.statusFilter = Array.isArray(event.statusFilter) ? event.statusFilter : [];
        event.includeAI = typeof event.includeAI !== 'boolean' ? true : event.includeAI;
        // ---  Task12 追加 END ---
        var user3 = await verifyRole(ctx, ['teacher', 'admin']);
        var scope = event.scope || 'all';
        var scopeId = event.scopeId || null;
        var filter = event.filter || {};
        var pageSize = typeof event.pageSize === 'number' ? event.pageSize : 20;
        var pageToken = event.pageToken || null; // 下一页 token（实现：用 skip=pageSize*pageTokenNum，简化用数字）

        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var userRole3 = user3.role;
        var teacherId3 = user3._id;
        var viewerAnonymousNo = user3.anonymousNo;

        // ============ scope 白名单三道防线 ============
        // 第一道：本人白名单 studentIds
        var whitelistStudentIds = null;
        if (userRole3 === 'admin') {
          // admin：全量不做 studentId in 限制（但仍走 scopeId 二道防线）
          whitelistStudentIds = null;
        } else {
          whitelistStudentIds = await fetchOwnStudentIds(teacherId3);
          if (!whitelistStudentIds || whitelistStudentIds.length === 0) {
            // 没有任何学生在名下 → 返回空列表
            return wrap.ok({ list: [], total: 0, nextPageToken: null, scope: scope, scopeId: scopeId });
          }
        }

        // 第二道：前端 scopeId 校验（真的属于本人）
        var scopeValid = await validateScopeIdBelongsToTeacher(scope, scopeId, teacherId3, userRole3);
        if (!scopeValid) {
          return wrap.fail(403, 'scopeId 越权：不属于您的管理范围');
        }

        // scope → 反查 task/class/binding 过滤条件
        var scopeCond = await resolveScopeIds(scope, scopeId);

        // 第三道：最终 SQL WHERE studentId in 白名单 AND filter AND scope
        var where3 = {};
        // 第三道 A：studentId 白名单（teacher 必须有；admin 无限制）
        if (whitelistStudentIds) {
          where3.studentId = _.in(whitelistStudentIds);
        }
        // 第三道 B：scope 条件
        if (scopeCond.taskId) where3.taskId = scopeCond.taskId;
        // classIds / bindingIds → 需要从 tasks 集合中反查 studentId 再过滤，简化：直接按 scopeCond.taskId 走（taskId 已经约束）
        // 若 scope='class' 或 'binding' 且没 taskId → 额外找 tasks 交集
        if ((scope === 'class' || scope === 'binding') && !scopeCond.taskId) {
          var taskScopeFilter = {};
          if (scopeCond.classIds) taskScopeFilter['scope.classIds'] = _.in(scopeCond.classIds);
          if (scopeCond.bindingIds) taskScopeFilter['scope.bindingIds'] = _.in(scopeCond.bindingIds);
          var tList = await db.collection(COL.tasks).where(taskScopeFilter).field({ _id: true }).get();
          var validTaskIds = (tList.data || []).map(function (t) { return t._id; });
          if (validTaskIds.length === 0) {
            return wrap.ok({ list: [], total: 0, nextPageToken: null });
          }
          where3.taskId = _.in(validTaskIds);
        }
        // 第三道 C：filter 条件
        if (filter && filter.reviewStatus) where3['teacherReview.reviewStatus'] = filter.reviewStatus;
        if (filter && filter.warningTags && filter.warningTags.length) {
          where3['aiAnalysis.warning_tags'] = _.exists(true); // 简化；精确匹配用数组包含
        }
        if (filter && filter.statusTag) where3.status = filter.statusTag;
        if (filter && filter.anonymousNo) {
          // 用 anonymized_records 反查 studentId 过滤（或直接 feedbacks 里没有 anonymousNo → 走 users 集合反查）
          var u3 = await db.collection(COL.users).where({ anonymousNo: filter.anonymousNo }).field({ _id: true }).limit(1).get();
          if (u3.data && u3.data[0]) {
            where3.studentId = u3.data[0]._id;
          } else {
            return wrap.ok({ list: [], total: 0, nextPageToken: null });
          }
        }
        if (filter && filter.startTime) {
          where3.submitTime = where3.submitTime || {};
          where3.submitTime._gte = filter.startTime;
        }
        if (filter && filter.endTime) {
          where3.submitTime = where3.submitTime || {};
          where3.submitTime._lte = filter.endTime;
        }

        // 处理 _.gte / _.lte 兼容（若 db.command 可用）
        if (_ && _.gte && where3.submitTime) {
          var st = {};
          if (filter.startTime) st = Object.assign(st, _.gte(filter.startTime));
          if (filter.endTime) st = Object.assign(st, _.lte(filter.endTime));
          if (Object.keys(st).length) where3.submitTime = st;
        }

        // 计算 skip
        var skipNum = 0;
        if (pageToken) {
          try { skipNum = parseInt(pageToken, 10) || 0; } catch (e) { skipNum = 0; }
        }

        var col3 = db.collection(COL.feedbacks);
        // total
        var total3 = 0;
        try {
          var countRes = await col3.where(where3).count();
          total3 = countRes.total || 0;
        } catch (e) { total3 = 0; }

        var query3 = col3.where(where3).orderBy('submitTime', 'desc').skip(skipNum).limit(pageSize);
        var listRes3 = await query3.get();
        var rawList = listRes3.data || [];

        // PII 剥离：teacherReview → stripFeedbackReviewForList；student 只返 anonymousNo
        var studentIds3 = rawList.map(function (f) { return f.studentId; }).filter(Boolean);
        var uniqueSids3 = Array.from(new Set(studentIds3));
        var userMap3 = {};
        if (uniqueSids3.length) {
          var us = await db.collection(COL.users)
            .where({ _id: _.in(uniqueSids3) })
            .field({ _id: true, anonymousNo: true })
            .get();
          (us.data || []).forEach(function (u) { userMap3[u._id] = u.anonymousNo; });
        }

        var outList = rawList.map(function (f) {
          return {
            _id: f._id,
            taskId: f.taskId,
            studentAnonymousNo: userMap3[f.studentId] || '#S000000',
            submitTime: f.submitTime,
            status: f.status,
            aiAnalysis: f.aiAnalysis,
            msSecCheckLabelsHit: f.msSecCheckLabelsHit || [],
            teacherReview: stripFeedbackReviewForList(f.teacherReview, teacherId3),
            previewText: (f.imageFeedbacks && f.imageFeedbacks[0])
              ? ((f.imageFeedbacks[0].text || '').slice(0, 80))
              : ''
          };
        });

        var nextPageToken = null;
        if (skipNum + pageSize < total3) nextPageToken = String(skipNum + pageSize);

        return wrap.ok({
          list: outList,
          total: total3,
          pageSize: pageSize,
          nextPageToken: nextPageToken,
          scope: scope,
          scopeId: scopeId,
          viewerAnonymousNo: viewerAnonymousNo
        });
      }

      // =====================================================
      // 动作 4: getFeedbackDetail (教师读单条详情)
      // =====================================================
      case 'getFeedbackDetail': {
        var user4 = await verifyRole(ctx, ['teacher', 'admin']);
        var feedbackId4 = event.feedbackId;
        if (!feedbackId4) return wrap.fail(400, '缺少 feedbackId');

        var userRole4 = user4.role;
        var teacherId4 = user4._id;

        // 第一道：取反馈
        var fb4 = await db.collection(COL.feedbacks).doc(feedbackId4).get();
        if (!fb4.data) return wrap.fail(404, 'feedback 不存在');
        var f4 = fb4.data;

        // 第二道：本人白名单 + scope 校验（同动作 3）
        var studentId4 = f4.studentId;
        var taskId4 = f4.taskId;

        // scope 三道防线：二道（task 是否属于本人）
        var taskValid = await validateScopeIdBelongsToTeacher('task', taskId4, teacherId4, userRole4);
        if (!taskValid) {
          return wrap.fail(403, '该 feedback 不属于您的管理范围');
        }

        // scope 三道防线：一道（studentId 是否在本人白名单）
        if (userRole4 !== 'admin') {
          var wl = await fetchOwnStudentIds(teacherId4);
          if (!wl || wl.indexOf(studentId4) < 0) {
            return wrap.fail(403, '该学生不在您的班级或绑定范围内');
          }
        }

        // 取 studentAnonymousNo
        var stuUser4 = await db.collection(COL.users).doc(studentId4).get();
        var studentAnonymousNo = (stuUser4.data && stuUser4.data.anonymousNo) || '#S000000';

        // 取关联 task.title（匿名：仅 title 不返回 scope/teacherId 等）
        var taskRes4 = await db.collection(COL.tasks).doc(taskId4).get();
        var taskInfo = taskRes4.data ? { _id: taskRes4.data._id, title: taskRes4.data.title } : null;

        // teacherReview 剥离：非本人 teacherNote 删除 + reviewedByTeacherId 删除
        var strippedReview = stripFeedbackReviewForList(f4.teacherReview, teacherId4);

        // 关键：reviewStatus==='adjusted' 且 reviewedByAnonymousNo 不是当前教师时 → teacherNote 整个字段已不存在
        // stripFeedbackReviewForList 内部已完成：若 viewerTeacherId !== realTeacherId → delete out.teacherNote
        // 额外加强：当 reviewedByAnonymousNo 不是当前教师的 anonymousNo（即 review 不是本人写的），teacherNote 必须不存在
        if (strippedReview && strippedReview.reviewedByAnonymousNo && strippedReview.reviewedByAnonymousNo !== user4.anonymousNo) {
          delete strippedReview.teacherNote;
          // 同时 reviewStatus 若是 adjusted 且 reviewedByAnonymousNo 不是本人 → 也确认 reviewedByTeacherId 已删（stripFeedbackReviewForList 已处理）
        }

        return wrap.ok({
          _id: f4._id,
          task: taskInfo,
          studentAnonymousNo: studentAnonymousNo,
          imageFeedbacks: f4.imageFeedbacks,
          submitTime: f4.submitTime,
          status: f4.status,
          aiRetryCount: f4.aiRetryCount || 0,
          msSecCheckLabelsHit: f4.msSecCheckLabelsHit || [],
          aiAnalysis: f4.aiAnalysis,
          teacherReview: strippedReview
        });
      }

      // =====================================================
      // 动作 5: listWarnings (教师本人 dashboard 预警列表)
      // =====================================================
      case 'listWarnings': {
        // --- Task12 追加：缺参数 DEFAULT 兜底 START ---
        event.scope = event.scope || 'all';
        event.pageSize = Number(event.pageSize) > 0 ? Number(event.pageSize) : 50;
        event.dateRangeStart = Number(event.dateRangeStart) > 0 ? Number(event.dateRangeStart) : null;
        event.dateRangeEnd = Number(event.dateRangeEnd) > 0 ? Number(event.dateRangeEnd) : null;
        // --- Task12 追加 END ---
        var user5 = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        var teacherId5 = user5._id;
        var userRole5 = user5.role;

        // 第一道：本人白名单 studentIds
        var wl5 = null;
        if (userRole5 === 'admin') {
          wl5 = null; // admin 不限制 studentId
        } else {
          wl5 = await fetchOwnStudentIds(teacherId5);
          if (!wl5 || wl5.length === 0) {
            return wrap.ok({ list: [], count: 0 });
          }
        }

        // 构造 where：warning_tags.length > 0 OR confirmedWarningTags.length > 0 OR reviewStatus in ['pending_review','ai_failed']
        // 简化 where（先构造基础条件，再或组合）
        var where5 = {};
        if (wl5) where5.studentId = _.in(wl5);

        // OR 条件
        var orConds5 = [];
        if (_ && _.exists) {
          // 有 _.exists：构造多个 where 条件再合并
          // 简化：直接用多条件查询
        }
        // 简化实现：取前 50 条再客户端过滤（实际生产用 _.or）
        var col5 = db.collection(COL.feedbacks);
        var query5 = col5.where(where5).orderBy('submitTime', 'desc').limit(50);
        var res5 = await query5.get();
        var raw5 = res5.data || [];

        // 客户端过滤：warning_tags 非空 或 confirmedWarningTags 非空 或 reviewStatus pending_review/ai_failed
        var filtered5 = raw5.filter(function (f) {
          var tags = (f.aiAnalysis && f.aiAnalysis.warning_tags) ? f.aiAnalysis.warning_tags : [];
          var confTags = (f.teacherReview && f.teacherReview.confirmedWarningTags) || [];
          var revStatus = (f.teacherReview && f.teacherReview.reviewStatus) || '';
          var stat = f.status || '';
          return tags.length > 0
            || confTags.length > 0
            || revStatus === 'pending_review'
            || stat === 'ai_failed';
        });

        // PII 剥离 → anonymousNo
        var sids5 = Array.from(new Set(filtered5.map(function (f) { return f.studentId; }).filter(Boolean)));
        var userMap5 = {};
        if (sids5.length) {
          var us5 = await db.collection(COL.users).where({ _id: _.in(sids5) }).field({ _id: true, anonymousNo: true }).get();
          (us5.data || []).forEach(function (u) { userMap5[u._id] = u.anonymousNo; });
        }

        var out5 = filtered5.map(function (f) {
          var summary = '';
          if (f.aiAnalysis && f.aiAnalysis.summary) summary = f.aiAnalysis.summary;
          else if (f.teacherReview && f.teacherReview.confirmedSummary) summary = f.teacherReview.confirmedSummary;
          return {
            _id: f._id,
            studentAnonymousNo: userMap5[f.studentId] || '#S000000',
            submitTime: f.submitTime,
            aiWarningTags: (f.aiAnalysis && f.aiAnalysis.warning_tags) ? f.aiAnalysis.warning_tags : [],
            confirmedWarningTags: (f.teacherReview && f.teacherReview.confirmedWarningTags) || [],
            reviewStatus: (f.teacherReview && f.teacherReview.reviewStatus) || 'pending_review',
            summaryPreview: summary.slice(0, 40),
            status: f.status
          };
        });

        return wrap.ok({ list: out5, count: out5.length });
      }

      // =====================================================
      // 动作 6: reviewAI (教师确认/调整 AI 分析)
      // =====================================================
      case 'reviewAI': {
        var user6 = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        var feedbackId6 = event.feedbackId;
        var reviewAction = event.reviewAction || event.action_inner || ''; // 子动作：'confirm' | 'adjust'
        // 注意：外层 switch 用 action='reviewAI'，内层再用 reviewAction 区分 confirm/adjust
        if (!reviewAction && event.review_action) reviewAction = event.review_action;
        if (reviewAction !== 'confirm' && reviewAction !== 'adjust') {
          return wrap.fail(400, 'reviewAction 必须为 confirm 或 adjust');
        }
        if (!feedbackId6) return wrap.fail(400, '缺少 feedbackId');

        var teacherId6 = user6._id;
        var userRole6 = user6.role;

        // 读 feedback + scope 校验
        var fb6 = await db.collection(COL.feedbacks).doc(feedbackId6).get();
        if (!fb6.data) return wrap.fail(404, 'feedback 不存在');
        var f6 = fb6.data;

        // 二道防线：task 是否属于本人
        var tv = await validateScopeIdBelongsToTeacher('task', f6.taskId, teacherId6, userRole6);
        if (!tv) return wrap.fail(403, '无权审核不属于您的学生反馈');

        // 一道防线：studentId 在白名单
        if (userRole6 !== 'admin') {
          var wl6 = await fetchOwnStudentIds(teacherId6);
          if (!wl6 || wl6.indexOf(f6.studentId) < 0) return wrap.fail(403, '该学生不在您的管理范围');
        }

        // aiAnalysis 校验
        var aiAnalysis = f6.aiAnalysis;
        if (reviewAction === 'confirm' && (!aiAnalysis || !aiAnalysis.scores)) {
          return wrap.fail(409, 'AI 分析尚未完成，无法确认');
        }

        // teacherNote ≤ 500 字
        var teacherNote6 = event.teacherNote ? String(event.teacherNote).slice(0, 500) : null;

        var now = Date.now();
        var finalScores = null;
        var finalWarningTags = null;
        var finalSummary = null;

        if (reviewAction === 'confirm') {
          // ========= 关键：confirm 分支 后端强制取 aiAnalysis，完全不用前端传入 =========
          // ★ 防绕过：即使前端传 confirmedScores={0,0,0,0,0} 这里也完全忽略 ★
          finalScores = {
            depression: Number(aiAnalysis.scores.depression),
            anxiety: Number(aiAnalysis.scores.anxiety),
            stress: Number(aiAnalysis.scores.stress || aiAnalysis.scores.calmness || 5), // 兼容旧字段 calmness → stress
            wellBeing: Number(aiAnalysis.scores.wellBeing || aiAnalysis.scores.cheerfulness || 5), // 兼容 cheerfulness → wellBeing
            resilience: Number(aiAnalysis.scores.resilience || aiAnalysis.scores.aggression || 5) // 兼容 aggression → resilience（反向）
          };
          finalWarningTags = Array.isArray(aiAnalysis.warning_tags) ? aiAnalysis.warning_tags.slice() : [];
          finalSummary = aiAnalysis.summary || '';
        } else {
          // adjust 分支：用前端传入，但做范围校验
          var inputScores = event.confirmedScores || {};
          function clampScore(v) {
            var n = Number(v);
            if (isNaN(n)) n = 50;
            if (n < 0) n = 0;
            if (n > 100) n = 100;
            return n;
          }
          finalScores = {
            depression: clampScore(inputScores.depression),
            anxiety: clampScore(inputScores.anxiety),
            stress: clampScore(inputScores.stress),
            wellBeing: clampScore(inputScores.wellBeing),
            resilience: clampScore(inputScores.resilience)
          };
          finalWarningTags = Array.isArray(event.confirmedWarningTags)
            ? event.confirmedWarningTags.filter(function (t) { return typeof t === 'string' && t.length < 50; }).slice(0, 10)
            : [];
          finalSummary = event.confirmedSummary ? String(event.confirmedSummary).slice(0, 500) : '';
        }

        var newReviewStatus = reviewAction === 'confirm' ? 'confirmed' : 'adjusted';
        var newFeedbackStatus = 'reviewed_' + (f6.status || 'normal');

        // 写入 feedbacks
        var updateData = {
          'teacherReview.reviewStatus': newReviewStatus,
          'teacherReview.reviewedAt': now,
          'teacherReview.reviewedByTeacherId': teacherId6,
          'teacherReview.reviewedByAnonymousNo': user6.anonymousNo,
          'teacherReview.confirmedScores': finalScores,
          'teacherReview.confirmedWarningTags': finalWarningTags,
          'teacherReview.confirmedSummary': finalSummary,
          'teacherReview.teacherNote': teacherNote6,
          status: newFeedbackStatus
        };

        await db.collection(COL.feedbacks).doc(feedbackId6).update({ data: updateData });

        // 额外写一条 ai_quality_metrics（Task15 用）
        var metricRecord = {
          feedbackId: feedbackId6,
          anonymousNo: null, // 反查 student anonymousNo
          aiScores: aiAnalysis ? aiAnalysis.scores : null,
          aiWarningTags: aiAnalysis ? (aiAnalysis.warning_tags || []) : [],
          teacherConfirmedOrAdjusted: newReviewStatus, // confirmed / adjusted
          confirmedScores: finalScores,
          confirmedWarningTags: finalWarningTags,
          reviewByAnonymousNo: user6.anonymousNo,
          createTime: now
        };
        var stu6 = await db.collection(COL.users).doc(f6.studentId).field({ anonymousNo: true }).get();
        if (stu6.data) metricRecord.anonymousNo = stu6.data.anonymousNo;
        writeAiQualityMetric(metricRecord); // 异步不阻塞

        return wrap.ok({
          feedbackId: feedbackId6,
          reviewStatus: newReviewStatus,
          status: newFeedbackStatus,
          reviewedByAnonymousNo: user6.anonymousNo,
          // confirm 分支返回最终 scores（实际来自 aiAnalysis）用于前端验证"防绕过"
          confirmedScores: finalScores,
          confirmedWarningTags: finalWarningTags,
          confirmedSummary: finalSummary,
          reviewAction: reviewAction,
          msg: reviewAction === 'confirm'
            ? '已确认 AI 结论（使用 AI 原始值，未采用前端输入）'
            : '已保存调整后的审核结论'
        });
      }

      // =====================================================
      // 动作 7: queryMyStudentIds (工具函数，给前端算 scope)
      // =====================================================
      case 'queryMyStudentIds': {
        var user7 = await verifyRole(ctx, ['teacher', 'admin'], { requireTeacherApproved: true });
        var userRole7 = user7.role;

        var out7 = [];
        if (userRole7 === 'admin') {
          // admin：返回所有学生的 _id（供前端下拉筛选器用；实际分页需注意数量）
          // 限制最大 2000 条避免全表爆
          var allStu = await db.collection(COL.users)
            .where({ role: 'student' })
            .field({ _id: true, anonymousNo: true })
            .limit(2000)
            .get();
          out7 = (allStu.data || []).map(function (u) { return u._id; });
        } else {
          out7 = await fetchOwnStudentIds(user7._id);
        }
        return wrap.ok({
          studentIds: Array.isArray(out7) ? out7 : [],
          count: Array.isArray(out7) ? out7.length : 0
        });
      }

      // =====================================================
      // 动作 8: listPendingApprovals (Admin 端读取教师 pending 审批列表)
      // =====================================================
      case 'listPendingApprovals': {
        var user8 = await verifyRole(ctx, ['admin']); // 仅 admin

        var col8 = db.collection(COL.users);
        var query8 = col8.where({
          role: 'teacher',
          teacherStatus: 'pending'
        }).orderBy('createTime', 'asc').limit(100);

        var res8 = await query8.get();
        var rawTeachers = res8.data || [];

        // 只返 teacherInfo（姓名+学校+teacherCertHash——只返 hash 不返证号）+ createTime + lastApprovalTime
        var out8 = rawTeachers.map(function (t) {
          var teacherInfo = t.teacherInfo || {};
          // 证号 hash：md5(teacherCertNo) 的前 8 位（没有则空，不返明文）
          var certHash = null;
          if (teacherInfo.teacherCertHash) certHash = teacherInfo.teacherCertHash;
          else if (teacherInfo.teacherCertNo) {
            // 若没存 hash，现场造一个简易 hash（前 8 位 md5-like：简单截断 hash 兜底）
            var cno = String(teacherInfo.teacherCertNo);
            var h = 0;
            for (var i = 0; i < cno.length; i++) h = ((h << 5) - h) + cno.charCodeAt(i), h |= 0;
            certHash = ('00000000' + Math.abs(h).toString(16)).slice(-8);
          }
          return {
            _id: t._id,
            anonymousNo: t.anonymousNo || '#T000',
            teacherInfo: {
              name: teacherInfo.name || t.name || t.nickname || '未填写',
              school: teacherInfo.school || '未填写',
              teacherCertHash: certHash // ★ 只返 hash，不返明文 teacherCertNo
            },
            createTime: t.createTime || null,
            lastApprovalTime: t.lastApprovalTime || null
          };
        });

        return wrap.ok({ list: out8, count: out8.length });
      }

      // =====================================================
      // 兜底：未知 action
      // =====================================================
      default:
        return wrap.fail(400, '未知 action：' + action + '，请使用 submitFeedback/submitFinalFromCacheClear/queryFeedbacks/getFeedbackDetail/listWarnings/reviewAI/queryMyStudentIds/listPendingApprovals');
    }
  } catch (e) {
    // 结构化错误返回
    var code = e.code || 500;
    var msg = e.msg || e.message || String(e);
    if (typeof msg === 'string' && msg.length > 300) msg = msg.slice(0, 300);
    return wrap.fail(code, msg, {
      action: action,
      original: (e.errMsg || '').slice(0, 200)
    });
  }
};
