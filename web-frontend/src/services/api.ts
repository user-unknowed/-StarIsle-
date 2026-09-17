/**
 * @file api.ts
 * @description 后端业务 API 调用层：按业务模块聚合请求函数，对接后端 Java API 网关 (8080) 与 AI 引擎 (8000)。
 *              包含认证、心情打卡、AI 对话、班级管理、知识库、家长端、风险检测、内容、测评、数据迁移与密钥管理。
 * @module web-frontend/services
 */
import { get, post, del, ApiError } from './http';
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

// ==================== 认证模块（对接 /api/v1/auth） ====================

/** 认证相关 API：登录、注册、第三方登录、手机号登录、短信验证码、获取用户信息 */
export const authApi = {
  /**
   * 账号密码登录
   * @param data - 登录请求体（账号/密码等）
   * @returns 登录响应（含 token 与用户信息）
   */
  login: (data: LoginRequest) =>
    post<LoginResponse>('/v1/auth/login', data),

  /**
   * 注册新账号
   * @param data - 注册请求体（账号/密码/昵称等）
   * @returns 登录响应（注册成功后直接返回登录态）
   */
  register: (data: RegisterRequest) =>
    post<LoginResponse>('/v1/auth/register', data),

  /**
   * 第三方登录（微信/QQ 等）
   * @param provider - 第三方提供商标识
   * @param openId - 第三方 openid
   * @param nickname - 可选昵称
   * @param avatar - 可选头像 URL
   * @returns 登录响应
   */
  loginWithThirdParty: (provider: string, openId: string, nickname?: string, avatar?: string) =>
    post<LoginResponse>('/v1/auth/third-party', { provider, openId, nickname, avatar }),

  /**
   * 手机号登录
   * @param phone - 手机号
   * @param code - 短信验证码
   * @returns 登录响应
   */
  loginWithPhone: (phone: string, code: string) =>
    post<LoginResponse>('/v1/auth/phone', { phone, code }),

  /**
   * 发送短信验证码
   * @param phone - 手机号
   * @returns 发送结果
   */
  sendSmsCode: (phone: string) =>
    post<{ success: boolean }>('/v1/auth/sms/send', { phone }),

  /**
   * 获取用户信息
   * @param userId - 用户 ID
   * @returns 用户详情
   */
  getProfile: (userId: string) =>
    get<User>(`/v1/users/${userId}`),
};

// ==================== 心情打卡模块（对接 /api/v1/mood） ====================

/** 心情打卡相关 API：提交心情记录、获取历史与统计 */
export const moodApi = {
  /**
   * 心情打卡
   * @param data - 打卡请求体（心情值、标签、备注等）
   * @returns 打卡响应（含连续天数、积分等）
   */
  checkin: (data: MoodCheckinRequest) =>
    post<MoodCheckinResponse>('/v1/mood/checkin', data),

  /**
   * 获取心情历史
   * @param userId - 用户 ID
   * @param days - 最近天数，默认 7 天
   * @returns 心情记录列表
   */
  getHistory: (userId: string, days = 7) =>
    get<MoodRecord[]>(`/v1/mood/history/${userId}?days=${days}`),

  /**
   * 获取心情统计
   * @param userId - 用户 ID
   * @returns 连续打卡天数与平均心情值
   */
  getStats: (userId: string) =>
    get<{ continuousDays: number; averageMood: number }>(`/v1/mood/stats?userId=${userId}`),
};

// ==================== AI 对话模块（对接 /api/v1/chat） ====================

/** AI 对话相关 API：发送消息、获取历史、获取话题卡片 */
export const chatApi = {
  /**
   * 发送消息（对接 AI 引擎 /chat 接口）
   * @param data - 对话请求体（含消息内容、用户 ID 等）
   * @returns AI 回复
   * @throws 消息超过 2000 字时抛出 ApiError
   */
  sendMessage: (data: ChatRequest) => {
    // 前端预校验：消息长度限制 2000 字，避免无效请求
    if (data.message.length > 2000) {
      throw new ApiError('消息长度不能超过2000字', 400, 'MESSAGE_TOO_LONG');
    }
    return post<ChatResponse>('/v1/chat/message', data);
  },

  /**
   * 获取对话历史
   * @param userId - 用户 ID
   * @param limit - 返回条数上限，默认 20
   * @returns 历史消息列表
   */
  getHistory: (userId: string, limit = 20) =>
    get<ChatMessage[]>(`/v1/chat/history/${userId}?limit=${limit}`),

  /**
   * 获取话题卡片（引导用户发起对话）
   * @returns 话题卡片列表
   */
  getTopics: () =>
    get<{ topics: TopicCard[] }>('/v1/chat/topics'),
};

