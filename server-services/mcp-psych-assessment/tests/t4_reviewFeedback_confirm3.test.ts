// tests/t4_reviewFeedback_confirm3.test.ts
// confirm_3 存在 → code 4015 + audit.extras.confirm_3_present=true
import { describe, it, expect } from 'vitest';
import { reviewFeedback } from '../src/tools/reviewFeedback.js';
import * as auditLogger from '../src/shared/auditLogger.js';

describe('t4 reviewFeedback confirm_3 存在 → 4015 + audit extras confirm_3_present=true', () => {
  it('t4: confirm_3=0 → 4015 + _auditExtras.confirm_3_present=true', async () => {
    const result = await reviewFeedback(
      {
        feedbackId: 'FB_1',
        reviewStatus: 'verified',
        confirm_3: 0, // trust 标签违反
      },
      { callerRole: 'teacher', anonymousNo: undefined, sessionId: 't4-s', userId: 'TEA_1' },
    );
    expect(result.isError).toBe(true);
    expect(result.code).toBe(4015);
    expect(result._auditExtras?.confirm_3_present).toBe(true);
  });

  it('t4b: 无 confirm_3 → 正常写入 teacherReview', async () => {
    const result = await reviewFeedback(
      {
        feedbackId: 'FB_2',
        reviewStatus: 'verified',
        teacherId: 'TEA_1',
        confirmedScores: { depression: 20 },
        teacherNote: '状态正常',
      },
      { callerRole: 'teacher', anonymousNo: undefined, sessionId: 't4-s2', userId: 'TEA_1' },
    );
    expect(result.isError).toBeFalsy();
    const body = result.content as Record<string, unknown>;
    expect((body.teacherReview as Record<string, unknown>).reviewStatus).toBe('verified');
  });

  it('t4c: 走 invokeTool，confirm_3 存在时审计日志应包含 confirm_3_present', async () => {
    // 仅校验 handler 返回的 extras，避免触发真实 stdout；用 capture
    const buf = auditLogger.startCapture();
    try {
      const { invokeTool } = await import('../src/index.js');
      const result = await invokeTool(
        'reviewFeedback',
        {
          feedbackId: 'FB_3',
          reviewStatus: 'verified',
          confirm_3: 1,
        },
        { callerRole: 'teacher', anonymousNo: undefined, sessionId: 't4-s3', userId: 'TEA_1' },
      );
      expect(result.code).toBe(4015);
      // 捕获的 post 日志 extras 中应含 confirm_3_present
      const posts = buf.filter((e) => e.phase === 'post');
      expect(posts.length).toBeGreaterThan(0);
      const extras = posts[posts.length - 1].extras as Record<string, unknown> | undefined;
      expect(extras?.confirm_3_present).toBe(true);
    } finally {
      auditLogger.stopCapture();
    }
  });
});
