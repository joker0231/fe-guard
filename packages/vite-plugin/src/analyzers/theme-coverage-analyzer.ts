import type { Analyzer, GuardIssue } from '../types';
import { isComponentFile } from '../utils/file-scanner';

/** 硬编码颜色值的匹配模式 */
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_COLOR_PATTERN = /rgba?\s*\(/g;
const HSL_COLOR_PATTERN = /hsla?\s*\(/g;

/** CSS 命名颜色（常见的） */
const NAMED_COLORS = new Set([
  'red', 'blue', 'green', 'white', 'black', 'gray', 'grey',
  'yellow', 'orange', 'purple', 'pink', 'brown', 'cyan',
  'magenta', 'lime', 'olive', 'navy', 'teal', 'aqua',
  'maroon', 'silver', 'fuchsia', 'coral', 'salmon', 'khaki',
  'indigo', 'violet', 'crimson', 'tomato', 'gold', 'plum',
  'wheat', 'tan', 'sienna', 'peru', 'linen', 'ivory',
  'beige', 'azure', 'lavender', 'orchid', 'thistle',
]);

/** CSS 变量/主题 Token 的匹配模式 */
const CSS_VAR_PATTERN = /var\(\s*--/g;
const THEME_TOKEN_PATTERN = /theme\./g;
const THEME_FUNC_PATTERN = /theme\(['"`]/g;
const STYLED_THEME_PATTERN = /\$\{.*?theme/g;
const TAILWIND_COLOR_PATTERN = /(?:bg|text|border|ring|shadow|fill|stroke)-(?:inherit|current|transparent|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/g;

/** 排除模式：注释、SVG 内容等 */
const COMMENT_LINE_PATTERN = /^\s*(\/\/|\/\*|\*)/;

interface ColorUsageStats {
  hardcodedCount: number;
  themeTokenCount: number;
  files: Map<string, { hardcoded: number; themed: number }>;
}

/**
 * 主题覆盖率分析器
 * 检测组件中硬编码颜色值与主题 Token 的使用比例
 */
export class ThemeCoverageAnalyzer implements Analyzer {
  private stats: ColorUsageStats = {
    hardcodedCount: 0,
    themeTokenCount: 0,
    files: new Map(),
  };
  private threshold: number;

  constructor(threshold: number = 70) {
    this.threshold = threshold;
  }

  collect(code: string, id: string): void {
    if (!isComponentFile(id)) return;

    const lines = code.split('\n');
    let hardcoded = 0;
    let themed = 0;

    for (const line of lines) {
      // 跳过注释行
      if (COMMENT_LINE_PATTERN.test(line)) continue;

      // 统计硬编码颜色
      hardcoded += this.countHardcodedColors(line);

      // 统计主题 Token 使用
      themed += this.countThemeTokens(line);
    }

    if (hardcoded > 0 || themed > 0) {
      this.stats.files.set(id, { hardcoded, themed });
      this.stats.hardcodedCount += hardcoded;
      this.stats.themeTokenCount += themed;
    }
  }

  analyze(): GuardIssue[] {
    const issues: GuardIssue[] = [];
    const total = this.stats.hardcodedCount + this.stats.themeTokenCount;

    if (total === 0) return issues;

    const coverage =
      total > 0 ? (this.stats.themeTokenCount / total) * 100 : 0;

    if (coverage < this.threshold) {
      issues.push({
        rule: 'theme-coverage/low-coverage',
        severity: 'warn',
        message:
          `主题 Token 覆盖率为 ${coverage.toFixed(1)}%（阈值 ${this.threshold}%）。` +
          `共发现 ${this.stats.hardcodedCount} 处硬编码颜色值和 ${this.stats.themeTokenCount} 处主题 Token 引用。` +
          `建议使用 CSS 变量或主题 Token 替代硬编码颜色值，以支持主题切换和暗色模式。`,
      });
    }

    // 报告硬编码颜色值最多的文件
    const sortedFiles = Array.from(this.stats.files.entries())
      .filter(([, stats]) => stats.hardcoded > 0)
      .sort((a, b) => b[1].hardcoded - a[1].hardcoded)
      .slice(0, 10);

    for (const [file, stats] of sortedFiles) {
      if (stats.hardcoded >= 5) {
        issues.push({
          rule: 'theme-coverage/hardcoded-colors',
          severity: 'warn',
          message:
            `文件包含 ${stats.hardcoded} 处硬编码颜色值。建议提取为 CSS 变量或主题 Token。`,
          file,
        });
      }
    }

    return issues;
  }

  private countHardcodedColors(line: string): number {
    let count = 0;

    // 排除 CSS 变量定义行（如 --primary-color: #xxx）
    if (/--[\w-]+\s*:/.test(line)) return 0;

    // Hex colors
    const hexMatches = line.match(HEX_COLOR_PATTERN);
    if (hexMatches) {
      // Filter out false positives (e.g., IDs, hash values in URLs)
      for (const match of hexMatches) {
        if (!this.isFalsePositiveHex(line, match)) {
          count++;
        }
      }
    }

    // RGB/RGBA
    const rgbMatches = line.match(RGB_COLOR_PATTERN);
    if (rgbMatches) {
      count += rgbMatches.length;
    }

    // HSL/HSLA
    const hslMatches = line.match(HSL_COLOR_PATTERN);
    if (hslMatches) {
      count += hslMatches.length;
    }

    // Named colors in style contexts
    count += this.countNamedColors(line);

    return count;
  }

  private countThemeTokens(line: string): number {
    let count = 0;

    // CSS variables: var(--)
    const cssVarMatches = line.match(CSS_VAR_PATTERN);
    if (cssVarMatches) count += cssVarMatches.length;

    // Theme tokens: theme.xxx
    const themeMatches = line.match(THEME_TOKEN_PATTERN);
    if (themeMatches) count += themeMatches.length;

    // Theme function: theme('xxx')
    const themeFuncMatches = line.match(THEME_FUNC_PATTERN);
    if (themeFuncMatches) count += themeFuncMatches.length;

    // Styled-components theme: ${...theme...}
    const styledMatches = line.match(STYLED_THEME_PATTERN);
    if (styledMatches) count += styledMatches.length;

    // Tailwind color classes
    const tailwindMatches = line.match(TAILWIND_COLOR_PATTERN);
    if (tailwindMatches) count += tailwindMatches.length;

    return count;
  }

  private countNamedColors(line: string): number {
    // Only count named colors in style-related contexts
    const styleContexts = [
      /color\s*[:=]/i,
      /background\s*[:=]/i,
      /border\s*[:=]/i,
      /style\s*[={]/i,
      /fill\s*[:=]/i,
      /stroke\s*[:=]/i,
    ];

    const isStyleContext = styleContexts.some((pattern) => pattern.test(line));
    if (!isStyleContext) return 0;

    let count = 0;
    const words = line.split(/[\s:;'"`,{}()]+/);
    for (const word of words) {
      if (NAMED_COLORS.has(word.toLowerCase())) {
        count++;
      }
    }
    return count;
  }

  private isFalsePositiveHex(line: string, match: string): boolean {
    // Skip very short hex that might be numbers
    if (match.length <= 2) return true;

    // Skip hex in import paths, URLs, or identifiers
    const idx = line.indexOf(match);
    if (idx > 0) {
      const before = line.substring(Math.max(0, idx - 10), idx);
      if (/(?:url|import|from|require)\s*\(?['"`]/.test(before)) return true;
      // Skip IDs like #root, #app
      if (/^#[a-zA-Z]/.test(match) && !/^#[0-9a-fA-F]+$/.test(match)) return true;
    }

    return false;
  }
}
