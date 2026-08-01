import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useParentStore } from '../../store/parentStore';
import { Heart, MessageCircle, User, Settings, BookOpen, Shield, Bell, LogOut, ChevronRight, Edit3, QrCode, X, Check, Sun, Moon } from 'lucide-react';

export default function ParentProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { 
    children, 
    knowledgeArticles, 
    notificationSettings, 
    fetchChildren, 
    fetchKnowledgeArticles, 
    fetchNotificationSettings,
    updateNotificationSettings 
  } = useParentStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(user?.nickname || '');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchChildren(user.id);
    }
    fetchKnowledgeArticles();
    fetchNotificationSettings();
  }, [user?.id, fetchChildren, fetchKnowledgeArticles, fetchNotificationSettings]);

  const handleSaveProfile = () => {
    setIsEditing(false);
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    if (key === 'emergencyAlert') return;
    updateNotificationSettings({
      ...notificationSettings,
      [key]: !notificationSettings[key],
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRiskColor = (level: string | undefined) => {
    switch (level) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-gray-800 text-lg">我的</h1>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Settings className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl">
              {user?.nickname?.[0] || 'P'}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={handleSaveProfile} className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-800 text-lg">{user?.nickname}</h2>
                  <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-gray-100 rounded">
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500">{user?.phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">我的孩子</h2>
            <button className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
              <QrCode className="w-4 h-4" />
              绑定新孩子
            </button>
          </div>
          
          {children.length > 0 ? (
            <div className="space-y-3">
              {children.map((child) => (
                <div key={child.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white">
                    {child.studentNickname?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{child.studentNickname}</span>
                      <div className={`w-2 h-2 rounded-full ${getRiskColor(child.riskLevel)}`}></div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{child.authorized ? '已授权' : '未授权'}</span>
                      <span>绑定于 {new Date(child.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="text-red-500 text-sm font-medium hover:text-red-700">
                    解除绑定
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">还没有绑定孩子</p>
              <button className="mt-3 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-sm font-medium">
                扫码绑定
              </button>
            </div>
          )}
        </div>

        <div id="knowledge" className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              知识库
            </h2>
            <button className="text-indigo-600 text-sm font-medium">查看全部</button>
          </div>
          
          <div className="space-y-3">
            {knowledgeArticles.map((article) => (
              <div 
                key={article.id}
                onClick={() => setSelectedArticle(article.id)}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                        {article.category}
                      </span>
                      <span className="text-xs text-gray-400">{article.readTime}分钟阅读</span>
                    </div>
                    <h3 className="font-medium text-gray-800">{article.title}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            通知设置
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">情绪异常提醒</p>
                <p className="text-xs text-gray-500">当孩子情绪出现异常时提醒</p>
              </div>
              <button 
                onClick={() => handleToggleNotification('moodAlert')}
                className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.moodAlert ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${notificationSettings.moodAlert ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">打卡提醒</p>
                <p className="text-xs text-gray-500">孩子未打卡超过{notificationSettings.checkinThreshold}天时提醒</p>
              </div>
              <button 
                onClick={() => handleToggleNotification('checkinReminder')}
                className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.checkinReminder ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${notificationSettings.checkinReminder ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">知识库更新通知</p>
                <p className="text-xs text-gray-500">当有新的知识文章时通知</p>
              </div>
              <button 
                onClick={() => handleToggleNotification('knowledgeUpdate')}
                className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.knowledgeUpdate ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${notificationSettings.knowledgeUpdate ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">应急预案通知</p>
                <p className="text-xs text-gray-500 text-red-500">安全保护，强制开启</p>
              </div>
              <button disabled className="w-12 h-6 rounded-full bg-indigo-600 opacity-50 cursor-not-allowed">
                <div className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-6"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            隐私与安全
          </h2>
          
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-gray-700">数据收集清单</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-700">数据导出</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700">数据访问记录</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-red-600">账号注销</span>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                {isDarkMode ? (
                  <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5 text-gray-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Sun className="w-5 h-5 text-yellow-600" />
                  </div>
                )}
                <span className="text-gray-700">{isDarkMode ? '深色模式' : '浅色模式'}</span>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </button>
            
            <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-gray-700">关于星屿</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/parent')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => navigate('/parent/chat')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">聊一聊</span>
          </button>
          <button 
            onClick={() => navigate('/parent/profile')}
            className="flex flex-col items-center gap-1 p-2 text-indigo-600"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </nav>

      <div className="h-20"></div>

      {selectedArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setSelectedArticle(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6 text-gray-600" />
              </button>
              <span className="text-sm text-gray-500">文章详情</span>
              <div className="w-10"></div>
            </div>
            
            {(() => {
              const article = knowledgeArticles.find(a => a.id === selectedArticle);
              if (!article) return null;
              return (
                <>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                    {article.category}
                  </span>
                  <h2 className="font-bold text-xl text-gray-800 mt-4 mb-2">{article.title}</h2>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                    <span>{article.readTime}分钟阅读</span>
                  </div>
                  <div className="prose prose-sm text-gray-600 leading-relaxed">
                    {article.content}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}