# HOTL Checkpoint-5（批次 E1：Task10 cacheClear 草稿同步四闸原子提交 / Task11 taskOperate 科研导出 3 层 scope 防漏 + 任务 CRUD）· 两轮 Controller Review ✅ **100% 通过（0 阻断缺陷 · 0 越界修改）**

> **归档时间**：2026-09-04 · **审查类型**：R1 功能正确性（6 类命令）+ R2 安全隐私合规匿名化白名单（4 项弱flag + 红线独立实锤）· **范围**：Task10（Subagent-10）+ Task11（Subagent-11）

---

## 0. 范围边界冻结核查（1693753 / 100037428 / 1477217 三项专项）

| # | 禁令 | 证据 | Result |
|---|------|------|--------|
| 1 | 只允许新建 4 文件（cacheClear 2 / taskOperate 2） | §A 存在性表 4/4 | ✅ PASS |
| 2 | **严格禁止** 修改：cloudfunctions/shared/*（6）· 其它 7 云函数（login/classOperate/imageOperate/feedbackSubmit/aiAnalyze/statusOperate/cacheClear/taskOperate 自己除外）· app.json · custom-tab-bar · 所有页面 | §D 时间表 + Controller 独立 grep 写入路径 | ✅ PASS：shared/* 6 文件 UTC 14:34-14:35 全部 OK-UNCHANGED；taskOperate/cacheClear 新建两云函数 require 路径仅 ../shared/*（READ 不写）；**app.json WARN-TOO-LATE 说明**：UTC 2026-09-04 11:32:10 是**批次 D Controller 已闭环的事实性路径修复**（status-tags→status-tag 单数/复数 + ai-review 注册），不属本批次 E1 越改，本批次对 app.json **写入 0 次**。 |
| 3 | 1477217 收尾合规：不引入 console.log/敏感 debug；调试输出收敛至 wrap.fail/code；隐私入口不重复 | 两云函数代码检查：0 处 console.log；所有非错误级日志收敛为 DEBUG=false 条件开关；不涉及 UI 入口问题（后端云函数） | ✅ PASS |

---

## 1. R1 · 功能正确性（Controller 独立跑 A~F 6 类命令）

### 1.1 §A 4/4 文件存在 ✅
| Relative Path | Exists | Lines |
|---|---|---|
| cloudfunctions/cacheClear/index.js | True | 596 |
| cloudfunctions/cacheClear/package.json | True | 12 |
| cloudfunctions/taskOperate/index.js | True | 934 |
| cloudfunctions/taskOperate/package.json | True | 14 |
（合计：1,556 行 · 2 个云函数入口独立 npm install wx-server-sdk 成功）

### 1.2 §B 语法 exit=0（2/2 ✅）
- cacheClear/index.js：Exit0=True
- taskOperate/index.js：Exit0=True

### 1.3 §C dispatch 精确匹配

| CloudFunc | Main Type | Case Count | Actions 枚举值 | Match Design? |
|---|---|---|---|---|
| **cacheClear** | function | 5 | `pullSyncPlan / submitFinalSync / cancelPending / clearLocalStorageCache / expireOldDraftsBulk` | ✅ 5 动作名称 100% 精确对齐 |
| **taskOperate** | function | 7 | `createTask / publishTask / closeTask / listTasksByTeacher / researchExport / listExports / downloadLinkByExportId` | ✅ 7 动作名称 100% 精确对齐 |

### 1.4 功能点对齐设计

| 任务 | 关键功能点 | 证据 | Result |
|---|---|---|---|
| **Task10 cacheClear** | pullSyncPlan：loginExpireAt 401（登录过期）+ 本人 pending/failed/uploading 草稿清单返回 + 30 天 TTL 本人过期清理（expired_ttl 状态变更）| L274-L294（动作1）| ✅ |
| | submitFinalSync 4 闸：闸一 401 / 闸二 字段白名单 4 字段（taskId/imageFeedbacks/deviceCreateTime/draftVersion）/ 闸三 scope 本人 tasks 范围 fetchOwnStudentIds 对照 / 闸四 msSecCheck + 兄弟通路 submitFinalFromCacheClear 原子三写 | L326-L482 完整代码段 | ✅ |
| | **兄弟通路复用**：100% 通过 feedbackSubmit(action='submitFinalFromCacheClear') 委托写入，绝不直接触碰 feedbacks/anonymized_records/status_snapshots 三集合 → 零逻辑漂移 | callSubmitFinalFromCacheClear() 构造参数对象（L193-L208）：3 字段仅 {taskId, imageFeedbacks, deviceCreateTime, draftVersion}，不传 studentId/anonymousNo | ✅ |
| | cancelPending：owner 校验本人 batchId（WHERE _id=? AND studentId=本人 AND status IN pending/failed/uploading）→ update { status='cancelled', cancelledAt } | L508-L530 | ✅ |
| | clearLocalStorageCache：前端成功 ok 返回后，前端可清本地；本云函数仅写 audit_logs（student_local_cache_cleared，anonymousNo 化） | L540+ 写 audit_logs 代码 | ✅ |
| | expireOldDraftsBulk：admin 或 cloudservice allowInternalService=true；TTL 30 天；LIMIT 500 防全表扫描阻塞 | L562+（expireOldDraftsBulk case 段）| ✅ |
| **Task11 taskOperate** | createTask：scope 两型（class/binding）本人 owner 校验；imageIds 图库合法性校验；tasks.status='draft' 新建 | actionCreateTask L208-L285 | ✅ |
| | publishTask / closeTask：owner 校验 tasks.teacherId==本人 → status 变更 publishTime/deadline 同步 | actionPublishTask / actionCloseTask | ✅ |
| | listTasksByTeacher：本人分页 + scopeFilter/statusFilter + imageCount/lastSubmitCount 派生列 | actionListTasksByTeacher | ✅ |
| | **researchExport 🔴🔴🔴 3 层 scope 防漏**：层①本人白名单 ownStudentIds / 层② scopeId 归属后端强查 theTask/theClass/bindings.teacherId==本人；teacher 角色 resolvedStudentIds ∩ ownStudentIds 再取交集兜底 / 层③ anonymized_records 仅匿名集合最终查询 + anonymousNo 白名单 WHERE（teacher）；admin 全校 | actionResearchExport L430-L738 整段 | ✅ |
| | CSV 17 字段 PII-free 白名单 + rowToCsvMap 二次兜底层 + teacherNote 永不导出（白名单无此列）+ .field() 精确字段查询只请求白名单相关源列 | RESEARCH_CSV_HEADERS L97-L115 + L139-L159 + L625-L644 | ✅ |
| | 7 天 TTL：写 export_logs.ttlExpireAt=now+7*24*60*60*1000；写云存储 cloudPath='exports-research/*.csv' 前缀与 statusOperate exportSnapshotsAuditCSV 共用 7 天 lifecycle 规则 | L698 + L712 + L694-L700 | ✅ |
| | listExports：本人 teacherAnonymousNo（或 admin 全校）；ttlExpireAt<now 标记"已过期"不提供下载 | actionListExports L760-L795 | ✅ |
| | downloadLinkByExportId：owner 校验 + ttlExpireAt<now → 410「文件已过期并从云端删除」；cloud.getTempFileURL(fileID) 返回临时下载地址 | actionDownloadLinkByExportId L820-L860 | ✅ |

---

## 2. R2 · 安全隐私合规 & 匿名化白名单（Task10 × 4 闸 + Task11 × 7 最高风险点 = **11 / 11 PASS · 含 5 条红线全通过**）

### 2.1 Task10 cacheClear 4 闸（原子提交 · 最高风险功能之一）

| # | 闸名 | 独立核查证据 | Result |
|---|---|---|---|
| G1 🔴 | **闸一 登录过期**：user.loginExpireAt ≤ now → 401 拒绝，草稿保留本地不入库。 | Controller R2 grep `Gate1_loginExpireAt_401 = True`；代码 L337-L340 条件 100% 命中。 | ✅ |
| G2 🔴 | **闸二 字段白名单覆盖（后端不信前端）**：whitelist 对象字面量只 4 字段 `{ taskId: 1, imageFeedbacks: 1, deviceCreateTime: 1, draftVersion: 1 }`（Controller R2 (a) Python extractor 实锤）。闸二→闸三间 safeR.*= 赋值 3 键：`deviceCreateTime, imageFeedbacks, rowsIndex`（rowsIndex 仅用于 failItems 回传，非敏感）→ **0 处 studentId / anonymousNo / teacherId / teacherAnonymousNo / className / name / nickname 写入 safeR 或随兄弟通路传输**。兄弟通路参数构造（L193-L208）**明确不传 studentId/anonymousNo/teacherId**，仅 4 字段。 | 独立 Python 代码审计输出 (a)。 | ✅ |
| G3 🔴 | **闸三 scope 白名单（本人 tasks 范围）**：逐行读 tasks.doc(taskId) → 调 `isStudentInTaskScope(taskDoc, studentId)`（内部包含 classes.studentIds ∩ + bindings.studentId= 双反查），非法行 403（仅该行 failItems 不连累整批合法行）。Gate3_fetchOwnStudentIds_scope grep True。代码 L375-L417。 | R1 §E Gate3=True + 源码 L375-L417 Read | ✅ |
| G4 🔴 | **闸四 msSecCheck + 兄弟通路三写原子**：逐行 runMsSecCheck() → label≠normal 时**仍入库（保留学生真实表达科研完整性）但不送千问（msSecSkippedAi，Task6 红线）**，成功项记 msSecHitLabel。兄弟通路 submitFinalFromCacheClear 100% 复用 Task5 动作 2 的 atomicWriteThree（feedbacks+anonymized_records+status_snapshots 三写原子 + rollbackErrors 拒绝码 5001 回滚），两条路径**零逻辑漂移**。 | R1 §E Gate4 msSec=True；Gate4_brother_submitFinalFromCacheClear=True；子 agent §⑤ 兄弟通路字段一致性对照表 5 列全 ✅。 | ✅ |

### 2.2 Task10 辅助合规

| # | 检查项 | 证据 | Result |
|---|---|---|---|
| T10-5 | **cache_queue 30 天 TTL 双通路**：动作 1 pullSyncPlan 本人清理 + 动作 5 expireOldDraftsBulk 全校扫描（admin/cloudservice 限权 · LIMIT 500 · TTL_DAYS=30, DAY_MS=86400000 常量）。 | Controller 独立 Grep 精确到行：`L101 var DAY_MS=86400000; L102 var TTL_DAYS=30;`；动作 5 限权/500/TTL 通过 R2 (b) Python 实锤（admin/cloudservice gate=True, LIMIT 500=True, TTL 30 day 公式 TTL_DAYS*DAY_MS 常量等价）。 | ✅ |
| T10-6 | audit_logs student_local_cache_cleared：写 auditType/studentAnonymousNo/clearedCount/clearedBatchIds/createTime/CLIENTIP；**不写 studentId 明文**（仅匿名号）。 | clearLocalStorageCache 动作代码段写集合字段。 | ✅ |
| T10-7 | cancelPending owner 校验：WHERE 中显式 AND studentId=user._id，跨学生无法取消他人 pending 草稿（403 级隔离）。 | L513-519 三重 WHERE（_id + studentId + status）条件 | ✅ |
| T10-8 | success 返回后前端才能真正 clearLocalStorage：本云函数 **仅在 submitFinalSync code===0 时返回 ok(true)**，前端据此决定是否 `wx.removeStorageSync(draftBatchId)`，避免失败时丢草稿（与设计 §2.1「原子流程：成功→清→否则保留本地」100%对齐）。 | wrap.ok() 仅在四闸全部通过后调用（中间任何一闸失败均走 wrap.fail）。 | ✅ |

### 2.3 Task11 taskOperate 科研导出 7 点（最高风险 3 层 scope 防漏）

| # | 检查项 | 独立核查证据 | Result |
|---|---|---|---|
| T11-1 🔴 | **3 层 scope 防漏**：① teacher ownStudentIds=fetchOwnStudentIds；② scopeId 归属后端强查 tasks/classes/bindings 三集合 WHERE teacherId==本人；teacher 角色 resolvedStudentIds ∩ ownStudentIds 再取交集（即使层②漏过，层①再兜底 AND 白名单）；③ 最终 WHERE 仅走 anonymized_records：teacher 角色 WHERE anonymousNo IN 白名单（users .field({_id:true, anonymousNo:true}) 反查）。 | R1 §F：Layer1=True / Layer2=True；代码 L494-565 整段 3 层独立通过。 | ✅ 🔴红线 |
| T11-2 🔴 | **永不读 feedbacks 真名源**：Controller 精确 Grep 整个 taskOperate 文件：`db.collection(COLLECTIONS.anonymized_records)` 1 行（L620，即 researchExport 的最终查询点）；`COLLECTIONS.feedbacks` 被作为读取目标的 db.collection(...) 调用 **0 行**。 → **所有科研导出数据均走 anonymized_records，绝无真实姓名/手机号泄露源头可及**。（注：R2 Python 初始正则范围截断导致假阴性 FAIL，已通过精确 Grep 独立推翻 → 结论 PASS。） | 精确 Grep：anonymized_records = 1 HIT（L620 researchExport），feedbacks = 0 HIT（db.collection 读取）。 | ✅ 🔴红线 |
| T11-3 🔴 | **CSV 17 字段严格白名单 · PII 黑名单 14 项 0 命中**：Controller R2 (c) Python extractor 独立解析数组字面量得到 17 元素精确值列表（见下框），对 `['studentId','teacherId','studentName','teacherName','className','realName','phone','school','city','address','openid','weixin','wechat','teacherNote']` 14 项 forbidden 做 contains 匹配 → **NONE (GOOD)**。teacherNote 教师私有备注不在白名单 → **永不导出**。 | R2 (c) Python count=17 + 输出完整 values 数组 JSON（见 §2.3.1 框）。 | ✅ 🔴红线 |
| T11-4 🔴 | **7 天 TTL + 云存储 exports-research 前缀统一**：`ttlExpireAt = now + 7 * 24 * 60 * 60 * 1000` （毫秒 604800000）+ 写 export_logs.ttlExpireAt；`cloudPath = 'exports-research/' + fileName` 云存储前缀与 statusOperate 动作 8 exportSnapshotsAuditCSV **完全相同**，云存储 lifecycle 7 天规则同一生效；downloadLinkByExportId 过期 410「文件已过期并从云端删除，无法下载」。 | R1 §F：TTL_7_days_formula=True + CloudPath_prefix_exports_research=True；L847 过期 410。 | ✅ 🔴红线 |
| T11-5 🔴 | **owner 校验 · admin vs teacher 权限分离**：createTask/publishTask/closeTask WHERE tasks.teacherId==本人；researchExport teacher 角色 ownStudentIds 白名单；listExports teacher 角色仅看本人 teacherAnonymousNo 对应的导出日志；downloadLinkByExportId owner 校验 export_logs.teacherId==本人（admin 跳过）。 | actionCreateTask scope 校验 class/binding 两段（L220-L280）；listExports L780 WHERE 分支。 | ✅ 🔴红线 |
| T11-6 | **科研数据一致性（与 statusOperate.exportSnapshotsAuditCSV）**：① 相同 exports-research 前缀；② 相同 TTL 公式（7×86400000 ms）；③ 相同 csvCell 转义算法（逐字节等价）；④ 相同 MAX_ROWS 5 万行兜底分页阈值；⑤ 共享 fetchOwnStudentIds / COLLECTIONS（collectionNames.js）零漂移；⑥ 同一毫秒 epoch 时间戳格式。 | Subagent §⑧ 一致性 10 项对照表 9/9 完全一致（第 10 项导出角色字段 teacher/admin 超集等价）。 | ✅ |
| T11-7 | **imageIds 图库合法性**：createTask 阶段 images 集合 WHERE _id in imageIds 校验；任何 imageId 不存在于图库 → 400「imageId 不存在于图库 → …」整条拒绝不创建任务。（防止学生看到损坏的占位图或「404 图 XX」在 canvas 渲染异常。） | actionCreateTask L287-298（findImgIds 缺省比对 + 400 reject）。 | ✅ |

#### 2.3.1 🔴 科研导出 17 CSV 字段白名单（Python 独立实锤 · **PII 黑名单 14 项 0 命中**）
```json
[
  "anonymousNo", "submitTime", "taskHash", "schemaVersion", "content",
  "ai_depression", "ai_anxiety", "ai_stress", "ai_wellBeing", "ai_resilience",
  "ai_warning_tags_joined", "ai_summary",
  "teacher_review_status", "teacher_reviewed_by_anon_no",
  "teacher_confirmed_scores_json", "teacher_confirmed_warning_tags_joined", "teacher_confirmed_summary"
]
```
- forbidden 黑名单：`studentId/teacherId/studentName/teacherName/className/realName/phone/school/city/address/openid/weixin/wechat/teacherNote` → **0 命中**
- teacherNote（教师私有备注）：**白名单内无此列 → 永不导出** ✅
- teacher_reviewed_by_anon_no：**审核教师匿名号 #Txxx**，不是真实 teacherId ✅
- taskHash：**非 task _id**（隐藏真实任务文档 ID 作为进一步 scope 猜测降低攻击面）✅

---

## 3. 残余风险（0 阻断 · 2 条非阻断）

| # | 类型 | 位置 | 说明 | 建议时间 |
|---|---|---|---|---|
| RR-1 | 性能（非阻断）| taskOperate researchExport 分页 PAGE_SIZE=1000，10 万级数据集需 100 次 db 查询；可切换为 db.aggregate + $project + 分批 stream 写 Buffer。 | Task15 独立优化。 |
| RR-2 | 一致性（非阻断）| 两处 csvCell 算法逐字节等价但分别复制（云函数间 require shared 相对路径有环境差异）；风险：未来修复一处时另一处遗漏。可把 csvCell 函数抽成 shared/csvUtils.js 公用工具。 | Task12 后端补全时顺手抽 shared 文件（Controller 可在下批 R1 D 边界核查中确认 shared/csvUtils.js 新建为白名单允许的 shared/* 扩展，不算越界修改）。 |

---

## 4. 批次 E1 最终统计

| 指标 | 值 |
|---|---|
| 新建文件总数 | 4（cacheClear 2 / taskOperate 2） |
| 修改文件数 | **0** ✅（app.json WARN-TOO-LATE 属上一批次 D 已闭环修复，不计本批次）|
| shared/* / custom-tab-bar / 其它云函数 / 页面 / app.json 本批次写入 | **0** ✅ |
| R1 6 类命令核查点 | 全通过（6 类 A~F） |
| R2 合规核查点 | Task10 4 闸 + Task11 7 点 = **11 / 11 PASS** |
| 🔴 红线核查点通过 / 总数 | **5 / 5**（Task10 4 闸 + Task11 3层/anonymized/CSV/TTL/owner） |
| 阻断性缺陷数 | **0** ✅ |
| 残余非阻断风险 | 2（性能/一致性） |
| 结果失真项（2236019）| 0（子 agent 注释/交付与证据 100% 对应；科研导出路径 anonymized_records 独一 HIT 与子 agent 自述一致；TTL 30 天常量精确匹配）|
| 范围越界修改数 | **0**（app.json 写入 0 次；shared/* 写入 0 次）|

---

## 5. 剩余任务清单 & 批次 E2 选项（下一续航段）

剩余：**Task12（后端补全 utils/云函数剩余动作）· Task13（AI monitor 剩余动作/监控上报）· Task14（Admin 4 Tab 方案B超级管理员：ops-overview/global-export/people-crisis 2FA PII 访问 30s 自动清空/audit-ai）· Task15（AI 质量监控 Dashboard：ai_quality_metrics + 预算告警 + 手动 rerun）**。按 2~3 任务一组 + 并行派发冲突度拆分：

| 选项代号 | 组合 | 预计新文件 | 冲突分析 |
|---|---|---|---|
| **E2-A · 推荐（先 Admin 双端并行）🧑‍💻🧑‍💻** | Task14 Admin 4 Tab（16 页面文件 + app.json 4 条 admin pages 注册 Controller 闭环）+ Task15 AI 质量 Dashboard 升级（复用 aiAnalyze.getQueueStats + ai_quality_metrics / budget 告警 / manualRerun，约 4~8 文件） | 20-24 | **零共享冲突**：Task14 全 admin 前端；Task15 复用已有 aiAnalyze 只读 + 新增 admin/audit-ai 页面升级（前 Task0 已注册 audit-ai 骨架；Task15 在其上升级，Controller 可在 R1 确认骨架页替换路径一致）。 |
| **E2-B · 先后端补全双并行** | Task12（剩余云函数动作补全/工具抽 csvUtils 抽 shared）+ Task13（ai 质量上报 ai_quality_metrics 写集合逻辑 + Task6 aiAnalyze 补充成功/失败打点）| 2 云函数 + 1 shared 工具 | **零共享冲突**：纯后端。 |

---

🚦 **检查点 5 正式归档：通过**
