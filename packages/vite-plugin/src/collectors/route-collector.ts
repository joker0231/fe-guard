import { parseModule } from '../utils/ast-utils';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

export interface RouteConfig {
  path: string;
  component?: string;
  children?: RouteConfig[];
}

/**
 * 路由配置收集器
 * 解析路由配置文件，提取路由路径和组件引用
 */
export class RouteCollector {
  private routes: RouteConfig[] = [];
  private routeFiles: Set<string> = new Set();

  /**
   * 收集路由配置文件中的路由定义
   */
  collect(code: string, id: string): void {
    this.routeFiles.add(id);
    const ast = parseModule(code);
    if (!ast) return;

    // Walk the AST looking for route config arrays and objects
    this.visitNode(ast);
  }

  /**
   * 获取收集到的所有路由配置
   */
  getRoutes(): RouteConfig[] {
    return this.routes;
  }

  /**
   * 获取所有已注册路由的路径列表
   */
  getRoutePaths(): string[] {
    const paths: string[] = [];
    const collectPaths = (routes: RouteConfig[], prefix: string = ''): void => {
      for (const route of routes) {
        const fullPath = joinPaths(prefix, route.path);
        paths.push(fullPath);
        if (route.children) {
          collectPaths(route.children, fullPath);
        }
      }
    };
    collectPaths(this.routes, '');
    return paths;
  }

  /**
   * 获取路由配置中引用的所有组件名称
   */
  getRouteComponents(): string[] {
    const components: string[] = [];
    const collect = (routes: RouteConfig[]): void => {
      for (const route of routes) {
        if (route.component) components.push(route.component);
        if (route.children) collect(route.children);
      }
    };
    collect(this.routes);
    return components;
  }

  /**
   * 判断是否已收集到任何路由文件
   */
  hasRouteFiles(): boolean {
    return this.routeFiles.size > 0;
  }

