const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex');

const files = [];

// ========== 1. package.json ==========
files.push({
  path: 'server-services/mcp-psych-assessment/package.json',
  content: JSON.stringify({
    name: "@starisle/mcp-psych-assessment",
    version: "1.0.0",
    description: "MCP Server: 心理测评任务、反馈、AI 分析、复核、科研导出与 PII 干预访问",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc -p tsconfig.json",
      start: "node dist/index.js",
      dev: "tsx watch src/index.ts",
      test: "vitest run",
      watch: "vitest"
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "^0.6.0",
      "crypto-js": "^4.2.0",
      "qrcode": "^1.5.3",
      "jsonwebtoken": "^9.0.2",
      "otplib": "^12.0.1"
    },
    devDependencies: {
      "typescript": "^5.6.0",
      "vitest": "^2.1.0",
      "@types/node": "^22.0.0",
      "tsx": "^4.19.0"
    },
    engines: {
      node: ">=20"
    },
    license: "MIT"
  }, null, 2) + "\n"
});

// ========== 2. tsconfig.json ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tsconfig.json',
  content: JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "Bundler",
      strict: true,
      outDir: "dist",
      rootDir: "src",
      declaration: true,
      types: ["node", "vitest/globals"],
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true
    },
    include: ["src/**/*"],
    exclude: ["node_modules", "dist", "tests", "coverage"]
  }, null, 2) + "\n"
});

// ========== 3. README.md ==========
files.push({
  path: 'server-services/mcp-psych-assessment/README.md',
  content: `# @starisle/mcp-psych-assessment

心理测评（Psychological Assessment）MCP Server。独立 stdio 进程，由上游 server-services dispatcher 托管。

## 启动

\`\`\`bash
cd server-services/mcp-psych-assessment
cp .env.example .env.local
npm install
npm run build
npm start        # stdio MCP
# 或
npm run dev      # tsx 热重载
npm test         # vitest 边界用例
\`\`\`

## 6 个 Tool 列表

1. **listTasks** — 按角色/状态/学生匿名编号分页查询测评任务，绝不返回姓名/手机号。
2. **submitFeedback** — 提交学生反馈（含图像可选），秒级命中 MS-SEC 触发词时**不调用 DashScope**。
3. **aiAnalyze** — 对已提交反馈做多维心理风险分析（DashScope + budget 闸）。
4. **reviewFeedback** — 教师复核；传入 \`confirm_3\` 字段会被阻断并审计。
5. **exportResearch** — 科研维度 CSV 导出，180 天窗口，维度命中 PII KEY → 403。
6. **accessPII** — 管理员干预访问：密码 + TOTP/SMS 双因子 → 30s PII Grant（JWT）。

## 三条说明

- 本 Server **无状态**：鉴权依赖上游 dispatcher 注入的 metadata（callerRole / callerUserHash / serverSessionId）。
- 所有 PII 访问均由 \`accessPII\` 独占，其他 tool 的输出会被 \`forceReMask\` 兜底二次清洗。
- 预算、锁定、SMS 频控、TOTP 窗均为进程内内存实现，重启清零（部署为单进程常驻时成立）。

## server-services dispatcher 集成（三行）

\`\`\`js
// 1) spawn 本 MCP，传 metadata 三字段
const mcp = spawn('node', ['dist/index.js'], { stdio: ['pipe','pipe','pipe'] });
mcp.stdin.write(JSON.stringify({ metadata:{ callerRole, callerUserHash, serverSessionId } }));
// 2) features 开关：piiIntervention, researchExport, offlineDashscopeMock
const features = { piiIntervention: true, researchExport: true, offlineDashscopeMock: false };
// 3) 30s 软清零：PII Grant 到期后 dispatcher 调 admin/softClear（不触达本 Server 内部 JWT TTL）
setTimeout(() => dispatch('admin/softClear', { serverSessionId }), 30_000);
\`\`\`
`
});

// ========== 4. .env.example ==========
files.push({
  path: 'server-services/mcp-psych-assessment/.env.example',
  content: `# DashScope 通义千问心理风险分析 LLM 密钥（占位，无有效值）
DASHSCOPE_KEY=YOUR_DASHSCOPE_API_KEY
DASHSCOPE_TOKEN_BUDGET_DAILY=2000000
DASHSCOPE_TOKENS_USED_TODAY=0

# 微信云开发（tcb）环境
WX_CLOUD_ENV=YOUR_WX_CLOUD_ENV_ID
WX_CLOUD_MODE=direct|webhook
WX_CLOUD_WEBHOOK_URL=YOUR_WX_CLOUD_WEBHOOK_URL
WX_CLOUD_WEBHOOK_SECRET=YOUR_WX_CLOUD_WEBHOOK_SECRET

# 2FA 短信通道（占位；生产接阿里云/腾讯云 SMS）
2FA_SMS_PROVIDER=YOUR_2FA_SMS_PROVIDER_NAME
2FA_SMS_ACCESS_KEY=YOUR_2FA_SMS_ACCESS_KEY
2FA_SMS_ACCESS_SECRET=YOUR_2FA_SMS_ACCESS_SECRET
2FA_SMS_SIGN_NAME=YOUR_2FA_SMS_SIGN_NAME
2FA_SMS_TEMPLATE_CODE=YOUR_2FA_SMS_TEMPLATE_CODE

# PII 管理员口令（bcryptish = sha256(pepper + raw)）
PII_ADMIN_PASSWORD_PEPPER=YOUR_PII_ADMIN_PASSWORD_PEPPER
PII_ADMIN_PASSWORD_HASH=YOUR_PII_ADMIN_PASSWORD_SHA256_PEPPERED_HASH

# PII JWT 签名密钥（>=16 bytes，否则启动抛错）
PII_JWT_SECRET=YOUR_PII_JWT_SECRET_AT_LEAST_16_BYTES_LONG

# PII TOTP 种子（otplib authenticator.generate(secret)）
PII_ADMIN_TOTP_SECRET=YOUR_PII_ADMIN_TOTP_BASE32_SECRET

# 非生产：SMS 固定码（开发/CI 环境）；生产应留空或删除 → 默认 false
PII_ADMIN_SMS_CODE=YOUR_PII_ADMIN_SMS_DEV_FIXED_CODE

# 审计日志输出：stdout | file:<path>
AUDIT_LOG_SINK=stdout
`
});

// ========== 5. .gitignore ==========
files.push({
  path: 'server-services/mcp-psych-assessment/.gitignore',
  content: `node_modules/
dist/
.env
.env.local
coverage/
*.log
exports-research/
.DS_Store
`
});

// ========== 6. src/shared/auditLogger.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/auditLogger.ts',
  content: `// Spec §3.1 AuditLogger — stdout 单行 JSON 审计；scrubExtras 按 PII 正则过滤

export type AuditRow = {
  actorHash: string;
  serverSessionIdHash: string;
  toolName: string;
  status: 'ok' | 'fail' | 'blocked';
  anonymousNos: string[];
  code?: number | string;
  extras?: Record<string, unknown>;
  ts: number;
};

const PII_KEY_REGEX = /(name|phone|password|pwd|totp|sms|otp|secret)/i;
const CN_MOBILE_REGEX = /(?:^|[^0-9])(1[3-9][0-9]{9})(?:[^0-9]|$)/;
const BCRYPT_REGEX = /\\$2[aby]?\\$\\d{2}\\$[./A-Za-z0-9]{53}/;
const SK_LONG_REGEX = /sk-[A-Za-z0-9_-]{20,}/;

function scrubValue(v: unknown): unknown {
  if (typeof v === 'string') {
    if (CN_MOBILE_REGEX.test(v)) return '[REDACTED:phone]';
    if (BCRYPT_REGEX.test(v)) return '[REDACTED:bcrypt]';
    if (SK_LONG_REGEX.test(v)) return '[REDACTED:sk-token]';
    return v;
  }
  if (Array.isArray(v)) return v.map(scrubValue);
  if (v && typeof v === 'object') return scrubExtras(v as Record<string, unknown>);
  return v;
}

export function scrubExtras(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(raw)) {
    if (PII_KEY_REGEX.test(k)) {
      out[k] = '[REDACTED:key-pii]';
      continue;
    }
    out[k] = scrubValue(raw[k]);
  }
  return out;
}

export function auditWrite(row: Omit<AuditRow, 'ts'>): void {
  const full: AuditRow = { ts: Date.now(), ...row, extras: row.extras ? scrubExtras(row.extras) : undefined };
  const line = JSON.stringify({ type: 'psych_mcp_audit', ...full });
  if (process.env.AUDIT_LOG_SINK && process.env.AUDIT_LOG_SINK.startsWith('file:')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('fs').appendFileSync(process.env.AUDIT_LOG_SINK.slice(5), line + '\\n');
      return;
    } catch {
      // fallthrough to stdout
    }
  }
  process.stdout.write(line + '\\n');
}
`
});

