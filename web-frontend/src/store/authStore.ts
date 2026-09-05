/**
 * @file authStore.ts
 * @description 鉴权 store：使用 Zustand + persist 管理登录态、用户信息、token 与登录方式，
 *              支持账号密码、第三方（微信/QQ/Apple）、手机号三种登录路径，并在无后端时短路到 mock 数据。
 * @module web-frontend/store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authApi } from '../services/api';
import { ApiError } from '../services/http';

// 登录方式：账号密码 / 微信 / QQ / Apple / 手机号
export type LoginMethod = 'credentials' | 'wechat' | 'qq' | 'apple' | 'phone';

/** 第三方用户信息（用于第三方登录） */
export interface ThirdPartyUserInfo {
  provider: string;    // 提供商：wechat/qq/apple
  openId: string;       // 第三方 openid
  nickname?: string;    // 昵称（可选）
  avatar?: string;      // 头像 URL（可选）
  unionId?: string;     // unionId（可选，用于跨应用识别）
}

/** 鉴权 store 状态 */
interface AuthState {
  user: User | null;                // 当前用户
  token: string | null;             // JWT Token
  isLoggedIn: boolean;               // 是否已登录
  isLoading: boolean;                // 加载中
  error: string | null;              // 错误信息
  loginMethod: LoginMethod | null;   // 登录方式
  isUsingMockData: boolean;          // 是否使用 mock 数据

  login: (credentials: LoginRequest) => Promise<void>;                                   // 账号密码登录
  register: (data: RegisterRequest) => Promise<void>;                                    // 注册
  logout: () => void;                                                                     // 退出登录
  clearError: () => void;                                                                 // 清空错误
  loginWithThirdParty: (provider: LoginMethod, userInfo: ThirdPartyUserInfo) => Promise<void>; // 第三方登录
  loginWithPhone: (phone: string, code: string) => Promise<void>;                        // 手机号登录
  setLoginMethod: (method: LoginMethod | null) => void;                                  // 设置登录方式
  updateProfile: (data: { nickname?: string; signature?: string }) => Promise<void>;    // 更新资料
}