// ==================== 班级管理模块（对接 /api/v1/classroom） ====================

/** 班级管理相关 API：班级统计、学生列表、预警列表 */
export const classroomApi = {
  /**
   * 获取班级统计
   * @param classId - 班级 ID
   * @returns 班级统计数据
   */
  getClassStats: (classId: string) =>
    get<ClassStats>(`/v1/classroom/${classId}/stats`),

  /**
   * 获取班级学生列表（含最近心情）
   * @param classId - 班级 ID
   * @returns 学生及心情数据列表
   */
  getStudents: (classId: string) =>
    get<StudentWithMood[]>(`/v1/classroom/${classId}/students`),

  /**
   * 获取班级预警列表
   * @param classId - 班级 ID
   * @returns 预警信息列表
   */
  getAlerts: (classId: string) =>
    get<Alert[]>(`/v1/classroom/${classId}/alerts`),
};

// ==================== 知识库模块（对接 AI 引擎 /api/v1/knowledge） ====================

/** 知识库相关 API：搜索、统计、分类列表 */
export const knowledgeApi = {
  /**
   * 搜索知识库（语义检索）
   * @param query - 查询文本
   * @param category - 可选分类过滤
   * @param topK - 返回结果数，默认 5
   * @returns 命中结果（标题、来源、分类、预览、技术、得分、匹配关键词）
   */
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
    }>('/v1/knowledge/search', { query, category, top_k: topK }),

  /**
   * 获取知识库统计
   * @returns 来源、文档总数、分类列表、运行模式
   */
  getStats: () =>
    get<{
      source: string;
      total_documents: number;
      categories: string[];
      mode: string;
    }>('/v1/knowledge/stats'),

  /**
   * 获取分类列表
   * @returns 分类数组与文档总数
   */
  getCategories: () =>
    get<{ categories: string[]; total_documents: number }>('/v1/knowledge/categories'),
};

// ==================== 家长端模块（对接 /api/v1/parents） ====================

/** 家长登录响应（含 token 与基础信息） */
export interface ParentLoginResponse {
  userId: string;    // 用户 ID
  nickname: string;  // 昵称
  phone: string;      // 手机号
  avatar?: string;    // 可选头像 URL
  token: string;      // JWT Token
}

/** 绑定孩子请求体 */
export interface BindChildRequest {
  studentId: string;        // 学生 ID
  studentNickname?: string; // 可选学生昵称
  bindType?: string;        // 可选绑定类型（如父亲/母亲）
}

/** 授权孩子绑定请求体 */
export interface AuthorizeChildRequest {
  authorized?: boolean; // 是否授权，默认 true
}

