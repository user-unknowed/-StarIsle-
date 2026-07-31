/**
 * API 模块 - 各业务模块的 API 调用函数
 * 对接后端 Java API 网关 (8080) 和 AI 引擎 (8000)
 */
import { get, post, del } from './http';
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
  ParentUser,
  ChildBinding,
  EmergencyAlert,
  EmergencyResource,
  RiskLevel,
  AssessmentQuestion,
  AssessmentResult,
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

// ==================== 家长端模块（对接 /api/v1/parents） ====================

export interface ParentLoginResponse {
  userId: string;
  nickname: string;
  phone: string;
  avatar?: string;
  token: string;
}

export interface BindChildRequest {
  studentId: string;
  studentNickname?: string;
  bindType?: string;
}

export interface AuthorizeChildRequest {
  authorized?: boolean;
}

export const parentApi = {
  /** 家长注册 */
  register: (data: { phone: string; password: string; nickname: string }) =>
    post<ParentLoginResponse>('/v1/parents/register', data),

  /** 家长登录 */
  login: (data: { phone: string; password: string }) =>
    post<ParentLoginResponse>('/v1/parents/login', data),

  /** 获取当前家长信息 */
  getMe: () =>
    get<ParentUser>('/v1/parents/me'),

  /** 绑定孩子 */
  bindStudent: (data: BindChildRequest) =>
    post<ChildBinding>('/v1/parents/children/bind', data),

  /** 获取已绑定孩子列表 */
  listChildren: () =>
    get<ChildBinding[]>('/v1/parents/children'),

  /** 获取单个孩子绑定详情 */
  getChild: (bindingId: string) =>
    get<ChildBinding>(`/v1/parents/children/${bindingId}`),

  /** 授权孩子绑定 */
  authorizeChild: (bindingId: string, data: AuthorizeChildRequest = {}) =>
    post<ChildBinding>(`/v1/parents/children/${bindingId}/authorize`, data),

  /** 解除孩子绑定 */
  unbindChild: (bindingId: string) =>
    del<{ success: boolean }>(`/v1/parents/children/${bindingId}`),

  /** 获取孩子心情记录 */
  getChildMood: (bindingId: string, days = 7) =>
    get<MoodRecord[]>(`/v1/parents/children/${bindingId}/mood?days=${days}`),

  /** 获取紧急告警 */
  getEmergencyAlert: () =>
    get<EmergencyAlert | null>('/v1/parents/emergency/alert'),

  /** 确认告警 */
  confirmAlert: (alertId: string) =>
    post<EmergencyAlert>(`/v1/parents/emergency/alert/${alertId}/confirm`),

  /** 获取应急资源列表 */
  getEmergencyResources: () =>
    get<EmergencyResource[]>('/v1/parents/emergency/resources'),

  /** 按类型获取应急资源 */
  getResourcesByType: (type: string) =>
    get<EmergencyResource[]>(`/v1/parents/emergency/resources/${type}`),
};

// ==================== 风险检测模块（对接 /api/v1/risk） ====================

export interface RiskDetectRequest {
  userId: string;
  content: string;
  contentType?: string;
}

export interface RiskDetectResponse {
  user_id: string;
  risk_level: string;
  confidence: number;
  triggered_keywords: string[];
  need_intervention: boolean;
}

export interface CrisisReportRequest {
  userId: string;
  riskLevel: string;
  triggerType?: string;
}

export const riskApi = {
  /** 风险文本检测 */
  detect: (data: RiskDetectRequest) =>
    post<RiskDetectResponse>('/v1/risk/detect', {
      userId: data.userId,
      content: data.content,
      contentType: data.contentType,
    }),

  /** 获取用户风险等级 */
  getLevel: (userId: string) =>
    get<RiskLevel & { history: Array<{ date: string; level: string }> }>(`/v1/risk/level/${userId}`),

  /** 获取危机干预热线 */
  getHotlines: () =>
    get<{ hotlines: Array<{ name: string; number: string; description: string; hours: string }> }>(
      '/v1/risk/crisis/hotlines'
    ),

  /** 上报危机事件 */
  reportCrisis: (data: CrisisReportRequest) =>
    post<{ user_id: string; risk_level: string; handled: boolean }>('/v1/risk/crisis/report', {
      userId: data.userId,
      riskLevel: data.riskLevel,
      triggerType: data.triggerType,
    }),
};

