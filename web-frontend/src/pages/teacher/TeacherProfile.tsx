import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/common/Header';
import { User, Settings, Bell, BookOpen, Calendar, Edit3, Check, LogOut, Mail, Phone, Globe, Shield, Users, Download, Upload } from 'lucide-react';

const menuItems = [
  { icon: Bell, label: '通知中心', badge: 2 },
  { icon: BookOpen, label: '数据报告' },
  { icon: Calendar, label: '打卡统计' },
  { icon: Settings, label: '系统设置' },
];

const settingsItems = [
  { icon: Bell, label: '消息通知', description: '接收系统通知和提醒' },
  { icon: Mail, label: '邮箱设置', description: '配置邮箱通知' },
  { icon: Globe, label: '语言设置', description: '简体中文' },
  { icon: Phone, label: '隐私设置', description: '管理数据隐私和权限' },
];

const permissionItems = [
  { name: '班级管理', description: '管理班级信息和学生名单', enabled: true },
  { name: '学生数据查看', description: '查看学生心情数据和风险评估', enabled: true },
  { name: '数据导入导出', description: '导入导出学生数据和报告', enabled: true },
  { name: '风险预警管理', description: '管理风险预警和关注名单', enabled: true },
  { name: '专业咨询', description: '使用专业心理咨询助手', enabled: true },
];

export default function TeacherProfile() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(user?.nickname || '');
  const [editedSignature, setEditedSignature] = useState(user?.signature || '');

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="teacher" />
      
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={editedNickname}
                    onChange={(e) => setEditedNickname(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 mb-2 w-full"
                    placeholder="昵称"
                  />
                  <textarea
                    value={editedSignature}
                    onChange={(e) => setEditedSignature(e.target.value)}
                    className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 w-full"
                    placeholder="个性签名"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold">{user?.nickname}</h2>
                  <p className="text-indigo-200 mt-1">{user?.signature || '暂无个性签名'}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">教师</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  专业权限
                </span>
              </div>
            </div>
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">3</p>
            <p className="text-sm text-gray-500 mt-1">管理班级</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">128</p>
            <p className="text-sm text-gray-500 mt-1">学生总数</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">156</p>
            <p className="text-sm text-gray-500 mt-1">咨询次数</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">快捷菜单</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="flex flex-col items-center p-4 rounded-xl hover:bg-purple-50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            权限配置
          </h3>
          <div className="space-y-3">
            {permissionItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <button
                  className={`w-12 h-7 rounded-full transition-colors ${
                    item.enabled ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                      item.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  ></span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">数据管理</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left">
              <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">导入数据</p>
                <p className="text-sm text-gray-500">支持Excel或CSV格式文件导入</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-left">
              <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">导出报告</p>
                <p className="text-sm text-gray-500">导出班级数据和分析报告</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">设置</h3>
          <div className="space-y-3">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            logout();
          }}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </main>
    </div>
  );
}