import { create } from 'zustand';
import {
  ParentUser,
  ChildBinding,
  EmergencyAlert,
  EmergencyResource,
  MoodRecord,
} from '../types';
import { parentApi, BindChildRequest } from '../services/api';
import { ApiError } from '../services/http';

interface ParentState {
  parentProfile: ParentUser | null;
  children: ChildBinding[];
  selectedChildId: string | null;
  childMood: MoodRecord[];
  emergencyAlerts: EmergencyAlert[];
  emergencyResources: EmergencyResource[];
  isLoading: boolean;
  error: string | null;
  isUsingMockData: boolean;

  fetchProfile: () => Promise<void>;
  fetchChildren: () => Promise<void>;
  selectChild: (bindingId: string) => void;
  fetchChildMood: (days?: number) => Promise<void>;
  bindChild: (data: BindChildRequest) => Promise<ChildBinding | null>;
  authorizeChild: (bindingId: string) => Promise<void>;
  unbindChild: (bindingId: string) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  confirmAlert: (alertId: string) => Promise<void>;
  checkAlertTimeout: () => void;
  fetchResources: (type?: string) => Promise<void>;
  clearError: () => void;
}

// Mock 数据（降级使用）
const mockParentProfile: ParentUser = {
  id: 'parent1',
  username: 'parent1',
  nickname: '王爸爸',
  phone: '138****8888',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockChildren: ChildBinding[] = [
  {
    bindingId: 'binding_1',
    studentId: 'student1',
    studentNickname: '小明同学',
    studentAvatar: '',
    authorized: true,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    bindingId: 'binding_2',
    studentId: 's3',
    studentNickname: '小刚同学',
    studentAvatar: '',
    authorized: true,
    createdAt: '2026-01-10T00:00:00Z',
  },
];

const mockChildMood: MoodRecord[] = [
  { id: 'cm1', userId: 'student1', moodLevel: 3, tags: ['学习压力'], checkinDate: '2026-07-08', createdAt: '2026-07-08T08:00:00Z' },
  { id: 'cm2', userId: 'student1', moodLevel: 2, tags: ['考试焦虑'], checkinDate: '2026-07-09', createdAt: '2026-07-09T08:00:00Z' },
  { id: 'cm3', userId: 'student1', moodLevel: 2, tags: ['人际'], checkinDate: '2026-07-10', createdAt: '2026-07-10T08:00:00Z' },
  { id: 'cm4', userId: 'student1', moodLevel: 3, tags: ['平静'], checkinDate: '2026-07-11', createdAt: '2026-07-11T08:00:00Z' },
  { id: 'cm5', userId: 'student1', moodLevel: 4, tags: ['开心'], checkinDate: '2026-07-12', createdAt: '2026-07-12T08:00:00Z' },
  { id: 'cm6', userId: 'student1', moodLevel: 3, tags: ['一般'], checkinDate: '2026-07-13', createdAt: '2026-07-13T08:00:00Z' },
  { id: 'cm7', userId: 'student1', moodLevel: 2, tags: ['睡眠'], checkinDate: '2026-07-14', createdAt: '2026-07-14T08:00:00Z' },
];

const mockAlerts: EmergencyAlert[] = [
  {
    alertId: 'alert_1',
    studentId: 'student1',
    level: 'orange',
    reason: '连续 3 天心情低落，检测到「压力」「焦虑」等关键词',
    createdAt: '2026-07-14T10:00:00Z',
    confirmed: false,
  },
];

const mockResources: EmergencyResource[] = [
  {
    type: 'hotline',
    title: '12355 青少年服务热线',
    content: '全国青少年心理咨询服务热线，提供 24 小时心理疏导',
    contact: '青少年服务台',
    phone: '12355',
  },
  {
    type: 'hotline',
    title: '希望24热线',
    content: '全国心理危机干预热线，专业志愿者 24 小时值守',
    contact: '危机干预中心',
    phone: '400-161-9995',
  },
  {
    type: 'hospital',
    title: '市精神卫生中心',
    content: '提供专业心理评估与诊疗服务，可预约青少年门诊',
    contact: '门诊咨询',
    phone: '021-12345678',
  },
  {
    type: 'community',
    title: '社区心理服务站',
    content: '就近提供免费心理咨询服务，支持线下预约',
    contact: '社区服务中心',
    phone: '021-87654321',
  },
  {
    type: 'community',
    title: '学校心理老师',
    content: '学校专业心理辅导老师，可预约面对面咨询',
    contact: '学校心理辅导室',
    phone: '请通过班主任联系',
  },
  {
    type: 'community',
    title: '班主任',
    content: '孩子的班主任，了解孩子在校情况的第一联系人',
    contact: '班级群',
    phone: '请查看班级通讯录',
  },
];

const isDegradable = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);

