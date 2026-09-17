/**
 * @file apiDebugStore.ts
 * @description API 调试日志 store：使用 Zustand 维护最近 10 条 API 请求日志，供开发态调试覆盖层（ApiDebugOverlay）展示。
 *              同时导出非 React 钩子 apiDebugStore，供 http.ts 在请求层直接写入。
 * @module web-frontend/store
 */
import { create } from 'zustand';

/** 单条 API 请求日志 */
export interface ApiLogEntry {
  id: string;            // 日志 ID（自动生成）
  method: string;        // HTTP 方法
  url: string;           // 完整请求 URL
  requestBody: unknown;  // 请求体（敏感路径已脱敏）
  status: number;        // HTTP 状态码
  responseBody: unknown; // 响应体
  duration: number;      // 请求耗时（毫秒）
  timestamp: string;     // ISO 时间戳
  error?: string;        // 错误信息（可选）
}

/** API 调试 store 状态 */
interface ApiDebugState {
  logs: ApiLogEntry[];                                   // 日志列表（最新在前）
  addLog: (entry: Omit<ApiLogEntry, 'id'>) => void;      // 追加一条日志（ID 自动生成）
  clearLogs: () => void;                                  // 清空所有日志
}

// 最多保留 10 条日志，超出截断
const MAX_LOGS = 10;

/**
 * API 调试 store（React 组件用）
 */
export const useApiDebugStore = create<ApiDebugState>((set) => ({
  logs: [],
  /**
   * 追加一条日志：生成 ID，置顶插入并截断至 MAX_LOGS 条
   */
  addLog: (entry) => {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => {
      const next = [{ ...entry, id }, ...state.logs];
      return { logs: next.slice(0, MAX_LOGS) };
    });
  },
  /** 清空日志 */
  clearLogs: () => set({ logs: [] }),
}));

/**
 * 供 http.ts 直接调用的非 React 钩子：在请求层（非组件）写入/清空日志
 */
export const apiDebugStore = {
  addLog: (entry: Omit<ApiLogEntry, 'id'>) => useApiDebugStore.getState().addLog(entry),
  clearLogs: () => useApiDebugStore.getState().clearLogs(),
};
