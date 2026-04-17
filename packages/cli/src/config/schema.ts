import type { FrontendGuardConfig } from './loader';

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_PRESETS = ['core', 'extended', 'all'] as const;
const VALID_SEVERITIES = ['error', 'warn', 'off'] as const;
const VALID_ROUTER_TYPES = ['react-router-v6', 'next-pages', 'next-app'] as const;

/**
 * Validate a loaded frontend-guard config against the expected schema.
 * Returns an array of validation errors (empty if valid).
 */
export function validateConfig(config: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ field: 'root', message: '配置必须是一个对象' });
    return errors;
  }

  const obj = config as Record<string, unknown>;

  // Validate preset (required)
  if (!obj.preset) {
    errors.push({ field: 'preset', message: '缺少必填字段 "preset"' });
  } else if (!VALID_PRESETS.includes(obj.preset as typeof VALID_PRESETS[number])) {
    errors.push({
      field: 'preset',
      message: `"preset" 必须是以下值之一: ${VALID_PRESETS.join(', ')}，当前值: "${String(obj.preset)}"`,
    });
  }

  // Validate rules (optional)
  if (obj.rules !== undefined) {
    if (!obj.rules || typeof obj.rules !== 'object' || Array.isArray(obj.rules)) {
      errors.push({ field: 'rules', message: '"rules" 必须是一个对象' });
    } else {
      const rules = obj.rules as Record<string, unknown>;
      for (const [key, value] of Object.entries(rules)) {
        if (!VALID_SEVERITIES.includes(value as typeof VALID_SEVERITIES[number])) {
          errors.push({
            field: `rules.${key}`,
            message: `规则 "${key}" 的值必须是 "error"、"warn" 或 "off"，当前值: "${String(value)}"`,
          });
        }
      }
    }
  }

  // Validate ignore (optional)
  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore)) {
      errors.push({ field: 'ignore', message: '"ignore" 必须是一个数组' });
    } else {
      for (let i = 0; i < obj.ignore.length; i++) {
        if (typeof obj.ignore[i] !== 'string') {
          errors.push({
            field: `ignore[${i}]`,
            message: `"ignore" 数组中的每个元素必须是字符串，索引 ${i} 的类型为 "${typeof obj.ignore[i]}"`,
          });
        }
      }
    }
  }

  // Validate router (optional)
  if (obj.router !== undefined) {
    if (!obj.router || typeof obj.router !== 'object' || Array.isArray(obj.router)) {
      errors.push({ field: 'router', message: '"router" 必须是一个对象' });
    } else {
      const router = obj.router as Record<string, unknown>;

      if (!router.type) {
        errors.push({ field: 'router.type', message: '"router.type" 是必填字段' });
      } else if (!VALID_ROUTER_TYPES.includes(router.type as typeof VALID_ROUTER_TYPES[number])) {
        errors.push({
          field: 'router.type',
          message: `"router.type" 必须是以下值之一: ${VALID_ROUTER_TYPES.join(', ')}，当前值: "${String(router.type)}"`,
        });
      }

      if (router.configPath !== undefined && typeof router.configPath !== 'string') {
        errors.push({
          field: 'router.configPath',
          message: '"router.configPath" 必须是字符串',
        });
      }
    }
  }

  // Validate checks (optional)
  if (obj.checks !== undefined) {
    if (!obj.checks || typeof obj.checks !== 'object' || Array.isArray(obj.checks)) {
      errors.push({ field: 'checks', message: '"checks" 必须是一个对象' });
    } else {
      const checks = obj.checks as Record<string, unknown>;
      const VALID_AUDIT_LEVELS = ['low', 'moderate', 'high', 'critical'] as const;
      const BOOL_KEYS = ['eslint', 'viteAnalyzers', 'depcheck', 'tsPrune', 'npmAudit'];
      for (const key of BOOL_KEYS) {
        if (checks[key] !== undefined && typeof checks[key] !== 'boolean') {
          errors.push({
            field: `checks.${key}`,
            message: `"checks.${key}" 必须是布尔值，当前类型: "${typeof checks[key]}"`,
          });
        }
      }
      if (checks.auditLevel !== undefined) {
        if (!VALID_AUDIT_LEVELS.includes(checks.auditLevel as typeof VALID_AUDIT_LEVELS[number])) {
          errors.push({
            field: 'checks.auditLevel',
            message: `"checks.auditLevel" 必须是以下值之一: ${VALID_AUDIT_LEVELS.join(', ')}，当前值: "${String(checks.auditLevel)}"`,
          });
        }
      }
    }
  }

  // Warn about unknown fields
  const knownFields = new Set(['preset', 'rules', 'ignore', 'router', 'checks']);
  for (const key of Object.keys(obj)) {
    if (!knownFields.has(key)) {
      errors.push({
        field: key,
        message: `未知的配置字段 "${key}"`,
      });
    }
  }

  return errors;
}
