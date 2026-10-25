/* ============================================================
   Harness Console · nav.js — 导航高亮与审批待办计数的唯一机制
   规则 1：body[data-page] 与 <a data-nav> 匹配者加 .active
   规则 2：#navPending 计数来自 DB.approvals 的 pending 数
   ============================================================ */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-page");
  var links = document.querySelectorAll(".nav-items a[data-nav]");
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    if (a.getAttribute("data-nav") === page) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  }
})();

window.HCA = window.HCA || {};
/* 审批计数变化后调用（任何页面） */
HCA.refreshNavCount = function () {
  var el = document.getElementById("navPending");
  if (!el || !window.DB || !DB.approvals) return;
  var pending = DB.approvals.filter(function (a) { return a.status === "pending"; }).length;
  el.textContent = pending;
  el.style.display = pending ? "" : "none";
};
/* 首次执行 */
document.addEventListener("DOMContentLoaded", HCA.refreshNavCount);
if (document.readyState !== "loading") HCA.refreshNavCount();
