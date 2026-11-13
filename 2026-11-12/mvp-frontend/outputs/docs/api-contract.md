# StarIsle MVP 前端 API 契约

> 适用版本：Web MVP（单页三端通用，`student` / `teacher` / `parent`）
> 适配层：`frontend/assets/api.js`（唯一网络出入口）
> 后端现状依据：`api-docs/spec/openapi.yaml`（OpenAPI 3.0.3，servers `http://localhost:8080`、`https://api.starisle.com`）
> 本文档是契约的唯一事实来源。代码注释只做索引，字段口径以本文为准。

---

## 0. 通用约定

### 0.1 传输

| 项 | 约定 |
| --- | --- |
| Base | `BASE_URL`，默认 `/api`（同源反代） |
| 路径 | 一律以 `/v1/...` 开头，即完整路径 `/api/v1/...` |
| 编码 | `Content-Type: application/json`，UTF-8 |
| 鉴权 | `Authorization: Bearer <token>`（除登录 / 短信 / 热线外均必需） |
| 超时 | 15 000 ms，超时返回 `408`；网络不可达返回 `0` |
| 时间 | ISO-8601 字符串；`date` 字段为 `YYYY-MM-DD` |

### 0.2 响应信封

后端统一信封：

```json
{ "code": 200, "message": "success", "data": { } }
```

适配层归一化后给 UI 的形态（**UI 只认这一种**）：

```js
{ ok: true,  data: { } }
{ ok: false, error: { code: 403, message: "未授权查看该学生数据" } }
```

归一化规则（`request()`）：

1. HTTP 非 2xx → `fail(status, message)`；
2. 命体含 `code` 且 `code !== 0 && code !== 200` → `fail(code, message)`；
3. 命中 2xx 且 `code` 合法 → `ok(json.data)`；
4. 无 `code` 字段（裸对象）→ `ok(json)`，由各端点适配函数再收敛。

### 0.3 错误码

| code | 含义 | 前端处理 |
| --- | --- | --- |
| `0` / `200` | 成功 | — |
| `400` | 参数校验失败 | 表单内联错误提示，保留用户输入 |
| `401` | 未登录 / Token 失效 | 清除 `starisle-auth`，回到登录页 |
| `403` | 无权限（未授权绑定、越权查看） | 卡片内降级提示，不整页报错 |
| `404` | 资源不存在（文章下线、绑定已解除） | 空态兜底 |
| `408` | 前端超时 | 「请求超时，请稍后重试」并提供重试 |
| `500` | 服务端异常 | 通用错误条 + 重试 |
| `501` | 能力暂未实现（如取消绑定授权） | 按钮置灰并提示「后端暂未提供该能力」，不阻断其他操作 |
| `0` | 网络不可用 | 「网络不可用，请检查连接」 |

### 0.4 端点状态标记

- **[已有]**：`openapi.yaml` 中已定义，前端直接对接（必要时做字段映射）。
- **[新增]**：后端尚未实现，前端已定义请求/响应契约，由适配层以 mock 驱动；后端按本文实现后，仅需把 `USE_MOCK` 置 `false`。

---

## 1. auth —— 登录与会话

### 1.1 `POST /v1/auth/login` **[已有]**

账号密码登录。

请求：

```json
{ "username": "string", "password": "string", "role": "student|teacher|parent" }
```

响应 `data`：

```json
{ "token": "jwt", "user": { "id": "u_1", "username": "string", "nickname": "林小满", "role": "student" } }
```

### 1.2 `POST /v1/auth/login/phone` **[已有]**

手机号 + 验证码登录（演示环境后端可返回固定验证码）。

请求：

```json
{ "phone": "13800000000", "code": "123456" }
```

响应：`ApiResponse`，`data` 结构后端未显式约束。**前端约定**其与 1.1 同构：

```json
{ "token": "jwt", "user": { "id": "u_1", "nickname": "林小满", "role": "student" } }
```

