# 星屿心理咨询重构实施计划

## 仓库调研结论

### 当前架构（多端多后端，需废弃）
- **客户端（3 个）**：
  - `student-app/StarIsle-student/`（Flutter/Dart + Riverpod）—— 最完整，含聊天/首页/探索/我的/AI工具 5 个页面
  - `parent-app/`（React Native）—— 家长端
  - `projects/psych-assessment-miniapp/`（微信小程序）—— 心理测评小程序
- **后端（3 个）**：
  - `server-services/ai-engine/`（Python/FastAPI）—— **已有完整 RAG 知识库**（MongoDB 全文检索 + 关键词降级 + 内存降级）、CBT 对话引擎、风险检测、情绪分析
  - `backend-java/`（Java Spring Boot）—— Assessment/Chat/Content/Mood/Parent/Risk/User 控制器
  - `server-services/backend/`（Go）—— API 网关，功能与 Java 重叠

### 已发现的关键问题
1. **Flutter 端编译不过**：`home_screen.dart` 引用了不存在的 `mood_provider.dart`、`mood_checkin_widget.dart`、`mood_chart_widget.dart`、`star宝_card_widget.dart`；`chat_screen.dart` 引用了不存在的 `chat_provider.dart`、`message_bubble_widget.dart`、`topic_card_widget.dart`、`emergency_help_widget.dart`。
2. **Python AI 引擎有未解决的合并冲突**：`main.py`、`knowledge_service.py`、`chat_service.py` 中存在 `<<<<<<< HEAD` / `>>>>>>>` 标记。
3. **后端功能重复**：Java、Go、Python 三套后端均有 chat/risk/mood/user 接口。
4. **客户端直连大模型 API**：`ai_service.dart` 在客户端硬编码智谱/SiliconFlow Key，存在泄露风险且无 RAG。

### 重构决策（已与用户确认）
- **唯一客户端**：Flutter 学生端（跨 iOS/Android）
- **唯一后端**：Python AI 引擎（复用已有 RAG 知识库）
- **废弃**：`parent-app/`、`projects/psych-assessment-miniapp/`、`backend-java/`、`server-services/backend/`（Go）
- **互助社区**：完整功能（求助帖按标签等级优先推送、帮帮者认证后回复、评论互动、状态管理）
- **问卷**：内置标准心理量表（PHQ-9 抑郁、GAD-7 焦虑、心理韧性量表等），自动计分与风险提示
- **核心设计原则**：尽量减少对用户"贴标签"，仅在语言内暗示，避免明面上提及诊断名称

---

## 文件与模块

### 一、Python AI 引擎（`server-services/ai-engine/`）

| 文件 | 变更说明 |
|------|---------|
| `app/main.py` | 修复合并冲突；新增社区/问卷/用户/投稿/管理/紧急求助路由 |
| `app/services/knowledge_service.py` | 修复合并冲突；新增 `recommend_for_user(user_id)` 个性化推荐（结合打卡记忆与画像） |
| `app/services/chat_service.py` | 修复合并冲突；在 system prompt 中强化"不贴标签"原则 |
| `app/models/knowledge.py` | 已有，无需大改 |
| `app/services/community_service.py` | **新建** —— 互助社区：求助帖 CRUD、标签等级、回复、帮帮者认证 |
| `app/services/assessment_service.py` | **新建** —— 标准量表题库、计分、风险分级（不直接返回诊断名，返回"关注方向"） |
| `app/services/user_service.py` | **新建** —— 用户注册/登录/资料、帮帮者认证状态、管理员权限 |
| `app/services/submission_service.py` | **新建** —— 投稿（文章/问卷）提交与审核 |
| `app/services/emergency_service.py` | **新建** —— 紧急求助热线、危机资源、一键求助 |
| `app/utils/db_connection.py` | 已有；新增 community/assessment/user/submission 集合初始化 |
| `data/knowledge_base.json` | 已有；补充青少年心理科普文章与量表条目 |
| `data/assessments/` | **新建目录** —— PHQ-9、GAD-7、CD-RISC 心理韧性等量表 JSON 定义 |

### 二、Flutter 客户端（`student-app/StarIsle-student/lib/`）