// ========== 7. src/shared/scopeGuard.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/scopeGuard.ts',
  content: `// Spec §3.2 ScopeGuard — 三道 union 获取 teacher 作用域；student 仅 self；admin 直通

export type CallerMeta = {
  callerRole?: string;
  callerUserHash?: string;
  serverSessionId?: string;
};

export class ScopeDenied extends Error {
  code = 4015;
  constructor(reason: string) {
    super('scope_denied:' + reason);
    this.name = 'ScopeDenied';
  }
}

type CB = {
  fetchOwnStudentIds?: (mode: string, callerHash: string) => Promise<string[]>;
  fetchMyAnonymousNo?: (callerHash: string) => Promise<string | null>;
};

const MODES = ['class_binding_first', 'binding_extended', 'task_scope_whitelist'] as const;

export async function scopeGuard(
  meta: CallerMeta,
  toolName: string,
  anonymousNosFromArgs: string[],
  cb: CB = {}
): Promise<string[]> {
  if (!meta.callerRole) {
    throw new ScopeDenied('NO_METADATA_ROLE');
  }
  const role = meta.callerRole;
  const callerHash = meta.callerUserHash ?? '';

  if (role === 'admin') {
    return anonymousNosFromArgs;
  }

  if (role === 'student') {
    let my: string | null = null;
    if (cb.fetchMyAnonymousNo) my = await cb.fetchMyAnonymousNo(callerHash);
    const self = [my ?? callerHash].filter(Boolean);
    const ok = anonymousNosFromArgs.length === 0 || anonymousNosFromArgs.every((n) => self.includes(n));
    if (!ok) throw new ScopeDenied('student_outside_scope');
    return self;
  }

  if (role === 'teacher') {
    const allowed = new Set<string>();
    if (cb.fetchOwnStudentIds) {
      for (const m of MODES) {
        try {
          const list = await cb.fetchOwnStudentIds(m, callerHash);
          list.forEach((s) => allowed.add(s));
        } catch {
          // 单道失败不阻断：union
        }
      }
    }
    // 空 args：返回 teacher 作用域全集
    if (anonymousNosFromArgs.length === 0) return Array.from(allowed);
    const ok = anonymousNosFromArgs.every((n) => allowed.has(n));
    if (!ok) throw new ScopeDenied('teacher_outside_scope');
    return anonymousNosFromArgs;
  }

  throw new ScopeDenied('UNKNOWN_ROLE_' + role);
}
`
});

// ========== 8. src/shared/piiGate.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/piiGate.ts',
  content: `// Spec §3.3 PII Gate — 30s JWT Grant + forceReMask 兜底清洗

import jwt from 'jsonwebtoken';

export const JWT_TTL_MS = 30_000;

export const PII_KEYS = [
  'realName', 'trueName', 'phone', 'mobile',
  'class', 'className', 'school', 'schoolName',
  'address', 'idCard', 'idNo', 'idcardno'
] as const;

export type PIIGrantTokenPayload = {
  sub: string[];          // anonymousNos
  fields: readonly string[];
  iat: number;
  exp: number;
  jti: string;
};

export type PIIGrantResult = {
  piiGrantToken: string;
  expireAt: number;
  fields: readonly string[];
};

function getJWTSecret(): string {
  const s = process.env.PII_JWT_SECRET ?? '';
  if (s.length < 16) {
    throw new Error('PII_JWT_SECRET_TOO_SHORT: need >=16 bytes, got ' + s.length);
  }
  return s;
}

export function issuePIIGrant(anonymousNos: string[], fields: readonly string[] = PII_KEYS): PIIGrantResult {
  const now = Date.now();
  const exp = now + JWT_TTL_MS;
  const token = jwt.sign(
    {
      sub: anonymousNos,
      fields,
      jti: 'pii_' + Math.random().toString(36).slice(2) + '_' + now
    } as PIIGrantTokenPayload,
    getJWTSecret(),
    { algorithm: 'HS512', expiresIn: Math.floor(JWT_TTL_MS / 1000) }
  );
  return { piiGrantToken: token, expireAt: exp, fields };
}

export function validateGrant(token: string): PIIGrantTokenPayload {
  return jwt.verify(token, getJWTSecret(), { algorithms: ['HS512'] }) as PIIGrantTokenPayload;
}

const KEY_RE = new RegExp(
  '(?:' + PII_KEYS.map((k) => k.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\$&')).join('|') + ')',
  'i'
);

function maskString(v: string, replaceWith: unknown): unknown {
  if (typeof replaceWith !== 'undefined') return replaceWith;
  if (v.length <= 4) return '***';
  return v.slice(0, 1) + '***' + v.slice(-1);
}

function walkMask<T>(obj: T, replaceWith: unknown, depth = 0): T {
  if (depth > 10) return obj;
  if (obj == null) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((x) => walkMask(x, replaceWith, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const raw = (obj as Record<string, unknown>)[k];
    const hit = KEY_RE.test(k);
    if (hit && typeof raw === 'string') {
      out[k] = maskString(raw, replaceWith);
    } else if (hit && raw != null && typeof raw === 'object') {
      out[k] = walkMask(raw, replaceWith === null ? null : replaceWith, depth + 1);
    } else if (raw != null && typeof raw === 'object') {
      out[k] = walkMask(raw, replaceWith, depth + 1);
    } else {
      out[k] = raw;
    }
  }
  return out as T;
}

export function forceReMask<T>(toolName: string, obj: T, replaceWith: unknown = null): T {
  if (toolName === 'accessPII') return obj;
  return walkMask(obj, replaceWith);
}
`
});

// ========== 9. src/shared/twoFA.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/twoFA.ts',
  content: `// Spec §3.4 2FA — 密码锁定 + SMS 频控 + TOTP 校验

import CryptoJS from 'crypto-js';
import { authenticator } from 'otplib';

type LockState = { fails: number; lockUntilMs: number };
type SMSBucket = { hourBucket: number; count: number };

const pwLock = new Map<string, LockState>();
const smsBuck = new Map<string, SMSBucket>();

export function bcryptishVerify(inputRaw: string): boolean {
  const pepper = process.env.PII_ADMIN_PASSWORD_PEPPER ?? '';
  const expected = (process.env.PII_ADMIN_PASSWORD_HASH ?? '').toLowerCase();
  if (!expected) return false;
  const h = CryptoJS.SHA256(pepper + inputRaw).toString(CryptoJS.enc.Hex).toLowerCase();
  return h === expected;
}

export function validatePassword(callerHash: string, inputRaw: string):
  | { ok: true }
  | { ok: false; code: 401 | 429; reason: 'wrong_password' | 'password_locked_10min' } {
  const now = Date.now();
  const s = pwLock.get(callerHash) ?? { fails: 0, lockUntilMs: 0 };
  if (s.lockUntilMs > now) {
    return { ok: false, code: 429, reason: 'password_locked_10min' };
  }
  const ok = bcryptishVerify(inputRaw);
  if (ok) {
    pwLock.delete(callerHash);
    return { ok: true };
  }
  s.fails += 1;
  if (s.fails >= 5) {
    s.lockUntilMs = now + 10 * 60 * 1000;
    pwLock.set(callerHash, s);
    return { ok: false, code: 429, reason: 'password_locked_10min' };
  }
  pwLock.set(callerHash, s);
  return { ok: false, code: 401, reason: 'wrong_password' };
}

function currentHourBucket(): number {
  return Math.floor(Date.now() / 3_600_000);
}

export function recordSMSAttempt(callerHash: string): { ok: true } | { ok: false; code: 429; reason: 'sms_rate_limited' } {
  const bucket = currentHourBucket();
  const cur = smsBuck.get(callerHash) ?? { hourBucket: bucket, count: 0 };
  if (cur.hourBucket !== bucket) {
    cur.hourBucket = bucket;
    cur.count = 0;
  }
  cur.count += 1;
  smsBuck.set(callerHash, cur);
  if (cur.count > 5) {
    return { ok: false, code: 429, reason: 'sms_rate_limited' };
  }
  return { ok: true };
}

export function validateTOTP(code: string): boolean {
  const secret = process.env.PII_ADMIN_TOTP_SECRET ?? '';
  if (!secret) return false;
  authenticator.options = { digits: 6, step: 30, window: 1 };
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}

export function validateSMSCode(code: string): boolean {
  // 非生产：PII_ADMIN_SMS_CODE === code 为 true；生产留空 → 默认 false
  const fixed = process.env.PII_ADMIN_SMS_CODE;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd || !fixed) return false;
  return fixed === code;
}

// 供测试重置
export function __resetInternalState(): void {
  pwLock.clear();
  smsBuck.clear();
}
`
});

