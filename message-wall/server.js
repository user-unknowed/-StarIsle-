require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const path = require('path');
const csrf = require('lusca').csrf;
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3210;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ---------- 中间件 ----------
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.path === '/api/admin/login') req.isLogin = true;
  next();
});
app.use(csrf());
app.use((req, res, next) => {
  res.setHeader('x-csrf-token', req.csrfToken());
  next();
});

// CORS：允许静态托管域名（GitHub Pages 等）跨域调用 API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// 审核后台友好路由
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- 危机/敏感词（命中仅标记 flagged，由人工审核裁量） ----------
const CRISIS_KEYWORDS = [
  '自杀', '轻生', '想死', '去死', '自残', '自伤', '割腕', '跳楼', '跳桥',
  '安眠药', '结束生命', '了结', '自杀方法', '结束这一切', '不想活', '活不下去',
  '撑不下去', '没有活下去', 'suicide', 'kill myself',
];

function containsCrisisKeyword(text) {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => lower.includes(k));
}

// ---------- 基础限流：同 IP 60 秒最多 1 条 ----------
const RATE_WINDOW_MS = 60 * 1000;
const rateMap = new Map(); // ipHash -> lastSubmitTs

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
}

// ---------- 管理员鉴权（内存态 token，24h 过期） ----------
const adminTokens = new Map(); // token -> expiresAt
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function requireAdmin(req, res, next) {
  let token = null;
  // 优先取 Authorization: Bearer <token>
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  // 兼容 cookie
  if (!token && req.cookies) token = req.cookies.admin_token;

  const expires = token && adminTokens.get(token);
  if (!expires || expires < Date.now()) {
    if (token) adminTokens.delete(token);
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  next();
}

// ---------- 公开 API ----------

// 提交留言（匿名）
app.post('/api/messages', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim().slice(0, 20);
    const content = String(req.body.content || '').trim();

    if (!content) return res.status(400).json({ error: '留言内容不能为空' });
    if (content.length > 200) return res.status(400).json({ error: '留言不能超过 200 字' });

    const ipHash = hashIp(clientIp(req));
    const last = rateMap.get(ipHash);
    if (last && Date.now() - last < RATE_WINDOW_MS) {
      return res.status(429).json({ error: '提交太频繁了，请稍等一分钟再试' });
    }

    await db.getDb();
    await db.messages().insertOne({
      nickname: nickname || '匿名',
      content,
      status: 'pending',
      flagged: containsCrisisKeyword(content),
      ipHash,
      createdAt: new Date(),
      reviewedAt: null,
    });
    rateMap.set(ipHash, Date.now());

    res.json({ ok: true, message: '已收到，审核通过后会出现在留言墙上' });
  } catch (err) {
    console.error('[POST /api/messages]', err.message);
    res.status(500).json({ error: '服务暂时不可用，请稍后再试' });
  }
});

// 已审核通过的留言（公开留言墙）
app.get('/api/messages', async (req, res) => {
  try {
    await db.getDb();
    const list = await db
      .messages()
      .find({ status: 'approved' }, { projection: { nickname: 1, content: 1, createdAt: 1, _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json({ ok: true, list });
  } catch (err) {
    console.error('[GET /api/messages]', err.message);
    res.status(500).json({ error: '留言墙加载失败，请稍后再试' });
  }
});

// ---------- 管理端 API ----------

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body.password || '');
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = issueToken();
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: TOKEN_TTL_MS,
  });
  res.json({ ok: true, token });
});

app.post('/api/admin/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) adminTokens.delete(auth.slice(7).trim());
  const token = req.cookies && req.cookies.admin_token;
  if (token) adminTokens.delete(token);
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status
      : 'pending';
    await db.getDb();
    const list = await db
      .messages()
      .find({ status: { $eq: status } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    res.json({ ok: true, list });
  } catch (err) {
    console.error('[GET /api/admin/messages]', err.message);
    res.status(500).json({ error: '加载失败' });
  }
});

app.post('/api/admin/messages/:id/review', requireAdmin, async (req, res) => {
  try {
    const action = req.body.action;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效操作' });
    }
    let objectId;
    try {
      objectId = new (require('mongodb').ObjectId)(req.params.id);
    } catch {
      return res.status(400).json({ error: '无效 ID' });
    }
    await db.getDb();
    const result = await db.messages().findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: '留言不存在' });
    res.json({ ok: true, message: result });
  } catch (err) {
    console.error('[POST /api/admin/messages/:id/review]', err.message);
    res.status(500).json({ error: '操作失败' });
  }
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    let objectId;
    try {
      objectId = new (require('mongodb').ObjectId)(req.params.id);
    } catch {
      return res.status(400).json({ error: '无效 ID' });
    }
    await db.getDb();
    const result = await db.messages().deleteOne({ _id: objectId });
    if (result.deletedCount === 0) return res.status(404).json({ error: '留言不存在' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/admin/messages/:id]', err.message);
    res.status(500).json({ error: '删除失败' });
  }
});

// ---------- 启动 ----------
if (!ADMIN_PASSWORD) {
  console.warn('警告：未设置 ADMIN_PASSWORD，审核后台无法登录。请在 message-wall/.env 中配置。');
}

db.getDb()
  .then(() => console.log('MongoDB Atlas 连接成功（database: message_wall）'))
  .catch((err) => console.error('MongoDB 连接失败：', err.message));

app.listen(PORT, () => {
  console.log(`星屿·心声墙已启动: http://localhost:${PORT}（审核后台: /admin）`);
});
