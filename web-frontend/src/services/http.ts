/**
 * HTTP 请求封装 - 基于原生 fetch API
 * 提供 JWT Token 自动注入、超时控制、统一错误处理
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TIMEOUT_MS = 10000;

/** 获取本地存储的 JWT Token */
function getToken(): string | null {
  try {
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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

/** API 错误类型 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 泛型请求方法 */
export async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = TIMEOUT_MS,
  } = config;

  const token = getToken();
  const url = `${BASE_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 如果外部传了 signal，需要监听它
  if (config.signal) {
    config.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `请求失败 (${response.status})`;
      let errorCode: string | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.detail || errorMessage;
        errorCode = errorData.code;
      } catch {
        // response body is not JSON
      }

      // 401 未授权 - 清除登录状态
      if (response.status === 401) {
        localStorage.removeItem('starisle-auth');
        window.location.href = '/';
      }

      throw new ApiError(errorMessage, response.status, errorCode);
    }

    // 处理空响应
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    }
    return undefined as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络连接', 408, 'TIMEOUT');
    }

    // 网络错误
    throw new ApiError(
      '网络连接失败，请检查网络后重试',
      0,
      'NETWORK_ERROR'
    );
  }
}

/** GET 请求 */
export function get<T>(path: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'GET' });
}

/** POST 请求 */
export function post<T>(path: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'POST', body });
}

/** PUT 请求 */
export function put<T>(path: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'PUT', body });
}

/** DELETE 请求 */
export function del<T>(path: string, config?: Omit<RequestConfig, 'method' | 'body'>) {
  return request<T>(path, { ...config, method: 'DELETE' });
}

/** 检查 API 是否可用 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    await get<{ status: string }>('/health');
    return true;
  } catch {
    return false;
  }
}
