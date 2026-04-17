import { parse, AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

/**
 * 将源代码解析为 AST
 */
export function parseModule(code: string): TSESTree.Program | null {
  try {
    return parse(code, {
      jsx: true,
      loc: true,
      range: true,
      comment: false,
      errorOnUnknownASTType: false,
    });
  } catch {
    return null;
  }
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

/**
 * 提取文件中所有 import 语句信息
 */
export function extractImports(code: string): ImportInfo[] {
  const ast = parseModule(code);
  if (!ast) return [];

  const imports: ImportInfo[] = [];

  for (const node of ast.body) {
    if (node.type === AST_NODE_TYPES.ImportDeclaration) {
      const source = node.source.value as string;
      const specifiers: string[] = [];
      let isDefault = false;
      let isNamespace = false;

      for (const spec of node.specifiers) {
        if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier) {
          isDefault = true;
          specifiers.push(spec.local.name);
        } else if (spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
          isNamespace = true;
          specifiers.push(spec.local.name);
        } else if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
          specifiers.push(spec.local.name);
        }
      }

      imports.push({ source, specifiers, isDefault, isNamespace });
    }
  }

  return imports;
}

/**
 * 提取所有导航目标路径（Link to=, navigate(), redirect()）
 */
export function extractNavigationTargets(code: string): string[] {
  const ast = parseModule(code);
  if (!ast) return [];

  const targets: string[] = [];

  function visit(node: TSESTree.Node): void {
    if (!node || typeof node !== 'object') return;

    // Check JSX: <Link to="..." /> or <NavLink to="..." />
    if (node.type === AST_NODE_TYPES.JSXOpeningElement) {
      const elementName = getJSXElementName(node.name);
      if (elementName === 'Link' || elementName === 'NavLink') {
        for (const attr of node.attributes) {
          if (
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === 'to'
          ) {
            const value = extractJSXAttrValue(attr);
            if (value) targets.push(normalizePath(value));
          }
        }
      }
    }

    // Check call expressions: navigate('...'), redirect('...'), push('...')
    if (node.type === AST_NODE_TYPES.CallExpression) {
      const calleeName = getCalleeName(node.callee);
      if (
        calleeName === 'navigate' ||
        calleeName === 'redirect' ||
        calleeName === 'push' ||
        calleeName === 'replace'
      ) {
        if (node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (firstArg.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
            targets.push(normalizePath(firstArg.value));
          }
          if (firstArg.type === AST_NODE_TYPES.TemplateLiteral && firstArg.quasis.length === 1) {
            const raw = firstArg.quasis[0].value.cooked ?? firstArg.quasis[0].value.raw;
            if (raw) targets.push(normalizePath(raw));
          }
        }
      }

      // router.push('...'), router.replace('...')
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        (node.callee.property.name === 'push' || node.callee.property.name === 'replace')
      ) {
        if (node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (firstArg.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
            targets.push(normalizePath(firstArg.value));
          }
        }
      }
    }

    // Recursively visit child nodes
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            visit(item as TSESTree.Node);
          }
        }
      } else if (child && typeof child === 'object' && 'type' in child) {
        visit(child as TSESTree.Node);
      }
    }
  }

  visit(ast);
  return targets;
}

/**
 * 判断代码是否包含默认导出
 */
export function hasDefaultExport(code: string): boolean {
  const ast = parseModule(code);
  if (!ast) return false;

  for (const node of ast.body) {
    if (node.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      return true;
    }
    // export { Foo as default }
    if (node.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      for (const spec of node.specifiers) {
        if (
          spec.type === AST_NODE_TYPES.ExportSpecifier &&
          spec.exported.type === AST_NODE_TYPES.Identifier &&
          spec.exported.name === 'default'
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

// --- Helper functions ---

function getJSXElementName(
  name: TSESTree.JSXTagNameExpression,
): string {
  if (name.type === AST_NODE_TYPES.JSXIdentifier) {
    return name.name;
  }
  if (name.type === AST_NODE_TYPES.JSXMemberExpression) {
    return name.property.name;
  }
  return '';
}

function extractJSXAttrValue(attr: TSESTree.JSXAttribute): string | null {
  if (!attr.value) return null;

  if (attr.value.type === AST_NODE_TYPES.Literal) {
    return typeof attr.value.value === 'string' ? attr.value.value : null;
  }

  if (attr.value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    const expr = attr.value.expression;
    if (expr.type === AST_NODE_TYPES.Literal && typeof expr.value === 'string') {
      return expr.value;
    }
    if (expr.type === AST_NODE_TYPES.TemplateLiteral && expr.quasis.length === 1) {
      return expr.quasis[0].value.cooked ?? expr.quasis[0].value.raw;
    }
  }

  return null;
}

function getCalleeName(callee: TSESTree.Expression): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return callee.name;
  }
  return null;
}

function normalizePath(path: string): string {
  // Remove query params and hash
  const cleanPath = path.split('?')[0].split('#')[0];
  // Ensure leading slash
  if (cleanPath && !cleanPath.startsWith('/')) {
    return '/' + cleanPath;
  }
  return cleanPath || '/';
}