| 文件/目录 | 变更说明 |
|-----------|---------|
| `main.dart` | 精简启动流程，移除废弃的 memory_storage 调度（改由后端管理记忆） |
| `src/app.dart` | **重写** —— 底部 4 Tab 导航壳（AI陪聊/知识库/树人互助/我的） |
| `theme/app_theme.dart` | 微调：增加心理疗愈感配色（柔和绿、暖橙、星空蓝），圆角更大 |
| `services/api_service.dart` | **新建** —— 统一对接 Python AI 引擎的 HTTP 客户端（替代直连大模型） |
| `providers/chat_provider.dart` | **新建** —— 聊天状态管理（消息列表、发送、RAG 推荐文章注入） |
| `providers/mood_provider.dart` | **新建** —— 打卡状态管理（心情记录、情绪趋势） |
| `providers/knowledge_provider.dart` | **新建** —— 知识库列表、文章详情、AI 个性化推荐 |
| `providers/community_provider.dart` | **新建** —— 求助帖列表、发帖、回复、帮帮者认证 |
| `providers/assessment_provider.dart` | **新建** —— 问卷答题、计分、结果解读 |
| `providers/user_provider.dart` | **新建** —— 用户资料、认证状态、权限 |
| `screens/splash_screen.dart` | 保留并精简 |
| `screens/main_shell.dart` | **新建** —— 底部导航 + 4 个 Tab 的 PageView |
| `screens/chat/chat_screen.dart` | **重写** —— 心理贴合的聊天界面（小星形象、温暖气泡、话题引导、紧急入口） |
| `screens/chat/checkin_screen.dart` | **新建** —— 心情打卡界面（表情选择、强度、简短记录） |
| `screens/knowledge/knowledge_screen.dart` | **新建** —— 知识库首页（分类：情绪管理/人际/学业/自我成长/问卷） |
| `screens/knowledge/article_detail_screen.dart` | **新建** —— 文章详情 + RAG 相关推荐 |
| `screens/knowledge/assessment_screen.dart` | **新建** —— 问卷答题页 |
| `screens/knowledge/assessment_result_screen.dart` | **新建** —— 问卷结果（"关注方向"语言，不贴标签） |
| `screens/community/community_screen.dart` | **新建** —— 求助帖列表（按标签等级排序）+ 发帖入口 |
| `screens/community/post_detail_screen.dart` | **新建** —— 帖子详情 + 回复 |
| `screens/community/create_post_screen.dart` | **新建** —— 发布求助 |
| `screens/community/helper_auth_screen.dart` | **新建** —— 帮帮者认证 |
| `screens/profile/profile_screen.dart` | **重写** —— 个人信息/帮帮认证/紧急求助/管理员入口/投稿入口 |
| `screens/profile/personal_info_screen.dart` | **新建** |
| `screens/profile/emergency_screen.dart` | **新建** —— 紧急求助热线列表 + 一键拨打 |
| `screens/profile/admin_screen.dart` | **新建** —— 管理员入口（审核投稿、管理用户） |
| `screens/profile/submission_screen.dart` | **新建** —— 投稿入口（提交文章/问卷） |
| `widgets/` | **新建目录** —— 消息气泡、心情表情、标签、帖子卡片、问卷题目等可复用组件 |

### 三、清理（废弃但不删除，改为归档说明）
- `parent-app/`、`projects/psych-assessment-miniapp/`、`backend-java/`、`server-services/backend/` —— 在根 `README.md` 中标注为已废弃，不主动删除以保留历史。

---

## 实施步骤（依赖顺序）

### 阶段 0：修复基线（让项目重新可运行）
1. **修复 Python AI 引擎合并冲突** —— 清理 `main.py`、`knowledge_service.py`、`chat_service.py` 中的 `<<<<<<<` 标记，合并两侧逻辑（保留技能自动发现 + RAG 知识库）。
2. **验证 AI 引擎可启动** —— `cd server-services/ai-engine && python -m app.main` 能正常启动并加载知识库。
3. **修复 Flutter 编译错误** —— 删除/注释 `home_screen.dart`、`chat_screen.dart` 中对不存在文件的 import（这些页面将在阶段 3-6 重写），确保 `flutter analyze` 无致命错误。

