import { useState, useEffect, useMemo } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import ApiTester from './components/ApiTester';
import EndpointOverview from './components/EndpointOverview';
import { parseSpecGroups } from './services/specParser';
import type { ApiEndpointGroup, SelectedEndpoint, SelectedView } from './types';
import './styles/global.css';

type OpenAPIDocument = Record<string, any>;

const defaultSpecUrl = '/spec/openapi.yaml';

const servers = [
  {
    url: 'http://localhost:8080',
    description: '开发环境',
  },
  {
    url: 'https://api.starisle.com',
    description: '生产环境',
  },
];

function App() {
  const [apiSpec, setApiSpec] = useState<OpenAPIDocument | null>(null);
  const [selectedServer, setSelectedServer] = useState(servers[0].url);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<SelectedView>('overview');
  const [selectedEndpoint, setSelectedEndpoint] = useState<SelectedEndpoint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApiSpec();
    loadSavedToken();
  }, []);

  const loadSavedToken = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const savedToken = await window.electronAPI.loadToken();
      if (savedToken) {
        setAuthToken(savedToken);
      }
    } else {
      const savedToken = localStorage.getItem('api-token');
      if (savedToken) {
        setAuthToken(savedToken);
      }
    }
  };

  const loadApiSpec = async () => {
    try {
      const response = await fetch(defaultSpecUrl);
      const yamlText = await response.text();

      const yamlModule = await import('yaml');
      const parsedSpec = yamlModule.parse(yamlText) as OpenAPIDocument;

      setApiSpec(parsedSpec);
      setLoading(false);
    } catch (err) {
      setError('加载API规范失败: ' + (err as Error).message);
      setLoading(false);
    }
  };

  const handleServerChange = (serverUrl: string) => {
    setSelectedServer(serverUrl);
  };

  const handleTokenChange = (token: string) => {
    setAuthToken(token);
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.saveToken(token);
    } else {
      if (token) {
        localStorage.setItem('api-token', token);
      } else {
        localStorage.removeItem('api-token');
      }
    }
  };

  const groups: ApiEndpointGroup[] = useMemo(() => parseSpecGroups(apiSpec), [apiSpec]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        endpoints: g.endpoints.filter(
          (e) =>
            e.path.toLowerCase().includes(q) ||
            (e.summary || '').toLowerCase().includes(q) ||
            e.method.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.endpoints.length > 0);
  }, [groups, searchQuery]);

  const currentEndpoint = useMemo(() => {
    if (!selectedEndpoint) return null;
    for (const g of groups) {
      const found = g.endpoints.find(
        (e) =>
          e.method.toUpperCase() === selectedEndpoint.method.toUpperCase() &&
          e.path === selectedEndpoint.path,
      );
      if (found) return found;
    }
    return null;
  }, [groups, selectedEndpoint]);

  const handleSelectEndpoint = (endpoint: SelectedEndpoint) => {
    setSelectedEndpoint(endpoint);
    setSelectedView('endpoint');
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="app-loading">
          <div className="loading app-loading-spinner"></div>
          <p className="app-loading-text">正在加载API文档...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="app-error">
          <div className="app-error-icon">⚠️</div>
          <h2 className="app-error-title">加载失败</h2>
          <p className="app-error-msg">{error}</p>
          <button className="app-retry-btn" onClick={loadApiSpec}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">星</div>
          <div>
            <div className="title">星屿API文档</div>
            <div className="subtitle">三端 API 调试工具</div>
          </div>
        </div>
        <div className="header-actions">
          <select
            className="server-selector"
            value={selectedServer}
            onChange={(e) => handleServerChange(e.target.value)}
          >
            {servers.map((server) => (
              <option key={server.url} value={server.url}>
                {server.description}: {server.url}
              </option>
            ))}
          </select>
          <div className="token-section">
            <input
              type="text"
              className="token-input"
              placeholder="输入JWT Token..."
              value={authToken}
              onChange={(e) => handleTokenChange(e.target.value)}
            />
          </div>
          <button
            className={`header-tab-btn ${selectedView === 'docs' ? 'active' : ''}`}
            onClick={() => setSelectedView(selectedView === 'docs' ? 'overview' : 'docs')}
          >
            {selectedView === 'docs' ? '返回总览' : '查看完整文档'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="sidebar-top">
            <button
              className={`sidebar-overview-btn ${selectedView === 'overview' ? 'active' : ''}`}
              onClick={() => {
                setSelectedView('overview');
                setSelectedEndpoint(null);
              }}
            >
              📊 三端总览
            </button>
            <input
              type="text"
              className="sidebar-search"
              placeholder="搜索路径 / 描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sidebar-groups">
            {filteredGroups.map((group) => (
              <div className="sidebar-group" key={group.groupName}>
                <div className="sidebar-group-title">
                  {group.groupName}
                  <span className="sidebar-group-count">{group.endpoints.length}</span>
                </div>
                <ul className="sidebar-nav">
                  {group.endpoints.map((endpoint) => {
                    const isActive =
                      selectedEndpoint &&
                      selectedEndpoint.method.toUpperCase() === endpoint.method.toUpperCase() &&
                      selectedEndpoint.path === endpoint.path;
                    return (
                      <li
                        key={`${endpoint.method}-${endpoint.path}`}
                        className={`endpoint-item ${isActive ? 'active' : ''}`}
                        onClick={() =>
                          handleSelectEndpoint({
                            method: endpoint.method,
                            path: endpoint.path,
                          })
                        }
                      >
                        <span className={`method-badge method-${endpoint.method.toLowerCase()}`}>
                          {endpoint.method.toUpperCase()}
                        </span>
                        <div className="endpoint-item-body">
                          <div className="endpoint-item-path">{endpoint.path}</div>
                          <div className="endpoint-item-summary">{endpoint.summary}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="sidebar-empty">未找到匹配的端点</div>
            )}
          </div>
        </aside>

        <main className="app-main">
          {selectedView === 'overview' && (
            <EndpointOverview groups={groups} onSelectEndpoint={handleSelectEndpoint} />
          )}

          {selectedView === 'endpoint' && currentEndpoint && (
            <ApiTester
              key={`${currentEndpoint.method}-${currentEndpoint.path}`}
              method={currentEndpoint.method}
              path={currentEndpoint.path}
              operation={currentEndpoint}
              spec={apiSpec}
              baseUrl={selectedServer}
              authToken={authToken}
            />
          )}

          {selectedView === 'endpoint' && !currentEndpoint && (
            <div className="app-placeholder">
              <div className="app-placeholder-icon">👈</div>
              <p>请从左侧选择一个端点进行调试</p>
            </div>
          )}

          {selectedView === 'docs' && apiSpec && (
            <div className="api-reference-container">
              <ApiReferenceReact
                configuration={{
                  spec: {
                    content: apiSpec,
                  },
                  server: selectedServer,
                  authentication: {
                    type: 'bearer',
                    token: authToken,
                  },
                  tags: {
                    sort: 'alpha',
                  },
                  darkMode: false,
                  customTheme: {
                    colors: {
                      primary: '#6B7BFF',
                      secondary: '#A78BFA',
                      accent: '#F4A261',
                    },
                  },
                  onRequest: (request: any) => {
                    request.headers = {
                      ...request.headers,
                      Authorization: `Bearer ${authToken}`,
                    };
                    return request;
                  },
                } as any}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
