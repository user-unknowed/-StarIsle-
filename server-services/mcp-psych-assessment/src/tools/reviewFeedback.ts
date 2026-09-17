// src/tools/reviewFeedback.ts
// 检查 confirm_3 字段，存在则 4015 + audit.extras.confirm_3_present=true；
// teacherId 必须与 owner 匹配，写入 teacherReview{reviewStatus,confirmedScores,teacherNote}。

import * as scopeGuard from '../shared/scopeGuard.js';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
  userId?: string;
  teacherId?: string;
}

export interface ReviewFeedbackArgs {
  feedbackId: string;
  anonymousNo?: string;
  teacherId?: string;
  reviewStatus: 'verified' | 'rejected' | 'escalated';
  confirmedScores?: Record<string, number>;
  teacherNote?: string;
  // confirm_3：0 表示 trust 标签违反（学生作弊/造假）。一旦存在即 4015。
  confirm_3?: number;
  role?: string; // 不相信
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
  // 非标准字段：让 index.ts 的 audit middleware 读取 extras
  _auditExtras?: Record<string, unknown>;
}

export async function reviewFeedback(args: ReviewFeedbackArgs, meta: CallerMeta): Promise<ToolResult> {
  scopeGuard.enforceOwn('reviewFeedback', meta, args);

  // 检查 confirm_3：任何非 undefined 存在 → 4015
  if (typeof args.confirm_3 !== 'undefined') {
    return {
      isError: true,
      code: 4015,
      _auditExtras: { confirm_3_present: true },
      content: { message: 'confirm_3 trust tag violation, forbidden' },
    };
  }

  // teacherId 必须与 owner 匹配（meta 中的 userId 或 teacherId）
  const ownerTeacherId = (meta.userId ?? meta.teacherId) as string | undefined;
  if (ownerTeacherId && args.teacherId && ownerTeacherId !== args.teacherId) {
    return {
      isError: true,
      code: 4015,
      content: { message: 'teacherId owner mismatch' },
    };
  }

  const teacherReview = {
    reviewStatus: args.reviewStatus,
    confirmedScores: args.confirmedScores ?? {},
    teacherNote: args.teacherNote ?? '',
    reviewedAt: new Date().toISOString(),
    reviewerTeacherId: ownerTeacherId ?? args.teacherId,
  };

  return {
    content: {
      feedbackId: args.feedbackId,
      teacherReview,
      ok: true,
    },
  };
}