  private visitNode(node: TSESTree.Node): void {
    if (!node || typeof node !== 'object') return;

    // Look for array expressions that contain route-like objects
    if (node.type === AST_NODE_TYPES.ArrayExpression) {
      const routes = this.extractRoutesFromArray(node);
      if (routes.length > 0) {
        this.routes.push(...routes);
      }
    }

    // Look for createBrowserRouter, createRoutesFromElements, etc.
    if (
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.Identifier
    ) {
      const funcName = node.callee.name;
      if (
        funcName === 'createBrowserRouter' ||
        funcName === 'createHashRouter' ||
        funcName === 'createMemoryRouter'
      ) {
        if (
          node.arguments.length > 0 &&
          node.arguments[0].type === AST_NODE_TYPES.ArrayExpression
        ) {
          const routes = this.extractRoutesFromArray(node.arguments[0]);
          this.routes.push(...routes);
          return;
        }
      }
    }

    // Look for JSX-based Route elements: <Route path="..." element={<Component />} />
    if (node.type === AST_NODE_TYPES.JSXOpeningElement) {
      const elementName = this.getJSXName(node.name);
      if (elementName === 'Route') {
        const route = this.extractRouteFromJSX(node);
        if (route) {
          this.routes.push(route);
        }
      }
    }

    // Recursively walk
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            this.visitNode(item as TSESTree.Node);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in child) {
        this.visitNode(child as TSESTree.Node);
      }
    }
  }

  private extractRoutesFromArray(arrayNode: TSESTree.ArrayExpression): RouteConfig[] {
    const routes: RouteConfig[] = [];

    for (const element of arrayNode.elements) {
      if (!element) continue;
      if (element.type === AST_NODE_TYPES.ObjectExpression) {
        const route = this.extractRouteFromObject(element);
        if (route) routes.push(route);
      }
    }

    return routes;
  }

  private extractRouteFromObject(obj: TSESTree.ObjectExpression): RouteConfig | null {
    let path: string | undefined;
    let component: string | undefined;
    let children: RouteConfig[] | undefined;

    for (const prop of obj.properties) {
      if (prop.type !== AST_NODE_TYPES.Property) continue;
      const key = this.getPropertyKey(prop);
      if (!key) continue;

      if (key === 'path') {
        path = this.getStringValue(prop.value);
      } else if (key === 'element' || key === 'Component' || key === 'component') {
        component = this.extractComponentName(prop.value);
      } else if (key === 'children') {
        if (prop.value.type === AST_NODE_TYPES.ArrayExpression) {
          children = this.extractRoutesFromArray(prop.value);
        }
      }
    }

    if (path !== undefined) {
      return { path, component, children };
    }
    return null;
  }

  private extractRouteFromJSX(openingElement: TSESTree.JSXOpeningElement): RouteConfig | null {
    let path: string | undefined;
    let component: string | undefined;

    for (const attr of openingElement.attributes) {
      if (attr.type !== AST_NODE_TYPES.JSXAttribute || !attr.name) continue;
      const attrName =
        attr.name.type === AST_NODE_TYPES.JSXIdentifier ? attr.name.name : '';

      if (attrName === 'path') {
        path = this.extractJSXAttrStringValue(attr);
      } else if (attrName === 'element' || attrName === 'component') {
        component = this.extractJSXAttrComponentName(attr);
      }
    }

    if (path !== undefined) {
      return { path, component };
    }
    return null;
  }

  private getJSXName(name: TSESTree.JSXTagNameExpression): string {
    if (name.type === AST_NODE_TYPES.JSXIdentifier) return name.name;
    if (name.type === AST_NODE_TYPES.JSXMemberExpression) return name.property.name;
    return '';
  }

  private getPropertyKey(prop: TSESTree.Property): string | null {
    if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
    if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
      return prop.key.value;
    }
    return null;
  }

  private getStringValue(node: TSESTree.Node): string | undefined {
    if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
      return node.value;
    }
    if (node.type === AST_NODE_TYPES.TemplateLiteral && node.quasis.length === 1) {
      return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
    }
    return undefined;
  }

  private extractComponentName(node: TSESTree.Node): string | undefined {
    // <Component /> in JSX expression
    if (node.type === AST_NODE_TYPES.JSXElement) {
      const opening = node.openingElement;
      return this.getJSXName(opening.name);
    }

    // Identifier: Component
    if (node.type === AST_NODE_TYPES.Identifier) {
      return node.name;
    }

    // CallExpression: lazy(() => import('...'))
    if (
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'lazy'
    ) {
      return `lazy(${this.extractLazyImportPath(node)})`;
    }

    return undefined;
  }

  private extractLazyImportPath(node: TSESTree.CallExpression): string {
    if (node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (arg.type === AST_NODE_TYPES.ArrowFunctionExpression) {
        const body = arg.body;
        if (
          body.type === AST_NODE_TYPES.CallExpression &&
          body.callee.type === AST_NODE_TYPES.Identifier &&
          body.callee.name === 'import'
        ) {
          if (
            body.arguments.length > 0 &&
            body.arguments[0].type === AST_NODE_TYPES.Literal &&
            typeof body.arguments[0].value === 'string'
          ) {
            return body.arguments[0].value;
          }
        }
        // import() is an ImportExpression, not CallExpression
        if (body.type === AST_NODE_TYPES.ImportExpression) {
          if (
            body.source.type === AST_NODE_TYPES.Literal &&
            typeof body.source.value === 'string'
          ) {
            return body.source.value;
          }
        }
      }
    }
    return '?';
  }

  private extractJSXAttrStringValue(attr: TSESTree.JSXAttribute): string | undefined {
    if (!attr.value) return undefined;
    if (attr.value.type === AST_NODE_TYPES.Literal && typeof attr.value.value === 'string') {
      return attr.value.value;
    }
    if (attr.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
      const expr = attr.value.expression;
      if (expr.type === AST_NODE_TYPES.Literal && typeof expr.value === 'string') {
        return expr.value;
      }
    }
    return undefined;
  }

  private extractJSXAttrComponentName(attr: TSESTree.JSXAttribute): string | undefined {
    if (!attr.value) return undefined;
    if (attr.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
      const expr = attr.value.expression;
      return this.extractComponentName(expr as TSESTree.Node);
    }
    return undefined;
  }
}

function joinPaths(prefix: string, path: string): string {
  if (path.startsWith('/')) return path;
  if (!prefix || prefix === '/') return '/' + path;
  return prefix.replace(/\/$/, '') + '/' + path;
}
