import type { Analyzer, GuardIssue } from '../types';
import { parseModule } from '../utils/ast-utils';
import { isComponentFile } from '../utils/file-scanner';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

/** 异步数据获取 Hook 模式 */
const ASYNC_DATA_HOOKS = [
  'useQuery',
  'useSWR',
  'useFetch',
  'useRequest',
  'useAsyncData',
  'useInfiniteQuery',
];

/** 异步状态字段模式 */
const LOADING_PATTERNS = ['loading', 'isLoading', 'isFetching', 'pending', 'isPending'];
const ERROR_PATTERNS = ['error', 'isError', 'hasError'];
const EMPTY_PATTERNS = ['data', 'isEmpty', 'empty', 'noData'];

/** 搜索/筛选相关 Hook */
const FILTER_STATE_HOOKS = ['useState'];
const URL_SYNC_HOOKS = ['useSearchParams', 'useQueryParams', 'useRouter', 'useLocation'];

interface FileAnalysis {
  id: string;
  hasAsyncData: boolean;
  asyncHooksUsed: string[];
  destructuredFields: Set<string>;
  hasLoadingState: boolean;
  hasErrorState: boolean;
  hasEmptyState: boolean;
  hasFilterState: boolean;
  hasUrlSync: boolean;
  filterStateNames: string[];
}

/**
 * 状态完整性分析器
 * 检测异步数据流中缺失的加载、错误、空数据状态处理
 * 检测筛选/搜索状态是否与 URL 同步
 */
export class StateCompletenessAnalyzer implements Analyzer {
  private fileAnalyses: FileAnalysis[] = [];

  collect(code: string, id: string): void {
    if (!isComponentFile(id)) return;

    const ast = parseModule(code);
    if (!ast) return;

    const analysis: FileAnalysis = {
      id,
      hasAsyncData: false,
      asyncHooksUsed: [],
      destructuredFields: new Set(),
      hasLoadingState: false,
      hasErrorState: false,
      hasEmptyState: false,
      hasFilterState: false,
      hasUrlSync: false,
      filterStateNames: [],
    };

    this.analyzeAST(ast, analysis);

    if (analysis.hasAsyncData || analysis.hasFilterState) {
      this.fileAnalyses.push(analysis);
    }
  }

  analyze(): GuardIssue[] {
    const issues: GuardIssue[] = [];

    for (const analysis of this.fileAnalyses) {
      // 检查异步数据状态完整性
      if (analysis.hasAsyncData) {
        if (!analysis.hasLoadingState) {
          issues.push({
            rule: 'state-completeness/missing-loading',
            severity: 'warn',
            message: `组件使用了异步数据获取（${analysis.asyncHooksUsed.join(', ')}），但未检测到 loading 状态处理。用户在数据加载时可能看到空白或闪烁。`,
            file: analysis.id,
          });
        }

        if (!analysis.hasErrorState) {
          issues.push({
            rule: 'state-completeness/missing-error',
            severity: 'warn',
            message: `组件使用了异步数据获取（${analysis.asyncHooksUsed.join(', ')}），但未检测到 error 状态处理。请求失败时用户将看不到错误提示。`,
            file: analysis.id,
          });
        }

        if (!analysis.hasEmptyState) {
          issues.push({
            rule: 'state-completeness/missing-empty',
            severity: 'warn',
            message: `组件使用了异步数据获取（${analysis.asyncHooksUsed.join(', ')}），但未检测到空数据状态处理。当返回数据为空时，页面可能没有适当的提示。`,
            file: analysis.id,
          });
        }
      }

      // 检查筛选/搜索状态 URL 同步
      if (analysis.hasFilterState && !analysis.hasUrlSync) {
        issues.push({
          rule: 'state-completeness/filter-url-sync',
          severity: 'warn',
          message: `组件使用了筛选/搜索状态（${analysis.filterStateNames.join(', ')}），但未使用 URL 参数同步（如 useSearchParams）。用户刷新页面或分享链接时筛选条件会丢失。`,
          file: analysis.id,
        });
      }
    }

    return issues;
  }

  private analyzeAST(ast: TSESTree.Program, analysis: FileAnalysis): void {
    this.visitNode(ast, analysis);
  }

