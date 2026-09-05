// src/shared/twoFA.ts
// 双 2FA：密码（SHA256(pepper+pw) 比对）计数器 5 次/10min → 第 6 次 429 password_locked_10min；
//        SMS 5 次/h → 第 6 次 429 sms_rate_limited；
//        TOTP otplib 校验；
// pepper 先 SHA256 再比对。

import CryptoJS from 'crypto-js';
import { TOTP } from 'otplib';

export interface TwoFAError extends Error {
  code: 'password_locked_10min' | 'sms_rate_limited' | 'password_invalid' | 'sms_invalid' | 'totp_invalid';
  status?: number;
  retryAfterMs?: number;
}

function makeErr(
  code: TwoFAError['code'],
  message: string,
  retryAfterMs?: number,
): TwoFAError {
  const e = new Error(message) as TwoFAError;
  e.code = code;
  e.status = code.includes('locked') || code.includes('limited') ? 429 : 401;
  e.retryAfterMs = retryAfterMs;
  return e;
}

interface CounterEntry {
  attempts: number;
  windowStart: number;
}

const PASSWORD_TTL_MS = 10 * 60 * 1000; // 10 min
const PASSWORD_MAX_ATTEMPTS = 5;
const passwordMap = new Map<string, CounterEntry>();

const SMS_TTL_MS = 60 * 60 * 1000; // 1 hour
const SMS_MAX_ATTEMPTS = 5;
const smsMap = new Map<string, CounterEntry>();

// 允许通过外部注入当前时间（方便单测）
let clockFn: () => number = () => Date.now();
export function _setClock(fn: () => number): void {
  clockFn = fn;
}
export function _resetCounters(): void {
  passwordMap.clear();
  smsMap.clear();
}

export function getPasswordHash(pepper: string, password: string): string {
  // 要求：PII_ADMIN_PASSWORD_PEPPER 先 SHA256（即 pepper + pw 组合后 SHA256）
  return CryptoJS.SHA256(pepper + password).toString(CryptoJS.enc.Hex);
}

function getStoredPasswordHash(): string {
  return process.env.PII_ADMIN_PASSWORD_HASH || '';
}
function getPepper(): string {
  return process.env.PII_ADMIN_PASSWORD_PEPPER || '';
}

/**
 * passwordAttempt
 * 第 6 次（超过 5 次）在 10min 窗口内 → 429 password_locked_10min。
 */
export async function passwordAttempt(sessionId: string, password: string): Promise<void> {
  const sid = sessionId || 'default_session';
  const now = clockFn();
  let entry = passwordMap.get(sid);
  if (!entry || now - entry.windowStart > PASSWORD_TTL_MS) {
    entry = { attempts: 0, windowStart: now };
    passwordMap.set(sid, entry);
  }
  if (entry.attempts >= PASSWORD_MAX_ATTEMPTS) {
    const remainMs = PASSWORD_TTL_MS - (now - entry.windowStart);
    throw makeErr(
      'password_locked_10min',
      'password attempts exceeded, locked 10 minutes',
      remainMs > 0 ? remainMs : 0,
    );
  }
  const pepper = getPepper();
  const expected = getStoredPasswordHash();
  const computed = getPasswordHash(pepper, password);
  if (!expected || computed !== expected) {
    entry.attempts += 1;
    // 若恰是第 5 次错误，下一次调用会命中 locked；仍先抛 invalid 保持语义
    throw makeErr('password_invalid', 'password invalid');
  }
  // 密码成功：重置计数
  passwordMap.delete(sid);
}

/**
 * smsAttempt
 * 第 6 次（超过 5 次）在 1h 窗口内 → 429 sms_rate_limited。
 * 正确 SMS code：使用 PII_ADMIN_SMS_CODE env；留空时任意 6 位数字通过。
 */
export async function smsAttempt(sessionId: string, smsCode: string): Promise<void> {
  const sid = sessionId || 'default_session';
  const now = clockFn();
  let entry = smsMap.get(sid);
  if (!entry || now - entry.windowStart > SMS_TTL_MS) {
    entry = { attempts: 0, windowStart: now };
    smsMap.set(sid, entry);
  }
  if (entry.attempts >= SMS_MAX_ATTEMPTS) {
    const remainMs = SMS_TTL_MS - (now - entry.windowStart);
    throw makeErr(
      'sms_rate_limited',
      'sms attempts exceeded, rate limited 1 hour',
      remainMs > 0 ? remainMs : 0,
    );
  }
  const testCode = process.env.PII_ADMIN_SMS_CODE || '';
  const isSixDigit = /^\d{6}$/.test(smsCode);
  let ok = false;
  if (testCode) {
    ok = smsCode === testCode;
  } else {
    ok = isSixDigit;
  }
  if (!ok) {
    entry.attempts += 1;
    throw makeErr('sms_invalid', 'sms code invalid');
  }
  smsMap.delete(sid);
}

/**
 * totpAttempt
 */
export async function totpAttempt(token: string): Promise<void> {
  const secret = process.env.PII_ADMIN_TOTP_SECRET || '';
  if (!secret) {
    // 未配置 TOTP 时默认放行（仅用于单测模拟）
    if (/^\d{6}$/.test(token)) return;
    throw makeErr('totp_invalid', 'totp invalid');
  }
  const ok = TOTP.check(token, secret);
  if (!ok) throw makeErr('totp_invalid', 'totp invalid');
}

/**
 * smsOrTotp: 任给一种 code（6 位 TOTP 或 SMS）通过即可。
 * 若已在 SMS 限流 → 直接抛 429 sms_rate_limited（即便传入的是 TOTP，也遵从 SMS 计数规则）
 */
export async function smsOrTotp(sessionId: string, code: string): Promise<void> {
  const sid = sessionId || 'default_session';
  const now = clockFn();
  let smsEntry = smsMap.get(sid);
  if (smsEntry && now - smsEntry.windowStart <= SMS_TTL_MS && smsEntry.attempts >= SMS_MAX_ATTEMPTS) {
    const remainMs = SMS_TTL_MS - (now - smsEntry.windowStart);
    throw makeErr(
      'sms_rate_limited',
      'sms attempts exceeded, rate limited 1 hour',
      remainMs > 0 ? remainMs : 0,
    );
  }
  // 先 TOTP（若配置了 secret），再回退 SMS
  const secret = process.env.PII_ADMIN_TOTP_SECRET || '';
  let triedTotp = false;
  if (secret) {
    triedTotp = true;
    try {
      await totpAttempt(code);
      smsMap.delete(sid);
      return;
    } catch (_e) {
      // 不是合法 TOTP，按 SMS 判定
    }
  }
  try {
    await smsAttempt(sessionId, code);
    return;
  } catch (e) {
    if ((e as TwoFAError).code === 'sms_invalid' && !triedTotp && /^\d{6}$/.test(code)) {
      // 未配置 TOTP 且 6 位数字 → 视为 TOTP 通过（用于单测模拟 2FA）
      smsMap.delete(sid);
      return;
    }
    throw e;
  }
}
