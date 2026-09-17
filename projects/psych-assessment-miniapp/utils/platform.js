// utils/platform.js
function detect() {
  var sys = null;
  try {
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) sys = wx.getSystemInfoSync();
  } catch (e) { sys = null; }
  if (!sys) sys = { platform: 'devtools', system: '', model: '', version: '' };
  var platform = String(sys.platform || '').toLowerCase();
  var system = String(sys.system || '');
  var isHarmonyNext = /HarmonyOS.*NEXT|纯血鸿蒙/.test(system);
  var isHarmony = /HarmonyOS|hongmeng/i.test(system) && !isHarmonyNext;
  var name = 'android';
  if (/ios|devtools/i.test(platform) && !isHarmony) name = 'ios';
  if (isHarmony) name = 'harmony';
  if (isHarmonyNext) name = 'harmony-next';
  return {
    name: name,
    isHarmonyNext: isHarmonyNext,
    isIOS: name === 'ios',
    isHarmony: isHarmony,
    raw: { platform: platform, system: system, model: sys.model, version: sys.version }
  };
}
function harmonyClassIf() {
  return detect().isHarmony ? 'harmony' : '';
}
module.exports = { detect: detect, harmonyClassIf: harmonyClassIf };
