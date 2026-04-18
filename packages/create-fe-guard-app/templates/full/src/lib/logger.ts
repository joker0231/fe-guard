/**
 * 统一日志模块
 * - dev: 打印到 console
 * - prod: 上报到监控平台（此处预留接口）
 *
 * 使用：
 *   import { logger } from '@/lib/logger';
 *   logger.info('[AUTH] user login', { userId: 123 });
 *   logger.error('[API] fetch failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  extra?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { error: String(error) };
}

function buildPayload(level: LogLevel, message: string, extra?: unknown): LogPayload {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (extra !== undefined) {
    if (extra instanceof Error) {
      payload.error = extra;
      payload.extra = formatError(extra);
    } else if (isPlainObject(extra)) {
      payload.extra = { ...extra };
    } else {
      payload.extra = { value: extra };
    }
  }
  return payload;
}

function reportToRemote(payload: LogPayload): void {
  // TODO: 接入真实的监控平台（Sentry / 自建上报等）
  void payload;
  // if (import.meta.env.PROD) {
  //   fetch('/api/log', { method: 'POST', body: JSON.stringify(payload) }).catch(() => {});
  // }
}

function emit(payload: LogPayload): void {
  if (import.meta.env.DEV) {
    /* eslint-disable no-console */
    const fn =
      payload.level === 'error'
        ? console.error
        : payload.level === 'warn'
        ? console.warn
        : console.log;
    fn(`[${payload.level.toUpperCase()}] ${payload.message}`, payload.extra ?? '');
    /* eslint-enable no-console */
  } else {
    reportToRemote(payload);
  }
}

export const logger = {
  debug(message: string, extra?: unknown): void {
    emit(buildPayload('debug', message, extra));
  },
  info(message: string, extra?: unknown): void {
    emit(buildPayload('info', message, extra));
  },
  warn(message: string, extra?: unknown): void {
    emit(buildPayload('warn', message, extra));
  },
  error(message: string, error?: unknown): void {
    emit(buildPayload('error', message, error));
  },
};