> 若后端返回 `{ token, id, nickname, role }`（扁平），适配层同样接受并归一化。

### 1.3 `POST /v1/auth/sms/send` **[已有]**

```json
{ "phone": "13800000000" }
```

响应 `data`：`null` 或 `{ "sent": true, "expiresIn": 300 }`。

### 1.4 `POST /v1/auth/logout` **[已有]**

无 body。响应 `data`：`null`。前端同时清空本地 session。

### 1.5 会话归一化（适配层职责）

UI 使用的 session 结构：

```json
{
  "token": "jwt",
  "role": "student|teacher|parent",
  "userId": "u_1",
  "nickname": "林小满",
  "avatar": "🦊",
  "classId": "c_1",
  "loginAt": "2026-11-12T09:00:00.000Z"
}
```

归一化来源优先级：`data.session` → `data`；`user.id|userId` → `userId`；`user.nickname|nickname` → `nickname`；`user.classId|classId` → `classId`；缺 `role` 时以请求 `role` 补齐。

---

## 2. mood —— 心情打卡（学生端）

### 2.1 `POST /v1/mood/checkin` **[已有]**

```json
{ "userId": "u_1", "moodLevel": 4, "tags": ["学业压力"], "note": "今天有点累" }
```

- `moodLevel`：`1..5`，越界返回 `400`。
- `tags`：可选，最多 3 个。
- `note`：可选，≤ 200 字。

响应 `data`：

```json
{ "id": "m_1", "userId": "u_1", "moodLevel": 4, "tags": ["学业压力"], "note": "今天有点累", "checkinDate": "2026-11-12", "createdAt": "2026-11-12T09:12:00" }
```

同一天重复提交按 `userId + checkinDate` 覆盖（幂等）。

### 2.2 `GET /v1/mood/history/{userId}?days=14` **[已有]**

响应 `data`：

```json
{ "history": [ { "checkinDate": "2026-11-12", "moodLevel": 4 } ], "trend": "up|flat|down" }
```

### 2.3 `GET /v1/mood/chart/{userId}` **[已有]**

响应 `data`：`{ "user_id": "u_1", "chart_type": "line", "data": [ { "date": "2026-11-12", "value": 4 } ] }`

> 前端 `moodBars` 消费的是 `history`；`chart` 仅在需要图表点位时调用。

---

## 3. knowledge —— 心理知识库（学生端 / 家长端共享） **[新增]**

后端当前无知识库端点，以下为前端已实现的契约。检索为语义（向量）+ 关键词混合，`top_k` 默认 10。

### 3.1 `POST /v1/knowledge/search`

请求：

```json
{ "query": "考试焦虑", "category": "emotion", "top_k": 10 }
```

- `query`：1..200 字，空串表示按分类浏览。
- `category`：可选，取值同 3.3。
- `top_k`：1..30。

响应 `data`：

```json
{
  "query": "考试焦虑",
  "total_results": 2,
  "results": [
    {
      "id": "kb_1",
      "title": "考试焦虑：把紧张变成助力",
      "source": "心理中心",
      "category": "emotion",
      "content_preview": "……",
      "techniques": ["4-7-8 呼吸", "认知重评"],
      "score": 0.93,
      "matched_keywords": ["焦虑", "考试"]
    }
  ]
}
```

### 3.2 `GET /v1/knowledge/articles/{id}`

响应 `data`：`{ "article": { "id","title","source","category","content","techniques","updatedAt" } }`

不存在或已下线 → `404`，`message: "文章不存在或已下线"`。

> `content` 为 Markdown 源码，前端用自写渲染器 `window.SIMD` 渲染。

### 3.3 `GET /v1/knowledge/categories`

响应 `data`：`{ "categories": [ { "key": "emotion", "label": "情绪调节", "count": 12 } ] }`

约定的 `key`：`emotion` 情绪调节 / `study` 学业压力 / `relation` 人际关系 / `family` 家庭沟通 / `self` 自我认识 / `crisis` 危机应对。

