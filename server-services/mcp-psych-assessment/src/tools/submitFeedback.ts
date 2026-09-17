// src/tools/submitFeedback.ts
// msSecCheck（微信内容安全）先于 DashScope 调用；若 msSec 违规直接返回 code=ms_sec_blocked 且 DashScope callCount === 0。

import * as scopeGuard from '../shared/scopeGuard.js';
import * as cloudBridge from '../shared/cloudBridge.js';
import { dashscope } from '../shared/dashscope.js';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
}

export interface SubmitFeedbackArgs {
  anonymousNo?: string;
  taskId: string;
  content: string;
  scores?: Record<string, number>;
  role?: string; // 不相信
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
}

// 模拟入库
const DB: Record<string, unknown>[] = [];

export function _getDbCount(): number {
  return DB.length;
}

export async function submitFeedback(args: SubmitFeedbackArgs, meta: CallerMeta): Promise<ToolResult> {
  scopeGuard.enforceOwn('submitFeedback', meta, args);

  if (!args.content) {
    return { isError: true, code: 'content_empty', content: { message: 'content required' } };
  }

  // **1) msSecCheck 必须先于任何 DashScope 调用**
  const violate = await cloudBridge.msSecCheck(args.content);
  if (violate) {
    return {
      isError: true,
      code: 'ms_sec_blocked',
      content: { message: 'content violates ms security policy' },
    };
  }

  // **2) 可选 DashScope 调用（例如情感摘要），若 msSec 违规则 callCount 必须为 0**
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _resp = await dashscope.call(`摘要：${args.content.slice(0, 100)}`);
  } catch (_e) {
    // 忽略 DashScope 失败，主流程入库
  }

  const record = {
    anonymousNo: meta.anonymousNo ?? args.anonymousNo,
    taskId: args.taskId,
    content: args.content,
    scores: args.scores ?? {},
    createdAt: new Date().toISOString(),
    status: 'pending_review',
  };
  DB.push(record);

  return {
    content: {
      ok: true,
      feedbackId: `FB_${DB.length}`,
      status: 'pending_review',
    },
  };
}
