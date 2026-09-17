// src/tools/listTasks.ts
import * as scopeGuard from '../shared/scopeGuard.js';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
  userId?: string;
  studentIds?: string[];
  teacherId?: string;
}

export interface ListTasksArgs {
  anonymousNo?: string;
  anonymousNos?: string[];
  teacherId?: string;
  status?: string;
  role?: string; // 故意忽略，只信 meta.callerRole
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
}

// 模拟数据库
const MOCK_TASKS = [
  { taskId: 'T1', anonymousNo: 'A1', title: '抑郁自评量表', createdAt: '2026-09-01', status: 'pending', teacherId: 'TEA_1' },
  { taskId: 'T2', anonymousNo: 'A2', title: '焦虑自评量表', createdAt: '2026-09-02', status: 'done', teacherId: 'TEA_1' },
  { taskId: 'T3', anonymousNo: 'A3', title: '学业压力调查', createdAt: '2026-09-03', status: 'pending', teacherId: 'TEA_2' },
];

export async function listTasks(args: ListTasksArgs, meta: CallerMeta): Promise<ToolResult> {
  // 只信 meta.callerRole，不信任 args.role
  scopeGuard.enforceOwn('listTasks', meta, args);

  let tasks = MOCK_TASKS.slice();
  const role = meta.callerRole!;

  if (role === 'student') {
    tasks = tasks.filter((t) => t.anonymousNo === meta.anonymousNo);
  } else if (role === 'teacher') {
    const myId = (meta.userId ?? meta.teacherId) as string | undefined;
    if (myId) tasks = tasks.filter((t) => t.teacherId === myId);
  }
  if (args.status) tasks = tasks.filter((t) => t.status === args.status);

  return {
    content: { tasks, total: tasks.length },
  };
}
