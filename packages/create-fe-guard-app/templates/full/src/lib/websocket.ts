import { z } from 'zod';
import { logger } from './logger';

/**
 * WebSocket 骨架模板
 *
 * 供给层约束：禁止直接 new WebSocket()，必须通过此模块
 * 对应规则：fe-guard/no-raw-fetch（检测 new Worker/SharedWorker，WebSocket 同理受控）
 *
 * 【结构约束】连接管理流程已定义：建立 → 心跳 → 断线重连 → 消息序列化
 * 【留白区域】消息类型、序列化格式、业务处理逻辑由 AI 自己填
 * 【类型签名】泛型约束确保收发消息类型安全
 *
 * 使用：
 *   import { createWSClient } from '@/lib/websocket';
 *
 *   const ws = createWSClient({
 *     url: 'ws://localhost:3000/ws',
 *     onMessage: (data) => console.log('收到:', data),
 *     onStatusChange: (status) => console.log('状态:', status),
 *   });
 *
 *   ws.connect();
 *   ws.send({ type: 'chat', payload: { text: 'hello' } });
 *   ws.close();
 */

// ─── 类型定义 ───────────────────────────────────

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WSClientConfig<TSend = unknown, TReceive = unknown> {
  /** WebSocket 服务端地址（ws:// 或 wss://） */
  url: string;

  /**
   * 【留白区域】收到消息的回调
   * AI 自己定义 TReceive 类型和处理逻辑
   */
  onMessage: (data: TReceive) => void;

  /** 连接状态变化回调 */
  onStatusChange?: (status: WSStatus) => void;

  /** 连接成功回调 */
  onOpen?: () => void;

  /** 连接错误回调 */
  onError?: (error: Event) => void;

  /** 连接关闭回调 */
  onClose?: (event: CloseEvent) => void;

  /**
   * 【留白区域】发送消息的序列化函数
   * 默认 JSON.stringify，AI 可替换为 protobuf 等
   */
  serialize?: (data: TSend) => string;

  /**
   * 【留白区域】接收消息的反序列化函数
   * 默认 JSON.parse，AI 可替换为自定义解析
   */
  deserialize?: (raw: string) => TReceive;

  /**
   * 【留白区域】接收消息的 Zod schema（可选）
   * 提供后会自动校验每条消息，校验失败记录日志但不断连
   */
  receiveSchema?: z.ZodSchema<TReceive>;

  // ── 心跳配置 ──

  /** 心跳间隔（毫秒），默认 30000。设为 0 禁用心跳 */
  heartbeatInterval?: number;

  /**
   * 【留白区域】心跳消息内容
   * 默认发送 JSON: {"type":"ping"}，AI 根据后端协议修改
   */
  heartbeatMessage?: string;

  /** 心跳超时（毫秒），超过此时间没收到 pong 则认为连接断开，默认 10000 */
  heartbeatTimeout?: number;

  // ── 重连配置 ──

  /** 是否启用自动重连，默认 true */
  autoReconnect?: boolean;

  /** 最大重连次数，默认 5。设为 0 表示无限重连 */
  maxReconnectAttempts?: number;

  /** 重连间隔（毫秒），默认 3000。每次重连间隔会指数退避（×1.5），上限 30000 */
  reconnectInterval?: number;

  // ── Auth ──

  /**
   * 【留白区域】连接时的认证参数
   * WebSocket 不支持自定义 header，通常通过 URL 参数传 token
   * AI 填写 token 获取逻辑
   */
  getAuthParams?: () => Record<string, string>;
}

export interface WSClient<TSend = unknown> {
  /** 建立连接 */
  connect: () => void;
  /** 发送消息（类型安全） */
  send: (data: TSend) => void;
  /** 主动关闭（不触发重连） */
  close: () => void;
  /** 当前连接状态 */
  getStatus: () => WSStatus;
}

// ─── 核心实现 ─────────────────────────────────

/**
 * 创建 WebSocket 客户端
 *
 * 【结构约束】连接管理、心跳、重连由骨架保证，AI 不需要自己实现
 * 【留白区域】消息类型、序列化、业务处理由 AI 填写
 */
