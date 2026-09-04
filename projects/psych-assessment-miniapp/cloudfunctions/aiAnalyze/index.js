// cloudfunctions/aiAnalyze/index.js
// AI 分析云函数：千问 DashScope qwen-plus few-shot 评估反馈文字
// 7 动作 switch(action)：
//   1. analyzeOne          对单条 feedbackId 跑 AI（最多 4 次内退避，失败入 retry_queue）
//   2. runRetryQueue       定时/手动扫 retry_queue 批处理（外部 4 次层级）
//   3. pushToRetryQueue    工具：手动把 feedbackId 塞入重试队列
//   4. getQueueStats       质量看板统计
//   5. manualRerun         教师/管理员 手动强制重做 AI
//   6. getModelPricingInfo Task15 预算告警参考 + 7日累计消耗
//   7. getBudgetStatus     当月 token 预算使用 + 三档告警阈值（normal/warning/critical）

var cloud = null;
var db = null;
var _ = null;
var cmd = null;
try {
  cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  db = cloud.database();
  _ = db.command;
  cmd = db.command;
} catch (e) {
  // 本地 Node 自检环境 stub（node --check 时 wx-server-sdk 不一定已装，只保证 require 不崩溃）
  cloud = { init: function () {}, DYNAMIC_CURRENT_ENV: 'local-stub' };
  db = {
    collection: function (n) {
      return {
        doc: function () { return { get: function () { return Promise.resolve({ data: null }); }, update: function () { return Promise.resolve({}); } }; },
        where: function () {
          return {
            count: function () { return Promise.resolve({ total: 0 }); },
            get: function () { return Promise.resolve({ data: [] }); },
            limit: function () { return { orderBy: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
            orderBy: function () { return { limit: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; } }; },
            remove: function () { return Promise.resolve({ removed: 0 }); },
            update: function () { return Promise.resolve({}); },
            add: function () { return Promise.resolve({ _id: '' }); },
            field: function () { return { get: function () { return Promise.resolve({ data: [] }); } }; }
          };
        },
        add: function () { return Promise.resolve({ _id: '' }); },
        aggregate: function () {
          return {
            match: function () { return this; },
            group: function () { return this; },
            end: function () { return Promise.resolve({ list: [] }); }
          };
        }
      };
    }
  };
  _ = { and: function () { return {}; }, or: function () { return {}; }, lt: function () { return {}; }, lte: function () { return {}; }, gt: function () { return {}; }, gte: function () { return {}; }, in: function () { return {}; }, eq: function () { return {}; }, set: function (v) { return v; }, aggregate: { sum: function (f) { return f; }, cond: function (arr) { return arr; } } };
  cmd = _;
}

var COLLECTIONS = require('../shared/collectionNames.js');
var RW = require('../shared/responseWrapper.js');
var ok = RW.ok;
var fail = RW.fail;
var VR = require('../shared/verifyRole.js');
var verifyRole = VR.verifyRole;
var fetchOwnStudentIds = VR.fetchOwnStudentIds;
var dashscope = require('../shared/dashscopeClient.js');
var callQwen = dashscope.callQwen;
var extractJSON = dashscope.extractJSON;

// -------------------- 常量 --------------------
var ALLOWED_WARNING_TAGS = [
  'self_harm_risk', 'severe_depression', 'suicide_ideation', 'trauma_signal',
  'violence_risk', 'substance_abuse', 'eating_disorder', 'insomnia_severe',
  'family_conflict', 'bullying_victim'
];
var SCORE_DIMS = ['depression', 'anxiety', 'stress', 'wellBeing', 'resilience'];
var MODEL_NAME = 'qwen-plus';
// 动作1内部 4 次退避（单位：毫秒）；attemptIdx 从 1 开始；±25% jitter
var INTERNAL_DELAYS_BY_ATTEMPT = [0, 5000, 10000, 20000];
// retry_queue 外部 4 次退避：attempt(在队列) 1→5s 2→10s 3→20s 4→60s (与 §3.2 文档一致)
var EXTERNAL_DELAYS_BY_ATTEMPT = [5000, 10000, 20000, 60000];
var FINAL_STATUSES_ALREADY_ANALYZED = ['reviewed_pending_review', 'reviewed_confirmed'];
// qwen-plus 公开定价（元人民币 / 1K tokens），2025 参考价
var PRICING = {
  qwen_plus: {
    input_tokens_per_1k: 0.008,
    output_tokens_per_1k: 0.02,
    currency: 'CNY'
  }
};
// Task13 预算告警阈值常量
var MONTHLY_TOKEN_BUDGET = 2000000; // 200 万 token/月
var WARN_THRESHOLD_PCT = 0.80;
var CRIT_THRESHOLD_PCT = 0.95;

// -------------------- 工具函数 --------------------
function nowTs() { return Date.now(); }

/** 退避延迟 + ±25% jitter */
function calcDelay(baseMs) {
  if (!baseMs) return 0;
  var jitterRatio = (Math.random() * 0.5) - 0.25; // -0.25 ~ +0.25
  return Math.max(0, Math.floor(baseMs * (1 + jitterRatio)));
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** 兼容 verifyRole.allowInternalService: 云函数内部调用时 ctx.OPENID 可能为空 */
async function authAndScopeCheck(ctx, allowedRoles, opts) {
  opts = opts || {};
  var allowInternal = opts.allowInternalService === true;
  var needScope = opts.requireScope !== false;
  // 没有 ctx.OPENID → 视为内部云函数身份
  var isInternal = !ctx || !ctx.OPENID;
  if (isInternal) {
    if (!allowInternal) {
      throw { code: 401, msg: '该接口需要登录身份，不允许内部服务调用' };
    }
    return { user: null, isInternal: true, scopeStudentIds: null };
  }
  var user = await verifyRole(ctx, allowedRoles, opts);
  var scopeStudentIds = null;
  if (needScope && user.role === 'teacher') {
    scopeStudentIds = await fetchOwnStudentIds(user._id);
  }
  return { user: user, isInternal: false, scopeStudentIds: scopeStudentIds };
}

/** teacher 本人范围校验：非本人学生 → 403 */
function assertTeacherScope(auth, feedbackStudentId) {
  if (auth.isInternal) return;
  var u = auth.user;
  if (!u) return;
  if (u.role === 'admin') return;
  if (u.role === 'teacher') {
    var set = auth.scopeStudentIds || [];
    if (!feedbackStudentId) throw { code: 403, msg: '反馈缺失 studentId，无法进行教师范围校验' };
    if (set.indexOf(feedbackStudentId) === -1) throw { code: 403, msg: '越权：该反馈不在你名下学生范围内' };
  }
}

/** 校验 msSec 合规红线：若被标记为违规，则绝对禁止发送外部大模型 */
function hitMsSecRedLine(fb) {
  if (!fb) return false;
  if (fb.msSecSkippedAi === true) return true;
  var labels = fb.msSecCheckLabelsHit;
  if (Array.isArray(labels) && labels.length > 0) {
    for (var i = 0; i < labels.length; i++) {
      if (labels[i] !== 'normal') return true;
    }
  }
  return false;
}

/** 拼接匿名 AI 请求内容（仅 imageFeedbacks 纯文字，严禁 PII） */
function buildAnonymizedStudentContent(fb) {
  var imgs = fb && fb.imageFeedbacks ? fb.imageFeedbacks : [];
  if (!Array.isArray(imgs)) imgs = [];
  var parts = [];
  for (var i = 0; i < imgs.length; i++) {
    var t = imgs[i] && typeof imgs[i].text === 'string' ? imgs[i].text : '';
    parts.push('【图片' + (i + 1) + '】' + t);
  }
  var joined = parts.join('\n\n');
  // 保险兜底：再次移除可能存在的任何 anonymousNo/班级号格式（不应存在于 imageFeedbacks.text）
  return joined;
}

/** few-shot 3 例 messages 构造 + 实际内容拼接。返回 messages[]；**严禁包含任何 PII** */
function buildFewShotMessages(studentText) {
  var sysPrompt = [
    '你是一名有 10 年经验的中文心理健康咨询师，针对学生自由文字进行多维度评估。',
    '返回严格 JSON（无 Markdown，无额外解释），5 维度分数 + warning_tags + summary，结构如下：',
    JSON.stringify({
      scores: { depression: 0, anxiety: 0, stress: 0, wellBeing: 0, resilience: 0 },
      warning_tags: [],
      summary: ''
    }),
    '规则：scores 5 维度必须是 0-10 的整数；warning_tags 只能从枚举中选择：',
    'self_harm_risk / severe_depression / suicide_ideation / trauma_signal / violence_risk / substance_abuse / eating_disorder / insomnia_severe / family_conflict / bullying_victim；',
    'summary 为 ≤200 字中文摘要，客观、不使用刺激性辞藻、不做诊断，提出可落地建议方向；',
    '除合法 JSON 之外不要输出任何字符，否则将被判定为错误并重试。'
  ].join(' ');

  // 例 1 轻度焦虑
  var ex1User = '最近两周总睡不着，考试前特别紧张，胸闷喘不上气，考不好就怕被爸妈骂。一想到学校就手心出汗，上课注意力也集中不了，这次模拟考掉了 30 名，我不敢跟家里说。每天躺在床上翻来覆去到两三点，白天又困得要死，我感觉自己一点用都没有。';
  var ex1Assistant = '{"scores":{"depression":4,"anxiety":7,"stress":8,"wellBeing":4,"resilience":5},"warning_tags":["insomnia_severe","family_conflict"],"summary":"学生表现出显著的考试焦虑与成绩压力，伴随失眠症状和家庭期望下的自我否定。建议教师先与其做低压力共情沟通，帮助拆分学习目标并肯定小步进步；同步与家长沟通减少批评式反馈，必要时转介学校心理老师做短期认知调整。"}';

  // 例 2 重度抑郁伴自伤意念
  var ex2User = '我感觉活下去一点意义都没有，上周我用小刀划了手腕两道，看着血流出来反而平静。爸妈只关心成绩，我考不好就说我丢人，同学也都不跟我玩，我在学校就像个透明人一样。有时候我站在楼上会想，跳下去是不是就都结束了，反正也没人会在意我。';
  var ex2Assistant = '{"scores":{"depression":9,"anxiety":8,"stress":9,"wellBeing":1,"resilience":2},"warning_tags":["severe_depression","self_harm_risk","suicide_ideation"],"summary":"学生呈现重度抑郁倾向并伴明确自伤行为与自杀意念，属最高等级预警。需立即转介专业精神科评估与紧急干预，不应在常规谈话中解决；教师第一时间通知家长并启动学校应急预案，确保其身边有人陪护，避免独处与接触尖锐/高处等危险场景。"}';

  // 例 3 创伤信号
  var ex3User = '我总是回想起上个月那件事，半夜惊醒大哭，不敢跟任何人说，他们说再提就揍我。现在一听到有人大声说话我就发抖，不敢去操场，远远看到他们几个人我就想跑。我爸妈以为我只是不想上学，骂我没出息。我不知道还能撑多久。';
  var ex3Assistant = '{"scores":{"depression":6,"anxiety":9,"stress":9,"wellBeing":2,"resilience":3},"warning_tags":["trauma_signal","violence_risk","bullying_victim"],"summary":"学生描述高度符合创伤后应激信号，伴明确的暴力威胁与校园霸凌受害特征。需在安全、私密、无压力环境下做创伤知情处理，避免追问细节造成二次伤害；教师应优先确认其人身安全并联合学校德育/心理部门介入霸凌事件，必要时同步儿童保护机构与家长。"}';

  var msgs = [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: ex1User },
    { role: 'assistant', content: ex1Assistant },
    { role: 'user', content: ex2User },
    { role: 'assistant', content: ex2Assistant },
    { role: 'user', content: ex3User },
    { role: 'assistant', content: ex3Assistant },
    { role: 'user', content: String(studentText || '') }
  ];
  return msgs;
}

/** 校验 AI 返回 JSON 结构合法性；合法返回解析对象，否则 throw */
function validateAIPayload(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('AI 返回非对象');
  if (!obj.scores || typeof obj.scores !== 'object') throw new Error('缺少 scores');
  for (var i = 0; i < SCORE_DIMS.length; i++) {
    var k = SCORE_DIMS[i];
    var v = obj.scores[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 10) {
      throw new Error('scores.' + k + ' 必须 0-10 整数，实际=' + JSON.stringify(v));
    }
  }
  if (!Array.isArray(obj.warning_tags)) throw new Error('warning_tags 非数组');
  for (var j = 0; j < obj.warning_tags.length; j++) {
    var tag = obj.warning_tags[j];
    if (ALLOWED_WARNING_TAGS.indexOf(tag) === -1) throw new Error('非法 warning_tag: ' + tag);
  }
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) throw new Error('summary 为空');
  // 设计文档限制 ≤200 字，实现宽松一点但不得超过 300（与 ⑧ 成功校验一致）
  if (obj.summary.length > 300) throw new Error('summary 过长: ' + obj.summary.length);
  return obj;
}

