import { create } from 'zustand';
import { MoodRecord, MoodCheckinResponse } from '../types';
import { moodApi } from '../services/api';
import { ApiError } from '../services/http';

interface MoodState {
  moodHistory: MoodRecord[];
  selectedMood: number | null;
  checkinStatus: 'idle' | 'checking' | 'success' | 'error';
  checkinMessage: string;
  isLoading: boolean;
  continuousDays: number;
  isUsingMockData: boolean;
  error: string | null;

  fetchMoodHistory: (userId: string) => Promise<void>;
  checkinMood: (userId: string, moodLevel: number, tags?: string[]) => Promise<MoodCheckinResponse | null>;
  selectMood: (moodLevel: number | null) => void;
  resetCheckinStatus: () => void;
}

// Mock 数据（降级使用）
const mockMoodHistory: MoodRecord[] = [
  { id: '1', userId: 'student1', moodLevel: 4, tags: ['学习压力'], checkinDate: '2026-07-10', createdAt: '2026-07-10T08:00:00Z' },
  { id: '2', userId: 'student1', moodLevel: 3, tags: ['人际'], checkinDate: '2026-07-11', createdAt: '2026-07-11T09:00:00Z' },
  { id: '3', userId: 'student1', moodLevel: 2, tags: ['考试焦虑'], checkinDate: '2026-07-12', createdAt: '2026-07-12T07:30:00Z' },
  { id: '4', userId: 'student1', moodLevel: 5, tags: ['开心'], checkinDate: '2026-07-13', createdAt: '2026-07-13T08:15:00Z' },
  { id: '5', userId: 'student1', moodLevel: 4, tags: ['平静'], checkinDate: '2026-07-14', createdAt: '2026-07-14T08:30:00Z' },
];

// Mock 打卡响应（降级使用）
const mockCheckinResponse: MoodCheckinResponse = {
  message: '心情打卡成功',
  checkinDate: new Date().toISOString().split('T')[0],
  continuousDays: 5,
};

export const useMoodStore = create<MoodState>((set) => ({
  moodHistory: [],
  selectedMood: null,
  checkinStatus: 'idle',
  checkinMessage: '',
  isLoading: false,
  continuousDays: 0,
  isUsingMockData: false,
  error: null,

  fetchMoodHistory: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const history = await moodApi.getHistory(userId);
      set({ moodHistory: history, isLoading: false, isUsingMockData: false, error: null });
    } catch (error) {
      // 仅在网络/服务端错误时降级到 mock；4xx 等错误写入 error 字段
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
        set({ moodHistory: mockMoodHistory, isLoading: false, isUsingMockData: true, error: null });
        return;
      }
      set({
        moodHistory: [],
        isLoading: false,
        isUsingMockData: false,
        error: error instanceof ApiError ? error.message : '获取心情历史失败，请稍后重试',
      });
    }
  },

  checkinMood: async (userId, moodLevel, tags) => {
    set({ checkinStatus: 'checking' });

    try {
      const response = await moodApi.checkin({ userId, moodLevel, tags });

      set({
        checkinStatus: 'success',
        checkinMessage: response.message,
        selectedMood: moodLevel,
        continuousDays: response.continuousDays,
        isUsingMockData: false,
      });

      setTimeout(() => {
        set({ checkinStatus: 'idle', checkinMessage: '' });
      }, 3000);

      return response;
    } catch (error) {
      // 降级到 mock 响应
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
        const mockResponse: MoodCheckinResponse = {
          ...mockCheckinResponse,
          checkinDate: new Date().toISOString().split('T')[0],
        };

        set({
          checkinStatus: 'success',
          checkinMessage: mockResponse.message,
          selectedMood: moodLevel,
          continuousDays: mockResponse.continuousDays,
          isUsingMockData: true,
        });

        setTimeout(() => {
          set({ checkinStatus: 'idle', checkinMessage: '' });
        }, 3000);

        return mockResponse;
      }

      // 其他错误（如 4xx）标记为失败
      set({
        checkinStatus: 'error',
        checkinMessage: error instanceof ApiError ? error.message : '心情打卡失败，请稍后重试',
      });
      return null;
    }
  },

  selectMood: (moodLevel) => {
    set({ selectedMood: moodLevel });
  },

  resetCheckinStatus: () => {
    set({ checkinStatus: 'idle', checkinMessage: '' });
  },
}));
