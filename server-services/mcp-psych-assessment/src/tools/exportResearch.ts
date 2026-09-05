// src/tools/exportResearch.ts
// 维度白名单（anonymousNo, role, createdAt, scores, warning_tags, reviewStatus, teacherStatus）；
// 命中 PII dim（phone / realName / class 等） → 403 pii_forbidden + 导出目录文件数 0。

import * as scopeGuard from '../shared/scopeGuard.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface CallerMeta {
  callerRole?: string;
  anonymousNo?: string;
  sessionId?: string;
}

export interface ExportResearchArgs {
  dimensions: string[];
  startDate?: string;
  endDate?: string;
  role?: string; // 不相信
  // outDir: 可注入；默认临时目录
  outDir?: string;
}

export interface ToolResult {
  content: unknown;
  isError?: boolean;
  code?: string | number;
}

const ALLOWED_DIMENSIONS = new Set([
  'anonymousNo',
  'role',
  'createdAt',
  'scores',
  'warning_tags',
  'reviewStatus',
  'teacherStatus',
]);

const PII_DIMENSIONS = new Set(['phone', 'realName', 'class', 'email', 'idCard', 'name', 'mobile']);

export async function exportResearch(args: ExportResearchArgs, meta: CallerMeta): Promise<ToolResult> {
  scopeGuard.enforceRole('exportResearch', meta);

  const dims = Array.isArray(args.dimensions) ? args.dimensions : [];

  // PII 维度拒绝
  const hasPii = dims.some((d) => PII_DIMENSIONS.has(d));
  if (hasPii) {
    // 确保导出目录文件数 0：即便目录存在也不写任何文件，直接返回
    const outDir = args.outDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'pa3-out-'));
    let fileCount = 0;
    try {
      if (fs.existsSync(outDir)) {
        fileCount = fs.readdirSync(outDir).length;
      }
    } catch (_e) {
      /* ignore */
    }
    return {
      isError: true,
      code: 'pii_forbidden',
      content: {
        message: 'pii dimension forbidden in research export',
        forbiddenDimensions: dims.filter((d) => PII_DIMENSIONS.has(d)),
        outDir,
        fileCount,
      },
    };
  }

  // 白名单过滤
  const finalDims = dims.filter((d) => ALLOWED_DIMENSIONS.has(d));

  const outDir = args.outDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'pa3-out-'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const csvHeader = finalDims.join(',');
  const lines = [csvHeader];
  lines.push(finalDims.map((d) => `sample_${d}`).join(','));
  const csvContent = lines.join('\n');
  const csvPath = path.join(outDir, `research_export_${Date.now()}.csv`);
  fs.writeFileSync(csvPath, csvContent, 'utf8');

  const manifest = {
    dimensions: finalDims,
    createdAt: new Date().toISOString(),
    exportedBy: meta.callerRole,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');

  const files = fs.readdirSync(outDir);
  return {
    content: {
      outDir,
      fileCount: files.length,
      files,
      dimensions: finalDims,
    },
  };
}
