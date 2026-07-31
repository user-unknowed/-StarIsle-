import { useState, useRef, useMemo } from 'react';
import type { EndpointSummary } from '../types';
import { generateBodyTemplate } from '../services/specParser';
import JsonView from './JsonView';

type OpenAPIDocument = Record<string, any>;

interface ApiTesterProps {
  method: string;
  path: string;
  operation: EndpointSummary | null;
  spec: OpenAPIDocument | null;
  baseUrl: string;
  authToken: string;
}

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HistoryEntry {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyParsed: unknown;
  time: number;
  size: number;
  url: string;
  curl: string;
  timestamp: number;
}

function ApiTester({ method, path, operation, spec, baseUrl, authToken }: ApiTesterProps) {
  const idCounter = useRef(0);
  const newId = () => `row-${++idCounter.current}`;

  // 路径参数（来自 spec，全部必填）
  const pathParams = operation?.pathParams ?? [];
  const specQueryParams = operation?.queryParams ?? [];

  const [pathValues, setPathValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    pathParams.forEach((p) => {
      init[p.name] = '';
    });
    return init;
  });

  // 查询参数：预填 spec 中的，可增删
  const [queryRows, setQueryRows] = useState<KeyValueRow[]>(() =>
    specQueryParams.map((p) => ({
      id: newId(),
      key: p.name,
      value: p.schema?.default !== undefined ? String(p.schema.default) : '',
      enabled: !p.required ? true : true,
    })),
  );

  // 请求头：默认 Authorization + Content-Type
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>(() => [
    {
      id: newId(),
      key: 'Authorization',
      value: authToken ? `Bearer ${authToken}` : '',
      enabled: true,
    },
    {
      id: newId(),
      key: 'Content-Type',
      value: 'application/json',
      enabled: true,
    },
  ]);

  // 请求体：根据 schema 生成 JSON 模板
  const hasBody = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'DELETE';
  const initialBody = useMemo(() => {
    if (!hasBody) return '';
    const schema =
      operation?.requestBody?.content?.['application/json']?.schema;
    if (!schema) return '';
    const tpl = generateBodyTemplate(spec, schema);
    return tpl || '';
  }, [operation, spec, hasBody]);

  const [body, setBody] = useState(initialBody);

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);

  const activeResponse = history.find((h) => h.id === activeHistoryId) ?? null;

  const handleSend = async () => {
    setLoading(true);
    setBodyError(null);

    try {
      let finalPath = path;
      pathParams.forEach((p) => {
        const value = pathValues[p.name] || `{${p.name}}`;
        finalPath = finalPath.replace(`{${p.name}}`, encodeURIComponent(value));
      });

      const queryString = queryRows
        .filter((r) => r.enabled && r.key && r.value !== '')
        .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
        .join('&');

      const fullUrl = `${baseUrl}${finalPath}${queryString ? '?' + queryString : ''}`;

      const requestHeaders: Record<string, string> = {};
      headerRows.forEach((r) => {
        if (r.enabled && r.key) {
          requestHeaders[r.key] = r.value;
        }
      });
      // 若用户删除了 Authorization 但存在全局 token，仍注入
      if (!requestHeaders['Authorization'] && authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: requestHeaders,
      };

      if (hasBody && body.trim() !== '') {
        // 校验 JSON
        try {
          JSON.parse(body);
        } catch (e) {
          setBodyError('请求体 JSON 格式错误: ' + (e as Error).message);
          setLoading(false);
          return;
        }
        fetchOptions.body = body;
      }

      const startTime = Date.now();
      const response = await fetch(fullUrl, fetchOptions);
      const endTime = Date.now();
      const responseText = await response.text();

      let bodyParsed: unknown = responseText;
      try {
        bodyParsed = JSON.parse(responseText);
      } catch {
        bodyParsed = responseText;
      }

      const responseHeaders = Object.fromEntries(response.headers.entries());
      const size = responseText.length;

      const curl = buildCurl(method.toUpperCase(), fullUrl, requestHeaders, hasBody ? body : '');

      const entry: HistoryEntry = {
        id: newId(),
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseText,
        bodyParsed,
        time: endTime - startTime,
        size,
        url: fullUrl,
        curl,
        timestamp: Date.now(),
      };

      setHistory((prev) => [entry, ...prev].slice(0, 5));
      setActiveHistoryId(entry.id);
    } catch (err) {
      const error = err as Error;
      const entry: HistoryEntry = {
        id: newId(),
        status: 0,
        statusText: error.message || '请求失败',
        headers: {},
        body: JSON.stringify({ error: error.message || '请求失败' }, null, 2),
        bodyParsed: { error: error.message || '请求失败' },
        time: 0,
        size: 0,
        url: '',
        curl: '',
        timestamp: Date.now(),
      };
      setHistory((prev) => [entry, ...prev].slice(0, 5));
      setActiveHistoryId(entry.id);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 400 && status < 600) return 'status-error';
    return 'status-info';
  };

  const copyCurl = async () => {
    if (!activeResponse?.curl) return;
    try {
      await navigator.clipboard.writeText(activeResponse.curl);
    } catch {
      // 忽略
    }
  };

  return (
    <div className="tester-panel">
      <div className="tester-panel-header">
        <span className={`method-badge method-${method.toLowerCase()}`}>{method.toUpperCase()}</span>
        <span className="tester-panel-path">{path}</span>
        {operation?.summary && <span className="tester-panel-summary">{operation.summary}</span>}
      </div>

      <div className="tester-split">
        {/* 左侧：输入区 */}
        <div className="tester-input-pane">
          {pathParams.length > 0 && (
            <div className="tester-section">
              <div className="tester-section-title">路径参数</div>
              {pathParams.map((p) => (
                <div className="tester-row" key={p.name}>
                  <label className="tester-field-label">
                    {p.name}
                    {p.required && <span className="required-mark">*</span>}
                  </label>
                  <input
                    type="text"
                    className="tester-input"
                    placeholder={p.name}
                    value={pathValues[p.name] ?? ''}
                    onChange={(e) => setPathValues({ ...pathValues, [p.name]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="tester-section">
            <div className="tester-section-title">
              <span>查询参数</span>
              <button
                className="tester-mini-btn"
                onClick={() =>
                  setQueryRows([...queryRows, { id: newId(), key: '', value: '', enabled: true }])
                }
              >
                + 添加
              </button>
            </div>
            {queryRows.length === 0 && (
              <p className="tester-empty-tip">无查询参数，可点击「添加」自定义</p>
            )}
            {queryRows.map((row) => (
              <div className="tester-kv-row" key={row.id}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    setQueryRows(
                      queryRows.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r)),
                    )
                  }
                />
                <input
                  type="text"
                  className="tester-input"
                  placeholder="参数名"
                  value={row.key}
                  onChange={(e) =>
                    setQueryRows(
                      queryRows.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
                    )
                  }
                />
                <input
                  type="text"
                  className="tester-input"
                  placeholder="参数值"
                  value={row.value}
                  onChange={(e) =>
                    setQueryRows(
                      queryRows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                    )
                  }
                />
                <button
                  className="tester-remove-btn"
                  onClick={() => setQueryRows(queryRows.filter((r) => r.id !== row.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="tester-section">
            <div className="tester-section-title">
              <span>请求头</span>
              <button
                className="tester-mini-btn"
                onClick={() =>
                  setHeaderRows([
                    ...headerRows,
                    { id: newId(), key: '', value: '', enabled: true },
                  ])
                }
              >
                + 添加
              </button>
            </div>
            {headerRows.map((row) => (
              <div className="tester-kv-row" key={row.id}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    setHeaderRows(
                      headerRows.map((r) =>
                        r.id === row.id ? { ...r, enabled: e.target.checked } : r,
                      ),
                    )
                  }
                />
                <input
                  type="text"
                  className="tester-input"
                  placeholder="Header 名"
                  value={row.key}
                  onChange={(e) =>
                    setHeaderRows(
                      headerRows.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
                    )
                  }
                />
                <input
                  type="text"
                  className="tester-input"
                  placeholder="Header 值"
                  value={row.value}
                  onChange={(e) =>
                    setHeaderRows(
                      headerRows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                    )
                  }
                />
                <button
                  className="tester-remove-btn"
                  onClick={() => setHeaderRows(headerRows.filter((r) => r.id !== row.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {hasBody && (
            <div className="tester-section">
              <div className="tester-section-title">
                <span>请求体 (JSON)</span>
                <button
                  className="tester-mini-btn"
                  onClick={() => {
                    const schema =
                      operation?.requestBody?.content?.['application/json']?.schema;
                    const tpl = schema ? generateBodyTemplate(spec, schema) : '';
                    setBody(tpl || '');
                  }}
                >
                  重置模板
                </button>
              </div>
              <textarea
                className="tester-input tester-textarea"
                placeholder='{"key": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              {bodyError && <div className="tester-body-error">{bodyError}</div>}
            </div>
          )}

          <button className="api-tester-button" onClick={handleSend} disabled={loading}>
            {loading ? '发送中...' : '发送请求'}
          </button>
        </div>

        {/* 右侧：输出区 */}
        <div className="tester-output-pane">
          {!activeResponse && (
            <div className="tester-output-empty">
              <div className="tester-output-empty-icon">📡</div>
              <p>点击「发送请求」查看响应结果</p>
            </div>
          )}

          {activeResponse && (
            <>
              <div className="tester-output-meta">
                <span className={`api-response-status ${getStatusClass(activeResponse.status)}`}>
                  {activeResponse.status === 0 ? 'ERROR' : activeResponse.status}{' '}
                  {activeResponse.statusText}
                </span>
                <span className="tester-meta-item">{activeResponse.time}ms</span>
                <span className="tester-meta-item">{formatSize(activeResponse.size)}</span>
              </div>

              {history.length > 1 && (
                <div className="history-list">
                  <div className="history-list-title">历史响应（最近 {history.length} 次）</div>
                  <div className="history-items">
                    {history.map((h) => (
                      <button
                        key={h.id}
                        className={`history-item ${h.id === activeHistoryId ? 'active' : ''}`}
                        onClick={() => setActiveHistoryId(h.id)}
                      >
                        <span className={`method-badge method-${method.toLowerCase()}`}>
                          {method.toUpperCase()}
                        </span>
                        <span className={`history-status ${getStatusClass(h.status)}`}>
                          {h.status === 0 ? 'ERR' : h.status}
                        </span>
                        <span className="history-time">{h.time}ms</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="tester-output-section">
                <div className="tester-output-section-title">请求 URL</div>
                <pre className="tester-url">{activeResponse.url || '(无)'}</pre>
              </div>

              <div className="tester-output-section">
                <div className="tester-output-section-title">
                  <button
                    className="tester-collapse-btn"
                    onClick={() => setShowHeaders(!showHeaders)}
                  >
                    {showHeaders ? '▼' : '▶'} 响应头
                  </button>
                </div>
                {showHeaders && (
                  <pre className="tester-headers">
                    {Object.entries(activeResponse.headers)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n')}
                  </pre>
                )}
              </div>

              <div className="tester-output-section">
                <div className="tester-output-section-title">响应体</div>
                {typeof activeResponse.bodyParsed === 'string' ? (
                  <pre className="tester-raw-body">{activeResponse.bodyParsed}</pre>
                ) : (
                  <JsonView data={activeResponse.bodyParsed} />
                )}
              </div>

              {activeResponse.curl && (
                <div className="tester-output-section">
                  <div className="tester-output-section-title">
                    <span>cURL 命令</span>
                    <button className="tester-mini-btn" onClick={copyCurl}>
                      复制
                    </button>
                  </div>
                  <pre className="curl-block">{activeResponse.curl}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
): string {
  const parts: string[] = [`curl -X ${method}`];
  Object.entries(headers).forEach(([k, v]) => {
    parts.push(`-H '${k}: ${v}'`);
  });
  if (body) {
    parts.push(`-d '${body.replace(/'/g, "'\\''")}'`);
  }
  parts.push(`'${url}'`);
  return parts.join(' \\\n  ');
}

export default ApiTester;
