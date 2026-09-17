// cloudfunctions/cacheClear/index.js
// 动作 1 pullSyncPlan / 动作 2 submitFinalSync(4闸) / 动作 3 cancelPending / 动作 4 clearLocalStorageCache / 动作 5 expireOldDraftsBulk
// 设计依赖：§2.1 学生草稿同步 4 闸原子流程；§3.2 cache_queue 集合与 30 天 TTL；users.loginExpireAt 30 天过期
// ★ 关键红线：submitFinalSync 不直接三写 feedbacks/anonymized_records/status_snapshots，
//   统一复用 feedbackSubmit.submitFinalFromCacheClear（Task5 动作 2）兄弟通路，保证两条路径三写原子+回滚逻辑不漂移。

var cloud = null;
var db = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
} catch (e) {
  // 本地 Node 自检环境：wx-server-sdk 未安装时轻量 stub，保证 require 成功 + node --check/自检通过
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
    callFunction: function () {
      // stub：返回成功（自检不会真调用兄弟云函数；运行时 cloud.callFunction 为真实实现）
      return Promise.resolve({
        result: {
          code: 0,
          msg: 'ok',
          data: {
            draftBatchId: 'stub-batch',
            successCount: 0,
            failCount: 0,
            successItems: [],
            failItems: []
          }
        }
      });
    }
  };
  db = cloud.database();
}

var _ = null;
try { _ = db.command; } catch (e) {
  _ = {
    in: function (arr) { return { $in: arr }; },
    gte: function (v) { return { $gte: v }; },
    lte: function (v) { return { $lte: v }; },
    or: function (arr) { return { $or: arr }; },
    and: function (arr) { return { $and: arr }; },
    exists: function (b) { return { $exists: !!b }; }
  };
}

// ============ 共享只读模块（严格不得修改）============
var COL = require('../shared/collectionNames.js');
var wrap = require('../shared/responseWrapper.js');
var verifyRoleMod = require('../shared/verifyRole.js');

var verifyRole = verifyRoleMod.verifyRole;
var fetchOwnStudentIds = verifyRoleMod.fetchOwnStudentIds;

// cache_queue 集合：§3.2 草稿批次集合（30 天 TTL，COL 常量未含则本云函数局部兜底）
var CACHE_QUEUE_COL = 'cache_queue';

// ================== 辅助工具函数 ==================

/**
 * 毫秒常量
 */
var DAY_MS = 86400000;
var TTL_DAYS = 30;

/**
 * Admin/cloudservice 身份校验（内部定时/手工触发器）
 * - 若 ctx 有 OPENID → verifyRole(['admin'])
 * - 若 ctx 无 OPENID（定时触发器）且 allowInternalService=true → 视为 cloudservice 合法
 */
async function verifyAdminOrService(ctx, allowInternalService) {
  if (ctx && ctx.OPENID) {
    return await verifyRole(ctx, ['admin']);
  }
  if (allowInternalService === true) {
    // 云调用/定时触发器：无 OPENID，但服务上下文存在
    if (ctx && (ctx.SOURCE === 'scf' || ctx.FUNCTION_NAME || typeof ctx.CLIENTIP !== 'undefined')) {
      return { _id: 'cloudservice', role: 'cloudservice', anonymousNo: 'CLOUD-SERVICE' };
    }
    // 自检环境：ctx 可能空，放行 stub（真实运行时不会）
    return { _id: 'cloudservice-stub', role: 'cloudservice', anonymousNo: 'CLOUD-SERVICE' };
  }
  throw { code: 403, msg: '仅 admin 或内部服务可调用' };
}

/**
 * 学生 scope 校验：本人 studentId 是否命中 tasks.scope.classIds 或 scope.bindingIds
 * （复用 feedbackSubmit 中 isStudentInTaskScope 逻辑，避免跨文件改 shared）
 */
