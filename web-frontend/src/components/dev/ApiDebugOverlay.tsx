import { useState } from 'react';
import { Bug, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useApiDebugStore } from '../../store/apiDebugStore';

const STORAGE_KEY = 'starisle-api-debug';

const readInitialOpen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const statusColor = (status: number): string => {
  if (status === 0) return 'text-red-600 bg-red-50';
  if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
  if (status >= 400 && status < 500) return 'text-yellow-600 bg-yellow-50';
  if (status >= 500) return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
};

const methodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return 'text-blue-600';
    case 'POST':
      return 'text-green-600';
    case 'PUT':
      return 'text-orange-600';
    case 'DELETE':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const formatBody = (data: unknown): string => {
  if (data === undefined || data === null) return '—';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const formatUrl = (url: string): string => {
  // 仅展示 path 与 query 部分
  try {
    const u = new URL(url, window.location.origin);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
};

export function ApiDebugOverlay() {
  const logs = useApiDebugStore((s) => s.logs);
  const clearLogs = useApiDebugStore((s) => s.clearLogs);
  const [isOpen, setIsOpen] = useState<boolean>(readInitialOpen);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] print:hidden">
      {isOpen && (
        <div className="mb-2 w-[min(92vw,560px)] max-h-[60vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-gray-800">API 调试面板</h3>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                {logs.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearLogs}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="清空"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleOpen}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="收起"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                暂无请求记录
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const expanded = expandedId === log.id;
                  return (
                    <li key={log.id} className="px-4 py-3 hover:bg-gray-50">
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="w-full flex items-center gap-2 text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`text-xs font-bold w-12 flex-shrink-0 ${methodColor(log.method)}`}>
                          {log.method}
                        </span>
                        <span className="text-xs text-gray-700 truncate flex-1 font-mono">
                          {formatUrl(log.url)}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${statusColor(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{log.duration}ms</span>
                      </button>

                      {expanded && (
                        <div className="mt-2 ml-6 space-y-2 text-xs">
                          <div>
                            <p className="text-gray-500 mb-1">时间</p>
                            <p className="text-gray-700 font-mono">
                              {new Date(log.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          {log.error && (
                            <div>
                              <p className="text-red-500 mb-1">错误</p>
                              <p className="text-red-600 font-mono break-all">{log.error}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500 mb-1">请求体</p>
                            <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                              {formatBody(log.requestBody)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">响应体</p>
                            <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                              {formatBody(log.responseBody)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        onClick={toggleOpen}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-fast ${
          isOpen
            ? 'bg-gray-700 text-white'
            : 'bg-gradient-to-br from-[#F4A261] to-[#E76F51] text-white hover:scale-105'
        }`}
        title="API 调试面板"
      >
        <Bug className="w-5 h-5" />
      </button>
    </div>
  );
}

export default ApiDebugOverlay;
