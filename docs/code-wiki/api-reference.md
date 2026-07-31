# API 接口速查

## 基础信息

- **基础 URL**: `http://localhost:8080`
- **API 版本**: `v1`
- **认证方式**: Bearer Token（JWT）
- **内容类型**: `application/json`

---

## 认证接口

### 用户注册

```http
POST /api/v1/users/register
Content-Type: application/json

{
  "nickname": "小明",
  "password": "123456",
  "role": "student",
  "ageGroup": "高一"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user": { "id": "xxx", "nickname": "小明", "role": "student" }
  }
}
```

### 用户登录

```http
POST /api/v1/users/login
Content-Type: application/json

{
  "username": "student1",
  "password": "123456",
  "role": "student"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "student1", "nickname": "小明同学", "role": "student" }
  }
}
```

### 家长注册

```http
POST /api/v1/parents/register
Content-Type: application/json

{
  "nickname": "张爸爸",
  "password": "123456",
  "phone": "13800138000"
}
```

### 家长登录

```http
POST /api/v1/parents/login
Content-Type: application/json

{
  "username": "parent1",
  "password": "123456"
}
```

---

## 用户服务

### 获取用户信息

```http
GET /api/v1/users/{id}
Authorization: Bearer {token}
```

### 更新用户信息

```http
PUT /api/v1/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatar": "https://...",
  "signature": "新签名"
}
```

### 导出用户数据

```http
GET /api/v1/users/{id}/export
Authorization: Bearer {token}
```

---

## 心情打卡服务

### 提交心情打卡

```http
POST /api/v1/mood/checkin
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "moodLevel": 4,
  "tags": ["开心", "考试顺利"]
}
```

**字段说明**:
- `moodLevel`: 整数 1-5（1=很糟，5=很开心）
- `tags`: 情绪标签数组，可选

### 获取心情历史

```http
GET /api/v1/mood/history/{userId}
Authorization: Bearer {token}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "history": [
      { "moodLevel": 4, "checkinDate": "2026-07-28", "tags": ["开心"] }
    ],
    "trend": "上升"
  }
}
```

### 获取心情图表数据

```http
GET /api/v1/mood/chart/{userId}?days=7
Authorization: Bearer {token}
```

---

## 对话服务

### 发送消息（HTTP）

```http
POST /api/v1/chat/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "message": "最近学习压力很大",
  "messageType": "text",
  "context": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好呀，我是小星～" }
  ],
  "userProfile": { "age": 15, "grade": "高一" }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "消息发送成功",
  "data": {
    "user_id": "student1",
    "response_time": 1200
  }
}
```

### 获取对话历史

```http
GET /api/v1/chat/history/{userId}?limit=50
Authorization: Bearer {token}
```

**参数**:
- `limit`: 返回消息数量，默认 50，最大 100

**响应**:
```json
{
  "code": 200,
  "data": {
    "user_id": "student1",
    "limit": 50,
    "messages": [
      { "role": "user", "content": "你好", "timestamp": "2026-07-28T10:00:00" },
      { "role": "assistant", "content": "你好呀～", "timestamp": "2026-07-28T10:00:01" }
    ]
  }
}
```

### 获取话题卡片

```http
GET /api/v1/chat/topics
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "topics": [
      { "id": "topic_1", "title": "聊聊最近的压力", "icon": "压力" },
      { "id": "topic_2", "title": "关于朋友的事", "icon": "朋友" },
      { "id": "topic_3", "title": "未来让我有点焦虑", "icon": "未来" },
      { "id": "topic_4", "title": "和家人相处", "icon": "家庭" },
      { "id": "topic_5", "title": "没有什么特别的事，就是有点闷", "icon": "心情" }
    ]
  }
}
```

### WebSocket 实时对话

```
ws://localhost:8080/ws/chat/{userId}
```

**消息格式**:
- 客户端发送: 纯文本消息
- 服务端返回: 纯文本回复

---

## 测评服务

### 获取测评题目

```http
GET /api/v1/assessment/questions/{type}
Authorization: Bearer {token}
```

**type 取值**: `phq9`（抑郁症筛查）、`gad7`（焦虑症筛查）等

### 提交测评

```http
POST /api/v1/assessment/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "type": "phq9",
  "answers": [1, 2, 1, 0, 1, 2, 1, 0, 1]
}
```

### 获取测评结果

```http
GET /api/v1/assessment/result/{id}
Authorization: Bearer {token}
```

---

## 内容服务

### 获取冥想列表

```http
GET /api/v1/content/meditations
```

### 获取冥想详情

```http
GET /api/v1/content/meditation/{id}
```

### 获取呼吸练习

```http
GET /api/v1/content/breathing/{type}
```

**type 取值**: `relax`（放松）、`energy`（提神）、`sleep`（助眠）

---

## 风险检测服务

### 风险检测