### 阶段 1：后端能力建设（Python AI 引擎）
4. **用户服务 `user_service.py`** —— 注册/登录（JWT）、用户资料、帮帮者认证申请与状态、管理员角色标记。
5. **社区服务 `community_service.py`** ——
   - 求助帖模型：`{id, user_id, title, content, tags[], urgency_level(1-5), status, created_at}`
   - 标签等级：紧急/高/中/低，列表按 `urgency_level DESC, created_at DESC` 排序
   - 回复：`{id, post_id, user_id(需帮帮认证), content, created_at}`
   - 帮帮者认证：提交资质 → 管理员审核 → 通过后获得回复权限
6. **问卷服务 `assessment_service.py`** ——
   - 内置量表 JSON：PHQ-9（9 题）、GAD-7（7 题）、CD-RISC 心理韧性（10 题）
   - 计分逻辑 + 分级（如 PHQ-9：0-4 几乎无/5-9 轻度/10-14 中度/15-19 中重度/20-27 重度）
   - 结果返回"关注方向"文案而非诊断名（如"最近可能需要多关注自己的情绪状态"）
7. **投稿服务 `submission_service.py`** —— 投稿文章/问卷，状态（待审/已发布/已拒），管理员审核。
8. **紧急求助服务 `emergency_service.py`** —— 心理援助热线列表、危机资源、一键求助记录。
9. **RAG 个性化推荐增强** —— `knowledge_service.recommend_for_user(user_id)`：基于用户最近打卡情绪 + 问卷结果 + 聊天关键词，检索并推荐更贴合的文章。
10. **路由注册** —— 在 `main.py` 注册上述所有服务的 REST 端点。
11. **对话 system prompt 强化** —— 在 `star宝_system_prompt.py` 中加入"不贴诊断标签、用鼓励性语言、引导自助"原则。

### 阶段 2：Flutter 导航壳与基础设施
12. **API 服务层 `api_service.dart`** —— 封装所有后端 HTTP 调用（chat/knowledge/community/assessment/user/emergency），统一 base URL、JWT 头、错误处理。
13. **底部导航壳 `main_shell.dart`** —— 4 个 Tab：AI陪聊（聊天+打卡切换）、知识库、树人互助、我的。
14. **更新 `app.dart`** —— 初始路由指向 `main_shell`，保留 splash。
15. **主题微调** —— 在 `app_theme.dart` 增加疗愈配色（柔和绿 `#7CB342`、暖橙、星空蓝渐变）。

### 阶段 3：AI陪聊 Tab
16. **聊天 Provider `chat_provider.dart`** —— 消息列表、发送消息（调后端 `/chat`，带回 risk/emotion/rag_enhanced）、RAG 推荐文章卡片注入。
17. **聊天界面 `chat_screen.dart`** —— 心理贴合设计：温暖配色气泡、小星头像、空状态话题引导卡片、底部输入区含紧急求助按钮。
18. **打卡 Provider `mood_provider.dart`** + **打卡界面 `checkin_screen.dart`** —— 5 种心情表情选择、强度滑块、简短文字记录、历史趋势迷你图。
19. **可复用组件** —— `message_bubble_widget.dart`、`topic_card_widget.dart`、`emergency_help_widget.dart`、`mood_emoji_widget.dart`。

### 阶段 4：知识库 Tab
20. **知识库 Provider `knowledge_provider.dart`** —— 文章列表、分类、文章详情、AI 推荐。
21. **知识库首页 `knowledge_screen.dart`** —— 分类卡片（情绪管理/人际/学业/自我成长/问卷中心）、搜索框、AI 为你推荐区。
22. **文章详情 `article_detail_screen.dart`** —— Markdown 渲染、底部 RAG 相关推荐。
23. **问卷 Provider `assessment_provider.dart`** + **问卷答题 `assessment_screen.dart`** + **结果页 `assessment_result_screen.dart`** —— 题目逐题呈现、进度条、提交计分、结果用"关注方向"语言呈现并推荐相关文章。

