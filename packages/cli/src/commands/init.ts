import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export const initCommand = new Command('init')
  .description('初始化 Frontend Guard 配置')
  .option('--preset <preset>', '配置预设 (core|extended|all)', 'extended')
  .action(async (options: { preset: string }) => {
    const chalk = (await import('chalk')).default;
    const { default: ora } = await import('ora');

    const cwd = process.cwd();
    const preset = options.preset;

    // Validate preset
    if (!['core', 'extended', 'all'].includes(preset)) {
      console.error(chalk.red(`错误: 无效的预设 "${preset}"，可选值: core, extended, all`));
      process.exit(1);
    }

    console.log('');
    console.log(chalk.bold.cyan('Frontend Guard 初始化'));
    console.log('');

    // ── Step 1: Detect project environment ──
    const spinner = ora('检测项目环境...').start();

    const hasTypeScript = fs.existsSync(path.join(cwd, 'tsconfig.json'));

    let packageManager: 'pnpm' | 'yarn' | 'npm' = 'npm';
    if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
      packageManager = 'yarn';
    }

    // Detect router type
    let routerType: string | null = null;
    if (fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.mjs')) || fs.existsSync(path.join(cwd, 'next.config.ts'))) {
      if (fs.existsSync(path.join(cwd, 'app')) || fs.existsSync(path.join(cwd, 'src', 'app'))) {
        routerType = 'next-app';
      } else {
        routerType = 'next-pages';
      }
    } else {
      const pkgPath = path.join(cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (deps['react-router'] || deps['react-router-dom']) {
            routerType = 'react-router-v6';
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    spinner.succeed('项目环境检测完成');
    console.log(chalk.dim(`  语言: ${hasTypeScript ? 'TypeScript' : 'JavaScript'}`));
    console.log(chalk.dim(`  包管理器: ${packageManager}`));
    if (routerType) {
      console.log(chalk.dim(`  路由: ${routerType}`));
    }
    console.log('');

    // ── Step 2: Create config file ──
    const configFileName = hasTypeScript ? 'frontend-guard.config.ts' : 'frontend-guard.config.js';
    const configFilePath = path.join(cwd, configFileName);

    if (fs.existsSync(configFilePath)) {
      console.log(chalk.yellow(`⚠ 配置文件已存在: ${configFileName}，跳过创建`));
    } else {
      const spinnerConfig = ora(`创建 ${configFileName}...`).start();

      const configContent = hasTypeScript
        ? generateTsConfig(preset, routerType)
        : generateJsConfig(preset, routerType);

      fs.writeFileSync(configFilePath, configContent, 'utf-8');
      spinnerConfig.succeed(`已创建 ${chalk.green(configFileName)}`);
    }

    // ── Step 3: Auto-install dependencies ──
    console.log('');
    console.log(chalk.bold('依赖检查'));

    const requiredDeps = [
      '@frontend-guard/eslint-plugin',
      '@typescript-eslint/eslint-plugin',
      'eslint-plugin-react-hooks',
      'eslint-plugin-jsx-a11y',
      'eslint-plugin-react',
      'eslint-plugin-import',
    ];

    const missingDeps = detectMissingDeps(cwd, requiredDeps);

    if (missingDeps.length > 0) {
      console.log(chalk.dim(`  缺少 ${missingDeps.length} 个依赖: ${missingDeps.join(', ')}`));
      const spinnerDeps = ora('安装缺失依赖...').start();

      try {
        const installCmd = buildInstallCommand(packageManager, missingDeps);
        execSync(installCmd, { cwd, stdio: 'pipe', timeout: 120000 });
        spinnerDeps.succeed(`已安装 ${missingDeps.length} 个依赖`);
      } catch (err) {
        spinnerDeps.fail('自动安装失败，请手动安装:');
        const manualCmd = buildInstallCommand(packageManager, missingDeps);
        console.log(chalk.dim(`    ${chalk.cyan(manualCmd)}`));
      }
    } else {
      console.log(chalk.dim('  所有必需依赖已安装 ✓'));
    }

    // ── Step 3.5: Optional tools (depcheck, ts-prune) ──
    const optionalDeps = ['depcheck', 'ts-prune'];
    const missingOptional = detectMissingDeps(cwd, optionalDeps);
    if (missingOptional.length > 0) {
      console.log('');
      console.log(chalk.dim(`  可选工具 ${missingOptional.join(', ')} 未安装（用于 depcheck/ts-prune 检查）`));
      const spinnerOpt = ora('安装可选工具...').start();
      try {
        const installCmd = buildInstallCommand(packageManager, missingOptional);
        execSync(installCmd, { cwd, stdio: 'pipe', timeout: 120000 });
        spinnerOpt.succeed(`已安装 ${missingOptional.length} 个可选工具`);
      } catch (err) {
        spinnerOpt.warn('可选工具安装失败（不影响 ESLint 检查）');
        const manualCmd = buildInstallCommand(packageManager, missingOptional);
        console.log(chalk.dim(`    手动安装: ${chalk.cyan(manualCmd)}`));
      }
    } else {
      console.log(chalk.dim('  可选工具 depcheck/ts-prune 已安装 ✓'));
    }

    // ── Step 4: ESLint integration ──
    const eslintConfigFiles = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      '.eslintrc',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.ts',
    ];

    let existingEslintConfig: string | null = null;
    for (const file of eslintConfigFiles) {
      if (fs.existsSync(path.join(cwd, file))) {
        existingEslintConfig = file;
        break;
      }
    }

    if (existingEslintConfig) {
      console.log('');
      console.log(chalk.bold('ESLint 集成'));
      console.log(chalk.dim(`  检测到 ESLint 配置: ${existingEslintConfig}`));

      const eslintConfigPath = path.join(cwd, existingEslintConfig);
      const eslintContent = fs.readFileSync(eslintConfigPath, 'utf-8');

      // Check if guard is already configured
      if (eslintContent.includes('@frontend-guard')) {
        console.log(chalk.dim('  @frontend-guard 已配置 ✓'));
      } else {
        const isFlatConfig = existingEslintConfig.startsWith('eslint.config');

        if (isFlatConfig) {
          const injected = injectFlatConfig(eslintContent);
          if (injected) {
            const spinnerEslint = ora('注入 ESLint flat config...').start();
            fs.writeFileSync(eslintConfigPath, injected, 'utf-8');
            spinnerEslint.succeed(`已自动注入 @frontend-guard 到 ${existingEslintConfig}`);
          } else {
            printFlatConfigManualGuide(chalk);
          }
        } else if (existingEslintConfig === '.eslintrc.json' || existingEslintConfig === '.eslintrc') {
          const injected = injectEslintrcJson(eslintContent);
          if (injected) {
            const spinnerEslint = ora('注入 .eslintrc.json...').start();
            fs.writeFileSync(eslintConfigPath, injected, 'utf-8');
            spinnerEslint.succeed(`已自动注入 @frontend-guard 到 ${existingEslintConfig}`);
          } else {
            printLegacyConfigManualGuide(chalk);
          }
        } else if (existingEslintConfig === '.eslintrc.js' || existingEslintConfig === '.eslintrc.cjs') {
          const injected = injectEslintrcJs(eslintContent);
          if (injected) {
            const spinnerEslint = ora(`注入 ${existingEslintConfig}...`).start();
            fs.writeFileSync(eslintConfigPath, injected, 'utf-8');
            spinnerEslint.succeed(`已自动注入 @frontend-guard 到 ${existingEslintConfig}`);
          } else {
            printLegacyConfigManualGuide(chalk);
          }
        } else {
          // .yml/.yaml - too complex for auto injection
          console.log('');
          console.log(chalk.yellow('  YAML格式不支持自动注入，请手动配置:'));
          printLegacyConfigManualGuide(chalk);
        }
      }
    } else {
      console.log('');
      console.log(chalk.dim('  未检测到 ESLint 配置文件，跳过 ESLint 集成'));
    }

    // ── Step 5: TypeScript config preset injection ──
    if (hasTypeScript) {
      console.log('');
      console.log(chalk.bold('TypeScript 配置'));

      const tsconfigPath = path.join(cwd, 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');

      if (tsconfigContent.includes('@frontend-guard/tsconfig')) {
        console.log(chalk.dim('  @frontend-guard/tsconfig 已配置 ✓'));
      } else {
        const injected = injectTsconfig(tsconfigContent);
        if (injected) {
          const spinnerTs = ora('注入 tsconfig 预设...').start();
          fs.writeFileSync(tsconfigPath, injected, 'utf-8');
          spinnerTs.succeed('已自动注入 @frontend-guard/tsconfig 预设');
        } else {
          console.log(chalk.yellow('  无法自动注入 tsconfig 预设，请手动添加:'));
          console.log(chalk.dim('  ─────────────────────────────────────'));
          console.log(chalk.green(`  "extends": "@frontend-guard/tsconfig/tsconfig.guard-base.json"`));
          console.log(chalk.dim('  ─────────────────────────────────────'));
        }
      }
    }

    // ── Step 6: Summary ──
    console.log('');
    console.log(chalk.bold.green('✓ Frontend Guard 初始化完成!'));
    console.log('');
    console.log(chalk.bold('  运行检查:'));
    console.log(chalk.dim(`    ${chalk.cyan('npx frontend-guard check')}`));
    console.log('');
  });

// ── Dependency detection ──

function detectMissingDeps(cwd: string, requiredDeps: string[]): string[] {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return requiredDeps;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    return requiredDeps.filter(dep => !allDeps[dep]);
  } catch {
    return requiredDeps;
  }
}

function buildInstallCommand(pm: 'pnpm' | 'yarn' | 'npm', deps: string[]): string {
  const depList = deps.join(' ');
  switch (pm) {
    case 'pnpm': return `pnpm add -D ${depList}`;
    case 'yarn': return `yarn add -D ${depList}`;
    default: return `npm install -D ${depList}`;
  }
}

// ── ESLint flat config injection ──

function injectFlatConfig(content: string): string | null {
  // Strategy: Add import at top, spread into export default array
  // Handle common patterns:
  //   export default [ ... ]
  //   export default tseslint.config([ ... ])

  // Check for "export default" - if not found, bail out
  if (!content.includes('export default')) return null;

  let result = content;

  // Add import statement after last import or at top
  const guardImport = `import guard from '@frontend-guard/eslint-plugin';\n`;

  const lastImportIdx = findLastImportIndex(result);
  if (lastImportIdx >= 0) {
    // Insert after last import line
    const nextNewline = result.indexOf('\n', lastImportIdx);
    if (nextNewline >= 0) {
      result = result.slice(0, nextNewline + 1) + guardImport + result.slice(nextNewline + 1);
    } else {
      result = result + '\n' + guardImport;
    }
  } else {
    // No imports found, add at top
    result = guardImport + '\n' + result;
  }

  // Extra rules to inject alongside guard config
  const extraRules = `  { rules: { 'react/jsx-key': 'error', 'react/no-array-index-key': 'warn', 'no-console': 'warn', 'import/no-cycle': 'error', 'import/no-duplicates': 'error', 'import/no-unused-modules': 'warn' } },`;

  // Inject into export default array
  // Pattern 1: export default [
  const arrayPattern = /(export\s+default\s+)\[/;
  if (arrayPattern.test(result)) {
    result = result.replace(arrayPattern, `$1[\n  ...guard.configs.recommended,\n${extraRules}`);
    return result;
  }

  // Pattern 2: export default tseslint.config([ or similar wrapper
  const wrapperPattern = /(export\s+default\s+\w+(?:\.\w+)*\s*\(\s*)\[/;
  if (wrapperPattern.test(result)) {
    result = result.replace(wrapperPattern, `$1[\n  ...guard.configs.recommended,\n${extraRules}`);
    return result;
  }

  // Pattern 3: export default someVariable - can't safely inject
  return null;
}

function findLastImportIndex(content: string): number {
  let lastIdx = -1;
  const importRegex = /^import\s/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastIdx = match.index;
  }
  return lastIdx;
}

// ── ESLint legacy JSON config injection ──

function injectEslintrcJson(content: string): string | null {
  try {
    const config = JSON.parse(content);

    // Add to plugins
    if (!config.plugins) config.plugins = [];
    if (!config.plugins.includes('@frontend-guard')) {
      config.plugins.push('@frontend-guard');
    }

    // Add to extends
    if (!config.extends) config.extends = [];
    if (typeof config.extends === 'string') {
      config.extends = [config.extends];
    }
    const guardExtend = 'plugin:@frontend-guard/extended';
    if (!config.extends.includes(guardExtend)) {
      config.extends.push(guardExtend);
    }

    // Add extra rules
    if (!config.rules) config.rules = {};
    if (!config.rules['react/jsx-key']) config.rules['react/jsx-key'] = 'error';
    if (!config.rules['react/no-array-index-key']) config.rules['react/no-array-index-key'] = 'warn';
    if (!config.rules['no-console']) config.rules['no-console'] = 'warn';
    if (!config.rules['import/no-cycle']) config.rules['import/no-cycle'] = 'error';
    if (!config.rules['import/no-duplicates']) config.rules['import/no-duplicates'] = 'error';
    if (!config.rules['import/no-unused-modules']) config.rules['import/no-unused-modules'] = 'warn';

    return JSON.stringify(config, null, 2) + '\n';
  } catch {
    return null;
  }
}

// ── ESLint legacy JS config injection ──

function injectEslintrcJs(content: string): string | null {
  // Strategy: find plugins array and extends array, append to them
  // This is fragile - only handle simple cases

  let result = content;
  let modified = false;

  // Inject into plugins array
  const pluginsMatch = result.match(/plugins\s*:\s*\[([^\]]*)\]/);
  if (pluginsMatch) {
    const existing = pluginsMatch[1];
    if (!existing.includes('@frontend-guard')) {
      const newPlugins = existing.trim()
        ? `${existing.trimEnd()}, '@frontend-guard'`
        : `'@frontend-guard'`;
      result = result.replace(pluginsMatch[0], `plugins: [${newPlugins}]`);
      modified = true;
    }
  }

  // Inject into extends array
  const extendsMatch = result.match(/extends\s*:\s*\[([^\]]*)\]/);
  if (extendsMatch) {
    const existing = extendsMatch[1];
    const guardExtend = 'plugin:@frontend-guard/extended';
    if (!existing.includes(guardExtend)) {
      const newExtends = existing.trim()
        ? `${existing.trimEnd()}, '${guardExtend}'`
        : `'${guardExtend}'`;
      result = result.replace(extendsMatch[0], `extends: [${newExtends}]`);
      modified = true;
    }
  }

  // Inject rules
  const rulesMatch = result.match(/rules\s*:\s*\{/);
  if (rulesMatch) {
    // Append rules inside existing rules object
    const insertPos = result.indexOf('{', result.indexOf(rulesMatch[0])) + 1;
    const extraRules = `\n    'react/jsx-key': 'error',\n    'react/no-array-index-key': 'warn',\n    'no-console': 'warn',\n    'import/no-cycle': 'error',\n    'import/no-duplicates': 'error',\n    'import/no-unused-modules': 'warn',`;
    result = result.slice(0, insertPos) + extraRules + result.slice(insertPos);
    modified = true;
  }

  // If neither plugins nor extends array found, can't safely inject
  if (!modified) return null;

  // If only one was found, that's still a partial success
  return result;
}

// ── Manual guide fallbacks ──

function printFlatConfigManualGuide(chalk: any): void {
  console.log('');
  console.log(chalk.yellow('  无法自动注入，请手动添加到 ESLint flat config:'));
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────'));
  console.log(chalk.green(`  import guard from '@frontend-guard/eslint-plugin';`));
  console.log('');
  console.log(chalk.green(`  export default [`));
  console.log(chalk.green(`    ...guard.configs.recommended,`));
  console.log(chalk.green(`    { rules: { 'react/jsx-key': 'error', 'react/no-array-index-key': 'warn', 'no-console': 'warn', 'import/no-cycle': 'error', 'import/no-duplicates': 'error', 'import/no-unused-modules': 'warn' } },`));
  console.log(chalk.green(`    // 你的其他配置...`));
  console.log(chalk.green(`  ];`));
  console.log(chalk.dim('  ─────────────────────────────────────'));
}

function printLegacyConfigManualGuide(chalk: any): void {
  console.log('');
  console.log(chalk.yellow('  无法自动注入，请手动添加到 ESLint 配置:'));
  console.log('');
  console.log(chalk.dim('  ─────────────────────────────────────'));
  console.log(chalk.green(`  {`));
  console.log(chalk.green(`    "plugins": ["@frontend-guard"],`));
  console.log(chalk.green(`    "extends": ["plugin:@frontend-guard/extended"],`));
  console.log(chalk.green(`    "rules": {`));
  console.log(chalk.green(`      "react/jsx-key": "error",`));
  console.log(chalk.green(`      "react/no-array-index-key": "warn",`));
  console.log(chalk.green(`      "no-console": "warn",`));
  console.log(chalk.green(`      "import/no-cycle": "error",`));
  console.log(chalk.green(`      "import/no-duplicates": "error",`));
  console.log(chalk.green(`      "import/no-unused-modules": "warn"`));
  console.log(chalk.green(`    }`));
  console.log(chalk.green(`  }`));
  console.log(chalk.dim('  ─────────────────────────────────────'));
}

// ── TypeScript config injection ──

function injectTsconfig(content: string): string | null {
  try {
    // Strip JSON comments (// and /* */) for parsing
    const stripped = stripJsonComments(content);
    const config = JSON.parse(stripped);
    const guardPreset = '@frontend-guard/tsconfig/tsconfig.guard-base.json';

    if (!config.extends) {
      // No extends - add it
      config.extends = guardPreset;
    } else if (typeof config.extends === 'string') {
      // Single extends - convert to array and append
      config.extends = [config.extends, guardPreset];
    } else if (Array.isArray(config.extends)) {
      // Array extends - append
      if (config.extends.some((e: string) => e.includes('@frontend-guard'))) {
        return null; // Already has guard preset
      }
      config.extends.push(guardPreset);
    } else {
      return null;
    }

    return JSON.stringify(config, null, 2) + '\n';
  } catch {
    return null;
  }
}

function stripJsonComments(content: string): string {
  // Remove single-line comments
  let result = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before } or ]
  result = result.replace(/,\s*([}\]])/g, '$1');
  return result;
}