// Mock 数据（后端不可用时降级使用）：内置 student1/teacher1/parent1 三个演示账号
const mockUsers: Record<string, User> = {
  'student1': {
    id: 'student1',
    nickname: '小明同学',
    avatar: '',
    role: 'student',
    ageGroup: '高一',
    signature: '每天都要开心',
    classId: 'class1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  'teacher1': {
    id: 'teacher1',
    nickname: '李老师',
    avatar: '',
    role: 'teacher',
    signature: '关注每一个孩子的成长',
    classId: 'class1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  'parent1': {
    id: 'parent1',
    nickname: '王爸爸',
    avatar: '',
    role: 'parent',
    signature: '陪伴是最长情的告白',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

/**
 * 判断是否应走 mock 降级（请求失败后兜底）：
 *  ① 断网（status=0） ② 后端不存在（404/405，常见于纯静态托管） ③ 服务端异常（≥500）
 * @param err - 捕获的错误
 * @returns 是否降级到 mock
 */
function shouldUseMockFallback(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.status === 0
    || err.status === 404
    || err.status === 405
    || err.status >= 500;
}

/**
 * 判断是否应跳过网络请求、直接走 mock（无真实后端时短路）
 * @returns true 表示应直接使用 mock
 */
function shouldShortCircuitToMock(): boolean {
  // 仅当未配置真实 API base 或明确标记为静态部署时短路
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase || apiBase === 'false' || apiBase === '') return true;
  return import.meta.env.VITE_USE_MOCK === 'true';
}

/**
 * 鉴权 store（持久化到 localStorage 的 starisle-auth key）
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      loginMethod: null,
      isUsingMockData: false,

      /**
       * 账号密码登录：演示账号在无后端时短路到 mock；真实后端失败时降级到 mock
       * @param credentials - 账号、密码、角色
       */
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        // 🟢 演示账号短路：无真实后端时直接走 mock，避免 405/网络抖动
        if (shouldShortCircuitToMock()
            && (credentials.username === 'student1' || credentials.username === 'teacher1' || credentials.username === 'parent1')
            && mockUsers[credentials.username]?.role === credentials.role) {
          const mockUser = mockUsers[credentials.username];
          set({
            user: mockUser,
            token: 'mock-jwt-token',
            isLoggedIn: true,
            isLoading: false,
            loginMethod: 'credentials',
            isUsingMockData: true,
          });
          return;
        }

        try {
          // 真实登录
          const response = await authApi.login(credentials);
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false,
            loginMethod: 'credentials',
            isUsingMockData: false,
          });
        } catch (error) {
          // 降级到 mock 数据
          if (shouldUseMockFallback(error)) {
            const mockUser = mockUsers[credentials.username];
            if (mockUser && mockUser.role === credentials.role) {
              set({
                user: mockUser,
                token: 'mock-jwt-token',
                isLoggedIn: true,
                isLoading: false,
                loginMethod: 'credentials',
                isUsingMockData: true,
              });
              return;
            }
          }
          set({
            error: error instanceof ApiError ? error.message : '登录失败，请稍后重试',
            isLoading: false,
          });
        }
      },

      /**
       * 注册新账号：真实后端失败时降级为本地创建新用户
       * @param data - 注册请求体
       */
      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register(data);
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false,
            loginMethod: 'credentials',
            isUsingMockData: false,
          });
        } catch (error) {
          // 降级到 mock 数据：本地生成新用户
          if (shouldUseMockFallback(error)) {
            const newUser: User = {
              id: `user-${Date.now()}`,
              nickname: data.nickname,
              avatar: '',
              role: data.role,
              ageGroup: data.ageGroup,
              signature: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({
              user: newUser,
              token: 'mock-jwt-token',
              isLoggedIn: true,
              isLoading: false,
              loginMethod: 'credentials',
              isUsingMockData: true,
            });
            return;
          }
          set({
            error: error instanceof ApiError ? error.message : '注册失败，请稍后重试',
            isLoading: false,
          });
        }
      },

      /**
       * 第三方登录：无真实后端时直接走 mock；真实失败时降级
       * @param provider - 登录方式
       * @param userInfo - 第三方用户信息
       */
      loginWithThirdParty: async (provider, userInfo) => {
        set({ isLoading: true, error: null });

        // 🟢 无真实后端时直接走 mock
        if (shouldShortCircuitToMock()) {
          const newUser: User = {
            id: `user-${userInfo.openId}`,
            nickname: userInfo.nickname || '用户',
            avatar: userInfo.avatar || '',
            role: 'student',
            ageGroup: '',
            signature: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({
            user: newUser,
            token: 'mock-jwt-token',
            isLoggedIn: true,
            isLoading: false,
            loginMethod: provider,
            isUsingMockData: true,
          });
          return;
        }

        try {
          const response = await authApi.loginWithThirdParty(
            userInfo.provider,
            userInfo.openId,
            userInfo.nickname,
            userInfo.avatar
          );
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false,
            loginMethod: provider,
            isUsingMockData: false,
          });
        } catch (error) {
          // 降级到 mock 数据
          if (shouldUseMockFallback(error)) {
            const newUser: User = {
              id: `user-${userInfo.openId}`,
              nickname: userInfo.nickname || '用户',
              avatar: userInfo.avatar || '',
              role: 'student',
              ageGroup: '',
              signature: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({
              user: newUser,
              token: 'mock-jwt-token',
              isLoggedIn: true,
              isLoading: false,
              loginMethod: provider,
              isUsingMockData: true,
            });
            return;
          }
          set({
            error: error instanceof ApiError ? error.message : '第三方登录失败',
            isLoading: false,
          });
        }
      },

      /**
       * 手机号登录：无真实后端时直接走 mock；真实失败时降级
       * @param phone - 手机号
       * @param code - 验证码
       */
      loginWithPhone: async (phone, code) => {
        set({ isLoading: true, error: null });

        // 🟢 无真实后端时直接走 mock
        if (shouldShortCircuitToMock()) {
          const newUser: User = {
            id: `user-${phone}`,
            nickname: phone,
            avatar: '',
            role: 'student',
            ageGroup: '',
            signature: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({
            user: newUser,
            token: 'mock-jwt-token',
            isLoggedIn: true,
            isLoading: false,
            loginMethod: 'phone',
            isUsingMockData: true,
          });
          return;
        }

        try {
          const response = await authApi.loginWithPhone(phone, code);
          set({
            user: response.user,
            token: response.token,
            isLoggedIn: true,
            isLoading: false,
            loginMethod: 'phone',
            isUsingMockData: false,
          });
        } catch (error) {
          // 降级到 mock 数据
          if (shouldUseMockFallback(error)) {
            const newUser: User = {
              id: `user-${phone}`,
              nickname: phone,
              avatar: '',
              role: 'student',
              ageGroup: '',
              signature: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({
              user: newUser,
              token: 'mock-jwt-token',
              isLoggedIn: true,
              isLoading: false,
              loginMethod: 'phone',
              isUsingMockData: true,
            });
            return;
          }
          set({
            error: error instanceof ApiError ? error.message : '手机号登录失败',
            isLoading: false,
          });
        }
      },

      /** 退出登录：清空所有登录态 */
      logout: () => {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          isLoading: false,
          error: null,
          loginMethod: null,
          isUsingMockData: false,
        });
      },

      /** 清空错误信息 */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 设置登录方式
       * @param method - 登录方式
       */
      setLoginMethod: (method) => {
        set({ loginMethod: method });
      },

      /**
       * 更新个人资料（昵称/签名）：本地更新 user 状态（已通过 persist 持久化）
       * @param data - 待更新字段
       */
      updateProfile: async (data) => {
        const currentUser = get().user;
        if (!currentUser) return;

        // authApi 暂未提供更新接口，直接更新本地 user state（已通过 persist 持久化）。
        // 若后续接入真实 API，可在此处 try/catch，失败时标记 isUsingMockData。
        set({
          user: {
            ...currentUser,
            ...(data.nickname !== undefined ? { nickname: data.nickname } : null),
            ...(data.signature !== undefined ? { signature: data.signature } : null),
            updatedAt: new Date().toISOString(),
          },
        });
      },
    }),
    {
      // 持久化配置：仅持久化登录态相关字段
      name: 'starisle-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        loginMethod: state.loginMethod,
      }),
    }
  )
);
