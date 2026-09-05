/**
 * @file index.ts
 * @description 全局类型定义：包含用户、心情、对话、班级、家长端、风险、测评等核心业务实体的接口与类型，
 *              供 services、store、pages 等模块复用。
 * @module web-frontend/types
 */

/** 用户角色：学生 / 教师 / 家长 */
export type UserRole = 'student' | 'teacher' | 'parent';

/** 用户实体 */
export interface User {
  id: string;          // 用户 ID
  nickname: string;     // 昵称
  avatar: string;       // 头像 URL
  role: UserRole;       // 角色
  ageGroup?: string;    // 年龄段（学生专用，如「高一」）
  signature?: string;   // 个性签名
  classId?: string;     // 班级 ID（学生/教师）
  createdAt: string;    // 创建时间
  updatedAt: string;    // 更新时间
}

/** 心情打卡记录 */
export interface MoodRecord {
  id: string;           // 记录 ID
  userId: string;        // 用户 ID
  moodLevel: number;     // 心情等级 1~5
  tags: string[];        // 心情标签数组
  checkinDate: string;   // 打卡日期（YYYY-MM-DD）
  createdAt: string;     // 创建时间
}

/** AI 对话消息 */
export interface ChatMessage {
  id: string;             // 消息 ID
  userId: string;         // 用户 ID
  content: string;        // 消息内容
  role: 'user' | 'assistant'; // 角色：用户 / AI 助手
  timestamp: string;     // 时间戳
  riskLevel?: string;     // 风险等级（可选，AI 回复携带）
}

/** 通知实体 */
export interface Notification {
  id: string;       // 通知 ID
  userId: string;   // 接收用户 ID
  type: string;     // 通知类型
  title: string;    // 标题
  message: string;  // 内容
  read: boolean;     // 是否已读
  createdAt: string; // 创建时间
}

/** 班级实体 */
export interface Classroom {
  id: string;        // 班级 ID
  name: string;       // 班级名称
  teacherId: string;  // 班主任 ID
  createdAt: string;  // 创建时间
}

/** 班级预警 */
export interface Alert {
  id: string;         // 预警 ID
  classId: string;     // 班级 ID
  studentId: string;   // 学生 ID
  riskLevel: string;   // 风险等级
  reason: string;      // 预警原因
  createdAt: string;   // 创建时间
  handled: boolean;    // 是否已处理
}

/** 学生及最近心情（班级列表项） */
export interface StudentWithMood {
  id: string;              // 学生 ID
  nickname: string;         // 昵称
  avatar: string;           // 头像 URL
  latestMood?: number;       // 最近心情等级（可选）
  riskLevel?: string;        // 风险等级（可选）
  alert?: boolean;           // 是否告警（可选）
}

/** 班级统计 */
export interface ClassStats {
  totalStudents: number;      // 班级总人数
  averageMood: number;        // 平均心情值
  alertCount: number;         // 预警人数
  todayCheckinCount: number;   // 今日打卡人数
}

/** 冥想内容 */
export interface Meditation {
  id: string;            // 冥想 ID
  title: string;         // 标题
  duration: number;       // 时长（秒）
  category: string;       // 分类
  audioUrl: string;       // 音频地址
  description: string;    // 描述
}

/** 呼吸练习 */
export interface BreathingExercise {
  type: string;            // 类型（如 478/box/relax）
  steps: { name: string; duration: number; instruction: string }[]; // 步骤数组
  recommendedDuration: number; // 推荐时长（秒）
}

/** 话题卡片 */
export interface TopicCard {
  id: string;       // 话题 ID
  title: string;     // 话题标题
  category: string;  // 分类
}

/** 登录请求体 */
export interface LoginRequest {
  username: string;   // 用户名
  password: string;    // 密码
  role: UserRole;       // 角色
}

/** 注册请求体 */
export interface RegisterRequest {
  nickname: string;     // 昵称
  password: string;     // 密码
  role: UserRole;        // 角色
  ageGroup?: string;     // 年龄段（学生可选）
}

/** 登录响应 */
export interface LoginResponse {
  token: string;    // JWT Token
  user: User;        // 用户信息
}

/** 心情打卡请求体 */
export interface MoodCheckinRequest {
  userId: string;      // 用户 ID
  moodLevel: number;    // 心情等级 1~5
  tags?: string[];      // 心情标签（可选）
}

/** 心情打卡响应 */
export interface MoodCheckinResponse {
  message: string;          // 结果消息
  checkinDate: string;      // 打卡日期
  continuousDays: number;    // 连续打卡天数
}

/** AI 对话请求体 */
export interface ChatRequest {
  userId: string;             // 用户 ID
  message: string;             // 消息内容
  context?: ChatMessage[];     // 上下文消息（可选）
}

/** AI 对话响应 */
export interface ChatResponse {
  response: string;            // AI 回复内容
  riskLevel?: RiskLevelType;   // 风险等级（可选）
  emotionTags?: string[];      // 情绪标签（可选）
  responseTimeMs: number;       // 响应耗时（毫秒）
}

// ==================== 家长端类型 ====================

/** 家长用户 */
export interface ParentUser {
  id: string;         // 用户 ID
  username: string;    // 用户名
  nickname: string;    // 昵称
  phone: string;        // 手机号
  createdAt: string;   // 创建时间
}

/** 孩子绑定关系 */
export interface ChildBinding {
  bindingId: string;        // 绑定关系 ID
  studentId: string;        // 学生 ID
  studentNickname: string;  // 学生昵称
  studentAvatar: string;    // 学生头像
  authorized: boolean;      // 是否已授权
  createdAt: string;         // 创建时间
}

/** 紧急告警 */
export interface EmergencyAlert {
  alertId: string;       // 告警 ID
  studentId: string;     // 学生 ID
  level: RiskLevelType;  // 告警等级
  reason: string;         // 告警原因
  createdAt: string;      // 创建时间
  confirmed: boolean;     // 是否已确认
}

/** 应急资源 */
export interface EmergencyResource {
  id: string;       // 资源 ID
  type: string;      // 类型（hotline/hospital/community）
  title: string;     // 标题
  content: string;   // 内容描述
  contact: string;   // 联系方
  phone: string;     // 电话
}

/** 风险等级类型：绿 / 黄 / 橙 / 红 */
export type RiskLevelType = 'green' | 'yellow' | 'orange' | 'red';

/** 风险等级评估结果 */
export interface RiskLevel {
  userId: string;     // 用户 ID
  level: RiskLevelType; // 风险等级
  score: number;       // 风险评分
  reason: string;      // 评估原因
}

/** 测评题目 */
export interface AssessmentQuestion {
  id: string;       // 题目 ID
  text: string;      // 题干
  options: string[]; // 选项数组
}

/** 测评结果 */
export interface AssessmentResult {
  id: string;             // 结果 ID
  type: string;            // 测评类型
  score: number;            // 总分
  risk_level: string;       // 风险等级
  description: string;      // 描述
  suggestions: string[];    // 建议列表
}
