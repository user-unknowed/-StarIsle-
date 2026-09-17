// src/shared/scopeGuard.ts
// 只信任 meta.callerRole，不信任 args.role。
// 越权（含 callerRole 无权 + anonymousNo 不匹配）返回 code 4015。

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
  userId?: string;
}

export interface ScopeGuardError extends Error {
  code: 4015;
}

function makeScopeError(msg: string): ScopeGuardError {
  const err = new Error(msg) as ScopeGuardError;
  err.code = 4015;
  return err;
}

export const TOOL_ROLE_WHITELIST: Record<string, string[]> = {
  listTasks: ['student', 'teacher', 'admin'],
  submitFeedback: ['student'],
  aiAnalyze: ['admin', 'teacher'],
  reviewFeedback: ['teacher'],
  exportResearch: ['admin', 'researcher'],
  accessPII: ['admin'],
};

export function enforceRole(toolName: string, meta: CallerMeta): void {
  const allowed = TOOL_ROLE_WHITELIST[toolName] ?? [];
  if (!meta.callerRole || !allowed.includes(meta.callerRole)) {
    throw makeScopeError('forbidden: callerRole not in whitelist');
  }
}

/** enforceOwn 接受的业务参数：只需这几个越权判定字段 */
export interface ScopeArgs {
  anonymousNo?: string;
  anonymousNos?: string[];
  teacherId?: string;
}

/**
 * enforceOwn: 越权 anonymousNo 场景。
 * 对 listTasks / reviewFeedback / submitFeedback 等，
 * 如果 meta.callerRole === 'student'，那么操作的 anonymousNo 必须等于 meta.anonymousNo。
 * 如果 teacher 操作，其 teacherId 必须匹配；否则亦 4015。
 *
 * args: 业务参数，可能含 anonymousNo / anonymousNos / teacherId
 */
export function enforceOwn(toolName: string, meta: CallerMeta, args: ScopeArgs): void {
  enforceRole(toolName, meta);

  const role = meta.callerRole;
  const ownAnon = meta.anonymousNo;

  if (role === 'student') {
    // 学生必须有自己的 anonymousNo
    if (!ownAnon) throw makeScopeError('forbidden: student missing anonymousNo');
    const targetAnon = args.anonymousNo as string | undefined;
    const targetAnons = args.anonymousNos as string[] | undefined;
    if (targetAnon && targetAnon !== ownAnon) {
      throw makeScopeError('forbidden: anonymousNo cross-access');
    }
    if (targetAnons && targetAnons.some((a) => a !== ownAnon)) {
      throw makeScopeError('forbidden: anonymousNos cross-access');
    }
    return;
  }

  if (role === 'teacher') {
    // teacher 只能操作自己名下班级学生：若 args.teacherId 存在必须与 meta.userId 匹配
    const metaTeacherId = (meta.userId ?? (meta as { teacherId?: string }).teacherId) as
      | string
      | undefined;
    const argTeacherId = args.teacherId as string | undefined;
    if (argTeacherId && metaTeacherId && argTeacherId !== metaTeacherId) {
      throw makeScopeError('forbidden: teacherId mismatch');
    }
    // teacher 自己的 studentIds 白名单若给出则必须在其中
    const metaStudentIds = (meta as { studentIds?: string[] }).studentIds;
    const targetAnon = args.anonymousNo as string | undefined;
    const targetAnons = args.anonymousNos as string[] | undefined;
    if (metaStudentIds) {
      const allTargets = [
        ...(targetAnon ? [targetAnon] : []),
        ...(targetAnons ? targetAnons : []),
      ];
      if (allTargets.length && allTargets.some((a) => !metaStudentIds.includes(a))) {
        throw makeScopeError('forbidden: anonymousNo not in teacher roster');
      }
    }
    return;
  }

  if (role === 'admin' || role === 'researcher') {
    // admin/researcher 角色已在 enforceRole 通过；anonymousNo 越权不做 reject（但会被 PII Gate 拦截输出）
    return;
  }
}
