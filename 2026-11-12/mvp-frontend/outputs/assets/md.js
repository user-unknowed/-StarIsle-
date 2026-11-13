/* 星屿 StarIsle · 自实现 Markdown 渲染器
   零第三方依赖，只暴露 window.SIMD = { render, inline, escape }。
   沿用 ima 复刻版已验证的实现，保留以下修复：
   1) 表格单元格只把「原始文本」交给 inline() 一次，避免双重解析。
   2) 代码块、引用、分隔线、链接、删除线都有独立分支；未闭合围栏消费到末尾不报错。
   3) mermaid / markmap / 公式等能力降级为带说明的源码块，而不是抛错或留空白。
   占位符用 \u0000 包裹，escape() 不会产生该字符，因此不会被正文误伤。 */

(function () {
  'use strict';

  var PH = '\u0000';

  function escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 只放行安全协议，避免 javascript: / data: 之类的链接被点开 */
  function safeUrl(u) {
    var t = String(u || '').trim();
    if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
    if (/^(#|\/|\.\/|\.\.\/)/.test(t)) return t;
    return '';
  }

  function emph(s) {
    return s
      .replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^\n]+?)__/g, '<strong>$1</strong>')
      .replace(/~~([^\n]+?)~~/g, '<del>$1</del>')
      .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^_\w])_([^_\n]+?)_(?![_\w])/g, '$1<em>$2</em>');
  }

  /* 行内解析：escape -> 行内 code -> 图片降级 -> 链接 -> 强调 -> 还原占位 -> 换行 */
  function inline(raw) {
    if (raw == null) return '';
    var store = [];
    function keep(html) {
      store.push(html);
      return PH + (store.length - 1) + PH;
    }

    var s = escape(String(raw));

    // 1) 行内代码：内容不再参与后续解析
    s = s.replace(/`([^`\n]+)`/g, function (_, code) {
      return keep('<code>' + code + '</code>');
    });

    // 2) 图片：不做远程抓取，降级成文字标记
    s = s.replace(/!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))*)(?:\s+&quot;[^&]*&quot;)?\)/g, function (_, alt, url) {
      var label = alt ? '图片：' + alt : '图片';
      var safe = safeUrl(url.replace(/&amp;/g, '&'));
      return keep('<span class="md-img" title="' + escape(url) + '">[' +
        (safe ? '<a href="' + escape(safe) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + '</a>' : escape(label)) +
        ']</span>');
    });

    // 3) 链接：label 单独做一次强调，整体作为占位，避免二次解析
    s = s.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))*)(?:\s+&quot;[^&]*&quot;)?\)/g, function (_, label, url) {
      var safe = safeUrl(url.replace(/&amp;/g, '&'));
      var text = emph(label);
      if (!safe) return keep('<span title="链接协议已被过滤">' + text + '</span>');
      return keep('<a href="' + escape(safe) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>');
    });

    // 4) 强调
    s = emph(s);

    // 5) 还原占位
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return store[Number(i)] || ''; });

    // 6) 段内换行
    return s.replace(/\n/g, '<br>');
  }

  /* ---------------- 块级 ---------------- */

  var RE_HEAD = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
  var RE_HR = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
  var RE_QUOTE = /^\s{0,3}>\s?/;
  var RE_FENCE = /^\s*(`{3,}|~{3,})\s*([\w+#.\-]*)\s*$/;
  var RE_LIST = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
  var RE_DELIM = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

  function unescapeCell(s) {
    return s.replace(/\\([\\`*_{}\[\]()#+\-.!|~>])/g, '$1');
  }

  function splitRow(line) {
    var s = String(line).trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    var cells = [], cur = '', esc = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === '\\') { esc = true; cur += ch; continue; }
      if (ch === '|') { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells.map(function (c) { return unescapeCell(c.trim()); });
  }

  function fenceNote(lang) {
    var l = String(lang || '').toLowerCase();
    if (l === 'mermaid') return 'mermaid 图在当前前端不渲染，已降级为源码';
    if (l === 'markmap' || l === 'mindmap') return '思维导图在当前前端不渲染，已降级为源码';
    if (l === 'math' || l === 'katex' || l === 'latex' || l === 'tex') return '公式渲染未实装，已降级为源码';
  }

  function renderFence(lang, code) {
    var note = fenceNote(lang);
    return '<div class="code-wrap"><div class="code-head"><span>' +
      escape(lang || 'text') + '</span>' +
      (note ? '<span class="code-note">' + escape(note) + '</span>' : '') +
      '</div><pre><code>' + escape(code) + '</code></pre></div>';
  }

  function renderList(items) {
    // items: { ordered, start, entries: [{level, text}] }
    var tag = items.ordered ? 'ol' : 'ul';
    var open = '<' + tag + (items.ordered && items.start !== 1 ? ' start="' + items.start + '"' : '') + '>';
    var body = items.entries.map(function (e) {
      var cls = e.level > 0 ? ' class="lvl' + Math.min(e.level, 2) + '"' : '';
      var text = e.text;
      var box = '';
      var m = /^\[( |x|X)\]\s+([\s\S]*)$/.exec(text);
      if (m) {
        box = '<span class="task-box" aria-hidden="true">' + (m[1] === ' ' ? '☐' : '☑') + '</span> ';
        text = m[2];
      }
      return '<li' + cls + '>' + box + inline(text) + '</li>';
    }).join('');
    return open + body + '</' + tag + '>';
  }

  function renderTable(rows, aligns) {
    var head = rows[0];
    var body = rows.slice(1);
    var cell = function (tag, text, i) {
      var a = aligns[i];
      var style = a === 'center' ? ' style="text-align:center"'
        : a === 'right' ? ' style="text-align:right"'
          : a === 'left' ? ' style="text-align:left"' : '';
      // 关键修复：这里传入的是单元格「原始文本」，inline() 只执行一次
      return '<' + tag + style + '>' + inline(text) + '</' + tag + '>';
    };
    var out = '<table><thead><tr>';
    for (var i = 0; i < head.length; i++) out += cell('th', head[i], i);
    out += '</tr></thead>';
    if (body.length) {
      out += '<tbody>';
      body.forEach(function (row) {
        out += '<tr>';
        var cols = Math.max(head.length, row.length);
        for (var j = 0; j < cols; j++) out += cell('td', row[j] == null ? '' : row[j], j);
        out += '</tr>';
      });
      out += '</tbody>';
    }
    return out + '</table>';
  }

  function blockStart(line) {
    return RE_HEAD.test(line) || RE_HR.test(line) || RE_QUOTE.test(line) ||
      RE_FENCE.test(line) || RE_LIST.test(line);
  }

  function blocks(lines) {
    var out = [];
    var i = 0;
    var n = lines.length;

    while (i < n) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // 围栏代码块：未闭合时消费到末尾，不报错
      var fm = RE_FENCE.exec(line);
      if (fm) {
        var mark = fm[1].charAt(0);
        var lang = fm[2] || '';
        var buf = [];
        i++;
        while (i < n) {
          var close = RE_FENCE.exec(lines[i]);
          if (close && close[1].charAt(0) === mark && close[1].length >= fm[1].length) { i++; break; }
          buf.push(lines[i]);
          i++;
        }
        out.push(renderFence(lang, buf.join('\n')));
        continue;
      }

      var hm = RE_HEAD.exec(line);
      if (hm) {
        var lv = hm[1].length;
        out.push('<h' + lv + '>' + inline(hm[2]) + '</h' + lv + '>');
        i++;
        continue;
      }

      if (RE_HR.test(line)) { out.push('<hr>'); i++; continue; }

      // 引用：连续 > 行整体递归
      if (RE_QUOTE.test(line)) {
        var quote = [];
        while (i < n && (RE_QUOTE.test(lines[i]) || (!/^\s*$/.test(lines[i]) && quote.length &&
          !blockStart(lines[i]) && !/^\s*\|/.test(lines[i])))) {
          quote.push(lines[i].replace(RE_QUOTE, ''));
          i++;
        }
        out.push('<blockquote>' + blocks(quote) + '</blockquote>');
        continue;
      }

      // 表格：当前行含 | 且下一行是分隔行
      if (line.indexOf('|') >= 0 && i + 1 < n && RE_DELIM.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
        var headCells = splitRow(line);
        var delims = splitRow(lines[i + 1]);
        var aligns = delims.map(function (d) {
          var left = d.charAt(0) === ':';
          var right = d.charAt(d.length - 1) === ':';
          if (left && right) return 'center';
          if (right) return 'right';
          if (left) return 'left';
          return '';
        });
        var rows = [headCells];
        i += 2;
        while (i < n && lines[i].indexOf('|') >= 0 && !/^\s*$/.test(lines[i])) {
          if (RE_DELIM.test(lines[i])) { i++; continue; }
          rows.push(splitRow(lines[i]));
          i++;
        }
        out.push(renderTable(rows, aligns));
        continue;
      }

      // 列表：支持缩进层级与任务列表；不是严格嵌套，用 lvl 类表达缩进
      var lm = RE_LIST.exec(line);
      if (lm) {
        var baseIndent = lm[1].length;
        var ordered = /\d/.test(lm[2]);
        var start = ordered ? parseInt(lm[2], 10) : 1;
        var entries = [];
        while (i < n) {
          var m2 = RE_LIST.exec(lines[i]);
          if (!m2) {
            // 列表项的续行（缩进且非块起始）
            if (entries.length && /^\s{2,}\S/.test(lines[i]) && !blockStart(lines[i])) {
              entries[entries.length - 1].text += ' ' + lines[i].trim();
              i++;
              continue;
            }
            break;
          }
          var indent = m2[1].length;
          var level = Math.max(0, Math.min(2, Math.floor((indent - baseIndent) / 2)));
          entries.push({ level: level, text: m2[3] });
          i++;
        }
        out.push(renderList({ ordered: ordered, start: start, entries: entries }));
        continue;
      }

      // 段落
      var para = [line];
      i++;
      while (i < n && !/^\s*$/.test(lines[i]) && !blockStart(lines[i])) {
        if (lines[i].indexOf('|') >= 0 && i + 1 < n && RE_DELIM.test(lines[i + 1])) break;
        para.push(lines[i]);
        i++;
      }
      out.push('<p>' + inline(para.join('\n')) + '</p>');
    }

    return out.join('\n');
  }

  function render(src) {
    if (src == null) return '';
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    try {
      return blocks(lines);
    } catch (e) {
      // 兜底：渲染器自身异常也不能白屏，退化为纯文本
      return '<p>' + inline(String(src)) + '</p>';
    }
  }

  window.SIMD = { render: render, inline: inline, escape: escape };
})();
