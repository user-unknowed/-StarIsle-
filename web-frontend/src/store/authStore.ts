import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authApi } from '../services/api';
import { ApiError } from '../services/http';

export type LoginMethod = 'credentials' | 'wechat' | 'qq' | 'apple' | 'phone';

export interface ThirdPartyUserInfo {
  provider: string;
  openId: string;
  nickname?: string;
  avatar?: string;
  unionId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  loginMethod: LoginMethod | null;
  isUsingMockData: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  loginWithThirdParty: (provider: LoginMethod, userInfo: ThirdPartyUserInfo) => Promise<void>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  setLoginMethod: (method: LoginMethod | null) => void;
}

// Mock 数据（降级使用）
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
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      loginMethod: null,
      isUsingMockData: false,

      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
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
          if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
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
          // 降级到 mock 数据
          if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
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

      loginWithThirdParty: async (provider, userInfo) => {
        set({ isLoading: true, error: null });

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
          if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
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

      loginWithPhone: async (phone, code) => {
        set({ isLoading: true, error: null });

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
          if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
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

      clearError: () => {
        set({ error: null });
      },

      setLoginMethod: (method) => {
        set({ loginMethod: method });
      },
    }),
    {
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
