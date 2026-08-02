import { useEffect, useState } from 'react';
import { useParentStore } from '../../store/parentStore';
import { Header } from '../../components/common/Header';
import { Button, Modal, useToast } from '../../components/ui';
import {
  Siren,
  Phone,
  Hospital,
  Users as UsersIcon,
  LifeBuoy,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
} from 'lucide-react';
import type { EmergencyResource } from '../../types';

const resourceTypeMeta: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  hotline: { label: '心理热线', icon: Phone, color: 'bg-red-100 text-red-600' },
  hospital: { label: '医疗机构', icon: Hospital, color: 'bg-orange-100 text-orange-600' },
  community: { label: '社区支持', icon: UsersIcon, color: 'bg-amber-100 text-amber-600' },
};

const getAlertColor = (level: string) => {
  switch (level) {
    case 'red':
      return 'border-red-300 bg-red-50';
    case 'orange':
      return 'border-orange-300 bg-orange-50';
    case 'yellow':
      return 'border-yellow-300 bg-yellow-50';
    default:
      return 'border-green-300 bg-green-50';
  }
};

const getAlertBadge = (level: string) => {
  switch (level) {
    case 'red':
      return 'bg-red-500 text-white';
    case 'orange':
      return 'bg-orange-500 text-white';
    case 'yellow':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-green-500 text-white';
  }
};

const getAlertLabel = (level: string) => {
  switch (level) {
    case 'red':
      return '高风险';
    case 'orange':
      return '中风险';
    case 'yellow':
      return '低风险';
    default:
      return '正常';
  }
};

type FilterType = 'all' | 'hotline' | 'hospital' | 'community';