/** 粗略估算 token 数量（DashScope 兼容模式无 usage 时兜底）。中文 1 字≈1 token，英文按词切分 */
function estimateTokens(text) {
  if (!text) return 0;
  var s = String(text);
  // 中文字符数
  var cn = s.match(/[\u4e00-\u9fa5]/g);
  var cnCount = cn ? cn.length : 0;
  // 移除中文后的英文/数字部分按空白切
  var rest = s.replace(/[\u4e00-\u9fa5]/g, ' ').trim();
  var enCount = rest ? rest.split(/\s+/).filter(Boolean).length : 0;
  return cnCount + enCount;
}

/** 生成当月 key: YYYY-MM，用于预算聚合精确匹配 */
function getMonthKey(d) {
  var dt = d instanceof Date ? d : new Date();
  return dt.toISOString().slice(0, 7);
}

/**
 * 计算 AI 评分与教师 confirmedScores 的 5 维度平均分差（0-100 scale，原 0-10 放大 10 倍）。
 * 任一输入缺失 → 返回 null（避免误报）。
 */
function calcDivergence(aiScores, confirmedScores) {
  if (!aiScores || !confirmedScores) return null;
  var dims = ['depression', 'anxiety', 'stress', 'wellBeing', 'resilience'];
  var sum = 0, n = 0;
  for (var i = 0; i < dims.length; i++) {
    var a = Number(aiScores[dims[i]] || 0), c = Number(confirmedScores[dims[i]] || 0);
    if (isNaN(a)) a = 0;
    if (isNaN(c)) c = 0;
    sum += Math.abs(a - c) * 10; // 原 0-10 scale → ×10 转 0-100 scale 平均
    n++;
  }
  return n > 0 ? Math.round(sum / n * 10) / 10 : null;
}