### 3.4 `GET /v1/knowledge/stats`

响应 `data`：`{ "total_documents": 128, "updated_at": "2026-11-01" }`

---

## 4. community —— 树人互助（学生端） **[新增]**

匿名化求助社区。所有展示名均为系统生成的化名，不暴露真实身份。

### 4.1 `GET /v1/community/posts?page=1&page_size=20`

响应 `data`：

```json
{
  "posts": [
    {
      "id": "p_1",
      "title": "晚上总是睡不着",
      "content": "……",
      "tags": ["睡眠"],
      "authorAlias": "夜航星",
      "replyCount": 3,
      "createdAt": "2026-11-11T22:10:00",
      "urgencyLevel": "normal",
      "liked": false
    }
  ],
  "total": 24
}
```

### 4.2 `GET /v1/community/posts/{id}`

响应 `data`：`{ "post": { …同 4.1… }, "replies": [ { "id","authorAlias","content","createdAt","isSupporter" } ] }`

不存在 → `404`。

### 4.3 `POST /v1/community/posts`

```json
{ "userId": "u_1", "title": "晚上总是睡不着", "content": "……", "tags": ["睡眠"], "urgencyLevel": "normal" }
```

- `title`：4..40 字；`content`：10..2000 字；`tags` ≤ 3。
- `urgencyLevel`：`normal|urgent`。命中危机词时后端强制置 `urgent` 并触发教师端预警。

响应 `data`：`{ "post": { …完整对象… } }`

### 4.4 `POST /v1/community/posts/{id}/reply`

```json
{ "userId": "u_1", "content": "…" }
```

响应 `data`：`{ "reply": { "id","authorAlias","content","createdAt","isSupporter" } }`

---

## 5. assessment —— 心理量表（学生端）

### 5.1 `GET /v1/assessment/questions/{type}` **[已有]**

后端原始响应（裸对象，无 `{code,data}` 包裹亦可）：

```json
{
  "type": "phq9",
  "title": "情绪状态自评",
  "description": "…",
  "total_questions": 9,
  "questions": [ { "id": 1, "question": "…", "options": ["完全没有", "有几天", "一半以上时间", "几乎每天"], "weight": [0,1,2,3] } ]
}
```

**适配映射** → UI 结构：

```json
{ "scale": { "type","title","intro":"description","duration":"约 3 分钟",
  "questions": [ { "id": 1, "text": "…", "options": [ { "value": 0, "label": "完全没有" } ] } ],
  "bands": [], "advice": [] } }
```

映射规则：`question → text`；`options[i]` 与 `weight[i]` 组合为 `{ value: weight[i], label: options[i] }`；`weight` 缺失时按 `i` 递增。

### 5.2 `POST /v1/assessment/submit` **[已有]**

后端要求 `answers` 为**按题目顺序的数值数组**：

```json
{ "userId": "u_1", "type": "phq9", "answers": [0, 2, 1, 3, 0, 1, 2, 2, 1] }
```

前端 UI 内部以 `{ "1": 0, "2": 2 }` 存放答案，提交前按 `questions` 顺序拍平。

响应 `data`：

```json
{ "message": "提交成功", "user_id": "u_1", "total_score": 12, "result_id": "r_1" }
```

### 5.3 `GET /v1/assessment/result/{id}` **[已有]**

后端原始响应：

```json
{ "result_id": "r_1", "total_score": 12, "risk_level": "yellow", "description": "…", "suggestions": ["…"], "recommendations": ["…"] }
```

**适配映射** → UI 结构：

```json
{ "result": {
  "resultId": "r_1", "type": "phq9", "title": "情绪状态自评",
  "totalScore": 12, "maxScore": 27, "level": "yellow",
  "levelLabel": "需要关注", "levelDesc": "description",
  "advice": ["suggestions…", "recommendations…"], "createdAt": "…"
} }
```

