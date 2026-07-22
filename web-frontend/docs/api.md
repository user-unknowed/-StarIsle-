# 星屿心理健康管理系统 - API文档

## 1. 概述

本文档描述了星屿心理健康管理系统前端与后端之间的API接口。所有接口均使用RESTful风格，数据格式为JSON。

## 2. 基础信息

### 2.1 基础URL
- 开发环境: `http://localhost:8080/api`
- 生产环境: `https://api.starisle.com/api`

### 2.2 认证方式
- 使用JWT令牌认证
- 令牌通过Authorization header传递: `Bearer <token>`
- 令牌有效期: 24小时

### 2.3 响应格式

#### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

#### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

## 3. 用户认证

### 3.1 登录

**POST** `/auth/login`

请求体:
```json
{
  "username": "string",
  "password": "string",
  "role": "student | teacher | parent"
}
```

响应体:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "nickname": "string",
      "avatar": "string",
      "role": "student | teacher | parent",
      "ageGroup": "string",
      "signature": "string",
      "classId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
}
```

### 3.2 注册

**POST** `/auth/register`

请求体:
```json
{
  "nickname": "string",
  "username": "string",
  "password": "string",
  "role": "student | teacher",
  "ageGroup": "string (optional)"
}
```

响应体: 同登录接口

### 3.3 手机号登录

**POST** `/auth/login/phone`

请求体:
```json
{
  "phone": "string",
  "code": "string"
}
```

响应体: 同登录接口

### 3.4 发送验证码

**POST** `/auth/sms/send`

请求体:
```json
{
  "phone": "string"
}
```

响应体:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": null
}
```

### 3.5 第三方登录

**POST** `/auth/login/thirdparty`

请求体:
```json
{
  "provider": "wechat | qq | apple",
  "openId": "string",
  "unionId": "string (optional)",
  "nickname": "string (optional)",
  "avatar": "string (optional)"
}
```

响应体: 同登录接口

## 4. 心情管理

### 4.1 提交心情

**POST** `/mood/checkin`

请求体:
```json
{
  "userId": "string",
  "moodLevel": 1-5,
  "tags": ["string"]
}
```

响应体:
```json
{
  "code": 200,
  "message": "打卡成功",
  "data": {
    "id": "string",
    "userId": "string",
    "moodLevel": 1-5,
    "tags": ["string"],
    "checkinDate": "string",
    "createdAt": "string"
  }
}
```

### 4.2 获取心情历史

**GET** `/mood/history/{userId}`

查询参数:
- `days`: 天数 (默认7)

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "userId": "string",
      "moodLevel": 1-5,
      "tags": ["string"],
      "checkinDate": "string",
      "createdAt": "string"
    }
  ]
}
```

### 4.3 获取今日心情

**GET** `/mood/today/{userId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "userId": "string",
    "moodLevel": 1-5,
    "tags": ["string"],
    "checkinDate": "string",
    "createdAt": "string"
  }
}
```

## 5. 聊天管理

### 5.1 获取聊天记录

**GET** `/chat/messages/{userId}`

查询参数:
- `limit`: 数量限制 (默认20)
- `offset`: 偏移量 (默认0)

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "userId": "string",
      "content": "string",
      "role": "user | assistant",
      "timestamp": "string"
    }
  ]
}
```

### 5.2 发送消息

**POST** `/chat/send`

请求体:
```json
{
  "userId": "string",
  "content": "string"
}
```

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "userId": "string",
    "content": "string",
    "role": "user",
    "timestamp": "string"
  }
}
```

### 5.3 获取AI回复

**POST** `/chat/ai`

请求体:
```json
{
  "userId": "string",
  "content": "string",
  "history": [
    {
      "role": "user | assistant",
      "content": "string"
    }
  ]
}
```

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": "string",
    "timestamp": "string"
  }
}
```

## 6. 班级管理

### 6.1 获取班级统计

**GET** `/classroom/stats/{classId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalStudents": 0,
    "averageMood": 0,
    "todayCheckinCount": 0,
    "alertCount": 0
  }
}
```

### 6.2 获取学生列表

**GET** `/classroom/students/{classId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "nickname": "string",
      "avatar": "string",
      "ageGroup": "string",
      "latestMood": 1-5,
      "riskLevel": "green | yellow | orange | red",
      "alert": false
    }
  ]
}
```

### 6.3 获取学生详情

**GET** `/classroom/student/{studentId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "nickname": "string",
    "avatar": "string",
    "ageGroup": "string",
    "classId": "string",
    "latestMood": 1-5,
    "riskLevel": "green | yellow | orange | red",
    "alert": false,
    "moodHistory": [],
    "alertHistory": []
  }
}
```

## 7. 用户管理

### 7.1 获取用户信息

**GET** `/user/info/{userId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "nickname": "string",
    "avatar": "string",
    "role": "student | teacher | parent",
    "ageGroup": "string",
    "signature": "string",
    "classId": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### 7.2 更新用户信息

**PUT** `/user/update`

请求体:
```json
{
  "userId": "string",
  "nickname": "string (optional)",
  "avatar": "string (optional)",
  "signature": "string (optional)"
}
```

响应体: 同获取用户信息接口

### 7.3 修改密码

**PUT** `/user/password`

请求体:
```json
{
  "userId": "string",
  "oldPassword": "string",
  "newPassword": "string"
}
```

响应体:
```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

## 8. 家长端API

### 8.1 绑定学生

**POST** `/parent/bind`

请求体:
```json
{
  "parentId": "string",
  "studentId": "string"
}
```

响应体:
```json
{
  "code": 200,
  "message": "绑定成功",
  "data": {
    "id": "string",
    "parentId": "string",
    "studentId": "string",
    "status": "pending | approved | rejected",
    "createdAt": "string"
  }
}
```

### 8.2 获取绑定列表

**GET** `/parent/bindings/{parentId}`

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "studentId": "string",
      "studentName": "string",
      "status": "pending | approved | rejected",
      "createdAt": "string"
    }
  ]
}
```

### 8.3 获取孩子心情

**GET** `/parent/mood/{studentId}`

查询参数:
- `days`: 天数 (默认7)

响应体:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "moodLevel": 1-5,
      "checkinDate": "string",
      "tags": ["string"]
    }
  ]
}
```

## 9. 错误码

| 错误码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突 |
| 500 | 服务器内部错误 |

## 10. WebSocket接口

### 10.1 连接地址
- `ws://localhost:8080/ws/chat`

### 10.2 消息格式

#### 客户端发送
```json
{
  "type": "send_message",
  "data": {
    "userId": "string",
    "content": "string"
  }
}
```

#### 服务端推送
```json
{
  "type": "message_received",
  "data": {
    "id": "string",
    "userId": "string",
    "content": "string",
    "role": "user | assistant",
    "timestamp": "string"
  }
}
```

#### 心跳消息
```json
{
  "type": "ping",
  "data": {}
}
```

```json
{
  "type": "pong",
  "data": {}
}
```
