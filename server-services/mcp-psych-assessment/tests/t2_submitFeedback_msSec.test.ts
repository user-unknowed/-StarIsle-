// tests/t2_submitFeedback_msSec.test.ts
// msSec 违规返回 ms_sec_blocked 且 DashScope.callCount === 0
import { describe, it, expect, beforeEach } from 'vitest';
import * as cloudBridge from '../src/shared/cloudBridge.js';
import { dashscope } from '../src/shared/dashscope.js';
import { invokeTool } from '../src/index.js';

describe('t2 submitFeedback msSec 违规 → ms_sec_blocked 且 DashScope.callCount === 0', () => {
  beforeEach(() => {
    // 模拟微信内容安全 webhook：违规返回 true
    cloudBridge.setFetchImpl(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ violate: true, errcode: 87014 }),
    }));
    process.env.WX_CLOUD_MODE = 't2_test_mode';
    // 重置 DashScope 调用计数
    dashscope.callCount = 0;
  });

  it('t2: 违规内容 → ms_sec_blocked + callCount === 0', async () => {
    const result = await invokeTool(
      'submitFeedback',
      { taskId: 'T1', content: '违规涉政内容' },
      { callerRole: 'student', anonymousNo: 'A1', sessionId: 't2-s' },
    );
    expect(result.isError).toBe(true);
    expect(result.code).toBe('ms_sec_blocked');
    // 关键断言：msSec 违规时 DashScope 一次都没调用
    expect(dashscope.callCount).toBe(0);
  });
});
