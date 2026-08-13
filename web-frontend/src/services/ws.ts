/**
 * WebSocket 连接管理 - AI 实时对话
 * 支持自动重连、心跳保活、消息队列
 */

import { getToken } from './http';

/**
 * 构造 WebSocket 基础 URL
 * - 若 VITE_WS_URL 是绝对 ws/wss URL，直接使用
 * - 若是相对路径（如 /ws），基于 window.location 动态构造，适配任意访问地址
 * - 默认回退到 ws://localhost:8080/ws
 */
function buildWsBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured && /^wss?:\/\//.test(configured)) {
    return configured;
  }
  if (typeof window !== 'undefined' && configured && configured.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${configured}`;
  }
  return 'ws://localhost:8080/ws';
}

const WS_BASE_URL = buildWsBaseUrl();

type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: string[] = [];
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private isManualClose = false;

  constructor(url?: string) {
    this.url = url || WS_BASE_URL;
  }

  /** 连接 WebSocket */
  connect(userId: string): void {
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this._connect(userId);
  }

  private _connect(userId: string): void {
    this.notifyStatus('connecting');

    try {
      // 生产环境强制 wss://
      if (import.meta.env.PROD && !this.url.startsWith('wss://')) {
        console.error('[WS] 生产环境必须使用 wss:// 协议');
        this.notifyStatus('error');
        return;
      }

      const fullUrl = `${this.url}/chat/${userId}`;
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        // 首条消息发送 JWT Token 鉴权
        const token = getToken();
        if (token && this.ws) {
          this.ws.send(JSON.stringify({ type: 'auth', token }));
        }
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');
        this.startHeartbeat();
        this.flushQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch {
          // 非JSON消息，直接传递文本
          this.messageHandlers.forEach((handler) => handler(event.data));
        }
      };

      this.ws.onerror = () => {
        this.notifyStatus('error');
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.notifyStatus('disconnected');

        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
          setTimeout(() => this._connect(userId), delay);
        }
      };
    } catch {
      this.notifyStatus('error');
    }
  }

  /** 发送消息 */
  send(message: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    }
    // 连接未就绪，加入队列
    this.messageQueue.push(message);
    return false;
  }

  /** 关闭连接 */
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
  }

  /** 注册消息处理器 */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /** 注册状态处理器 */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /** 获取连接状态 */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

/** 单例 WebSocket 管理器 */
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}
