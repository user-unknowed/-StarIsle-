// utils/_b64.js 微信小程序端 btoa/atob 自实现
var b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function btoa(str) {
  str = String(str == null ? '' : str);
  var out = '';
  var i = 0;
  var len = str.length;
  while (i < len) {
    var c1 = str.charCodeAt(i++) & 0xff;
    var c2 = i < len ? str.charCodeAt(i++) & 0xff : NaN;
    var c3 = i < len ? str.charCodeAt(i++) & 0xff : NaN;
    var e1 = c1 >> 2;
    var e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : (c2 >> 4));
    var e3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | (isNaN(c3) ? 0 : (c3 >> 6)));
    var e4 = isNaN(c3) ? 64 : (c3 & 63);
    out += b64chars.charAt(e1) + b64chars.charAt(e2) + b64chars.charAt(e3) + b64chars.charAt(e4);
  }
  return out;
}

function atob(str) {
  str = String(str == null ? '' : str).replace(/=+$/, '').replace(/\s/g, '');
  var out = '';
  var i = 0;
  var len = str.length;
  while (i < len) {
    var e1 = b64chars.indexOf(str.charAt(i++));
    var e2 = i < len ? b64chars.indexOf(str.charAt(i++)) : -1;
    var e3 = i < len ? b64chars.indexOf(str.charAt(i++)) : -1;
    var e4 = i < len ? b64chars.indexOf(str.charAt(i++)) : -1;
    if (e1 < 0) e1 = 0;
    if (e2 < 0) e2 = 0;
    if (e3 < 0) e3 = 64;
    if (e4 < 0) e4 = 64;
    var c1 = (e1 << 2) | (e2 >> 4);
    var c2 = ((e2 & 15) << 4) | (e3 >> 2);
    var c3 = ((e3 & 3) << 6) | e4;
    out += String.fromCharCode(c1);
    if (e3 !== 64) out += String.fromCharCode(c2);
    if (e4 !== 64) out += String.fromCharCode(c3);
  }
  return out;
}

module.exports = { btoa: btoa, atob: atob };
