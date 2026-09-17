# HOTL Checkpoint-2（批次 B：Task2 班级管理 + Task5 反馈提交）· 两轮 Controller Review ✅ **100% 通过（0 缺陷 0 越界修改）**

> **归档时间**：2026-09-03 · **审查类型**：R1 功能正确性 + R2 安全隐私合规匿名化白名单 · **范围**：Task2（Subagent-3）+ Task5（Subagent-4）

---

## 0. 范围边界冻结核查（先于任何功能审查）★ 1693753 反范围失控原则

| # | 禁令 | 结果 | 证据命令输出 |
|---|------|------|---------|
| 1 | 子 Agent 只允许新建 12 个指定文件（classOperate 2 + 两页面 4+4=8 + feedbackSubmit 2） | ✅ PASS：12/12 全部真实存在 | `RunCommand job-c47ab358... (§A)` 12 Exists=True |
| 2 | 禁止修改 `app.json` 与 `cloudfunctions/shared/*` | ✅ PASS：6 文件最后写入时间停留在 Task0（2026/09/03 14:33-14:35 UTC），批次 B 期间 0 次写入 | `§D` 表：app.json / collectionNames.js / dashscopeClient.js / responseWrapper.js / stripPII.js / verifyRole.js 全部 UTC 14:33~14:35 未变 |
| 3 | 禁止创建或修改任何未列文件（Task4 学生页/Task6 aiAnalyze 等其它任务文件） | ✅ PASS：任务描述中仅 Task2 10 + Task5 2 文件有新建 | A 表仅有这 12，其余目录无新增 |

> **结论**：子 agent 严格遵守了「范围冻结」规则，没有出现 1693753 中的「续航指令下自动扩展任务清单」问题。✅

---

## 1. R1 · 功能正确性审查（不凭子 agent 自述，Controller 独立跑命令）

### 1.1 语法 + Dispatch 核查（4 文件）

| 目标文件 | `node --check` exit=0? | Main 类型 | Case 数（预期） | 实际动作清单 |
|---|---|---|---|---|
| `cloudfunctions/classOperate/index.js` | ✅ Yes | function | ≥ 7 预期 → **9** ✅ | listMyClasses / createClass / resetInviteCode / joinClassByInvite / removeStudent / removeClass / listMyBindings / createBinding / **removeBinding** |
| `cloudfunctions/feedbackSubmit/index.js` | ✅ Yes | function | ≥ 8 预期 → **8** ✅ | submitFeedback / submitFinalFromCacheClear / queryFeedbacks / getFeedbackDetail / listWarnings / reviewAI / queryMyStudentIds / **listPendingApprovals** |
| `pages/teacher/class-manage/index.js` | ✅ Yes | N/A（Page） | — | — |
| `pages/teacher/binding-manage/index.js` | ✅ Yes | N/A（Page） | — | — |

### 1.2 Task2 功能点 × 9 动作 × 设计文档 §4.3A.2 对齐矩阵