`maxScore` 由 5.1 的量表题目权重求和得出（前端本地计算，后端不返回时用缓存值）。

### 5.4 `GET /v1/assessment/types` **[新增]**

响应 `data`：

```json
{ "types": [ { "type": "phq9", "title": "情绪状态自评", "intro": "…", "duration": "约 3 分钟", "count": 9 } ] }
```

### 5.5 `GET /v1/assessment/results` **[新增]**

当前用户历史测评。

响应 `data`：`{ "results": [ { …同 5.3 的 result 结构… } ] }`

---

## 6. classroom —— 班级与教师端

### 6.1 `GET /v1/classroom/{classId}/stats` **[已有]**

后端原始响应：

```json
{ "code": 200, "data": { "statistics": { }, "chartData": { } } }
```

`statistics` / `chartData` 的内部字段后端未约束。**前端约定**其内部字段为：

```json
{
  "statistics": {
    "totalStudents": 8,
    "averageMood": 3.6,
    "alertCount": 2,
    "todayCheckinCount": 4,
    "checkinRate": 0.5
  },
  "chartData": { "labels": ["11-06"], "values": [3.2] }
}
```

适配层将其拍平为 UI 结构 `{ classId, className, totalStudents, averageMood, alertCount, todayCheckinCount, checkinRate }`；字段缺失时按 `statistics` 内的同名小驼峰键兜底，再缺失则置 0 并显示 `--`。

### 6.2 `GET /v1/classroom/{classId}/students` **[已有]**

```json
{
  "students": [
    { "id": "u_2", "nickname": "陈屿", "avatar": "🐳", "ageGroup": "15-18",
      "latestMood": 3, "riskLevel": "yellow", "checkinToday": true }
  ],
  "alerts": []
}
```

`StudentInfo` 缺失字段由适配层补齐：`checkinToday` ← `latestMood != null && latestMoodDate === today`；`tags` ← `[]`。

### 6.3 `GET /v1/classroom/{classId}/alerts` **[新增]**

仅返回待复核（`reviewed === false`）的预警，按 `riskLevel` 降序、`createdAt` 降序。

响应 `data`：

```json
{
  "alerts": [
    { "id": "a_1", "studentId": "u_2", "studentName": "陈屿", "studentAvatar": "🐳",
      "riskLevel": "orange", "reason": "连续 3 天低情绪 + 互助帖含危机词",
      "source": "mood|community|assessment", "createdAt": "2026-11-12T08:30:00",
      "handled": false, "reviewed": false }
  ]
}
```

> 注意：教师端预警主键统一为 `id`（不是 `alertId`）。`alertId` 仅用于家长端紧急预警（6.7）。

### 6.4 `POST /v1/classroom/alerts/{alertId}/review` **[新增]**

```json
{ "decision": "observe|intervene|refer|close", "note": "已约谈，家长已知情", "reviewerId": "t_1" }
```

响应 `data`：`{ "alert": { …原对象，追加 reviewed:true, reviewDecision, reviewNote, reviewedAt… } }`

语义：

| decision | 含义 | 后续状态 |
| --- | --- | --- |
| `observe` | 继续观察 | 该预警移出待复核列表，学生仍保留在监测视图 |
| `intervene` | 已介入（约谈 / 通知家长） | 同上，并记录干预方式 |
| `refer` | 转介（校心理老师 / 专业机构） | 同上，标记为转介中 |
| `close` | 关闭（误报 / 已恢复） | 同上，归档 |

---

## 7. parents —— 家长端

### 7.1 `GET /v1/parents/children` **[已有]**

后端 `data` 为**数组**（不是对象）：

```json
[ { "id": "b_1", "parentId": "p_1", "studentId": "u_2", "studentNickname": "林小满",
    "studentAvatar": "🦊", "bindType": "mother", "authorized": true,
    "authorizedAt": "…", "latestMood": 3, "riskLevel": "yellow",
    "lastCheckinDate": "2026-11-12", "createdAt": "…" } ]
```

