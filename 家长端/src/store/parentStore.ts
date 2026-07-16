import { create } from 'zustand';
import { ChildBinding, EmergencyAlert, KnowledgeArticle, NotificationSettings, EmergencyResource, MoodTrendData, MoodSummary, ChatMessage } from '../types';

interface ParentState {
  children: ChildBinding[];
  currentChildId: string | null;
  emergencyAlert: EmergencyAlert | null;
  moodTrend: MoodTrendData[];
  moodSummary: MoodSummary | null;
  knowledgeArticles: KnowledgeArticle[];
  notificationSettings: NotificationSettings;
  emergencyResources: EmergencyResource[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
  activeChatTopic: string | null;

  fetchChildren: (parentId: string) => Promise<void>;
  selectChild: (childId: string) => void;
  fetchMoodTrend: (studentId: string, days: number) => Promise<void>;
  fetchMoodSummary: (studentId: string) => Promise<void>;
  fetchKnowledgeArticles: () => Promise<void>;
  fetchNotificationSettings: () => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  fetchEmergencyResources: () => Promise<void>;
  fetchEmergencyAlert: (parentId: string) => Promise<void>;
  confirmEmergencyAlert: (alertId: string) => Promise<void>;
  sendChatMessage: (parentId: string, message: string) => Promise<void>;
  fetchChatHistory: (parentId: string) => Promise<void>;
  setActiveChatTopic: (topic: string | null) => void;
}

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

export const useParentStore = create<ParentState>((set) => ({
  children: [],
  currentChildId: null,
  emergencyAlert: null,
  moodTrend: [],
  moodSummary: null,
  knowledgeArticles: [],
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

  fetchChildren: async (parentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ children: mockChildren, currentChildId: mockChildren[0]?.id, isLoading: false });
  },

  selectChild: (childId) => {
    set({ currentChildId: childId });
  },

  fetchMoodTrend: async (studentId, days) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ moodTrend: mockMoodTrend, isLoading: false });
  },

  fetchMoodSummary: async (studentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ moodSummary: mockMoodSummary, isLoading: false });
  },

  fetchKnowledgeArticles: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ knowledgeArticles: mockKnowledgeArticles, isLoading: false });
  },

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

  updateNotificationSettings: async (settings) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set({ notificationSettings: settings });
  },

  fetchEmergencyResources: async () => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ emergencyResources: mockEmergencyResources, isLoading: false });
  },

  fetchEmergencyAlert: async (parentId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ emergencyAlert: null });
  },

  confirmEmergencyAlert: async (alertId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    set((state) => ({
      emergencyAlert: state.emergencyAlert ? { ...state.emergencyAlert, status: 'confirmed', confirmedAt: new Date().toISOString() } : null,
    }));
  },

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

  fetchChatHistory: async (parentId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ chatMessages: mockChatMessages, isLoading: false });
  },

  setActiveChatTopic: (topic) => {
    set({ activeChatTopic: topic });
  },
}));