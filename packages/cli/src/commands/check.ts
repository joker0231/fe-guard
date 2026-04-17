import { Command } from 'commander';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { loadConfig, FrontendGuardConfig } from '../config/loader';
import { validateConfig } from '../config/schema';
import type { GuardIssue } from '../report/scorer';

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  errors: number;
  warnings: number;
  issues: GuardIssue[];
  details?: string;
}

interface ESLintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line?: number;
  column?: number;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

// ─────────────────────────────────────────────
// Check: ESLint
// ─────────────────────────────────────────────

async function runEslintCheck(
  config: FrontendGuardConfig,
  options: { fix?: boolean; quiet?: boolean }
): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'ESLint',
    status: 'pass',
    errors: 0,
    warnings: 0,
    issues: [],
  };

  try {
    const eslintBin = findEslintBin();
    const args = ['.', '--format', 'json'];
    if (options.fix) args.push('--fix');
    if (options.quiet) args.push('--quiet');
    if (config.ignore && config.ignore.length > 0) {
      for (const pattern of config.ignore) {
        args.push('--ignore-pattern', pattern);
      }
    }

    const { stdout } = await runEslint(eslintBin, args);
    const eslintResults: ESLintResult[] = JSON.parse(stdout || '[]');
    result.issues = mapToGuardIssues(eslintResults);
    result.errors = result.issues.filter((i) => i.severity === 'error').length;
    result.warnings = result.issues.filter((i) => i.severity === 'warn').length;
    result.status = result.errors > 0 ? 'fail' : result.warnings > 0 ? 'warning' : 'pass';
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      result.status = 'skipped';
      result.details = 'ESLint未安装，跳过检查';
    } else {
      result.status = 'fail';
      result.details = `ESLint执行失败: ${err.message || String(err)}`;
      result.errors = 1;
    }
  }

  return result;
}

function findEslintBin(): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'eslint');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'eslint';
}

async function runEslint(
  bin: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execFileAsync(bin, args, { maxBuffer: 50 * 1024 * 1024 });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (err: any) {
    if (err.code === 'ENOENT') throw err;
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code || 1 };
  }
}

function mapToGuardIssues(eslintResults: ESLintResult[]): GuardIssue[] {
  const issues: GuardIssue[] = [];
  for (const r of eslintResults) {
    for (const msg of r.messages) {
      if (!msg.ruleId) continue;
      issues.push({
        rule: msg.ruleId,
        severity: msg.severity === 2 ? 'error' : 'warn',
        message: msg.message,
        file: r.filePath,
        line: msg.line,
        column: msg.column,
      });
    }
  }
  return issues;
}

// ─────────────────────────────────────────────
// Check: depcheck
// ─────────────────────────────────────────────