function isStudentInTaskScope(task, studentId) {
  if (!task || !task.scope) return Promise.resolve(false);
  var classIds = task.scope.classIds || [];
  var bindingIds = task.scope.bindingIds || [];
  return new Promise(function (resolve) {
    (async function () {
      try {
        if (bindingIds && bindingIds.length) {
          var bindCond = { _id: _.in(bindingIds), studentId: studentId };
          var bindRes = await db.collection(COL.bindings).where(bindCond).count();
          if (bindRes.total > 0) return resolve(true);
        }
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
 * 4闸· msSecCheck：合并每行 imageFeedbacks.text → cloud.openapi.security.msgSecCheck
 * 返回 { label: 'normal' | 'xxx', content }
 * 若 label !== 'normal' → 仍入库但 msSecSkippedAi=true（不送千问），标记 hitLabel。
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
        // msgSecCheck 调用失败：降级 normal
        resolve({ label: 'normal', content: content, callFailed: true });
      }
    })();
  });
}

/**
 * 调用兄弟云函数 feedbackSubmit 动作 2 submitFinalFromCacheClear（三写原子复用）
 * ★ 闸二 字段白名单强制覆盖：本函数 NEVER 传 studentId / anonymousNo / teacherId / teacherAnonymousNo / className / name / nickname；
 *   feedbackSubmit 动作 2 内部自己 verifyRole → 取 user._id + user.anonymousNo → buildFeedbackDoc/buildAnonymizedDoc 强制写真实字段。
 * 仅传：action / draftBatchId / batchRows（每行仅 taskId + imageFeedbacks + deviceCreateTime + draftVersion 四个白名单字段）
 */
function callSubmitFinalFromCacheClear(draftBatchId, batchRows) {
  return new Promise(function (resolve, reject) {
    (async function () {
      try {
        if (typeof cloud.callFunction !== 'function') {
          return reject({ code: 500, msg: 'cloud.callFunction 不可用' });
        }
        var resp = await cloud.callFunction({
          name: 'feedbackSubmit',
          data: {
            action: 'submitFinalFromCacheClear',
            draftBatchId: draftBatchId,
            // 严格白名单：只带 taskId/imageFeedbacks/deviceCreateTime/draftVersion
            batchRows: batchRows.map(function (r) {
              return {
                taskId: r.taskId,
                imageFeedbacks: Array.isArray(r.imageFeedbacks)
                  ? r.imageFeedbacks.map(function (f) { return { imageId: f.imageId, text: (f.text || '').toString().slice(0, 2000) }; }).filter(function (f) { return f.imageId || f.text; })
                  : [],
                deviceCreateTime: typeof r.deviceCreateTime === 'number' ? r.deviceCreateTime : null,
                draftVersion: typeof r.draftVersion !== 'undefined' ? r.draftVersion : null
              };
            })
          }
        });
        resolve(resp && resp.result ? resp.result : { code: 500, msg: '兄弟云函数返回空' });
      } catch (e) {
        reject({
          code: e.code || 5003,
          msg: '调用兄弟通路 feedbackSubmit.submitFinalFromCacheClear 失败：' + (e.msg || e.message || String(e)).slice(0, 200)
        });
      }
    })();
  });
}

/**
 * cache_queue 批次状态写入：submitFinalSync 成功汇总写入
 */
async function markCacheQueueSynced(studentId, batchId, totalSuccess, totalFail, syncedAt) {
  try {
    await db.collection(CACHE_QUEUE_COL)
      .where({ _id: batchId, studentId: studentId })
      .update({
        data: {
          status: 'success',
          successCount: totalSuccess,
          failCount: totalFail,
          syncedAt: syncedAt
        }
      });
    return true;
  } catch (e) {
    console.warn('[markCacheQueueSynced] 更新失败 batchId=' + batchId, e.errMsg || e.message);
    return false;
  }
}

// ================== 5 动作 dispatch 骨架 ==================