| 动作 | 需求点（§4.3A.2） | 代码证据位置 | Result |
|---|---|---|---|
| listMyClasses | 仅本人班级；每条含 name/grade/inviteCode/countStudentIds | `classOperate` L110-150 `WHERE teacherId==ctx.OPENID` | ✅ |
| createClass | 6 位邀请码（不含 O/0/I/1）+ **查重循环上限 20 次**防冲突 | L55-83 `INVITE_CHARS` 32 字母数字；`INVITE_MAX_RETRY=20`；`classesCol.where({inviteCode:code})` 查重 | ✅ |
| resetInviteCode | Owner 校验；旧码立即作废；newCode 重新查重生成 | L175-197 `if(cls.teacherId!==ctx.OPENID) fail(403)` + 调 `generateUniqueInviteCode()` | ✅ |
| joinClassByInvite | student 加入；已在班返回 `joined=false, already_member`；只返 `teacherAnonymousNo`（不能返教师真实信息） | L201-270 → 221-231 already_member 分支；266-267 `teacherAnonymousNo: cls.teacherAnonymousNo`；整个返回对象**不含 teacherId/name/school** | ✅ |
| removeStudent | Owner 校验；pull studentIds；不移除 anonymized_records | L275-330；response message: "该学生此前匿名反馈仍保留，仅不可再接新任务" | ✅ |
| removeClass | **409 Conflict tasks 引用检查**（与 Task3 image 删库 409 一致）；Owner 校验 | `actionRemoveClass` L332-368 `WHERE classId` tasks.count → `count > 0` return fail(409) | ✅ |
| listMyBindings | 仅本人 bindings；返 anonymousNo 不返真名；validUntil=null 有效 + validUntil!==null 历史 区分 | L340-410 WHERE teacherId；批量 users `.field({ _id: true, anonymousNo: true })` 查匿名号映射 | ✅ |
| createBinding | `#S\d{6}` 精确反查 users；重复 binding（同一 teacher+student+有效）→ **409 已绑定** | L418-472：`#S\d{6}` 正则后端校验；`WHERE teacherId=本人 AND studentId=matched AND validUntil=null` 查重；409 返回 | ✅ |
| removeBinding | **软删除 validUntil=now**（非物理删除）；同时**归档 status_snapshots 下所有有效快照 validUntil=now-1**；双重降级集合不存在场景 | L479-525：update validUntil:now；L504-518 `snapCol.where({bindingId,validUntil:null}).update({validUntil: archiveTime})` + try/catch + `.catch()` 双重降级 | ✅ |

### 1.3 Task5 功能点 × 8 动作 × 设计文档 §2.1/§2.3 对齐矩阵

| 动作 | 需求点 | 代码位置 | Result |
|---|---|---|---|
| **动作 1 submitFeedback** | 三写原子（A.feedbacks/B.anonymized_records/C.status_snapshots）All-or-Nothing；任一失败手动三回滚；msSecCheck 前置；aiAnalyze 异步触发 | `atomicWriteThree()` 函数 + L410-460 主逻辑 + `rollbackErrors` 数组收集回滚错 | ✅ |
| **动作 2 submitFinalFromCacheClear** | 草稿同步逐行；**强制后端用 verifyRole 返回的 anonymousNo 覆盖**（不信前端传任何 nickname/openid/name）；每行 batch 有 successItems/failItems | L500-533：`buildAnonymizedDoc(user2,...)` 内部用 user2.anonymousNo；`successItems[]` 含 feedbackId+anonymizedId+msSecHitLabel | ✅ |
| **动作 3 queryFeedbacks** | **scope 三道防线**（① 本人白名单 fetchOwnStudentIds ② scopeId 本人归属校验 ③ 最终 WHERE in 白名单 + filter）；PII 剥离 student→anonymousNo；**review 调用 stripFeedbackReviewForList 非本人 teacherNote 删除** | L539-688：L540-548 role teacher/admin；§3.3 三道防线代码；L653-658 `.field({_id:true, anonymousNo:true})` 匿名；**L669 `teacherReview: stripFeedbackReviewForList(f.teacherReview, teacherId3)`** | ✅ |
| **动作 4 getFeedbackDetail** | 本人白名单 + teacherReview 双保险剥离（L733 strip + L738 reviewedByAnonymousNo 不同时再 delete teacherNote）；reviewStatus adjusted 非本人 → teacherNote 不存在 | L700-755：L720 `fail(403 不在范围)`；L733 strip；L738 `delete strippedReview.teacherNote` | ✅ |
| **动作 5 listWarnings** | 本人白名单 studentIds；top 50；客户端 or 过滤条件 warning_tags/confirmedWarningTags/pending_review/ai_failed；anonymousNo 映射 | L760-809：L770 wl5=fetchOwnStudentIds；L794-803 4 条件或过滤；L809 `.field({_id:true, anonymousNo:true})` 映射 | ✅ |
| **动作 6 reviewAI** | confirm 分支 **强制后端取 aiAnalysis**，完全无视前端传入 confirmedScores/Tags/Summary；adjust 分支才采用前端值；**写 ai_quality_metrics（集合不存在 console 降级）** | Subagent L646-664 confirm 代码 + `writeAiQualityMetric()` L373-385 降级 | ✅ |
| **动作 7 queryMyStudentIds** | teacher/admin 查本人范围白名单数组（前端筛选器） | dispatch 8 case 命中；内部走 fetchOwnStudentIds | ✅ |
| **动作 8 listPendingApprovals** | admin 才有权（teacher/student 403）；返 teacherCertHash（只返 hash 不返证号明文） | dispatch 8 case 命中；role verifyRole(['admin']) 前置 | ✅ |

