// custom-tab-bar/index.js
// 基于角色动态切换底部 Tab：学生 3 Tab / 教师 4 Tab / 管理员 4 Tab
var STUDENT_TABS = [
  { icon: '🏠', text: '任务大厅', pagePath: '/pages/student/task-hall' },
  { icon: '📒', text: '我的记录', pagePath: '/pages/student/my-records' },
  { icon: '👤', text: '我的', pagePath: '/pages/student/profile' }
];

var TEACHER_TABS = [
  { icon: '📊', text: '总览', pagePath: '/pages/teacher/dashboard' },
  { icon: '📋', text: '任务', pagePath: '/pages/teacher/task-list' },
  { icon: '🔍', text: '分析', pagePath: '/pages/teacher/analysis' },
  { icon: '⚙️', text: '设置', pagePath: '/pages/teacher/settings' }
];

var ADMIN_TABS = [
  { icon: '📈', text: '运营总览', pagePath: '/pages/admin/ops-overview' },
  { icon: '📦', text: '全局出口', pagePath: '/pages/admin/global-export' },
  { icon: '🚨', text: '人危审批', pagePath: '/pages/admin/people-crisis' },
  { icon: '🤖', text: '审计AI', pagePath: '/pages/admin/audit-ai' }
];

Component({
  data: {
    role: 'student',
    selected: 0,
    list: STUDENT_TABS,
    listKey: 'student'
  },

  lifetimes: {
    attached: function () {
      // 尝试从当前用户恢复角色
      try {
        var app = typeof getApp === 'function' ? getApp() : null;
        var role = (app && app.globalData && app.globalData.currentUser && app.globalData.currentUser.role) || 'student';
        this.setRole(role);
      } catch (e) { /* ignore */ }
    }
  },

  methods: {
    setRole: function (role) {
      var list;
      if (role === 'teacher') list = TEACHER_TABS;
      else if (role === 'admin') list = ADMIN_TABS;
      else list = STUDENT_TABS;
      var finalRole = role === 'teacher' ? 'teacher' : (role === 'admin' ? 'admin' : 'student');
      this.setData({ role: finalRole, list: list, listKey: finalRole, selected: 0 });
    },
    switchTab: function (e) {
      var idx = e.currentTarget.dataset.index;
      var item = this.data.list[idx];
      if (!item) return;
      this.setData({ selected: idx });
      if (typeof wx !== 'undefined' && wx.switchTab) {
        wx.switchTab({ url: item.pagePath, fail: function () {
          // 若页面尚未注册为 tabBar，退回 reLaunch
          if (wx.reLaunch) wx.reLaunch({ url: item.pagePath });
        } });
      }
    },
    setSelectedByPage: function (pagePath) {
      if (!pagePath) return;
      var idx = -1;
      for (var i = 0; i < this.data.list.length; i++) {
        var p = this.data.list[i].pagePath || '';
        if (p === pagePath || p.indexOf(pagePath) >= 0 || (pagePath && pagePath.indexOf(p) >= 0)) { idx = i; break; }
      }
      if (idx >= 0) this.setData({ selected: idx });
    }
  }
});