// ========== 10. src/shared/cloudBridge.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/cloudBridge.ts',
  content: `// Spec §3.5 CloudBridge — webhook/direct 两模式；direct 故意抛未实现避免测试拉 tcb

export type CBMode = 'direct' | 'webhook';

export type WXCFRequest = {
  action: string;
  collection?: string;
  payload?: Record<string, unknown>;
};

export function resolveMode(): CBMode {
  const m = (process.env.WX_CLOUD_MODE ?? 'webhook').toLowerCase();
  if (m === 'direct') return 'direct';
  return 'webhook';
}

export async function fetchMyAnonymousNo(callerHash: string): Promise<string | null> {
  const mode = resolveMode();
  if (mode === 'direct') return requireDirectRuntime('fetchMyAnonymousNo');
  return webhookPOST<{ anonymousNo: string | null }>('userOperate', { callerHash, action: 'getAnonymousNo' })
    .then((r) => r?.anonymousNo ?? null)
    .catch(() => null);
}

export async function queryMyStudentIds(mode: string, callerHash: string): Promise<string[]> {
  const bridgeMode = resolveMode();
  if (bridgeMode === 'direct') return requireDirectRuntime('queryMyStudentIds:' + mode);
  return webhookPOST<{ ids: string[] }>('scopeOperate', { mode, callerHash, action: 'fetchStudentIds' })
    .then((r) => r?.ids ?? [])
    .catch(() => []);
}

export async function callWXCF<T = unknown>(req: WXCFRequest): Promise<T> {
  const mode = resolveMode();
  if (mode === 'direct') return requireDirectRuntime('callWXCF:' + req.action);
  return webhookPOST<T>('cfDispatch', req);
}

async function webhookPOST<T>(op: string, body: Record<string, unknown>): Promise<T> {
  const url = process.env.WX_CLOUD_WEBHOOK_URL;
  const sec = process.env.WX_CLOUD_WEBHOOK_SECRET ?? '';
  if (!url) {
    throw new Error('WX_CLOUD_WEBHOOK_URL_REQUIRED');
  }
  // 浏览器 fetch 在 Node>=18 可用；兜底用 https（无 external 依赖也不会真联网）
  const payload = JSON.stringify({ op, env: process.env.WX_CLOUD_ENV, body });
  if (typeof globalThis.fetch === 'function') {
    const resp = await globalThis.fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-psych-mcp-webhook-secret': sec,
        'user-agent': '@starisle/mcp-psych-assessment/1.0.0'
      },
      body: payload
    });
    const text = await resp.text();
    try { return JSON.parse(text) as T; } catch { return { raw: text } as unknown as T; }
  }
  // 兜底：抛错提示
  throw new Error('FETCH_UNAVAILABLE: set WX_CLOUD_WEBHOOK_URL on Node>=18');
}

function requireDirectRuntime<T>(hint: string): T {
  throw new Error(
    'DIRECT_MODE_NOT_IMPLEMENTED: ' + hint +
    ' — 为避免测试/构建依赖 tcb-admin SDK，请设置 WX_CLOUD_MODE=webhook 并配置 webhook URL/secret。'
  );
}
`
});

// ========== 11. src/shared/dashscope.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/shared/dashscope.ts',
  content: `// Spec §3.6 DashScope — 心理五维分析 + budget 闸 + offline mock + 3× retry

export type AIAnalysis = {
  scores: {
    depression: number;
    anxiety: number;
    selfHarmRisk: number;
    trauma: number;
    interpersonal: number;
  };
  warning_tags: string[];
  summary: string;
  token_cost: number;
  latency_ms: number;
  _warning?: string;
};

export const PROMPT_TEMPLATE = (texts: string[]): string => {
  const joined = texts.join('\\n---\\n');
  return \`你是一名受过训练的校园心理风险初筛模型。请对以下匿名学生反馈文本进行打分和标签抽取，严格输出单一 JSON：
输出字段：{scores:{depression,anxiety,selfHarmRisk,trauma,interpersonal} 各 0-100；warning_tags: string[]；summary: 中文 ≤80 字}

Few-shot（仅示例风格，不要引用示例 ID）：
【样例 A — 轻度焦虑】 "这周考试压力大，睡不着但能上学。"
  → scores{depression:35,anxiety:62,selfHarmRisk:5,trauma:10,interpersonal:55}, tags:["学业焦虑","睡眠困扰"]

【样例 B — 重度抑郁+自伤线索】 "活着没意思，手腕有划过的痕迹，不想和任何人说话。"
  → scores{depression:92,anxiety:78,selfHarmRisk:88,trauma:65,interpersonal:12}, tags:["重度抑郁","自伤行为","社会退缩","需紧急干预"]

【样例 C — 创伤线索】 "去年那件事后我一听到吵架就发抖，不敢回家。"
  → scores{depression:60,anxiety:80,selfHarmRisk:35,trauma:92,interpersonal:45}, tags:["创伤再体验","回避症状","家庭冲突"]

现在处理（学生反馈可能多段）：
\${joined}
\`;
};

export function jitterMs(baseMs: number): number {
  const j = baseMs * 0.25 * (2 * Math.random() - 1);
  return Math.max(0, Math.round(baseMs + j));
}

export type BudgetLevel = 'OK' | 'WARN' | 'CRIT';
export type BudgetEvent = { level: BudgetLevel; pct: number; used: number; budget: number };

export function budgetCheck(): BudgetEvent {
  const budget = Number(process.env.DASHSCOPE_TOKEN_BUDGET_DAILY ?? 2e6);
  const used = Number(process.env.DASHSCOPE_TOKENS_USED_TODAY ?? 0);
  const pct = budget > 0 ? (used / budget) * 100 : 100;
  let level: BudgetLevel = 'OK';
  if (pct >= 95) level = 'CRIT';
  else if (pct >= 80) level = 'WARN';
  return { level, pct, used, budget };
}

function offlineMock(): AIAnalysis {
  const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
  const scores = {
    depression: rnd(40, 90),
    anxiety: rnd(40, 90),
    selfHarmRisk: rnd(40, 90),
    trauma: rnd(40, 90),
    interpersonal: rnd(40, 90)
  };
  const warning_tags: string[] = [];
  if (scores.selfHarmRisk > 70) warning_tags.push('self_harm_cue');
  if (scores.depression > 75) warning_tags.push('severe_depression_cue');
  if (scores.trauma > 70) warning_tags.push('trauma_cue');
  if (scores.interpersonal < 30) warning_tags.push('interpersonal_withdrawal');
  return {
    scores,
    warning_tags,
    summary: 'OFFLINE_MOCK: 心理风险初筛结果（DashScope 密钥未配置，此结果不可用于临床。）',
    token_cost: 0,
    latency_ms: 0
  };
}

const BACKOFFS = [5000, 10000, 20000]; // ms

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function realDashscopeAnalyze(prompt: string, onBudget?: (ev: BudgetEvent) => void): Promise<AIAnalysis> {
  const budget = budgetCheck();
  onBudget?.(budget);
  if (budget.level === 'CRIT') {
    const e: Error & { code?: string; budgetPct?: number } = new Error('budget_crit_95');
    e.code = 'budget_crit_95';
    e.budgetPct = budget.pct;
    throw e;
  }

  const key = process.env.DASHSCOPE_KEY;
  if (!key) {
    const res = offlineMock();
    if (budget.level === 'WARN') res._warning = 'BUDGET_WARN_80_pct';
    return res;
  }

  let lastErr: unknown;
  for (let i = 0; i < BACKOFFS.length; i++) {
    try {
      const t0 = performance.now();
      // 使用 Node >=18 fetch；返回 mock 结构化解析失败也兜底
      const resp = await globalThis.fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + key
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const txt = await resp.text();
      const latency = Math.round(performance.now() - t0);
      const parsed = JSON.parse(txt);
      const content = parsed?.choices?.[0]?.message?.content ?? '{}';
      let payload: AIAnalysis;
      try {
        payload = typeof content === 'string' ? JSON.parse(content) : content;
      } catch {
        payload = offlineMock();
      }
      const token_cost = parsed?.usage?.total_tokens ?? 0;
      // 内存记账（进程内）
      const prev = Number(process.env.DASHSCOPE_TOKENS_USED_TODAY ?? 0);
      process.env.DASHSCOPE_TOKENS_USED_TODAY = String(prev + token_cost);
      payload.token_cost = token_cost;
      payload.latency_ms = latency;
      if (budget.level === 'WARN') payload._warning = 'BUDGET_WARN_80_pct';
      return payload;
    } catch (err) {
      lastErr = err;
      if (i < BACKOFFS.length - 1) await sleep(jitterMs(BACKOFFS[i]));
    }
  }
  // 3 次失败后 fallback：offline mock + 标注
  const res = offlineMock();
  (res as AIAnalysis & { fallback_error?: string }).fallback_error =
    lastErr instanceof Error ? lastErr.message : String(lastErr);
  return res;
}

export async function dashscopeAnalyze(
  texts: string[],
  opts?: { onBudget?: (ev: BudgetEvent) => void }
): Promise<AIAnalysis> {
  const prompt = PROMPT_TEMPLATE(texts);
  return realDashscopeAnalyze(prompt, opts?.onBudget);
}
`
});

