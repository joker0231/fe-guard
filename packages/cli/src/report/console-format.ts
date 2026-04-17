import type { ScoreResult, CategoryScore } from './scorer';

/**
 * Format a score result for pretty terminal output.
 * Uses chalk for colors and block characters for progress bars.
 */
export async function formatConsoleReport(result: ScoreResult): Promise<string> {
  const chalk = (await import('chalk')).default;

  const lines: string[] = [];
  const width = 60;

  // ── Header ──
  lines.push('');
  lines.push(chalk.bold.cyan('╔' + '═'.repeat(width - 2) + '╗'));
  lines.push(chalk.bold.cyan('║') + centerText('Frontend Guard Report', width - 2, chalk) + chalk.bold.cyan('║'));
  lines.push(chalk.bold.cyan('╚' + '═'.repeat(width - 2) + '╝'));
  lines.push('');

  // ── Overall Score ──
  const overallColor = getScoreColor(result.overall, chalk);
  lines.push(chalk.bold('  综合评分: ') + overallColor(` ${result.overall.toFixed(1)} / 100 `));
  lines.push('  ' + renderProgressBar(result.overall, 100, 40, chalk));
  lines.push('');

  // ── Category Breakdown ──
  lines.push(chalk.bold.underline('  分类评分详情'));
  lines.push('');

  // Sort categories: ones with issues first, then by score ascending
  const sortedCategories = [...result.categories].sort((a, b) => {
    const aRatio = a.maxScore > 0 ? a.score / a.maxScore : 1;
    const bRatio = b.maxScore > 0 ? b.score / b.maxScore : 1;
    return aRatio - bRatio;
  });

  for (const category of sortedCategories) {
    const ratio = category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 100;
    const scoreColor = getScoreColor(ratio, chalk);
    const indicator = ratio < 50 ? chalk.red(' ⚠') : ratio < 80 ? chalk.yellow(' ●') : chalk.green(' ✓');

    const nameStr = padEnd(category.name, 24);
    const scoreStr = `${category.score}/${category.maxScore}`;
    const bar = renderProgressBar(category.score, category.maxScore, 20, chalk);

    lines.push(`  ${indicator} ${chalk.bold(nameStr)} ${bar} ${scoreColor(scoreStr)}`);
  }

  lines.push('');

  // ── Summary Counts ──
  let errorCount = 0;
  let warnCount = 0;
  for (const cat of result.categories) {
    for (const issue of cat.issues) {
      if (issue.severity === 'error') errorCount++;
      else warnCount++;
    }
  }

  lines.push(chalk.bold('  统计:'));
  lines.push(`    ${chalk.red(`错误: ${errorCount}`)}    ${chalk.yellow(`警告: ${warnCount}`)}    ${chalk.dim(`总计: ${errorCount + warnCount}`)}`);
  lines.push('');

  // ── Top Issues ──
  const allIssues = result.categories.flatMap((c) => c.issues);
  if (allIssues.length > 0) {
    const topIssues = allIssues
      .sort((a, b) => {
        // Errors first, then warnings
        if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
        return 0;
      })
      .slice(0, 10);

    lines.push(chalk.bold.underline('  主要问题'));
    lines.push('');

    for (const issue of topIssues) {
      const icon = issue.severity === 'error' ? chalk.red('✖') : chalk.yellow('▲');
      const location = issue.file
        ? chalk.dim(` ${issue.file}${issue.line ? `:${issue.line}` : ''}${issue.column ? `:${issue.column}` : ''}`)
        : '';
      lines.push(`    ${icon} ${chalk.dim(`[${issue.rule}]`)} ${issue.message}${location}`);
    }

    if (allIssues.length > 10) {
      lines.push(chalk.dim(`    ... 还有 ${allIssues.length - 10} 个问题`));
    }

    lines.push('');
  }

  // ── Footer ──
  const grade = getGrade(result.overall);
  const gradeColor = getScoreColor(result.overall, chalk);
  lines.push(chalk.bold('  等级: ') + gradeColor(chalk.bold(` ${grade} `)));
  lines.push('');

  return lines.join('\n');
}

function renderProgressBar(
  value: number,
  max: number,
  barWidth: number,
  chalk: typeof import('chalk').default,
): string {
  const ratio = max > 0 ? Math.min(value / max, 1) : 1;
  const filled = Math.round(ratio * barWidth);
  const empty = barWidth - filled;
  const percentage = ratio * 100;

  const color = getScoreColor(percentage, chalk);
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

function getScoreColor(percentage: number, chalk: typeof import('chalk').default) {
  if (percentage >= 80) return chalk.green;
  if (percentage >= 60) return chalk.yellow;
  if (percentage >= 40) return chalk.hex('#FF8C00'); // orange
  return chalk.red;
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

function centerText(text: string, width: number, chalk: typeof import('chalk').default): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  const rightPad = width - text.length - padding;
  return ' '.repeat(padding) + chalk.bold.white(text) + ' '.repeat(Math.max(0, rightPad));
}

function padEnd(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}