// ==================== 内容模块（对接 /api/v1/content） ====================

export const contentApi = {
  /** 获取冥想列表 */
  getMeditations: (category = 'all') =>
    get<{
      category: string;
      meditations: Array<{
        id: string;
        title: string;
        duration: number;
        category: string;
        audio_url: string;
        description: string;
      }>;
    }>(`/v1/content/meditations?category=${category}`),

  /** 获取冥想详情 */
  getMeditation: (id: string) =>
    get<{
      id: string;
      title: string;
      duration: number;
      audio_url: string;
      background_image: string;
      script: string;
    }>(`/v1/content/meditation/${id}`),

  /** 获取呼吸练习 */
  getBreathing: (type: string) =>
    get<{
      type: string;
      steps: Array<{ name: string; duration: number; instruction: string }>;
      recommended_duration: number;
      animation_url: string;
    }>(`/v1/content/breathing/${type}`),
};

// ==================== 测评模块（对接 /api/v1/assessment） ====================

export interface AssessmentSubmitRequest {
  userId: string;
  type: string;
  answers: number[];
}

export const assessmentApi = {
  /** 获取测评题目 */
  getQuestions: (type: string) =>
    get<{
      type: string;
      title: string;
      description: string;
      questions: AssessmentQuestion[];
      total_questions: number;
    }>(`/v1/assessment/questions/${type}`),

  /** 提交测评 */
  submit: (data: AssessmentSubmitRequest) =>
    post<{
      message: string;
      user_id: string;
      total_score: number;
      result_id: string;
    }>('/v1/assessment/submit', {
      userId: data.userId,
      type: data.type,
      answers: data.answers,
    }),

  /** 获取测评结果 */
  getResult: (id: string) =>
    get<AssessmentResult & {
      description: string;
      suggestions: string[];
      recommendations: Array<{ type: string; id: string; title: string }>;
    }>(`/v1/assessment/result/${id}`),
};

// ==================== 数据迁移模块（管理员，对接 /api/migration） ====================

export const migrationApi = {
  /** 执行数据迁移 */
  execute: () =>
    post<{ success: boolean; message?: string }>('/migration/execute'),

  /** 验证数据一致性 */
  verify: () =>
    get<{ consistent: boolean; details?: Record<string, unknown> }>('/migration/verify'),

  /** 计算表校验和 */
  checksum: (tableName: string) =>
    get<{ tableName: string; checksum: string }>(`/migration/checksum/${tableName}`),
};

// ==================== 密钥管理模块（管理员，对接 /api/migration/keys） ====================

export interface EncryptionKey {
  version: string;
  active: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export const keyApi = {
  /** 获取密钥列表 */
  list: () =>
    get<EncryptionKey[]>('/migration/keys'),

  /** 获取指定版本密钥信息 */
  get: (version: string) =>
    get<string>(`/migration/keys/${version}`),

  /** 获取当前密钥版本 */
  current: () =>
    get<string>('/migration/keys/current'),

  /** 轮换密钥 */
  rotate: () =>
    post<string>('/migration/keys/rotate'),

  /** 新增密钥版本 */
  add: (data: { version?: string } = {}) =>
    post<string>('/migration/keys/add', data),

  /** 停用密钥版本 */
  delete: (version: string) =>
    del<string>(`/migration/keys/${version}`),

  /** 加密测试 */
  encryptTest: (data: { content: string }) =>
    post<{
      original: string;
      encrypted: string;
      decrypted: string;
      consistent: string;
    }>('/migration/encrypt/test', data),
};
