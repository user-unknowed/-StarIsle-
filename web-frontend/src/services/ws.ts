/**
 * @file ws.ts
 * @description WebSocket 连接管理：AI 实时对话长连接，支持自动重连（指数退避）、心跳保活、消息队列缓存。
 * @module web-frontend/services
 */

import { getToken } from './http';

// WebSocket 基础地址：优先使用环境变量
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

// 消息处理器类型：收到消息时回调
type MessageHandler = (data: unknown) => void;
// 状态处理器类型：连接状态变更时回调
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

/**
 * WebSocket 管理器：封装连接、重连、心跳、消息分发
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;        // WebSocket 实例
  private url: string;                         // 连接基础地址
  private reconnectAttempts = 0;               // 当前重连次数
  private maxReconnectAttempts = 5;            // 最大重连次数
  private reconnectDelay = 3000;               // 基础重连延迟（毫秒，后续指数退避）
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null; // 心跳定时器
  private messageQueue: string[] = [];         // 连接未就绪时的消息队列
  private messageHandlers: Set<MessageHandler> = new Set(); // 消息处理器集合
  private statusHandlers: Set<StatusHandler> = new Set();    // 状态处理器集合
  private isManualClose = false;                // 是否为主动关闭（避免触发重连）

  /**
   * @param url - 可选自定义地址，默认使用 WS_BASE_URL
   */
  constructor(url?: string) {
    this.url = url || WS_BASE_URL;
  }

  /**
   * 连接 WebSocket（外部入口，重置重连状态）
   * @param userId - 用户 ID（用于拼装 /chat/{userId} 通道）
   */
  connect(userId: string): void {
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this._connect(userId);
  }

  /**
   * 内部连接实现：创建 WebSocket 并绑定事件
   * @param userId - 用户 ID
   */
  private _connect(userId: string): void {
    // 通知外部正在连接中
    this.notifyStatus('connecting');

    try {
      // 生产环境强制 wss://（HTTPS 下不能使用明文 ws）
      if (import.meta.env.PROD && !this.url.startsWith('wss://')) {
        console.error('[WS] 生产环境必须使用 wss:// 协议');
        this.notifyStatus('error');
        return;
      }

      // 拼装完整通道地址：{base}/chat/{userId}
      const fullUrl = `${this.url}/chat/${userId}`;
      this.ws = new WebSocket(fullUrl);

      // 连接打开：首条消息发送 JWT Token 鉴权，启动心跳，刷新消息队列
      this.ws.onopen = () => {
        const token = getToken();
        if (token && this.ws) {
          this.ws.send(JSON.stringify({ type: 'auth', token }));
        }
        // 重置重连计数
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');
        this.startHeartbeat();
        // 投递在断连期间积压的消息
        this.flushQueue();
      };

      // 收到消息：尝试 JSON 解析，失败则按文本透传
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch {
          // 非JSON消息，直接传递文本
          this.messageHandlers.forEach((handler) => handler(event.data));
        }
      };

      // 错误事件：仅通知状态，由 onclose 兜底重连
      this.ws.onerror = () => {
        this.notifyStatus('error');
      };

      // 关闭事件：停止心跳，必要时触发重连（指数退避）
      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.notifyStatus('disconnected');

        // 非主动关闭且未超过最大重连次数时，按指数退避重连
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          // 退避公式：基础延迟 * 1.5^(attempts-1)
          const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
          setTimeout(() => this._connect(userId), delay);
        }
      };
    } catch {
      // 创建 WebSocket 抛错（如地址非法）
      this.notifyStatus('error');
    }
  }

  /**
   * 发送消息：连接就绪时直接发送，否则入队等待
   * @param message - 消息文本
   * @returns true 表示已发送，false 表示已入队
   */
  send(message: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    }
    // 连接未就绪，加入队列
    this.messageQueue.push(message);
    return false;
  }

  /**
   * 主动关闭连接（清空消息队列，标记为手动关闭以阻止重连）
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageQueue = [];
  }

  /**
   * 注册消息处理器
   * @param handler - 消息处理回调
   * @returns 取消订阅函数
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * 注册状态处理器
   * @param handler - 状态变更回调
   * @returns 取消订阅函数
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * 获取连接就绪状态码
   * @returns WebSocket readyState，默认 CLOSED
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   * @returns true 表示已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 启动心跳：每 30 秒发送一次 ping
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  /**
   * 停止心跳定时器
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 投递消息队列：连接打开后立即发送积压消息
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  /**
   * 通知所有状态处理器
   * @param status - 新状态
   */
  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

// 单例 WebSocket 管理器（懒加载）
let wsManager: WebSocketManager | null = null;

/**
 * 获取单例 WebSocket 管理器（首次调用时创建）
 * @returns WebSocketManager 实例
 */
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}
