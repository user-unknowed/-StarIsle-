/**
 * @file parentStore.ts
 * @description 家长端全局状态管理（Zustand），集中维护孩子绑定、情绪趋势与摘要、知识文章、
 *              通知设置、紧急资源与告警、AI 对话等状态及对应的数据拉取/更新方法。
 * @module parent-app/store/parentStore
 */

import { create } from 'zustand';
import { ChildBinding, EmergencyAlert, KnowledgeArticle, NotificationSettings, EmergencyResource, MoodTrendData, MoodSummary, ChatMessage } from '../types';

/**
 * 家长端状态接口。
 *
 * 描述家长端全部状态字段与异步/同步操作方法。
 */
interface ParentState {
  // 已绑定的孩子列表
  children: ChildBinding[];
  // 当前选中的孩子 ID
  currentChildId: string | null;
  // 当前紧急预警（可为空）
  emergencyAlert: EmergencyAlert | null;
  // 情绪趋势数据列表
  moodTrend: MoodTrendData[];
  // 情绪摘要
  moodSummary: MoodSummary | null;
  // 知识库文章列表
  knowledgeArticles: KnowledgeArticle[];
  // 通知设置
  notificationSettings: NotificationSettings;
  // 紧急资源列表（热线/医院/联系人）
  emergencyResources: EmergencyResource[];
  // AI 对话消息列表
  chatMessages: ChatMessage[];
  // 全局加载态
  isLoading: boolean;
  // 当前激活的聊天话题
  activeChatTopic: string | null;

  /** 拉取指定家长的孩子绑定列表。 */
  fetchChildren: (parentId: string) => Promise<void>;
  /** 切换当前选中的孩子。 */
  selectChild: (childId: string) => void;
  /** 拉取指定学生在指定天数内的情绪趋势。 */
  fetchMoodTrend: (studentId: string, days: number) => Promise<void>;
  /** 拉取指定学生的情绪摘要。 */
  fetchMoodSummary: (studentId: string) => Promise<void>;
  /** 拉取知识库文章列表。 */
  fetchKnowledgeArticles: () => Promise<void>;
  /** 拉取通知设置。 */
  fetchNotificationSettings: () => Promise<void>;
  /** 更新通知设置。 */
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  /** 拉取紧急资源（热线/医院/联系人）。 */
  fetchEmergencyResources: () => Promise<void>;
  /** 拉取指定家长的紧急预警。 */
  fetchEmergencyAlert: (parentId: string) => Promise<void>;
  /** 确认紧急预警回执。 */
  confirmEmergencyAlert: (alertId: string) => Promise<void>;
  /** 发送家长消息并获取 AI 回复。 */
  sendChatMessage: (parentId: string, message: string) => Promise<void>;
  /** 拉取历史聊天记录。 */
  fetchChatHistory: (parentId: string) => Promise<void>;
  /** 设置当前激活的聊天话题。 */
  setActiveChatTopic: (topic: string | null) => void;
}

/** 模拟孩子绑定数据。 */
const mockChildren: ChildBinding[] = [
  {
    id: 'binding1',
    parentId: 'parent1',
    studentId: 'student1',
    studentNickname: '小明同学',
    studentAvatar: '',
    bindType: 'scan',
    authorized: true,
    createdAt: '2026-06-01T00:00:00Z',
    latestMood: 4,
    riskLevel: 'green',
    lastCheckinDate: '2026-07-15',
  },
];

/** 模拟情绪趋势数据（近 7 天）。 */
const mockMoodTrend: MoodTrendData[] = [
  { date: '2026-07-09', moodLevel: 3, tags: ['学习压力'] },
  { date: '2026-07-10', moodLevel: 4, tags: ['平静'] },
  { date: '2026-07-11', moodLevel: 2, tags: ['考试焦虑'] },
  { date: '2026-07-12', moodLevel: 3, tags: ['人际'] },
  { date: '2026-07-13', moodLevel: 5, tags: ['开心'] },
  { date: '2026-07-14', moodLevel: 4, tags: ['平静'] },
  { date: '2026-07-15', moodLevel: 4, tags: ['学习压力'] },
];

const mockMoodSummary: MoodSummary = {
  trend: 'stable',
  description: '最近一周情绪较为平稳，整体状态不错。',
  aiSuggestion: '孩子最近可能面临一些学习压力，可以找个轻松的时间聊聊，不一定非要聊学习。多关注孩子的兴趣爱好，给予适当的鼓励和支持。',
  tagDistribution: { '学习压力': 3, '平静': 2, '考试焦虑': 1, '人际': 1, '开心': 1 },
  checkinCalendar: ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15'],
};

/** 模拟知识库文章列表。 */
const mockKnowledgeArticles: KnowledgeArticle[] = [
  {
    id: '1',
    title: '青春期孩子的心理特点',
    category: '青春期心理',
    summary: '了解12-18岁孩子的心理发展规律，帮助家长更好地理解孩子',
    content: '青春期是孩子从儿童到成人的过渡阶段，生理和心理都会发生巨大变化。这个阶段的孩子开始关注自我认同，渴望独立，但同时也需要家长的支持和理解。',
    readTime: 3,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: '如何与青春期孩子有效沟通',
    category: '亲子沟通',
    summary: '掌握与青春期孩子沟通的技巧，建立良好的亲子关系',
    content: '与青春期孩子沟通需要耐心和技巧。要尊重孩子的隐私，多倾听少说教，用平等的姿态与孩子交流。',
    readTime: 4,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: '3',
    title: '发现孩子情绪低落时该怎么做',
    category: '家庭应对',
    summary: '实用指南：当孩子情绪低落时，家长可以做什么',
    content: '当发现孩子情绪低落时，不要急于追问原因，先给予温暖的陪伴。告诉孩子"无论发生什么，爸爸妈妈都在你身边"。',
    readTime: 5,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: '4',
    title: '家长自我关怀指南',
    category: '家长关怀',
    summary: '照顾孩子之前，先照顾好自己',
    content: '家长的情绪状态直接影响家庭氛围。学会自我关怀，保持良好的心态，才能更好地支持孩子。',
    readTime: 4,
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: '5',
    title: '如何利用星屿了解孩子',
    category: '使用指南',
    summary: '星屿家长端使用攻略，更好地关注孩子心理健康',
    content: '星屿家长端提供情绪概览、趋势分析等功能，帮助家长在尊重孩子隐私的前提下了解孩子的心理状态。',
    readTime: 3,
    createdAt: '2026-01-05T00:00:00Z',
  },
];

