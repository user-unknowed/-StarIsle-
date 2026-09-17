// tests/t5_exportResearch_pii.test.ts
// dimension='phone' → 403 pii_forbidden + outDir 文件数 0
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportResearch } from '../src/tools/exportResearch.js';

const tmpDirs: string[] = [];

afterAll(() => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch (_e) {
      /* ignore */
    }
  }
});

describe('t5 exportResearch PII 维度 → 403 pii_forbidden + 文件数 0', () => {
  it('t5: dimensions 含 phone → pii_forbidden', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa3-t5-'));
    tmpDirs.push(outDir);
    // 预置一个文件，确保逻辑即便目录有文件也不写新文件（且返回当前文件数）
    fs.writeFileSync(path.join(outDir, 'pre-existing.txt'), 'x');

    const result = await exportResearch(
      { dimensions: ['anonymousNo', 'phone'], outDir },
      { callerRole: 'admin', anonymousNo: undefined, sessionId: 't5-s' },
    );
    expect(result.isError).toBe(true);
    expect(result.code).toBe('pii_forbidden');
    const body = result.content as Record<string, unknown>;
    // 断言返回的 fileCount（命中 PII 时不写入）；由于目录预置了 1 文件，fileCount=1。
    // 为符合"导出目录文件数 0"硬约束，这里再用一个干净的 outDir 验证：
    expect(Number(body.fileCount)).toBe(1);

    // 干净目录
    const outDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pa3-t5-clean-'));
    tmpDirs.push(outDir2);
    const r2 = await exportResearch(
      { dimensions: ['realName'], outDir: outDir2 },
      { callerRole: 'admin', anonymousNo: undefined, sessionId: 't5-s2' },
    );
    expect(r2.code).toBe('pii_forbidden');
    const body2 = r2.content as Record<string, unknown>;
    expect(Number(body2.fileCount)).toBe(0);
  });

  it('t5b: dimensions 含 class → pii_forbidden', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pa3-t5-b-'));
    tmpDirs.push(outDir);
    const r = await exportResearch(
      { dimensions: ['class'], outDir },
      { callerRole: 'researcher', anonymousNo: undefined, sessionId: 't5-sb' },
    );
    expect(r.code).toBe('pii_forbidden');
    const body = r.content as Record<string, unknown>;
    expect(Number(body.fileCount)).toBe(0);
  });
});
