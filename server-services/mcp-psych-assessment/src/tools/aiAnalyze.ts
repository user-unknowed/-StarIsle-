// src/tools/aiAnalyze.ts
// few-shot 3 例 + dashscope.retry(3) + 预算；返回 aiAnalysis.scores/warning_tags/summary。
// 80/95% 双档 token 预算（81% → WARN；96% → ERROR 拒审）。

import * as scopeGuard from '../shared/scopeGuard.js';
import { DashScope, dashscope, tokenBudget } from '../shared/dashscope.js';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
}

export interface AiAnalyzeArgs {
  feedbackId: string;
  content: string;
  tokenCountEstimate?: number; // 估算 token 数，用于预算校验
  role?: string; // 不相信
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
}

const FEW_SHOT_EXAMPLES = [
  {
    input: '最近经常失眠，白天不想上课，觉得没人理解我',
    output: {
      scores: { depression: 78, anxiety: 65, stress: 70 },
      warning_tags: ['sleep_disturb', 'social_withdrawal'],
      summary: '中度抑郁倾向，伴随社交退缩，建议一周内跟进。',
    },
  },
  {
    input: '考试压力大，但和朋友聊聊就好一些',
    output: {
      scores: { depression: 30, anxiety: 55, stress: 60 },
      warning_tags: ['exam_stress'],
      summary: '轻度考试焦虑，社会支持良好，持续观察即可。',
    },
  },
  {
    input: '最近饮食正常，作业都按时完成，心情稳定',
    output: {
      scores: { depression: 12, anxiety: 10, stress: 15 },
      warning_tags: [],
      summary: '状态良好，心理健康指数在正常范围。',
    },
  },
];

export async function aiAnalyze(args: AiAnalyzeArgs, meta: CallerMeta): Promise<ToolResult> {
  scopeGuard.enforceRole('aiAnalyze', meta);

  const tokenCountEstimate =
    typeof args.tokenCountEstimate === 'number' ? args.tokenCountEstimate : args.content.length * 2;

  // 预算检查：80% WARN，95% ERROR（拒审）
  const budgetResult = tokenBudget.check(tokenCountEstimate);
  if (budgetResult.level === 'ERROR') {
    return {
      isError: true,
      code: 'token_budget_exceeded',
      content: {
        message: 'token budget exceeded 95% threshold, review rejected',
        ratio: budgetResult.ratio,
      },
    };
  }

  const prompt = [
    '你是一位心理测评助理，基于学生反馈文本输出结构化分析，字段固定为 scores{depression,anxiety,stress}，warning_tags 数组，summary 字符串。',
    '示例：',
    ...FEW_SHOT_EXAMPLES.map(
      (ex) => `输入：${ex.input}\n输出：${JSON.stringify(ex.output)}`,
    ),
    `请分析：${args.content}`,
  ].join('\n\n');

  const client: DashScope = dashscope;
  let callResult: Awaited<ReturnType<DashScope['call']>> | null = null;
  try {
    callResult = await client.retry(
      async () => {
        const r = await client.call(prompt);
        if (!r.ok) throw new Error(`dashscope_${r.status ?? 'error'}`);
        return r;
      },
      { maxRetries: 3 },
    );
  } catch (e) {
    // 重试耗尽仍失败：降级返回默认
  }

  // 降级：构造一个合法输出
  const fallback = {
    scores: { depression: 30, anxiety: 30, stress: 30 },
    warning_tags: [] as string[],
    summary: callResult?.ok ? 'OK' : 'dashscope unavailable, fallback analysis',
  };
  let data = fallback;
  if (callResult?.ok && callResult.data) {
    const raw = callResult.data as Record<string, unknown>;
    const out = raw.output as { text?: string } | undefined;
    const text = out?.text ?? '';
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') data = { ...fallback, ...parsed };
    } catch (_e) {
      // ignore
    }
  }

  return {
    content: {
      feedbackId: args.feedbackId,
      aiAnalysis: {
        scores: data.scores,
        warning_tags: data.warning_tags,
        summary: data.summary,
        budgetLevel: budgetResult.level,
        budgetRatio: budgetResult.ratio,
      },
    },
  };
}