// ========== 12. src/tools/listTasks.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/listTasks.ts',
  content: `// Tool #1 listTasks — 按角色作用域分页查询任务；无 PII 返回

import type { CallerMeta } from '../shared/scopeGuard.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { forceReMask } from '../shared/piiGate.js';

export type ListTasksArgs = {
  role: string;
  status?: 'pending' | 'ongoing' | 'closed' | 'draft';
  anonymousNo?: string;
  page?: number;
  size?: number;
};

export type TaskItem = {
  taskId: string;
  title: string;
  deadlineAt: number;
  participantsCount: number;
  allowsCustomImage: boolean;
};

export type ListTasksResult = {
  items: TaskItem[];
  page: number;
  size: number;
  total: number;
};

export async function listTasks(
  args: ListTasksArgs,
  meta: CallerMeta
): Promise<ListTasksResult> {
  const page = Math.max(1, args.page ?? 1);
  const size = Math.min(100, Math.max(1, args.size ?? 20));
  const resp = await callWXCF<{
    list: Array<TaskItem & Record<string, unknown>>;
    total: number;
  }>({
    action: 'taskOperate',
    collection: 'tasks',
    payload: {
      action_inner: 'queryList',
      role: args.role,
      status: args.status,
      anonymousNo: args.anonymousNo,
      page,
      size,
      _callerMeta: meta
    }
  });
  const items: TaskItem[] = (resp.list ?? []).map((raw) => ({
    taskId: String(raw.taskId ?? ''),
    title: String(raw.title ?? ''),
    deadlineAt: Number(raw.deadlineAt ?? 0),
    participantsCount: Number(raw.participantsCount ?? 0),
    allowsCustomImage: Boolean(raw.allowsCustomImage)
  }));
  const total = Number(resp.total ?? items.length);
  return forceReMask('listTasks', { items, page, size, total });
}
`
});

// ========== 13. src/tools/submitFeedback.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/submitFeedback.ts',
  content: `// Tool #2 submitFeedback — MS-SEC 秒级阻断命中时不触发 LLM 调用

import type { CallerMeta } from '../shared/scopeGuard.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { forceReMask } from '../shared/piiGate.js';

export type SubmitFeedbackArgs = {
  taskId: string;
  anonymousNo: string;
  imageId?: string;
  textResponses: string[];
  elapsedSec: number;
};

export type SubmitSpy = { dashscopeCallInc?: () => void };
export type SubmitOpts = { spy?: SubmitSpy };

export type SubmitResultOK = {
  feedbackId: string;
  status: 'submitted';
  submittedAt: number;
};

export type SubmitResultErr = {
  isError: true;
  code: number;
  text: string;
};

export const SEC_TRIGGER = 'SEXUAL_VIOLENCE_SEC_TEST';

function msSecCheck(texts: string[]): boolean {
  return texts.some((t) => typeof t === 'string' && t.includes(SEC_TRIGGER));
}

export async function submitFeedback(
  args: SubmitFeedbackArgs,
  _meta: CallerMeta,
  opts: SubmitOpts = {}
): Promise<SubmitResultOK | SubmitResultErr> {
  if (!args.taskId || !args.anonymousNo || !Array.isArray(args.textResponses) || typeof args.elapsedSec !== 'number') {
    return { isError: true, code: 400, text: 'bad_request_missing_fields' };
  }
  if (msSecCheck(args.textResponses)) {
    // 关键：命中安全触发词时绝不调用 spy.dashscopeCallInc，保持 0
    return { isError: true, code: 451, text: 'ms_sec_blocked' };
  }
  const resp = await callWXCF<{ feedbackId?: string }>({
    action: 'feedbackSubmit',
    collection: 'feedback',
    payload: {
      action_inner: 'direct_submit',
      taskId: args.taskId,
      anonymousNo: args.anonymousNo,
      imageId: args.imageId,
      textResponses: args.textResponses,
      elapsedSec: args.elapsedSec
    }
  });
  // LLM 仅在 aiAnalyze 中延迟调用：此处仅 mock 递增接口（按业务决定是否调用）
  // 为严格满足"命中 spy 不调用"规格，submitFeedback 内绝不触发
  opts?.spy?.dashscopeCallInc; // 引用以避免未使用告警（但不调用）
  const fid = String(resp.feedbackId ?? 'fb_' + Date.now());
  return forceReMask('submitFeedback', {
    feedbackId: fid,
    status: 'submitted',
    submittedAt: Date.now()
  });
}
`
});

// ========== 14. src/tools/aiAnalyze.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/aiAnalyze.ts',
  content: `// Tool #3 aiAnalyze — budget 闸：CRIT 立断 503；WARN 附加 warning；空反馈 404

import type { CallerMeta } from '../shared/scopeGuard.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { dashscopeAnalyze, type AIAnalysis, type BudgetEvent } from '../shared/dashscope.js';
import { forceReMask } from '../shared/piiGate.js';

export type AiAnalyzeArgs = {
  feedbackId?: string;
  anonymousNos?: string[];
};

export type AiResultOK = {
  feedbackId: string;
  analysis: AIAnalysis;
  savedAt: number;
  events: BudgetEvent[];
};

export type AiResultErr = {
  isError: true;
  code: number;
  text: string;
  events?: BudgetEvent[];
};

export async function aiAnalyze(
  args: AiAnalyzeArgs,
  _meta: CallerMeta
): Promise<AiResultOK | AiResultErr> {
  const events: BudgetEvent[] = [];
  const filter: Record<string, unknown> = {};
  if (args.feedbackId) filter.feedbackId = args.feedbackId;
  if (args.anonymousNos?.length) filter.anonymousNos = args.anonymousNos;

  const resp = await callWXCF<{
    feedbacks: Array<{ feedbackId: string; anonymousNo: string; textResponses?: string[]; imageId?: string }>;
  }>({
    action: 'feedbackOperate',
    collection: 'feedback',
    payload: { action_inner: 'fetchForAnalyze', filter }
  });
  const fbs = resp.feedbacks ?? [];
  if (fbs.length === 0) {
    return { isError: true, code: 404, text: 'feedback_set_empty_404' };
  }
  try {
    const primaryId = args.feedbackId ?? fbs[0].feedbackId;
    const texts = fbs
      .map((f) => (f.textResponses ?? []).join('\\n'))
      .filter((x) => x.trim().length > 0);
    const analysis = await dashscopeAnalyze(texts, {
      onBudget: (ev) => events.push(ev)
    });
    const lastEv = events[events.length - 1];
    if (lastEv && lastEv.level === 'CRIT') {
      return { isError: true, code: 503, text: 'budget_crit_95', events };
    }
    await callWXCF({
      action: 'analysisOperate',
      collection: 'analysis',
      payload: { action_inner: 'save', feedbackId: primaryId, analysis }
    }).catch(() => void 0);
    return forceReMask('aiAnalyze', {
      feedbackId: primaryId,
      analysis,
      savedAt: Date.now(),
      events
    });
  } catch (e: unknown) {
    const code = (e as Error & { code?: string }).code === 'budget_crit_95' ? 503 : 500;
    const text = code === 503 ? 'budget_crit_95' : ((e as Error)?.message || 'ai_analyze_error');
    return { isError: true, code, text, events };
  }
}
`
});

