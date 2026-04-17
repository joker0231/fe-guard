import type { Analyzer, GuardIssue } from '../types';
import { RouteCollector } from '../collectors/route-collector';
import { isRouteConfig } from '../utils/file-scanner';
import { extractNavigationTargets } from '../utils/ast-utils';

interface EntityCrudInfo {
  entity: string;
  hasList: boolean;
  hasDetail: boolean;
  hasCreate: boolean;
  hasEdit: boolean;
  hasDelete: boolean;
  listPath?: string;
  detailPath?: string;
  createPath?: string;
  editPath?: string;
}

/**
 * CRUD 完整性分析器
 * 从路由模式中识别数据实体，检查 CRUD 操作的完整性
 */
export class CrudAnalyzer implements Analyzer {
  private routeCollector = new RouteCollector();
  private navigationTargets: string[] = [];

  collect(code: string, id: string): void {
    if (isRouteConfig(id)) {
      this.routeCollector.collect(code, id);
    }

    const targets = extractNavigationTargets(code);
    this.navigationTargets.push(...targets);
  }

  analyze(): GuardIssue[] {
    const issues: GuardIssue[] = [];

    if (!this.routeCollector.hasRouteFiles()) {
      return issues;
    }

    const routePaths = this.routeCollector.getRoutePaths();
    const entities = this.identifyEntities(routePaths);

    for (const [entityName, info] of entities) {
      const missing: string[] = [];

      if (!info.hasList) missing.push('列表页 (list)');
      if (!info.hasDetail) missing.push('详情页 (detail)');
      if (!info.hasCreate) missing.push('新建页 (create)');
      if (!info.hasEdit) missing.push('编辑页 (edit)');

      // 只有当实体至少有 2 个 CRUD 操作时才认为这是一个 CRUD 实体
      const existingOps = [info.hasList, info.hasDetail, info.hasCreate, info.hasEdit, info.hasDelete]
        .filter(Boolean).length;

      if (existingOps >= 2 && missing.length > 0) {
        issues.push({
          rule: 'crud-completeness/missing-operations',
          severity: 'warn',
          message: `数据实体 "${entityName}" 的 CRUD 操作不完整，缺少：${missing.join('、')}。已识别的路由模式表明这是一个 CRUD 资源，但部分操作页面缺失。`,
        });
      }
    }

    return issues;
  }

  private identifyEntities(routePaths: string[]): Map<string, EntityCrudInfo> {
    const entities = new Map<string, EntityCrudInfo>();

    for (const routePath of routePaths) {
      const segments = routePath.split('/').filter(Boolean);
      if (segments.length === 0) continue;

      // 识别实体名称（取路径第一个非参数段）
      const entitySegment = segments[0];
      if (entitySegment.startsWith(':') || entitySegment === '*') continue;

      const entity = entitySegment;
      if (!entities.has(entity)) {
        entities.set(entity, {
          entity,
          hasList: false,
          hasDetail: false,
          hasCreate: false,
          hasEdit: false,
          hasDelete: false,
        });
      }

      const info = entities.get(entity)!;
      const pathPattern = routePath.toLowerCase();

      // /entity -> list
      if (segments.length === 1) {
        info.hasList = true;
        info.listPath = routePath;
      }

      // /entity/:id -> detail
      if (segments.length === 2 && segments[1].startsWith(':')) {
        info.hasDetail = true;
        info.detailPath = routePath;
      }

      // /entity/create or /entity/new or /entity/add
      if (
        segments.length === 2 &&
        (segments[1] === 'create' || segments[1] === 'new' || segments[1] === 'add')
      ) {
        info.hasCreate = true;
        info.createPath = routePath;
      }

      // /entity/:id/edit or /entity/:id/update
      if (
        segments.length === 3 &&
        segments[1].startsWith(':') &&
        (segments[2] === 'edit' || segments[2] === 'update')
      ) {
        info.hasEdit = true;
        info.editPath = routePath;
      }

      // /entity/:id/delete or has delete pattern in navigation targets
      if (
        segments.length === 3 &&
        segments[1].startsWith(':') &&
        segments[2] === 'delete'
      ) {
        info.hasDelete = true;
      }

      // Also check for nested list patterns like /entity/list
      if (segments.length === 2 && segments[1] === 'list') {
        info.hasList = true;
        info.listPath = routePath;
      }

      // /entity/detail/:id
      if (
        segments.length === 3 &&
        segments[1] === 'detail' &&
        segments[2].startsWith(':')
      ) {
        info.hasDetail = true;
        info.detailPath = routePath;
      }
    }

    // Check delete operations in navigation targets (delete is often a button action, not a route)
    for (const [, info] of entities) {
      if (!info.hasDelete) {
        // If there's a list page, assume delete is likely a button action
        // We give the benefit of the doubt here
        if (info.hasList) {
          info.hasDelete = true;
        }
      }
    }

    return entities;
  }
}
