# 家长端 AI 对话接通真实模型 —— 实施计划

## Context（为什么做）

家长端 App 的「大星」对话目前**必然无法**拿到模型回复，且失败被伪装成正常：

1. `AppModule.kt` 的 `BASE_URL = "http://10.0.2.2:8080/"` —— 端口错（网关实际 8081），且缺 `/api` 前缀。
2. 各接口方法路径都以 `/` 开头（`@POST("/v1/chat/message")`），会**覆盖** `baseUrl` 的 path 段，即使改对 `BASE_URL` 仍会丢 `/api`。
3. Retrofit 直接按裸对象解析（`ChatResponse` / `List<ChatMessage>`），但网关统一返回 `{code,message,data}`，正文取不到。
4. OkHttp 未注入 `Authorization: Bearer`；而 `ChatController` 会校验 `currentUserId.equals(request.getUserId())`，无 Token 必被拒。
5. `AiRepository` 在任何失败/空正文时返回内置 `mockReplies`，掩盖真实错误。

目标：家长端发一句话 → 网关 8081 `/api/v1/chat/message` → ai-engine 8000 `/chat` → 本地 SFT 模型 `final_model` 真实回复；失败时如实显示错误，不再有 mock 文案。

必要前提：家长端**没有任何登录 UI**，`auth.userId` 恒为空（现在兜底成 `"parent1"`），`Authorization` 无从产生。需补一个最小登录/注册入口（真实调用 `/api/v1/parents/login|register`），否则「注入 Authorization」这条无从落地。

## 改动清单

### 1. `parent-app-android/app/src/main/java/com/starisle/parent/di/AppModule.kt`
- `BASE_URL` → `http://10.0.2.2:8081/api/`（模拟器走 10.0.2.2 映射到开发机；真机需改局域网 IP，代码注释写明）。
- 新增鉴权拦截器：从 DataStore 同步读取 `token`，非空则加 `Authorization: Bearer <token>`。
  - 复用已有 DataStore（`starisle_parent_prefs`）；用 `stringPreferencesKey("token")`（与 AuthViewModel 写入的 key 名一致即可，Preferences.Key 按 name 相等）。
- 超时调整：connect 10s / write 30s / **read 120s**（SFT 模型单次约 25s，原 10s 必超时）。

### 2. `.../data/api/Models.kt`（或新增 `ApiEnvelope.kt`）
- 确认/补齐通用信封：
  ```kotlin
  @JsonClass(generateAdapter = true)
  data class ApiEnvelope<T>(
      val code: Int = 0,
      val message: String? = null,
      val data: T? = null
  )
  ```
  所有字段带默认值/可空，避免 Moshi 缺字段抛异常。
- `ChatResponse` 补 `userId / emotionTags / responseTimeMs / model`（全可空带默认值）。
- 新增历史结构（网关 `GET /v1/chat/history/{userId}` 的 `data` 是对象不是数组）：
  ```kotlin
  data class ChatHistoryPayload(val userId: String? = null, val limit: Int? = null,
                                val messages: List<ChatHistoryItem>? = null)
  data class ChatHistoryItem(val role: String? = null, val content: String? = null,
                             val timestamp: String? = null)
  ```
- 话题：`data` 为 `{topics:[{id,title,icon}]}`，用 `TopicsPayload(topics)` 承接。

### 3. `.../data/api/AiApiService.kt`
- 路径去掉前导 `/`：`v1/chat/message`、`v1/chat/history/{userId}`、`v1/chat/topics`、`v1/risk/crisis/report`。
- 返回类型改为 `ApiEnvelope<...>`。

### 4. `.../data/repo/AiRepository.kt`
- `sendMessage`：`code == 200 && data?.response` 非空 → `ChatResult.Success(response, riskLevel)`；否则 `ChatResult.Error(网关 message 或 "code=xxx")`；网络异常 → `ChatResult.Error(真实异常信息)`。
- **删除 `mockReplies` 及所有 mock 兜底分支。**
- `getHistory`：解包 `data.messages` 映射为 `ChatMessage`（`id` 本地生成，`userId` 用入参）。

### 5. `.../data/api/ParentApiService.kt`
- 所有路径去掉前导 `/`；返回类型统一 `ApiEnvelope<T>`（`login/register/getMe/children/...`）。
- 说明：`/v1/parents/children/{bindingId}/mood` 后端未实现（404），本次不动其业务语义，仅保证类型一致。

### 6. `.../data/repo/ParentRepository.kt`
- 解包信封：`code == 200` 取 `data`，否则返回失败并带 `message`。
- 删除 `login/register` 相关的 mock 兜底；AI 对话相关 mock 已在上一条删除。其余非对话模块（心情/孩子列表）暂不扩散改动。

### 7. `.../ui/viewmodel/AuthViewModel.kt`
- 若缺 `register(phone, password, nickname)`，补上并调用 `ParentRepository.register`。
- 成功后把 `token / userId / nickname / phone` 写入 DataStore 并更新 State（与现有 `login` 逻辑一致）。

### 8. `.../ui/screens/ChatScreen.kt`
- `auth.userId == null` 时渲染紧凑登录/注册卡片（手机号、密码、昵称 + 登录/注册按钮），成功后自动进入对话。
- 去掉 `userId = auth.userId ?: "parent1"` 兜底。
- 发送失败时把 `chatError`（HTTP 状态 + 网关 message）显示在消息流中。

## 验证方式

1. 后端就绪检查（当前两个进程已在后台）：
   - `GET http://localhost:8000/health` → `{"status":"healthy",...}`
   - `POST http://localhost:8081/api/auth/register` → `code=200`
2. 构建：`parent-app-android` 下 `gradlew.bat assembleDebug`（`JAVA_HOME=C:\Users\pc\.jdks\temurin-24`，SDK 35）。
3. 安装运行（模拟器）：`adb install -r app/build/outputs/apk/debug/app-debug.apk`。
4. 端到端：注册家长账号 → 进入对话发「你好」→ 断言：
   - UI 出现真实中文回复（非 `mockReplies` 任一固定句）；
   - 网关日志/`responseTimeMs` 约 20–30s；
   - 断开 ai-engine（停 8000）后发送 → UI 显示真实错误文案，而非 mock 回复。
5. 若模拟器缺失或 10.0.2.2 映射不通，如实报告卡点，不伪造结果。
