// tests/t3_aiAnalyze_budget.test.ts
// 81% 预算状态 WARN
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tokenBudget, TokenBudget, dashscope } from '../src/shared/dashscope.js';
import { aiAnalyze } from '../src/tools/aiAnalyze.js';

describe('t3 aiAnalyze token 预算 81% → WARN', () => {
  beforeEach(() => {
    tokenBudget.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('t3: TokenBudget 类独立 check，81% 应 WARN', () => {
    const budget = new TokenBudget({ max: 1000, warnRatio: 0.8, errorRatio: 0.95 });
    // 先占 810 / 1000 = 81%
    const r = budget.check(810);
    expect(r.level).toBe('WARN');
    expect(r.ratio).toBeCloseTo(0.81, 5);
  });

  it('t3b: 96% 应 ERROR', () => {
    const budget = new TokenBudget({ max: 1000, warnRatio: 0.8, errorRatio: 0.95 });
    const r = budget.check(960);
    expect(r.level).toBe('ERROR');
  });

  it('t3c: aiAnalyze tokenCountEstimate 81% 触发 WARN 级（返回不阻断）', async () => {
    // Mock dashscope.call 立即返回成功，避免 5/10/20s 退避超时
    vi.spyOn(dashscope, 'call').mockResolvedValue({
      ok: true,
      status: 200,
      data: { output: { text: JSON.stringify({ scores: { depression: 30, anxiety: 30, stress: 30 }, warning_tags: [], summary: 'ok' }) } },
    });

    // 设置一个小预算：1000 tokens
    const oldMax = tokenBudget.max;
    const oldWarn = tokenBudget.warnRatio;
    const oldErr = tokenBudget.errorRatio;
    tokenBudget.max = 1000;
    tokenBudget.warnRatio = 0.8;
    tokenBudget.errorRatio = 0.95;
    tokenBudget.reset();

    try {
      const result = await aiAnalyze(
        { feedbackId: 'F1', content: 'hello', tokenCountEstimate: 810 },
        { callerRole: 'teacher', anonymousNo: undefined, sessionId: 't3-s' },
      );
      const body = result.content as Record<string, unknown>;
      const ana = body.aiAnalysis as Record<string, unknown>;
      expect(ana.budgetLevel).toBe('WARN');
      expect(ana.budgetRatio).toBeCloseTo(0.81, 5);
    } finally {
      tokenBudget.max = oldMax;
      tokenBudget.warnRatio = oldWarn;
      tokenBudget.errorRatio = oldErr;
    }
  });
});
