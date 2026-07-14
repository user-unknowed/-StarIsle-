export interface User {
  id: string;
  nickname: string;
  avatar: string;
  role: 'student' | 'teacher';
  ageGroup?: string;
  signature?: string;
  classId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodRecord {
  id: string;
  userId: string;
  moodLevel: number;
  tags: string[];
  checkinDate: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  riskLevel?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  classId: string;
  studentId: string;
  riskLevel: string;
  reason: string;
  createdAt: string;
  handled: boolean;
}

export interface StudentWithMood {
  id: string;
  nickname: string;
  avatar: string;
  latestMood?: number;
  riskLevel?: string;
  alert?: boolean;
}

export interface ClassStats {
  totalStudents: number;
  averageMood: number;
  alertCount: number;
  todayCheckinCount: number;
}

export interface Meditation {
  id: string;
  title: string;
  duration: number;
  category: string;
  audioUrl: string;
  description: string;
}

export interface BreathingExercise {
  type: string;
  steps: { name: string; duration: number; instruction: string }[];
  recommendedDuration: number;
}

export interface TopicCard {
  id: string;
  title: string;
  category: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  role: 'student' | 'teacher';
}

export interface RegisterRequest {
  nickname: string;
  password: string;
  role: 'student' | 'teacher';
  ageGroup?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MoodCheckinRequest {
  userId: string;
  moodLevel: number;
  tags?: string[];
}

export interface MoodCheckinResponse {
  message: string;
  checkinDate: string;
  continuousDays: number;
}

export interface ChatRequest {
  userId: string;
  message: string;
  context?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  riskLevel?: string;
  emotionTags?: string[];
  responseTimeMs: number;
}