```http
POST /api/v1/risk/detect
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "student1",
  "content": "最近总是失眠，感觉很绝望"
}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "user_id": "student1",
    "risk_level": "orange",
    "confidence": 0.95,
    "details": {
      "keywords_detected": ["失眠", "绝望"],
      "semantic_intent": "情绪低落",
      "confidence": 0.92
    }
  }
}
```

**风险等级说明**:

| 等级 | 颜色 | 说明 | 处理措施 |
|------|------|------|---------|
| green | 绿色 | 正常 | 无 |
| yellow | 黄色 | 轻微波动 | 记录观察 |
| orange | 橙色 | 需关注 | 通知教师/家长 |
| red | 红色 | 紧急 | 立即触发危机干预流程 |

### 获取用户风险等级

```http
GET /api/v1/risk/level/{userId}
Authorization: Bearer {token}
```

### 获取危机热线

```http
GET /api/v1/risk/crisis/hotlines
```

**说明**: 无需认证，公开接口

---

## 家长端服务

### 获取绑定的孩子列表

```http
GET /api/v1/parents/children
Authorization: Bearer {token}
```

### 绑定孩子

```http
POST /api/v1/parents/bind
Authorization: Bearer {token}
Content-Type: application/json

{
  "studentId": "student1",
  "relationship": "父亲"
}
```

### 获取孩子情绪趋势

```http
GET /api/v1/parents/mood-trend?studentId=xxx&days=7
Authorization: Bearer {token}
```

**参数**:
- `studentId`: 学生 ID
- `days`: 天数范围（7/30/90）

### 获取情绪概览

```http
GET /api/v1/parents/mood-summary?studentId=xxx
Authorization: Bearer {token}
```

---

## 教师端服务

### 获取班级统计

```http
GET /api/v1/classroom/{classId}/stats
Authorization: Bearer {token}
```

### 获取班级学生列表

```http
GET /api/v1/classroom/{classId}/students
Authorization: Bearer {token}
```

### 教师 AI 对话

```http
POST /api/v1/chat/teacher/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "teacher1",
  "message": "有个学生最近情绪很低落"
}
```

---

## AI 引擎接口（server-services/ai-engine）

> **基础 URL**: `http://localhost:8000`

### AI 对话

```http
POST /chat
Content-Type: application/json

{
  "user_id": "student1",
  "message": "最近学习压力很大",
  "context": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好呀～" }
  ],
  "user_profile": { "age": 15, "grade": "高一" }
}
```

**响应**:
```json
{
  "response": "学习压力确实让人难受，想跟我聊聊具体是什么科目吗？",
  "risk_level": "green",
  "emotion_tags": ["焦虑", "压力"],
  "response_time_ms": 1250
}
```

### 风险检测

```http
POST /risk/check
Content-Type: application/json

{
  "user_id": "student1",
  "content": "最近总是失眠，感觉很绝望",
  "content_type": "chat"
}
```

**响应**:
```json
{
  "user_id": "student1",
  "risk_level": "orange",
  "confidence": 0.95,
  "details": {
    "keywords_detected": ["失眠", "绝望"],
    "semantic_intent": "情绪低落",
    "confidence": 0.92
  }
}
```

### 情绪分析

```http
POST /emotion/analyze
Content-Type: application/json

{
  "content": "今天考试考得很好，特别开心！"
}
```

**响应**:
```json
{
  "emotions": ["开心", "自豪"],
  "confidence": 0.92
}
```

### 获取话题卡片

```http
GET /topics
```

### WebSocket 实时对话

```
ws://localhost:8000/ws/chat/{user_id}
```

---

## 健康检查

### backend-java

```http
GET /health
```

**响应**:
```json
{ "status": "UP", "service": "starisle-backend" }
```

### ai-engine

```http
GET /health
```

**响应**:
```json
{ "status": "healthy", "service": "ai-engine", "version": "1.0.0" }
```

---

## 接口权限速查

| 接口路径 | 允许角色 | 需认证 |
|---------|---------|--------|
| `POST /api/v1/users/register` | 任何人 | 否 |
| `POST /api/v1/users/login` | 任何人 | 否 |
| `POST /api/v1/parents/register` | 任何人 | 否 |
| `POST /api/v1/parents/login` | 任何人 | 否 |
| `GET /api/v1/content/**` | 任何人 | 否 |
| `GET /api/v1/chat/topics` | 任何人 | 否 |
| `GET /api/v1/assessment/questions/**` | 任何人 | 否 |
| `GET /api/v1/risk/crisis/hotlines` | 任何人 | 否 |
| `GET /health` | 任何人 | 否 |
| `WS /ws/**` | 任何人 | 否 |
| `GET /api/v1/parents/**` | PARENT | 是 |
| `GET/POST /api/v1/users/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/mood/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/chat/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/risk/**` | STUDENT/TEACHER/PARENT | 是 |
| `GET/POST /api/v1/assessment/**` | STUDENT/TEACHER | 是 |
