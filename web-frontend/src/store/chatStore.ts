import { create } from 'zustand';
import { ChatMessage, TopicCard } from '../types';
import { chatApi } from '../services/api';
import { riskApi } from '../services/api';
import { ApiError } from '../services/http';

interface ChatState {
  messages: ChatMessage[];
  topics: TopicCard[];
  isTyping: boolean;
  inputValue: string;
  isLoading: boolean;
  isUsingMockData: boolean;

  fetchMessages: (userId: string) => Promise<void>;
  sendMessage: (userId: string, content: string) => Promise<void>;
  selectTopic: (topic: TopicCard) => void;
  setInputValue: (value: string) => void;
  clearMessages: () => void;
}

const mockTopics: TopicCard[] = [
  { id: 'topic_1', title: '聊聊最近的压力', category: '学业' },
  { id: 'topic_2', title: '关于朋友的事', category: '人际' },
  { id: 'topic_3', title: '未来让我有点焦虑', category: '未来' },
  { id: 'topic_4', title: '和家人相处', category: '家庭' },
  { id: 'topic_5', title: '没有什么特别的事，就是有点闷', category: '日常' },
];

const mockMessages: ChatMessage[] = [
  { id: '1', userId: 'student1', content: '今天感觉不太好', role: 'user', timestamp: '2026-07-14T10:00:00Z' },
  { id: '2', userId: 'student1', content: '小星听到了。听起来你今天有点低落呢...要和小星聊聊吗？', role: 'assistant', timestamp: '2026-07-14T10:00:02Z' },
];

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  topics: mockTopics,
  isTyping: false,
  inputValue: '',
  isLoading: false,
  isUsingMockData: false,

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

  sendMessage: async (userId, content) => {
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

      const responses = [
        '小星听到了呀～听起来你今天有点低落呢。',
        '抱抱～小星在这里陪着你呢。',
        '小星懂你呀～有时候确实有点难呢。',
        '谢谢你愿意和小星分享这些呀。你很勇敢呢～',
        '小星觉得你已经做得很好啦。慢慢来，不着急呢～',
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      set((state) => ({
        messages: [...state.messages, {
          id: `msg-${Date.now()}`,
          userId,
          content: randomResponse,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        }],
        isTyping: false,
        isUsingMockData: true,
      }));
    }
  },

  selectTopic: (topic) => {
    set({ inputValue: topic.title });
  },

  setInputValue: (value) => {
    set({ inputValue: value });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
