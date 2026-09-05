/**
 * @file Login.tsx
 * @description 登录/注册页面，支持账号密码登录、注册、角色切换、快速体验、第三方（微信/QQ/Apple）登录与手机号验证码登录
 * @module web-frontend/pages
 */
import { useState } from 'react';
import { useAuthStore, LoginMethod } from '../store/authStore';
import { Star, User, Lock, Eye, EyeOff, ArrowRight, MessageCircle, Phone, Apple, Sparkles, ChevronLeft } from 'lucide-react';
import { Button, Input, Modal } from '../components/ui';

/**
 * 登录页组件
 * @returns JSX 元素
 */
export default function Login() {
  // 从鉴权 store 取出登录、注册、第三方登录、手机号登录等方法与状态
  const { login, register, loginWithThirdParty, loginWithPhone, isLoading, error, clearError } = useAuthStore();

  // 是否处于登录态（false 为注册态）
  const [isLogin, setIsLogin] = useState(true);
  // 当前选中的角色
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  // 用户名/昵称与密码
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // 是否明文显示密码
  const [showPassword, setShowPassword] = useState(false);
  // 是否显示手机号登录弹窗
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  // 手机号、短信验证码
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  // 验证码倒计时（秒），>0 时按钮禁用
  const [codeCountdown, setCodeCountdown] = useState(0);

  /**
   * 表单提交：登录态调用 login，注册态调用 register
   * @param e - 表单事件
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isLogin) {
      await login({ username, password, role });
    } else {
      await register({ nickname: username, password, role });
    }
  };

  /**
   * 快速体验：按当前角色使用预置演示账号登录
   */
  const handleDemoLogin = async () => {
    if (role === 'student') {
      await login({ username: 'student1', password: '123456', role: 'student' });
    } else if (role === 'teacher') {
      await login({ username: 'teacher1', password: '123456', role: 'teacher' });
    } else {
      await login({ username: 'parent1', password: '123456', role: 'parent' });
    }
  };

  /**
   * 第三方登录：构造模拟用户信息并交给 store 处理
   * @param method - 第三方登录方式
   */
  const handleThirdPartyLogin = async (method: LoginMethod) => {
    // 构造模拟的第三方用户信息（演示用）
    const mockUserInfo = {
      provider: method,
      openId: `openid-${method}-${Date.now()}`,
      nickname: `${method === 'wechat' ? '微信' : method === 'qq' ? 'QQ' : 'Apple'}用户`,
      avatar: '',
    };
    await loginWithThirdParty(method, mockUserInfo);
  };

  /**
   * 发送短信验证码：仅在 11 位手机号时启动 60 秒倒计时
   */
  const handleSendCode = () => {
    if (phoneNumber.length === 11) {
      setCodeCountdown(60);
      // 每秒递减，到 0 清除定时器
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

  /**
   * 手机号登录：手机号 11 位且验证码 6 位时调用登录并关闭弹窗
   */
  const handlePhoneLogin = async () => {
    if (phoneNumber.length === 11 && smsCode.length === 6) {
      await loginWithPhone(phoneNumber, smsCode);
      setShowPhoneModal(false);
    }
  };

  // 各角色文案与配色配置
  const roleConfig = {
    student: { label: '学生', accentText: 'text-primary-600', accentRing: 'ring-primary-500' },
    teacher: { label: '教师', accentText: 'text-primary-600', accentRing: 'ring-primary-500' },
    parent: { label: '家长', accentText: 'text-accent-500', accentRing: 'ring-accent-500' },
  } as const;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* 品牌渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600" />
      {/* 装饰光晕 */}
      <div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #A78BFA 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F4A261 0%, transparent 70%)' }}
      />
      {/* 星点装饰 */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
        backgroundImage: `radial-gradient(1px 1px at 15% 20%, white, transparent 50%),
          radial-gradient(1px 1px at 35% 45%, white, transparent 50%),
          radial-gradient(1.5px 1.5px at 55% 15%, white, transparent 50%),
          radial-gradient(1px 1px at 75% 30%, white, transparent 50%),
          radial-gradient(1px 1px at 85% 55%, white, transparent 50%),
          radial-gradient(1px 1px at 25% 70%, white, transparent 50%),
          radial-gradient(1.5px 1.5px at 65% 80%, white, transparent 50%)`,
      }} />

      <div className="relative w-full max-w-md z-10">
        {/* 返回宣传页 */}
        <a
          href="../"
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回宣传页
        </a>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* 品牌标识 */}
          <div className="text-center mb-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl shadow-lg flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-accent-400 to-accent-500 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              星屿 StarIsle
            </h1>
            <p className="text-gray-400 mt-1 text-xs tracking-[0.2em] uppercase">Emotion Planet</p>
            <p className="text-gray-500 mt-2 text-sm">你的情绪星球，永远亮着灯</p>
          </div>

          {/* 角色选择：学生/教师/家长，决定登录后进入哪一端 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6" role="tablist" aria-label="选择登录角色">
            {(['student', 'teacher', 'parent'] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={role === r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all duration-fast text-sm ${
                  role === r
                    ? r === 'parent'
                      ? 'bg-white text-accent-500 shadow-sm'
                      : 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {roleConfig[r].label}登录
              </button>
            ))}
          </div>

          {/* 登录/注册表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 注册态额外渲染昵称输入框 */}
            {!isLogin && (
              <Input
                label="昵称"
                icon={<User className="w-5 h-5" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入昵称"
                required
              />
            )}

            {/* 登录态渲染用户名输入框 */}
            {isLogin && (
              <Input
                label="用户名"
                icon={<User className="w-5 h-5" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                required
              />
            )}

            {/* 密码输入框，右侧带显隐切换按钮 */}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              required
            />

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
                {error}
              </div>
            )}

            {/* 提交按钮：加载态显示旋转图标 */}
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

          {/* 快速体验按钮：使用预置演示账号登录 */}
          <button
            onClick={handleDemoLogin}
            className="w-full py-3 mt-4 bg-gradient-to-r from-accent-50 to-accent-100 text-accent-600 font-semibold rounded-xl hover:from-accent-100 hover:to-accent-200 transition-all border border-accent-200"
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            快速体验·{roleConfig[role].label}模式
          </button>

          {/* 分隔线：其他登录方式 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">其他登录方式</span>
            </div>
          </div>

          {/* 第三方与手机号登录入口网格 */}
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleThirdPartyLogin('wechat')}
              aria-label="使用微信登录"
              className="flex flex-col items-center gap-1.5 p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">微信</span>
            </button>
            <button
              onClick={() => handleThirdPartyLogin('qq')}
              aria-label="使用 QQ 登录"
              className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <span className="text-lg font-bold leading-none">QQ</span>
              <span className="text-xs font-medium">QQ</span>
            </button>
            <button
              onClick={() => handleThirdPartyLogin('apple')}
              aria-label="使用 Apple 登录"
              className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Apple className="w-6 h-6" />
              <span className="text-xs font-medium">Apple</span>
            </button>
            <button
              onClick={() => setShowPhoneModal(true)}
              aria-label="使用手机号登录"
              className="flex flex-col items-center gap-1.5 p-3 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <Phone className="w-6 h-6" />
              <span className="text-xs font-medium">手机号</span>
            </button>
          </div>

          {/* 登录/注册切换入口 */}
          <div className="text-center mt-6">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>
        </div>

        {/* 页脚版权 */}
        <p className="text-center text-white/80 text-sm mt-6">
          星屿心理健康管理系统 © 2026
        </p>
      </div>

      {/* 手机号登录弹窗 */}
      <Modal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        title="手机号登录"
        size="md"
      >
        <div className="space-y-4">
          {/* 手机号输入：仅保留数字并截断到 11 位 */}
          <Input
            label="手机号"
            icon={<Phone className="w-5 h-5" />}
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="请输入手机号"
          />
          <div className="flex gap-3">
            {/* 验证码输入：仅保留数字并截断到 6 位 */}
            <Input
              label="验证码"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入验证码"
              className="flex-1"
            />
            {/* 获取验证码按钮：倒计时中或手机号不完整时禁用 */}
            <button
              onClick={handleSendCode}
              disabled={codeCountdown > 0 || phoneNumber.length !== 11}
              className="self-end px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
            </button>
          </div>
          {/* 手机号登录提交按钮：手机号 11 位且验证码 6 位时可用 */}
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
