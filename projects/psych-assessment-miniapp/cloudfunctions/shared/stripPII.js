// cloudfunctions/shared/stripPII.js
/**
 * 字段级 PII 剥离。两模式：
 * - forSelf=true  → 返回用户自己可看的信息（保留真姓名昵称等）
 * - forSelf=false → 返回给其他教师端/学生端看的匿名结果（仅白名单字段）
 *
 * 规则统一放此处，保证所有出口一致。
 */
function stripUserPII(user, opts) {
  opts = opts || {};
  var forSelf = opts.forSelf === true;
  var includeTeacherStatus = opts.includeTeacherStatus === true;
  if (!user) return null;
  if (forSelf) {
    var out = {};
    Object.keys(user).forEach(function (k) { out[k] = user[k]; });
    delete out.openid;
    if (out.teacherInfo && out.teacherInfo.teacherCertNo) delete out.teacherInfo.teacherCertNo;
    if (!includeTeacherStatus) delete out.teacherStatus;
    return out;
  }
  // 匿名：只返 anonymousNo + role + 年级哈希 + avatar 用 anon-avatar
  var grade = user.studentInfo && user.studentInfo.grade ? user.studentInfo.grade : null;
  return {
    _id: user._id,
    role: user.role,
    anonymousNo: user.anonymousNo,
    gradeHash: grade ? hashGrade(grade) : null
  };
}

/** 学生反馈 teacherReview 剥离：教师私有备注非本人不得见；真实teacherId 换成 #Txxx（如果存在匿名号） */
function stripFeedbackReviewForList(review, viewerTeacherId) {
  if (!review) return null;
  var out = {};
  Object.keys(review).forEach(function (k) { out[k] = review[k]; });
  var realTeacherId = review.reviewedByTeacherId;
  delete out.reviewedByTeacherId;
  if (viewerTeacherId && viewerTeacherId !== realTeacherId) delete out.teacherNote;
  return out;
}

/** anonymized_records 输出白名单（科研导出的最最终兜底） */
var RESEARCH_OUTPUT_WHITELIST = {
  anonymized_feedbacks: ['anonymousNo','content','aiAnalysis','imageType','submitTime','taskHash','batchId'],
  status_snapshots: ['anonymousNo','tagIds','tagNamesSnapshot','reason','relatedFeedbackIds','validFrom','validUntil','createTime']
};

function applyResearchWhitelist(rows, type) {
  var wl = RESEARCH_OUTPUT_WHITELIST[type];
  if (!wl) return [];
  return (rows || []).map(function (r) {
    var o = {};
    wl.forEach(function (k) { if (k in r) o[k] = r[k]; });
    return o;
  });
}

/** 年级模糊：高2026级1班 → 2026_*；初二(3)班 → J2_* */
function hashGrade(grade) {
  if (!grade) return '*';
  var g = String(grade);
  var m1 = /高?(\d{4})级?/.exec(g);
  if (m1) return m1[1] + '_*';
  var m2 = /小?([初1-3三一二])/.exec(g);
  var map = { '1': 'J1', '一': 'J1', '2': 'J2', '二': 'J2', '3': 'J3', '三': 'J3' };
  if (m2 && map[m2[1]]) return map[m2[1]] + '_*';
  return '*';
}

module.exports = {
  stripUserPII: stripUserPII,
  stripFeedbackReviewForList: stripFeedbackReviewForList,
  applyResearchWhitelist: applyResearchWhitelist,
  RESEARCH_OUTPUT_WHITELIST: RESEARCH_OUTPUT_WHITELIST,
  hashGrade: hashGrade
};
