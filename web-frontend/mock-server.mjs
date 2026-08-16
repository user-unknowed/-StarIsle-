import http from 'node:http';
import url from 'node:url';
import crypto from 'node:crypto';

const PORT = 3001;
const HOST = '0.0.0.0';

// ============ 关键词与预设回复 ============
const CRISIS_KEYWORDS = ['自杀', '不想活', '想死', '结束生命', '轻生', '自伤', '了结', '消失', '活不下去', '一了百了'];
const MID_RISK_KEYWORDS = ['焦虑', '压力', '孤独', '失眠', '低落', '抑郁', '害怕', '担心', '紧张', '烦躁'];
const PRESET_REPLIES = [
  '我在听，能多和我说说吗？',
  '听起来你今天有些感受，愿意分享更多吗？',
  '谢谢你告诉我，这种感觉是很正常的',
  '我理解，这确实不容易',
  '你不是一个人，我会一直在这里',
  '今天发生了什么让你有这样的感受呢？',
  '让我们一起想想办法',
];
const CRISIS_REPLY = '我注意到你提到了一些让我担心的内容。你的感受很重要，请立即拨打24小时心理危机热线：400-161-9995。你不是一个人，有人愿意帮助你。';

function randomReply() {
  return PRESET_REPLIES[Math.floor(Math.random() * PRESET_REPLIES.length)];
}