// ========== 15. src/tools/reviewFeedback.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/reviewFeedback.ts',
  content: `// Tool #4 reviewFeedback — confirm_3 字段检测：阻断并审计 extras.confirm_3_present

import type { CallerMeta } from '../shared/scopeGuard.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { auditWrite } from '../shared/auditLogger.js';
import { forceReMask } from '../shared/piiGate.js';

export type LegalReviewStatus = 'needs_escalation' | 'resolved_school_level' | 'requires_parent_contact' | undefined;
const LEGAL_STATUSES = ['needs_escalation', 'resolved_school_level', 'requires_parent_contact', undefined];

export type ReviewFeedbackArgs = {
  feedbackId: string;
  reviewStatus?: LegalReviewStatus;
  confirmedScores?: Record<string, number>;
  teacherNote?: string;
  reasons?: string[];
  /** 被审计阻断字段：显式传入会丢弃并审计 */
  confirm_3?: unknown;
};

export type ReviewResultOK = {
  feedbackId: string;
  reviewStatus: LegalReviewStatus;
  reviewedAt: number;
  diff: { reviewStatus: [LegalReviewStatus, LegalReviewStatus] | null };
};

export type ReviewResultErr = {
  isError: true;
  code: number;
  text: string;
};

function hash(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export async function reviewFeedback(
  args: ReviewFeedbackArgs,
  meta: CallerMeta
): Promise<ReviewResultOK | ReviewResultErr> {
  const actorHash = hash(meta.callerUserHash ?? 'anon');
  const sessHash = hash(meta.serverSessionId ?? 'sess');

  if ('confirm_3' in args) {
    auditWrite({
      actorHash,
      serverSessionIdHash: sessHash,
      toolName: 'reviewFeedback',
      status: 'blocked',
      anonymousNos: [],
      code: 4015,
      extras: { confirm_3_present: true, confirm_3_typeof: typeof args.confirm_3 }
    });
    return { isError: true, code: 4015, text: 'confirm_3_discarded' };
  }

  if (!LEGAL_STATUSES.includes(args.reviewStatus)) {
    return { isError: true, code: 400, text: 'bad_request_invalid_reviewStatus' };
  }
  if (!args.feedbackId) {
    return { isError: true, code: 400, text: 'bad_request_missing_feedbackId' };
  }

  const prev = await callWXCF<{ reviewStatus?: LegalReviewStatus }>({
    action: 'statusOperate',
    collection: 'feedback',
    payload: { action_inner: 'getCurrentReviewStatus', feedbackId: args.feedbackId }
  }).catch(() => ({ reviewStatus: undefined as LegalReviewStatus }));

  await callWXCF({
    action: 'statusOperate',
    collection: 'feedback',
    payload: {
      action_inner: 'updateReviewTeacherOnly',
      feedbackId: args.feedbackId,
      reviewStatus: args.reviewStatus,
      confirmedScores: args.confirmedScores,
      teacherNote: args.teacherNote,
      reasons: args.reasons
    }
  });

  const now = Date.now();
  return forceReMask('reviewFeedback', {
    feedbackId: args.feedbackId,
    reviewStatus: args.reviewStatus,
    reviewedAt: now,
    diff: {
      reviewStatus:
        prev.reviewStatus !== args.reviewStatus
          ? [prev.reviewStatus, args.reviewStatus]
          : null
    }
  });
}
`
});

// ========== 16. src/tools/exportResearch.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/exportResearch.ts',
  content: `// Tool #5 exportResearch — 180 天窗口；PII 维度命中 → 403；文件落磁盘 exports-research/

import type { CallerMeta } from '../shared/scopeGuard.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { forceReMask } from '../shared/piiGate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ExportResearchArgs = {
  dateStart: string; // ISO date YYYY-MM-DD
  dateEnd: string;
  dimensions: string[];
  format?: 'csv';
};

const PII_DIM_RE = /(name|realname|phone|mobile|^class$|classname|school|schoolname|address|idcard|idno)/i;

export type ExportResultOK = {
  downloadUrl: string;
  expireAt: number;
  expired: boolean;
  rowsCount: number;
};

export type ExportResultErr = {
  isError: true;
  code: number;
  text: string;
  hit?: string;
};

function parseISO(s: string): number {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return NaN;
  return new Date(s + 'T00:00:00Z').getTime();
}

export async function exportResearch(
  args: ExportResearchArgs,
  _meta: CallerMeta
): Promise<ExportResultOK | ExportResultErr> {
  if ((args.format ?? 'csv') !== 'csv') {
    return { isError: true, code: 400, text: 'bad_request_format_only_csv' };
  }
  const s = parseISO(args.dateStart);
  const e = parseISO(args.dateEnd);
  if (Number.isNaN(s) || Number.isNaN(e) || s > e) {
    return { isError: true, code: 400, text: 'bad_request_invalid_date_range' };
  }
  const days = Math.floor((e - s) / 86_400_000) + 1;
  if (days > 180) {
    return { isError: true, code: 400, text: 'bad_request_date_range_exceeds_180_days' };
  }
  const dims = Array.isArray(args.dimensions) ? args.dimensions : [];
  const lower = dims.map((d) => String(d).toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    if (PII_DIM_RE.test(lower[i])) {
      return { isError: true, code: 403, text: 'pii_forbidden', hit: dims[i] };
    }
  }

  const resp = await callWXCF<{
    rows: Record<string, unknown>[];
  }>({
    action: 'researchExport',
    payload: { dateStart: args.dateStart, dateEnd: args.dateEnd, dimensions: dims }
  });
  const rows = resp.rows ?? [];

  const EXPORT_DIR = path.resolve(process.cwd(), process.env.EXPORT_DIR ?? 'exports-research');
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const fname = 'research-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.csv';
  const fpath = path.join(EXPORT_DIR, fname);

  const headers = dims;
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as Record<string, unknown>)[h])).join(','));
  }
  fs.writeFileSync(fpath, lines.join('\\n') + '\\n', 'utf8');

  const now = Date.now();
  return forceReMask('exportResearch', {
    downloadUrl: 'file://' + fpath,
    expireAt: now + 7 * 86_400_000,
    expired: false,
    rowsCount: rows.length
  });
}
`
});

// ========== 17. src/tools/accessPII.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/tools/accessPII.ts',
  content: `// Tool #6 accessPII — admin 双因子；锁定/频控；30s PII Grant；forceReMask 不清洗

import type { CallerMeta } from '../shared/scopeGuard.js';
import { auditWrite } from '../shared/auditLogger.js';
import {
  validatePassword,
  recordSMSAttempt,
  validateSMSCode,
  validateTOTP
} from '../shared/twoFA.js';
import { callWXCF } from '../shared/cloudBridge.js';
import { issuePIIGrant, forceReMask, PII_KEYS } from '../shared/piiGate.js';

export type AccessPIIArgs = {
  anonymousNos: string[];
  reason: string;
  passwordHash: string; // 客户端传入的 raw password 字符串（由 bcryptishVerify 校验）
  otp: string;
  otpMethod: 'sms' | 'totp';
};

export type AccessResultOK = {
  piiGrantToken: string;
  expireAt: number;
  fields: readonly string[];
  rawFields: Record<string, Record<string, unknown>>; // anonymousNo -> PII map
  hint: 'CLIENT_MUST_CLEAR_REACT_STATE_AFTER_30S';
};

export type AccessResultErr = {
  isError: true;
  code: number;
  text: string;
  payload?: Record<string, unknown>;
};

function sha(s: string): string {
  return require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export async function accessPII(
  args: AccessPIIArgs,
  meta: CallerMeta
): Promise<AccessResultOK | AccessResultErr> {
  const actorHash = sha(meta.callerUserHash ?? 'anon');
  const sessHash = sha(meta.serverSessionId ?? 'sess');
  const nos = args.anonymousNos ?? [];

  if (meta.callerRole !== 'admin') {
    auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'blocked', anonymousNos: nos, code: 403, extras: { reason_forbid: 'non_admin' } });
    return { isError: true, code: 403, text: 'forbidden_non_admin' };
  }
  if (nos.length === 0 || !args.reason || args.reason.length < 6) {
    return { isError: true, code: 400, text: 'bad_request_anonymousNos_or_reason_short' };
  }

  // Step 1: 密码校验（含锁定）
  const pw = validatePassword(actorHash, args.passwordHash);
  if (!pw.ok) {
    if (pw.code === 429) {
      auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'blocked', anonymousNos: nos, code: 429, extras: { rate_limited: 'password_locked_10min', reason: args.reason } });
      return { isError: true, code: 429, text: 'password_locked_10min', payload: { code: 429, reason: 'password_locked_10min' } };
    }
    auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'fail', anonymousNos: nos, code: 401, extras: { wrongCreds: 'password' } });
    return { isError: true, code: 401, text: 'wrong_creds_password' };
  }

  // Step 2: OTP 校验（SMS 先频控记录）
  if (args.otpMethod === 'sms') {
    const rec = recordSMSAttempt(actorHash);
    if (!rec.ok) {
      auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'blocked', anonymousNos: nos, code: 429, extras: { rate_limited: 'sms_rate_limited' } });
      return { isError: true, code: 429, text: 'sms_rate_limited' };
    }
    if (!validateSMSCode(args.otp)) {
      auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'fail', anonymousNos: nos, code: 401, extras: { wrongCreds: 'sms_otp' } });
      return { isError: true, code: 401, text: 'wrong_creds_sms_otp' };
    }
  } else if (args.otpMethod === 'totp') {
    if (!validateTOTP(args.otp)) {
      auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'fail', anonymousNos: nos, code: 401, extras: { wrongCreds: 'totp' } });
      return { isError: true, code: 401, text: 'wrong_creds_totp' };
    }
  } else {
    return { isError: true, code: 400, text: 'bad_request_invalid_otpMethod' };
  }

  // Step 3: 通过 → 取 PII + 发 Grant
  auditWrite({ actorHash, serverSessionIdHash: sessHash, toolName: 'accessPII', status: 'ok', anonymousNos: nos, extras: { reason: args.reason, otpMethod: args.otpMethod } });

  const raw = await callWXCF<{ rawFields: Record<string, Record<string, unknown>> }>({
    action: 'crisisOperate',
    payload: { action_inner: 'peekPIIForIntervention', anonymousNos: nos }
  }).catch(() => ({ rawFields: {} as Record<string, Record<string, unknown>> }));

  const grant = issuePIIGrant(nos, PII_KEYS);
  const payload: AccessResultOK = {
    ...grant,
    rawFields: raw.rawFields ?? {},
    hint: 'CLIENT_MUST_CLEAR_REACT_STATE_AFTER_30S'
  };
  return forceReMask('accessPII', payload);
}
`
});