**适配映射**：数组 → `{ children: [...] }`；`id → bindingId`；`bindType → relation`（`mother|father|grandparent|other` ↔ 妈妈 / 爸爸 / 爷爷·奶奶 / 其他监护人）。

### 7.2 `POST /v1/parents/children/bind` **[已有]**

```json
{ "studentId": "u_2", "studentNickname": "林小满", "bindType": "mother" }
```

响应 `data`：`ChildBindingResponse`（`authorized` 初始为 `false`，需家长显式授权后才可查看情绪数据）。

### 7.3 `POST /v1/parents/children/{bindingId}/authorize` **[已有]**

**无请求体**（后端不接受 body；前端只传路径参数）。

响应 `data`：`ChildBindingResponse`（`authorized: true`）。

> 取消授权后端无独立端点。前端「暂停查看」仅 `DELETE` 后重新绑定，或后端后续补充 `POST .../revoke`（**新增**，建议契约：无 body，`data: ChildBindingResponse`）。

### 7.4 `DELETE /v1/parents/children/{bindingId}` **[已有]**

响应 `data`：`null`。前端本地移除该项。

### 7.5 `GET /v1/parent/mood/{studentId}?days=14` **[已有]**

**注意路径是 `/parent/mood/`（单数 `parent`），且参数是 `studentId` 而非 `bindingId`。**

响应 `ApiResponse`，`data` 约定为：

```json
{
  "studentId": "u_2", "studentNickname": "林小满",
  "history": [ { "checkinDate": "2026-11-12", "moodLevel": 3 } ],
  "trend": "flat",
  "summary": { "days": 14, "checkinCount": 9, "averageMood": 3.1, "lowDays": 2, "lastCheckinDate": "2026-11-12" }
}
```

未授权（`authorized === false`）→ `403`。

### 7.6 `GET /v1/parents/children/{bindingId}/mood` **[新增，建议路径]**

如需按绑定维度查询，建议新增该端点，语义同 7.5。**当前前端走 7.5**，不依赖此端点。

### 7.7 `GET /v1/parents/emergency/alert` **[已有]**

响应 `data` 为 `EmergencyAlertResponse` 裸对象或 `null`：

```json
{ "id": "ea_1", "studentId": "u_2", "parentId": "p_1", "riskLevel": "red",
  "status": "active", "triggerSource": "crisis_keyword", "description": "…",
  "triggeredAt": "2026-11-12T08:30:00", "confirmedAt": null }
```

**适配映射** → `{ alert: { alertId: id, studentId, studentName, level: riskLevel, reason: description, createdAt: triggeredAt, confirmed: !!confirmedAt } }`，`null` → `{ alert: null }`。

### 7.8 `POST /v1/parents/emergency/alert/{alertId}/confirm` **[已有]**

无 body。响应 `data`：`EmergencyAlertResponse`（`confirmedAt` 已填充）。

### 7.9 `GET /v1/parents/emergency/resources[/{type}]` **[已有]**

响应 `data`：`{ "resources": [ { "type","title","content","phone" } ] }`

`type`：`hotline|guide|article`。

### 7.10 危机热线（家长端也用）

家长端「紧急支持」展示的热线复用 `GET /v1/risk/crisis/hotlines`（见 8.2）。

---

## 8. risk —— 风险等级与危机资源

### 8.1 `GET /v1/risk/level/{userId}` **[已有]**

后端原始：

```json
{ "user_id": "u_1", "current_risk_level": "green", "history": [ { "date": "2026-11-12", "level": "green" } ] }
```

**适配映射** → `{ userId, level: current_risk_level, lowDays, updatedAt }`；`lowDays` 后端未返回时按 `history` 中 `level in [orange, red]` 计数。

### 8.2 `GET /v1/risk/crisis/hotlines` **[已有]**

