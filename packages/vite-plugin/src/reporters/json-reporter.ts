import type { GuardIssue } from '../types';
import fs from 'fs';
import path from 'path';

export interface JsonReport {
  timestamp: string;
  summary: {
    total: number;
    errors: number;
    warnings: number;
  };
  issues: JsonReportIssue[];
  groupedByRule: Record<string, JsonReportIssue[]>;
}

export interface JsonReportIssue {
  rule: string;
  severity: 'error' | 'warn';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

/**
 * 生成 JSON 格式的分析报告
 */
export function generateJsonReport(issues: GuardIssue[]): JsonReport {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  const groupedByRule: Record<string, JsonReportIssue[]> = {};
  for (const issue of issues) {
    if (!groupedByRule[issue.rule]) {
      groupedByRule[issue.rule] = [];
    }
    groupedByRule[issue.rule].push({
      rule: issue.rule,
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      column: issue.column,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: issues.length,
      errors: errors.length,
      warnings: warnings.length,
    },
    issues: issues.map((issue) => ({
      rule: issue.rule,
      severity: issue.severity,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      column: issue.column,
    })),
    groupedByRule,
  };
}

/**
 * 将 JSON 报告输出到控制台
 */
export function reportToJson(issues: GuardIssue[]): void {
  const report = generateJsonReport(issues);
  console.log(JSON.stringify(report, null, 2));
}

/**
 * 将 JSON 报告写入文件
 */
export function writeJsonReport(issues: GuardIssue[], outputPath: string): void {
  const report = generateJsonReport(issues);
  const dir = path.dirname(outputPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}
