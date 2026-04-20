import { z } from 'zod';

/**
 * 表单校验骨架
 *
 * 供给层约束：所有表单提交前必须调用 validateForm / schema.safeParse
 * 对应规则：fe-guard/require-form-validation
 *
 * 【结构约束】校验流程已定义，AI 不能绕过
 * 【留白区域】schema 内容、错误消息格式、字段映射由 AI 自己填
 * 【类型签名】泛型约束确保 schema 和表单数据类型一致
 *
 * 使用：
 *   import { validateForm, type FormErrors } from '@/lib/form-validation';
 *
 *   const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 *
 *   function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
 *     e.preventDefault();
 *     const formData = new FormData(e.currentTarget);
 *     const raw = Object.fromEntries(formData);
 *     const result = validateForm(schema, raw);
 *     if (!result.success) {
 *       setErrors(result.errors);  // AI 自己决定怎么展示
 *       return;
 *     }
 *     // result.data 类型安全，可以直接发请求
 *     submitToApi(result.data);
 *   }
 */

// ─── 类型定义 ───────────────────────────────────

/** 字段级错误映射，key 是字段路径（如 "address.city"），value 是错误消息 */
export type FormErrors = Record<string, string>;

export type ValidationSuccess<T> = { success: true; data: T; errors: null };
export type ValidationFailure = { success: false; data: null; errors: FormErrors };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ─── 核心校验函数 ─────────────────────────────────

/**
 * 校验表单数据
 *
 * 【结构约束】必须通过此函数校验，不允许裸 form 直接提交
 * 【留白区域】schema 由 AI 根据业务需求定义
 *
 * @param schema - Zod schema，定义字段规则
 * @param data - 待校验的原始数据（通常来自 FormData / state）
 * @returns 校验结果，success 时 data 类型安全
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }

  // ── 错误格式化（结构约束：统一为 Record<path, message>）──
  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    // 同一字段多个错误只保留第一个（AI 可改为拼接）
    if (!(path in errors)) {
      errors[path] = issue.message;
    }
  }

  return { success: false, data: null, errors };
}

// ─── 辅助工具 ──────────────────────────────────

/**
 * 从 FormData 提取为普通对象
 * 处理同名多值字段（如 checkbox group）自动转为数组
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    const existing = obj[key];
    if (existing !== undefined) {
      // 同名字段 → 数组
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      obj[key] = value;
    }
  });

  return obj;
}

/**
 * 合并服务端返回的字段错误到本地 FormErrors
 *
 * 【留白区域】服务端错误格式因项目而异，AI 自行适配
 * 下面是一个常见模式，AI 可根据实际后端响应格式修改
 */
export function mergeServerErrors(
  localErrors: FormErrors,
  serverErrors: Record<string, string | string[]>,
): FormErrors {
  const merged = { ...localErrors };

  for (const [field, messages] of Object.entries(serverErrors)) {
    const msg = Array.isArray(messages) ? messages[0] : messages;
    if (msg && !(field in merged)) {
      merged[field] = msg;
    }
  }

  return merged;
}