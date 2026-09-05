// utils/anonymize.js 最小空壳（后续 Task 细化）
function makeAnonymousNo(role) {
  if (role === 'student') return '#S000000';
  if (role === 'teacher') return '#T000';
  return '#A00';
}
function sha1TaskHash(s) {
  return 'hash_' + String(s == null ? '' : s).slice(0, 8);
}
module.exports = { makeAnonymousNo: makeAnonymousNo, sha1TaskHash: sha1TaskHash };
