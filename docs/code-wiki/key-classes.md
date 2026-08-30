# 关键类与函数说明

## 1. Java 后端（backend-java）

### 1.1 启动类

#### `StarIsleApplication`
- **路径**: `backend-java/src/main/java/com/starisle/StarIsleApplication.java`
- **职责**: Spring Boot 应用入口，启用自动配置与组件扫描
- **关键函数**:
  - `main(String[] args)`: 启动 Spring 应用上下文

### 1.2 配置类

#### `SecurityConfig`
- **路径**: `backend-java/src/main/java/com/starisle/config/SecurityConfig.java`
- **职责**: Spring Security 核心配置，定义访问控制规则
- **关键函数**:
  - `filterChain(HttpSecurity http)`: 配置安全过滤链
    - 禁用 CSRF（前后端分离）
    - 配置 CORS
    - 无状态 Session（STATELESS）
    - 角色权限控制：`/api/v1/parents/**` 需 PARENT 角色，`/api/v1/chat/**` 需 STUDENT/TEACHER/PARENT 角色
    - 注册 JWT 认证过滤器
  - `passwordEncoder()`: BCryptPasswordEncoder(12) 密码哈希
  - `corsConfigurationSource()`: 配置允许的来源（localhost、*.starisle.com）

#### `JwtAuthenticationFilter`
- **路径**: `backend-java/src/main/java/com/starisle/config/JwtAuthenticationFilter.java`
- **职责**: 拦截请求，解析并校验 JWT Token，设置 SecurityContext

#### `WebSocketConfig`
- **路径**: `backend-java/src/main/java/com/starisle/config/WebSocketConfig.java`
- **职责**: 配置 WebSocket 端点与消息代理

### 1.3 Controller 层

#### `ChatController`
- **路径**: `backend-java/src/main/java/com/starisle/controller/ChatController.java`
- **职责**: 处理聊天相关 HTTP 请求
- **关键函数**:
  - `sendMessage(SendMessageRequest request)`: 发送消息
    - 校验用户只能替自己发消息
    - 调用 `ChatService.generateResponse()` 生成回复
    - 返回响应时间和用户 ID
  - `getChatHistory(String userId, Integer limit)`: 获取聊天历史
    - 默认 limit 50，最大 100
    - 从 `ChatMessageRepository` 查询并按时间倒序
  - `getTopicCards()`: 返回 5 个预设话题卡片（压力、朋友、未来、家庭、心情）

#### `UserController`
- **路径**: `backend-java/src/main/java/com/starisle/controller/UserController.java`
- **职责**: 用户注册、查询、更新、删除、数据导出

#### `MoodController`
- **路径**: `backend-java/src/main/java/com/starisle/controller/MoodController.java`
- **职责**: 心情打卡提交、历史查询、图表数据

#### `RiskController`
- **路径**: `backend-java/src/main/java/com/starisle/controller/RiskController.java`
- **职责**: 风险检测触发、用户风险等级查询

#### `ParentController`
- **路径**: `backend-java/src/main/java/com/starisle/controller/ParentController.java`
- **职责**: 家长注册/登录、孩子绑定、授权管理

### 1.4 Service 层

#### `ChatService`
- **路径**: `backend-java/src/main/java/com/starisle/service/ChatService.java`
- **职责**: AI 对话业务逻辑（Java 端封装）
- **关键函数**:
  - `generateResponse(String userId, String message, List<Map<String, Object>> context, Map<String, Object> userProfile)`: 生成对话回复
    - 调用 `StarIsleSystemPrompt.generatePrompt()` 构建系统提示词
    - 保留最近 10 轮上下文
    - 降级策略：API 异常时返回"小星好像有点迷糊了，请稍后再试试～"
    - 返回 `ChatResponse`（内容、响应时间、模型名）

#### `RiskDetectionService`
- **路径**: `backend-java/src/main/java/com/starisle/service/RiskDetectionService.java`
- **职责**: 风险检测（Java 端实现）
- **关键函数**:
  - `detectRisk(String userId, String content)`: 综合风险检测
    - 调用 `detectKeywords()` 进行 L1 关键词匹配
    - 调用 `SemanticAnalyzer.analyze()` 进行 L2 语义分析
    - 返回最高风险等级（green/yellow/orange/red）
  - `detectKeywords(String content)`: 检测高风险/中风险关键词列表
    - 高风险（red）: 自杀、想死、自残、割腕、绝望等
    - 中风险（orange）: 抑郁、焦虑、失眠、孤独等
  - `calculateFinalRisk(...)`: 取 L1 和 L2 的最高风险等级
  - `getDetectionDetails(String content)`: 返回检测详情（关键词、意图、置信度）

