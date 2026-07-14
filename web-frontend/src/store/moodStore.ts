import { create } from 'zustand';
import { MoodRecord, MoodCheckinResponse } from '../types';

interface MoodState {
  moodHistory: MoodRecord[];
  selectedMood: number | null;
  checkinStatus: 'idle' | 'checking' | 'success' | 'error';
  checkinMessage: string;
  isLoading: boolean;

  fetchMoodHistory: (userId: string) => Promise<void>;
  checkinMood: (userId: string, moodLevel: number, tags?: string[]) => Promise<MoodCheckinResponse | null>;
  selectMood: (moodLevel: number | null) => void;
  resetCheckinStatus: () => void;
}

const mockMoodHistory: MoodRecord[] = [
  { id: '1', userId: 'student1', moodLevel: 4, tags: ['学习压力'], checkinDate: '2026-07-10', createdAt: '2026-07-10T08:00:00Z' },
  { id: '2', userId: 'student1', moodLevel: 3, tags: ['人际'], checkinDate: '2026-07-11', createdAt: '2026-07-11T09:00:00Z' },
  { id: '3', userId: 'student1', moodLevel: 2, tags: ['考试焦虑'], checkinDate: '2026-07-12', createdAt: '2026-07-12T07:30:00Z' },
  { id: '4', userId: 'student1', moodLevel: 5, tags: ['开心'], checkinDate: '2026-07-13', createdAt: '2026-07-13T08:15:00Z' },
  { id: '5', userId: 'student1', moodLevel: 4, tags: ['平静'], checkinDate: '2026-07-14', createdAt: '2026-07-14T08:30:00Z' },
];

export const useMoodStore = create<MoodState>((set) => ({
  moodHistory: [],
  selectedMood: null,
  checkinStatus: 'idle',
  checkinMessage: '',
  isLoading: false,

  fetchMoodHistory: async (userId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ moodHistory: mockMoodHistory, isLoading: false });
  },

  checkinMood: async (userId, moodLevel, tags) => {
    set({ checkinStatus: 'checking' });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const response: MoodCheckinResponse = {
      message: '心情打卡成功',
      checkinDate: new Date().toISOString().split('T')[0],
      continuousDays: 5,
    };
    
    set({
      checkinStatus: 'success',
      checkinMessage: response.message,
      selectedMood: moodLevel,
    });
    
    setTimeout(() => {
      set({ checkinStatus: 'idle', checkinMessage: '' });
    }, 3000);
    
    return response;
  },

  selectMood: (moodLevel) => {
    set({ selectedMood: moodLevel });
  },

  resetCheckinStatus: () => {
    set({ checkinStatus: 'idle', checkinMessage: '' });
  },
}));