/** 家长端 API：注册、登录、绑定/解绑孩子、获取孩子心情、紧急告警、应急资源 */
export const parentApi = {
  /**
   * 家长注册
   * @param data - 手机号、密码、昵称
   * @returns 登录响应
   */
  register: (data: { phone: string; password: string; nickname: string }) =>
    post<ParentLoginResponse>('/v1/parents/register', data),

  /**
   * 家长登录
   * @param data - 手机号、密码
   * @returns 登录响应
   */
  login: (data: { phone: string; password: string }) =>
    post<ParentLoginResponse>('/v1/parents/login', data),

  /**
   * 获取当前家长信息（基于 Token）
   * @returns 家长用户对象
   */
  getMe: () =>
    get<ParentUser>('/v1/parents/me'),

  /**
   * 绑定孩子
   * @param data - 绑定请求体
   * @returns 绑定关系对象
   */
  bindStudent: (data: BindChildRequest) =>
    post<ChildBinding>('/v1/parents/children/bind', data),

  /**
   * 获取已绑定孩子列表
   * @returns 绑定关系列表
   */
  listChildren: () =>
    get<ChildBinding[]>('/v1/parents/children'),

  /**
   * 获取单个孩子绑定详情
   * @param bindingId - 绑定关系 ID
   * @returns 绑定关系对象
   */
  getChild: (bindingId: string) =>
    get<ChildBinding>(`/v1/parents/children/${bindingId}`),

  /**
   * 授权孩子绑定（学生端发起绑定后由家长确认）
   * @param bindingId - 绑定关系 ID
   * @param data - 授权请求体，默认授权
   * @returns 更新后的绑定关系
   */
  authorizeChild: (bindingId: string, data: AuthorizeChildRequest = {}) =>
    post<ChildBinding>(`/v1/parents/children/${bindingId}/authorize`, data),

  /**
   * 解除孩子绑定
   * @param bindingId - 绑定关系 ID
   * @returns 操作结果
   */
  unbindChild: (bindingId: string) =>
    del<{ success: boolean }>(`/v1/parents/children/${bindingId}`),

  /**
   * 获取孩子心情记录
   * @param bindingId - 绑定关系 ID
   * @param days - 最近天数，默认 7
   * @returns 心情记录列表
   */
  getChildMood: (bindingId: string, days = 7) =>
    get<MoodRecord[]>(`/v1/parents/children/${bindingId}/mood?days=${days}`),

  /**
   * 获取紧急告警（当孩子触发风险时下发）
   * @returns 告警对象或 null
   */
  getEmergencyAlert: () =>
    get<EmergencyAlert | null>('/v1/parents/emergency/alert'),

  /**
   * 确认告警（家长已知悉）
   * @param alertId - 告警 ID
   * @returns 更新后的告警对象
   */
  confirmAlert: (alertId: string) =>
    post<EmergencyAlert>(`/v1/parents/emergency/alert/${alertId}/confirm`),

  /**
   * 获取应急资源列表（热线、文章等）
   * @returns 应急资源列表
   */
  getEmergencyResources: () =>
    get<EmergencyResource[]>('/v1/parents/emergency/resources'),

  /**
   * 按类型获取应急资源
   * @param type - 资源类型
   * @returns 应急资源列表
   */
  getResourcesByType: (type: string) =>
    get<EmergencyResource[]>(`/v1/parents/emergency/resources/${type}`),
};

// ==================== 风险检测模块（对接 /api/v1/risk） ====================

/** 风险检测请求体 */
export interface RiskDetectRequest {
  userId: string;       // 用户 ID
  content: string;      // 待检测文本
  contentType?: string; // 可选内容类型
}

/** 风险检测响应（含风险等级、置信度、触发关键词、是否需干预） */
export interface RiskDetectResponse {
  user_id: string;             // 用户 ID
  risk_level: string;          // 风险等级
  confidence: number;          // 置信度 0~1
  triggered_keywords: string[];// 触发的关键词
  need_intervention: boolean;  // 是否需要人工干预
}

/** 危机事件上报请求体 */
export interface CrisisReportRequest {
  userId: string;       // 用户 ID
  riskLevel: string;    // 风险等级
  triggerType?: string; // 可选触发类型
}

/** 风险检测 API：文本风险检测、风险等级查询、危机热线、危机上报 */
export const riskApi = {
  /**
   * 风险文本检测
   * @param data - 检测请求体
   * @returns 风险检测结果
   */
  detect: (data: RiskDetectRequest) =>
    post<RiskDetectResponse>('/v1/risk/detect', {
      userId: data.userId,
      content: data.content,
      contentType: data.contentType,
    }),

  /**
   * 获取用户风险等级及历史
   * @param userId - 用户 ID
   * @returns 当前风险等级与历史变化
   */
  getLevel: (userId: string) =>
    get<RiskLevel & { history: Array<{ date: string; level: string }> }>(`/v1/risk/level/${userId}`),

  /**
   * 获取危机干预热线
   * @returns 热线列表（名称、号码、描述、服务时间）
   */
  getHotlines: () =>
    get<{ hotlines: Array<{ name: string; number: string; description: string; hours: string }> }>(
      '/v1/risk/crisis/hotlines'
    ),

  /**
   * 上报危机事件
   * @param data - 上报请求体
   * @returns 上报结果（是否已处理）
   */
  reportCrisis: (data: CrisisReportRequest) =>
    post<{ user_id: string; risk_level: string; handled: boolean }>('/v1/risk/crisis/report', {
      userId: data.userId,
      riskLevel: data.riskLevel,
      triggerType: data.triggerType,
    }),
};

// ==================== 内容模块（对接 /api/v1/content） ====================

