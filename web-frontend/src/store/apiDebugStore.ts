import { create } from 'zustand';

/** 单条 API 请求日志 */
export interface ApiLogEntry {
  id: string;
  method: string;
  url: string;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
  duration: number;
  timestamp: string;
  error?: string;
}

interface ApiDebugState {
  logs: ApiLogEntry[];
  addLog: (entry: Omit<ApiLogEntry, 'id'>) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 10;

export const useApiDebugStore = create<ApiDebugState>((set) => ({
  logs: [],
  addLog: (entry) => {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => {
      const next = [{ ...entry, id }, ...state.logs];
      return { logs: next.slice(0, MAX_LOGS) };
    });
  },
  clearLogs: () => set({ logs: [] }),
}));

/** 供 http.ts 直接调用的非 React 钩子 */
export const apiDebugStore = {
  addLog: (entry: Omit<ApiLogEntry, 'id'>) => useApiDebugStore.getState().addLog(entry),
  clearLogs: () => useApiDebugStore.getState().clearLogs(),
};