```json
{ "hotlines": [ { "name": "全国青少年心理援助热线", "number": "12355", "description": "…", "hours": "7×24" } ] }
```

### 8.3 `POST /v1/risk/detect` **[已有]**

内部/教师端使用，前端 MVP 不直接调用（发帖与打卡的危机识别由后端完成）。

---

## 9. content —— 放松内容（学生端）

### 9.1 `GET /v1/content/meditations?category=` **[已有]**

响应 `data` 约定：`{ "meditations": [ { "id","title","category","duration","intro","steps":[] } ] }`

### 9.2 `GET /v1/content/breathing/{type}` **[已有]**

`type`：`478|box|deep`。

响应 `data` 约定：`{ "exercise": { "type","name","intro","phases": [ { "label","seconds" } ] } }`

> 前端呼吸计时完全本地运行（`beginBreath` / `startBreathing`），该端点只提供时长配比，加载失败时回退内置 4-7-8。

---

## 10. 端点总览

| # | 方法 | 路径 | 分组 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/v1/auth/login` | auth | 已有 |
| 2 | POST | `/v1/auth/login/phone` | auth | 已有 |
| 3 | POST | `/v1/auth/sms/send` | auth | 已有 |
| 4 | POST | `/v1/auth/logout` | auth | 已有 |
| 5 | POST | `/v1/mood/checkin` | mood | 已有 |
| 6 | GET | `/v1/mood/history/{userId}` | mood | 已有 |
| 7 | GET | `/v1/mood/chart/{userId}` | mood | 已有 |
| 8 | POST | `/v1/knowledge/search` | knowledge | **新增** |
| 9 | GET | `/v1/knowledge/articles/{id}` | knowledge | **新增** |
| 10 | GET | `/v1/knowledge/categories` | knowledge | **新增** |
| 11 | GET | `/v1/knowledge/stats` | knowledge | **新增** |
| 12 | GET | `/v1/community/posts` | community | **新增** |
| 13 | GET | `/v1/community/posts/{id}` | community | **新增** |
| 14 | POST | `/v1/community/posts` | community | **新增** |
| 15 | POST | `/v1/community/posts/{id}/reply` | community | **新增** |
| 16 | GET | `/v1/assessment/questions/{type}` | assessment | 已有（需映射） |
| 17 | POST | `/v1/assessment/submit` | assessment | 已有（需映射） |
| 18 | GET | `/v1/assessment/result/{id}` | assessment | 已有（需映射） |
| 19 | GET | `/v1/assessment/types` | assessment | **新增** |
| 20 | GET | `/v1/assessment/results` | assessment | **新增** |
| 21 | GET | `/v1/classroom/{classId}/stats` | classroom | 已有（需映射） |
| 22 | GET | `/v1/classroom/{classId}/students` | classroom | 已有 |
| 23 | GET | `/v1/classroom/{classId}/alerts` | classroom | **新增** |
| 24 | POST | `/v1/classroom/alerts/{alertId}/review` | classroom | **新增** |
| 25 | GET | `/v1/parents/children` | parents | 已有（需映射） |
| 26 | POST | `/v1/parents/children/bind` | parents | 已有 |
| 27 | POST | `/v1/parents/children/{bindingId}/authorize` | parents | 已有（无 body） |
| 28 | DELETE | `/v1/parents/children/{bindingId}` | parents | 已有 |
| 29 | GET | `/v1/parent/mood/{studentId}` | parents | 已有（需映射） |
| 30 | GET | `/v1/parents/emergency/alert` | parents | 已有（需映射） |
| 31 | POST | `/v1/parents/emergency/alert/{alertId}/confirm` | parents | 已有 |
| 32 | GET | `/v1/parents/emergency/resources` | parents | 已有 |
| 33 | GET | `/v1/parents/emergency/resources/{type}` | parents | 已有 |
| 34 | GET | `/v1/risk/level/{userId}` | risk | 已有（需映射） |
| 35 | GET | `/v1/risk/crisis/hotlines` | risk | 已有 |
| 36 | GET | `/v1/content/meditations` | content | 已有 |
| 37 | GET | `/v1/content/breathing/{type}` | content | 已有 |

