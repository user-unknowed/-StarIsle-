import { create } from 'zustand';
import { StudentWithMood, ClassStats } from '../types';
import { classroomApi } from '../services/api';
import { ApiError } from '../services/http';

interface ClassroomState {
  students: StudentWithMood[];
  stats: ClassStats | null;
  selectedClassId: string;
  isLoading: boolean;
  isUsingMockData: boolean;

  fetchClassStats: (classId: string) => Promise<void>;
  fetchStudents: (classId: string) => Promise<void>;
  selectClass: (classId: string) => void;
}

const mockStudents: StudentWithMood[] = [
  { id: 's1', nickname: '小明同学', avatar: '', latestMood: 2, riskLevel: 'yellow', alert: true },
  { id: 's2', nickname: '小红同学', avatar: '', latestMood: 4, riskLevel: 'green', alert: false },
  { id: 's3', nickname: '小刚同学', avatar: '', latestMood: 1, riskLevel: 'red', alert: true },
  { id: 's4', nickname: '小丽同学', avatar: '', latestMood: 5, riskLevel: 'green', alert: false },
  { id: 's5', nickname: '小华同学', avatar: '', latestMood: 3, riskLevel: 'green', alert: false },
  { id: 's6', nickname: '小芳同学', avatar: '', latestMood: 2, riskLevel: 'orange', alert: true },
  { id: 's7', nickname: '小强同学', avatar: '', latestMood: 4, riskLevel: 'green', alert: false },
  { id: 's8', nickname: '小雪同学', avatar: '', latestMood: 5, riskLevel: 'green', alert: false },
];

const mockStats: ClassStats = {
  totalStudents: 45,
  averageMood: 3.6,
  alertCount: 3,
  todayCheckinCount: 38,
};

export const useClassroomStore = create<ClassroomState>((set) => ({
  students: [],
  stats: null,
  selectedClassId: 'class1',
  isLoading: false,
  isUsingMockData: false,

  fetchClassStats: async (classId) => {
    set({ isLoading: true });
    try {
      const stats = await classroomApi.getClassStats(classId);
      set({ stats, isUsingMockData: false, isLoading: false });
    } catch (error) {
      if (error instanceof ApiError) {
        console.warn(`[classroomStore] fetchClassStats API 失败 (${error.status})，降级使用 mock 数据`, error.message);
      } else {
        console.warn('[classroomStore] fetchClassStats API 失败，降级使用 mock 数据', error);
      }
      set({ stats: mockStats, isUsingMockData: true, isLoading: false });
    }
  },

  fetchStudents: async (classId) => {
    set({ isLoading: true });
    try {
      const students = await classroomApi.getStudents(classId);
      set({ students, isUsingMockData: false, isLoading: false });
    } catch (error) {
      if (error instanceof ApiError) {
        console.warn(`[classroomStore] fetchStudents API 失败 (${error.status})，降级使用 mock 数据`, error.message);
      } else {
        console.warn('[classroomStore] fetchStudents API 失败，降级使用 mock 数据', error);
      }
      set({ students: mockStudents, isUsingMockData: true, isLoading: false });
    }
  },

  selectClass: (classId) => {
    set({ selectedClassId: classId });
  },
}));
