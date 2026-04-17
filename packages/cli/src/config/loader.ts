import * as fs from 'fs';
import * as path from 'path';

export interface ChecksConfig {
  eslint?: boolean;
  viteAnalyzers?: boolean;
  depcheck?: boolean;
  tsPrune?: boolean;
  npmAudit?: boolean;
  auditLevel?: 'low' | 'moderate' | 'high' | 'critical';
}

export interface FrontendGuardConfig {
  preset: 'core' | 'extended' | 'all';
  rules?: Record<string, 'error' | 'warn' | 'off'>;
  ignore?: string[];
  router?: {
    type: 'react-router-v6' | 'next-pages' | 'next-app';
    configPath?: string;
  };
  checks?: ChecksConfig;
}

const DEFAULT_CONFIG: FrontendGuardConfig = {
  preset: 'extended',
};

const CONFIG_FILE_NAMES = [
  'frontend-guard.config.ts',
  'frontend-guard.config.js',
  'frontend-guard.config.json',
  '.frontend-guardrc',
];

/**
 * Load the frontend-guard config from the project root.
 * Search order:
 *   1. frontend-guard.config.ts
 *   2. frontend-guard.config.js
 *   3. frontend-guard.config.json
 *   4. .frontend-guardrc
 *   5. package.json "frontendGuard" field
 *
 * Returns the default config if nothing is found.
 */
export async function loadConfig(cwd?: string): Promise<FrontendGuardConfig> {
  const root = cwd ?? process.cwd();

  // Try each config file in order
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.resolve(root, fileName);
    if (!fs.existsSync(filePath)) continue;

    try {
      if (fileName.endsWith('.ts')) {
        // For .ts files, try to read and eval via a simple JSON-compatible parse
        // In a real build environment tsup/esbuild would handle this;
        // for CLI runtime we attempt a dynamic require after stripping types.
        return await loadTsConfig(filePath);
      }

      if (fileName.endsWith('.js')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require(filePath);
        return normalizeConfig(mod.default ?? mod);
      }

      // JSON or RC file
      const raw = fs.readFileSync(filePath, 'utf-8');
      return normalizeConfig(JSON.parse(raw));
    } catch {
      // If a config file exists but fails to load, warn and continue
      console.warn(`警告: 无法加载配置文件 ${filePath}，尝试下一个...`);
    }
  }

  // Try package.json "frontendGuard" field
  const pkgPath = path.resolve(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.frontendGuard) {
        return normalizeConfig(pkg.frontendGuard);
      }
    } catch {
      // Ignore malformed package.json
    }
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Attempt to load a TypeScript config file by stripping type annotations
 * and evaluating as JavaScript. This is a lightweight approach that handles
 * common patterns like `export default { ... } satisfies FrontendGuardConfig`.
 */
async function loadTsConfig(filePath: string): Promise<FrontendGuardConfig> {
  const raw = fs.readFileSync(filePath, 'utf-8');

  // Try to extract a JSON-like object from the file content.
  // Match the pattern: export default { ... }
  const match = raw.match(/export\s+default\s+({[\s\S]*?})\s*(satisfies\s+\w+)?\s*;?\s*$/m);
  if (match) {
    try {
      // Use Function constructor to evaluate the object literal
      const fn = new Function(`return (${match[1]})`);
      return normalizeConfig(fn());
    } catch {
      // Fall through
    }
  }

  // Fallback: try to JSON.parse any object in the file
  const jsonMatch = raw.match(/({[\s\S]*})/);
  if (jsonMatch) {
    try {
      return normalizeConfig(JSON.parse(jsonMatch[1]));
    } catch {
      // Fall through
    }
  }

  throw new Error(`无法解析 TypeScript 配置文件: ${filePath}`);
}

function normalizeConfig(raw: unknown): FrontendGuardConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const obj = raw as Record<string, unknown>;

  const preset = ['core', 'extended', 'all'].includes(obj.preset as string)
    ? (obj.preset as FrontendGuardConfig['preset'])
    : DEFAULT_CONFIG.preset;

  const config: FrontendGuardConfig = { preset };

  if (obj.rules && typeof obj.rules === 'object') {
    config.rules = obj.rules as Record<string, 'error' | 'warn' | 'off'>;
  }

  if (Array.isArray(obj.ignore)) {
    config.ignore = obj.ignore.filter((i): i is string => typeof i === 'string');
  }

  if (obj.router && typeof obj.router === 'object') {
    const router = obj.router as Record<string, unknown>;
    const validTypes = ['react-router-v6', 'next-pages', 'next-app'];
    if (validTypes.includes(router.type as string)) {
      config.router = {
        type: router.type as FrontendGuardConfig['router'] extends infer R
          ? R extends { type: infer T } ? T : never
          : never,
      };
      if (typeof router.configPath === 'string') {
        config.router.configPath = router.configPath;
      }
    }
  }

  if (obj.checks && typeof obj.checks === 'object' && !Array.isArray(obj.checks)) {
    const rawChecks = obj.checks as Record<string, unknown>;
    const checks: ChecksConfig = {};
    const boolKeys: (keyof ChecksConfig)[] = ['eslint', 'viteAnalyzers', 'depcheck', 'tsPrune', 'npmAudit'];
    for (const key of boolKeys) {
      if (typeof rawChecks[key] === 'boolean') {
        (checks as any)[key] = rawChecks[key];
      }
    }
    const validAuditLevels = ['low', 'moderate', 'high', 'critical'];
    if (typeof rawChecks.auditLevel === 'string' && validAuditLevels.includes(rawChecks.auditLevel)) {
      checks.auditLevel = rawChecks.auditLevel as ChecksConfig['auditLevel'];
    }
    if (Object.keys(checks).length > 0) {
      config.checks = checks;
    }
  }

  return config;
}