---

## 11. 适配层映射清单（后端就绪后逐条核对）

| UI 需要 | 后端返回 | 映射位置 |
| --- | --- | --- |
| `session{token,role,userId,nickname,classId}` | `{token,user{...}}` / 扁平 | `adaptSession()` |
| `mood.checkin` 入参 | `{userId,moodLevel,tags,note}` | 已一致 |
| `knowledge.search` | 无 | 直接用（新增） |
| `community.*` | 无 | 直接用（新增） |
| `assessment.questions → {scale}` | 裸 `{questions:[{question,options[],weight[]}]}` | `adaptScale()` |
| `assessment.submit answers` 对象 → 数组 | `answers: number[]` | `flattenAnswers()` |
| `assessment.result → {result}` | 裸 `{result_id,total_score,risk_level,...}` | `adaptResult()` |
| `classroom.stats` 扁平 | `{statistics,chartData}` | `adaptClassStats()` |
| `classroom.students[].checkinToday` | 可能缺 | `adaptStudents()` |
| `parents.children → {children}` | `ChildBindingResponse[]` | `adaptChildren()` |
| `parents.childMood(bindingId)` | `/parent/mood/{studentId}` | `resolveStudentId()` + `adaptChildMood()` |
| `parents.emergencyAlert → {alert}` | 裸 `EmergencyAlertResponse` | `adaptEmergencyAlert()` |
| `risk.level → {level}` | `{current_risk_level}` | `adaptRiskLevel()` |

---

## 12. 与 mock 的一致性约束

`USE_MOCK = true` 时（默认，直接双击 `index.html` 即为演示模式），`Mock.*` 必须返回与本文「适配映射后」**完全一致**的结构。任何新增字段先改本文，再改 mock，最后改 live 适配函数——三处口径必须同源。

---

## 13. Postman Collection（可执行契约）

本文第 10 节的 37 条端点已落成 Postman Collection，可直接导入或在 Postman 云端打开调试。

| 项 | 值 |
| --- | --- |
| 名称 | `StarIsle MVP Web API` |
| Collection ID | `43000927-99d5-454c-8c4f-35648a5d88a6` |
| Workspace | `hello-unknown466's Workspace`（team，`384ca11b-4b33-45e7-80d7-3506f27581bd`） |
| 分组 | 9 个，与本文 1–9 节一一对应（auth 4 / mood 3 / knowledge 4 / community 4 / assessment 5 / classroom 4 / parents 9 / risk 2 / content 2） |
| 鉴权 | 集合级 Bearer `{{token}}`，单请求 `inherit` |
| 变量 | `baseUrl`(= `http://localhost:8080/api`)、`token`、`userId`、`classId`、`studentId`、`bindingId`、`alertId`、`articleId`、`postId`、`resultId`、`scaleType`、`resourceType`、`breathingType`、`username`、`password`、`phone`、`code` |

使用方式：

1. 打开集合，改 `baseUrl`（默认指向本地后端 `http://localhost:8080/api`；线上改为 `https://api.starisle.com/api`）。
2. 先跑 `01 auth 认证 / 账号密码登录`：其 test 脚本会把响应里的 `data.token` 写入集合变量 `token`、`data.user.id` 写入 `userId`，后续请求自动带 Bearer。
3. 其余路径变量（`classId`/`studentId`/`bindingId`/`alertId`/`postId`/`resultId`）按实际数据改集合变量即可，无需改请求。

> 标记【新增】的端点（knowledge / community / assessment types & results / classroom alerts & review / parents children/{id}/mood）后端尚未实现，Postman 里先作为契约占位；前端此时用 `USE_MOCK = true` 的 mock 数据驱动界面。