#### `EmotionAnalysisService`
- **路径**: `backend-java/src/main/java/com/starisle/service/EmotionAnalysisService.java`
- **职责**: 情绪分析业务封装

#### `KeyManagerService`
- **路径**: `backend-java/src/main/java/com/starisle/service/KeyManagerService.java`
- **职责**: 加密密钥的生成、轮换、版本管理

#### `ParentService`
- **路径**: `backend-java/src/main/java/com/starisle/service/ParentService.java`
- **职责**: 家长业务逻辑（注册、绑定、授权）

### 1.5 工具类

#### `EncryptionUtil`
- **路径**: `backend-java/src/main/java/com/starisle/utils/EncryptionUtil.java`
- **职责**: AES-256-GCM 端到端加密工具
- **关键函数**:
  - `encrypt(String content)`: 加密内容，委托给 `KeyManagerService`
  - `decrypt(String encryptedContent)`: 解密内容
  - `generateUserKey(String userId)`: 基于用户 ID 生成 SHA-256 派生密钥
  - `generateRandomKey()`: 生成 32 字节随机密钥（Base64）
  - `validateEncryptedFormat(String encryptedContent)`: 校验密文格式（`v{version}:{payload}`）

#### `JwtUtil`
- **路径**: `backend-java/src/main/java/com/starisle/utils/JwtUtil.java`
- **职责**: JWT Token 生成与解析

### 1.6 Entity 层

| 类名 | 职责 |
|------|------|
| `User` | 基础用户实体（id, nickname, role, classId 等） |
| `ParentUser` | 家长用户扩展 |
| `MoodRecord` | 心情打卡记录（userId, moodLevel 1-5, tags, checkinDate） |
| `ChatMessage` | 聊天消息（userId, content, role, riskLevel） |
| `AssessmentResult` | 测评结果 |
| `ParentStudentBinding` | 家长-学生绑定关系 |
| `EmergencyAlert` | 紧急预警记录 |
| `EmergencyResource` | 应急资源（热线等） |
| `EncryptionKey` | 加密密钥存储 |

---

## 2. Web 前端（web-frontend）

### 2.1 入口与路由

#### `App.tsx`
- **路径**: `web-frontend/src/App.tsx`
- **职责**: 根组件，定义路由结构与角色保护
- **关键组件**:
  - `ProtectedRoute`: 路由守卫，校验登录状态和角色权限
    - 未登录跳转 `/`
    - 角色不匹配时重定向到对应首页
  - 路由表:
    - `/` -> 登录/欢迎页
    - `/student` -> 学生首页
    - `/student/chat` -> 学生对话
    - `/student/relax` -> 学生放松
    - `/student/profile` -> 学生个人中心
    - `/teacher` -> 教师首页
    - `/teacher/chat` -> 教师对话
    - `/teacher/relax` -> 教师放松
    - `/teacher/profile` -> 教师个人中心
    - `/parent` -> 家长首页（Dashboard）
    - `/parent/chat` -> 家长 AI 对话
    - `/parent/children` -> 家长孩子绑定管理
    - `/parent/emergency` -> 家长应急预案中心
    - `/parent/profile` -> 家长个人中心

#### `main.tsx`
- **路径**: `web-frontend/src/main.tsx`
- **职责**: React 应用挂载入口

### 2.2 状态管理（Zustand）

#### `authStore`
- **路径**: `web-frontend/src/store/authStore.ts`
- **职责**: 全局认证状态管理
- **关键状态**:
  - `user: User | null`: 当前用户信息
  - `token: string | null`: JWT Token
  - `isLoggedIn: boolean`: 登录状态
  - `loginMethod: LoginMethod | null`: 登录方式（credentials/wechat/qq/apple/phone）
- **关键函数**:
  - `login(credentials)`: 模拟登录（目前使用 mock 用户数据）
  - `register(data)`: 模拟注册
  - `loginWithThirdParty(provider, userInfo)`: 第三方登录
  - `loginWithPhone(phone, code)`: 手机号登录
  - `logout()`: 清空状态
