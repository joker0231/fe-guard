import type { GuardIssue } from '../types';

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BG_RED = '\x1b[41m';
const BG_YELLOW = '\x1b[43m';

/**
 * 控制台报告输出
 * 带颜色和格式化的终端输出，按严重程度和规则分组
 */
export function reportToConsole(issues: GuardIssue[]): void {
  if (issues.length === 0) {
    console.log(
      `\n${BOLD}${CYAN}[frontend-guard]${RESET} ${BOLD}分析完成，未发现问题。${RESET}\n`,
    );
    return;
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  console.log('');
  console.log(
    `${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`,
  );
  console.log(
    `${BOLD}${CYAN}  Frontend Guard - 跨文件分析报告${RESET}`,
  );
  console.log(
    `${BOLD}${CYAN}═══════════════════════════════════════════════${RESET}`,
  );
  console.log('');

  // 按规则分组
  const groupedByRule = new Map<string, GuardIssue[]>();
  for (const issue of issues) {
    if (!groupedByRule.has(issue.rule)) {
      groupedByRule.set(issue.rule, []);
    }
    groupedByRule.get(issue.rule)!.push(issue);
  }

  // 先输出 error，再输出 warn
  if (errors.length > 0) {
    console.log(`${BOLD}${BG_RED}${WHITE} ERRORS ${RESET} ${RED}${errors.length} 个错误${RESET}`);
    console.log('');
    printGroupedIssues(groupedByRule, 'error');
  }

  if (warnings.length > 0) {
    console.log(
      `${BOLD}${BG_YELLOW}${WHITE} WARNINGS ${RESET} ${YELLOW}${warnings.length} 个警告${RESET}`,
    );
    console.log('');
    printGroupedIssues(groupedByRule, 'warn');
  }

  // 摘要
  console.log(`${DIM}${'─'.repeat(47)}${RESET}`);
  console.log(
    `${BOLD}总计：${RESET}` +
      `${errors.length > 0 ? `${RED}${errors.length} 个错误${RESET}` : '0 个错误'}` +
      ` | ` +
      `${warnings.length > 0 ? `${YELLOW}${warnings.length} 个警告${RESET}` : '0 个警告'}`,
  );
  console.log('');
}

function printGroupedIssues(
  grouped: Map<string, GuardIssue[]>,
  severity: 'error' | 'warn',
): void {
  const color = severity === 'error' ? RED : YELLOW;
  const icon = severity === 'error' ? 'x' : '!';

  for (const [rule, issues] of grouped) {
    const filteredIssues = issues.filter((i) => i.severity === severity);
    if (filteredIssues.length === 0) continue;

    console.log(`  ${BOLD}${color}${icon}${RESET} ${BOLD}${rule}${RESET} ${DIM}(${filteredIssues.length})${RESET}`);

    for (const issue of filteredIssues) {
      const fileInfo = issue.file
        ? `${DIM}${formatFilePath(issue.file)}${issue.line ? `:${issue.line}` : ''}${RESET}`
        : '';
      console.log(`    ${color}${issue.message}${RESET}`);
      if (fileInfo) {
        console.log(`    ${fileInfo}`);
      }
    }
    console.log('');
  }
}

function formatFilePath(filePath: string): string {
  // 尝试显示相对路径
  const cwd = process.cwd();
  if (filePath.startsWith(cwd)) {
    return filePath.slice(cwd.length + 1);
  }
  return filePath;
}
