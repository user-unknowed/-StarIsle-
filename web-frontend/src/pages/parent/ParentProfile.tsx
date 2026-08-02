import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentStore } from '../../store/parentStore';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/common/Header';
import { useToast } from '../../components/ui';
import {
  User,
  Settings,
  Bell,
  LogOut,
  Mail,
  Phone,
  Globe,
  Shield,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react';

const settingsItems = [
  { icon: Bell, label: '告警通知', description: '接收孩子紧急告警推送', defaultOn: true },
  { icon: Mail, label: '邮箱通知', description: '每周接收孩子状态报告' },
  { icon: Shield, label: '隐私设置', description: '管理数据访问与授权' },
  { icon: Globe, label: '语言设置', description: '简体中文' },
];

export default function ParentProfile() {
  const navigate = useNavigate();
  const { parentProfile, children, emergencyAlerts, isLoading, error, isUsingMockData, fetchProfile, fetchChildren, fetchAlerts } = useParentStore();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(parentProfile?.nickname || user?.nickname || '');
  const [editedSignature, setEditedSignature] = useState(user?.signature || '');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    告警通知: true,
    邮箱通知: false,
  });

  useEffect(() => {
    fetchProfile();
    fetchChildren();
    fetchAlerts();
  }, [fetchProfile, fetchChildren, fetchAlerts]);

  useEffect(() => {
    if (parentProfile) setEditedNickname(parentProfile.nickname);
  }, [parentProfile]);

  const handleSave = async () => {
    await updateProfile({ nickname: editedNickname, signature: editedSignature });
    toast.success('资料已更新');
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleItem = (label: string, currentOn: boolean) => {
    const newValue = !currentOn;
    setToggles((prev) => ({ ...prev, [label]: newValue }));
    toast.info(newValue ? '已开启通知' : '已关闭通知');
  };

  const displayName = parentProfile?.nickname || user?.nickname || '家长';
  const phone = parentProfile?.phone || '未绑定';
  const createdAt = parentProfile?.createdAt || user?.createdAt;

  // 真实统计：绑定孩子数、待处理告警数、关注天数
  const childCount = children.length;
  const pendingAlertCount = emergencyAlerts.filter((a) => !a.confirmed).length;
  const followDays = createdAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    : '--';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />

      <main id="main" className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        {/* 个人信息卡片 */}
        <div className="bg-gradient-to-r from-accent-400 to-accent-600 rounded-3xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedNickname}
                    onChange={(e) => setEditedNickname(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 w-full max-w-xs"
                    placeholder="昵称"
                    aria-label="编辑昵称"
                  />
                  <input
                    type="text"
                    value={editedSignature}
                    onChange={(e) => setEditedSignature(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 w-full max-w-xs"
                    placeholder="个性签名"
                    aria-label="编辑个性签名"
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <p className="text-orange-100 mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {phone}
                  </p>
                  {user?.signature && (
                    <p className="text-orange-100 text-sm mt-1">{user.signature}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">家长</span>
                {createdAt && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    注册于 {new Date(createdAt).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              aria-label={isEditing ? '保存' : '编辑'}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
          </div>
          {isUsingMockData && (
            <p className="text-orange-200 text-xs mt-3">（后端未连接，展示示例数据）</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isLoading && !parentProfile && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center text-gray-400 mb-6">
            加载中...
          </div>
        )}

        {/* 绑定概览 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              {childCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">绑定孩子</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              {pendingAlertCount}
            </p>
            <p className="text-sm text-gray-500 mt-1">待处理告警</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              {followDays}
            </p>
            <p className="text-sm text-gray-500 mt-1">关注天数</p>
          </div>
        </div>

        {/* 通知与隐私设置 */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500" />
            通知与隐私
          </h3>
          <div className="space-y-3">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isToggle = item.label === '告警通知' || item.label === '邮箱通知';
              const isOn = toggles[item.label] ?? item.defaultOn ?? false;
              return (
                <div
                  key={item.label}
                  role={isToggle ? undefined : 'button'}
                  tabIndex={isToggle ? undefined : 0}
                  onClick={isToggle ? undefined : () => toast.info('功能开发中，敬请期待')}
                  onKeyDown={isToggle ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toast.info('功能开发中，敬请期待'); } }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${isToggle ? 'hover:bg-orange-50' : 'hover:bg-orange-50 cursor-pointer'}`}
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  {isToggle ? (
                    <button
                      role="switch"
                      aria-checked={isOn}
                      aria-label={item.label}
                      onClick={() => toggleItem(item.label, isOn)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        isOn ? 'bg-accent-400' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-fast ${
                          isOn ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <span className="text-gray-400">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleLogout}
          aria-label="退出登录"
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </main>
    </div>
  );
}
