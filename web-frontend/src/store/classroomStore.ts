/**
 * @file classroomStore.ts
 * @description 班级管理 store：维护班级统计数据、学生列表（含最近心情与风险等级）、当前选中班级等，
 *              为教师端首页/班级管理页提供数据。API 失败时降级到 mock 数据。
 * @module web-frontend/store
 */
import { create } from 'zustand';
import { StudentWithMood, ClassStats } from '../types';
import { classroomApi } from '../services/api';
import { ApiError } from '../services/http';

/** 班级 store 状态 */
interface ClassroomState {
  students: StudentWithMood[];   // 学生及心情列表
  stats: ClassStats | null;       // 班级统计
  selectedClassId: string;        // 当前选中的班级 ID
  isLoading: boolean;              // 加载中
  isUsingMockData: boolean;        // 是否使用 mock 数据

  fetchClassStats: (classId: string) => Promise<void>; // 拉取班级统计
  fetchStudents: (classId: string) => Promise<void>;   // 拉取学生列表
  selectClass: (classId: string) => void;              // 切换班级
}

// Mock 学生列表（覆盖 red/orange/yellow/green 四种风险等级）
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

// Mock 班级统计
const mockStats: ClassStats = {
  totalStudents: 45,
  averageMood: 3.6,
  alertCount: 3,
  todayCheckinCount: 38,
};

/**
 * 班级管理 store
 */
export const useClassroomStore = create<ClassroomState>((set) => ({
  students: [],
  stats: null,
  selectedClassId: 'class1',
  isLoading: false,
  isUsingMockData: false,

  /**
   * 拉取班级统计：API 失败时降级到 mock 统计
   * @param classId - 班级 ID
   */
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

  /**
   * 拉取学生列表：API 失败时降级到 mock 学生
   * @param classId - 班级 ID
   */
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

  /**
   * 切换当前选中班级
   * @param classId - 班级 ID
   */
  selectClass: (classId) => {
    set({ selectedClassId: classId });
  },
}));
