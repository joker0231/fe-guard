import type { Analyzer, GuardIssue } from '../types';
import fs from 'fs';
import path from 'path';

interface EslintConfigInfo {
  hasTypescriptEslint: boolean;
  hasReactHooksPlugin: boolean;
  hasJsxA11yPlugin: boolean;
  disabledRules: string[];
  configPath?: string;
}

/**
 * 生态依赖分析器
 * 检查项目是否正确配置了关键的代码质量工具
 */
export class EcosystemDepsAnalyzer implements Analyzer {
  private projectRoot: string = '';
  private packageJsonDeps: Set<string> = new Set();
  private eslintConfigFound = false;

  setProjectRoot(root: string): void {
    this.projectRoot = root;
  }

  collect(_code: string, id: string): void {
    // 检测 package.json 来获取依赖列表
    if (id.endsWith('package.json')) {
      try {
        const content = fs.readFileSync(id, 'utf-8');
        const pkg = JSON.parse(content);
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
        for (const dep of Object.keys(allDeps)) {
          this.packageJsonDeps.add(dep);
        }
      } catch {
        // ignore parse errors
      }
    }

    // 检测 ESLint 配置文件
    if (this.isEslintConfig(id)) {
      this.eslintConfigFound = true;
    }
  }

  analyze(): GuardIssue[] {
    const issues: GuardIssue[] = [];

    // 如果没有设置项目根目录，尝试通过收集的信息推断
    if (this.projectRoot) {
      this.scanProjectRoot(issues);
    }

    // 基于收集到的 package.json 信息分析
    this.analyzeFromDeps(issues);

    return issues;
  }

  private scanProjectRoot(issues: GuardIssue[]): void {
    // 读取项目根目录的 package.json
    const pkgJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const content = fs.readFileSync(pkgJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
        for (const dep of Object.keys(allDeps)) {
          this.packageJsonDeps.add(dep);
        }
      } catch {
        // ignore
      }
    }