function nowISO() {
  return new Date().toISOString();
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function detectCrisis(text = '') {
  return CRISIS_KEYWORDS.some((k) => text.includes(k));
}

function detectMidRisk(text = '') {
  return MID_RISK_KEYWORDS.filter((k) => text.includes(k));
}

// ============ 内置用户数据库 ============
const users = {
  student1: { id: 'student1', nickname: '小明同学', avatar: '', role: 'student', ageGroup: '高一', signature: '每天都要开心', classId: 'class1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  teacher1: { id: 'teacher1', nickname: '李老师', avatar: '', role: 'teacher', signature: '关注每一个孩子的成长', classId: 'class1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  parent1: { id: 'parent1', nickname: '王爸爸', avatar: '', role: 'parent', signature: '陪伴是最长情的告白', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
};

// 家长孩子绑定
const parentBindings = [
  { bindingId: 'b1', studentId: 'student1', studentNickname: '小明同学', authorized: true, boundAt: '2026-01-01T00:00:00Z' },
  { bindingId: 'b2', studentId: 's3', studentNickname: '小刚同学', authorized: true, boundAt: '2026-01-02T00:00:00Z' },
];

let emergencyAlert = {
  alertId: 'a1',
  studentId: 'student1',
  studentNickname: '小明同学',
  level: 'orange',
  reason: '连续3天心情低落',
  triggeredAt: nowISO(),
  confirmed: false,
};

const emergencyResources = [
  { id: 'r1', type: 'hotline', name: '12355青少年服务热线', contact: '12355', description: '青少年心理咨询', hours: '24小时' },
  { id: 'r2', type: 'hotline', name: '希望24热线', contact: '400-161-9995', description: '心理危机干预', hours: '24小时' },
  { id: 'r3', type: 'hospital', name: '北京心理危机研究与干预中心', contact: '010-82951332', description: '专业心理危机干预', hours: '24小时' },
  { id: 'r4', type: 'community', name: '学校心理咨询中心', contact: '咨询教务处', description: '校内心理辅导', hours: '工作日9-17点' },
  { id: 'r5', type: 'community', name: '社区心理服务站', contact: '咨询所在社区', description: '社区心理服务', hours: '工作日9-17点' },
  { id: 'r6', type: 'community', name: '12320卫生热线', contact: '12320', description: '卫生健康咨询', hours: '24小时' },
];

// ============ 辅助函数 ============
function sendJson(res, data, status = 200, message = 'success') {
  const body = JSON.stringify({ code: 0, message, data });
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function sendError(res, message, status = 400) {
  const body = JSON.stringify({ code: 1, message, data: null });
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// 路由匹配：route 形如 '/api/v1/users/:userId'
function matchRoute(pattern, pathname) {
  const pParts = pattern.split('/').filter(Boolean);
  const aParts = pathname.split('/').filter(Boolean);
  if (pParts.length !== aParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    const p = pParts[i];
    const a = aParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

// ============ 路由表 ============
// 每条: { method, pattern, handler: async (req, res, params, query, body) => {} }
const routes = [
  // 健康检查
  { method: 'GET', pattern: '/api/health', handler: async () => ({ status: 'ok', timestamp: nowISO() }) },

  // ============ 认证模块 ============
  {
    method: 'POST', pattern: '/api/v1/auth/login',
    handler: async (req, res, params, query, body) => {
      const { username, role } = body || {};
      const u = users[username];
      if (!u) return sendError(res, '用户不存在', 400);
      if (role && u.role !== role) return sendError(res, '角色不匹配', 400);
      return { token: 'mock-jwt-' + username, user: u };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/auth/register',
    handler: async (req, res, params, query, body) => {
      const { nickname, role, ageGroup } = body || {};
      const id = 'user-' + Date.now();
      const u = {
        id, nickname: nickname || '新用户', avatar: '', role: role || 'student',
        ageGroup: ageGroup || '', signature: '', createdAt: nowISO(), updatedAt: nowISO(),
      };
      users[nickname] = u;
      return { token: 'mock-jwt-' + id, user: u };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/auth/third-party',
    handler: async (req, res, params, query, body) => {
      const { provider, openId, nickname, avatar } = body || {};
      void provider;
      return {
        token: 'mock-jwt-' + openId,
        user: { id: openId, nickname: nickname || '用户', avatar: avatar || '', role: 'student', ageGroup: '', signature: '', createdAt: nowISO(), updatedAt: nowISO() },
      };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/auth/phone',
    handler: async (req, res, params, query, body) => {
      const { phone } = body || {};
      return {
        token: 'mock-jwt-' + phone,
        user: { id: phone, nickname: phone, avatar: '', role: 'student', ageGroup: '', signature: '', createdAt: nowISO(), updatedAt: nowISO() },
      };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/auth/sms/send',
    handler: async () => ({ success: true }),
  },
  {
    method: 'GET', pattern: '/api/v1/users/:userId',
    handler: async (req, res, params) => {
      const u = users[params.userId];
      return u ? u : null;
    },
  },

  // ============ 心情模块 ============
  {
    method: 'POST', pattern: '/api/v1/mood/checkin',
    handler: async (req, res, params, query, body) => {
      return { message: '心情打卡成功', checkinDate: todayStr(), continuousDays: 5 };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/mood/history/:userId',
    handler: async (req, res, params, query) => {
      const days = parseInt(query.days || '7', 10);
      const arr = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = dateNDaysAgo(i);
        arr.push({
          id: 'm' + (days - i),
          userId: params.userId,
          moodLevel: 2 + Math.floor(Math.random() * 4),
          tags: ['学习压力'],
          checkinDate: date,
          createdAt: date + 'T08:00:00Z',
        });
      }
      return arr;
    },
  },
  {
    method: 'GET', pattern: '/api/v1/mood/stats',
    handler: async (req, res, params, query) => {
      return { continuousDays: 5, averageMood: 3.6 };
    },
  },

  // ============ AI 对话模块 ============
  {
    method: 'POST', pattern: '/api/v1/chat/message',
    handler: async (req, res, params, query, body) => {
      const message = (body && body.message) || '';
      if (detectCrisis(message)) {
        return {
          response: CRISIS_REPLY,
          riskLevel: 'red',
          emotionTags: ['危机'],
          responseTimeMs: 800,
        };
      }
      const green = Math.random() < 0.3;
      return {
        response: randomReply(),
        riskLevel: green ? 'green' : 'green',
        emotionTags: ['平静'],
        responseTimeMs: 200 + Math.floor(Math.random() * 600),
      };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/chat/history/:userId',
    handler: async (req, res, params, query) => {
      const limit = parseInt(query.limit || '20', 10);
      void limit;
      const base = new Date();
      const iso = (offsetMin) => new Date(base.getTime() - offsetMin * 60000).toISOString();
      return [
        { id: '1', userId: params.userId, content: '今天感觉不太好', role: 'user', timestamp: iso(60) },
        { id: '2', userId: params.userId, content: '小星听到了，能多和我说说吗？', role: 'assistant', timestamp: iso(58) },
        { id: '3', userId: params.userId, content: '最近学习压力有点大', role: 'user', timestamp: iso(40) },
        { id: '4', userId: params.userId, content: '我理解，这确实不容易，你不是一个人。', role: 'assistant', timestamp: iso(38) },
      ];
    },
  },
  {
    method: 'GET', pattern: '/api/v1/chat/topics',
    handler: async () => ({
      topics: [
        { id: 't1', title: '考试焦虑', category: '学习', icon: 'book' },
        { id: 't2', title: '人际关系', category: '社交', icon: 'users' },
        { id: 't3', title: '情绪低落', category: '情绪', icon: 'cloud' },
        { id: 't4', title: '睡眠问题', category: '健康', icon: 'moon' },
        { id: 't5', title: '自我认同', category: '成长', icon: 'star' },
      ],
    }),
  },

  // ============ 班级管理模块 ============
  {
    method: 'GET', pattern: '/api/v1/classroom/:classId/stats',
    handler: async () => ({ totalStudents: 45, averageMood: 3.6, alertCount: 3, todayCheckinCount: 38 }),
  },
  {
    method: 'GET', pattern: '/api/v1/classroom/:classId/students',
    handler: async () => [
      { id: 's1', nickname: '小明同学', avatar: '', latestMood: 2, riskLevel: 'yellow', alert: true },
      { id: 's2', nickname: '小红同学', avatar: '', latestMood: 4, riskLevel: 'green', alert: false },
      { id: 's3', nickname: '小刚同学', avatar: '', latestMood: 1, riskLevel: 'red', alert: true },
      { id: 's4', nickname: '小丽同学', avatar: '', latestMood: 3, riskLevel: 'green', alert: false },
      { id: 's5', nickname: '小华同学', avatar: '', latestMood: 2, riskLevel: 'orange', alert: true },
      { id: 's6', nickname: '小芳同学', avatar: '', latestMood: 5, riskLevel: 'green', alert: false },
      { id: 's7', nickname: '小军同学', avatar: '', latestMood: 3, riskLevel: 'yellow', alert: false },
      { id: 's8', nickname: '小娟同学', avatar: '', latestMood: 4, riskLevel: 'green', alert: false },
    ],
  },
  {
    method: 'GET', pattern: '/api/v1/classroom/:classId/alerts',
    handler: async (req, res, params) => [
      { alertId: 'al1', studentId: 's3', studentNickname: '小刚同学', level: 'red', reason: '检测到危机关键词', triggeredAt: nowISO() },
      { alertId: 'al2', studentId: 's5', studentNickname: '小华同学', level: 'orange', reason: '连续3天心情低落', triggeredAt: nowISO() },
      { alertId: 'al3', studentId: 's1', studentNickname: '小明同学', level: 'yellow', reason: '心情波动较大', triggeredAt: nowISO() },
    ],
  },

  // ============ 知识库模块 ============
  {
    method: 'POST', pattern: '/api/v1/knowledge/search',
    handler: async (req, res, params, query, body) => {
      const q = (body && body.query) || '';
      return {
        query: q,
        total_results: 2,
        results: [
          { title: '认知行为疗法基础', source: '心理咨询笔记', category: 'CBT', content_preview: '认知行为疗法（CBT）是一种通过改变思维模式来改善情绪的方法...', techniques: ['认知重构', '行为激活'], score: 0.85, matched_keywords: ['焦虑'] },
          { title: '正念减压练习', source: '心理健康手册', category: '正念', content_preview: '正念减压通过有意识地觉察当下，减少压力反应...', techniques: ['呼吸觉察', '身体扫描'], score: 0.78, matched_keywords: ['压力'] },
        ],
      };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/knowledge/stats',
    handler: async () => ({ source: 'mock', total_documents: 5, categories: ['CBT', '正念', '情绪调节', '人际关系'], mode: 'keyword' }),
  },
  {
    method: 'GET', pattern: '/api/v1/knowledge/categories',
    handler: async () => ({ categories: ['CBT', '正念', '情绪调节', '人际关系', '自我成长'], total_documents: 5 }),
  },

  // ============ 家长端模块 ============
  {
    method: 'POST', pattern: '/api/v1/parents/register',
    handler: async (req, res, params, query, body) => {
      const { phone, nickname } = body || {};
      return { userId: 'parent-' + phone, nickname: nickname || '家长', phone, avatar: '', token: 'mock-jwt-parent-' + phone };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/parents/login',
    handler: async (req, res, params, query, body) => {
      const { phone } = body || {};
      return { userId: 'parent1', nickname: '王爸爸', phone, avatar: '', token: 'mock-jwt-parent1' };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/parents/me',
    handler: async () => ({ id: 'parent1', username: 'parent1', nickname: '王爸爸', phone: '138****8888', avatar: '' }),
  },
  {
    method: 'POST', pattern: '/api/v1/parents/children/bind',
    handler: async (req, res, params, query, body) => {
      const { studentId, studentNickname } = body || {};
      return { bindingId: 'b-' + Date.now(), studentId, studentNickname: studentNickname || '孩子', authorized: true, boundAt: nowISO() };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/parents/children',
    handler: async () => parentBindings,
  },
  {
    method: 'GET', pattern: '/api/v1/parents/children/:bindingId',
    handler: async (req, res, params) => {
      const b = parentBindings.find((x) => x.bindingId === params.bindingId);
      return b || null;
    },
  },
  {
    method: 'POST', pattern: '/api/v1/parents/children/:bindingId/authorize',
    handler: async (req, res, params, query, body) => {
      const b = parentBindings.find((x) => x.bindingId === params.bindingId);
      if (b && body && typeof body.authorized === 'boolean') b.authorized = body.authorized;
      return b || null;
    },
  },
  {
    method: 'DELETE', pattern: '/api/v1/parents/children/:bindingId',
    handler: async (req, res, params) => {
      const idx = parentBindings.findIndex((x) => x.bindingId === params.bindingId);
      if (idx >= 0) parentBindings.splice(idx, 1);
      return { success: true };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/parents/children/:bindingId/mood',
    handler: async (req, res, params, query) => {
      const days = parseInt(query.days || '7', 10);
      const arr = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = dateNDaysAgo(i);
        arr.push({
          id: 'pm' + (days - i),
          moodLevel: 2 + Math.floor(Math.random() * 3),
          checkinDate: date,
          createdAt: date + 'T08:00:00Z',
        });
      }
      return arr;
    },
  },
  {
    method: 'GET', pattern: '/api/v1/parents/emergency/alert',
    handler: async () => emergencyAlert,
  },
  {
    method: 'POST', pattern: '/api/v1/parents/emergency/alert/:alertId/confirm',
    handler: async (req, res, params) => {
      if (emergencyAlert && emergencyAlert.alertId === params.alertId) {
        emergencyAlert.confirmed = true;
      }
      return emergencyAlert;
    },
  },
  {
    method: 'GET', pattern: '/api/v1/parents/emergency/resources',
    handler: async () => emergencyResources,
  },
  {
    method: 'GET', pattern: '/api/v1/parents/emergency/resources/:type',
    handler: async (req, res, params) => emergencyResources.filter((r) => r.type === params.type),
  },

  // ============ 风险检测模块 ============
  {
    method: 'POST', pattern: '/api/v1/risk/detect',
    handler: async (req, res, params, query, body) => {
      const userId = (body && body.userId) || '';
      const content = (body && body.content) || '';
      if (detectCrisis(content)) {
        const triggered = CRISIS_KEYWORDS.filter((k) => content.includes(k));
        return { user_id: userId, risk_level: 'red', confidence: 0.95, triggered_keywords: triggered, need_intervention: true };
      }
      const mid = detectMidRisk(content);
      if (mid.length > 0) {
        return { user_id: userId, risk_level: 'orange', confidence: 0.7, triggered_keywords: mid, need_intervention: false };
      }
      return { user_id: userId, risk_level: 'green', confidence: 0.9, triggered_keywords: [], need_intervention: false };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/risk/level/:userId',
    handler: async (req, res, params) => ({
      level: 'green',
      history: [
        { date: dateNDaysAgo(0), level: 'green' },
        { date: dateNDaysAgo(1), level: 'yellow' },
      ],
    }),
  },
  {
    method: 'GET', pattern: '/api/v1/risk/crisis/hotlines',
    handler: async () => ({
      hotlines: [
        { name: '希望24热线', number: '400-161-9995', description: '心理危机干预', hours: '24小时' },
        { name: '12355青少年服务热线', number: '12355', description: '青少年心理咨询', hours: '24小时' },
        { name: '北京心理危机研究与干预中心', number: '010-82951332', description: '专业心理危机干预', hours: '24小时' },
      ],
    }),
  },
  {
    method: 'POST', pattern: '/api/v1/risk/crisis/report',
    handler: async (req, res, params, query, body) => {
      const { userId, riskLevel } = body || {};
      return { user_id: userId, risk_level: riskLevel, handled: true };
    },
  },

  // ============ 内容模块 ============
  {
    method: 'GET', pattern: '/api/v1/content/meditations',
    handler: async (req, res, params, query) => {
      const category = query.category || 'all';
      const meditations = [
        { id: 'med1', title: '呼吸放松', duration: 300, category: 'breathing', audio_url: 'https://example.com/med1.mp3', description: '5分钟呼吸放松练习' },
        { id: 'med2', title: '身体扫描', duration: 600, category: 'body', audio_url: 'https://example.com/med2.mp3', description: '10分钟身体扫描冥想' },
        { id: 'med3', title: '正念冥想', duration: 900, category: 'mindfulness', audio_url: 'https://example.com/med3.mp3', description: '15分钟正念冥想引导' },
      ];
      const list = category === 'all' ? meditations : meditations.filter((m) => m.category === category);
      return { category, meditations: list };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/content/meditation/:id',
    handler: async (req, res, params) => {
      const list = [
        { id: 'med1', title: '呼吸放松', duration: 300, category: 'breathing', audio_url: 'https://example.com/med1.mp3', description: '5分钟呼吸放松练习' },
        { id: 'med2', title: '身体扫描', duration: 600, category: 'body', audio_url: 'https://example.com/med2.mp3', description: '10分钟身体扫描冥想' },
        { id: 'med3', title: '正念冥想', duration: 900, category: 'mindfulness', audio_url: 'https://example.com/med3.mp3', description: '15分钟正念冥想引导' },
      ];
      const m = list.find((x) => x.id === params.id) || list[0];
      return { ...m, background_image: 'https://example.com/bg.jpg', script: '请跟随引导，放松身心...' };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/content/breathing/:type',
    handler: async (req, res, params) => ({
      type: params.type,
      steps: [
        { name: '吸气', duration: 4, instruction: '缓慢吸气' },
        { name: '屏息', duration: 7, instruction: '屏住呼吸' },
        { name: '呼气', duration: 8, instruction: '缓慢呼气' },
      ],
      recommended_duration: 300,
      animation_url: '',
    }),
  },

  // ============ 测评模块 ============
  {
    method: 'GET', pattern: '/api/v1/assessment/questions/:type',
    handler: async (req, res, params) => {
      const questionsText = [
        '做事时提不起劲或没有兴趣',
        '感到心情低落、沮丧或绝望',
        '入睡困难、睡不安稳或睡眠过多',
        '感觉疲倦或没有活力',
        '食欲不振或吃太多',
        '觉得自己很糟糕，或觉得自己很失败',
        '对事物专注有困难，例如阅读报纸或看电视时',
        '动作或说话速度缓慢到他人已察觉，或正好相反',
        '有不如死掉或用某种方式伤害自己的念头',
      ];
      const options = [
        { value: 0, text: '完全没有' },
        { value: 1, text: '有几天' },
        { value: 2, text: '一半以上时间' },
        { value: 3, text: '几乎每天' },
      ];
      const questions = questionsText.map((text, i) => ({ id: i + 1, text, options }));
      return { type: params.type, title: '情绪状态测评', description: '请根据最近两周的感受回答', questions, total_questions: questions.length };
    },
  },
  {
    method: 'POST', pattern: '/api/v1/assessment/submit',
    handler: async (req, res, params, query, body) => {
      const userId = (body && body.userId) || '';
      const answers = (body && body.answers) || [];
      const total = answers.reduce((sum, a) => sum + (typeof a === 'number' ? a : (a && a.value) || (a && a.score) || 0), 0);
      return { message: '测评完成', user_id: userId, total_score: total, result_id: 'r-' + Date.now() };
    },
  },
  {
    method: 'GET', pattern: '/api/v1/assessment/result/:id',
    handler: async (req, res, params) => ({
      id: params.id,
      type: 'phq9',
      total_score: 10,
      risk_level: 'yellow',
      description: '轻度抑郁倾向',
      suggestions: ['保持规律作息', '适度运动', '与信任的人交流'],
      recommendations: [{ type: 'meditation', id: 'med1', title: '呼吸放松' }],
    }),
  },

  // ============ 数据迁移模块 ============
  {
    method: 'POST', pattern: '/api/migration/execute',
    handler: async () => ({ success: true, message: '迁移完成' }),
  },
  {
    method: 'GET', pattern: '/api/migration/verify',
    handler: async () => ({ consistent: true, details: {} }),
  },
  {
    method: 'GET', pattern: '/api/migration/checksum/:tableName',
    handler: async (req, res, params) => ({ tableName: params.tableName, checksum: 'abc123' }),
  },
  {
    method: 'GET', pattern: '/api/migration/keys',
    handler: async () => [{ version: 'v1', active: true, createdAt: '2026-01-01T00:00:00Z' }],
  },
  {
    method: 'GET', pattern: '/api/migration/keys/current',
    handler: async () => 'v1',
  },
  {
    method: 'GET', pattern: '/api/migration/keys/:version',
    handler: async (req, res, params) => ({ version: params.version, active: false, createdAt: '2026-01-01T00:00:00Z' }),
  },
  {
    method: 'POST', pattern: '/api/migration/keys/rotate',
    handler: async () => 'v2',
  },
  {
    method: 'POST', pattern: '/api/migration/keys/add',
    handler: async (req, res, params, query, body) => (body && body.version) || 'v' + Date.now(),
  },
  {
    method: 'DELETE', pattern: '/api/migration/keys/:version',
    handler: async (req, res, params) => params.version,
  },
  {
    method: 'POST', pattern: '/api/migration/encrypt/test',
    handler: async (req, res, params, query, body) => {
      const content = (body && body.content) || '';
      return { original: content, encrypted: 'enc-' + content, decrypted: content, consistent: 'true' };
    },
  },
];

// ============ WebSocket 实现 ============
const wsClients = new Set();

function wsHandshake(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return false;
  }
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + accept,
    '',
    '',
  ].join('\r\n');
  socket.write(headers);
  return true;
}

// 发送文本帧（服务端不 mask）
function wsSend(socket, message) {
  let payload;
  if (typeof message === 'string') {
    payload = Buffer.from(message, 'utf-8');
  } else {
    payload = Buffer.from(JSON.stringify(message), 'utf-8');
  }
  const len = payload.length;
  const firstByte = 0x80 | 0x1; // FIN + text frame
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = firstByte;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = firstByte;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = firstByte;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  try {
    socket.write(Buffer.concat([header, payload]));
  } catch {
    /* socket 已关闭 */
  }
}

// 解析一帧数据（buffer 可能包含多帧，这里按需处理一帧）
function wsParseFrame(buffer) {
  if (buffer.length < 2) return null;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let payloadLen = b1 & 0x7f;
  let offset = 2;
  if (payloadLen === 126) {
    if (buffer.length < 4) return null;
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) return null;
    payloadLen = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  let mask = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    mask = buffer.slice(offset, offset + 4);
    offset += 4;
  }
  if (buffer.length < offset + payloadLen) return null;
  let payload = buffer.slice(offset, offset + payloadLen);
  if (masked) {
    const unmasked = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i++) {
      unmasked[i] = payload[i] ^ mask[i % 4];
    }
    payload = unmasked;
  }
  return { fin, opcode, payload, frameLength: offset + payloadLen };
}

function handleWsMessage(socket, dataStr) {
  let msg;
  try {
    msg = JSON.parse(dataStr);
  } catch {
    return;
  }
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'auth') {
    wsSend(socket, { type: 'auth_ack', success: true });
  } else if (msg.type === 'ping') {
    wsSend(socket, { type: 'pong' });
  } else if (msg.type === 'chat') {
    const text = msg.message || '';
    wsSend(socket, { type: 'typing' });
    setTimeout(() => {
      let reply;
      let riskLevel = 'green';
      if (detectCrisis(text)) {
        riskLevel = 'red';
        reply = '我注意到你提到了一些让我担心的内容。请立即拨打24小时心理危机热线：400-161-9995。你不是一个人，有人愿意帮助你。';
      } else {
        reply = randomReply();
      }
      wsSend(socket, {
        type: 'message',
        role: 'assistant',
        content: reply,
        riskLevel,
        timestamp: nowISO(),
      });
    }, 800);
  }
}

function handleWsConnection(req, socket) {
  if (!wsHandshake(req, socket)) return;
  wsClients.add(socket);
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    // 循环解析多帧
    while (buffer.length >= 2) {
      const frame = wsParseFrame(buffer);
      if (!frame) break;
      buffer = buffer.slice(frame.frameLength);
      const { opcode, payload } = frame;
      if (opcode === 0x8) {
        // 关闭
        try { socket.end(); } catch {}
        return;
      } else if (opcode === 0x9) {
        // ping -> pong
        const pong = Buffer.alloc(2 + payload.length);
        pong[0] = 0x80 | 0xa;
        pong[1] = payload.length;
        payload.copy(pong, 2);
        try { socket.write(pong); } catch {}
      } else if (opcode === 0xa) {
        // pong，忽略
      } else if (opcode === 0x1) {
        // 文本
        const text = payload.toString('utf-8');
        handleWsMessage(socket, text);
      } else if (opcode === 0x0) {
        // 连续帧，忽略
      }
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });
  socket.on('error', () => {
    wsClients.delete(socket);
  });
}

// ============ HTTP 请求处理 ============
async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const query = parsed.query || {};
  const method = req.method || 'GET';

  console.log(`[MOCK] ${method} ${pathname}`);

  // OPTIONS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  // 路由匹配
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(route.pattern, pathname);
    if (params === null) continue;
    try {
      let body = {};
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        body = await readBody(req);
      }
      const result = await route.handler(req, res, params, query, body);
      // 若 handler 已经调用了 sendError/sendJson 直接返回 undefined，则不再发送
      if (result === undefined) return;
      sendJson(res, result, 200, 'success');
      return;
    } catch (err) {
      console.error('[MOCK] Route handler error:', err && err.stack ? err.stack : err);
      sendJson(res, { error: 'Internal server error' }, 200, 'success');
      return;
    }
  }

  // 未匹配：返回 mock 空响应
  sendJson(res, null, 200, 'mock');
}

// ============ 创建服务器 ============
const server = http.createServer((req, res) => {
  // 处理 CORS 头（即使后续逻辑也会设置，这里兜底）
  handleRequest(req, res);
});

// WebSocket 升级
server.on('upgrade', (req, socket) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '';
  console.log(`[MOCK] WS UPGRADE ${pathname}`);
  if (pathname.startsWith('/ws/chat/')) {
    handleWsConnection(req, socket);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mock server running on http://${HOST}:${PORT}`);
});

// 优雅退出
process.on('SIGINT', () => {
  for (const s of wsClients) {
    try { s.destroy(); } catch {}
  }
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  for (const s of wsClients) {
    try { s.destroy(); } catch {}
  }
  server.close(() => process.exit(0));
});