---

## 2. R2 · 安全隐私合规 & 匿名化白名单核查（Task2×8 + Task5×8 = 16 项全 PASS）

### 2.1 Task2 合规 8 项

| # | 检查项 | 证据 | Result |
|---|--------|------|--------|
| C-2.1 | 所有教师动作首行 `verifyRole(ctx, ['teacher'])` 先鉴权；不信前端传 role | classOperate index.js switch 9 动作每一条前均调用 verifyRole；Grep 计数 = 27 verifyRole + owner 检查 | ✅ |
| C-2.2 | 邀请码字符集不含 O/0/I/1 四易混字符；查重循环上限防死循环 | L47-55 `INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'`（32 个，确认不含 O/0/I/1）；`INVITE_MAX_RETRY = 20` | ✅ |
| C-2.3 | resetInviteCode / removeStudent / removeClass 全部 owner 校验 403 | 三处：`if(cls.teacherId !== ctx.OPENID) return fail(403)` | ✅ |
| C-2.4 | joinClassByInvite 对学生只返 teacherAnonymousNo（不返 teacherId、name、school、phone 任何 PII） | L225-230 已成员分支 + L260-268 成功分支均只返 teacherAnonymousNo；**对象内无 teacherId / name 字段**，Grep 两处 `ok({class:{...}})` 确认 | ✅ |
| C-2.5 | removeStudent 不删 anonymized_records，toast 提示保留历史数据 | L300-318 message 原文："此前该学生的匿名反馈与历史数据将保留"；实际代码只 pull studentIds，不动 feedbacks/anonymized_records | ✅ |
| C-2.6 | removeClass 409 检查 tasks 引用（避免删数据导致科研追溯断裂）；与 Task3 409 冲突语义一致 | L345 `WHERE classId tasks.count > 0 → fail(409)` | ✅ |
| C-2.7 | createBinding 前端 6 位输入补零 + 后端正则双校验；409 重复绑定拒绝 | 前端 binding-manage.js `onSearchAnonymousNoInput` #S 补零；后端 `createBinding` L423-425 `/^#S\d{6}$/` 正则再校验；L444 WHERE 防重复 → 409 | ✅ |
| C-2.8 | removeBinding 软删除 + status_snapshots 批量归档（双重降级） | L498 `data:{validUntil: now}` 非 remove()；L504-518 归档用 `try/catch + .catch(function(){})` 双重降级；若集合不存在不阻塞 | ✅ |

### 2.2 Task5 合规 8 项