/** 内容 API：冥想列表/详情、呼吸练习 */
export const contentApi = {
  /**
   * 获取冥想列表
   * @param category - 分类，默认 'all'
   * @returns 冥想列表（标题、时长、分类、音频地址、描述）
   */
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

  /**
   * 获取冥想详情（含引导脚本）
   * @param id - 冥想 ID
   * @returns 冥想详情
   */
  getMeditation: (id: string) =>
    get<{
      id: string;
      title: string;
      duration: number;
      audio_url: string;
      background_image: string;
      script: string;
    }>(`/v1/content/meditation/${id}`),

  /**
   * 获取呼吸练习配置
   * @param type - 呼吸类型（如 478/box/relax）
   * @returns 练习步骤、推荐时长、动画地址
   */
  getBreathing: (type: string) =>
    get<{
      type: string;
      steps: Array<{ name: string; duration: number; instruction: string }>;
      recommended_duration: number;
      animation_url: string;
    }>(`/v1/content/breathing/${type}`),
};

// ==================== 测评模块（对接 /api/v1/assessment） ====================

/** 测评提交请求体 */
export interface AssessmentSubmitRequest {
  userId: string;   // 用户 ID
  type: string;     // 测评类型（如 PHQ-9）
  answers: number[];// 选项序号数组
}

/** 测评 API：获取题目、提交答案、获取结果 */
export const assessmentApi = {
  /**
   * 获取测评题目
   * @param type - 测评类型
   * @returns 题目列表与元信息
   */
  getQuestions: (type: string) =>
    get<{
      type: string;
      title: string;
      description: string;
      questions: AssessmentQuestion[];
      total_questions: number;
    }>(`/v1/assessment/questions/${type}`),

  /**
   * 提交测评
   * @param data - 提交请求体
   * @returns 提交结果（消息、总分、结果 ID）
   */
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

  /**
   * 获取测评结果（含建议与推荐内容）
   * @param id - 结果 ID
   * @returns 测评结果与建议
   */
  getResult: (id: string) =>
    get<AssessmentResult & {
      description: string;
      suggestions: string[];
      recommendations: Array<{ type: string; id: string; title: string }>;
    }>(`/v1/assessment/result/${id}`),
};

// ==================== 数据迁移模块（管理员，对接 /api/migration） ====================

/** 数据迁移 API：执行迁移、验证一致性、计算校验和 */
export const migrationApi = {
  /**
   * 执行数据迁移
   * @returns 迁移结果
   */
  execute: () =>
    post<{ success: boolean; message?: string }>('/migration/execute'),

  /**
   * 验证数据一致性
   * @returns 一致性结果与详情
   */
  verify: () =>
    get<{ consistent: boolean; details?: Record<string, unknown> }>('/migration/verify'),

  /**
   * 计算表校验和（用于迁移前后比对）
   * @param tableName - 表名
   * @returns 校验和
   */
  checksum: (tableName: string) =>
    get<{ tableName: string; checksum: string }>(`/migration/checksum/${tableName}`),
};

// ==================== 密钥管理模块（管理员，对接 /api/migration/keys） ====================

/** 加密密钥信息 */
export interface EncryptionKey {
  version: string;     // 密钥版本
  active: boolean;     // 是否启用
  createdAt?: string;  // 创建时间
  [key: string]: unknown; // 其它扩展字段
}

/** 密钥管理 API：列表、查询、当前版本、轮换、新增、停用、加密测试 */
export const keyApi = {
  /**
   * 获取密钥列表
   * @returns 密钥信息列表
   */
  list: () =>
    get<EncryptionKey[]>('/migration/keys'),

  /**
   * 获取指定版本密钥信息
   * @param version - 密钥版本
   * @returns 密钥信息
   */
  get: (version: string) =>
    get<string>(`/migration/keys/${version}`),

  /**
   * 获取当前激活的密钥版本
   * @returns 当前版本
   */
  current: () =>
    get<string>('/migration/keys/current'),

  /**
   * 轮换密钥（生成新版本并切换激活）
   * @returns 新版本号
   */
  rotate: () =>
    post<string>('/migration/keys/rotate'),

  /**
   * 新增密钥版本
   * @param data - 可选版本号
   * @returns 新版本号
   */
  add: (data: { version?: string } = {}) =>
    post<string>('/migration/keys/add', data),

  /**
   * 停用密钥版本
   * @param version - 密钥版本
   * @returns 操作结果
   */
  delete: (version: string) =>
    del<string>(`/migration/keys/${version}`),

  /**
   * 加密测试（验证加解密一致性）
   * @param data - 待加密原文
   * @returns 原文、密文、解密结果、一致性标识
   */
  encryptTest: (data: { content: string }) =>
    post<{
      original: string;
      encrypted: string;
      decrypted: string;
      consistent: string;
    }>('/migration/encrypt/test', data),
};