export const useParentStore = create<ParentState>((set, get) => ({
  parentProfile: null,
  children: [],
  selectedChildId: null,
  childMood: [],
  emergencyAlerts: [],
  emergencyResources: [],
  isLoading: false,
  error: null,
  isUsingMockData: false,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await parentApi.getMe();
      set({ parentProfile: profile, isLoading: false, isUsingMockData: false });
    } catch (error) {
      if (isDegradable(error)) {
        set({ parentProfile: mockParentProfile, isLoading: false, isUsingMockData: true });
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '获取家长信息失败',
        isLoading: false,
      });
    }
  },

  fetchChildren: async () => {
    set({ isLoading: true, error: null });
    try {
      const children = await parentApi.listChildren();
      const selectedChildId = get().selectedChildId || children[0]?.bindingId || null;
      set({ children, selectedChildId, isLoading: false, isUsingMockData: false });
    } catch (error) {
      if (isDegradable(error)) {
        const selectedChildId = get().selectedChildId || mockChildren[0]?.bindingId || null;
        set({ children: mockChildren, selectedChildId, isLoading: false, isUsingMockData: true });
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '获取孩子列表失败',
        isLoading: false,
      });
    }
  },

  selectChild: (bindingId) => {
    set({ selectedChildId: bindingId, childMood: [] });
  },

  fetchChildMood: async (days = 7) => {
    const bindingId = get().selectedChildId;
    if (!bindingId) return;
    set({ isLoading: true, error: null });
    try {
      const mood = await parentApi.getChildMood(bindingId, days);
      set({ childMood: mood, isLoading: false, isUsingMockData: false });
    } catch (error) {
      if (isDegradable(error)) {
        set({ childMood: mockChildMood, isLoading: false, isUsingMockData: true });
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '获取孩子心情失败',
        isLoading: false,
      });
    }
  },

  bindChild: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const binding = await parentApi.bindStudent(data);
      set((state) => ({
        children: [...state.children, binding],
        isLoading: false,
        isUsingMockData: false,
      }));
      return binding;
    } catch (error) {
      if (isDegradable(error)) {
        const mockBinding: ChildBinding = {
          bindingId: `binding_${Date.now()}`,
          studentId: data.studentId,
          studentNickname: data.studentNickname || '新绑定孩子',
          studentAvatar: '',
          authorized: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          children: [...state.children, mockBinding],
          isLoading: false,
          isUsingMockData: true,
        }));
        return mockBinding;
      }
      set({
        error: error instanceof ApiError ? error.message : '绑定孩子失败',
        isLoading: false,
      });
      return null;
    }
  },

  authorizeChild: async (bindingId) => {
    set({ error: null });
    try {
      const updated = await parentApi.authorizeChild(bindingId);
      set((state) => ({
        children: state.children.map((c) => (c.bindingId === bindingId ? updated : c)),
        isUsingMockData: false,
      }));
    } catch (error) {
      if (isDegradable(error)) {
        set((state) => ({
          children: state.children.map((c) =>
            c.bindingId === bindingId ? { ...c, authorized: true } : c
          ),
          isUsingMockData: true,
        }));
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '授权失败',
      });
    }
  },

  unbindChild: async (bindingId) => {
    set({ error: null });
    try {
      await parentApi.unbindChild(bindingId);
      set((state) => ({
        children: state.children.filter((c) => c.bindingId !== bindingId),
        selectedChildId:
          state.selectedChildId === bindingId
            ? state.children.find((c) => c.bindingId !== bindingId)?.bindingId || null
            : state.selectedChildId,
        isUsingMockData: false,
      }));
    } catch (error) {
      if (isDegradable(error)) {
        set((state) => ({
          children: state.children.filter((c) => c.bindingId !== bindingId),
          selectedChildId:
            state.selectedChildId === bindingId
              ? state.children.find((c) => c.bindingId !== bindingId)?.bindingId || null
              : state.selectedChildId,
          isUsingMockData: true,
        }));
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '解绑失败',
      });
    }
  },

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    // 测试用：模拟告警延迟（通过 localStorage.__test_alert_delay 控制毫秒数）
    const testAlertDelay = typeof localStorage !== 'undefined' && localStorage.getItem('__test_alert_delay');
    if (testAlertDelay) {
      await new Promise(r => setTimeout(r, parseInt(testAlertDelay)));
    }
    try {
      const alert = await parentApi.getEmergencyAlert();
      set({
        emergencyAlerts: alert ? [alert] : [],
        isLoading: false,
        isUsingMockData: false,
      });
      get().checkAlertTimeout();
    } catch (error) {
      if (isDegradable(error)) {
        set({ emergencyAlerts: mockAlerts, isLoading: false, isUsingMockData: true });
        get().checkAlertTimeout();
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '获取告警失败',
        isLoading: false,
      });
    }
  },

  confirmAlert: async (alertId) => {
    set({ error: null });
    try {
      const confirmed = await parentApi.confirmAlert(alertId);
      set((state) => ({
        emergencyAlerts: state.emergencyAlerts.map((a) =>
          a.alertId === alertId ? confirmed : a
        ),
        isUsingMockData: false,
      }));
    } catch (error) {
      if (isDegradable(error)) {
        set((state) => ({
          emergencyAlerts: state.emergencyAlerts.map((a) =>
            a.alertId === alertId ? { ...a, confirmed: true } : a
          ),
          isUsingMockData: true,
        }));
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '确认告警失败',
      });
    }
  },

  checkAlertTimeout: () => {
    const alerts = get().emergencyAlerts;
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const updated = alerts.map(a => {
      if (a.level === 'red' && !a.confirmed) {
        const created = new Date(a.createdAt).getTime();
        if (now - created > TWO_HOURS) {
          return { ...a, reason: a.reason + ' [已超时升级：请心理组长介入]' };
        }
      }
      return a;
    });
    set({ emergencyAlerts: updated });
  },

  fetchResources: async (type) => {
    set({ isLoading: true, error: null });
    try {
      const resources = type
        ? await parentApi.getResourcesByType(type)
        : await parentApi.getEmergencyResources();
      set({ emergencyResources: resources, isLoading: false, isUsingMockData: false });
    } catch (error) {
      if (isDegradable(error)) {
        set({
          emergencyResources: type ? mockResources.filter((r) => r.type === type) : mockResources,
          isLoading: false,
          isUsingMockData: true,
        });
        return;
      }
      set({
        error: error instanceof ApiError ? error.message : '获取应急资源失败',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