export default function ParentEmergency() {
  const {
    emergencyAlerts,
    emergencyResources,
    isLoading,
    error,
    isUsingMockData,
    fetchAlerts,
    confirmAlert,
    fetchResources,
  } = useParentStore();

  const toast = useToast();
  const [filter, setFilter] = useState<FilterType>('all');
  const [confirmingAlertId, setConfirmingAlertId] = useState<string | null>(null);
  const [redAlertDismissed, setRedAlertDismissed] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchResources();
  }, [fetchAlerts, fetchResources]);

  const handleConfirm = async (alertId: string) => {
    if (confirmingAlertId !== alertId) {
      setConfirmingAlertId(alertId);
      return;
    }
    setConfirmingAlertId(null);
    await confirmAlert(alertId);
    toast.success('已确认告警');
  };

  const handleFilterChange = (type: FilterType) => {
    setFilter(type);
    fetchResources(type === 'all' ? undefined : type);
  };

  const filteredResources: EmergencyResource[] =
    filter === 'all' ? emergencyResources : emergencyResources.filter((r) => r.type === filter);

  const activeAlerts = emergencyAlerts.filter((a) => !a.confirmed);
  const confirmedAlerts = emergencyAlerts.filter((a) => a.confirmed);
  const hasUnconfirmedRed = activeAlerts.some(a => a.level === 'red');

  // 当无未确认红色告警时重置「稍后处理」状态，以便后续新告警可再次弹出
  useEffect(() => {
    if (!hasUnconfirmedRed) {
      setRedAlertDismissed(false);
    }
  }, [hasUnconfirmedRed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Modal
        isOpen={hasUnconfirmedRed && !redAlertDismissed}
        onClose={() => setRedAlertDismissed(true)}
        title="紧急告警"
        size="lg"
      >
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <p className="text-sm">检测到高风险信号，请立即确认处理</p>
        </div>
        {activeAlerts.filter(a => a.level === 'red').map(alert => (
          <div key={alert.alertId} className="mb-4">
            <p className="text-gray-700 text-sm mb-3">{alert.reason}</p>
            <div className="bg-red-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-red-700 mb-2">建议行动：</p>
              <ul className="text-xs text-red-600 space-y-1">
                <li>1. 确保孩子当前安全，不要离开孩子</li>
                <li>2. 拨打危机热线：12355 / 400-161-9995</li>
                <li>3. 前往最近医院急诊或心理卫生中心</li>
                <li>4. 联系学校心理老师或班主任</li>
              </ul>
            </div>
            <div className="flex gap-2 mb-3">
              <a href="tel:12355" className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium text-center hover:bg-red-600">
                拨打 12355
              </a>
              <a href="tel:400-161-9995" className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium text-center hover:bg-red-600">
                拨打希望热线
              </a>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRedAlertDismissed(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                稍后处理
              </button>
              <button
                onClick={() => handleConfirm(alert.alertId)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  confirmingAlertId === alert.alertId
                    ? 'bg-red-600 text-white'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {confirmingAlertId === alert.alertId ? '再次点击确认告警' : '确认已处理'}
              </button>
            </div>
          </div>
        ))}
      </Modal>
      <Header role="parent" />

      <main id="main" className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-accent-600 to-accent-400 rounded-3xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Siren className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">应急中心</h1>
              <p className="text-orange-100 text-sm mt-1">紧急告警处理 · 应急资源查询</p>
            </div>
          </div>
          {isUsingMockData && (
            <p className="text-orange-200 text-xs mt-3">（后端未连接，展示示例数据）</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
            {error}
          </div>
        )}

        {/* 紧急告警列表 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            紧急告警
            {activeAlerts.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                {activeAlerts.length} 条待处理
              </span>
            )}
          </h2>

          {isLoading && emergencyAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center text-gray-400">
              加载中...
            </div>
          ) : emergencyAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无告警记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className={`rounded-2xl p-5 shadow-lg border-2 ${getAlertColor(alert.level)}`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAlertBadge(alert.level)}`}>
                          {getAlertLabel(alert.level)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{alert.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">孩子ID：{alert.studentId}</p>
                      {alert.level === 'red' || alert.level === 'orange' ? (
                        <div className="mt-3 p-3 bg-white/60 rounded-xl">
                          <p className="text-xs font-medium text-gray-600 mb-1">建议行动：</p>
                          <ul className="text-xs text-gray-500 space-y-0.5">
                            {alert.level === 'red' && <li>确保孩子安全，拨打 12355 危机热线</li>}
                            <li>联系学校心理老师或班主任</li>
                            <li>关注孩子情绪变化，72小时内跟进</li>
                          </ul>
                        </div>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(alert.alertId)}
                      className={confirmingAlertId === alert.alertId
                        ? "bg-red-600"
                        : "bg-gradient-to-r from-accent-400 to-accent-600"}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {confirmingAlertId === alert.alertId ? '再次点击确认' : '确认告警'}
                    </Button>
                  </div>
                </div>
              ))}

              {confirmedAlerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="rounded-2xl p-5 shadow-sm border border-gray-200 bg-gray-50 opacity-75"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-600">
                      {getAlertLabel(alert.level)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      已确认
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{alert.reason}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 应急资源 */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-orange-500" />
            应急资源
          </h2>

          {/* 类型筛选 */}
          <div className="flex gap-2 mb-4 flex-wrap" role="tablist" aria-label="资源类型筛选">
            {(['all', 'hotline', 'hospital', 'community'] as FilterType[]).map((t) => {
              const meta = t === 'all' ? null : resourceTypeMeta[t];
              const label = t === 'all' ? '全部' : meta?.label || t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={filter === t}
                  onClick={() => handleFilterChange(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-fast ${
                    filter === t
                      ? 'bg-gradient-to-r from-accent-400 to-accent-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-orange-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {filteredResources.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无该类型资源</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredResources.map((resource, idx) => {
                const meta = resourceTypeMeta[resource.type] || {
                  label: resource.type,
                  icon: LifeBuoy,
                  color: 'bg-gray-100 text-gray-600',
                };
                const Icon = meta.icon;
                // lat/lng 字段由其他子代理同步添加到 EmergencyResource 类型，此处用类型扩展兼容
                const coords = resource as EmergencyResource & { lat?: number; lng?: number };
                const navHref =
                  coords.lat != null && coords.lng != null
                    ? `https://uri.amap.com/marker?position=${coords.lng},${coords.lat}&name=${encodeURIComponent(resource.title)}`
                    : `https://uri.amap.com/search?keyword=${encodeURIComponent(resource.title)}`;
                return (
                  <div key={resource.id || idx} className="bg-white rounded-2xl p-5 shadow-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800">{resource.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{meta.label}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{resource.content}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {resource.contact}
                      </span>
                      <a
                        href={`tel:${resource.phone}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {resource.phone}
                      </a>
                      {resource.type === 'hospital' && (
                        <a
                          href={navHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          导航
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
