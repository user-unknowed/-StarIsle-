// src/shared/dashscope.ts
// DashScope 调用：3 次 5/10/20s ±25% 指数退避 + 抖动。
// tokenBudget.check(tokenCount, 80% WARN, 95% ERROR)。
// callCount 记录便于 t2 验证。

export type TokenBudgetLevel = 'OK' | 'WARN' | 'ERROR';

export interface TokenBudgetResult {
  level: TokenBudgetLevel;
  ratio: number; // 已用/上限
}

const TOKEN_BUDGET_MAX = 1_000_000; // 预算上限 token 数（示例）

export class TokenBudget {
  used = 0;
  max = TOKEN_BUDGET_MAX;
  warnRatio = 0.8;
  errorRatio = 0.95;

  constructor(opts?: { max?: number; warnRatio?: number; errorRatio?: number }) {
    if (opts?.max) this.max = opts.max;
    if (opts?.warnRatio !== undefined) this.warnRatio = opts.warnRatio;
    if (opts?.errorRatio !== undefined) this.errorRatio = opts.errorRatio;
  }

  check(tokenCount: number): TokenBudgetResult {
    this.used += tokenCount;
    const ratio = this.used / this.max;
    if (ratio >= this.errorRatio) return { level: 'ERROR', ratio };
    if (ratio >= this.warnRatio) return { level: 'WARN', ratio };
    return { level: 'OK', ratio };
  }

  reset(): void {
    this.used = 0;
  }
}

// 单例预算器，便于 t3 验证 81% WARN
export const tokenBudget = new TokenBudget();

// 退避序列：5s / 10s / 20s，±25% 抖动
const BASE_BACKOFFS_MS = [5000, 10000, 20000];

function jitter(base: number): number {
  // ±25%
  const delta = base * 0.25;
  return base + (Math.random() * 2 - 1) * delta;
}

export interface DashScopeCallResult {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

export interface DashScopeOptions {
  maxRetries?: number; // 默认 3
  fetch?: FetchFn;
}

export type FetchFn = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<Record<string, unknown>> }>;

export interface DashScopeClient {
  callCount: number;
  retry<T>(
    fn: () => Promise<T>,
    opts?: { maxRetries?: number; onError?: (e: unknown, attempt: number) => void },
  ): Promise<T>;
  call(prompt: string, opts?: DashScopeOptions): Promise<DashScopeCallResult>;
}

export class DashScope implements DashScopeClient {
  callCount = 0;
  private fetchImpl?: FetchFn;

  constructor(opts?: DashScopeOptions) {
    this.fetchImpl = opts?.fetch;
  }

  private getFetch(): FetchFn | undefined {
    return this.fetchImpl || (globalThis as unknown as { fetch?: FetchFn }).fetch;
  }

  /**
   * retry：指数退避 5/10/20s ±25%。第 1 次失败后等 5s，第 2 次 10s，第 3 次 20s。
   * 总共最多尝试 maxRetries+1 次（默认 4 次：1 次初始 + 3 次重试）。
   */
  async retry<T>(
    fn: () => Promise<T>,
    opts?: { maxRetries?: number; onError?: (e: unknown, attempt: number) => void },
  ): Promise<T> {
    const maxRetries = opts?.maxRetries ?? 3;
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (e) {
        opts?.onError?.(e, attempt);
        if (attempt >= maxRetries) throw e;
        const base = BASE_BACKOFFS_MS[attempt] ?? BASE_BACKOFFS_MS[BASE_BACKOFFS_MS.length - 1];
        const waitMs = jitter(base);
        await new Promise((r) => setTimeout(r, waitMs));
        attempt += 1;
      }
    }
  }

  async call(prompt: string, opts?: DashScopeOptions): Promise<DashScopeCallResult> {
    this.callCount += 1;
    const apiKey = process.env.DASHSCOPE_KEY || '';
    if (!apiKey) {
      return { ok: false, error: 'DASHSCOPE_KEY not set' };
    }
    const f = opts?.fetch || this.getFetch();
    if (!f) return { ok: false, error: 'no fetch available' };
    const resp = await f('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      body: JSON.stringify({
        model: 'qwen-plus',
        input: { messages: [{ role: 'user', content: prompt }] },
      }),
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
    });
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data };
  }
}

// 默认实例
export const dashscope = new DashScope();
