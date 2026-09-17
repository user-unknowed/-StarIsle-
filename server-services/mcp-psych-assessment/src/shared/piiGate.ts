// src/shared/piiGate.ts
// forceReMask: 对除 accessPII 外的 5 个 Tool 输出自动置空 name/phone 等 PII 字段。
// grantAccessToken: 签发 30s 过期 JWT。

import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'PII_JWT_SECRET_PLACEHOLDER_DO_NOT_USE_IN_PROD';

export function getJwtSecret(): string {
  return process.env.PII_JWT_SECRET || DEFAULT_SECRET;
}

export interface ReMaskOpts {
  toolName: string;
}

const PII_OUTPUT_FIELDS = ['name', 'phone', 'realName', 'mobile', 'email', 'idCard'];

// 深度遍历对象，置空 PII 字段为 null/空字符串。数组逐元素处理。
export function forceReMask<T = unknown>(payload: T, opts: ReMaskOpts): T {
  if (opts.toolName === 'accessPII') {
    return payload; // accessPII 授权后不做 remask
  }
  return maskValue(payload) as T;
}

function maskValue(v: unknown, depth = 0): unknown {
  if (depth > 10) return v;
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => maskValue(x, depth + 1));
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (PII_OUTPUT_FIELDS.includes(k)) {
      // 置空：统一替换为空字符串，保留键结构
      out[k] = typeof val === 'string' ? '' : null;
    } else {
      out[k] = maskValue(val, depth + 1);
    }
  }
  return out;
}

export interface PiiGrantToken {
  token: string;
  expireAt: number; // epoch ms
  expiresInMs: number;
}

// 签发 30s JWT，sub=admin_pii_grant
export function grantAccessToken(subject: string, ttlMs = 30_000, now = Date.now()): PiiGrantToken {
  const secret = getJwtSecret();
  const iat = now;
  const exp = iat + ttlMs;
  const token = jwt.sign(
    {
      sub: subject || 'admin_pii_grant',
      iat: Math.floor(iat / 1000),
      exp: Math.floor(exp / 1000),
      scope: 'pii:read',
    },
    secret,
    { algorithm: 'HS256' },
  );
  return {
    token,
    expireAt: exp,
    expiresInMs: ttlMs,
  };
}
