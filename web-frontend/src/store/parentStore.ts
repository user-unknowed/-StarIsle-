/**
 * @file parentStore.ts
 * @description 家长端 store：管理家长资料、孩子绑定列表、孩子心情、紧急告警、应急资源等，
 *              覆盖绑定/解绑、告警确认、超时升级、应急资源查询等业务流程；API 失败时降级到 mock 数据。
 * @module web-frontend/store
 */
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

/** 家长端 store 状态 */
interface ParentState {
  parentProfile: ParentUser | null;     // 家长资料
  children: ChildBinding[];               // 已绑定孩子列表
  selectedChildId: string | null;        // 当前选中孩子（绑定关系 ID）
  childMood: MoodRecord[];                // 当前孩子心情历史
  emergencyAlerts: EmergencyAlert[];      // 紧急告警列表
  emergencyResources: EmergencyResource[]; // 应急资源列表
  isLoading: boolean;                       // 加载中
  error: string | null;                     // 错误信息
  isUsingMockData: boolean;                 // 是否使用 mock 数据

  fetchProfile: () => Promise<void>;                                  // 拉取家长资料
  fetchChildren: () => Promise<void>;                                  // 拉取孩子列表
  selectChild: (bindingId: string) => void;                           // 切换选中孩子
  fetchChildMood: (days?: number) => Promise<void>;                   // 拉取孩子心情
  bindChild: (data: BindChildRequest) => Promise<ChildBinding | null>; // 绑定孩子
  authorizeChild: (bindingId: string) => Promise<void>;               // 授权绑定
  unbindChild: (bindingId: string) => Promise<void>;                  // 解绑孩子
  fetchAlerts: () => Promise<void>;                                   // 拉取告警
  confirmAlert: (alertId: string) => Promise<void>;                   // 确认告警
  checkAlertTimeout: () => void;                                      // 检查告警超时升级
  fetchResources: (type?: string) => Promise<void>;                   // 拉取应急资源
  clearError: () => void;                                             // 清空错误
}

// Mock 家长资料
const mockParentProfile: ParentUser = {
  id: 'parent1',
  username: 'parent1',
  nickname: '王爸爸',
  phone: '138****8888',
  createdAt: '2026-01-01T00:00:00Z',
};

// Mock 孩子绑定列表
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

// Mock 孩子心情历史
const mockChildMood: MoodRecord[] = [
  { id: 'cm1', userId: 'student1', moodLevel: 3, tags: ['学习压力'], checkinDate: '2026-07-08', createdAt: '2026-07-08T08:00:00Z' },
  { id: 'cm2', userId: 'student1', moodLevel: 2, tags: ['考试焦虑'], checkinDate: '2026-07-09', createdAt: '2026-07-09T08:00:00Z' },
  { id: 'cm3', userId: 'student1', moodLevel: 2, tags: ['人际'], checkinDate: '2026-07-10', createdAt: '2026-07-10T08:00:00Z' },
  { id: 'cm4', userId: 'student1', moodLevel: 3, tags: ['平静'], checkinDate: '2026-07-11', createdAt: '2026-07-11T08:00:00Z' },
  { id: 'cm5', userId: 'student1', moodLevel: 4, tags: ['开心'], checkinDate: '2026-07-12', createdAt: '2026-07-12T08:00:00Z' },
  { id: 'cm6', userId: 'student1', moodLevel: 3, tags: ['一般'], checkinDate: '2026-07-13', createdAt: '2026-07-13T08:00:00Z' },
  { id: 'cm7', userId: 'student1', moodLevel: 2, tags: ['睡眠'], checkinDate: '2026-07-14', createdAt: '2026-07-14T08:00:00Z' },
];

// Mock 紧急告警（橙色级别，未确认）
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

// Mock 应急资源：热线 / 医院 / 社区 / 学校
const mockResources: EmergencyResource[] = [
  {
    id: 'res_1',
    type: 'hotline',
    title: '12355 青少年服务热线',
    content: '全国青少年心理咨询服务热线，提供 24 小时心理疏导',
    contact: '青少年服务台',
    phone: '12355',
  },
  {
    id: 'res_2',
    type: 'hotline',
    title: '希望24热线',
    content: '全国心理危机干预热线，专业志愿者 24 小时值守',
    contact: '危机干预中心',
    phone: '400-161-9995',
  },
  {
    id: 'res_3',
    type: 'hospital',
    title: '市精神卫生中心',
    content: '提供专业心理评估与诊疗服务，可预约青少年门诊',
    contact: '门诊咨询',
    phone: '021-12345678',
  },
  {
    id: 'res_4',
    type: 'community',
    title: '社区心理服务站',
    content: '就近提供免费心理咨询服务，支持线下预约',
    contact: '社区服务中心',
    phone: '021-87654321',
  },
  {
    id: 'res_5',
    type: 'community',
    title: '学校心理老师',
    content: '学校专业心理辅导老师，可预约面对面咨询',
    contact: '学校心理辅导室',
    phone: '请通过班主任联系',
  },
  {
    id: 'res_6',
    type: 'community',
    title: '班主任',
    content: '孩子的班主任，了解孩子在校情况的第一联系人',
    contact: '班级群',
    phone: '请查看班级通讯录',
  },
];

/**
 * 判断错误是否可降级：断网或服务端异常（≥500）时降级到 mock
 * @param error - 捕获的错误
 * @returns 是否可降级
 */
const isDegradable = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);

/**
 * 家长端 store
 */
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

  /**
   * 拉取家长资料：可降级错误时使用 mock 资料
   */
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

  /**
   * 拉取孩子列表：自动选中第一个孩子（若未选中）
   */
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

  /**
   * 切换选中孩子：同时清空孩子心情历史，触发后续 fetchChildMood
   * @param bindingId - 绑定关系 ID
   */
  selectChild: (bindingId) => {
    set({ selectedChildId: bindingId, childMood: [] });
  },

  /**
   * 拉取当前孩子的心情历史
   * @param days - 最近天数，默认 7
   */
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

  /**
   * 绑定孩子：成功后追加到列表；降级时本地生成未授权绑定关系
   * @param data - 绑定请求体
   * @returns 绑定关系或 null（失败）
   */
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
          // 仅当之前没有任何真实孩子时才标记为 mock，避免覆盖已有真实绑定
          isUsingMockData: state.children.length === 0 ? true : state.isUsingMockData,
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

  /**
   * 授权孩子绑定：成功后替换列表中对应项；降级时本地标记为已授权
   * @param bindingId - 绑定关系 ID
   */
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

  /**
   * 解绑孩子：成功后从列表移除；如解绑的是当前选中孩子则切换到剩余中的第一个
   * @param bindingId - 绑定关系 ID
   */
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

  /**
   * 拉取紧急告警：拉取后立即检查超时升级
   */
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
      // 检查红色告警是否超过 2 小时未确认
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

  /**
   * 确认告警：成功后替换列表中对应项；降级时本地标记为已确认
   * @param alertId - 告警 ID
   */
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

  /**
   * 检查告警超时升级：红色告警超过 2 小时未确认则追加超时升级提示
   */
  checkAlertTimeout: () => {
    const alerts = get().emergencyAlerts;
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const updated = alerts.map(a => {
      // 仅对红色未确认告警做超时升级
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

  /**
   * 拉取应急资源（可选按类型过滤）
   * @param type - 资源类型，未指定则拉取全部
   */
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

  /** 清空错误信息 */
  clearError: () => set({ error: null }),
}));