- **持久化**: 使用 Zustand `persist` 中间件，localStorage 存储 `user/token/isLoggedIn/loginMethod`

#### `chatStore`
- **路径**: `web-frontend/src/store/chatStore.ts`
- **职责**: 聊天消息管理、发送消息

#### `moodStore`
- **路径**: `web-frontend/src/store/moodStore.ts`
- **职责**: 情绪数据、打卡记录

#### `classroomStore`
- **路径**: `web-frontend/src/store/classroomStore.ts`
- **职责**: 班级信息、学生列表

#### `parentStore`
- **路径**: `web-frontend/src/store/parentStore.ts`
- **职责**: 家长端专用状态（孩子绑定、情绪趋势、知识库、预警）
- **关键函数**:
  - `fetchChildren(userId)`: 获取绑定的孩子列表
  - `fetchMoodTrend(studentId, days)`: 获取情绪趋势
  - `fetchMoodSummary(studentId)`: 获取情绪概览与 AI 建议

### 2.3 页面组件

#### 学生端

| 组件 | 路径 | 职责 |
|------|------|------|
| `StudentHome` | `pages/student/StudentHome.tsx` | 今日心情打卡、快捷入口、情绪趋势 |
| `StudentChat` | `pages/student/StudentChat.tsx` | AI 星宝对话、消息气泡、话题卡片 |
| `StudentRelax` | `pages/student/StudentRelax.tsx` | 冥想、解压游戏 |
| `StudentProfile` | `pages/student/StudentProfile.tsx` | 个人资料、使用记录、设置 |

#### 教师端

| 组件 | 路径 | 职责 |
|------|------|------|
| `TeacherHome` | `pages/teacher/TeacherHome.tsx` | 班级状态概览、预警列表 |
| `TeacherChat` | `pages/teacher/TeacherChat.tsx` | 专业 AI 对话 |
| `TeacherRelax` | `pages/teacher/TeacherRelax.tsx` | 放松工具 |
| `TeacherProfile` | `pages/teacher/TeacherProfile.tsx` | 个人信息、数据管理 |

#### 家长端

| 组件 | 路径 | 职责 |
|------|------|------|
| `ParentHome` | `pages/parent/ParentHome.tsx` | 孩子情绪概览 + 内嵌 MoodDetail（7/30/90 天趋势）+ AI 建议 + 打卡日历 |
| `ParentChat` | `pages/parent/ParentChat.tsx` | 与大星 AI 对话 |
| `ParentChildren` | `pages/parent/ParentChildren.tsx` | 绑定新孩子 / 管理绑定列表 |
| `ParentEmergency` | `pages/parent/ParentEmergency.tsx` | 应急预案中心 + 内嵌 EmergencyDetail（红色告警详情与处理流程） |
| `ParentProfile` | `pages/parent/ParentProfile.tsx` | 孩子绑定、知识库查看、设置 |

> 说明：早期版本的独立文件 `MoodDetail.tsx` 与 `EmergencyDetail.tsx` 现内嵌为 ParentHome / ParentEmergency 内的子 Section，不再单独作为一级路由页面导出。

### 2.4 通用组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `Header` | `components/common/Header.tsx` | 顶部导航栏 |
| `Button` | `components/ui/Button.tsx` | 基础按钮 |
| `Card` | `components/ui/Card.tsx` | 卡片容器 |
| `Input` | `components/ui/Input.tsx` | 输入框 |
| `Modal` | `components/ui/Modal.tsx` | 弹窗 |
| `Tabs` | `components/ui/Tabs.tsx` | 标签切换 |
| `Toast` | `components/ui/Toast.tsx` | 轻提示 |
| `BubbleWrapGame` | `components/BubbleWrapGame.tsx` | 解压泡泡游戏 |
| `LazyLoad` | `components/LazyLoad.tsx` | 懒加载包装器 |
| `SuspenseWrapper` | `components/SuspenseWrapper.tsx` | 异步加载状态 |

---

## 3. AI 引擎（server-services/ai-engine）

### 3.1 入口

#### `main.py`
- **路径**: `server-services/ai-engine/app/main.py`
- **职责**: FastAPI 应用实例、服务初始化、路由注册
- **关键对象**:
  - `chat_service = ChatService()`
  - `risk_service = RiskDetectionService()`
  - `emotion_service = EmotionAnalysisService()`