const mockEmergencyResources: EmergencyResource[] = [
  { type: 'hotline', name: '12355 青少年服务热线', phone: '12355' },
  { type: 'hotline', name: '希望24热线', phone: '400-161-9995' },
  { type: 'hospital', name: '市第一人民医院', address: '市中心大道123号', distance: '2.5km' },
  { type: 'hospital', name: '市精神卫生中心', address: '健康路456号', distance: '4.8km' },
  { type: 'teacher', name: '张老师（心理老师）', phone: '13900139000' },
];

/** 模拟历史聊天记录。 */
const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg1',
    userId: 'parent1',
    content: '大星你好，我想问问关于孩子情绪的问题',
    role: 'user',
    timestamp: '2026-07-15T10:00:00Z',
  },
  {
    id: 'msg2',
    userId: 'parent1',
    content: '你好呀！大星在这里陪着你。慢慢来，一切都会好起来的。关于孩子的情绪，大星很愿意听听你的想法。',
    role: 'assistant',
    timestamp: '2026-07-15T10:01:00Z',
  },
];

/**
 * 家长端 Zustand store Hook。
 *
 * 创建并导出家长端全局状态，包含初始空态与全部异步/同步操作实现，
 * 当前实现使用模拟数据与延时模拟网络请求。
 */
export const useParentStore = create<ParentState>((set) => ({
  children: [],
  currentChildId: null,
  emergencyAlert: null,
  moodTrend: [],
  moodSummary: null,
  knowledgeArticles: [],
  // 通知设置默认值：情绪异常/打卡提醒/应急预案开启，知识更新关闭
  notificationSettings: {
    moodAlert: true,
    checkinReminder: true,
    checkinThreshold: 7,
    knowledgeUpdate: false,
    emergencyAlert: true,
  },
  emergencyResources: [],
  chatMessages: [],
  isLoading: false,
  activeChatTopic: null,

  /** 拉取孩子绑定列表，延时后写入模拟数据并默认选中第一个孩子。 */
  fetchChildren: async (parentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ children: mockChildren, currentChildId: mockChildren[0]?.id, isLoading: false });
  },

  /** 切换当前选中的孩子 ID。 */
  selectChild: (childId) => {
    set({ currentChildId: childId });
  },

  /** 拉取情绪趋势，延时后写入模拟趋势数据。 */
  fetchMoodTrend: async (studentId, days) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ moodTrend: mockMoodTrend, isLoading: false });
  },

  /** 拉取情绪摘要，延时后写入模拟摘要。 */
  fetchMoodSummary: async (studentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ moodSummary: mockMoodSummary, isLoading: false });
  },

  /** 拉取知识库文章列表，延时后写入模拟文章。 */
  fetchKnowledgeArticles: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ knowledgeArticles: mockKnowledgeArticles, isLoading: false });
  },

  /** 拉取通知设置，延时后写入默认设置。 */
  fetchNotificationSettings: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set({
      notificationSettings: {
        moodAlert: true,
        checkinReminder: true,
        checkinThreshold: 7,
        knowledgeUpdate: false,
        emergencyAlert: true,
      },
    });
  },

  /** 更新通知设置，延时后写入新设置。 */
  updateNotificationSettings: async (settings) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set({ notificationSettings: settings });
  },

  /** 拉取紧急资源，延时后写入模拟资源。 */
  fetchEmergencyResources: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ emergencyResources: mockEmergencyResources, isLoading: false });
  },

  /** 拉取紧急预警，当前模拟为无预警。 */
  fetchEmergencyAlert: async (parentId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ emergencyAlert: null });
  },

  /** 确认紧急预警回执，将预警状态置为已确认并记录确认时间。 */
  confirmEmergencyAlert: async (alertId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set((state) => ({
      emergencyAlert: state.emergencyAlert ? { ...state.emergencyAlert, status: 'confirmed', confirmedAt: new Date().toISOString() } : null,
    }));
  },

  /**
   * 发送家长消息并模拟 AI 回复。
   *
   * 追加用户消息后，延时模拟 AI 思考，再追加一条固定的 AI 回复。
   */
  sendChatMessage: async (parentId, message) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 800));

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: parentId,
      content: message,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    // 模拟 AI 回复消息
    const replyMessages: ChatMessage[] = [
      {
        id: `reply-${Date.now()}`,
        userId: parentId,
        content: '大星理解你的感受。慢慢来，我们一起想想办法。',
        role: 'assistant',
        timestamp: new Date(Date.now() + 100).toISOString(),
      },
    ];

    set((state) => ({
      chatMessages: [...state.chatMessages, newMessage, ...replyMessages],
      isLoading: false,
    }));
  },

  /** 拉取历史聊天记录，延时后写入模拟消息。 */
  fetchChatHistory: async (parentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ chatMessages: mockChatMessages, isLoading: false });
  },

  /** 设置当前激活的聊天话题。 */
  setActiveChatTopic: (topic) => {
    set({ activeChatTopic: topic });
  },
}));