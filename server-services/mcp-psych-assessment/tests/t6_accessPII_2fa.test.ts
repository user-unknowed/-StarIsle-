// tests/t6_accessPII_2fa.test.ts
// 密码 5 次错 第 6 次 429 password_locked_10min；
// SMS 5 次 第 6 次 429 sms_rate_limited；
// 成功 expireAt=now+30s (±1s)
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import * as twoFA from '../src/shared/twoFA.js';
import CryptoJS from 'crypto-js';
import { accessPII } from '../src/tools/accessPII.js';

const CORRECT_PASSWORD = 'Admin@123';
const CORRECT_SMS = '123456';

function setupEnv(): void {
  const pepper = 'YOUR_32BYTE_RANDOM_FOR_TEST_0123456789';
  const pwHash = CryptoJS.SHA256(pepper + CORRECT_PASSWORD).toString(CryptoJS.enc.Hex);
  process.env.PII_ADMIN_PASSWORD_PEPPER = pepper;
  process.env.PII_ADMIN_PASSWORD_HASH = pwHash;
  process.env.PII_ADMIN_SMS_CODE = CORRECT_SMS;
  process.env.PII_JWT_SECRET = 'YOUR_32BYTE_RANDOM_FOR_TESTING_JWT012';
  // 设置一个不会匹配测试码的 TOTP secret，强制走 SMS 判定路径
  process.env.PII_ADMIN_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
}

describe('t6 accessPII 双 2FA 边界', () => {
  beforeAll(() => setupEnv());
  beforeEach(() => {
    twoFA._resetCounters();
  });

  it('t6: 密码 5 次错误，第 6 次 429 password_locked_10min', async () => {
    const sid = 't6-pw-lock';
    // 先 5 次错
    for (let i = 0; i < 5; i++) {
      const r = await accessPII(
        { password: 'wrong', secondFactorCode: '000000', anonymousNos: ['A1'] },
        { callerRole: 'admin', sessionId: sid },
      );
      expect(r.code).toBe('password_invalid');
    }
    // 第 6 次 → 锁定
    const r6 = await accessPII(
      { password: CORRECT_PASSWORD, secondFactorCode: CORRECT_SMS, anonymousNos: ['A1'] },
      { callerRole: 'admin', sessionId: sid },
    );
    expect(r6.isError).toBe(true);
    expect(r6.code).toBe('password_locked_10min');
  });

  it('t6b: SMS 5 次错误，第 6 次 429 sms_rate_limited', async () => {
    const sid = 't6-sms-lock';
    // 先 5 次 SMS 错（密码正确）
    for (let i = 0; i < 5; i++) {
      const r = await accessPII(
        { password: CORRECT_PASSWORD, secondFactorCode: '000000', anonymousNos: ['A1'] },
        { callerRole: 'admin', sessionId: sid },
      );
      expect(r.code).toBe('sms_invalid');
    }
    // 第 6 次 → SMS 限流（即便密码和 SMS 都正确，也先命中计数锁）
    const r6 = await accessPII(
      { password: CORRECT_PASSWORD, secondFactorCode: CORRECT_SMS, anonymousNos: ['A1'] },
      { callerRole: 'admin', sessionId: sid },
    );
    expect(r6.isError).toBe(true);
    expect(r6.code).toBe('sms_rate_limited');
  });

  it('t6c: 成功时 expireAt = now + 30s（±1s）', async () => {
    const sid = 't6-success';
    const before = Date.now();
    const r = await accessPII(
      { password: CORRECT_PASSWORD, secondFactorCode: CORRECT_SMS, anonymousNos: ['A1'] },
      { callerRole: 'admin', sessionId: sid },
    );
    const after = Date.now();
    expect(r.isError).toBeFalsy();
    const body = r.content as Record<string, unknown>;
    const grant = body.grant as Record<string, unknown>;
    const expireAt = grant.expireAt as number;
    const expectMin = before + 29_000; // -1s 容差
    const expectMax = after + 31_000; // +1s 容差
    expect(expireAt).toBeGreaterThanOrEqual(expectMin);
    expect(expireAt).toBeLessThanOrEqual(expectMax);
    expect(grant.token).toBeTruthy();
  });

  it('t6d: 成功后 audit extras 只含 anonymousNos（不含 PII）', async () => {
    const r = await accessPII(
      { password: CORRECT_PASSWORD, secondFactorCode: CORRECT_SMS, anonymousNos: ['A1', 'A2'] },
      { callerRole: 'admin', sessionId: 't6-audit' },
    );
    expect(r.isError).toBeFalsy();
    const extras = r._auditExtras as Record<string, unknown> | undefined;
    expect(extras).toBeTruthy();
    const anons = extras?.anonymousNos as string[];
    expect(anons).toEqual(['A1', 'A2']);
    // extras 中不应出现任何 PII 字段名
    for (const key of Object.keys(extras ?? {})) {
      expect(['name', 'phone', 'password', 'otp', 'sms_code', 'realName', 'mobile']).not.toContain(key);
    }
  });
});
