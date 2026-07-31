import { useState } from 'react';

type OpenAPIDocument = Record<string, any>;
type OpenAPIOperation = Record<string, any>;
type OpenAPIParameter = Record<string, any>;

interface ApiTesterProps {
  method: string;
  path: string;
  spec: OpenAPIDocument | null;
  baseUrl: string;
  authToken: string;
  onClose: () => void;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
}

function ApiTester({ method, path, spec, baseUrl, authToken, onClose }: ApiTesterProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');

  const operation = findOperation(spec, path, method);
  const pathParams = getPathParameters(operation);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);

    try {
      let finalPath = path;
      const allParams: Record<string, string> = { ...params };

      pathParams.forEach((param: OpenAPIParameter) => {
        const value = params[param.name] || `{${param.name}}`;
        finalPath = finalPath.replace(`{${param.name}}`, value);
        delete allParams[param.name];
      });

      const queryString = Object.entries(allParams)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const fullUrl = `${baseUrl}${finalPath}${queryString ? '?' + queryString : ''}`;
      const startTime = Date.now();

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...headers,
      };

      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: requestHeaders,
      };

      if (body && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'DELETE') {
        fetchOptions.body = body;
      }

      const response = await fetch(fullUrl, fetchOptions);
      const endTime = Date.now();
      const responseText = await response.text();

      let responseBody: string;
      try {
        responseBody = JSON.stringify(JSON.parse(responseText), null, 2);
      } catch {
        responseBody = responseText;
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        time: endTime - startTime,
      });
    } catch (err) {
      const error = err as Error;
      setResponse({
        status: 0,
        statusText: error.message || '请求失败',
        headers: {},
        body: JSON.stringify({ error: error.message || '请求失败' }, null, 2),
        time: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddParam = () => {
    setParams({ ...params, '': '' });
  };

  const handleRemoveParam = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    setParams(newParams);
  };

  const handleAddHeader = () => {
    setHeaders({ ...headers, '': '' });
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 400 && status < 500) return 'status-error';
    if (status >= 500) return 'status-error';
    return 'status-info';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {method.toUpperCase()} {path}
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`sidebar-nav-item ${activeTab === 'params' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setActiveTab('params')}
          >
            请求参数
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'headers' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setActiveTab('headers')}
          >
            请求头
          </button>
          <button
            className={`sidebar-nav-item ${activeTab === 'body' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setActiveTab('body')}
          >
            请求体
          </button>
        </div>

        <div className="api-tester">
          {activeTab === 'params' && (
            <div className="api-tester-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="api-tester-label">查询参数</label>
                <button onClick={handleAddParam} style={{ 
                  padding: '4px 12px', 
                  background: '#6B7BFF', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>添加参数</button>
              </div>
              {Object.keys(params).length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>点击"添加参数"按钮添加新的查询参数</p>
              )}
              {Object.entries(params).map(([key, value]) => (
                <div key={key + Date.now()} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="api-tester-input"
                    placeholder="参数名"
                    value={key}
                    onChange={(e) => {
                      const newParams: Record<string, string> = {};
                      Object.entries(params).forEach(([k, v]) => {
                        if (k !== key) {
                          newParams[k] = v;
                        } else {
                          newParams[e.target.value] = v;
                        }
                      });
                      setParams(newParams);
                    }}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="api-tester-input"
                    placeholder="参数值"
                    value={value}
                    onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                    style={{ flex: 2 }}
                  />
                  <button onClick={() => handleRemoveParam(key)} style={{
                    padding: '0 8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>&times;</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="api-tester-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="api-tester-label">请求头</label>
                <button onClick={handleAddHeader} style={{ 
                  padding: '4px 12px', 
                  background: '#6B7BFF', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>添加请求头</button>
              </div>
              {Object.keys(headers).length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>点击"添加请求头"按钮添加新的请求头</p>
              )}
              {Object.entries(headers).map(([key, value]) => (
                <div key={key + Date.now()} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="api-tester-input"
                    placeholder="请求头名"
                    value={key}
                    onChange={(e) => {
                      const newHeaders: Record<string, string> = {};
                      Object.entries(headers).forEach(([k, v]) => {
                        if (k !== key) {
                          newHeaders[k] = v;
                        } else {
                          newHeaders[e.target.value] = v;
                        }
                      });
                      setHeaders(newHeaders);
                    }}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="api-tester-input"
                    placeholder="请求头值"
                    value={value}
                    onChange={(e) => setHeaders({ ...headers, [key]: e.target.value })}
                    style={{ flex: 2 }}
                  />
                  <button onClick={() => handleRemoveHeader(key)} style={{
                    padding: '0 8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>&times;</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'body' && (
            <div className="api-tester-section">
              <label className="api-tester-label">请求体 (JSON)</label>
              <textarea
                className="api-tester-input api-tester-textarea"
                placeholder='{"key": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}

          <button
            className="api-tester-button"
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? '发送中...' : '发送请求'}
          </button>

          {response && (
            <div className="api-response">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className={`api-response-status ${getStatusClass(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {response.time}ms
                </span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                {response.body}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function findOperation(spec: OpenAPIDocument | null, path: string, method: string): OpenAPIOperation | null {
  if (!spec || !spec.paths || !spec.paths[path]) {
    return null;
  }
  const pathItem = spec.paths[path];
  return pathItem[method.toLowerCase()] || null;
}

function getPathParameters(operation: OpenAPIOperation | null): OpenAPIParameter[] {
  if (!operation || !operation.parameters) {
    return [];
  }
  return operation.parameters.filter((p: OpenAPIParameter) => p.in === 'path');
}

export default ApiTester;
