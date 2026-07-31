import type { ApiEndpointGroup, SelectedEndpoint } from '../types';

interface EndpointOverviewProps {
  groups: ApiEndpointGroup[];
  onSelectEndpoint: (endpoint: SelectedEndpoint) => void;
}

/**
 * 总览视图：八张卡片网格，每张卡片显示组名、端点数、tag 描述，
 * 点击跳转到该组第一个端点。
 */
function EndpointOverview({ groups, onSelectEndpoint }: EndpointOverviewProps) {
  const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);

  return (
    <div className="endpoint-overview">
      <div className="overview-header">
        <h2 className="overview-title">三端 API 总览</h2>
        <p className="overview-subtitle">
          共 {groups.length} 个分组，{totalEndpoints} 个端点
        </p>
      </div>
      <div className="overview-grid">
        {groups.map((group) => {
          const count = group.endpoints.length;
          const firstEndpoint = group.endpoints[0];
          return (
            <div
              key={group.groupName}
              className={`overview-card ${count === 0 ? 'overview-card-empty' : ''}`}
              onClick={() => {
                if (firstEndpoint) {
                  onSelectEndpoint({
                    method: firstEndpoint.method,
                    path: firstEndpoint.path,
                  });
                }
              }}
            >
              <div className="overview-card-icon">{getGroupIcon(group.groupName)}</div>
              <div className="overview-card-body">
                <div className="overview-card-name">{group.groupName}</div>
                <div className="overview-card-count">{count} 个端点</div>
                {group.groupDescription && (
                  <div className="overview-card-desc">{group.groupDescription}</div>
                )}
              </div>
              {count > 0 && <div className="overview-card-arrow">›</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGroupIcon(name: string): string {
  switch (name) {
    case '学生端':
      return '🎓';
    case '教师端':
      return '📚';
    case '家长端':
      return '👨‍👩‍👧';
    case '认证管理':
      return '🔐';
    case '用户管理':
      return '👤';
    case '数据迁移':
      return '🔄';
    case '密钥管理':
      return '🔑';
    case '系统':
      return '⚙️';
    default:
      return '📦';
  }
}

export default EndpointOverview;
