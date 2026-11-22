# 教师端 AI 对话接入网关 — 实施方案

## 背景

教师端 Android（`teacher-app/StarIsle-teacher-android`）的「对话」页目前是纯本地状态：`TeacherViewModel.addChatMessage` 只往内存列表追加消息，没有任何网络调用。家长端已完成「网关 + 真实模型」接入，教师端需要复用同一套做法。

目标：教师端「对话」页新增 **AI 助手** 会话，经网关 `POST /api/v1/chat/message` 拿到模型真实回复；为此补齐教师端缺失的登录入口与 token 存储。

## 范围与风险（比预想大）

教师端**完全没有**网关注册/登录、token 存储、Bearer 拦截器、userId 来源，只有直连智谱/SiliconFlow 的 AI 工具链路。因此本次需要新增一套网关客户端 + 认证，而不是改一个发送函数。

- 不改 `ChatObservationScreen`：那是「教师观察学生 + 干预发言」，消息语义属于学生会话；若转发到 `/chat/message` 会被网关记成教师本人的 AI 会话，污染数据。
- 不改现有智谱/SiliconFlow 链路，避免 JWT 外泄到第三方域名。
- 网关 `/api/v1/chat/**` 已允许 TEACHER 角色，后端无需改动。

## 关键设计

1. **交互落点**：`ChatScreen` 的 Tab 统一扩为三段，AI 助手固定索引 1：
   - COUNSELOR：`可观察对话 / AI 助手 / 系统通知`
   - 普通教师：`自我求助 / AI 助手 / 系统通知`
   - `when(selectedTab) 1 -> TeacherAiChatTab()`，其余保持原逻辑。
2. **认证**：使用网关 `/api/v1/users/login`、`/api/v1/users/register`（username + password，注册固定 `role="teacher"`，不传 `ageGroup`；后端 `@Pattern` 对 null 放行）。token/user_id/nickname 存 DataStore（`starisle_teacher_prefs`）。
   - 未登录时 AI 助手 Tab 内直接展示登录/注册表单；登录后展示会话与「退出登录」。不整体门禁 App，避免影响现有 4 个 Tab 的演示流程。
3. **编码**：Moshi 用已引入的 `moshi-kotlin` + `KotlinJsonAdapterFactory`，不新增 codegen 依赖。
4. **超时**：本地模型单次 20-30s，网关 client 读超时 120s（与家长端一致）。
5. **明文 HTTP**：manifest 补 `android:usesCleartextTraffic="true"`，否则 targetSdk 35 拒绝 `http://10.0.2.2:8081`。

## 文件清单

### 新增（9 个）

| 文件 | 内容 |
| --- | --- |
| `data/local/TeacherSessionStore.kt` | 包装 DataStore，读写 `token/user_id/nickname`，暴露 `sessionFlow`、`save`、`clear` |
| `data/models/GatewayModels.kt` | `ApiEnvelope<T>`、`LoginRequest`、`RegisterRequest`、`TeacherLoginResponse`、`GatewayChatRequest`、`GatewayContextMessage`、`GatewayChatResponse` |
| `data/api/GatewayApiService.kt` | `@POST("v1/users/login")`、`v1/users/register`、`v1/chat/message`（路径不以 `/` 开头） |
| `data/repo/TeacherAuthRepository.kt` | 解包 `{code,message,data}`，校验 token，返回 Result |
| `data/repo/GatewayChatRepository.kt` | 解包 chat 响应，空回复/`model=="unknown"`/网络异常转可读错误 |
| `ui/viewmodel/TeacherAuthViewModel.kt` | `AuthUiState(loggedIn, loading, error, nickname)`；init 读 DataStore；login/register/logout |
| `ui/viewmodel/TeacherAiChatViewModel.kt` | `messages/input/isSending/error/riskLevel`；sendMessage 构造 context（最近 10 条 user/assistant）、userProfile 带 role/nickname |
| `ui/screens/TeacherLoginPanel.kt` | 登录/注册切换表单（用户名、密码、昵称） |
| `ui/screens/TeacherAiChatTab.kt` | 气泡列表 + 自动滚底 + 输入框 + 发送中/错误重试 + 模型名与耗时小字 + 风险横条 + 退出登录 |

### 修改（4 个）

| 文件 | 改动 |
| --- | --- |
| `di/AppModule.kt` | 新增 `DataStore<Preferences>`、`Moshi`（`KotlinJsonAdapterFactory`）、`@GatewayOkHttp`（Bearer 拦截器，`runBlocking` 读 token，10s/120s）、`@GatewayRetrofit`（`http://10.0.2.2:8081/api/`）、`GatewayApiService`、两个 Repository 的 `@Provides` |
| `ui/screens/ChatScreen.kt` | Tab 列表加「AI 助手」，`when` 增加索引 1 分支 |
| `AndroidManifest.xml` | `<application android:usesCleartextTraffic="true">` |
| `ui/screens/ProfileScreen.kt` | 仅当实现成本低时展示登录状态；否则跳过 |

`app/build.gradle.kts` 不需要改动（datastore/retrofit/moshi-kotlin/hilt 均已存在）。

## 验证

环境已确认：SDK `C:\Users\pc\Android\Sdk`（build-tools 34/35）、AVD `starisle_test`、Gradle 8.9、自动下载的 JDK 17 位于 `C:\Users\pc\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2`。ai-engine 8000 已运行；网关 8081 未运行，机器无 mvn。

1. **起网关**：下载 Maven 3.9.9 到 `F:\tmp\apache-maven-3.9.9`（不写入仓库），`mvn.cmd -f backend-java\pom.xml -DskipTests spring-boot:run`，确认 8081 监听。
2. **后端旁证**：curl + UTF-8 文件体注册教师（`role=teacher`）→ 取 token → `POST /api/v1/chat/message`（`userId` 与 token 一致）→ 断言 `data.response` 非空、`data.model` 非 unknown。
3. **构建**：`JAVA_HOME` 指向 JDK 17，`gradlew.bat :app:assembleDebug`，`adb install -r app-debug.apk`。
4. **模拟器冒烟**：`emulator -avd starisle_test -no-snapshot-load` → 启动 App → 对话 → AI 助手 → 注册/登录 → 发一句「最近班上有个学生压力很大，我该怎么和他沟通？」→ 截图确认出现非空模型气泡（气泡下方显示 model/耗时）；`adb logcat` 无异常。
5. **失败路径**：停网关后发送，确认显示错误并可重试、不崩溃。

## 回滚

`git checkout --` 还原 `AppModule.kt`、`ChatScreen.kt`、`AndroidManifest.xml`、`ProfileScreen.kt`，删除新增 9 个文件；后端与 ai-engine 无改动。
