import { z } from 'zod';
import { logger } from './logger';

/**
 * HTTP 请求骨架模板
 *
 * 供给层约束：所有网络请求必须通过此模块，禁止直接使用 fetch/axios/XHR
 * 对应规则：fe-guard/no-raw-fetch
 *
 * 【结构约束】请求流程已定义：auth注入 → 请求 → 响应校验 → 错误处理
 * 【留白区域】token获取方式、schema内容、错误处理策略由 AI 自己填
 * 【类型签名】泛型约束确保请求/响应类型安全
 *
 * 覆盖场景：
 *   1. JSON CRUD（GET/POST/PUT/DELETE）
 *   2. FormData 上传（文件+字段混合）
 *   3. SSE 流式响应（Server-Sent Events）
 *   4. 文件下载（Blob）
 *
 * 使用：
 *   import { httpClient } from '@/lib/http-client';
 *
 *   // JSON 请求
 *   const user = await httpClient.json('/api/users/1', { method: 'GET' }, UserSchema);
 *
 *   // FormData 上传
 *   const result = await httpClient.upload('/api/avatar', formData, UploadResultSchema);
 *
 *   // SSE 流式
 *   httpClient.sse('/api/stream', { onMessage: (data) => console.log(data) });
 *
 *   // 文件下载
 *   const blob = await httpClient.download('/api/export.csv');
 */

// ─── 类型定义 ───────────────────────────────────

export interface HttpClientConfig {
  /** API 基础路径，如 '/api' 或 'https://api.example.com' */
  baseUrl: string;
  /** 请求超时（毫秒），默认 10000 */
  timeout?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  /** 查询参数 */
  params?: Record<string, string | number | boolean>;
  /** JSON body（会自动序列化） */
  body?: unknown;
  /** 请求超时覆盖（毫秒） */
  timeout?: number;
  /** 跳过 auth 注入（如登录/注册接口） */
  skipAuth?: boolean;
}

export interface HttpError {
  status: number;
  message: string;
  data?: unknown;
}

export interface SSEOptions {
  /** 收到消息的回调 */
  onMessage: (data: string, event?: string) => void;
  /** 连接打开 */
  onOpen?: () => void;
  /** 连接错误 */
  onError?: (error: Event) => void;
  /** 自定义 headers（注意：EventSource 不支持自定义 header，需要 URL 传参） */
  params?: Record<string, string>;
}

// ─── Auth 注入点（留白区域）─────────────────────

/**
 * 【留白区域】AI 自己实现 token 获取逻辑
 *
 * 常见实现：
 *   - 从 localStorage 读取：localStorage.getItem('token')
 *   - 从 Zustand store 读取：useAuthStore.getState().token
 *   - 从 cookie 读取：document.cookie
 *
 * AI 根据项目的认证方案填写此函数
 */
function getAuthToken(): string | null {
  // TODO: AI 填写 token 获取逻辑
  // 示例：return localStorage.getItem('access_token');
  return null;
}

/**
 * 【留白区域】AI 自己实现 401 处理逻辑
 *
 * 常见实现：
 *   - 清除 token + 跳转登录页
 *   - 尝试 refresh token
 *   - 显示登录弹窗
 */
function handleUnauthorized(): void {
  // TODO: AI 填写 401 处理逻辑
  // 示例：
  // useAuthStore.getState().logout();
  // window.location.href = '/login';  // 注意：应使用 router.navigate
  logger.warn('[HTTP] Unauthorized, redirecting to login');
}

// ─── 核心请求函数 ─────────────────────────────────

function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean>,
): string {
  const url = new URL(path, window.location.origin);
  if (baseUrl && !path.startsWith('http')) {
    url.pathname = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function createAbortSignal(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

/**
 * 基础请求（内部使用）
 *
 * 【结构约束】所有请求都经过此函数：auth注入 → fetch → 状态码检查 → 错误处理
 */
async function baseRequest(
  config: HttpClientConfig,
  path: string,
  options: RequestOptions & { rawBody?: BodyInit },
): Promise<Response> {
  const url = buildUrl(config.baseUrl, path, options.params);
  const timeout = options.timeout ?? config.timeout ?? 10000;
  const { signal, clear } = createAbortSignal(timeout);

  // ── Auth 注入点（结构约束）──
  const headers: Record<string, string> = { ...options.headers };
  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      signal,
    };

    if (options.rawBody) {
      fetchOptions.body = options.rawBody;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    clear();

    // ── 错误处理点（结构约束）──
    if (response.status === 401) {
      handleUnauthorized();
      throw Object.assign(new Error('Unauthorized'), {
        status: 401,
        data: null,
      }) as Error & HttpError;
    }

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        // 响应体不是 JSON，忽略
      }
      const err = Object.assign(
        new Error(`HTTP ${response.status}: ${response.statusText}`),
        { status: response.status, data: errorData },
      ) as Error & HttpError;
      throw err;
    }

    return response;
  } catch (error) {
    clear();
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.error(`[HTTP] Request timeout: ${options.method ?? 'GET'} ${path}`);
      throw Object.assign(new Error('Request timeout'), {
        status: 0,
        data: null,
      }) as Error & HttpError;
    }
    throw error;
  }
}

