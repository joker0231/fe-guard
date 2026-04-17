import { extractImports } from '../utils/ast-utils';
import type { ImportInfo } from '../utils/ast-utils';

export interface ImportGraph {
  /** 文件 -> 导入的模块列表 */
  fileImports: Map<string, ImportInfo[]>;
  /** 模块 -> 被哪些文件导入 */
  reverseImports: Map<string, Set<string>>;
}

/**
 * 导入关系收集器
 * 追踪文件间的导入依赖关系，构建导入图
 */
export class ImportCollector {
  private fileImports: Map<string, ImportInfo[]> = new Map();
  private reverseImports: Map<string, Set<string>> = new Map();
  private declaredDependencies: Set<string> = new Set();

  /**
   * 收集单个文件的导入信息
   */
  collect(code: string, id: string): void {
    const imports = extractImports(code);
    this.fileImports.set(id, imports);

    for (const imp of imports) {
      if (!this.reverseImports.has(imp.source)) {
        this.reverseImports.set(imp.source, new Set());
      }
      this.reverseImports.get(imp.source)!.add(id);
    }
  }

  /**
   * 设置 package.json 中声明的依赖列表
   */
  setDeclaredDependencies(deps: string[]): void {
    this.declaredDependencies = new Set(deps);
  }

  /**
   * 获取完整的导入图
   */
  getImportGraph(): ImportGraph {
    return {
      fileImports: this.fileImports,
      reverseImports: this.reverseImports,
    };
  }

  /**
   * 获取指定文件的所有导入
   */
  getFileImports(id: string): ImportInfo[] {
    return this.fileImports.get(id) ?? [];
  }

  /**
   * 获取导入了指定模块的文件列表
   */
  getImportersOf(source: string): Set<string> {
    return this.reverseImports.get(source) ?? new Set();
  }

  /**
   * 获取所有被导入的外部包（非相对路径导入）
   */
  getUsedPackages(): Set<string> {
    const packages = new Set<string>();
    for (const [, imports] of this.fileImports) {
      for (const imp of imports) {
        if (!imp.source.startsWith('.') && !imp.source.startsWith('/')) {
          // Extract package name (handle scoped packages)
          const parts = imp.source.split('/');
          const pkgName = imp.source.startsWith('@')
            ? parts.slice(0, 2).join('/')
            : parts[0];
          packages.add(pkgName);
        }
      }
    }
    return packages;
  }

  /**
   * 获取 package.json 中声明的依赖
   */
  getDeclaredDependencies(): Set<string> {
    return this.declaredDependencies;
  }

  /**
   * 获取所有收集的文件列表
   */
  getCollectedFiles(): string[] {
    return Array.from(this.fileImports.keys());
  }

  /**
   * 检查指定文件中是否导入了某个模块或模块中的特定导出
   */
  hasImport(fileId: string, source: string, specifier?: string): boolean {
    const imports = this.fileImports.get(fileId);
    if (!imports) return false;

    for (const imp of imports) {
      if (imp.source === source || imp.source.startsWith(source + '/')) {
        if (!specifier) return true;
        if (imp.specifiers.includes(specifier)) return true;
      }
    }
    return false;
  }
}