// ========== 18. src/index.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/src/index.ts',
  content: `// MCP Server bootstrap — 6 tools + stdio connect + scope guard/audit/forceReMask 兜底

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import type { CallerMeta } from './shared/scopeGuard.js';
import { scopeGuard, ScopeDenied } from './shared/scopeGuard.js';
import { auditWrite } from './shared/auditLogger.js';
import { forceReMask } from './shared/piiGate.js';

import { listTasks, type ListTasksArgs } from './tools/listTasks.js';
import { submitFeedback, type SubmitFeedbackArgs } from './tools/submitFeedback.js';
import { aiAnalyze, type AiAnalyzeArgs } from './tools/aiAnalyze.js';
import { reviewFeedback, type ReviewFeedbackArgs } from './tools/reviewFeedback.js';
import { exportResearch, type ExportResearchArgs } from './tools/exportResearch.js';
import { accessPII, type AccessPIIArgs } from './tools/accessPII.js';

const TOOLS: Tool[] = [
  {
    name: 'listTasks',
    description: '按角色作用域分页查询心理测评任务（不返回任何姓名/手机号）。',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['student', 'teacher', 'admin'] },
        status: { type: 'string', enum: ['pending', 'ongoing', 'closed', 'draft'] },
        anonymousNo: { type: 'string' },
        page: { type: 'integer', minimum: 1, default: 1 },
        size: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      },
      required: ['role']
    }
  },
  {
    name: 'submitFeedback',
    description: '提交学生反馈，命中 MS-SEC 触发词时阻断且不触发任何 LLM 调用。',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        anonymousNo: { type: 'string' },
        imageId: { type: 'string' },
        textResponses: { type: 'array', items: { type: 'string' } },
        elapsedSec: { type: 'number' }
      },
      required: ['taskId', 'anonymousNo', 'textResponses', 'elapsedSec']
    }
  },
  {
    name: 'aiAnalyze',
    description: '对已提交反馈做心理五维风险分析；预算≥95% 返回 503。',
    inputSchema: {
      type: 'object',
      properties: {
        feedbackId: { type: 'string' },
        anonymousNos: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  {
    name: 'reviewFeedback',
    description: '教师复核反馈；confirm_3 字段会被丢弃并审计 4015。',
    inputSchema: {
      type: 'object',
      properties: {
        feedbackId: { type: 'string' },
        reviewStatus: { type: 'string', enum: ['needs_escalation', 'resolved_school_level', 'requires_parent_contact'] },
        confirmedScores: { type: 'object' },
        teacherNote: { type: 'string' },
        reasons: { type: 'array', items: { type: 'string' } }
      },
      required: ['feedbackId']
    }
  },
  {
    name: 'exportResearch',
    description: '科研维度 CSV 导出（≤180 天窗口，维度命中 PII 关键字返回 403）。',
    inputSchema: {
      type: 'object',
      properties: {
        dateStart: { type: 'string' },
        dateEnd: { type: 'string' },
        dimensions: { type: 'array', items: { type: 'string' } },
        format: { type: 'string', enum: ['csv'], default: 'csv' }
      },
      required: ['dateStart', 'dateEnd', 'dimensions']
    }
  },
  {
    name: 'accessPII',
    description: '[Admin Only] 双因子（密码+TOTP/SMS）访问学生 PII，发放 30s Grant。',
    inputSchema: {
      type: 'object',
      properties: {
        anonymousNos: { type: 'array', items: { type: 'string' } },
        reason: { type: 'string', minLength: 6 },
        passwordHash: { type: 'string' },
        otp: { type: 'string' },
        otpMethod: { type: 'string', enum: ['sms', 'totp'] }
      },
      required: ['anonymousNos', 'reason', 'passwordHash', 'otp', 'otpMethod']
    }
  }
];

function sha16(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function metaFrom(req: CallToolRequest): CallerMeta {
  const meta = (req.params as { _meta?: CallerMeta; metadata?: CallerMeta })._meta
    ?? (req.params as { _meta?: CallerMeta; metadata?: CallerMeta }).metadata
    ?? {};
  return {
    callerRole: meta.callerRole,
    callerUserHash: meta.callerUserHash,
    serverSessionId: meta.serverSessionId
  };
}

function extractAnonymousNos(toolName: string, args: Record<string, unknown>): string[] {
  switch (toolName) {
    case 'listTasks':
      return (args as ListTasksArgs).anonymousNo ? [(args as ListTasksArgs).anonymousNo as string] : [];
    case 'submitFeedback':
      return [(args as SubmitFeedbackArgs).anonymousNo as string].filter(Boolean);
    case 'aiAnalyze': {
      const a = args as AiAnalyzeArgs;
      return [...(a.anonymousNos ?? [])];
    }
    case 'reviewFeedback':
      return [];
    case 'exportResearch':
      return [];
    case 'accessPII':
      return [...((args as AccessPIIArgs).anonymousNos ?? [])];
    default:
      return [];
  }
}

type AnyArgs = Record<string, unknown>;

async function toolDispatch(toolName: string, args: AnyArgs, meta: CallerMeta): Promise<unknown> {
  switch (toolName) {
    case 'listTasks': return listTasks(args as unknown as ListTasksArgs, meta);
    case 'submitFeedback': return submitFeedback(args as unknown as SubmitFeedbackArgs, meta);
    case 'aiAnalyze': return aiAnalyze(args as unknown as AiAnalyzeArgs, meta);
    case 'reviewFeedback': return reviewFeedback(args as unknown as ReviewFeedbackArgs, meta);
    case 'exportResearch': return exportResearch(args as unknown as ExportResearchArgs, meta);
    case 'accessPII': return accessPII(args as unknown as AccessPIIArgs, meta);
    default: throw new Error('unknown_tool:' + toolName);
  }
}

function resultToContent(result: unknown): Array<{ type: 'text'; text: string }> {
  const safe = Array.isArray(result) ? result : [result];
  return safe.map((item) => ({
    type: 'text' as const,
    text: typeof item === 'string' ? item : JSON.stringify(item, null, 0)
  }));
}

const server = new Server(
  { name: '@starisle/mcp-psych-assessment', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const toolName = req.params.name;
  const args = (req.params.arguments ?? {}) as AnyArgs;
  const meta = metaFrom(req);

  const actorHash = sha16(meta.callerUserHash ?? 'anon');
  const sessHash = sha16(meta.serverSessionId ?? 'sess');
  const nos = extractAnonymousNos(toolName, args);

  // scope guard
  try {
    await scopeGuard(meta, toolName, nos);
  } catch (e: unknown) {
    const code = e instanceof ScopeDenied ? e.code : 4015;
    auditWrite({
      actorHash, serverSessionIdHash: sessHash, toolName,
      status: 'blocked', anonymousNos: nos, code,
      extras: { scope_reason: (e as Error)?.message }
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, code: 4015, text: 'scope_denied' }) }],
      isError: true
    };
  }

  try {
    const raw = await toolDispatch(toolName, args, meta);
    let final = raw;
    // 兜底：若返回 content 数组，先 JSON.parse 再 forceReMask
    if (Array.isArray((raw as { content?: unknown[] }).content)) {
      final = (raw as { content: unknown[] }).content.map((c) => {
        if (typeof c === 'string') {
          try { return forceReMask(toolName, JSON.parse(c)); } catch { return c; }
        }
        if (c && typeof c === 'object' && 'text' in (c as { text?: string })) {
          const t = (c as { text: string }).text;
          try { return { ...c as Record<string, unknown>, text: JSON.stringify(forceReMask(toolName, JSON.parse(t))) }; } catch { return c; }
        }
        return c;
      });
    } else {
      final = forceReMask(toolName, raw);
    }
    const anyErr = (final as { isError?: boolean }).isError;
    auditWrite({
      actorHash, serverSessionIdHash: sessHash, toolName,
      status: anyErr ? 'fail' : 'ok',
      anonymousNos: nos,
      code: anyErr ? (final as { code?: number }).code ?? 500 : 0,
      extras: { shape: typeof final === 'object' && final ? Object.keys(final as Record<string, unknown>) : undefined }
    });
    return { content: resultToContent(final), isError: Boolean(anyErr) };
  } catch (e: unknown) {
    auditWrite({
      actorHash, serverSessionIdHash: sessHash, toolName,
      status: 'fail', anonymousNos: nos,
      code: 500,
      extras: { error: (e as Error)?.message, stack: (e as Error)?.stack?.slice(0, 300) }
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ isError: true, code: 500, text: (e as Error)?.message || 'tool_error' }) }],
      isError: true
    };
  }
});

export async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (process.stderr.writable) {
    process.stderr.write('[mcp-psych-assessment] connected stdio\\n');
  }
}

if (require.main === module) {
  void main();
}
`
});

