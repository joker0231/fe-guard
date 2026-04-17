import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { loadConfig } from '../config/loader';
import { validateConfig } from '../config/schema';
import { calculateScore, type GuardIssue, type ScoreResult } from '../report/scorer';
import { formatConsoleReport } from '../report/console-format';

interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
}

export const reportCommand = new Command('report')
  .description('生成 Frontend Guard 评分报告')
  .option('--format <format>', '报告格式 (console|json|html)', 'console')
  .option('--output <path>', '报告输出路径')
  .action(async (options: { format: string; output?: string }) => {
    const chalk = (await import('chalk')).default;
    const { default: ora } = await import('ora');

    const cwd = process.cwd();

    // ── Load config ──
    const spinner = ora('加载配置...').start();

    let config;
    try {
      config = await loadConfig(cwd);
    } catch (err) {
      spinner.fail('无法加载配置');
      console.error(chalk.red(`  ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }

    const validationErrors = validateConfig(config);
    const fatalErrors = validationErrors.filter(
      (e) => !e.message.startsWith('未知的配置字段'),
    );
    if (fatalErrors.length > 0) {
      spinner.fail('配置验证失败');
      for (const err of fatalErrors) {
        console.error(chalk.red(`  ${err.field}: ${err.message}`));
      }
      process.exit(1);
    }

    spinner.succeed('配置加载成功');

    // ── Find ESLint ──
    const eslintBin = findEslintBin(cwd);
    if (!eslintBin) {
      console.error('');
      console.error(chalk.red('错误: 未找到 ESLint。请确保已安装 ESLint:'));
      console.error(chalk.dim('  npm install -D eslint @frontend-guard/eslint-plugin'));
      console.error('');
      process.exit(1);
    }

    // ── Run ESLint ──
    const checkSpinner = ora('正在运行检查以生成报告...').start();

    const eslintArgs: string[] = ['.', '--format', 'json'];
    if (config.ignore) {
      for (const pattern of config.ignore) {
        eslintArgs.push('--ignore-pattern', pattern);
      }
    }

    let issues: GuardIssue[];
    try {
      const result = await runEslint(eslintBin, eslintArgs, cwd);
      const eslintResults: ESLintResult[] = JSON.parse(result.stdout || '[]');
      issues = mapToGuardIssues(eslintResults, cwd);
      checkSpinner.succeed('检查完成');
    } catch (err) {
      checkSpinner.fail('ESLint 执行失败');
      console.error(chalk.red(`  ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }

    // ── Calculate scores ──
    const scoreResult = calculateScore(issues);

    // ── Output ──
    if (options.format === 'json') {
      const jsonOutput = JSON.stringify(scoreResult, null, 2);
      if (options.output) {
        writeOutput(options.output, jsonOutput, cwd, chalk);
      } else {
        console.log(jsonOutput);
      }
    } else if (options.format === 'html') {
      const htmlOutput = generateHtmlReport(scoreResult);
      if (options.output) {
        writeOutput(options.output, htmlOutput, cwd, chalk);
      } else {
        // Default HTML output path
        const defaultPath = path.join(cwd, 'frontend-guard-report.html');
        writeOutput(defaultPath, htmlOutput, cwd, chalk);
      }
    } else {
      // Console format (default)
      const output = await formatConsoleReport(scoreResult);
      console.log(output);

      if (options.output) {
        // Strip ANSI codes for file output
        const stripped = stripAnsi(output);
        writeOutput(options.output, stripped, cwd, chalk);
      }
    }
  });

function findEslintBin(cwd: string): string | null {
  const localBin = path.join(cwd, 'node_modules', '.bin', 'eslint');
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  let dir = cwd;
  while (true) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
    const bin = path.join(dir, 'node_modules', '.bin', 'eslint');
    if (fs.existsSync(bin)) {
      return bin;
    }
  }

  return 'eslint';
}

function runEslint(
  bin: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error(`无法找到 ESLint 可执行文件: ${bin}`));
        return;
      }
      const exitCode = error ? (error as any).code ?? 1 : 0;
      resolve({ stdout: stdout ?? '', stderr: stderr ?? '', exitCode: typeof exitCode === 'number' ? exitCode : 1 });
    });
  });
}

function mapToGuardIssues(results: ESLintResult[], cwd: string): GuardIssue[] {
  const issues: GuardIssue[] = [];
  for (const result of results) {
    const relativeFile = path.relative(cwd, result.filePath);
    for (const msg of result.messages) {
      if (!msg.ruleId) continue;
      issues.push({
        rule: msg.ruleId,
        severity: msg.severity === 2 ? 'error' : 'warn',
        message: msg.message,
        file: relativeFile,
        line: msg.line,
        column: msg.column,
      });
    }
  }
  return issues;
}

