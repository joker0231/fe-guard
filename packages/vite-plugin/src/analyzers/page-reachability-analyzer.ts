import type { Analyzer, GuardIssue } from '../types';
import { RouteCollector } from '../collectors/route-collector';
import { isPageComponent, isRouteConfig } from '../utils/file-scanner';
import { extractNavigationTargets } from '../utils/ast-utils';
import path from 'path';

/** 不需要显式导航入口的入口路由 */
const ENTRY_ROUTES = new Set(['/', '/login', '/404', '/*', '/register', '/signup']);

/**
 * 页面可达性分析器
 * 检测死链路由、孤儿页面、不可达路由等问题
 */
export class PageReachabilityAnalyzer implements Analyzer {
  private routeCollector = new RouteCollector();
  private navigationTargets: Map<string, string[]> = new Map();
  private pageFiles: Set<string> = new Set();
  private allFiles: Set<string> = new Set();

  collect(code: string, id: string): void {
    this.allFiles.add(id);

    // 收集路由配置
    if (isRouteConfig(id)) {
      this.routeCollector.collect(code, id);
    }

    // 收集导航目标
    const targets = extractNavigationTargets(code);
    if (targets.length > 0) {
      this.navigationTargets.set(id, targets);
    }

    // 收集页面组件
    if (isPageComponent(id)) {
      this.pageFiles.add(id);
    }
  }

  analyze(): GuardIssue[] {
    const issues: GuardIssue[] = [];

    if (!this.routeCollector.hasRouteFiles()) {
      return issues;
    }

    const routePaths = new Set(this.routeCollector.getRoutePaths());
    const routeComponents = new Set(this.routeCollector.getRouteComponents());
    const allNavTargets = this.getAllNavigationTargets();

    // 1. 检测死链：导航目标不在路由表中
    this.checkDeadLinks(routePaths, allNavTargets, issues);

    // 2. 检测孤儿页面：在 pages/ 目录中但未注册路由
    this.checkOrphanPages(routeComponents, issues);

    // 3. 检测不可达路由：已注册但没有导航指向
    this.checkUnreachableRoutes(routePaths, allNavTargets, issues);

    return issues;
  }

  private getAllNavigationTargets(): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const [file, targets] of this.navigationTargets) {
      result.set(file, new Set(targets));
    }
    return result;
  }

  private checkDeadLinks(
    routePaths: Set<string>,
    navTargets: Map<string, Set<string>>,
    issues: GuardIssue[],
  ): void {
    for (const [file, targets] of navTargets) {
      for (const target of targets) {
        // 跳过动态路径参数和外部链接
        if (target.includes(':') || target.startsWith('http') || target.startsWith('//')) {
          continue;
        }

        // 检查目标路径是否在路由表中（支持通配符匹配）
        if (!this.isPathRegistered(target, routePaths)) {
          issues.push({
            rule: 'page-reachability/dead-link',
            severity: 'warn',
            message: `导航目标 "${target}" 未在路由配置中注册，可能为死链。`,
            file,
          });
        }
      }
    }
  }

  private checkOrphanPages(
    routeComponents: Set<string>,
    issues: GuardIssue[],
  ): void {
    for (const pageFile of this.pageFiles) {
      const fileName = path.basename(pageFile, path.extname(pageFile));
      const componentName = toPascalCase(fileName);

      // 检查该页面组件是否被路由引用
      const isReferenced =
        routeComponents.has(componentName) ||
        routeComponents.has(fileName) ||
        this.isLazyImported(pageFile, routeComponents);

      if (!isReferenced) {
        issues.push({
          rule: 'page-reachability/orphan-page',
          severity: 'warn',
          message: `页面组件 "${path.basename(pageFile)}" 位于 pages/views 目录中，但未被路由配置引用，可能为孤儿页面。`,
          file: pageFile,
        });
      }
    }
  }

  private checkUnreachableRoutes(
    routePaths: Set<string>,
    navTargets: Map<string, Set<string>>,
    issues: GuardIssue[],
  ): void {
    const allTargetPaths = new Set<string>();
    for (const [, targets] of navTargets) {
      for (const target of targets) {
        allTargetPaths.add(target);
      }
    }

    for (const routePath of routePaths) {
      // 排除入口路由和动态路由
      if (ENTRY_ROUTES.has(routePath) || routePath.includes(':') || routePath.includes('*')) {
        continue;
      }

      // 检查是否有导航指向该路由
      if (!this.hasNavigationTo(routePath, allTargetPaths)) {
        issues.push({
          rule: 'page-reachability/unreachable-route',
          severity: 'warn',
          message: `路由 "${routePath}" 已注册但没有任何导航指向它，用户可能无法访问该页面。`,
        });
      }
    }
  }

  private isPathRegistered(target: string, routePaths: Set<string>): boolean {
    if (routePaths.has(target)) return true;

    // 检查是否匹配带参数的路由
    for (const routePath of routePaths) {
      if (routePath === '/*' || routePath === '*') return true;
      if (this.matchDynamicRoute(target, routePath)) return true;
    }
    return false;
  }

  private matchDynamicRoute(target: string, routePattern: string): boolean {
    const targetParts = target.split('/').filter(Boolean);
    const patternParts = routePattern.split('/').filter(Boolean);

    if (targetParts.length !== patternParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':') || patternParts[i] === '*') continue;
      if (patternParts[i] !== targetParts[i]) return false;
    }
    return true;
  }

  private hasNavigationTo(routePath: string, allTargetPaths: Set<string>): boolean {
    if (allTargetPaths.has(routePath)) return true;

    // 检查是否有动态路径可能匹配此路由
    for (const target of allTargetPaths) {
      if (this.matchDynamicRoute(target, routePath)) return true;
    }
    return false;
  }

  private isLazyImported(pageFile: string, routeComponents: Set<string>): boolean {
    for (const comp of routeComponents) {
      if (comp.startsWith('lazy(') && pageFile.includes(comp.slice(5, -1))) {
        return true;
      }
    }
    return false;
  }
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_.]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
