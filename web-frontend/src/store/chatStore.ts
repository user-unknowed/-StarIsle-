/**
 * @file chatStore.ts
 * @description AI 对话 store：管理消息列表、话题卡片、输入态、AI 回复中状态等，
 *              支持历史拉取、消息发送、风险检测联动上报；API 不可用时降级到 mock 回复，
 *              并对危机关键词做前端兜底检测。
 * @module web-frontend/store
 */
import { create } from 'zustand';
import { ChatMessage, TopicCard } from '../types';
import { chatApi } from '../services/api';
import { riskApi } from '../services/api';
import { ApiError } from '../services/http';

// 危机关键词：命中时 mock 回复需附带 riskLevel: 'red'
const crisisKeywords = ['自杀', '不想活', '想死', '结束生命', '轻生'];

/** AI 对话 store 状态 */
interface ChatState {
  messages: ChatMessage[];          // 消息列表
  topics: TopicCard[];              // 话题卡片
  isTyping: boolean;                 // AI 是否正在输入
  inputValue: string;               // 输入框内容
  isLoading: boolean;                // 是否加载中
  isUsingMockData: boolean;          // 是否使用 mock 数据

  fetchMessages: (userId: string) => Promise<void>;                // 拉取历史消息
  sendMessage: (userId: string, content: string) => Promise<void>; // 发送消息
  selectTopic: (topic: TopicCard) => void;                          // 选择话题（填充到输入框）
  setInputValue: (value: string) => void;                          // 设置输入框值
  clearMessages: () => void;                                        // 清空消息
}

// Mock 话题卡片
const mockTopics: TopicCard[] = [
  { id: 'topic_1', title: '聊聊最近的压力', category: '学业' },
  { id: 'topic_2', title: '关于朋友的事', category: '人际' },
  { id: 'topic_3', title: '未来让我有点焦虑', category: '未来' },
  { id: 'topic_4', title: '和家人相处', category: '家庭' },
  { id: 'topic_5', title: '没有什么特别的事，就是有点闷', category: '日常' },
];

// Mock 历史消息
const mockMessages: ChatMessage[] = [
  { id: '1', userId: 'student1', content: '今天感觉不太好', role: 'user', timestamp: '2026-07-14T10:00:00Z' },
  { id: '2', userId: 'student1', content: '小星听到了。听起来你今天有点低落呢...要和小星聊聊吗？', role: 'assistant', timestamp: '2026-07-14T10:00:02Z' },
];

/**
 * AI 对话 store
 */
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  topics: mockTopics,
  isTyping: false,
  inputValue: '',
  isLoading: false,
  isUsingMockData: false,

  /**
   * 拉取历史消息：API 失败时降级为空列表并标记 mock
   * @param userId - 用户 ID
   */
  fetchMessages: async (userId) => {
    set({ isLoading: true });
    try {
      const messages = await chatApi.getHistory(userId);
      set({ messages, isLoading: false, isUsingMockData: false });
    } catch (error) {
      console.warn(
        '[chatStore] fetchMessages 调用失败，降级使用 mock 数据:',
        error instanceof ApiError ? `${error.message} (status: ${error.status})` : error
      );
      set({ messages: [], isLoading: false, isUsingMockData: true });
    }
  },

  /**
   * 发送消息：先插入用户消息，再调用 AI 获取回复；
   *          API 失败时降级到 mock 回复（含危机关键词检测与上报）。
   * @param userId - 用户 ID
   * @param content - 消息内容
   */
  sendMessage: async (userId, content) => {
    // 立即插入用户消息并设置 AI 输入中状态
    set((state) => ({
      messages: [...state.messages, {
        id: `msg-${Date.now()}`,
        userId,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
      }],
      isTyping: true,
      inputValue: '',
    }));

    try {
      const data = await chatApi.sendMessage({ userId, message: content });

      // 如果检测到高风险，上报危机事件
      if (data.riskLevel === 'red' || data.riskLevel === 'orange') {
        try {
          await riskApi.reportCrisis({ userId, riskLevel: data.riskLevel, triggerType: 'chat' });
        } catch {
          // 上报失败不影响主流程
        }
      }

      // 插入 AI 回复并解除输入中状态
      set((state) => ({
        messages: [...state.messages, {
          id: `msg-${Date.now()}`,
          userId,
          content: data.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          riskLevel: data.riskLevel,
        }],
        isTyping: false,
        isUsingMockData: false,
      }));
    } catch (error) {
      console.warn(
        '[chatStore] sendMessage 调用失败，降级使用 mock 回复:',
        error instanceof ApiError ? `${error.message} (status: ${error.status})` : error
      );

      // 测试用：模拟 AI 回复延迟（通过 localStorage.__test_ai_delay 控制毫秒数）
      const testAiDelay = typeof localStorage !== 'undefined' && localStorage.getItem('__test_ai_delay');
      await new Promise(resolve => setTimeout(resolve, testAiDelay ? parseInt(testAiDelay) : 1500));

      // 危机关键词检测：命中时返回危机干预回复并标记 riskLevel: 'red'
      const hitCrisis = crisisKeywords.some((kw) => content.includes(kw));

      let mockResponse: string;
      let riskLevel: string | undefined;

      if (hitCrisis) {
        // 命中危机关键词：返回干预话术并上报危机事件
        mockResponse =
          '小星听到你这么说很担心你。你的感受很重要，请一定保护好自己。如果你愿意，可以拨打 24 小时心理援助热线 400-161-9995，或者和身边信任的人说一说。小星一直在这里陪你。';
        riskLevel = 'red';

        try {
          await riskApi.reportCrisis({ userId, riskLevel: 'red', triggerType: 'chat' });
        } catch {
          // 上报失败不影响主流程
        }
      } else {
        // 普通场景：随机挑选一句 mock 回复
        const responses = [
          '小星听到了呀～听起来你今天有点低落呢。',
          '抱抱～小星在这里陪着你呢。',
          '小星懂你呀～有时候确实有点难呢。',
          '谢谢你愿意和小星分享这些呀。你很勇敢呢～',
          '小星觉得你已经做得很好啦。慢慢来，不着急呢～',
        ];
        mockResponse = responses[Math.floor(Math.random() * responses.length)];
        // 随机为部分回复附加低风险标记，保持风险检测链路可用
        riskLevel = Math.random() < 0.3 ? 'green' : undefined;
      }

      set((state) => ({
        messages: [...state.messages, {
          id: `msg-${Date.now()}`,
          userId,
          content: mockResponse,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          riskLevel,
        }],
        isTyping: false,
        isUsingMockData: true,
      }));
    }
  },

  /**
   * 选择话题：将话题标题填入输入框
   * @param topic - 话题卡片
   */
  selectTopic: (topic) => {
    set({ inputValue: topic.title });
  },

  /**
   * 设置输入框值
   * @param value - 输入框值
   */
  setInputValue: (value) => {
    set({ inputValue: value });
  },

  /** 清空消息列表 */
  clearMessages: () => {
    set({ messages: [] });
  },
}));