function writeOutput(
  outputPath: string,
  content: string,
  cwd: string,
  chalk: typeof import('chalk').default,
): void {
  const resolved = path.isAbsolute(outputPath) ? outputPath : path.resolve(cwd, outputPath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resolved, content, 'utf-8');
  console.log('');
  console.log(chalk.green(`报告已保存到: ${resolved}`));
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function generateHtmlReport(result: ScoreResult): string {
  const errorCount = result.categories.reduce(
    (sum, c) => sum + c.issues.filter((i) => i.severity === 'error').length,
    0,
  );
  const warnCount = result.categories.reduce(
    (sum, c) => sum + c.issues.filter((i) => i.severity === 'warn').length,
    0,
  );

  const gradeLabel = getGrade(result.overall);
  const gradeColor = result.overall >= 80 ? '#22c55e' : result.overall >= 60 ? '#eab308' : '#ef4444';

  const categoryRows = result.categories
    .sort((a, b) => {
      const aRatio = a.maxScore > 0 ? a.score / a.maxScore : 1;
      const bRatio = b.maxScore > 0 ? b.score / b.maxScore : 1;
      return aRatio - bRatio;
    })
    .map((cat) => {
      const ratio = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 100;
      const barColor = ratio >= 80 ? '#22c55e' : ratio >= 60 ? '#eab308' : '#ef4444';
      const issueCount = cat.issues.length;
      return `
        <tr>
          <td>${escapeHtml(cat.name)}</td>
          <td>
            <div class="bar-container">
              <div class="bar" style="width:${ratio}%; background:${barColor}"></div>
            </div>
          </td>
          <td>${cat.score}/${cat.maxScore}</td>
          <td>${issueCount > 0 ? `<span class="badge">${issueCount}</span>` : '<span class="ok">-</span>'}</td>
        </tr>`;
    })
    .join('\n');

  const topIssues = result.categories
    .flatMap((c) => c.issues)
    .sort((a, b) => (a.severity === 'error' ? -1 : 1) - (b.severity === 'error' ? -1 : 1))
    .slice(0, 20)
    .map(
      (issue) => `
        <tr>
          <td><span class="severity-${issue.severity}">${issue.severity === 'error' ? '错误' : '警告'}</span></td>
          <td>${escapeHtml(issue.rule)}</td>
          <td>${escapeHtml(issue.message)}</td>
          <td>${issue.file ? escapeHtml(`${issue.file}:${issue.line ?? ''}`) : '-'}</td>
        </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontend Guard Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 0.5rem; font-size: 1.8rem; }
    .subtitle { text-align: center; color: #94a3b8; margin-bottom: 2rem; }
    .score-card { text-align: center; padding: 2rem; background: #1e293b; border-radius: 12px; margin-bottom: 2rem; }
    .score-value { font-size: 3.5rem; font-weight: bold; color: ${gradeColor}; }
    .score-label { font-size: 1rem; color: #94a3b8; margin-top: 0.5rem; }
    .grade { display: inline-block; font-size: 1.5rem; font-weight: bold; color: ${gradeColor}; border: 2px solid ${gradeColor}; border-radius: 8px; padding: 0.2rem 0.8rem; margin-top: 0.5rem; }
    .stats { display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { font-size: 0.8rem; color: #94a3b8; }
    .error-color { color: #ef4444; }
    .warn-color { color: #eab308; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { text-align: left; padding: 0.75rem; border-bottom: 2px solid #334155; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; }
    td { padding: 0.75rem; border-bottom: 1px solid #1e293b; }
    .bar-container { background: #334155; border-radius: 4px; height: 8px; width: 100%; }
    .bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .badge { background: #ef4444; color: white; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.8rem; }
    .ok { color: #22c55e; }
    .severity-error { color: #ef4444; font-weight: bold; }
    .severity-warn { color: #eab308; }
    h2 { margin-bottom: 1rem; font-size: 1.2rem; }
    .section { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .footer { text-align: center; color: #475569; font-size: 0.8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Frontend Guard Report</h1>
    <p class="subtitle">AI 代码编译级防御器 - 评分报告</p>

    <div class="score-card">
      <div class="score-value">${result.overall.toFixed(1)}</div>
      <div class="score-label">综合评分 / 100</div>
      <div class="grade">${gradeLabel}</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value error-color">${errorCount}</div>
          <div class="stat-label">错误</div>
        </div>
        <div class="stat">
          <div class="stat-value warn-color">${warnCount}</div>
          <div class="stat-label">警告</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>分类评分</h2>
      <table>
        <thead>
          <tr><th>分类</th><th>进度</th><th>得分</th><th>问题数</th></tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>
    </div>

    ${topIssues ? `
    <div class="section">
      <h2>主要问题</h2>
      <table>
        <thead>
          <tr><th>级别</th><th>规则</th><th>消息</th><th>位置</th></tr>
        </thead>
        <tbody>
          ${topIssues}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      由 Frontend Guard 生成 &mdash; ${new Date().toISOString().split('T')[0]}
    </div>
  </div>
</body>
</html>`;
}

function getGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