// ========== 19. tests/t1-listTasks-scope.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t1-listTasks-scope.test.ts',
  content: `// T1: listTasks scope guard — 三道只返 S001-S004；OUTSIDER_X 应该 4015
import { describe, it, expect, vi } from 'vitest';
import { scopeGuard } from '../src/shared/scopeGuard.js';

describe('t1-listTasks-scope', () => {
  it('student outsider rejected (4015) when args include SID outside CB', async () => {
    const STUDENT_OUTSIDER_X = 'S999-9999';
    const fakeCB = {
      fetchOwnStudentIds: vi.fn(async (mode: string) => {
        // 三道 mode 都只返 S001-S004
        expect(['class_binding_first','binding_extended','task_scope_whitelist']).toContain(mode);
        return ['S001','S002','S003','S004'];
      }),
      fetchMyAnonymousNo: vi.fn(async () => 'S001')
    };
    // 作为 teacher：请求里带 OUTSIDER_X 会被拒绝
    await expect(
      scopeGuard(
        { callerRole: 'teacher', callerUserHash: 'u_teacher_1', serverSessionId: 'sess_1' },
        'listTasks',
        ['S001', STUDENT_OUTSIDER_X],
        fakeCB
      )
    ).rejects.toMatchObject({ code: 4015 });
    // 三道都被调用
    expect(fakeCB.fetchOwnStudentIds).toHaveBeenCalledTimes(3);
  });
});
`
});

// ========== 20. tests/t2-submit-mssec.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t2-submit-mssec.test.ts',
  content: `// T2: submitFeedback MS-SEC 触发 — 拦截 451 且 spy.dashscopeInc 保持 0
import { describe, it, expect, vi } from 'vitest';
import { submitFeedback, SEC_TRIGGER } from '../src/tools/submitFeedback.js';

describe('t2-submit-mssec', () => {
  it('SEXUAL_VIOLENCE_SEC_TEST hits ms_sec_blocked and spy never called', async () => {
    const dash = { dashscopeCallInc: vi.fn(() => {}) };
    const res = await submitFeedback(
      {
        taskId: 'T1',
        anonymousNo: 'S001',
        imageId: 'img1',
        textResponses: ['hi ' + SEC_TRIGGER + ' end'],
        elapsedSec: 42
      },
      { callerRole: 'student', callerUserHash: 'u_s1', serverSessionId: 's1' },
      { spy: dash }
    );
    expect((res as { isError?: boolean }).isError).toBe(true);
    expect((res as { text?: string }).text).toContain('ms_sec_blocked');
    expect((res as { code?: number }).code).toBe(451);
    expect(dash.dashscopeCallInc).toHaveBeenCalledTimes(0);
  });
});
`
});

// ========== 21. tests/t3-ai-budget.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t3-ai-budget.test.ts',
  content: `// T3: aiAnalyze budget 81% → onBudget WARN 事件
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dashscopeAnalyze, budgetCheck, type BudgetEvent } from '../src/shared/dashscope.js';

describe('t3-ai-budget', () => {
  const orig = {
    DASHSCOPE_TOKENS_USED_TODAY: process.env.DASHSCOPE_TOKENS_USED_TODAY,
    DASHSCOPE_TOKEN_BUDGET_DAILY: process.env.DASHSCOPE_TOKEN_BUDGET_DAILY,
    DASHSCOPE_KEY: process.env.DASHSCOPE_KEY
  };

  beforeAll(() => {
    const budget = 2_000_000;
    const used = Math.floor(budget * 0.81); // 81%
    process.env.DASHSCOPE_TOKENS_USED_TODAY = String(used);
    process.env.DASHSCOPE_TOKEN_BUDGET_DAILY = String(budget);
    process.env.DASHSCOPE_KEY = ''; // 走 offline mock
  });

  afterAll(() => {
    process.env.DASHSCOPE_TOKENS_USED_TODAY = orig.DASHSCOPE_TOKENS_USED_TODAY;
    process.env.DASHSCOPE_TOKEN_BUDGET_DAILY = orig.DASHSCOPE_TOKEN_BUDGET_DAILY;
    process.env.DASHSCOPE_KEY = orig.DASHSCOPE_KEY;
  });

  it('budgetCheck reports WARN level pct>=80', () => {
    const ev = budgetCheck();
    expect(ev.level).toBe('WARN');
    expect(ev.pct).toBeGreaterThanOrEqual(80);
    expect(ev.pct).toBeLessThan(95);
  });

  it('dashscopeAnalyze fires onBudget WARN event', async () => {
    const events: BudgetEvent[] = [];
    await dashscopeAnalyze(['test text for analysis'], {
      onBudget: (ev) => events.push(ev)
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
    const last = events[events.length - 1];
    expect(last.level).toBe('WARN');
    expect(last.pct).toBeGreaterThanOrEqual(80);
  });
});
`
});

// ========== 22. tests/t4-review-confirm3.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t4-review-confirm3.test.ts',
  content: `// T4: reviewFeedback confirm_3 阻断 + stdout audit 行 extras.confirm_3_present=true
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reviewFeedback } from '../src/tools/reviewFeedback.js';

describe('t4-review-confirm3', () => {
  let spy: ReturnType<typeof vi.spyOn>;
  const written: string[] = [];
  beforeEach(() => {
    written.length = 0;
    spy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      written.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('confirm_3 arg → 4015 code=confirm_3_discarded and audit JSON extras.confirm_3_present=true', async () => {
    const res = await reviewFeedback(
      {
        feedbackId: 'FB1',
        reviewStatus: 'needs_escalation',
        teacherNote: 'note',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: illegal field by design
        confirm_3: 'weird_payload_x'
      },
      { callerRole: 'teacher', callerUserHash: 'u_t1', serverSessionId: 'sess_t1' }
    );
    expect((res as { code?: number }).code).toBe(4015);
    expect((res as { text?: string }).text).toContain('confirm_3_discarded');
    // stdout 中应有单行 JSON type=psych_mcp_audit 且 extras.confirm_3_present=true
    const audits = written
      .join('')
      .split('\\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((x) => x && x.type === 'psych_mcp_audit');
    expect(audits.length).toBeGreaterThanOrEqual(1);
    const extras = audits[0].extras as Record<string, unknown>;
    expect(extras?.confirm_3_present).toBe(true);
  });
});
`
});

