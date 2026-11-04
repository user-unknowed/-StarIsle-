/**
 * @file riskGradingRemoval.test.ts
 * @description 回归测试：验证前端已彻底移除「绿/黄/橙/红」风险分级展示与制度。
 *              覆盖 mock 学生/预警数据字段一致性，以及教师端、家长端页面的源码残留。
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockStudents } from '../store/classroomStore';
import { mockAlerts } from '../store/parentStore';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * 读取相对项目根目录的源码文件
 * @param relativePath - 相对项目根目录的路径
 * @returns 文件文本内容
 */
const readSource = (relativePath: string) =>
  readFileSync(resolve(projectRoot, relativePath), 'utf8');

describe('风险分级制度已彻底移除', () => {
  it('所有 mock 学生均没有 riskLevel/level 字段', () => {
    expect(mockStudents.length).toBeGreaterThan(0);
    for (const student of mockStudents) {
      expect(student).not.toHaveProperty('riskLevel');
      expect(student).not.toHaveProperty('level');
    }
  });

  it('所有 mock 学生的展示相关字段集合完全一致（每个都一样）', () => {
    const fieldSets = mockStudents.map((student) => Object.keys(student).sort().join('|'));
    expect(new Set(fieldSets).size).toBe(1);
    // 展示字段固定为：id / nickname / avatar / latestMood / alert
    expect(fieldSets[0]).toBe(['id', 'nickname', 'avatar', 'latestMood', 'alert'].sort().join('|'));
  });

  it('预警对象没有等级字段', () => {
    expect(mockAlerts.length).toBeGreaterThan(0);
    for (const alert of mockAlerts) {
      expect(alert).not.toHaveProperty('level');
      expect(alert).not.toHaveProperty('riskLevel');
    }
  });

  it('TeacherHome / ParentHome / ParentEmergency 不含等级映射、等级字段或按等级排序', () => {
    const pages = [
      'src/pages/teacher/TeacherHome.tsx',
      'src/pages/parent/ParentHome.tsx',
      'src/pages/parent/ParentEmergency.tsx',
    ];

    for (const page of pages) {
      const source = readSource(page);
      // 不得出现 red/orange/yellow/green 等级字符串
      expect(source).not.toMatch(/['"`](?:red|orange|yellow|green)['"`]/);
      // 不得出现等级相关字段/函数/判断
      expect(source).not.toMatch(/riskLevel|risk_level|RiskLevel/);
      expect(source).not.toMatch(/getRiskColor|getRiskLabel|getAlertColor|getAlertBadge|getAlertLabel/);
      expect(source).not.toMatch(/hasUnconfirmedRed/);
      // 不得出现“风险等级”文案
      expect(source).not.toMatch(/风险等级/);
      // 不得按等级排序
      expect(source).not.toMatch(/sort\s*\([\s\S]{0,160}level/i);
    }
  });

  it('类型定义与风险 API 不再包含分级结构', () => {
    const types = readSource('src/types/index.ts');
    expect(types).not.toMatch(/RiskLevelType|RiskLevel\b|riskLevel|risk_level/);

    const api = readSource('src/services/api.ts');
    expect(api).not.toMatch(/getLevel|RiskLevel\b|risk_level|riskLevel/);
  });
});
