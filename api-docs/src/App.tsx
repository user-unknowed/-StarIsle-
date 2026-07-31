import { useState, useEffect } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import ApiTester from './components/ApiTester';
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
  const [showTester, setShowTester] = useState(false);
  const [testerConfig, setTesterConfig] = useState<{
    method: string;
    path: string;
    spec: OpenAPIDocument | null;
  } | null>(null);

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

  const handleTestEndpoint = (method: string, path: string, spec: OpenAPIDocument | null) => {
    setTesterConfig({ method, path, spec });
    setShowTester(true);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div className="loading" style={{ width: '32px', height: '32px', borderWidth: '3px', borderColor: '#6B7BFF', borderTopColor: 'transparent' }}></div>
          <p style={{ marginLeft: '16px', color: '#64748b' }}>正在加载API文档...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444' }}>加载失败</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
          <button onClick={loadApiSpec} style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #6B7BFF, #A78BFA)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>重新加载</button>
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
            <div className="subtitle">心理健康管理系统 API接口文档</div>
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
        </div>
      </header>
      <div className="app-body">
        <main className="app-main">
          {apiSpec && (
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
                  onRequest: (request) => {
                    request.headers = {
                      ...request.headers,
                      'Authorization': `Bearer ${authToken}`,
                    };
                    return request;
                  },
                }}
              />
            </div>
          )}
        </main>
      </div>
      {showTester && testerConfig && (
        <ApiTester
          method={testerConfig.method}
          path={testerConfig.path}
          spec={testerConfig.spec}
          baseUrl={selectedServer}
          authToken={authToken}
          onClose={() => setShowTester(false)}
        />
      )}
    </div>
  );
}

export default App;