- **API 端点**:
  - `GET /health`: 健康检查
  - `POST /chat`: AI 对话（核心）
  - `POST /risk/check`: 风险检测
  - `POST /emotion/analyze`: 情绪分析
  - `GET /topics`: 话题卡片
  - `WebSocket /ws/chat/{user_id}`: 实时对话
  - `POST /knowledge/search` `v2.0增强`: RAG 知识检索（支持 source_repo_id 过滤）
  - `GET /knowledge/stats` `v2.0增强`: 知识库条目/来源统计
  - `POST /knowledge/import` `v2.0增强`: 注入新知识（带 source_repo_id + (title,repo_id) 去重）
  - `GET /skills/status` `v2.0新增`: 小星 Skill 健康状态（available/disabled_by_error 统计 + 每个 skill 详情）

### 3.2 服务层

#### `ChatService`
- **路径**: `server-services/ai-engine/app/services/chat_service.py`
- **职责**: AI 对话生成核心（已集成 Skill 路由能力，v2.0增强）
- **关键函数**:
  - `generate_response(user_id, message, context, user_profile)`: 生成回复
    - 调用 `Star宝SystemPrompt.generate_prompt()` 构建 CBT 系统提示
    - 保留最近 10 轮上下文
    - 先通过 `SkillRouter.route()` 动态匹配 Skill（命中时附加 Skill 结果）
    - 根据 `USE_LOCAL_MODEL` 环境变量选择本地模型或 DeepSeek API
    - 降级策略：异常时返回安全提示语，Skill 异常时禁用 Skill 不影响主对话
  - `_generate_api(messages)`: 调用 DeepSeek API（max_tokens=200, temperature=0.7）
  - `_generate_local(messages)`: 本地 Transformer 模型推理（HuggingFace）

#### `RiskDetectionService`
- **路径**: `server-services/ai-engine/app/services/risk_detection_service.py`
- **职责**: 多层级风险检测（v1.9 100% 准确率）
- **关键函数**:
  - `detect_risk(user_id, content, history)`: 综合检测
    - L1 `_detect_keywords()`: 28 类关键词匹配（高风险 red / 中风险 orange / 低风险 yellow）
    - L1.5 `_duration_rule()`: 同一分类在窗口内重复次数加权升级（v1.5新增）
    - L1.6 `_mood_history_rule()`: 结合用户心情历史负向斜率升级（v1.6新增）
    - L2 `_detect_semantic()`: 语义分析模型意图识别
    - `_downgrade_positive_word_rule()`: 搭配积极关键词（谢谢/好一点等）降级
    - `_downgrade_social_isolated_rule()`: 孤立短语降黄
    - `_calculate_final_risk()`: 取最高等级（四层降级链）
  - `get_detection_details(content)`: 返回关键词命中列表、语义意图、置信度

#### `EmotionAnalysisService`
- **路径**: `server-services/ai-engine/app/services/emotion_analysis_service.py`
- **职责**: 情绪标签提取

#### `KnowledgeService` `v2.0增强`
- **路径**: `server-services/ai-engine/app/services/knowledge_service.py`
- **职责**: RAG 知识库服务（26 本心理学书籍 + Fork 文档统一注入）
- **关键函数**:
  - `search(query, top_k, source_repo_id_filter)`: 语义检索
  - `import_entries([{title,content,source_repo_id,metadata}])`: 导入条目（`(title, source_repo_id)` 二元组去重）
  - `stats()`: 分来源数量统计

### 3.2b Skill 架构层 `v2.0新增`

#### `BaseSkill`
- **路径**: `server-services/ai-engine/app/skills/base_skill.py`
- **职责**: 所有 Fork Skill Adapter 的抽象基类（统一签名 + 统一错误处理）
- **关键契约方法**: `can_handle(intent)`, `execute(params) -> str`, `get_metadata()`
- **错误处理**: 执行累计 N 次异常后自动进入 `disabled_by_error` 状态，不阻塞主对话

#### `SkillRouter`
- **路径**: `server-services/ai-engine/app/skills/skill_router.py`
- **职责**: 动态注册、路由、健康状态维护
- **关键函数**:
  - `register(skill_instance)`: 启动时装载所有 Adapter
  - `route(intent, params)`: 按 can_handle 匹配度选择 Skill，失败返回 None
  - `get_status()`: 返回所有 Skill 的状态（对应 GET /skills/status）

