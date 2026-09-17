// =============================================================
// Shared CSV 工具：供 statusOperate.exportSnapshotsAuditCSV(Task9动作8)
// 与 taskOperate.researchExport(T11动作5) 两处兄弟通路复用替代各自复制算法
// =============================================================
function csvCell(value) {
  // 与现两处各自的 csvCell 转义逐字节等价：
  // - null/undefined → ''
  // - 类型为 object/数组 → JSON.stringify()
  // - 字符串中若含 , 或 " 或 \n 或 \r → 包 "..."，内嵌 " 替换为 ""
  // - 其余 → String(value) 返回
  var t = typeof value;
  if (value === null || value === undefined) return '';
  if (t === 'object') {
    try { value = JSON.stringify(value); } catch (e) { value = '[object Object]'; }
    t = 'string';
  }
  var s = String(value);
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// buildCSVLines(headers, rows) → 行数组 [headerLine, row1, row2, ...]
function buildCSVLines(headers, rows) {
  rows = rows || [];
  var lines = [headers.map(csvCell).join(',')];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    var rowArr = [];
    for (var j = 0; j < headers.length; j++) rowArr.push(csvCell(r[headers[j]]));
    lines.push(rowArr.join(','));
  }
  return lines;
}

module.exports = { csvCell: csvCell, buildCSVLines: buildCSVLines };
