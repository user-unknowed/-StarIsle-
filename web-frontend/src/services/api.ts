/**
 * API 模块 - 各业务模块的 API 调用函数
 * 对接后端 Java API 网关 (8080) 和 AI 引擎 (8000)
 */
import { get, post } from './http';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  MoodRecord,
  MoodCheckinRequest,
  MoodCheckinResponse,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  TopicCard,
  StudentWithMood,
  ClassStats,
  Alert,
} from '../types';

// ==================== 认证模块 ====================

export const authApi = {
  /** 账号密码登录 */
  login: (data: LoginRequest) =>
    post<LoginResponse>('/auth/login', data),

  /** 注册 */
  register: (data: RegisterRequest) =>
    post<LoginResponse>('/auth/register', data),

  /** 第三方登录 */
  loginWithThirdParty: (provider: string, openId: string, nickname?: string, avatar?: string) =>
    post<LoginResponse>('/auth/third-party', { provider, openId, nickname, avatar }),

  /** 手机号登录 */
  loginWithPhone: (phone: string, code: string) =>
    post<LoginResponse>('/auth/phone', { phone, code }),

  /** 发送短信验证码 */
  sendSmsCode: (phone: string) =>
    post<{ success: boolean }>('/auth/sms/send', { phone }),

  /** 获取用户信息 */
  getProfile: (userId: string) =>
    get<User>(`/users/${userId}`),
};

// ==================== 心情打卡模块 ====================

export const moodApi = {
  /** 心情打卡 */
  checkin: (data: MoodCheckinRequest) =>
    post<MoodCheckinResponse>('/mood/checkin', data),

  /** 获取心情历史 */
  getHistory: (userId: string, days = 7) =>
    get<MoodRecord[]>(`/mood/history?userId=${userId}&days=${days}`),

  /** 获取心情统计 */
  getStats: (userId: string) =>
    get<{ continuousDays: number; averageMood: number }>(`/mood/stats?userId=${userId}`),
};

// ==================== AI 对话模块 ====================

export const chatApi = {
  /** 发送消息（对接 AI 引擎 /chat 接口） */
  sendMessage: (data: ChatRequest) =>
    post<ChatResponse>('/chat', data),

  /** 获取对话历史 */
  getHistory: (userId: string, limit = 20) =>
    get<ChatMessage[]>(`/chat/history?userId=${userId}&limit=${limit}`),

  /** 获取话题卡片 */
  getTopics: () =>
    get<{ topics: TopicCard[] }>('/topics'),
};

// ==================== 班级管理模块 ====================

export const classroomApi = {
  /** 获取班级统计 */
  getClassStats: (classId: string) =>
    get<ClassStats>(`/classroom/${classId}/stats`),

  /** 获取班级学生列表 */
  getStudents: (classId: string) =>
    get<StudentWithMood[]>(`/classroom/${classId}/students`),

  /** 获取预警列表 */
  getAlerts: (classId: string) =>
    get<Alert[]>(`/classroom/${classId}/alerts`),
};

// ==================== 知识库模块（对接 AI 引擎） ====================

export const knowledgeApi = {
  /** 搜索知识库 */
  search: (query: string, category?: string, topK = 5) =>
    post<{
      query: string;
      total_results: number;
      results: Array<{
        title: string;
        source: string;
        category: string;
        content_preview: string;
        techniques: string[];
        score: number;
        matched_keywords: string[];
      }>;
    }>('/knowledge/search', { query, category, top_k: topK }),

  /** 获取知识库统计 */
  getStats: () =>
    get<{
      source: string;
      total_documents: number;
      categories: string[];
      mode: string;
    }>('/knowledge/stats'),

  /** 获取分类列表 */
  getCategories: () =>
    get<{ categories: string[]; total_documents: number }>('/knowledge/categories'),
};