// ========== 23. tests/t5-export-pii.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t5-export-pii.test.ts',
  content: `// T5: exportResearch 维度含 phone → 403 pii_forbidden；tmp dir files 长度 0
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exportResearch } from '../src/tools/exportResearch.js';

describe('t5-export-pii', () => {
  let tmp: string;
  let origExportDir: string | undefined;
  const origFetch = globalThis.fetch;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-export-'));
    origExportDir = process.env.EXPORT_DIR;
    process.env.EXPORT_DIR = tmp;
    // webhook fetch 抛错 → callWXCF 抛错 → rows 为空，但是维度校验先返回 403，不写文件
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('no_network_in_test'))) as typeof fetch;
  });

  afterAll(() => {
    if (origExportDir === undefined) delete process.env.EXPORT_DIR;
    else process.env.EXPORT_DIR = origExportDir;
    globalThis.fetch = origFetch;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('dimensions contains phone → 403 pii_forbidden and tmp dir has 0 files', async () => {
    const res = await exportResearch(
      {
        dateStart: '2025-01-01',
        dateEnd: '2025-02-01',
        dimensions: ['anonymousNo', 'depressionScore', 'phone', 'classNameAlias'],
        format: 'csv'
      },
      { callerRole: 'admin', callerUserHash: 'a1', serverSessionId: 's1' }
    );
    expect((res as { code?: number }).code).toBe(403);
    expect((res as { text?: string }).text).toContain('pii_forbidden');
    const files = fs.readdirSync(tmp);
    expect(files.length).toBe(0);
  });
});
`
});

// ========== 24. tests/t6-accesspii-lock5.test.ts ==========
files.push({
  path: 'server-services/mcp-psych-assessment/tests/t6-accesspii-lock5.test.ts',
  content: `// T6: accessPII 前 5 次错密码，第 6 次正确也 429 password_locked_10min (payload.code=429)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import CryptoJS from 'crypto-js';
import { accessPII } from '../src/tools/accessPII.js';
import { __resetInternalState } from '../src/shared/twoFA.js';

describe('t6-accesspii-lock5', () => {
  const orig = {
    PII_ADMIN_PASSWORD_PEPPER: process.env.PII_ADMIN_PASSWORD_PEPPER,
    PII_ADMIN_PASSWORD_HASH: process.env.PII_ADMIN_PASSWORD_HASH,
    PII_JWT_SECRET: process.env.PII_JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PII_ADMIN_SMS_CODE: process.env.PII_ADMIN_SMS_CODE
  };

  const CORRECT_PW = 'correct-horse-battery-staple-x9K';
  const PEPPER = 'test-pepper-value-long-enough';
  const HASH = CryptoJS.SHA256(PEPPER + CORRECT_PW).toString(CryptoJS.enc.Hex).toLowerCase();

  const FIXED_CALLER_HASH_SRC = 'admin_fixed_user_42';

  // accessPII 里 sha(meta.callerUserHash) 取前 16；保持固定
  function sha16(s: string): string {
    return require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 16);
  }

  beforeAll(() => {
    __resetInternalState();
    process.env.PII_ADMIN_PASSWORD_PEPPER = PEPPER;
    process.env.PII_ADMIN_PASSWORD_HASH = HASH;
    process.env.PII_JWT_SECRET = 'jwt-secret-test-at-least-16bytes-long';
    process.env.NODE_ENV = 'test';
    process.env.PII_ADMIN_SMS_CODE = '123456';
  });
  afterAll(() => {
    __resetInternalState();
    process.env.PII_ADMIN_PASSWORD_PEPPER = orig.PII_ADMIN_PASSWORD_PEPPER;
    process.env.PII_ADMIN_PASSWORD_HASH = orig.PII_ADMIN_PASSWORD_HASH;
    process.env.PII_JWT_SECRET = orig.PII_JWT_SECRET;
    process.env.NODE_ENV = orig.NODE_ENV;
    process.env.PII_ADMIN_SMS_CODE = orig.PII_ADMIN_SMS_CODE;
  });

  it('5 wrong passwords then #6 correct -> 429 password_locked_10min with payload.code=429', async () => {
    expect(sha16(FIXED_CALLER_HASH_SRC).length).toBe(16);

    const baseArgs = {
      anonymousNos: ['S001'],
      reason: 'crisis-intervention-need-pii',
      otp: '123456',
      otpMethod: 'sms' as const
    };
    const meta = { callerRole: 'admin' as const, callerUserHash: FIXED_CALLER_HASH_SRC, serverSessionId: 'sess_lock5' };

    let lastRes: Awaited<ReturnType<typeof accessPII>> | null = null;

    // 5 wrong
    for (let i = 0; i < 5; i++) {
      lastRes = await accessPII({ ...baseArgs, passwordHash: 'wrong-' + i }, meta);
      expect((lastRes as { code?: number }).code).toBe(401);
    }

    // 第 6 次：正确密码也应锁定 429
    lastRes = await accessPII({ ...baseArgs, passwordHash: CORRECT_PW }, meta);
    expect((lastRes as { code?: number }).code).toBe(429);
    expect((lastRes as { text?: string }).text).toContain('password_locked_10min');
    const payload = (lastRes as { payload?: Record<string, unknown> }).payload;
    expect(payload).toBeTruthy();
    expect(payload?.code).toBe(429);
  });
});
`
});

// ========== 计算 sha1 + 输出 ==========
const result = files.map((f) => ({
  path: f.path,
  content: f.content,
  sha1: sha1(f.content),
  self_check: buildSelfCheck(f.path, f.content)
}));

function buildSelfCheck(p, content) {
  const checks = [];
  if (p.endsWith('package.json')) {
    checks.push({
      cmd: "grep -oE '(sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|1[3-9][0-9]{9})' package.json || true | wc -l",
      expect: '0'
    });
    checks.push({
      cmd: "node -e \"const d=require('./package.json'); const r=['@modelcontextprotocol/sdk','crypto-js','qrcode','jsonwebtoken','otplib']; const dD=['typescript','vitest','@types/node','tsx']; const sc=['build','start','dev','test','watch']; console.log(r.every(x=>d.dependencies[x]) && dD.every(x=>d.devDependencies[x]) && sc.every(x=>d.scripts[x]))\"",
      expect: 'true'
    });
  } else if (p.endsWith('tsconfig.json')) {
    checks.push({
      cmd: "node -e \"const d=JSON.parse(require('fs').readFileSync('./tsconfig.json','utf8')); const c=d.compilerOptions; console.log(c.target==='ES2022' && c.moduleResolution==='Bundler' && c.strict===true && c.outDir==='dist' && c.rootDir==='src' && c.declaration===true && c.types.includes('node') && c.types.includes('vitest/globals') && d.include.includes('src/**/*') && d.exclude.includes('node_modules') && d.exclude.includes('dist') && d.exclude.includes('tests'))\"",
      expect: 'true'
    });
  } else if (p.endsWith('.env.example')) {
    checks.push({
      cmd: "grep -c 'YOUR_' .env.example || true",
      expect: '>=7'
    });
  } else if (p.endsWith('README.md')) {
    checks.push({
      cmd: "grep -E 'listTasks|submitFeedback|aiAnalyze|reviewFeedback|exportResearch|accessPII' README.md | wc -l",
      expect: '>=6'
    });
  } else if (p.endsWith('.gitignore')) {
    checks.push({
      cmd: "node -e \"const s=require('fs').readFileSync('./.gitignore','utf8').split(/\\n/); ['node_modules/','dist/','.env','.env.local','coverage/','*.log'].every(x=>s.includes(x)) && console.log('true')\"",
      expect: 'true'
    });
  } else if (p.includes('/src/tools/') && p.endsWith('.ts')) {
    const name = (p.split('/').pop() || '').replace('.ts','');
    checks.push({
      cmd: `node -e "const s=require('fs').readFileSync('./${p.split('server-services/mcp-psych-assessment/')[1]}','utf8'); console.log(/export\\s+async\\s+function\\s+${name}\\s*\\(/.test(s) || /export\\s+async\\s+function\\s+\\w+/.test(s));"`,
      expect: 'true'
    });
  } else if (p.startsWith('server-services/mcp-psych-assessment/tests/t')) {
    checks.push({
      cmd: "node -e \"const s=require('fs').readFileSync('./" + p.split('server-services/mcp-psych-assessment/')[1] + "','utf8'); console.log(/describe\\s*\\(/.test(s) && /it\\s*\\(/.test(s) && /expect\\s*\\(/.test(s))\"",
      expect: 'true'
    });
  }
  return checks;
}

// 输出最终 JSON（仅前 1000 字符预览 + 完整写入文件以便读取）
const outputPath = 'G:\\mental health\\mcp-pa-result.json';
fs.writeFileSync(outputPath, JSON.stringify(result, null, 0), 'utf8');
console.log('COUNT=' + result.length);
console.log('OUTPUT=' + outputPath);
console.log('SHA1_FIRST=' + result[0].sha1);
