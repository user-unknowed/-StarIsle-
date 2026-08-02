import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Music, User, LogOut, Menu, X, Bell, Star, Users, Siren } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToast, ToastContainer } from '../ui/Toast';
import { AI_CHAT_ENABLED } from '../../config/features';

interface HeaderProps {
  role: 'student' | 'teacher' | 'parent';
}

interface NavItem {
  path: string;
  icon: typeof Home;
  label: string;
  disabled?: boolean;
}

const studentNavItems: NavItem[] = [
  { path: '/student', icon: Home, label: '今日心情' },
  { path: '/student/chat', icon: MessageCircle, label: '聊一聊', disabled: !AI_CHAT_ENABLED },
  { path: '/student/relax', icon: Music, label: '放松一下' },
  { path: '/student/profile', icon: User, label: '我的' },
];

const teacherNavItems: NavItem[] = [
  { path: '/teacher', icon: Home, label: '班级状态' },
  { path: '/teacher/chat', icon: MessageCircle, label: '想聊聊天', disabled: !AI_CHAT_ENABLED },
  { path: '/teacher/relax', icon: Music, label: '放松一下' },
  { path: '/teacher/profile', icon: User, label: '我的' },
];

const parentNavItems: NavItem[] = [
  { path: '/parent', icon: Home, label: '孩子状态' },
  { path: '/parent/chat', icon: MessageCircle, label: 'AI顾问', disabled: !AI_CHAT_ENABLED },
  { path: '/parent/children', icon: Users, label: '我的孩子' },
  { path: '/parent/emergency', icon: Siren, label: '应急中心' },
  { path: '/parent/profile', icon: User, label: '我的' },
];

// 家长端暖色点缀：#F4A261 → #E76F51
const accentByRole = {
  student: {
    logo: 'from-primary-500 to-secondary-600',
    text: 'from-primary-600 to-secondary-600',
    active: 'bg-gradient-to-r from-primary-500 to-secondary-600',
    hover: 'hover:bg-primary-50 hover:text-primary-600',
    bellHover: 'hover:bg-primary-50',
  },
  teacher: {
    logo: 'from-primary-500 to-secondary-600',
    text: 'from-primary-600 to-secondary-600',
    active: 'bg-gradient-to-r from-primary-500 to-secondary-600',
    hover: 'hover:bg-primary-50 hover:text-primary-600',
    bellHover: 'hover:bg-primary-50',
  },
  parent: {
    logo: 'from-[#F4A261] to-[#E76F51]',
    text: 'from-[#F4A261] to-[#E76F51]',
    active: 'bg-gradient-to-r from-[#F4A261] to-[#E76F51]',
    hover: 'hover:bg-orange-50 hover:text-orange-600',
    bellHover: 'hover:bg-orange-50',
  },
} as const;

export function Header({ role }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toast = useToast();

  const navItems = role === 'student' ? studentNavItems : role === 'teacher' ? teacherNavItems : parentNavItems;
  const accent = accentByRole[role];
  const homePath = role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/parent';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (item: NavItem) => {
    if (item.disabled) {
      toast.info('AI 对话功能暂未开放，敬请期待');
      return;
    }
    navigate(item.path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(homePath)}>
            <div className={`w-10 h-10 bg-gradient-to-br ${accent.logo} rounded-xl flex items-center justify-center shadow-lg`}>
              <Star className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r ${accent.text} bg-clip-text text-transparent`}>
              星屿
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isDisabled = !!item.disabled;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-fast ${
                    isDisabled
                      ? 'text-gray-400 opacity-60 cursor-not-allowed'
                      : isActive
                        ? `${accent.active} text-white shadow-md`
                        : `text-gray-600 ${accent.hover}`
                  }`}
                  aria-disabled={isDisabled}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isDisabled && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 text-gray-500 leading-none">
                      即将上线
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button className={`relative p-2 rounded-full transition-colors touch-target ${accent.bellHover}`}>
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-danger-500 hover:bg-danger-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">退出</span>
            </button>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 touch-target"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isDisabled = !!item.disabled;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-fast ${
                    isDisabled
                      ? 'text-gray-400 opacity-60 cursor-not-allowed'
                      : isActive
                        ? `${accent.active} text-white`
                        : `text-gray-600 ${accent.hover}`
                  }`}
                  aria-disabled={isDisabled}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isDisabled && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 text-gray-500 leading-none">
                      即将上线
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ToastContainer toasts={toast.toasts} />
    </header>
  );
}
