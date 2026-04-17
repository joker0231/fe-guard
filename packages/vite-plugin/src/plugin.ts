/**
 * Vite Plugin 类型定义
 * vite 为 peerDependency，此处内联最小接口避免在未安装 vite 时类型检查失败
 */
interface VitePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  buildStart?: (this: void) => void | Promise<void>;
  transform?: (this: void, code: string, id: string) => null | undefined | { code: string; map?: unknown };
  buildEnd?: (this: void, error?: Error) => void | Promise<void>;
}
import type { Analyzer, GuardIssue } from './types';
import { isComponentFile } from './utils/file-scanner';
import { PageReachabilityAnalyzer } from './analyzers/page-reachability-analyzer';
import { StateCompletenessAnalyzer } from './analyzers/state-completeness-analyzer';
import { CrudAnalyzer } from './analyzers/crud-analyzer';
import { EcosystemDepsAnalyzer } from './analyzers/ecosystem-deps-analyzer';
import { ThemeCoverageAnalyzer } from './analyzers/theme-coverage-analyzer';
import { reportToConsole } from './reporters/console-reporter';
import { reportToJson, writeJsonReport } from './reporters/json-reporter';
import path from 'path';

export interface FrontendGuardViteOptions {
  router?: {
    type: 'react-router-v6' | 'next-pages' | 'next-app' | 'tanstack-router';
    configPath?: string;
    pagesDir?: string;
  };
  api?: {
    layerPattern?: string;
    baseUrlEnv?: string;
  };
  analyzers?: {
    pageReachability?: boolean;
    deadCode?: boolean;
    stateCompleteness?: boolean;
    ecosystemDeps?: boolean;
    themeCoverage?: boolean;
  };
  strict?: boolean;
  report?: {
    format?: 'console' | 'json' | 'html';
    output?: string;
  };
}

const DEFAULT_OPTIONS: Required<
  Pick<FrontendGuardViteOptions, 'analyzers' | 'strict' | 'report'>
> = {
  analyzers: {
    pageReachability: true,
    deadCode: false,
    stateCompleteness: true,
    ecosystemDeps: true,
    themeCoverage: true,
  },
  strict: false,
  report: {
    format: 'console',
  },
};

/**
 * Frontend Guard Vite 插件
 * 在构建过程中执行 L2 跨文件分析，检测前端项目中的潜在问题
 */
export function frontendGuardPlugin(
  userOptions: FrontendGuardViteOptions = {},
): VitePlugin {
  const options = mergeOptions(userOptions);
  let activeAnalyzers: Analyzer[] = [];
  let projectRoot = '';

  return {
    name: 'frontend-guard',
    enforce: 'pre',

    buildStart() {
      projectRoot = process.cwd();
      activeAnalyzers = initializeAnalyzers(options, projectRoot);
    },

    transform(code: string, id: string): null {
      // 只处理组件文件
      if (!isComponentFile(id)) return null;

      // 收集每个模块的信息（不修改代码）
      for (const analyzer of activeAnalyzers) {
        try {
          analyzer.collect(code, id);
        } catch (err) {
          // 单个文件收集失败不应中断整个构建
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.warn(
            `[frontend-guard] 收集 "${path.basename(id)}" 信息时出错: ${errorMessage}`,
          );
        }
      }

      // 不修改源代码
      return null;
    },

    buildEnd() {
      const allIssues: GuardIssue[] = [];

      for (const analyzer of activeAnalyzers) {
        try {
          const issues = analyzer.analyze();
          allIssues.push(...issues);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.warn(`[frontend-guard] 分析阶段出错: ${errorMessage}`);
        }
      }

      // 输出报告
      outputReport(allIssues, options);

      // strict 模式下，如果有 error 级别问题则抛出错误中断构建
      if (options.strict) {
        const errors = allIssues.filter((i) => i.severity === 'error');
        if (errors.length > 0) {
          throw new Error(
            `[frontend-guard] strict 模式下发现 ${errors.length} 个错误，构建中止。`,
          );
        }
      }
    },
  };
}

function mergeOptions(
  userOptions: FrontendGuardViteOptions,
): Required<Pick<FrontendGuardViteOptions, 'analyzers' | 'strict' | 'report'>> &
  FrontendGuardViteOptions {
  return {
    ...userOptions,
    analyzers: {
      ...DEFAULT_OPTIONS.analyzers,
      ...userOptions.analyzers,
    },
    strict: userOptions.strict ?? DEFAULT_OPTIONS.strict,
    report: {
      ...DEFAULT_OPTIONS.report,
      ...userOptions.report,
    },
  };
}

function initializeAnalyzers(
  options: ReturnType<typeof mergeOptions>,
  projectRoot: string,
): Analyzer[] {
  const analyzers: Analyzer[] = [];
  const analyzerConfig = options.analyzers;

  if (analyzerConfig.pageReachability) {
    analyzers.push(new PageReachabilityAnalyzer());
  }

  if (analyzerConfig.stateCompleteness) {
    analyzers.push(new StateCompletenessAnalyzer());
  }

  if (analyzerConfig.deadCode) {
    analyzers.push(new CrudAnalyzer());
  }

  if (analyzerConfig.ecosystemDeps) {
    const ecosystemAnalyzer = new EcosystemDepsAnalyzer();
    ecosystemAnalyzer.setProjectRoot(projectRoot);
    analyzers.push(ecosystemAnalyzer);
  }

  if (analyzerConfig.themeCoverage) {
    analyzers.push(new ThemeCoverageAnalyzer());
  }

  return analyzers;
}

function outputReport(
  issues: GuardIssue[],
  options: ReturnType<typeof mergeOptions>,
): void {
  const format = options.report.format;

  switch (format) {
    case 'json':
      if (options.report.output) {
        writeJsonReport(issues, options.report.output);
        console.log(`[frontend-guard] JSON 报告已写入: ${options.report.output}`);
      } else {
        reportToJson(issues);
      }
      break;

    case 'html':
      // HTML reporter falls back to console + JSON file
      reportToConsole(issues);
      if (options.report.output) {
        writeJsonReport(issues, options.report.output);
      }
      break;

    case 'console':
    default:
      reportToConsole(issues);
      if (options.report.output) {
        writeJsonReport(issues, options.report.output);
      }
      break;
  }
}
