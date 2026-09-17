// src/tools/accessPII.ts
// 双 2FA（密码 + SMS/TOTP）；成功发 piiGrantToken，expireAt = now + 30s；
// audit.extras 只写 anonymousNo 数组。

import * as scopeGuard from '../shared/scopeGuard.js';
import * as twoFA from '../shared/twoFA.js';
import * as piiGate from '../shared/piiGate.js';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
}

export interface AccessPIIArgs {
  password: string;
  secondFactorCode: string; // SMS 6 位或 TOTP
  anonymousNos: string[];
  role?: string; // 不相信
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
  _auditExtras?: Record<string, unknown>;
}

// 模拟 PII 数据库：anonymousNo -> {name, phone}
const PII_DB: Record<string, { name: string; phone: string }> = {
  A1: { name: '张三', phone: '13800138000' },
  A2: { name: '李四', phone: '13900139000' },
};

export async function accessPII(args: AccessPIIArgs, meta: CallerMeta): Promise<ToolResult> {
  scopeGuard.enforceRole('accessPII', meta);

  const sessionId = meta.sessionId ?? 'admin_session';
  const anonymousNos = Array.isArray(args.anonymousNos) ? args.anonymousNos : [];

  // 1) 密码校验
  try {
    await twoFA.passwordAttempt(sessionId, args.password);
  } catch (e) {
    const err = e as { code?: string | number; message?: string };
    return {
      isError: true,
      code: err.code,
      content: { message: err.message ?? 'password error' },
    };
  }

  // 2) 第二因子：SMS 或 TOTP
  try {
    await twoFA.smsOrTotp(sessionId, args.secondFactorCode);
  } catch (e) {
    const err = e as { code?: string | number; message?: string };
    return {
      isError: true,
      code: err.code,
      content: { message: err.message ?? 'second factor error' },
    };
  }

  // 3) 签发 30s piiGrantToken
  const grant = piiGate.grantAccessToken('admin_pii_grant', 30_000);

  // 4) 仅返回授权范围内的 PII 记录
  const records = anonymousNos.map((anon) => ({
    anonymousNo: anon,
    pii: PII_DB[anon] ?? { name: null, phone: null },
  }));

  return {
    content: {
      grant: {
        token: grant.token,
        expireAt: grant.expireAt,
        expiresInMs: grant.expiresInMs,
      },
      records,
    },
    // audit extras 只写 anonymousNo 数组（不写 PII）
    _auditExtras: { anonymousNos },
  };
}
