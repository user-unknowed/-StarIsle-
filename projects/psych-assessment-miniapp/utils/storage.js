// utils/storage.js
function setSafe(key, value) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) { wx.setStorageSync(key, value); return true; }
    return false;
  } catch (e) { return false; }
}
function getSafe(key, fallback) {
  if (typeof fallback === 'undefined') fallback = null;
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      var v = wx.getStorageSync(key);
      return v === '' || v === undefined ? fallback : v;
    }
    return fallback;
  } catch (e) { return fallback; }
}
function removeSafe(key) {
  try {
    if (typeof wx !== 'undefined' && wx.removeStorageSync) { wx.removeStorageSync(key); return true; }
    return false;
  } catch (e) { return false; }
}

/** iOS 加密备份：base64 编码 */
function encodeBackup(obj) {
  var b64 = require('./_b64.js');
  return b64.btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function decodeBackup(str) {
  var b64 = require('./_b64.js');
  try { return JSON.parse(decodeURIComponent(escape(b64.atob(str)))); } catch (e) { return null; }
}
function setSessionDual(session) {
  setSafe('session', session);
  setSafe('_secure_session_', { v: encodeBackup(session), _s: Date.now() });
}
function getSessionDual() {
  var s = getSafe('session');
  if (s && s._savedAt) return s;
  var b = getSafe('_secure_session_');
  if (b && b.v) {
    var r = decodeBackup(b.v);
    if (r) return r;
  }
  return null;
}
function clearSessionDual() {
  removeSafe('session');
  removeSafe('_secure_session_');
}

/** 断点续传：cacheClear 已上传批次 index 记 */
function markBatchUploaded(batchId, idx) { return setSafe('upl_' + batchId + '_' + idx, true); }
function isBatchUploaded(batchId, idx) { return !!getSafe('upl_' + batchId + '_' + idx, false); }
function clearBatchMarks(batchId) {
  var all = [];
  try {
    if (typeof wx !== 'undefined' && wx.getStorageInfoSync) all = wx.getStorageInfoSync().keys || [];
  } catch (e) { all = []; }
  var prefix = 'upl_' + batchId + '_';
  all.filter(function (k) { return k.indexOf(prefix) === 0; }).forEach(function (k) { removeSafe(k); });
}

/** 草稿 */
function saveTaskDraft(taskId, data) {
  var payload = {};
  if (data) Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
  payload._savedAt = Date.now();
  return setSafe('draft_' + taskId, payload);
}
function getTaskDraft(taskId) { return getSafe('draft_' + taskId); }
function clearTaskDraft(taskId) { return removeSafe('draft_' + taskId); }

module.exports = {
  setSafe: setSafe, getSafe: getSafe, removeSafe: removeSafe,
  setSessionDual: setSessionDual, getSessionDual: getSessionDual, clearSessionDual: clearSessionDual,
  markBatchUploaded: markBatchUploaded, isBatchUploaded: isBatchUploaded, clearBatchMarks: clearBatchMarks,
  saveTaskDraft: saveTaskDraft, getTaskDraft: getTaskDraft, clearTaskDraft: clearTaskDraft
};
