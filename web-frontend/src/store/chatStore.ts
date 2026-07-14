import { create } from 'zustand';
import { ChatMessage, TopicCard } from '../types';

interface ChatState {
  messages: ChatMessage[];
  topics: TopicCard[];
  isTyping: boolean;
  inputValue: string;
  isLoading: boolean;

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

  fetchMessages: async (userId) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ messages: mockMessages, isLoading: false });
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

    await new Promise(resolve => setTimeout(resolve, 1500));

    const responses = [
      '小星听到了。听起来你今天有点低落呢...要和小星聊聊吗？',
      '抱抱～小星在这里陪着你。',
      '嗯，我懂你的感受。有时候事情确实会让人觉得很难。',
      '谢谢你愿意和小星分享这些。你很勇敢呢。',
      '小星觉得你已经做得很好了。慢慢来，不着急。',
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
    }));
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