/**
 * 统一写入 ai_quality_metrics 集合。
 * 核心字段全部带默认值兜底，禁止 null/undefined（除了 teacherAIDivergence 默认 null 是允许的语义）。
 * @param {Object} opts
 *   - feedbackId: string
 *   - anonymousNo: string (可空，默认 '')
 *   - success: boolean (必填)
 *   - latencyMs: number (失败默认 -1)
 *   - promptTokens: number (默认 0)
 *   - completionTokens: number (默认 0)
 *   - totalTokens: number (默认 0，通常 = prompt + completion)
 *   - modelName: string (默认 MODEL_NAME)
 *   - retryCount: number (默认 0)
 *   - teacherAIDivergence: number|null (默认 null)
 *   - msSecHitLabel: string (默认 'normal')
 *   - failureReason: string (默认 '')
 */
async function writeQualityMetric(opts) {
  opts = opts || {};
  var now = nowTs();
  var latencyMs = typeof opts.latencyMs === 'number' ? opts.latencyMs : -1;
  var success = opts.success === true;
  if (!success && (typeof opts.latencyMs !== 'number' || opts.latencyMs >= 0)) {
    latencyMs = -1; // 失败分支强兜底：latencyMs = -1
  }
  var promptTokens = typeof opts.promptTokens === 'number' ? opts.promptTokens : 0;
  var completionTokens = typeof opts.completionTokens === 'number' ? opts.completionTokens : 0;
  var totalTokens = typeof opts.totalTokens === 'number' ? opts.totalTokens : (promptTokens + completionTokens);
  var retryCount = typeof opts.retryCount === 'number' ? opts.retryCount : 0;
  var msSecHitLabel = typeof opts.msSecHitLabel === 'string' && opts.msSecHitLabel ? opts.msSecHitLabel : 'normal';
  var failureReason = typeof opts.failureReason === 'string' ? opts.failureReason : '';
  var divergence = opts.teacherAIDivergence === undefined ? null : opts.teacherAIDivergence;
  if (divergence !== null && typeof divergence !== 'number') divergence = null;
  var doc = {
    latencyMs: latencyMs,
    promptTokens: promptTokens,
    completionTokens: completionTokens,
    totalTokens: totalTokens,
    modelName: typeof opts.modelName === 'string' && opts.modelName ? opts.modelName : MODEL_NAME,
    success: success,
    retryCount: retryCount,
    teacherAIDivergence: divergence,
    msSecHitLabel: msSecHitLabel,
    failureReason: failureReason,
    feedbackId: opts.feedbackId || '',
    anonymousNo: typeof opts.anonymousNo === 'string' ? opts.anonymousNo : '',
    createdAt: now,
    monthKey: getMonthKey(new Date(now))
  };
  try {
    await db.collection(COLLECTIONS.ai_quality_metrics).add({ data: doc });
  } catch (e) {
    // metrics 写入失败绝不能阻断主流程：静默吞，避免无限失败循环
    // 在本地开发环境可加 console.warn 辅助排查；生产环境建议日志级别 warn
  }
  return doc;
}

