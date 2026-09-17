// cloudfunctions/shared/responseWrapper.js
function ok(data) {
  if (typeof data === 'undefined') data = {};
  return { code: 0, data: data, msg: 'ok' };
}
function fail(code, msg, extra) {
  extra = extra || {};
  var out = { code: code, msg: msg };
  Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}
module.exports = { ok: ok, fail: fail };
