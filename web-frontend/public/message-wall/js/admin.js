(function () {
  'use strict';

  var API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
  var TOKEN_KEY = 'admin_token_mw';

  var loginPanel = document.getElementById('login-panel');
  var adminPanel = document.getElementById('admin-panel');
  var loginForm = document.getElementById('login-form');
  var loginTip = document.getElementById('login-tip');
  var passwordInput = document.getElementById('password');
  var logoutBtn = document.getElementById('logout-btn');
  var reviewList = document.getElementById('review-list');
  var tabs = document.querySelectorAll('.tab');

  var currentStatus = 'pending';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function setToken(t) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  function authHeaders(extra) {
    var headers = extra || {};
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    else headers['Content-Type'] = 'application/json';
    return headers;
  }

  function showAdmin() {
    loginPanel.style.display = 'none';
    adminPanel.style.display = 'block';
    loadList();
  }

  function showLogin() {
    setToken(null);
    adminPanel.style.display = 'none';
    loginPanel.style.display = 'block';
  }

  // ---------- 登录 ----------
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginTip.textContent = '';
    loginTip.className = 'login-tip';
    try {
      var res = await fetch(API_BASE + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.value }),
      });
      var data = await res.json();
      if (res.ok && data.ok && data.token) {
        setToken(data.token);
        passwordInput.value = '';
        showAdmin();
      } else {
        loginTip.textContent = (data && data.error) || '登录失败';
        loginTip.className = 'login-tip err';
      }
    } catch (err) {
      loginTip.textContent = '网络异常，请稍后再试';
      loginTip.className = 'login-tip err';
    }
  });

  logoutBtn.addEventListener('click', async function () {
    try { await fetch(API_BASE + '/api/admin/logout', { method: 'POST', headers: authHeaders({}) }); } catch (e) { /* ignore */ }
    showLogin();
  });

  // ---------- Tab 切换 ----------
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentStatus = tab.dataset.status;
      loadList();
    });
  });

  // ---------- 列表 ----------
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      var pad = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  }

  async function loadList() {
    reviewList.innerHTML = '<div class="admin-empty">加载中…</div>';
    try {
      var res = await fetch(API_BASE + '/api/admin/messages?status=' + currentStatus, {
        headers: authHeaders({}),
      });
      if (res.status === 401) { showLogin(); return; }
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error('load failed');

      var list = data.list || [];
      if (!list.length) {
        reviewList.innerHTML = '<div class="admin-empty">这里还没有内容</div>';
        return;
      }

      reviewList.innerHTML = '';
      list.forEach(function (m) {
        var item = document.createElement('div');
        item.className = 'review-item' + (m.flagged ? ' flagged' : '');
        var meta =
          '<span>' + escapeHtml(m.nickname || '匿名') + '</span>' +
          '<span>' + formatDate(m.createdAt) + '</span>';
        if (m.flagged) meta += '<span class="flag-badge">⚠ 含危机/敏感词</span>';
        if (m.reviewedAt) meta += '<span>审核于 ' + formatDate(m.reviewedAt) + '</span>';

        item.innerHTML =
          '<div class="review-meta">' + meta + '</div>' +
          '<p class="review-content">' + escapeHtml(m.content) + '</p>' +
          '<div class="review-actions">' +
          (m.status === 'pending'
            ? '<button class="btn-sm btn-approve" data-action="approve">通过</button>' +
              '<button class="btn-sm btn-reject" data-action="reject">拒绝</button>'
            : '') +
          '<button class="btn-sm btn-delete" data-action="delete">删除</button>' +
          '</div>';

        item.querySelectorAll('.btn-sm').forEach(function (btn) {
          btn.addEventListener('click', function () { handleAction(m._id, btn.dataset.action); });
        });
        reviewList.appendChild(item);
      });
    } catch (err) {
      reviewList.innerHTML = '<div class="admin-empty">加载失败，请刷新重试</div>';
    }
  }

  async function handleAction(id, action) {
    try {
      var res;
      if (action === 'delete') {
        if (!confirm('确定要彻底删除这条留言吗？此操作不可恢复。')) return;
        res = await fetch(API_BASE + '/api/admin/messages/' + id, {
          method: 'DELETE',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
        });
      } else {
        res = await fetch(API_BASE + '/api/admin/messages/' + id + '/review', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ action: action }),
        });
      }
      if (res.status === 401) { showLogin(); return; }
      loadList();
    } catch (err) {
      alert('操作失败，请重试');
    }
  }

  // 进入页面时若已持有 token，直接尝试加载管理界面
  if (getToken()) {
    (async function probe() {
      try {
        var res = await fetch(API_BASE + '/api/admin/messages?status=pending', {
          headers: authHeaders({}),
        });
        if (res.ok) showAdmin(); else showLogin();
      } catch (e) { /* 保持登录页 */ }
    })();
  }
})();