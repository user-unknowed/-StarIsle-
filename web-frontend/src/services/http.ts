/**
 * @file http.ts
 * @description HTTP 请求封装：基于原生 fetch API，统一提供 JWT Token 自动注入、
 *              超时控制、统一响应解包、401 自动登出、API 调试日志写入等能力。
 * @module web-frontend/services
 */
import { apiDebugStore } from '../store/apiDebugStore';

// API 基础地址：优先使用环境变量，默认走同源 /api 代理
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// 默认请求超时时间（毫秒）
const TIMEOUT_MS = 10000;

// 涉及敏感信息的路径（请求体不写入调试日志，避免泄露凭据）
const SENSITIVE_PATHS = ['/auth/', '/parents/login', '/parents/register', '/login'];
/**
 * 判断该请求 URL 是否需要脱敏（敏感路径不记录请求体）
 * @param url - 完整请求 URL
 * @returns 是否需要脱敏
 */
function shouldSanitizeBody(url: string): boolean {
  return SENSITIVE_PATHS.some(p => url.includes(p));
}

// 防止 401 触发重复跳转的标志位
let isRedirecting = false;

/**
 * 获取本地存储的 JWT Token
 * @returns Token 字符串或 null（未登录或解析失败）
 */
export function getToken(): string | null {
  try {
    // zustand persist 在 localStorage 中以 { state: { token, ... } } 形式存储
    const stored = localStorage.getItem('starisle-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/** 请求配置 */
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; // HTTP 方法
  body?: unknown;                              // 请求体（自动序列化为 JSON）
  headers?: Record<string, string>;            // 自定义请求头
  timeout?: number;                            // 超时时间（毫秒）
  signal?: AbortSignal;                        // 外部 AbortSignal（用于取消请求）
}

/** 统一 API 错误类型，携带 HTTP 状态码与业务错误码 */
export class ApiError extends Error {
  /**
   * @param message - 错误信息
   * @param status - HTTP 状态码（0 表示网络错误，408 表示超时）
   * @param code - 业务错误码（可选）
   */
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 泛型请求方法（核心）
 * @param path - 请求路径（相对 BASE_URL）
 * @param config - 请求配置
 * @returns 解包后的响应数据
 * @throws {ApiError} 请求失败时抛出
 */
export async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  // 解构配置，默认 GET、默认超时
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = TIMEOUT_MS,
  } = config;

  // 注入 JWT Token
  const token = getToken();
  const url = `${BASE_URL}${path}`;

  // 合并请求头，默认 JSON
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // 已登录则追加鉴权头
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // 超时控制：通过 AbortController 实现
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 如果外部传了 signal，需要监听它（让外部可取消请求）
  if (config.signal) {
    config.signal.addEventListener('abort', () => controller.abort());
  }

  // 记录请求开始时间，用于计算耗时
  const startTime = Date.now();
  /**
   * 写入 API 调试日志（敏感路径请求体脱敏）
   * @param status - HTTP 状态码
   * @param responseBody - 响应体
   * @param error - 可选错误信息
   */
  const recordLog = (status: number, responseBody: unknown, error?: string) => {
    try {
      apiDebugStore.addLog({
        method,
        url,
        // 敏感路径请求体不记录原文，避免凭据泄露
        requestBody: shouldSanitizeBody(url) ? '[REDACTED]' : body,
        status,
        responseBody,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error,
      });
    } catch {
      // 日志记录失败不影响主流程
    }
  };

  try {
    // 测试用：模拟网络延迟（通过 localStorage.__test_delay 控制毫秒数）
    const testDelay = typeof localStorage !== 'undefined' && localStorage.getItem('__test_delay');
    if (testDelay) {
      await new Promise(r => setTimeout(r, parseInt(testDelay)));
    }
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // 清理超时定时器
    clearTimeout(timeoutId);

    // 非 2xx 视为业务错误
    if (!response.ok) {
      let errorMessage = `请求失败 (${response.status})`;
      let errorCode: string | undefined;
      let errorData: unknown;

      // 尝试解析错误响应体（可能是 JSON）
      try {
        errorData = await response.json();
        if (errorData && typeof errorData === 'object') {
          const obj = errorData as Record<string, unknown>;
          errorMessage = (obj.message as string) || (obj.detail as string) || errorMessage;
          errorCode = obj.code as string | undefined;
        }
      } catch {
        // response body is not JSON
      }

      // 401 未授权 - 清除登录状态并跳转首页（仅触发一次，避免循环跳转）
      if (response.status === 401) {
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem('starisle-auth');
          window.location.href = '/';
        }
      }

      recordLog(response.status, errorData, errorMessage);
      throw new ApiError(errorMessage, response.status, errorCode);
    }

    // 处理响应：JSON 解析并解包统一响应格式 {code, message, data}
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      // 后端统一响应壳层：{ code, message, data }，这里只取 data 字段
      const unwrapped = (data && typeof data === 'object' && 'code' in data && 'data' in data)
        ? (data as Record<string, unknown>).data
        : data;
      recordLog(response.status, data);
      return unwrapped as T;
    }
    // 空响应或非 JSON
    recordLog(response.status, undefined);
    return undefined as unknown as T;
  } catch (error) {
    // 兜底：清理超时定时器
    clearTimeout(timeoutId);

    // 已是 ApiError 则直接抛出，避免重复包装
    if (error instanceof ApiError) {
      throw error;
    }

    // 超时错误（AbortController.abort 触发）
    if (error instanceof DOMException && error.name === 'AbortError') {
      const msg = '请求超时，请检查网络连接';
      recordLog(408, undefined, msg);
      throw new ApiError(msg, 408, 'TIMEOUT');
    }

    // 其它视为网络错误（DNS/连接失败等）
    const msg = '网络连接失败，请检查网络后重试';
    recordLog(0, undefined, msg);
    throw new ApiError(
      msg,
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * GET 请求快捷方法
 * @param path - 请求路径
 * @param config - 请求配置（不含 method 与 body）
 */
export function get<T>(path: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'GET' });
}

/**
 * POST 请求快捷方法
 * @param path - 请求路径
 * @param body - 请求体
 * @param config - 请求配置（不含 method 与 body）
 */
export function post<T>(path: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'POST', body });
}

/**
 * PUT 请求快捷方法
 * @param path - 请求路径
 * @param body - 请求体
 * @param config - 请求配置（不含 method 与 body）
 */
export function put<T>(path: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'PUT', body });
}

/**
 * DELETE 请求快捷方法
 * @param path - 请求路径
 * @param config - 请求配置（不含 method 与 body）
 */
export function del<T>(path: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'DELETE' });
}

/**
 * 检查 API 是否可用（健康检查）
 * @returns true 表示可用，false 表示不可用
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await get<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
}
