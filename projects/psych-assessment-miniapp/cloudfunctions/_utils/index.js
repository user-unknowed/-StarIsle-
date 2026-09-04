const cloud = require('wx-server-sdk'); cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { csvCell, buildCSVLines } = require('../shared/csvUtils.js');

async function clearUserExpiredDrafts(ctx) {
  // 内部直接调用兄弟通路 cacheClear 动作 5 expireOldDraftsBulk：
  // cloud.callFunction({ name:'cacheClear', data:{action:'expireOldDraftsBulk', __SERVICE:true} })
  // 返回 result.expiredCount
  try {
    var res = await cloud.callFunction({
      name: 'cacheClear',
      data: { action: 'expireOldDraftsBulk', __SERVICE: true }
    });
    var result = (res && res.result) ? res.result : {};
    return {
      expiredCount: typeof result.expiredCount === 'number' ? result.expiredCount : 0,
      ok: true,
      detail: result
    };
  } catch (e) {
    return {
      expiredCount: 0,
      ok: false,
      error: (e && e.message) ? e.message : String(e)
    };
  }
}

exports.main = async function(event, context) {
  var ctx = cloud.getWXContext ? cloud.getWXContext() : { OPENID: null };
  if (event.script === 'clearExpiredDrafts') { return await clearUserExpiredDrafts(ctx); }
  return { code: 0, ok: true, scripts: ['clearExpiredDrafts'], csvUtils: 'loaded' };
};
