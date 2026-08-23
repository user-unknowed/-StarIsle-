import { useState } from 'react';
import { useAuthStore, LoginMethod } from '../store/authStore';
import { Star, User, Lock, Eye, EyeOff, ArrowRight, MessageCircle, Phone, Apple } from 'lucide-react';
import { Button, Input, Modal } from '../components/ui';
import { useToast } from '../components/ui/Toast';

export default function Login() {
  const { login, register, loginWithThirdParty, loginWithPhone, isLoading, error, clearError } = useAuthStore();
  const toast = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [codeCountdown, setCodeCountdown] = useState(0);

  // 表单实时校验
  const validateUsername = (val: string) => {
    if (!val.trim()) return '请输入用户名';
    if (val.trim().length < 2) return '用户名至少 2 个字符';
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return '请输入密码';
    if (val.length < 6) return '密码至少 6 位';
    return '';
  };

  // 密码强度：弱/中/强
  const getPasswordStrength = (val: string): { label: string; color: string } | null => {
    if (!val || val.length < 6) return null;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    if (score <= 1) return { label: '弱', color: 'text-red-500 bg-red-100' };
    if (score <= 2) return { label: '中', color: 'text-yellow-600 bg-yellow-100' };
    return { label: '强', color: 'text-green-600 bg-green-100' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // 提交前校验
    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    setUsernameError(uErr);
    setPasswordError(pErr);
    if (uErr || pErr) return;

    if (isLogin) {
      await login({ username, password, role });
    } else {
      await register({ nickname: username, password, role });
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      if (role === 'student') {
        await login({ username: 'student1', password: '123456', role: 'student' });
      } else if (role === 'teacher') {
        await login({ username: 'teacher1', password: '123456', role: 'teacher' });
      } else {
        await login({ username: 'parent1', password: '123456', role: 'parent' });
      }
      toast.success('欢迎体验 StarIsle 星屿心理健康平台');
    } catch {
      toast.error('体验入口暂时不可用，请稍后重试');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleThirdPartyLogin = async (method: LoginMethod) => {
    const mockUserInfo = {
      provider: method,
      openId: `openid-${method}-${Date.now()}`,
      nickname: `${method === 'wechat' ? '微信' : method === 'qq' ? 'QQ' : 'Apple'}用户`,
      avatar: '',
    };
    await loginWithThirdParty(method, mockUserInfo);
  };

  const handleSendCode = () => {
    if (phoneNumber.length === 11) {
      setCodeCountdown(60);
      const timer = setInterval(() => {
        setCodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handlePhoneLogin = async () => {
    if (phoneNumber.length === 11 && smsCode.length === 6) {
      await loginWithPhone(phoneNumber, smsCode);
      setShowPhoneModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              星屿心理健康管理系统
            </h1>
            <p className="text-gray-400 mt-1 text-xs tracking-wider">StarIsleONweb</p>
            <p className="text-gray-500 mt-2">守护心灵，伴你成长</p>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-6" role="tablist" aria-label="选择登录角色">
            <button
              role="tab"
              aria-selected={role === 'student'}
              onClick={() => setRole('student')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all duration-fast text-sm ${
                role === 'student'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              学生登录
            </button>
            <button
              role="tab"
              aria-selected={role === 'teacher'}
              onClick={() => setRole('teacher')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all duration-fast text-sm ${
                role === 'teacher'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              教师登录
            </button>
            <button
              role="tab"
              aria-selected={role === 'parent'}
              onClick={() => setRole('parent')}
              className={`flex-1 py-2 rounded-lg font-medium transition-all duration-fast text-sm ${
                role === 'parent'
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              家长登录
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <Input
                  label="昵称"
                  icon={<User className="w-5 h-5" />}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(validateUsername(e.target.value));
                  }}
                  placeholder="请输入昵称"
                  required
                />
                {usernameError && (
                  <p className="mt-1 ml-1 text-xs text-danger-600">{usernameError}</p>
                )}
              </div>
            )}

            {isLogin && (
              <div>
                <Input
                  label="用户名"
                  icon={<User className="w-5 h-5" />}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(validateUsername(e.target.value));
                  }}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  required
                />
                {usernameError && (
                  <p className="mt-1 ml-1 text-xs text-danger-600">{usernameError}</p>
                )}
              </div>
            )}

            <div>
              <Input
                label="密码"
                icon={<Lock className="w-5 h-5" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(validatePassword(e.target.value));
                }}
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
              {passwordError ? (
                <p className="mt-1 ml-1 text-xs text-danger-600">{passwordError}</p>
              ) : (
                !isLogin && password && getPasswordStrength(password) && (
                  <div className="mt-1 ml-1 flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">密码强度：</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getPasswordStrength(password)!.color}`}>
                      {getPasswordStrength(password)!.label}
                    </span>
                  </div>
                )
              )}
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  {isLogin ? '登录' : '注册'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full py-3 mt-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {demoLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在进入...
              </>
            ) : (
              <>
                试用体验（{role === 'student' ? '学生' : role === 'teacher' ? '教师' : '家长'}）
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">其他登录方式</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleThirdPartyLogin('wechat')}
              className="flex flex-col items-center gap-1.5 p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">微信</span>
            </button>
            <button
              onClick={() => handleThirdPartyLogin('qq')}
              className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg font-bold">QQ</span>
              <span className="text-xs font-medium">QQ登录</span>
            </button>
            <button
              onClick={() => handleThirdPartyLogin('apple')}
              className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Apple className="w-6 h-6" />
              <span className="text-xs font-medium">Apple</span>
            </button>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex flex-col items-center gap-1.5 p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <Phone className="w-6 h-6" />
              <span className="text-xs font-medium">手机号</span>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-6">
          星屿心理健康管理系统 © 2026
        </p>
      </div>

      <Modal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title="手机号登录"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Input
              label="手机号"
              icon={<Phone className="w-5 h-5" />}
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                setPhoneNumber(val);
                setPhoneError(val.length === 11 && !/^1[3-9]\d{9}$/.test(val) ? '请输入正确的手机号' : '');
              }}
              placeholder="请输入手机号"
            />
            {phoneError && (
              <p className="mt-1 ml-1 text-xs text-danger-600">{phoneError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Input
              label="验证码"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入验证码"
              className="flex-1"
            />
            <button
              onClick={handleSendCode}
              disabled={codeCountdown > 0 || phoneNumber.length !== 11}
              className="self-end px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
            </button>
          </div>
          <Button
            onClick={handlePhoneLogin}
            disabled={phoneNumber.length !== 11 || smsCode.length !== 6}
            className="w-full mt-4"
          >
            登录
          </Button>
        </div>
      </Modal>
    </div>
  );
}