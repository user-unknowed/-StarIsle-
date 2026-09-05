// src/index.ts
// MCP SDK 0.6 stdio server；注册 6 Tool。
// Middleware 顺序：auditLogger → scopeGuard → piiGate.forceReMask → dispatch → audit

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import * as auditLogger from './shared/auditLogger.js';
import * as scopeGuard from './shared/scopeGuard.js';
import * as piiGate from './shared/piiGate.js';

import { listTasks } from './tools/listTasks.js';
import { submitFeedback } from './tools/submitFeedback.js';
import { aiAnalyze } from './tools/aiAnalyze.js';
import { reviewFeedback } from './tools/reviewFeedback.js';
import { exportResearch } from './tools/exportResearch.js';
import { accessPII } from './tools/accessPII.js';

export type AnyArgs = Record<string, unknown>;

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
  userId?: string;
  teacherId?: string;
  studentIds?: string[];
}

export interface ToolHandlerResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
  _auditExtras?: Record<string, unknown>;
}

export type ToolHandler = (args: AnyArgs, meta: CallerMeta) => Promise<ToolHandlerResult>;

export const toolHandlers: Record<string, ToolHandler> = {
  listTasks: listTasks as unknown as ToolHandler,
  submitFeedback: submitFeedback as unknown as ToolHandler,
  aiAnalyze: aiAnalyze as unknown as ToolHandler,
  reviewFeedback: reviewFeedback as unknown as ToolHandler,
  exportResearch: exportResearch as unknown as ToolHandler,
  accessPII: accessPII as unknown as ToolHandler,
};

const TOOL_DESCRIPTIONS: Record<string, { description: string; inputSchema: Record<string, unknown> }> = {
  listTasks: {
    description: '查询学生/教师测评任务列表',
    inputSchema: {
      type: 'object',
      properties: {
        anonymousNo: { type: 'string' },
        status: { type: 'string' },
      },
    },
  },
  submitFeedback: {
    description: '学生提交测评反馈（含微信内容安全预检）',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        content: { type: 'string' },
        scores: { type: 'object' },
      },
      required: ['taskId', 'content'],
    },
  },
  aiAnalyze: {
    description: 'DashScope AI 分析反馈内容，返回 scores / warning_tags / summary',
    inputSchema: {
      type: 'object',
      properties: {
        feedbackId: { type: 'string' },
        content: { type: 'string' },
        tokenCountEstimate: { type: 'number' },
      },
      required: ['feedbackId', 'content'],
    },
  },
  reviewFeedback: {
    description: '教师复核反馈，写入 teacherReview',
    inputSchema: {
      type: 'object',
      properties: {
        feedbackId: { type: 'string' },
        reviewStatus: { type: 'string', enum: ['verified', 'rejected', 'escalated'] },
        confirmedScores: { type: 'object' },
        teacherNote: { type: 'string' },
        confirm_3: { type: 'number' },
      },
      required: ['feedbackId', 'reviewStatus'],
    },
  },
  exportResearch: {
    description: '匿名维度研究数据导出，PII 维度拒绝',
    inputSchema: {
      type: 'object',
      properties: {
        dimensions: { type: 'array', items: { type: 'string' } },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
      required: ['dimensions'],
    },
  },
  accessPII: {
    description: '双 2FA 授权后访问实名 PII（仅 admin）',
    inputSchema: {
      type: 'object',
      properties: {
        password: { type: 'string' },
        secondFactorCode: { type: 'string' },
        anonymousNos: { type: 'array', items: { type: 'string' } },
      },
      required: ['password', 'secondFactorCode', 'anonymousNos'],
    },
  },
};

/**
 * 调度单个 Tool，中间件顺序：
 *   auditLogger (pre+post) → scopeGuard → piiGate.forceReMask → dispatch → audit
 */
export async function invokeTool(
  toolName: string,
  args: AnyArgs,
  meta: CallerMeta,
): Promise<ToolHandlerResult> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const ctx: auditLogger.MiddlewareCtx = {
    toolName,
    meta,
    requestId,
  };

  return auditLogger.auditLogger(ctx, async () => {
    // scopeGuard：只信 meta.callerRole
    if (['listTasks', 'submitFeedback', 'reviewFeedback'].includes(toolName)) {
      scopeGuard.enforceOwn(toolName, meta, args);
    } else {
      scopeGuard.enforceRole(toolName, meta);
    }

    const handler = toolHandlers[toolName];
    if (!handler) {
      return { isError: true, code: 'tool_not_found', content: { message: `tool ${toolName} not found` } };
    }

    const result = await handler(args, meta);

    // piiGate.forceReMask：除 accessPII 外，输出的 name/phone 字段自动置空
    if (result.content && typeof result.content === 'object') {
      result.content = piiGate.forceReMask(result.content, { toolName });
    }

    // 把 audit extras 写入 ctx.extras，供 auditLogger post 阶段输出
    if (result._auditExtras) {
      ctx.extras = result._auditExtras;
    }

    return result;
  });
}

async function main(): Promise<void> {
  const server = new Server(
    { name: 'mcp-psych-assessment', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(TOOL_DESCRIPTIONS).map(([name, desc]) => ({
        name,
        description: desc.description,
        inputSchema: desc.inputSchema as never,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // MCP 协议本身无 callerRole，假设通过初始化时 session/meta 注入；
    // 这里从 arguments 中剥离 role 字段，但只信任 _meta。
    const rawArgs = (args ?? {}) as AnyArgs & { _meta?: CallerMeta };
    const meta: CallerMeta = rawArgs._meta ?? {
      callerRole: (rawArgs.callerRole as string | undefined) ?? 'anonymous',
      anonymousNo: rawArgs.anonymousNo as string | undefined,
      sessionId: rawArgs.sessionId as string | undefined,
    };
    const cleanArgs: AnyArgs = { ...rawArgs };
    delete cleanArgs._meta;
    // 从 args 中移除 role/callerRole 等客户端可伪造字段：我们不信 args.role
    delete cleanArgs.role;
    delete cleanArgs.callerRole;

    try {
      const result = await invokeTool(name, cleanArgs, meta);
      const text =
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);
      return {
        content: [{ type: 'text', text }],
        isError: result.isError === true,
      };
    } catch (e) {
      const err = e as { code?: string | number; message?: string };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ code: err.code, message: err.message }),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// 仅在直接运行时启动（兼容 Windows 反斜杠路径）
const argv1Norm = process.argv[1]?.replace(/\\/g, '/');
if (import.meta.url === `file://${process.argv[1]}` || argv1Norm?.endsWith('dist/index.js')) {
  void main();
}

export { main };
