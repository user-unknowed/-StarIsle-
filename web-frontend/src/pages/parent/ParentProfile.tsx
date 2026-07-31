import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentStore } from '../../store/parentStore';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/common/Header';
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
  const { parentProfile, isLoading, error, isUsingMockData, fetchProfile } = useParentStore();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(parentProfile?.nickname || user?.nickname || '');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    告警通知: true,
    邮箱通知: false,
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (parentProfile) setEditedNickname(parentProfile.nickname);
  }, [parentProfile]);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleItem = (label: string) => {
    setToggles((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const displayName = parentProfile?.nickname || user?.nickname || '家长';
  const phone = parentProfile?.phone || '未绑定';
  const createdAt = parentProfile?.createdAt || user?.createdAt;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />

      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        {/* 个人信息卡片 */}
        <div className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] rounded-3xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editedNickname}
                  onChange={(e) => setEditedNickname(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 w-full max-w-xs"
                  placeholder="昵称"
                />
              ) : (
                <div>
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <p className="text-orange-100 mt-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {phone}
                  </p>
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
            <p className="text-3xl font-bold bg-gradient-to-r from-[#F4A261] to-[#E76F51] bg-clip-text text-transparent">
              {user?.nickname ? '1' : '0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">绑定孩子</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-[#F4A261] to-[#E76F51] bg-clip-text text-transparent">
              0
            </p>
            <p className="text-sm text-gray-500 mt-1">待处理告警</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-[#F4A261] to-[#E76F51] bg-clip-text text-transparent">
              7
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
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-orange-50 transition-colors"
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
                      onClick={() => toggleItem(item.label)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        isOn ? 'bg-[#F4A261]' : 'bg-gray-300'
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
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </main>
    </div>
  );
}