/** 调 DashScope + 解析/校验。返回 { payload, latencyMs, promptTokens, completionTokens, totalTokens } */
async function runQwenOnce(studentText) {
  if (!process.env.DASHSCOPE_API_KEY) {
    // dashscopeClient.callQwen 也会判，但这里显式抛出 503 保持接口语义
    throw { code: 503, msg: 'AI API Key 未配置，请在云函数环境变量中设置 DASHSCOPE_API_KEY' };
  }
  var messages = buildFewShotMessages(studentText);
  var start = nowTs();
  var rawContent = null;
  try {
    rawContent = await callQwen({
      messages: messages,
      model: MODEL_NAME,
      temperature: 0,
      maxTokens: 1024
    });
  } catch (e) {
    // 透传：保留 code/msg
    throw e;
  }
  var latencyMs = Math.max(1, nowTs() - start);
  // 优先直接 parse，失败用 extractJSON 兜底去 ```json 包裹
  var parsed = null;
  try {
    if (typeof rawContent === 'string' && rawContent.trim().charAt(0) === '{') {
      parsed = JSON.parse(rawContent);
    }
  } catch (e1) { parsed = null; }
  if (!parsed) {
    parsed = extractJSON(rawContent || '');
  }
  var validated = validateAIPayload(parsed);
  // 估算 tokens：拆分 prompt (input) / completion (output)，兼容 sum total
  var inputText = messages.map(function (m) { return m.content || ''; }).join('\n');
  var inputTokens = estimateTokens(inputText);
  var outputTokens = estimateTokens(rawContent);
  return {
    payload: validated,
    latencyMs: latencyMs,
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

// -------------------- 核心：单次 runAnalyzeOnce（动作1/2/5 共用）--------------------
/**
 * 内部跑一次 AI（含动作1内部 4 次退避重试）
 * 返回：{ ok: true, aiAnalysis, tokens, latencyMs, attemptCount }
 * 失败：抛错（由外层决定是否写 retry_queue）
 */
async function runAnalyzeInternalFourAttempts(feedbackId, opts) {
  opts = opts || {};
  var feedbacks = db.collection(COLLECTIONS.feedbacks);
  var fbDoc = await feedbacks.doc(feedbackId).get();
  if (!fbDoc || !fbDoc.data) throw { code: 404, msg: '反馈不存在: ' + feedbackId };
  var fb = fbDoc.data;
  // 预提取字段：供 writeQualityMetric 使用（所有路径都可能用到）
  var fbAnonymousNo = typeof fb.anonymousNo === 'string' ? fb.anonymousNo : '';
  var fbMsLabels = Array.isArray(fb.msSecCheckLabelsHit) ? fb.msSecCheckLabelsHit.filter(Boolean) : [];
  var fbMsSecHitLabel = fbMsLabels.length > 0 ? fbMsLabels.join(',') : 'normal';

  // ③ 合规红线前置判断（msSecCheck 违规 → 永不发外部模型）
  if (hitMsSecRedLine(fb)) {
    await feedbacks.doc(feedbackId).update({
      data: {
        status: 'ai_failed_skipped_mssec',
        aiFailureReason: 'msSecCheck_label_not_normal',
        aiFinishedAt: nowTs()
      }
    });
    var redlineErr = {
      code: 451,
      msg: 'msSecCheck 标记为违规内容，按合规要求不得发送外部模型；请教师人工评估原文',
      skipRetry: true
    };
    throw redlineErr;
  }

  // ④ 拼接匿名 content（纯 imageFeedbacks.text，不含 studentId/teacherId/anonymousNo 等 PII）
  var content = buildAnonymizedStudentContent(fb);
  if (!content.trim()) {
    throw { code: 422, msg: '无可分析的文字内容（imageFeedbacks 全空）', skipRetry: true };
  }

  // ⑦ 动作1 内部 4 次指数退避重试（attemptIdx=1..4；对应 delays 0/5s/10s/20s ±25% jitter）
  var lastErr = null;
  var result = null;
  var attemptUsed = 0;
  for (var attemptIdx = 1; attemptIdx <= 4; attemptIdx++) {
    attemptUsed = attemptIdx;
    var baseDelay = INTERNAL_DELAYS_BY_ATTEMPT[attemptIdx - 1] || 0;
    var delay = calcDelay(baseDelay);
    if (delay > 0) await sleep(delay);
    try {
      result = await runQwenOnce(content);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      // 451/422 等明确不可重试 → 直接 break，不再试
      if (err && (err.code === 451 || err.code === 422 || err.skipRetry === true)) break;
      // 503：未配置 API Key → 也不重试
      if (err && err.code === 503) break;
    }
  }

  if (lastErr) {
    // 把尝试次数挂到 err 上，供外层写 metrics/retry_queue 参考
    lastErr.attemptCount = attemptUsed;
    throw lastErr;
  }

  // ⑨~⑪ 三写：feedbacks + anonymized_records + ai_quality_metrics（统一 writeQualityMetric）
  var now = nowTs();
  var payload = result.payload;
  var tokens = result.totalTokens;
  var lat = result.latencyMs;
  var promptTk = typeof result.promptTokens === 'number' ? result.promptTokens : 0;
  var completionTk = typeof result.completionTokens === 'number' ? result.completionTokens : 0;

  // ⑨ feedbacks 更新（把 reviewer 子状态也同步为待教师复核）
  var fUpdate = {
    aiAnalysis: payload,
    aiTokensUsed: tokens,
    aiLatencyMs: lat,
    aiAttemptCount: attemptUsed,
    aiModel: MODEL_NAME,
    aiFinishedAt: now,
    status: 'pending_review'
  };
  await feedbacks.doc(feedbackId).update({
    data: Object.assign({}, fUpdate, {
      'teacherReview.reviewStatus': 'pending_review'
    })
  });

  // ⑩ anonymized_records 同步 AI 结果
  try {
    var anonCol = db.collection(COLLECTIONS.anonymized_records);
    var arRes = await anonCol.where({ relatedFeedbackId: feedbackId }).limit(1).get();
    if (arRes && arRes.data && arRes.data.length > 0) {
      await anonCol.doc(arRes.data[0]._id).update({ data: { aiAnalysis: payload, aiAnalyzedAt: now } });
    }
  } catch (eAnon) {
    // 匿名记录同步失败也视为整体失败（进入重试），避免科研数据与主数据不一致
    throw { code: 500, msg: 'anonymized_records 同步失败: ' + (eAnon.message || eAnon.msg || ''), inner: eAnon, attemptCount: attemptUsed };
  }

  // ⑪ ai_quality_metrics 打点（统一函数：静默吞写入错误，不阻断主流程）
  //   - 若 feedback.teacherReview.confirmedScores 已存在（例如重做场景下已有教师审核），计算 divergence
  //   - 否则 divergence = null，避免误报
  var divergence = null;
  try {
    var latestFbDoc = await feedbacks.doc(feedbackId).get();
    var latestFb = latestFbDoc && latestFbDoc.data ? latestFbDoc.data : null;
    var confirmedScores = latestFb && latestFb.teacherReview && latestFb.teacherReview.confirmedScores
      ? latestFb.teacherReview.confirmedScores
      : null;
    if (confirmedScores && payload && payload.scores) {
      divergence = calcDivergence(payload.scores, confirmedScores);
    }
  } catch (eDiv) {
    divergence = null; // 查询失败时安全兜底 = null
  }
  await writeQualityMetric({
    feedbackId: feedbackId,
    anonymousNo: fbAnonymousNo,
    success: true,
    latencyMs: lat,
    promptTokens: promptTk,
    completionTokens: completionTk,
    totalTokens: tokens,
    modelName: MODEL_NAME,
    retryCount: attemptUsed - 1, // attemptUsed(1-based) - 1 → 实际重试次数（0 表示首试成功）
    teacherAIDivergence: divergence,
    msSecHitLabel: fbMsSecHitLabel,
    failureReason: ''
  });

  return {
    ok: true,
    aiAnalysis: payload,
    tokens: tokens,
    latencyMs: lat,
    attemptCount: attemptUsed
  };
}

/** retry_queue: 入队一条。attempt 从 0 开始，status='pending' */
async function enqueueRetry(feedbackId, reason, initialDelayMs) {
  var now = nowTs();
  initialDelayMs = typeof initialDelayMs === 'number' ? initialDelayMs : 0;
  var doc = {
    feedbackId: feedbackId,
    attempt: 0,
    status: 'pending',
    reason: reason || '',
    nextRetryAt: now + initialDelayMs,
    createdAt: now,
    updatedAt: now
  };
  await db.collection(COLLECTIONS.retry_queue).add({ data: doc });
  return doc;
}

/** retry_queue: 根据 attempt 决定下一次延迟；attempt(在队列)∈[1,4] 对应 5s/10s/20s/60s ±25% */
function calcNextExternalDelay(queueAttempt) {
  var idx = Math.min(Math.max(queueAttempt, 1), 4) - 1;
  return calcDelay(EXTERNAL_DELAYS_BY_ATTEMPT[idx] || 60000);
}

// -------------------- 7 个动作实现 --------------------

/** 动作1：analyzeOne */
async function actionAnalyzeOne(ctx, params, auth) {
  params = params || {};
  var feedbackId = params.feedbackId;
  if (!feedbackId) return fail(400, '缺少参数 feedbackId');

  var feedbacks = db.collection(COLLECTIONS.feedbacks);
  var fbDoc = null;
  try {
    fbDoc = await feedbacks.doc(feedbackId).get();
  } catch (e) { return fail(404, '反馈不存在: ' + feedbackId); }
  if (!fbDoc || !fbDoc.data) return fail(404, '反馈不存在: ' + feedbackId);
  var fb = fbDoc.data;

  // 范围校验（teacher 需要该 feedback 的 studentId 在本人白名单）
  assertTeacherScope(auth, fb.studentId);

  // 已经做完 AI 且进入 review 终态 → 跳过
  if (fb.status && FINAL_STATUSES_ALREADY_ANALYZED.indexOf(fb.status) !== -1 && fb.aiAnalysis) {
    return ok({ skipped: true, reason: 'already_analyzed', feedbackId: feedbackId });
  }

  // 预取 msSec / anonymousNo 字段（供失败分支 metrics 写入；成功分支由 runAnalyzeInternalFourAttempts 内部写）
  var fbNoForMetric = typeof fb.anonymousNo === 'string' ? fb.anonymousNo : '';
  var fbLabels = Array.isArray(fb.msSecCheckLabelsHit) ? fb.msSecCheckLabelsHit.filter(Boolean) : [];
  var fbHitLabel = fbLabels.length > 0 ? fbLabels.join(',') : 'normal';

  try {
    var res = await runAnalyzeInternalFourAttempts(feedbackId);
    return ok({
      feedbackId: feedbackId,
      aiAnalysis: res.aiAnalysis,
      tokens: res.tokens,
      latencyMs: res.latencyMs,
      attemptCount: res.attemptCount,
      model: MODEL_NAME
    });
  } catch (err) {
    var code = err && err.code ? err.code : 502;
    var msg = err && err.msg ? err.msg : (err.message || String(err));
    var attemptCnt = err && typeof err.attemptCount === 'number' ? err.attemptCount : 0;
    var retryCnt = Math.max(0, attemptCnt); // 内部 attemptUsed(1-based) 作兜底
    var failReason = msg || (code === 451 ? 'mssec_redline' : code === 422 ? 'empty_content' : code === 503 ? 'no_api_key' : 'unknown');
    // 失败分支统一写 ai_quality_metrics（latencyMs=-1, totalTokens=0 默认兜底）
    await writeQualityMetric({
      feedbackId: feedbackId,
      anonymousNo: fbNoForMetric,
      success: false,
      latencyMs: -1,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelName: MODEL_NAME,
      retryCount: retryCnt,
      teacherAIDivergence: null,
      msSecHitLabel: fbHitLabel,
      failureReason: failReason
    });
    // 451 msSec 红线 或 422 无内容 或 503 未配置 Key → 直接返回，不入 retry_queue
    if (code === 451 || code === 422 || code === 503) {
      return fail(code, msg, { feedbackId: feedbackId });
    }
    // 其它错误（4 次内部重试全失败）→ 写 retry_queue 给动作2 扫
    try {
      await enqueueRetry(feedbackId, 'aiAnalyze.analyzeOne failed: ' + msg + ' code=' + code, 0);
    } catch (eq) {
      // 入队失败也不掩盖主错误
      msg = msg + '；且写入 retry_queue 失败: ' + (eq.message || eq.msg || '');
    }
    return fail(502, 'AI分析 4 次失败，已入重试队列', { feedbackId: feedbackId, originCode: code, originMsg: msg });
  }
}

/** 动作2：runRetryQueue — 批扫 retry_queue 外部 4 次层级 */
async function actionRunRetryQueue(ctx, params, auth) {
  params = params || {};
  var limit = typeof params.limit === 'number' ? params.limit : 20;
  if (limit <= 0) limit = 20;
  if (limit > 100) limit = 100;

  var now = nowTs();
  var rq = db.collection(COLLECTIONS.retry_queue);
  // status='pending' OR (status='failed' AND nextRetryAt <= now)
  var whereCond = _.or([
    { status: 'pending' },
    _.and([{ status: 'failed' }, { nextRetryAt: _.lte(now) }])
  ]);
  var rows = await rq.where(whereCond).orderBy('createdAt', 'asc').limit(limit).get();
  rows = rows && rows.data ? rows.data : [];

  var stats = { processed: rows.length, succeeded: 0, failedStillQueued: 0, dead: 0 };
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var qid = r._id;
    var fbId = r.feedbackId;
    var nextAttempt = (r.attempt || 0) + 1;
    try {
      await runAnalyzeInternalFourAttempts(fbId);
      // 成功 → remove 该重试条目（成功分支 runAnalyzeInternalFourAttempts 内部已写 metrics，无需重复）
      try { await rq.doc(qid).remove(); } catch (erm) { /* 不阻止其他条目 */ }
      stats.succeeded++;
    } catch (err) {
      var msg = (err && err.msg) || (err && err.message) || String(err);
      var code = err && err.code ? err.code : 0;
      var attemptCnt = err && typeof err.attemptCount === 'number' ? err.attemptCount : 0;
      // 重试场景：retryCount = 内部 attemptUsed(1-based) + 外部 queue 已尝试次数（r.attempt）
      var retryCnt = Math.max(0, attemptCnt) + (typeof r.attempt === 'number' ? r.attempt : 0);
      var failReason = msg || ('code=' + code || 'retry_queue_failed');
      // runRetryQueue 每次重跑失败 → 写失败指标（latencyMs=-1 默认兜底）
      await writeQualityMetric({
        feedbackId: fbId,
        anonymousNo: '',
        success: false,
        latencyMs: -1,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        modelName: MODEL_NAME,
        retryCount: retryCnt,
        teacherAIDivergence: null,
        msSecHitLabel: 'normal',
        failureReason: 'retry_queue[' + nextAttempt + ']: ' + failReason
      });
      if (code === 451 || code === 422 || code === 404 || code === 503) {
        // 明确不可恢复 → 标记 dead（但 451 已在内部改写 feedbacks status，不会再发外部模型）
        try {
          await rq.doc(qid).update({
            data: { status: 'dead', attempt: nextAttempt, updatedAt: nowTs(), lastError: msg, lastErrorCode: code }
          });
        } catch (eu) {}
        stats.dead++;
        continue;
      }
      if (nextAttempt >= 4) {
        // 队列外部层级也已用掉 4 次（attempt=4）→ dead 死信
        try {
          await rq.doc(qid).update({
            data: { status: 'dead', attempt: nextAttempt, updatedAt: nowTs(), lastError: msg, lastErrorCode: code }
          });
        } catch (eu) {}
        stats.dead++;
        continue;
      }
      var delay = calcNextExternalDelay(nextAttempt);
      try {
        await rq.doc(qid).update({
          data: {
            status: 'failed',
            attempt: nextAttempt,
            nextRetryAt: nowTs() + delay,
            updatedAt: nowTs(),
            lastError: msg,
            lastErrorCode: code
          }
        });
      } catch (eu) {}
      stats.failedStillQueued++;
    }
  }
  return ok(stats);
}

/** 动作3：pushToRetryQueue */
async function actionPushToRetryQueue(ctx, params, auth) {
  params = params || {};
  var feedbackId = params.feedbackId;
  if (!feedbackId) return fail(400, '缺少参数 feedbackId');
  var initialDelay = typeof params.initialDelay === 'number' ? params.initialDelay : 0;
  if (initialDelay < 0) initialDelay = 0;
  // 范围校验
  var fbDoc = null;
  try { fbDoc = await db.collection(COLLECTIONS.feedbacks).doc(feedbackId).get(); } catch (e) {}
  if (fbDoc && fbDoc.data) {
    assertTeacherScope(auth, fbDoc.data.studentId);
  }
  try {
    await enqueueRetry(feedbackId, params.reason || 'manual_push', initialDelay);
  } catch (eq) {
    // pushToRetryQueue 入队失败 → 写失败指标（latencyMs=-1）
    var reason = (eq && eq.msg) || (eq && eq.message) || String(eq || 'enqueue_failed');
    await writeQualityMetric({
      feedbackId: feedbackId,
      anonymousNo: '',
      success: false,
      latencyMs: -1,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelName: MODEL_NAME,
      retryCount: 0,
      teacherAIDivergence: null,
      msSecHitLabel: 'normal',
      failureReason: 'pushToRetryQueue failed: ' + reason
    });
    return fail(500, 'pushToRetryQueue 入队失败: ' + reason, { feedbackId: feedbackId });
  }
  return ok({ feedbackId: feedbackId, initialDelayMs: initialDelay, enqueued: true });
}

/** 动作4：getQueueStats */
async function actionGetQueueStats(ctx, params, auth) {
  var rq = db.collection(COLLECTIONS.retry_queue);
  var aqm = db.collection(COLLECTIONS.ai_quality_metrics);
  var [pending, failedInQueue, dead, suc7Res] = await Promise.all([
    rq.where({ status: 'pending' }).count(),
    rq.where({ status: 'failed' }).count(),
    rq.where({ status: 'dead' }).count(),
    aqm.where({ success: true, createdAt: _.gte(nowTs() - 7 * 24 * 3600 * 1000) }).count()
  ]);
  return ok({
    pending: pending && typeof pending.total === 'number' ? pending.total : 0,
    failedInQueue: failedInQueue && typeof failedInQueue.total === 'number' ? failedInQueue.total : 0,
    dead: dead && typeof dead.total === 'number' ? dead.total : 0,
    succeededLast7Days: suc7Res && typeof suc7Res.total === 'number' ? suc7Res.total : 0
  });
}

/** 动作5：manualRerun — 清旧 aiAnalysis → 跑 4 次内退避（仍失败不入 retry_queue，直接返回失败让老师看） */
async function actionManualRerun(ctx, params, auth) {
  params = params || {};
  var feedbackId = params.feedbackId;
  if (!feedbackId) return fail(400, '缺少参数 feedbackId');
  var feedbacks = db.collection(COLLECTIONS.feedbacks);
  var fbDoc = null;
  try { fbDoc = await feedbacks.doc(feedbackId).get(); } catch (e) { return fail(404, '反馈不存在'); }
  if (!fbDoc || !fbDoc.data) return fail(404, '反馈不存在');
  var fb = fbDoc.data;
  assertTeacherScope(auth, fb.studentId);

  // 预取 msSec / anonymousNo 供失败分支写入
  var mrNo = typeof fb.anonymousNo === 'string' ? fb.anonymousNo : '';
  var mrLabels = Array.isArray(fb.msSecCheckLabelsHit) ? fb.msSecCheckLabelsHit.filter(Boolean) : [];
  var mrHitLabel = mrLabels.length > 0 ? mrLabels.join(',') : 'normal';

  // 清旧 aiAnalysis / 旧失败标记，不改变 review 结果（如已人工审核，保留 reviewStatus 原样也可；这里回归到 pending_review）
  await feedbacks.doc(feedbackId).update({
    data: {
      aiAnalysis: _.remove(),
      aiTokensUsed: _.remove(),
      aiLatencyMs: _.remove(),
      aiAttemptCount: _.remove(),
      aiModel: _.remove(),
      aiFinishedAt: _.remove(),
      aiFailureReason: _.remove(),
      status: 'pending_review',
      'teacherReview.reviewStatus': 'pending_review'
    }
  });
  try {
    var res = await runAnalyzeInternalFourAttempts(feedbackId);
    return ok({ reran: true, feedbackId: feedbackId, attemptCount: res.attemptCount });
  } catch (err) {
    var code = err && err.code ? err.code : 502;
    var msg = err && err.msg ? err.msg : (err.message || String(err));
    var attemptCnt = err && typeof err.attemptCount === 'number' ? err.attemptCount : 0;
    // manualRerun 完成（失败）→ 写失败指标
    await writeQualityMetric({
      feedbackId: feedbackId,
      anonymousNo: mrNo,
      success: false,
      latencyMs: -1,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelName: MODEL_NAME,
      retryCount: Math.max(0, attemptCnt),
      teacherAIDivergence: null,
      msSecHitLabel: mrHitLabel,
      failureReason: 'manualRerun: ' + (msg || 'unknown')
    });
    return fail(code, 'manualRerun 失败: ' + msg, { feedbackId: feedbackId });
  }
}

/** 动作6：getModelPricingInfo — 管理员预算告警参考 + 7 日累计消耗 */
async function actionGetModelPricingInfo(ctx, params, auth) {
  // 身份校验：admin
  if (!auth.isInternal && (!auth.user || auth.user.role !== 'admin')) {
    return fail(403, '仅管理员可查询定价与消耗');
  }
  var price = PRICING.qwen_plus;
  // 最近 7 日 tokens
  var since = nowTs() - 7 * 24 * 3600 * 1000;
  var aqm = db.collection(COLLECTIONS.ai_quality_metrics);
  var rowsRes = await aqm.where({ createdAt: _.gte(since) }).field({ tokens: true }).limit(10000).get();
  var rows = rowsRes && rowsRes.data ? rowsRes.data : [];
  var totalTokens = 0;
  for (var i = 0; i < rows.length; i++) {
    if (typeof rows[i].tokens === 'number') totalTokens += rows[i].tokens;
  }
  // 简化：按 70% input / 30% output 拆分估算；如需严格可在后续单独记录 input/output tokens
  var estInput = Math.floor(totalTokens * 0.7);
  var estOutput = totalTokens - estInput;
  var costYuan = (estInput / 1000) * price.input_tokens_per_1k + (estOutput / 1000) * price.output_tokens_per_1k;
  return ok({
    model: MODEL_NAME,
    pricing: {
      input_tokens_per_1k_yuan: price.input_tokens_per_1k,
      output_tokens_per_1k_yuan: price.output_tokens_per_1k,
      currency: price.currency,
      note: '参考价，具体以阿里云 DashScope 官方账单为准'
    },
    last7Days: {
      calls: rows.length,
      totalTokensEstimated: totalTokens,
      estimatedInputTokens: estInput,
      estimatedOutputTokens: estOutput,
      estimatedCostYuan: Number(costYuan.toFixed(4))
    }
  });
}

/** 动作7：getBudgetStatus — 当月 token 累计用量 + 三档告警阈值（normal/warning/critical） */
async function actionGetBudgetStatus(ctx, params, auth) {
  // ① 常量（模块级已定义：MONTHLY_TOKEN_BUDGET / WARN_THRESHOLD_PCT / CRIT_THRESHOLD_PCT）
  var monthlyBudget = MONTHLY_TOKEN_BUDGET;
  var monthKey = getMonthKey(); // 当前月 YYYY-MM

  // ② 聚合：当月 ai_quality_metrics → totalTokensUsed / callCount / failedCount
  var aqm = db.collection(COLLECTIONS.ai_quality_metrics);
  var aggRes = null;
  try {
    aggRes = await aqm
      .aggregate()
      .match({ monthKey: monthKey })
      .group({
        _id: null,
        totalTokensUsed: cmd.aggregate.sum('$totalTokens'),
        callCount: cmd.aggregate.sum(1),
        failedCount: cmd.aggregate.cond([{ $eq: ['$success', false] }, 1, 0])
      })
      .end();
  } catch (eAgg) {
    aggRes = null;
  }
  var list = aggRes && Array.isArray(aggRes.list) ? aggRes.list : [];
  var row = list.length > 0 ? list[0] : {};
  var totalTokensUsed = typeof row.totalTokensUsed === 'number' ? row.totalTokensUsed : 0;
  var callCount = typeof row.callCount === 'number' ? row.callCount : 0;
  var failedCount = typeof row.failedCount === 'number' ? row.failedCount : 0;

  // ③ 指标派生：usedPct / status / tokenLeft / successRate
  var usedPct = monthlyBudget > 0 ? (totalTokensUsed / monthlyBudget) : 0;
  var status = 'normal';
  if (usedPct >= CRIT_THRESHOLD_PCT) {
    status = 'critical';
  } else if (usedPct >= WARN_THRESHOLD_PCT) {
    status = 'warning';
  }
  var tokenLeft = Math.max(0, monthlyBudget - totalTokensUsed);
  var successRate = 0;
  if (callCount > 0) {
    successRate = Math.round((callCount - failedCount) / callCount * 1000) / 10; // 保留 1 位小数 (%)
  }

  // ④ 返回：与 Task15 audit-ai Dashboard 7 字段对齐
  return ok({
    monthKey: monthKey,
    monthlyBudget: monthlyBudget,
    totalTokensUsed: totalTokensUsed,
    usedPct: usedPct,
    status: status,
    tokenLeft: tokenLeft,
    callCount: callCount,
    failedCount: failedCount,
    successRate: successRate,
    thresholds: {
      warningPct: WARN_THRESHOLD_PCT * 100,
      criticalPct: CRIT_THRESHOLD_PCT * 100
    }
  });
}

// -------------------- 入口 dispatch --------------------
exports.main = async function (event, context) {
  event = event || {};
  var action = event.action;
  var params = event.params || {};
  var wxContext = null;
  try { wxContext = cloud.getWXContext ? cloud.getWXContext() : {}; } catch (e) { wxContext = {}; }
  var ctx = { OPENID: wxContext && wxContext.OPENID ? wxContext.OPENID : null };

  try {
    switch (action) {
      case 'analyzeOne': {
        var auth1 = await authAndScopeCheck(ctx, ['teacher', 'admin', 'cloudservice'], { allowInternalService: true, requireTeacherApproved: true, requireScope: true });
        return await actionAnalyzeOne(ctx, params, auth1);
      }
      case 'runRetryQueue': {
        var auth2 = await authAndScopeCheck(ctx, ['admin', 'cloudservice'], { allowInternalService: true, requireTeacherApproved: true, requireScope: false });
        return await actionRunRetryQueue(ctx, params, auth2);
      }
      case 'pushToRetryQueue': {
        var auth3 = await authAndScopeCheck(ctx, ['teacher', 'admin', 'cloudservice'], { allowInternalService: true, requireTeacherApproved: true, requireScope: true });
        return await actionPushToRetryQueue(ctx, params, auth3);
      }
      case 'getQueueStats': {
        var auth4 = await authAndScopeCheck(ctx, ['teacher', 'admin'], { allowInternalService: false, requireTeacherApproved: true, requireScope: false });
        return await actionGetQueueStats(ctx, params, auth4);
      }
      case 'manualRerun': {
        var auth5 = await authAndScopeCheck(ctx, ['teacher', 'admin'], { allowInternalService: false, requireTeacherApproved: true, requireScope: true });
        return await actionManualRerun(ctx, params, auth5);
      }
      case 'getModelPricingInfo': {
        var auth6 = await authAndScopeCheck(ctx, ['admin', 'cloudservice'], { allowInternalService: true, requireTeacherApproved: true, requireScope: false });
        return await actionGetModelPricingInfo(ctx, params, auth6);
      }
      case 'getBudgetStatus': {
        var auth7 = await authAndScopeCheck(ctx, ['teacher', 'admin'], { allowInternalService: false, requireTeacherApproved: true, requireScope: false });
        return await actionGetBudgetStatus(ctx, params, auth7);
      }
      default: {
        return fail(400, '未知 action: ' + action + '，合法值：analyzeOne / runRetryQueue / pushToRetryQueue / getQueueStats / manualRerun / getModelPricingInfo / getBudgetStatus');
      }
    }
  } catch (err) {
    var code = err && err.code ? err.code : 500;
    var msg = err && err.msg ? err.msg : (err && err.message ? err.message : String(err));
    return fail(code, msg);
  }
};