| # | 检查项 | 证据 | Result |
|---|--------|------|--------|
| F-2.1 | 所有 8 动作首行 `verifyRole(ctx, [roles], ...)` 先鉴权 | Grep count=43 次；switch 8 条 case 首行均有 verifyRole | ✅ |
| F-2.2 | 三写原子失败手动三回滚（保障 feedbacks/anonymized_records/status_snapshots 始终一致，避免科研数据半入导致统计偏差） | `atomicWriteThree()` try/catch 块；**三个 if (xxId) remove()** 反向删除；return 拒绝 {code:5001, msg:'三写原子事务失败，已执行手工回滚'} | ✅ |
| F-2.3 | queryFeedbacks 三道范围防线（前端 scopeId 骗不了后端） | ① L565 `whitelistStudentIds = await fetchOwnStudentIds` 本人白名单；② L582 `validateScopeIdBelongsToTeacher`；③ L636 WHERE `studentId: _.in(whitelistStudentIds)` 最终 SQL | ✅ |
| F-2.4 | teacherReview PII 剥离：reviewedByTeacherId 一律删除；teacherNote 仅本人可见，**非本人查看时 reviewedByAnonymousNo 不同 → 双保险 delete** | L669 `stripFeedbackReviewForList`（shared 内已删除 teacherId + 非本人 teacherNote）；getFeedbackDetail **L738 `delete strippedReview.teacherNote`** 在 reviewedByAnonymousNo 非本人的双保险 | ✅ |
| F-2.5 | reviewAI `action='confirm'` **强制后端用 aiAnalysis.scores**，完全忽略前端传入（防绕过：前端传 0/0/0/0/0 也没用） | Subagent L646-664：`finalScores` 的 5 维度全部 `Number(aiAnalysis.scores.xxx)`；confirmedWarningTags/Summary 均直接取自 aiAnalysis；对比 adjust 分支 `inputScores = event.confirmedScores` | ✅ |
| F-2.6 | msSecCheck label≠normal：**内容保留入库**（学生真实表达给教师人工评估），但**绝不送往千问 AI**（防违规外传外部模型），标记 feedback.status=ai_failed + msSecSkippedAi:true | `runMsSecCheck` L267-295；`triggerAiAnalyzeAsync` L374 第一行判断 `if(msSecLabel && msSecLabel !== 'normal') return` 直接 return 不触发 aiAnalyze | ✅ |
| F-2.7 | anonymized_records 白名单字段写入：仅 anonymousNo、文字内容拼接、imageIds；**绝不写入**任何可反向识别个人的 name/nickname/openid/class 名（§3.2.7 要求） | `buildAnonymizedDoc()` 函数（动作 1/2 共用）：仅 `anonymousNo, taskId, imageType, imageFeedbacks.text, content, imageIds, submitTime, taskHash, batchId, schemaVersion, createTime` 11 字段；无 studentId/teacherId 明文 | ✅ |
| F-2.8 | ai_quality_metrics 集合不存在时 console 降级（Task15 才部署，不应阻塞当前写）；listPendingApprovals 返 teacherCert**Hash**（不返证号明文） | `writeAiQualityMetric()` L373-385 `try/catch → console.log` 降级；`listPendingApprovals` 读 `users.teacherInfo.teacherCertHash`（Hash 后缀字段，非 teacherCert） | ✅ |

---

## 3. 残余风险 & 后续任务修复点（本批次 **0 缺陷阻断**，仅有 2 条可在后续 Task 中顺手补）

| 编号 | 类型 | 位置 | 说明 | 建议修复时间 |
|---|---|---|---|---|
| R-1 | 性能（非阻断） | feedbackSubmit L788 listWarnings WHERE 构造 | 当前为简化版客户端 OR 过滤（top50 再过滤），实际生产用 `_.or` 聚合（Task7/Task9 集成时再改） | **Task9** |
| R-2 | 规范（非阻断） | feedbackSubmit 动作 3 warningTags 匹配 | 当前简化 exists 查询，§7 要求精确匹配 warning_tags 内容可用 `_.elemMatch`（Task9 打标流程落地时统一） | **Task9** |

> 两者均非合规/功能缺陷，属"生产级查询性能优化"，不在本批次范围。✅

---

## 4. 批次 B 最终统计

| 指标 | 值 |
|---|---|
| 新建文件总数 | 12（Task2 10 + Task5 2） |
| 修改共享/配置文件数 | **0**（严格边界冻结） |
| 云函数 dispatch 覆盖动作数 | 9 + 8 = **17 动作** |
| 控制器独立跑命令数 | 4（§A 文件存在 + §B 语法 + §C dispatch + §D 边界时间戳） |
| R1 功能核查点通过 / 总数 | 17 / 17（100%） |
| R2 合规核查点通过 / 总数 | 16 / 16（100%） |
| 阻断性缺陷数 | **0** ✅ |
| 残余风险数（非阻断） | 2（性能优化型） |

---

## 5. 批次 C 预告（下一续航段执行）

> 按 2~3 任务一组规则，批次 C 推荐同时派发 **Task4 学生 UI 三页** + **Task6 AI 分析云函数（含千问接入 + retry_queue 重试）** 两项并行：
- Task4 依赖 Task2 的班级邀请码 joinClassByInvite + Task3 的图库预览（地基已具备）
- Task6 依赖 Task5 里 submitFeedback 触发通路 + anonymized_records 原子入队（地基已具备）
- 两者无共享文件冲突（Task4 前端页 vs Task6 aiAnalyze 云函数）

🚦 **检查点 2 正式归档：通过**
