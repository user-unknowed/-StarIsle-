// utils/csv.js 最小空壳
function toCSVRow(arr) {
  return (arr || []).map(function (v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }).join(',');
}
module.exports = { toCSVRow: toCSVRow };
