# 教师端收回「观察学生」权限 — 实施计划

> 状态：待确认（只读调研已完成，未改任何代码）
> 前置：教师端 AI 助手已接入网关并实测通过

## 1. 现状盘点

### 后端（backend-java，8081）
- 不存在教师观察学生会话的接口。
- [ChatController.java](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/controller/ChatController.java#L66-L130)：
  - `POST /api/v1/chat/message` 要求 token userId 与请求 userId 一致；
  - `GET /api/v1/chat/history/{userId}` 仅允许查询本人历史。
- [SecurityConfig.java](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/config/SecurityConfig.java#L81-L89)：`/chat/**` 对 STUDENT/TEACHER/PARENT 开放，但接口内已做本人校验。
- 结论：后端层面教师已经拿不到学生对话，无需修改；如需更严格语义，可补显式角色注释或 403 文案（非必需）。

### 教师端（StarIsle-teacher-android）
观察能力目前是纯本地演示数据，不经过网络：
1. [ChatScreen.kt](file:///f:/B_proj/Big_proj/-StarIsle-/teacher-app/StarIsle-teacher-android/app/src/main/java/com/starisle/teacher/ui/screens/ChatScreen.kt#L87-L140)
   - 心理老师（COUNSELOR）第一个 Tab 为「可观察对话」；
   - 点击会话进入 `ChatObservationScreen`（仅观察 / 介入切换 + 向学生会话插入教师消息）。
2. [TeacherRepository.kt](file:///f:/B_proj/Big_proj/-StarIsle-/teacher-app/StarIsle-teacher-android/app/src/main/java/com/starisle/teacher/data/repo/TeacherRepository.kt#L243-L300)
   - `chatSessions` 为内置示例学生会话（含 `isIntervening`）。
3. [TeacherViewModel.kt](file:///f:/B_proj/Big_proj/-StarIsle-/teacher-app/StarIsle-teacher-android/app/src/main/java/com/starisle/teacher/ui/viewmodel/TeacherViewModel.kt#L101-L120)
   - `addChatMessage` / `toggleIntervention` 修改本地会话。
4. `StudentChatSession` 模型仅被以上三处引用（已 grep 确认）。

### 不受影响
- 「学生」Tab 的风险趋势 / 报告历史（`StudentsScreen` / `StudentDetailScreen`）属于另一维度，不在「观察会话」范围内。
- 普通教师（非 COUNSELOR）本来就没有观察入口，只有「自我求助」。

## 2. 方案（默认：所有教师统一收回）

1. `ChatScreen.kt`
   - 所有角色 Tabs 统一为 `["AI 助手", "系统通知"]`；
   - 删除 `selectedSession` 分支、`CounselorChatListView`、`ChatObservationScreen` 两个私有 Composable 及相关 imports；
   - `selectedTab` 0 → AI 助手，1 → 系统通知。
2. `TeacherViewModel.kt`
   - 删除 `addChatMessage`、`toggleIntervention`、`setChatSessions`（确认无其他引用后）。
3. `TeacherRepository.kt`
   - 删除 `chatSessions` 示例数据。
4. `Models.kt`
   - 删除 `StudentChatSession`（仅上述位置使用）。
5. 后端：不改。
6. 验证：`assembleDebug` 通过；模拟器登录后「对话」页无任何观察入口；AI 助手仍可正常对话。

## 3. 备选方案（仅收回普通教师，保留心理老师）

- 仅 COUNSELOR 保留「可观察对话」；普通教师维持现状（本来就没有）。
- 工作量更小（几乎无需改动），但等于「不切断心理老师」，需产品确认是否符合隐私要求。

## 4. 风险与影响

| 风险 | 说明 | 处理 |
| --- | --- | --- |
| 心理老师失去介入通道 | 若学校仍依赖心理老师线上介入学生对话 | 需确认是否仅对普通教师收回 |
| 编译引用遗漏 | 删除模型/方法后可能残留引用 | `assembleDebug` 全量编译验证 |
| 演示数据减少 | 工作台/演示场景少一块「介入中」状态 | 可接受，属于本次需求目标 |
| 后端未来演进 | 未来若新增教师观察接口，需在接口层按角色拒绝 | 本次不改，计划中记录 |

## 5. 待确认问题

1. 「他」指全体教师（含心理老师 COUNSELOR），还是仅普通班主任？
2. 是否只收回「会话观察/介入」，学生风险趋势与报告仍保留？
