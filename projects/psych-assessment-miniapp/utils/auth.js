// utils/auth.js
var storage = require('./storage.js');
var cloud = require('./cloud.js');

function getLoginSession() {
  var s = storage.getSessionDual();
  if (!s) return null;
  if (s.loginExpireAt && s.loginExpireAt < Date.now()) {
    storage.clearSessionDual();
    return null;
  }
  return s;
}

function loginWithCode(roleChoice, profile) {
  if (typeof roleChoice === 'undefined') roleChoice = null;
  if (typeof profile === 'undefined') profile = null;
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx.login) {
      return reject({ code: 901, msg: '当前环境不支持 wx.login' });
    }
    wx.login({
      success: function (lres) {
        cloud.call('login', { code: lres.code, roleChoice: roleChoice, profile: profile })
          .then(function (r) {
            if (r.code !== 0) return reject(r);
            var user = r.user;
            storage.setSessionDual({ user: user, _savedAt: Date.now() });
            var app = typeof getApp === 'function' ? getApp() : null;
            if (app) app.globalData.currentUser = user;
            resolve(user);
          })
          .catch(function (e) { reject(e); });
      },
      fail: function (err) { reject(err); }
    });
  });
}

function forceRelogin() {
  storage.clearSessionDual();
  var app = typeof getApp === 'function' ? getApp() : null;
  if (app) app.globalData.currentUser = null;
  if (typeof wx !== 'undefined' && wx.reLaunch) {
    wx.reLaunch({ url: '/pages/login/role-select' });
  }
}

module.exports = {
  getLoginSession: getLoginSession,
  loginWithCode: loginWithCode,
  forceRelogin: forceRelogin
};