    // 查找 ESLint 配置
    const eslintConfigInfo = this.findAndParseEslintConfig();
    if (eslintConfigInfo) {
      this.reportEslintIssues(eslintConfigInfo, issues);
    }
  }

  private analyzeFromDeps(issues: GuardIssue[]): void {
    // 检查是否安装了 TypeScript ESLint
    if (
      !this.packageJsonDeps.has('@typescript-eslint/eslint-plugin') &&
      !this.packageJsonDeps.has('typescript-eslint')
    ) {
      if (this.packageJsonDeps.has('typescript')) {
        issues.push({
          rule: 'ecosystem-deps/missing-typescript-eslint',
          severity: 'warn',
          message:
            '项目使用了 TypeScript 但未安装 @typescript-eslint/eslint-plugin。建议添加 TypeScript 专用的 ESLint 规则以获得更好的类型安全检查。',
        });
      }
    }

    // 检查是否安装了 React Hooks ESLint 插件
    if (
      this.packageJsonDeps.has('react') &&
      !this.packageJsonDeps.has('eslint-plugin-react-hooks')
    ) {
      issues.push({
        rule: 'ecosystem-deps/missing-react-hooks-plugin',
        severity: 'warn',
        message:
          '项目使用了 React 但未安装 eslint-plugin-react-hooks。此插件能帮助检测 Hooks 使用规范问题（如缺少依赖项、条件调用等）。',
      });
    }

    // 检查是否安装了无障碍访问插件
    if (
      (this.packageJsonDeps.has('react') || this.packageJsonDeps.has('react-dom')) &&
      !this.packageJsonDeps.has('eslint-plugin-jsx-a11y')
    ) {
      issues.push({
        rule: 'ecosystem-deps/missing-a11y-plugin',
        severity: 'warn',
        message:
          '项目使用了 React 但未安装 eslint-plugin-jsx-a11y。此插件能帮助检测无障碍访问（Accessibility）问题。',
      });
    }

    // 检查是否有 ESLint 配置
    if (!this.eslintConfigFound && this.projectRoot) {
      const configExists = this.eslintConfigExists();
      if (!configExists) {
        issues.push({
          rule: 'ecosystem-deps/missing-eslint-config',
          severity: 'error',
          message: '项目缺少 ESLint 配置文件。建议配置 ESLint 以保证代码质量和一致性。',
        });
      }
    }
  }

  private eslintConfigExists(): boolean {
    const configFiles = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.mjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      '.eslintrc',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs',
      'eslint.config.ts',
      'eslint.config.mts',
    ];

    for (const configFile of configFiles) {
      if (fs.existsSync(path.join(this.projectRoot, configFile))) {
        return true;
      }
    }

    // Check for eslintConfig in package.json
    try {
      const pkgPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.eslintConfig) return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  private findAndParseEslintConfig(): EslintConfigInfo | null {
    // Try to find and read ESLint config files
    const configFiles = [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc',
      '.eslintrc.yml',
      '.eslintrc.yaml',
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(this.projectRoot, configFile);
      if (fs.existsSync(configPath)) {
        try {
          if (configFile.endsWith('.json') || configFile === '.eslintrc') {
            const content = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(content);
            return this.parseEslintConfigObject(config, configPath);
          }
          // For JS/CJS files we can only check if they exist
          return {
            hasTypescriptEslint: true, // Assume configured if JS config exists
            hasReactHooksPlugin: true,
            hasJsxA11yPlugin: true,
            disabledRules: [],
            configPath,
          };
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  private parseEslintConfigObject(
    config: Record<string, unknown>,
    configPath: string,
  ): EslintConfigInfo {
    const info: EslintConfigInfo = {
      hasTypescriptEslint: false,
      hasReactHooksPlugin: false,
      hasJsxA11yPlugin: false,
      disabledRules: [],
      configPath,
    };

    // Check plugins
    const plugins = (config.plugins ?? []) as string[];
    info.hasTypescriptEslint = plugins.some(
      (p) => p === '@typescript-eslint' || p === 'typescript-eslint',
    );
    info.hasReactHooksPlugin = plugins.some((p) => p === 'react-hooks');
    info.hasJsxA11yPlugin = plugins.some((p) => p === 'jsx-a11y');

    // Check extends
    const extendsArr = Array.isArray(config.extends) ? config.extends : config.extends ? [config.extends] : [];
    for (const ext of extendsArr as string[]) {
      if (ext.includes('typescript-eslint') || ext.includes('@typescript-eslint')) {
        info.hasTypescriptEslint = true;
      }
      if (ext.includes('react-hooks')) {
        info.hasReactHooksPlugin = true;
      }
      if (ext.includes('jsx-a11y')) {
        info.hasJsxA11yPlugin = true;
      }
    }

    // Check for disabled rules
    const rules = (config.rules ?? {}) as Record<string, unknown>;
    for (const [ruleName, ruleConfig] of Object.entries(rules)) {
      const severity = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
      if (severity === 'off' || severity === 0) {
        info.disabledRules.push(ruleName);
      }
    }

    return info;
  }

  private reportEslintIssues(info: EslintConfigInfo, issues: GuardIssue[]): void {
    // Check for important disabled rules
    const criticalRules = [
      'react-hooks/rules-of-hooks',
      'react-hooks/exhaustive-deps',
      '@typescript-eslint/no-explicit-any',
      '@typescript-eslint/no-unused-vars',
    ];

    for (const rule of criticalRules) {
      if (info.disabledRules.includes(rule)) {
        issues.push({
          rule: 'ecosystem-deps/critical-rule-disabled',
          severity: 'warn',
          message: `ESLint 规则 "${rule}" 被禁用。该规则对代码质量至关重要，建议启用。`,
        });
      }
    }
  }

  private isEslintConfig(id: string): boolean {
    const basename = path.basename(id);
    return (
      basename.startsWith('.eslintrc') ||
      basename.startsWith('eslint.config')
    );
  }
}
