// utils/cloud.js
function call(name, data, config) {
  if (typeof data === 'undefined') data = {};
  if (typeof config === 'undefined') config = {};
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
      return reject({ code: 900, msg: '当前环境不可调用云函数' });
    }
    wx.cloud.callFunction({
      name: name,
      data: data,
      config: config,
      success: function (r) {
        var result = (r && r.result) || {};
        if (result.code === 4011) {
          var auth = require('./auth.js');
          auth.forceRelogin();
          return reject(result);
        }
        resolve(result);
      },
      fail: function (err) {
        reject({ code: 900, msg: (err && err.errMsg) || '网络异常' });
      }
    });
  });
}
module.exports = { call: call };