async function runDepcheckCheck(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'depcheck',
    status: 'pass',
    errors: 0,
    warnings: 0,
    issues: [],
  };

  try {
    const bin = findLocalBin('depcheck');
    const { stdout } = await execFileAsync(bin, ['--json'], {
      maxBuffer: 50 * 1024 * 1024,
    }).catch((err: any) => {
      // depcheck 发现问题时 exit 非0，但stdout仍有JSON
      if (err.code === 'ENOENT') throw err;
      return { stdout: err.stdout || '', stderr: err.stderr || '' };
    });

    const report = JSON.parse(stdout || '{}');
    const unusedDeps: string[] = report.dependencies || [];
    const unusedDevDeps: string[] = report.devDependencies || [];
    const missing: Record<string, string[]> = report.missing || {};

    for (const dep of unusedDeps) {
      result.issues.push({
        rule: 'depcheck/unused-dependency',
        severity: 'error',
        message: `未使用的 dependency: "${dep}"。请从 package.json 中移除，或确认是否实际使用。`,
      });
    }
    for (const dep of unusedDevDeps) {
      result.issues.push({
        rule: 'depcheck/unused-devDependency',
        severity: 'warn',
        message: `未使用的 devDependency: "${dep}"。考虑从 package.json 中移除。`,
      });
    }
    for (const [pkg, files] of Object.entries(missing)) {
      result.issues.push({
        rule: 'depcheck/missing-dependency',
        severity: 'error',
        message: `代码中引用了 "${pkg}" 但 package.json 中未声明。影响的文件: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`,
      });
    }

    result.errors = result.issues.filter((i) => i.severity === 'error').length;
    result.warnings = result.issues.filter((i) => i.severity === 'warn').length;
    result.status = result.errors > 0 ? 'fail' : result.warnings > 0 ? 'warning' : 'pass';
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      result.status = 'skipped';
      result.details = 'depcheck 未安装。建议执行: npm install --save-dev depcheck';
    } else {
      result.status = 'warning';
      result.details = `depcheck 执行失败（不阻断）: ${err.message || String(err)}`;
      result.warnings = 1;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Check: ts-prune
// ─────────────────────────────────────────────

async function runTsPruneCheck(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'ts-prune',
    status: 'pass',
    errors: 0,
    warnings: 0,
    issues: [],
  };

  // 检测是否有tsconfig.json
  if (!fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
    result.status = 'skipped';
    result.details = '未检测到 tsconfig.json，跳过 ts-prune 检查';
    return result;
  }

  try {
    const bin = findLocalBin('ts-prune');
    const { stdout } = await execFileAsync(bin, [], {
      maxBuffer: 50 * 1024 * 1024,
    }).catch((err: any) => {
      if (err.code === 'ENOENT') throw err;
      return { stdout: err.stdout || '', stderr: err.stderr || '' };
    });

    // ts-prune输出格式: <file>:<line> - <exportName>
    // 例如: src/utils.ts:10 - helper
    // (used in module) 后缀表示仅模块内部使用但有export
    const lines = (stdout || '').split('\n').filter(Boolean);
    for (const line of lines) {
      // 白名单：used in module（仅模块内部使用，非真正死代码）
      if (line.includes('(used in module)')) continue;

      const match = line.match(/^(.+?):(\d+) - (.+?)(?:\s+\(.*\))?$/);
      if (!match) continue;
      const [, file, lineNum, exportName] = match;

      // 白名单：测试文件的export
      if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)) continue;
      // 白名单：index.ts 的 re-export
      if (/(^|\/)index\.(ts|tsx|js|jsx)$/.test(file)) continue;
      // 白名单：类型文件 .d.ts
      if (/\.d\.ts$/.test(file)) continue;

      // 检查是否有 // @used-externally 注释
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const fileLines = content.split('\n');
          const targetLine = fileLines[parseInt(lineNum, 10) - 1] || '';
          const prevLine = fileLines[parseInt(lineNum, 10) - 2] || '';
          if (
            targetLine.includes('@used-externally') ||
            prevLine.includes('@used-externally')
          ) {
            continue;
          }
        } catch {
          // 读文件失败，继续
        }
      }

      result.issues.push({
        rule: 'ts-prune/unused-export',
        severity: 'warn',
        message: `未使用的 export "${exportName}"。如果是对外暴露的API，请加上 \`// @used-externally\` 注释；否则考虑移除。`,
        file,
        line: parseInt(lineNum, 10),
      });
    }

    result.warnings = result.issues.length;
    result.status = result.warnings > 0 ? 'warning' : 'pass';
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      result.status = 'skipped';
      result.details = 'ts-prune 未安装。建议执行: npm install --save-dev ts-prune';
    } else {
      result.status = 'warning';
      result.details = `ts-prune 执行失败（不阻断）: ${err.message || String(err)}`;
      result.warnings = 1;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Check: npm audit
// ─────────────────────────────────────────────

function detectPackageManager(): 'pnpm' | 'yarn' | 'npm' {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

async function runNpmAuditCheck(
  auditLevel: 'low' | 'moderate' | 'high' | 'critical'
): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'npm audit',
    status: 'pass',
    errors: 0,
    warnings: 0,
    issues: [],
  };

  const pm = detectPackageManager();
  const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical'];
  const thresholdIdx = SEVERITY_ORDER.indexOf(auditLevel);

  try {
    const args =
      pm === 'pnpm' ? ['audit', '--json'] : pm === 'yarn' ? ['audit', '--json'] : ['audit', '--json'];
    const { stdout } = await execFileAsync(pm, args, {
      maxBuffer: 50 * 1024 * 1024,
    }).catch((err: any) => {
      if (err.code === 'ENOENT') throw err;
      return { stdout: err.stdout || '', stderr: err.stderr || '' };
    });

    // npm/pnpm: 单个JSON对象
    // yarn: 每行一个JSON（NDJSON）
    let critical = 0,
      high = 0,
      moderate = 0,
      low = 0;
    const advisoryMsgs: string[] = [];

    if (pm === 'yarn') {
      // yarn NDJSON
      const lines = (stdout || '').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.type === 'auditAdvisory' && obj.data?.advisory) {
            const sev = obj.data.advisory.severity;
            if (sev === 'critical') critical++;
            else if (sev === 'high') high++;
            else if (sev === 'moderate') moderate++;
            else if (sev === 'low') low++;
            advisoryMsgs.push(
              `${sev}: ${obj.data.advisory.module_name} - ${obj.data.advisory.title}`
            );
          }
        } catch {
          // ignore parse errors
        }
      }
    } else {
      // npm/pnpm JSON
      const report = JSON.parse(stdout || '{}');
      const vulns = report.vulnerabilities || {};
      // npm format: vulnerabilities是对象map
      // pnpm format: 类似npm
      for (const [name, info] of Object.entries<any>(vulns)) {
        const sev = info.severity || 'info';
        if (sev === 'critical') critical++;
        else if (sev === 'high') high++;
        else if (sev === 'moderate') moderate++;
        else if (sev === 'low') low++;
        if (['low', 'moderate', 'high', 'critical'].includes(sev)) {
          advisoryMsgs.push(`${sev}: ${name}`);
        }
      }
      // pnpm 有时用 advisories 字段
      if (report.advisories) {
        for (const adv of Object.values<any>(report.advisories)) {
          const sev = adv.severity;
          if (sev === 'critical') critical++;
          else if (sev === 'high') high++;
          else if (sev === 'moderate') moderate++;
          else if (sev === 'low') low++;
          advisoryMsgs.push(`${sev}: ${adv.module_name} - ${adv.title}`);
        }
      }
    }

    // 根据阈值生成issues
    const addIssue = (sev: 'low' | 'moderate' | 'high' | 'critical', count: number) => {
      if (count === 0) return;
      const idx = SEVERITY_ORDER.indexOf(sev);
      const isError = idx >= thresholdIdx;
      const severity: 'error' | 'warn' = isError ? 'error' : 'warn';
      result.issues.push({
        rule: `npm-audit/${sev}`,
        severity,
        message: `检测到 ${count} 个 ${sev} 级别的安全漏洞（当前阈值: ${auditLevel}）。运行 \`${pm} audit\` 查看详情。`,
      });
    };

    addIssue('critical', critical);
    addIssue('high', high);
    addIssue('moderate', moderate);
    addIssue('low', low);

    result.errors = result.issues.filter((i) => i.severity === 'error').length;
    result.warnings = result.issues.filter((i) => i.severity === 'warn').length;
    result.status = result.errors > 0 ? 'fail' : result.warnings > 0 ? 'warning' : 'pass';
    if (advisoryMsgs.length > 0) {
      result.details = advisoryMsgs.slice(0, 5).join('\n') + (advisoryMsgs.length > 5 ? `\n... 共 ${advisoryMsgs.length} 条` : '');
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      result.status = 'skipped';
      result.details = `${pm} 未安装，跳过 audit 检查`;
    } else {
      result.status = 'warning';
      result.details = `${pm} audit 执行失败（不阻断）: ${err.message || String(err)}`;
      result.warnings = 1;
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function findLocalBin(name: string): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, 'node_modules', '.bin', name);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return name; // fallback 到 PATH
}

