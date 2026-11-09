(function () {
  'use strict';

  var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';

  // ---------- 星空 ----------
  var starsEl = document.getElementById('stars');
  var frag = document.createDocumentFragment();
  for (var i = 0; i < 60; i++) {
    var s = document.createElement('div');
    s.className = 'star-dot';
    var size = Math.random() * 2 + 1;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
    s.style.animationDuration = (2.5 + Math.random() * 3).toFixed(2) + 's';
    frag.appendChild(s);
  }
  starsEl.appendChild(frag);

  // ---------- 表单 ----------
  var form = document.getElementById('message-form');
  var nicknameInput = document.getElementById('nickname');
  var contentInput = document.getElementById('content');
  var charCount = document.getElementById('char-count');
  var tip = document.getElementById('form-tip');
  var submitBtn = document.getElementById('submit-btn');

  contentInput.addEventListener('input', function () {
    charCount.textContent = contentInput.value.length;
  });

  function showTip(text, cls) {
    tip.textContent = text;
    tip.className = 'form-tip ' + (cls || '');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var content = contentInput.value.trim();
    if (!content) {
      showTip('请写点想说的话吧', 'err');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '正在送出…';
    showTip('');

    try {
      var res = await fetch(API_BASE + '/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nicknameInput.value.trim(),
          content: content,
        }),
      });
      var data = await res.json();
      if (res.ok && data.ok) {
        showTip(data.message || '已收到，审核通过后会出现在留言墙上', 'ok');
        contentInput.value = '';
        charCount.textContent = '0';
      } else {
        showTip(data.error || '提交失败，请稍后再试', 'err');
      }
    } catch (err) {
      showTip('网络异常，请稍后再试', 'err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '送出这份心意';
    }
  });

  // ---------- 留言墙 ----------
  var wall = document.getElementById('wall');
  var wallCount = document.getElementById('wall-count');

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    } catch (e) {
      return '';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  async function loadWall() {
    try {
      var res = await fetch(API_BASE + '/api/messages');
      var data = await res.json();
      wall.innerHTML = '';
      if (!res.ok || !data.ok) throw new Error('load failed');

      var list = data.list || [];
      wallCount.textContent = list.length ? '共 ' + list.length + ' 条' : '';

      if (!list.length) {
        var empty = document.createElement('div');
        empty.className = 'wall-empty';
        empty.textContent = '留言墙还空着，等你送出第一句话 ✦';
        wall.appendChild(empty);
        return;
      }

      list.forEach(function (m, idx) {
        var card = document.createElement('article');
        card.className = 'card';
        card.style.animationDelay = Math.min(idx * 0.06, 1.2) + 's';
        card.innerHTML =
          '<p class="card-content">' + escapeHtml(m.content) + '</p>' +
          '<div class="card-footer">' +
          '<span class="card-nickname">' + escapeHtml(m.nickname || '匿名') + '</span>' +
          '<span class="card-date">' + formatDate(m.createdAt) + '</span>' +
          '</div>';
        wall.appendChild(card);
      });
    } catch (err) {
      wall.innerHTML = '<div class="wall-empty">留言墙加载失败，请刷新重试</div>';
    }
  }

  loadWall();
  // 每 60 秒刷新一次留言墙
  setInterval(loadWall, 60000);
})();