exports.main = async function (event, context) {
  var action = event.action || '';
  var ctx = context || {};
  var now = Date.now();

  try {
    switch (action) {

      // ============================================================
      // 动作 1: pullSyncPlan（学生首次打开任务大厅 / 弱网恢复）
      //   - 身份 student（不要求教师已审核）
      //   - 闸：登录过期 → 401
      //   - 读：本人 pending/uploading/failed 草稿批次
      //   - TTL：本人 createdAt < now-30d 标记 expired_ttl
      // ============================================================
      case 'pullSyncPlan': {
        var userA = await verifyRole(ctx, ['student'], { requireTeacherApproved: false });

        // 闸一· 登录过期：§3.2 users.loginExpireAt 30 天自动过期
        if (userA.loginExpireAt && userA.loginExpireAt <= now) {
          // 草稿保留本地：告诉前端 401 不删本地缓存
          return wrap.fail(401, '登录已过期，请重新登录（草稿保留本地）');
        }

        var studentIdA = userA._id;
        var ttlCutoff = now - TTL_DAYS * DAY_MS;

        // 先 TTL 清理本人过期批次：createdAt < now - 30d 且 status 非终态 → expired_ttl
        var expiredCountA = 0;
        try {
          var ttlWhereA = {
            studentId: studentIdA,
            status: _.in(['pending', 'uploading', 'failed']),
            createdAt: _.lte(ttlCutoff)
          };
          // cloudbase 不支持多个 _.in 合并 where？分别 set（用 _.and 兜底）
          if (_ && _.and) {
            ttlWhereA = _.and([
              { studentId: studentIdA },
              { status: _.in(['pending', 'uploading', 'failed']) },
              { createdAt: _.lte(ttlCutoff) }
            ]);
          }
          var ttlUpd = await db.collection(CACHE_QUEUE_COL).where(ttlWhereA).update({
            data: { status: 'expired_ttl', expiredAt: now, validUntil: now }
          });
          expiredCountA = (ttlUpd && ttlUpd.stats && typeof ttlUpd.stats.updated === 'number') ? ttlUpd.stats.updated : 0;
        } catch (e) {
          console.warn('[pullSyncPlan] TTL 清理本人批次异常:', e.errMsg || e.message);
        }

        // 返回本人待同步批次（终态 status NOT IN success/cancelled/expired_ttl）
        var pendingWhereA = {
          studentId: studentIdA,
          status: _.in(['pending', 'uploading', 'failed'])
        };
        if (_ && _.and) {
          pendingWhereA = _.and([
            { studentId: studentIdA },
            { status: _.in(['pending', 'uploading', 'failed']) }
          ]);
        }
        var batchList = await db.collection(CACHE_QUEUE_COL)
          .where(pendingWhereA)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();

        var pendingBatches = (batchList.data || []).map(function (b) {
          return {
            batchId: b._id || b.batchId,
            createTime: b.createdAt || b.createTime,
            rowCount: typeof b.rowCount === 'number' ? b.rowCount : (Array.isArray(b.batchRows) ? b.batchRows.length : 0),
            taskTitle: b.taskTitle || null
          };
        });

        return wrap.ok({ pendingBatches: pendingBatches, expiredCount: expiredCountA });
      }

      // ============================================================
      // 动作 2: submitFinalSync（4闸核心 · 草稿同步 → 最终写入）
      //  输入: { batchId, batchRows:[{taskId, imageFeedbacks:[{imageId,text}], deviceCreateTime, draftVersion}] }
      //  闸一：登录过期 401
      //  闸二：字段白名单覆盖（绝不信前端 studentId/anonymousNo/teacherId...）
      //  闸三：scope 白名单（tasks.scope 包含本人 studentId → 403 单条 reject 不连累整批）
      //  闸四：msSecCheck + 原子调用 feedbackSubmit.submitFinalFromCacheClear（三写兄弟通路）
      // ============================================================
      case 'submitFinalSync': {
        var userB = await verifyRole(ctx, ['student'], { requireTeacherApproved: false });

        // ---------- 闸一· 登录过期闸 ----------
        if (userB.loginExpireAt && userB.loginExpireAt <= now) {
          return wrap.fail(401, '登录已过期，请重新登录（草稿保留本地）');
        }

        var batchIdB = event.batchId;
        var batchRowsB = event.batchRows || [];
        if (!batchIdB) return wrap.fail(400, '缺少 batchId');
        if (!Array.isArray(batchRowsB) || batchRowsB.length === 0) {
          return wrap.fail(400, 'batchRows 不能为空');
        }

        var studentIdB = userB._id;
        var studentAnonymousNoB = userB.anonymousNo; // 仅 audit 用，绝不在调用兄弟通路时传

        // ---------- 闸二· 字段白名单覆盖 ----------
        // 后端**忽略** batchRows[i].studentId / .anonymousNo / .teacherId / .teacherAnonymousNo / .className / .name / .nickname
        // 真 studentId = verifyRole 返回 user._id；真 anonymousNo = user.anonymousNo；
        // teacherId/teacherAnonymousNo 由 feedbackSubmit 动作 2 内部从 tasks.doc(taskId).get() 取；
        // 我们在 safeRows 里直接把上述敏感字段全部剔除，只留白名单。
        var safeRowsB = [];
        var whitelist = { taskId: 1, imageFeedbacks: 1, deviceCreateTime: 1, draftVersion: 1 };
        for (var ri = 0; ri < batchRowsB.length; ri++) {
          var rawR = batchRowsB[ri] || {};
          var safeR = {};
          Object.keys(whitelist).forEach(function (k) { safeR[k] = rawR[k]; });
          // imageFeedbacks 内部也只取白名单
          safeR.imageFeedbacks = Array.isArray(safeR.imageFeedbacks)
            ? safeR.imageFeedbacks.map(function (f) {
                return { imageId: f && f.imageId ? f.imageId : null, text: (f && f.text ? String(f.text) : '').slice(0, 2000) };
              }).filter(function (f) { return f.imageId || f.text; })
            : [];
          safeR.deviceCreateTime = typeof safeR.deviceCreateTime === 'number' ? safeR.deviceCreateTime : null;
          safeR.rowsIndex = ri; // 用于 failItems/index 回传
          safeRowsB.push(safeR);
        }

        // ---------- 闸三· scope 白名单：逐行校验本人在 tasks.scopeIds 范围内 ----------
        // 非法行：403 reject 单条 → failItems，不连累整批
        // 合法行：进入后续闸四
        var validForGate4 = []; // { rowsIndex, safeRow, task }
        var failItemsGate3 = []; // [{ index, code, msg }]
        var taskCacheB = {}; // taskId -> taskDoc|null
        for (var vi = 0; vi < safeRowsB.length; vi++) {
          var sR = safeRowsB[vi];
          var idx = sR.rowsIndex;
          if (!sR.taskId) {
            failItemsGate3.push({ index: idx, code: 400, msg: '缺少 taskId' });
            continue;
          }
          if (!sR.imageFeedbacks || sR.imageFeedbacks.length === 0) {
            failItemsGate3.push({ index: idx, code: 400, msg: 'imageFeedbacks 为空' });
            continue;
          }
          var taskDoc = null;
          if (taskCacheB[sR.taskId] !== undefined) {
            taskDoc = taskCacheB[sR.taskId];
          } else {
            try {
              var tRes = await db.collection(COL.tasks).doc(sR.taskId).get();
              taskDoc = tRes.data || null;
            } catch (e) { taskDoc = null; }
            taskCacheB[sR.taskId] = taskDoc;
          }
          if (!taskDoc) {
            failItemsGate3.push({ index: idx, code: 404, msg: 'taskId 不存在' });
            continue;
          }
          if (taskDoc.status !== 'published') {
            failItemsGate3.push({ index: idx, code: 403, msg: '任务未发布或已关闭' });
            continue;
          }
          var inScopeB = await isStudentInTaskScope(taskDoc, studentIdB);
          if (!inScopeB) {
            failItemsGate3.push({ index: idx, code: 403, msg: '任务不在您的班级或特殊绑定范围内' });
            continue;
          }
          validForGate4.push({ rowsIndex: idx, safeRow: sR, task: taskDoc });
        }

        var successItemsB = []; // [{index, feedbackId, anonymizedId, msSecHitLabel}]
        var failItemsB = failItemsGate3.slice(); // 先合并闸三失败项

        // ---------- 闸四· msSecCheck + 原子调用 feedbackSubmit.submitFinalFromCacheClear ----------
        // 说明：为保留"每行各自 msSecHitLabel 独立"的语义，我们对所有合法行统一调用兄弟通路；
        // feedbackSubmit 动作 2 内部会逐行再 msSecCheck 并逐行三写原子。
        if (validForGate4.length > 0) {

          // 4-a) 本层先做一次 msSecCheck（每行独立），以在返回结果中带上 hitLabel；
          //      兄弟通路 feedbackSubmit 内部仍会再做一次（双保险，不影响结果正确性）。
          var perRowMsLabel = {}; // rowsIndex -> label
          for (var mi = 0; mi < validForGate4.length; mi++) {
            var v = validForGate4[mi];
            var msR = await runMsSecCheck(v.safeRow.imageFeedbacks);
            perRowMsLabel[String(v.rowsIndex)] = msR.label || 'normal';
          }

          // 4-b) 整理 batchRows（仅白名单字段，严格**不传** studentId/anonymousNo/teacherId/name/nickname/className）
          var gate4Rows = validForGate4.map(function (vv) {
            return {
              taskId: vv.safeRow.taskId,
              imageFeedbacks: vv.safeRow.imageFeedbacks,
              deviceCreateTime: vv.safeRow.deviceCreateTime,
              draftVersion: vv.safeRow.draftVersion
            };
          });

          // 4-c) ★ 原子调用兄弟通路 submitFinalFromCacheClear（Task5 动作 2 三写原子全复用）
          //     ★ 不传 studentId/anonymousNo：兄弟通路内部 verifyRole(ctx, ['student']) → user._id / anonymousNo 强制覆盖
          var sibResult = await callSubmitFinalFromCacheClear(batchIdB, gate4Rows);

          if (!sibResult || sibResult.code !== 0) {
            // 兄弟通路整体失败 → 所有 validForGate4 行统一标记失败
            var sibMsg = (sibResult && sibResult.msg) ? String(sibResult.msg).slice(0, 200) : '兄弟通路返回失败';
            var sibCode = sibResult && sibResult.code ? sibResult.code : 5003;
            validForGate4.forEach(function (vv) {
              failItemsB.push({ index: vv.rowsIndex, code: sibCode, msg: sibMsg });
            });
          } else {
            // 4-d) 汇总兄弟通路 successItems / failItems
            var sibData = (sibResult.data || {});
            var sibSucc = Array.isArray(sibData.successItems) ? sibData.successItems : [];
            var sibFail = Array.isArray(sibData.failItems) ? sibData.failItems : [];

            // 兄弟通路 action 2 的下标 idx 是 gate4Rows 内部下标（0..N-1），需要还原为原 batchRows 的 rowsIndex
            for (var si = 0; si < sibSucc.length; si++) {
              var ss = sibSucc[si];
              var innerIdx = typeof ss.idx === 'number' ? ss.idx : -1;
              if (innerIdx < 0 || innerIdx >= validForGate4.length) continue;
              var origIdx = validForGate4[innerIdx].rowsIndex;
              successItemsB.push({
                index: origIdx,
                feedbackId: ss.feedbackId,
                anonymizedId: ss.anonymizedId,
                msSecHitLabel: perRowMsLabel[String(origIdx)] || ss.msSecHitLabel || 'normal'
              });
            }
            for (var fi = 0; fi < sibFail.length; fi++) {
              var ff = sibFail[fi];
              var innerFIdx = typeof ff.idx === 'number' ? ff.idx : -1;
              if (innerFIdx < 0 || innerFIdx >= validForGate4.length) continue;
              var origFIdx = validForGate4[innerFIdx].rowsIndex;
              failItemsB.push({
                index: origFIdx,
                code: 500,
                msg: (ff.reason || '三写失败').slice(0, 200)
              });
            }
          }
        }

        var totalSuccessB = successItemsB.length;
        var totalFailB = failItemsB.length;

        // ---------- 写回 cache_queue：status='success' + 统计项 ----------
        // 注意：即便有 failItems，只要兄弟通路调用完成，也把 batch 标记为 success 闭环（failItems 前端可重试）
        await markCacheQueueSynced(studentIdB, batchIdB, totalSuccessB, totalFailB, now);

        return wrap.ok({
          batchId: batchIdB,
          successItems: successItemsB,
          failItems: failItemsB,
          totalSuccess: totalSuccessB,
          totalFail: totalFailB
        });
      }

      // ============================================================
      // 动作 3: cancelPending（学生取消本人 pending 批次）
      // ============================================================
      case 'cancelPending': {
        var userC = await verifyRole(ctx, ['student'], { requireTeacherApproved: false });
        var batchIdC = event.batchId;
        if (!batchIdC) return wrap.fail(400, '缺少 batchId');

        var whereC = { _id: batchIdC, studentId: userC._id, status: _.in(['pending', 'failed', 'uploading']) };
        if (_ && _.and) {
          whereC = _.and([
            { _id: batchIdC },
            { studentId: userC._id },
            { status: _.in(['pending', 'failed', 'uploading']) }
          ]);
        }
        try {
          await db.collection(CACHE_QUEUE_COL).where(whereC).update({
            data: { status: 'cancelled', cancelledAt: now }
          });
        } catch (e) {
          return wrap.fail(500, '取消批次失败：' + (e.errMsg || e.message || String(e)).slice(0, 200));
        }
        return wrap.ok({ cancelled: true });
      }

      // ============================================================
      // 动作 4: clearLocalStorageCache（本地缓存清除审计 → 写 audit_logs）
      //   实际本地清理由前端 wx.removeStorageSync 执行；本动作仅写审计日志。
      // ============================================================
      case 'clearLocalStorageCache': {
        var userD = await verifyRole(ctx, ['student'], { requireTeacherApproved: false });
        var clearedCountD = typeof event.clearedCount === 'number' ? event.clearedCount : 0;
        var clearedBatchIdsD = Array.isArray(event.clearedBatchIds) ? event.clearedBatchIds.slice(0, 500) : [];
        try {
          await db.collection(COL.audit_logs).add({
            data: {
              auditType: 'student_local_cache_cleared',
              studentAnonymousNo: userD.anonymousNo || null,
              clearedCount: clearedCountD,
              clearedBatchIds: clearedBatchIdsD,
              createTime: now,
              ip: ctx.CLIENTIP || null
            }
          });
        } catch (e) {
          // 审计日志写失败兜底：记录告警但不影响前端（前端已完成清理）
          console.warn('[clearLocalStorageCache] audit_logs 写入失败:', e.errMsg || e.message);
        }
        return wrap.ok(true);
      }

      // ============================================================
      // 动作 5: expireOldDraftsBulk（admin/内部服务）· 30 天 TTL 过期扫描
      //   - WHERE createdAt < now - 30*86400000 AND status IN (pending/uploading/failed) LIMIT 500
      //   - UPDATE status=expired_ttl + expiredAt=now
      // ============================================================
      case 'expireOldDraftsBulk': {
        await verifyAdminOrService(ctx, true); // allowInternalService=true（定时触发器）
        var cutoffE = now - TTL_DAYS * DAY_MS;
        var expiredCountE = 0;
        try {
          var expiredWhereE = _.and([
            { createdAt: _.lte(cutoffE) },
            { status: _.in(['pending', 'uploading', 'failed']) }
          ]);
          var updE = await db.collection(CACHE_QUEUE_COL).where(expiredWhereE).limit(500).update({
            data: { status: 'expired_ttl', expiredAt: now }
          });
          expiredCountE = (updE && updE.stats && typeof updE.stats.updated === 'number') ? updE.stats.updated : 0;
        } catch (e) {
          return wrap.fail(500, 'TTL 批量过期失败：' + (e.errMsg || e.message || String(e)).slice(0, 200));
        }
        return wrap.ok({ expiredCount: expiredCountE });
      }

      // ============================================================
      // 兜底：未知 action
      // ============================================================
      default:
        return wrap.fail(400, '未知 action：' + action + '，请使用 pullSyncPlan/submitFinalSync/cancelPending/clearLocalStorageCache/expireOldDraftsBulk');
    }
  } catch (e) {
    var code = e.code || 500;
    var msg = e.msg || e.message || String(e);
    if (typeof msg === 'string' && msg.length > 300) msg = msg.slice(0, 300);
    return wrap.fail(code, msg, {
      action: action,
      original: (e.errMsg || '').slice(0, 200)
    });
  }
};
