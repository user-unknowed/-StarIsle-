// tests/t1_scope_越权.test.ts
// scopeGuard：越权 anonymousNo → code 4015
import { describe, it, expect } from 'vitest';
import { invokeTool } from '../src/index.js';

describe('t1 scopeGuard 越权 anonymousNo → code 4015', () => {
  it('t1: 学生 A1 试图查询学生 A2 的任务 → 4015', async () => {
    try {
      await invokeTool(
        'listTasks',
        { anonymousNo: 'A2' }, // 目标 A2
        { callerRole: 'student', anonymousNo: 'A1', sessionId: 't1-s' }, // 本人 A1
      );
      expect.fail('expected throw');
    } catch (e) {
      const err = e as { code?: number };
      expect(err.code).toBe(4015);
    }
  });

  it('t1b: 学生匿名号数组越权 → 4015', async () => {
    try {
      await invokeTool(
        'listTasks',
        { anonymousNos: ['A1', 'A2'] },
        { callerRole: 'student', anonymousNo: 'A1', sessionId: 't1-s2' },
      );
      expect.fail('expected throw');
    } catch (e) {
      const err = e as { code?: number };
      expect(err.code).toBe(4015);
    }
  });

  it('t1c: 非 student/teacher/admin 角色调 listTasks → 4015', async () => {
    try {
      await invokeTool(
        'listTasks',
        {},
        { callerRole: 'guest', anonymousNo: 'A1', sessionId: 't1-g' },
      );
      expect.fail('expected throw');
    } catch (e) {
      const err = e as { code?: number };
      expect(err.code).toBe(4015);
    }
  });
});
