// 树苗的轻语 - Cloudflare Pages Functions API 共享工具
// 危机/敏感词（命中仅标记 flagged，由人工审核裁量）
export const CRISIS_KEYWORDS = [
  '自杀', '轻生', '想死', '去死', '自残', '自伤', '割腕', '跳楼', '跳桥',
  '安眠药', '结束生命', '了结', '自杀方法', '结束这一切', '不想活', '活不下去',
  '撑不下去', '没有活下去', 'suicide', 'kill myself',
];

export function containsCrisisKeyword(text) {
  const lower = (text || '').toLowerCase();
  return CRISIS_KEYWORDS.some((k) => lower.includes(k));
}

// ---------- 无状态 HMAC 管理员令牌（24h 过期，密钥派生自 ADMIN_PASSWORD） ----------
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function b64UrlFromBytes(bytes) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToBytes(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(secret) {
  const enc = new TextEncoder().encode(String(secret || ''));
  return crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signData(key, data) {
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64UrlFromBytes(new Uint8Array(sig));
}

export async function issueToken(secret) {
  const ts = Date.now().toString();
  const key = await getKey(secret);
  const sig = await signData(key, ts);
  return b64UrlFromBytes(new TextEncoder().encode(ts)) + '.' + sig;
}

export async function verifyToken(token, secret) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return false;
    const tsBytes = b64UrlToBytes(parts[0]);
    const ts = parseInt(new TextDecoder().decode(tsBytes), 10);
    if (!ts || Date.now() - ts > TOKEN_TTL_MS) return false;
    const key = await getKey(secret);
    const expected = await signData(key, ts.toString());
    if (parts[1] !== expected) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- 基础限流：同 IP 60 秒最多 1 条（每 isolate 独立，尽力而为） ----------
const RATE_WINDOW_MS = 60 * 1000;
const rateMap = new Map();

export function isRateLimited(ip) {
  const last = rateMap.get(ip);
  if (last && Date.now() - last < RATE_WINDOW_MS) return true;
  rateMap.set(ip, Date.now());
  return false;
}

// ---------- CORS / 响应 ----------
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function respond(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export function bearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}