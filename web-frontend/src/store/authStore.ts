import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockUser = mockUsers[credentials.username];
    
    if (mockUser && mockUser.role === credentials.role) {
      set({
        user: mockUser,
        token: 'mock-jwt-token',
        isLoggedIn: true,
        isLoading: false,
      });
    } else {
      set({
        error: '用户名或密码错误',
        isLoading: false,
      });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
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
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));