export function createWSClient<TSend = unknown, TReceive = unknown>(
  config: WSClientConfig<TSend, TReceive>,
): WSClient<TSend> {
  let ws: WebSocket | null = null;
  let status: WSStatus = 'disconnected';
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let intentionalClose = false;

  // ── 默认值 ──
  const serialize = config.serialize ?? ((data: TSend) => JSON.stringify(data));
  const deserialize = config.deserialize ?? ((raw: string) => JSON.parse(raw) as TReceive);
  const heartbeatInterval = config.heartbeatInterval ?? 30000;
  const heartbeatMessage = config.heartbeatMessage ?? JSON.stringify({ type: 'ping' });
  const heartbeatTimeout = config.heartbeatTimeout ?? 10000;
  const autoReconnect = config.autoReconnect ?? true;
  const maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
  const baseReconnectInterval = config.reconnectInterval ?? 3000;

  function setStatus(newStatus: WSStatus) {
    status = newStatus;
    config.onStatusChange?.(newStatus);
    logger.info(`[WS] Status: ${newStatus}`);
  }

  // ── 心跳 ──

  function startHeartbeat() {
    if (heartbeatInterval <= 0) return;

    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(heartbeatMessage);
        logger.debug('[WS] Heartbeat sent');

        // 等待 pong 响应，超时则断开
        heartbeatTimeoutTimer = setTimeout(() => {
          logger.warn('[WS] Heartbeat timeout, closing connection');
          ws?.close();
        }, heartbeatTimeout);
      }
    }, heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (heartbeatTimeoutTimer) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  }

  function resetHeartbeatTimeout() {
    if (heartbeatTimeoutTimer) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  }

  // ── 重连 ──

  function scheduleReconnect() {
    if (!autoReconnect) return;
    if (maxReconnectAttempts > 0 && reconnectAttempts >= maxReconnectAttempts) {
      logger.error(`[WS] Max reconnect attempts (${maxReconnectAttempts}) reached`);
      setStatus('disconnected');
      return;
    }

    // 指数退避：base × 1.5^n，上限 30000ms
    const delay = Math.min(
      baseReconnectInterval * Math.pow(1.5, reconnectAttempts),
      30000,
    );
    reconnectAttempts++;
    setStatus('reconnecting');
    logger.info(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function cancelReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  // ── 连接 ──

  function buildUrl(): string {
    let url = config.url;

    // Auth 参数注入
    if (config.getAuthParams) {
      const params = config.getAuthParams();
      const separator = url.includes('?') ? '&' : '?';
      const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (query) {
        url = `${url}${separator}${query}`;
      }
    }

    return url;
  }

  function connect() {
    // 清理旧连接
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    intentionalClose = false;
    setStatus('connecting');

    const url = buildUrl();
    ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempts = 0;
      startHeartbeat();
      config.onOpen?.();
    };

    ws.onmessage = (event) => {
      // 收到任何消息都重置心跳超时
      resetHeartbeatTimeout();

      try {
        const data = deserialize(event.data as string);

        // Zod schema 校验（如果提供）
        if (config.receiveSchema) {
          const result = config.receiveSchema.safeParse(data);
          if (!result.success) {
            logger.warn('[WS] Message validation failed', {
              issues: result.error.issues,
            });
            return; // 跳过不合法消息，不断连
          }
          config.onMessage(result.data);
        } else {
          config.onMessage(data);
        }
      } catch (err) {
        logger.error('[WS] Message deserialize error', err);
      }
    };

    ws.onerror = (event) => {
      logger.error('[WS] Connection error');
      config.onError?.(event);
    };

    ws.onclose = (event) => {
      stopHeartbeat();
      config.onClose?.(event);

      if (!intentionalClose) {
        scheduleReconnect();
      } else {
        setStatus('disconnected');
      }
    };
  }

  function send(data: TSend) {
    if (ws?.readyState !== WebSocket.OPEN) {
      logger.warn('[WS] Cannot send: not connected');
      return;
    }

    try {
      const raw = serialize(data);
      ws.send(raw);
    } catch (err) {
      logger.error('[WS] Send error', err);
    }
  }

  function close() {
    intentionalClose = true;
    cancelReconnect();
    stopHeartbeat();

    if (ws) {
      ws.close();
      ws = null;
    }
    setStatus('disconnected');
  }

  function getStatus(): WSStatus {
    return status;
  }

  return { connect, send, close, getStatus };
}