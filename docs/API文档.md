# API文档 - 星屿 StarIsle MVP v1.0

## 基础信息

- **Base URL**: `https://api.starisle.com/api/v1`
- **认证方式**: JWT Token
- **数据格式**: JSON
- **编码**: UTF-8

## 通用响应格式

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2026-01-01T10:00:00Z"
}
```

## 用户服务 API

### 1. 用户注册
**POST** `/users/register`

**请求参数**:
```json
{
  "nickname": "小明",
  "avatar": "avatar_001",
  "age_group": "高中生"
}
```

**响应示例**:
```json
{
  "user_id": "uuid-xxx",
  "nickname": "小明",
  "created_at": "2026-01-01T10:00:00Z"
}
```

### 2. 获取用户信息
**GET** `/users/:id`

### 3. 更新用户信息
**PUT** `/users/:id`

### 4. 删除用户账号
**DELETE** `/users/:id`

### 5. 导出用户数据
**GET** `/users/:id/export`

## 心情打卡服务 API

### 1. 心情打卡
**POST** `/mood/checkin`

**请求参数**:
```json
{
  "user_id": "uuid-xxx",
  "mood_level": 4,
  "tags": ["学习压力", "人际"]
}
```

**响应示例**:
```json
{
  "message": "心情打卡成功",
  "checkin_date": "2026-01-01",
  "continuous_days": 7
}
```

### 2. 获取心情历史
**GET** `/mood/history/:userId?days=7`

### 3. 获取情绪晴雨表
**GET** `/mood/chart/:userId`

## 对话服务 API

### 1. 发送消息
**POST** `/chat/message`

**请求参数**:
```json
{
  "user_id": "uuid-xxx",
  "message": "今天感觉很累",
  "message_type": "text"
}
```

**响应示例**:
```json
{
  "response": "小星听到了。听起来你今天很疲惫呢...",
  "response_time_ms": 1500
}
```

### 2. WebSocket实时对话
**WebSocket** `/ws/chat/:userId`

### 3. 获取话题卡片
**GET** `/chat/topics`

## 测评服务 API

### 1. 获取测评题目
**GET** `/assessment/questions/:type`

### 2. 提交测评结果
**POST** `/assessment/submit`

### 3. 获取测评结果
**GET** `/assessment/result/:id`

## 内容服务 API

### 1. 获取冥想列表
**GET** `/content/meditations`

### 2. 获取冥想详情
**GET** `/content/meditation/:id`

### 3. 获取呼吸练习
**GET** `/content/breathing/:type`

## 风险检测 API

### 1. 风险检测
**POST** `/risk/detect`

### 2. 获取用户风险等级
**GET** `/risk/level/:userId`

## 危机资源 API

### 1. 获取危机热线列表
**GET** `/crisis/hotlines`

### 2. 上报危机事件
**POST** `/crisis/report`

## 帮助中心 API

### 1. 获取使用指南
**GET** `/help/guide`

### 2. 获取FAQ
**GET** `/help/faq`

## 错误码定义

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
| 503 | 服务不可用 |

## 安全说明

- 所有API请求需要JWT认证
- 对话内容采用AES-256-GCM端到端加密
- 风险检测API仅供内部服务调用