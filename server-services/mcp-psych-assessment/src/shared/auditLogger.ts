// src/shared/auditLogger.ts
// 审计日志：stdout JSON 行，type=psych_mcp_audit，PII 字段过滤。
// Middleware 风格 async/await，pre 记录入口，post 记录结果。

export interface AuditMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
  toolName?: string;
  requestId?: string;
}

export interface AuditEntry {
  type: 'psych_mcp_audit';
  ts: string;
  tool: string;
  phase: 'pre' | 'post';
  status?: 'ok' | 'error';
  code?: string | number;
  extras?: Record<string, unknown>;
  anonymousNo?: string;
  callerRole?: string;
  requestId?: string;
}

// 可能的 PII 明文字段名（审计日志中绝不输出其值）
const PII_FIELD_KEYS = new Set([
  'name',
  'phone',
  'password',
  'otp',
  'sms_code',
  'smsCode',
  'realName',
  'totp',
  'secret',
  'token',
  'jwt',
]);

// 递归将 PII 字段值置为 '[REDACTED]'，避免明文字段出现。
export function scrubPII(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[REDACTED:depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    // 简单脱敏：避免把明显的手机号/密码字面量直接打到日志
    if (/^\d{11}$/.test(value)) return '[REDACTED:phone]';
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubPII(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_FIELD_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrubPII(v, depth + 1);
    }
  }
  return out;
}

let captureBuffer: AuditEntry[] | null = null;
export function startCapture(): AuditEntry[] {
  captureBuffer = [];
  return captureBuffer;
}
export function stopCapture(): AuditEntry[] {
  const buf = captureBuffer;
  captureBuffer = null;
  return buf ?? [];
}

export function emit(entry: AuditEntry): void {
  const line = JSON.stringify(scrubPII(entry));
  if (captureBuffer) captureBuffer.push(entry);
  // 审计日志走 stdout；PII 已 scrub，行内不会出现 name/phone/password/otp/sms_code 明文。
  // eslint-disable-next-line no-console
  process.stdout.write(line + '\n');
}

export interface MiddlewareCtx {
  toolName: string;
  meta: AuditMeta;
  requestId?: string;
  extras?: Record<string, unknown>;
}

export type NextFn = () => Promise<{ content: unknown; isError?: boolean; code?: string | number }>;

export async function auditLogger(ctx: MiddlewareCtx, next: NextFn): Promise<ReturnType<NextFn>> {
  emit({
    type: 'psych_mcp_audit',
    ts: new Date().toISOString(),
    tool: ctx.toolName,
    phase: 'pre',
    anonymousNo: ctx.meta.anonymousNo,
    callerRole: ctx.meta.callerRole,
    requestId: ctx.requestId,
  });
  let result: Awaited<ReturnType<NextFn>>;
  try {
    result = await next();
  } catch (err) {
    const code = (err as { code?: string | number })?.code ?? 'internal_error';
    emit({
      type: 'psych_mcp_audit',
      ts: new Date().toISOString(),
      tool: ctx.toolName,
      phase: 'post',
      status: 'error',
      code,
      extras: scrubPII(ctx.extras ?? {}) as Record<string, unknown>,
      anonymousNo: ctx.meta.anonymousNo,
      callerRole: ctx.meta.callerRole,
      requestId: ctx.requestId,
    });
    throw err;
  }
  emit({
    type: 'psych_mcp_audit',
    ts: new Date().toISOString(),
    tool: ctx.toolName,
    phase: 'post',
    status: result.isError ? 'error' : 'ok',
    code: result.code,
    extras: scrubPII(ctx.extras ?? {}) as Record<string, unknown>,
    anonymousNo: ctx.meta.anonymousNo,
    callerRole: ctx.meta.callerRole,
    requestId: ctx.requestId,
  });
  return result;
}