// ─────────────────────────────────────────────
// Reporter
// ─────────────────────────────────────────────

function printSummary(results: CheckResult[]) {
  console.log('');
  console.log(chalk.bold('═══ Frontend Guard Check Summary ═══'));
  console.log('');
  for (const r of results) {
    const icon =
      r.status === 'pass'
        ? chalk.green('✔')
        : r.status === 'fail'
        ? chalk.red('✖')
        : r.status === 'warning'
        ? chalk.yellow('▲')
        : chalk.gray('○');
    const statusText =
      r.status === 'pass'
        ? chalk.green('PASS')
        : r.status === 'fail'
        ? chalk.red('FAIL')
        : r.status === 'warning'
        ? chalk.yellow('WARN')
        : chalk.gray('SKIP');
    const counts = `(${chalk.red(r.errors + ' errors')}, ${chalk.yellow(r.warnings + ' warnings')})`;
    console.log(`  ${icon} ${r.name.padEnd(20)} ${statusText}  ${counts}`);
    if (r.details && (r.status === 'skipped' || r.status === 'warning')) {
      console.log(chalk.gray(`    └─ ${r.details.split('\n').join('\n       ')}`));
    }
  }
  console.log('');
}

function formatPretty(issues: GuardIssue[]): string {
  if (issues.length === 0) return '';
  const grouped = new Map<string, GuardIssue[]>();
  for (const iss of issues) {
    const key = iss.file || '(global)';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(iss);
  }
  const parts: string[] = [];
  for (const [file, list] of grouped) {
    parts.push(chalk.underline(file));
    for (const iss of list) {
      const icon = iss.severity === 'error' ? chalk.red('✖') : chalk.yellow('▲');
      const loc = iss.line ? chalk.gray(`  ${iss.line}:${iss.column || 0}`) : '';
      parts.push(`  ${icon}${loc}  ${iss.message}  ${chalk.gray(iss.rule)}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}

function formatGitHubActions(issues: GuardIssue[]): string {
  const parts: string[] = [];
  for (const iss of issues) {
    const sev = iss.severity === 'error' ? 'error' : 'warning';
    const loc = iss.file ? `file=${iss.file}${iss.line ? `,line=${iss.line}` : ''}${iss.column ? `,col=${iss.column}` : ''}` : '';
    parts.push(`::${sev} ${loc}::${iss.message} [${iss.rule}]`);
  }
  return parts.join('\n');
}

// ─────────────────────────────────────────────
// Command
// ─────────────────────────────────────────────

export const checkCommand = new Command('check')
  .description('运行所有 Frontend Guard 检查：ESLint、depcheck、ts-prune、npm audit')
  .option('--format <format>', '输出格式 (pretty|json|github-actions)', 'pretty')
  .option('--fix', '尝试自动修复（仅 ESLint）')
  .option('--quiet', '只显示 errors')
  .action(async (options) => {
    const { config, configPath } = await loadConfig();
    const { errors: configErrors, warnings: configWarnings } = validateConfig(config);
    if (configErrors.length > 0) {
      console.error(chalk.red('❌ 配置文件错误:'));
      for (const e of configErrors) {
        console.error(chalk.red(`   - [${e.field}] ${e.message}`));
      }
      process.exit(1);
    }
    const realWarnings = configWarnings.filter((w) => !w.message.includes('未知字段'));
    if (realWarnings.length > 0 && !options.quiet) {
      console.warn(chalk.yellow('⚠️  配置警告:'));
      for (const w of realWarnings) {
        console.warn(chalk.yellow(`   - [${w.field}] ${w.message}`));
      }
    }

    // 读取 checks 开关（默认全开）
    const checks = config.checks || {};
    const enableEslint = checks.eslint !== false;
    const enableDepcheck = checks.depcheck !== false;
    const enableTsPrune = checks.tsPrune !== false;
    const enableNpmAudit = checks.npmAudit !== false;
    const auditLevel = checks.auditLevel || 'high';

    const results: CheckResult[] = [];

    if (enableEslint) {
      results.push(await runEslintCheck(config, { fix: options.fix, quiet: options.quiet }));
    } else {
      results.push({ name: 'ESLint', status: 'skipped', errors: 0, warnings: 0, issues: [], details: '已在 config 中禁用' });
    }

    if (enableDepcheck) {
      results.push(await runDepcheckCheck());
    } else {
      results.push({ name: 'depcheck', status: 'skipped', errors: 0, warnings: 0, issues: [], details: '已在 config 中禁用' });
    }

    if (enableTsPrune) {
      results.push(await runTsPruneCheck());
    } else {
      results.push({ name: 'ts-prune', status: 'skipped', errors: 0, warnings: 0, issues: [], details: '已在 config 中禁用' });
    }

    if (enableNpmAudit) {
      results.push(await runNpmAuditCheck(auditLevel));
    } else {
      results.push({ name: 'npm audit', status: 'skipped', errors: 0, warnings: 0, issues: [], details: '已在 config 中禁用' });
    }

    // 汇总所有 issues
    const allIssues = results.flatMap((r) => r.issues);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

    // 输出 issues 明细
    if (options.format === 'json') {
      console.log(JSON.stringify({ results, issues: allIssues, totalErrors, totalWarnings }, null, 2));
    } else if (options.format === 'github-actions') {
      console.log(formatGitHubActions(allIssues));
    } else {
      if (allIssues.length > 0) {
        console.log(formatPretty(allIssues));
      }
      printSummary(results);
      console.log(chalk.bold(`总计: ${chalk.red(totalErrors + ' errors')}, ${chalk.yellow(totalWarnings + ' warnings')}`));
      console.log('');
    }

    // 任何一个 check 失败 → exit 1
    if (totalErrors > 0) process.exit(1);
  });