// ── Config generators ──

function generateTsConfig(preset: string, routerType: string | null): string {
  const lines: string[] = [];
  lines.push(`import type { FrontendGuardConfig } from '@frontend-guard/cli';`);
  lines.push('');
  lines.push(`export default {`);
  lines.push(`  preset: '${preset}',`);

  if (routerType) {
    lines.push(`  router: {`);
    lines.push(`    type: '${routerType}',`);
    lines.push(`  },`);
  }

  lines.push(`  ignore: [`);
  lines.push(`    'node_modules/**',`);
  lines.push(`    'dist/**',`);
  lines.push(`    'build/**',`);
  lines.push(`    '**/*.test.*',`);
  lines.push(`    '**/*.spec.*',`);
  lines.push(`  ],`);
  lines.push(`} satisfies FrontendGuardConfig;`);
  lines.push('');

  return lines.join('\n');
}

function generateJsConfig(preset: string, routerType: string | null): string {
  const lines: string[] = [];
  lines.push(`/** @type {import('@frontend-guard/cli').FrontendGuardConfig} */`);
  lines.push(`module.exports = {`);
  lines.push(`  preset: '${preset}',`);

  if (routerType) {
    lines.push(`  router: {`);
    lines.push(`    type: '${routerType}',`);
    lines.push(`  },`);
  }

  lines.push(`  ignore: [`);
  lines.push(`    'node_modules/**',`);
  lines.push(`    'dist/**',`);
  lines.push(`    'build/**',`);
  lines.push(`    '**/*.test.*',`);
  lines.push(`    '**/*.spec.*',`);
  lines.push(`  ],`);
  lines.push(`};`);
  lines.push('');

  return lines.join('\n');
}