// ─── 公开 API ──────────────────────────────────

/**
 * 创建 HTTP 客户端实例
 *
 * @param config - 客户端配置（baseUrl, timeout）
 * @returns 包含 json/upload/download/sse 四种请求方法的客户端
 */
export function createHttpClient(config: HttpClientConfig) {
  return {
    /**
     * JSON 请求（GET/POST/PUT/PATCH/DELETE）
     *
     * 【结构约束】响应必须经过 Zod schema 校验
     * 【留白区域】schema 内容由 AI 定义
     *
     * @param path - 请求路径（相对 baseUrl）
     * @param options - 请求选项
     * @param schema - 响应数据的 Zod schema
     * @returns 类型安全的响应数据
     */
    async json<T>(
      path: string,
      options: RequestOptions,
      schema: z.ZodSchema<T>,
    ): Promise<T> {
      const response = await baseRequest(config, path, options);

      // Handle 204 No Content (common for DELETE requests)
      if (response.status === 204) {
        return schema.parse(undefined);
      }

      const raw = await response.json();

      // ── 响应校验点（结构约束）──
      const result = schema.safeParse(raw);
      if (!result.success) {
        logger.error(`[HTTP] Response validation failed: ${options.method ?? 'GET'} ${path}`, {
          issues: result.error.issues,
        });
        throw new Error('Response validation failed');
      }

      return result.data;
    },

    /**
     * FormData 上传（文件+字段混合）
     *
     * 【结构约束】响应经过 Zod 校验，不手动设 Content-Type（让浏览器自动加 boundary）
     * 【留白区域】FormData 构造和 schema 由 AI 定义
     *
     * @param path - 上传路径
     * @param formData - FormData 实例
     * @param schema - 响应数据的 Zod schema
     * @param options - 额外请求选项
     */
    async upload<T>(
      path: string,
      formData: FormData,
      schema: z.ZodSchema<T>,
      options?: Omit<RequestOptions, 'body'>,
    ): Promise<T> {
      const response = await baseRequest(config, path, {
        method: 'POST',
        ...options,
        rawBody: formData,
        // 不设 Content-Type，浏览器自动加 multipart/form-data + boundary
      });
      const raw = await response.json();

      const result = schema.safeParse(raw);
      if (!result.success) {
        logger.error(`[HTTP] Upload response validation failed: ${path}`, {
          issues: result.error.issues,
        });
        throw new Error('Upload response validation failed');
      }

      return result.data;
    },

    /**
     * 文件下载（返回 Blob）
     *
     * 【结构约束】超时+auth+错误处理由骨架保证
     * 【留白区域】下载后的处理（保存/预览）由 AI 实现
     *
     * @param path - 下载路径
     * @param options - 请求选项
     * @returns Blob 数据
     */
    async download(
      path: string,
      options?: RequestOptions,
    ): Promise<Blob> {
      const response = await baseRequest(config, path, {
        method: 'GET',
        ...options,
      });
      return response.blob();
    },

    /**
     * SSE 流式响应（Server-Sent Events）
     *
     * ⚠️ EventSource 不支持自定义 header，token 需通过 URL 参数传递
     *
     * 【结构约束】连接管理+错误处理由骨架保证
     * 【留白区域】消息处理逻辑由 AI 实现
     *
     * @param path - SSE 端点路径
     * @param options - SSE 选项（onMessage 回调等）
     * @returns 关闭连接的函数
     */
    sse(
      path: string,
      options: SSEOptions,
    ): () => void {
      const url = buildUrl(config.baseUrl, path, options.params);
      const source = new EventSource(url);

      source.onopen = () => {
        logger.info(`[HTTP] SSE connected: ${path}`);
        options.onOpen?.();
      };

      source.onmessage = (event) => {
        options.onMessage(event.data);
      };

      source.onerror = (event) => {
        logger.error(`[HTTP] SSE error: ${path}`);
        options.onError?.(event);
      };

      // 返回关闭函数
      return () => {
        source.close();
        logger.info(`[HTTP] SSE closed: ${path}`);
      };
    },
  };
}

// ─── 默认实例（留白区域：AI 修改 baseUrl）─────────

/**
 * 默认 HTTP 客户端实例
 *
 * 【留白区域】AI 根据项目配置修改 baseUrl 和 timeout
 */
export const httpClient = createHttpClient({
  baseUrl: '/api',
  timeout: 10000,
});