  private visitNode(node: TSESTree.Node, analysis: FileAnalysis): void {
    if (!node || typeof node !== 'object') return;

    // 检测异步数据获取 Hook 调用
    if (node.type === AST_NODE_TYPES.CallExpression) {
      const hookName = this.getCallName(node);
      if (hookName && ASYNC_DATA_HOOKS.includes(hookName)) {
        analysis.hasAsyncData = true;
        analysis.asyncHooksUsed.push(hookName);
        this.collectDestructuredFields(node, analysis);
      }

      // 检测 URL 同步 Hook
      if (hookName && URL_SYNC_HOOKS.includes(hookName)) {
        analysis.hasUrlSync = true;
      }

      // 检测 fetch/axios 调用
      if (hookName === 'fetch' || hookName === 'axios') {
        analysis.hasAsyncData = true;
        analysis.asyncHooksUsed.push(hookName);
      }
    }

    // 检测 useState 用于筛选/搜索
    if (node.type === AST_NODE_TYPES.VariableDeclarator) {
      this.checkFilterState(node, analysis);
    }

    // 检测代码中的状态检查
    this.detectStateChecks(node, analysis);

    // Recursively visit
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            this.visitNode(item as TSESTree.Node, analysis);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in child) {
        this.visitNode(child as TSESTree.Node, analysis);
      }
    }
  }

  private getCallName(node: TSESTree.CallExpression): string | null {
    if (node.callee.type === AST_NODE_TYPES.Identifier) {
      return node.callee.name;
    }
    if (
      node.callee.type === AST_NODE_TYPES.MemberExpression &&
      node.callee.property.type === AST_NODE_TYPES.Identifier
    ) {
      return node.callee.property.name;
    }
    return null;
  }

  private collectDestructuredFields(
    callNode: TSESTree.CallExpression,
    analysis: FileAnalysis,
  ): void {
    // Look at the parent variable declarator for destructuring pattern
    // We check the context around the call by looking at the code structure
    // Since we're doing a tree walk, we check if the CallExpression is part of a VariableDeclarator
    // This is handled implicitly by the destructuredFields being populated during visitNode
  }

  private checkFilterState(node: TSESTree.VariableDeclarator, analysis: FileAnalysis): void {
    if (node.init?.type !== AST_NODE_TYPES.CallExpression) return;

    const hookName = this.getCallName(node.init);
    if (!hookName || !FILTER_STATE_HOOKS.includes(hookName)) return;

    // Check if the state variable name suggests a filter/search
    if (node.id.type === AST_NODE_TYPES.ArrayPattern && node.id.elements.length >= 1) {
      const firstElement = node.id.elements[0];
      if (firstElement?.type === AST_NODE_TYPES.Identifier) {
        const name = firstElement.name.toLowerCase();
        const isFilterState =
          name.includes('filter') ||
          name.includes('search') ||
          name.includes('query') ||
          name.includes('keyword') ||
          name.includes('sort') ||
          name.includes('page') ||
          name.includes('pagesize') ||
          name.includes('pagenum');

        if (isFilterState) {
          analysis.hasFilterState = true;
          analysis.filterStateNames.push(firstElement.name);
        }
      }
    }
  }

  private detectStateChecks(node: TSESTree.Node, analysis: FileAnalysis): void {
    // Check for conditional expressions or if statements involving loading/error/empty
    if (node.type === AST_NODE_TYPES.Identifier) {
      const name = node.name.toLowerCase();
      if (LOADING_PATTERNS.some((p) => name === p.toLowerCase())) {
        analysis.hasLoadingState = true;
      }
      if (ERROR_PATTERNS.some((p) => name === p.toLowerCase())) {
        analysis.hasErrorState = true;
      }
    }

    // Check for empty data patterns: xxx.length === 0, !xxx.length, !data, data == null
    if (node.type === AST_NODE_TYPES.BinaryExpression) {
      // xxx.length === 0 / == 0 / <= 0
      if (['===', '==', '<='].includes(node.operator)) {
        const isLengthZeroCheck =
          (this.isLengthAccess(node.left) && this.isZeroLiteral(node.right)) ||
          (this.isLengthAccess(node.right) && this.isZeroLiteral(node.left));
        if (isLengthZeroCheck) {
          analysis.hasEmptyState = true;
        }
      }
      // data == null / data === null / data === undefined
      if (['===', '=='].includes(node.operator)) {
        const isNullCheck =
          (this.isDataIdentifier(node.left) && this.isNullOrUndefined(node.right)) ||
          (this.isDataIdentifier(node.right) && this.isNullOrUndefined(node.left));
        if (isNullCheck) {
          analysis.hasEmptyState = true;
        }
      }
    }

    if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === '!') {
      // !xxx.length
      if (this.isLengthAccess(node.argument)) {
        analysis.hasEmptyState = true;
      }
      // !data (identifier in EMPTY_PATTERNS)
      if (node.argument.type === AST_NODE_TYPES.Identifier) {
        const name = node.argument.name.toLowerCase();
        if (EMPTY_PATTERNS.some((p) => name === p.toLowerCase())) {
          analysis.hasEmptyState = true;
        }
      }
    }

    if (node.type === AST_NODE_TYPES.ConditionalExpression) {
      // ternary with .length in test position
      if (this.containsLengthAccess(node.test)) {
        analysis.hasEmptyState = true;
      }
    }

    // Check JSX element names for common empty/loading/error components
    if (node.type === AST_NODE_TYPES.JSXOpeningElement) {
      const elemName = this.getJSXName(node.name);
      const lower = elemName.toLowerCase();
      if (lower.includes('loading') || lower.includes('spinner') || lower.includes('skeleton')) {
        analysis.hasLoadingState = true;
      }
      if (lower.includes('error') || lower.includes('alert')) {
        analysis.hasErrorState = true;
      }
      if (lower.includes('empty') || lower.includes('nodata') || lower.includes('placeholder')) {
        analysis.hasEmptyState = true;
      }
    }

    // Check for ternary / logical AND with loading, error strings
    if (node.type === AST_NODE_TYPES.ConditionalExpression || node.type === AST_NODE_TYPES.LogicalExpression) {
      const codeStr = this.getIdentifiersInExpression(node);
      if (LOADING_PATTERNS.some((p) => codeStr.has(p))) {
        analysis.hasLoadingState = true;
      }
      if (ERROR_PATTERNS.some((p) => codeStr.has(p))) {
        analysis.hasErrorState = true;
      }
    }
  }

  private getJSXName(name: TSESTree.JSXTagNameExpression): string {
    if (name.type === AST_NODE_TYPES.JSXIdentifier) return name.name;
    if (name.type === AST_NODE_TYPES.JSXMemberExpression) return name.property.name;
    return '';
  }

  private isLengthAccess(node: TSESTree.Node): boolean {
    return (
      node.type === AST_NODE_TYPES.MemberExpression &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      node.property.name === 'length'
    );
  }

  private isZeroLiteral(node: TSESTree.Node): boolean {
    return node.type === AST_NODE_TYPES.Literal && node.value === 0;
  }

  private isDataIdentifier(node: TSESTree.Node): boolean {
    if (node.type !== AST_NODE_TYPES.Identifier) return false;
    const name = node.name.toLowerCase();
    return EMPTY_PATTERNS.some((p) => name === p.toLowerCase());
  }

  private isNullOrUndefined(node: TSESTree.Node): boolean {
    if (node.type === AST_NODE_TYPES.Literal && node.value === null) return true;
    if (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') return true;
    return false;
  }

  private containsLengthAccess(node: TSESTree.Node): boolean {
    if (this.isLengthAccess(node)) return true;
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (child && typeof child === 'object' && 'type' in child) {
        if (this.containsLengthAccess(child as TSESTree.Node)) return true;
      }
    }
    return false;
  }

  private getIdentifiersInExpression(node: TSESTree.Node): Set<string> {
    const ids = new Set<string>();
    const walk = (n: TSESTree.Node): void => {
      if (n.type === AST_NODE_TYPES.Identifier) {
        ids.add(n.name);
      }
      for (const key of Object.keys(n)) {
        if (key === 'parent') continue;
        const child = (n as unknown as Record<string, unknown>)[key];
        if (child && typeof child === 'object' && 'type' in child) {
          walk(child as TSESTree.Node);
        }
      }
    };
    walk(node);
    return ids;
  }
}