#### `EmotionalSupportConversationSkill`（示例 Adapter）
- **路径**: `server-services/ai-engine/app/skills/emotional_support_conversation_adapter.py`
- **职责**: 封装情感支持对话能力的 Fork Skill Adapter；其他 Adapter 同目录（sentiment_analysis_mental_health_adapter.py, bert_mental_health_adapter.py）

### 3.3 模型与提示词

#### `SemanticAnalyzer`
- **路径**: `server-services/ai-engine/app/models/semantic_analyzer.py`
- **职责**: 语义分析模型封装（Word2Vec / Transformers）

#### `Star宝SystemPrompt`
- **路径**: `server-services/ai-engine/app/prompts/star宝_system_prompt.py`
- **职责**: 生成星宝角色的 CBT 框架系统提示词

### 3.4 工具类

#### `KeywordManager`
- **路径**: `server-services/ai-engine/app/utils/keyword_manager.py`
- **职责**: 风险关键词库的动态加载与更新

#### `EncryptionUtil`
- **路径**: `server-services/ai-engine/app/utils/encryption.py`
- **职责**: 与 Java 后端对齐的加密/解密实现

---

## 4. Flutter 移动端

### 4.1 学生端

#### `main.dart`
- **路径**: `student-app/StarIsle-student/lib/main.dart`
- **职责**: Flutter 应用入口
- **初始化流程**:
  1. `WidgetsFlutterBinding.ensureInitialized()`
  2. `MaintenanceScheduler.initialize()` 初始化定时维护任务
  3. `StorageMonitor.startMonitoring()` 启动存储监控
  4. `runApp(ProviderScope(child: StarIsleApp()))`

#### `StarIsleApp` (`src/app.dart`)
- **职责**: MaterialApp 配置、主题、路由

#### `HomeScreen`
- **路径**: `lib/screens/home_screen.dart`
- **职责**: 学生首页（今日心情、快捷入口）

#### `ChatScreen`
- **路径**: `lib/screens/chat_screen.dart`
- **职责**: AI 对话页面

#### `AIService`
- **路径**: `lib/services/ai_service.dart`
- **职责**: 调用后端 AI 接口、本地缓存对话

#### `MemoryStorageService`
- **路径**: `lib/services/memory_storage/memory_storage_service.dart`
- **职责**: 本地加密数据库操作（SQLCipher）

#### `MaintenanceScheduler`
- **路径**: `lib/services/memory_storage/maintenance_scheduler.dart`
- **职责**: 定时整理本地存储、清理过期数据

#### `StorageMonitor`
- **路径**: `lib/services/memory_storage/storage_monitor.dart`
- **职责**: 监控本地存储容量、告警

### 4.2 教师端

#### `StarIsleTeacherApp` (`src/app.dart`)
- **职责**: 教师端 MaterialApp 配置

#### `WorkbenchScreen`
- **路径**: `lib/screens/workbench_screen.dart`
- **职责**: 教师工作台（班级概览、预警）

#### `StudentsScreen`
- **路径**: `lib/screens/students_screen.dart`
- **职责**: 学生列表与情绪状态查看

#### `TeacherModels`
- **路径**: `lib/models/teacher_models.dart`
- **职责**: 教师端专用数据模型

---

## 5. 家长端

### `ParentHome.tsx`
- **路径**: `parent-app/src/pages/parent/ParentHome.tsx`
- **职责**: 家长首页核心页面
- **关键逻辑**:
  - 展示当前绑定孩子的情绪状态与风险等级
  - 14 天打卡日历渲染
  - 7 天情绪趋势柱状图（基于 moodTrend 数据动态计算高度）
  - AI 关怀建议卡片
  - 底部导航：首页 / 聊一聊 / 我的

### `parentStore.ts`
- **路径**: `parent-app/src/store/parentStore.ts`
- **职责**: 家长端全局状态
- **关键状态**:
  - `children: ChildBinding[]`: 绑定的孩子列表
  - `currentChildId: string`: 当前查看的孩子
  - `moodTrend: MoodTrendData[]`: 情绪趋势数据
  - `moodSummary: MoodSummary`: 情绪概览（含 AI 建议）
  - `knowledgeArticles: KnowledgeArticle[]`: 知识库文章