### 阶段 5：树人互助 Tab
24. **社区 Provider `community_provider.dart`** —— 帖子列表、发帖、回复、认证状态。
25. **社区首页 `community_screen.dart`** —— 求助帖列表（顶部显示标签等级色条）、发帖 FAB、帮帮者认证入口提示。
26. **发帖页 `create_post_screen.dart`** —— 标题、内容、标签选择（含紧急等级）。
27. **帖子详情 `post_detail_screen.dart`** —— 帖子内容、回复列表、已认证者可回复。
28. **帮帮者认证 `helper_auth_screen.dart`** —— 资质提交表单、状态查询。

### 阶段 6：我的 Tab
29. **用户 Provider `user_provider.dart`** —— 资料、认证状态、角色。
30. **我的首页 `profile_screen.dart`** —— 头像/昵称卡片 + 5 个入口（个人信息、帮帮认证、紧急求助、管理员入口、投稿入口）。
31. **个人信息 `personal_info_screen.dart`**、**紧急求助 `emergency_screen.dart`**、**管理员 `admin_screen.dart`**、**投稿 `submission_screen.dart`**。

### 阶段 7：收尾
32. **全链路联调** —— 聊天→RAG 推荐→文章→问卷→打卡记忆→个性化推荐闭环跑通。
33. **更新根 README** —— 标注废弃模块，说明新架构（Flutter + Python）。
34. **`flutter analyze` 与 `flutter build` 验证**。

---

## 依赖与注意事项

- **RAG 依赖**：知识库推荐功能依赖 MongoDB；若 DB 不可用，已有内存降级模式可保证基础检索，但个性化推荐需用户记忆数据（存在 DB 中）。
- **API Key 安全**：大模型 API Key 仅存于 Python 后端环境变量，Flutter 端不再持有任何 Key。
- **不贴标签原则**：问卷结果、风险检测、聊天回复均避免出现"抑郁症/焦虑症"等诊断词，改用"情绪状态需要关注"等中性表达。
- **帮帮者权限**：未认证用户只能浏览求助帖，不能回复；认证需管理员审核。
- **紧急求助**：聊天中检测到高风险（自伤意念关键词）时，自动弹出紧急求助卡片。
- **Riverpod 规范**：所有页面状态通过 `StateNotifierProvider` 管理，遵循现有 `ai_provider.dart` 模式。
- **合并冲突修复**：以保留 RAG 知识库 + 技能自动发现两侧功能为准。

---

## 验证

1. **Python 后端**：`pytest` 跑通已有测试；`curl` 验证 `/chat`、`/knowledge/search`、`/community/posts`、`/assessments/phq9` 返回正常。
2. **Flutter 编译**：`flutter analyze` 无 error；`flutter build apk --debug` 成功。
3. **核心闭环 E2E**：
   - 打开 App → AI陪聊发送消息 → 收到带 RAG 标记的回复 → 推荐文章可点击跳转
   - 打卡心情 → 知识库"AI为你推荐"出现对应情绪文章
   - 完成 PHQ-9 → 结果页显示"关注方向"+ 推荐文章，无诊断标签
   - 发布求助帖（紧急等级高）→ 列表顶部显示
   - 帮帮者未认证 → 回复按钮置灰；认证通过 → 可回复
4. **不贴标签检查**：全文搜索"抑郁症"/"焦虑症"等诊断词，确认仅出现在量表题目或管理员后台，不出现在用户-facing 结果文案。

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| Python 合并冲突修复后功能回归 | 修复后立即跑 `pytest` + 启动验证知识库加载 |
| Flutter 现有 broken imports 修复范围大 | 直接重写受影响页面（阶段 3-6），不在旧文件上修补 |
| 大模型 API 调用成本/限流 | 复用现有 deepseek 配置；聊天接口加响应缓存 |
| 心理咨询合规风险 | 明确"非医疗诊断"免责声明；高风险自动引导至专业热线；不替代专业治疗 |
| 社区内容安全 | 求助帖与回复接入后端风险检测关键词过滤；管理员可删除 |
| MongoDB 不可用时降级 | 已有内存降级模式；用户记忆/社区数据在 fallback 下提示"部分功能受限" |
