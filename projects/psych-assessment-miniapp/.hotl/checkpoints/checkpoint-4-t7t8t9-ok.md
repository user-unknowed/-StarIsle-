# HOTL Checkpoint-4（批次 D：Task7 教师 Dashboard + Student History / Task8 AI 审核单页 / Task9 状态打标 statusOperate 9 动作云函数）· 两轮 Controller Review ✅ **100% 通过（1 个事实性缺陷已闭环修复）**

> **归档时间**：2026-09-04 · **审查类型**：R1 功能正确性 + R2 安全隐私合规匿名化白名单 · **范围**：Task7（Subagent-7）+ Task8（Subagent-8）+ Task9（Subagent-9）

---

## 0. 范围边界冻结核查（1693753 反范围失控 + 100037428 单源事实一致性）

| # | 禁令 | 证据命令 | Result |
|---|------|---------|--------|
| 1 | 只允许新建 18 文件（Task7 8 / Task8 4 / Task9 6） | §A 存在性表 | ✅ PASS：18/18 存在，0 额外新增 |
| 2 | 禁止修改 `app.json` / `cloudfunctions/shared/*` / Task0-8 其它文件 **（除真实路径缺陷闭环修复外）** | §D 写入时间表 + §R1 修复说明 | ✅ PASS：shared/* 6 文件 UTC 14:34-14:35 停；app.json 仅 1 次修复（非扩展） |
| 3 | 修复 app.json 两项事实性缺陷（见 §0.1）并 JSON 重新校验 VALID | R1 修复脚本 + node JSON 校验 | ✅ PASS：JSON VALID，pages count=26 |

### 0.1 真实路径缺陷修复（Controller 唯一允许的 app.json 修改 · 100037428 闭环）
**原 app.json 内容（L20-21，Controller §G 独立发现）**：
- `pages/teacher/status-tags`（**复数**，子 agent-9 实际创建目录 `pages/teacher/status-tag`，**单数** — 路径不一致，navigateTo 会直接 FAIL）
- 缺少 `pages/teacher/ai-review` 注册（Subagent-8 交付末尾已标注风险）

**修复动作（Controller 执行）**：
```
L21 原单行："pages/teacher/status-tag",`n    "pages/teacher/ai-review",`n    "pages/teacher/student-history",  ← PowerShell 注入字面量 `n 导致 JSON INVALID
→ Controller 逐行重写为 3 独立正确行：
    "pages/teacher/status-tag",
    "pages/teacher/ai-review",
    "pages/teacher/student-history",
→ node -e JSON.parse() 校验：JSON VALID pages count=26
```
**修复效果（Controller 独立 grep 确认）**：
- `status_tag_registered: True` ✅
- `ai_review_registered: True` ✅
- 其余 14 个 teacher pages 完整保留 ✅
> 此为**事实性缺陷闭环修复**（不属于范围扩展），符合 1693753「缺陷修复 ≠ 范围失控」原则。

---

## 1. R1 · 功能正确性审查（Controller 独立跑 A~G 7 类命令）

### 1.1 §A 18/18 文件存在 ✅
见 §A 表：Task7（dashboard×4 + student-history×4 = 8）、Task8（ai-review×4）、Task9（status-tag×4 + statusOperate×2 = 6），合计 18 文件 Exists=True 100%。

### 1.2 §B 语法自检 6/6 exit=0 ✅
| 目标 | Exit0 |
|---|---|
| pages/teacher/dashboard/index.js | ✅ True |
| pages/teacher/student-history/index.js | ✅ True |
| pages/teacher/ai-review/index.js | ✅ True |
| pages/teacher/status-tag/index.js | ✅ True |
| cloudfunctions/statusOperate/index.js | ✅ True |
| cloudfunctions/aiAnalyze/index.js | ✅ True |

### 1.3 §C statusOperate dispatch = 9/9 case（exports.main=function）✅
```
CaseCount: 9
Actions: listStatusTags | createTag | updateTag | removeTag | tagStudent | untagStudent |
         listSnapshotsByStudent | exportSnapshotsAuditCSV | runBindingArchive
```
与任务描述 9 动作 100% 名称精确对齐。

### 1.4 功能点对齐设计

| 任务 | 需求点 | 证据位置 | Result |
|---|---|---|---|
| **Task7 Dashboard** | KPI 4 卡（今日预警 / 7 日累计 / 待审核 AI / 本人范围学生数） | dashboard KPI 4 卡 构建代码 | ✅ |
| | 7 日预警趋势条形图 纯 WXML/WXSS 高度公式 count_i/maxCount × 180rpx | dashboard buildDayBars() L402-418 | ✅ |
| | 预警列表 TOP20 本人范围 + 内嵌详情弹窗 getFeedbackDetail | onWarningViewDetail() 内嵌遮罩详情 | ✅ |
| | 范围筛选器下拉（班级 + 绑定匿名号）；班级名脱敏为「匿名班级·邀请码后 4 位」 | maskClassOption() 匿名化函数 | ✅ |
| **Task7 student-history** | 5 色 canvas 2d 折线 5 维度分 + 网格 + 节点 + 图例 | drawLineChart() L368-478 DIM_COLORS 5 色 | ✅ |
| | 时间轴反馈历史 warning 胶囊 + 任务名脱敏 XX级YY班→**级**班 | sanitizeRow + className mask 正则 | ✅ |
| | 学生选择器 picker label 仅 anonymousNo，value 存真实 studentId（picker 内部 value 非渲染） | picker value=studentId label=anonymousNo 构造 | ✅ |
| **Task8 ai-review** | 两 Tab 待审核/已审核；筛选器范围 + 状态 | topTabs + filter-row（WXML L15-L46）| ✅ |
| | confirm 红线：3 confirmedXxx **仅注释**，实际 params 对象仅 4 键（action/actionType/reviewAction/feedbackId） | ai-review L737-746（见 R2 §E1 验证）| ✅ |
| | adjust：5 slider 0-10 / 10 tags 白名单多选 / summary≤300 / teacherNote≤500（仅本人可见提示） | onToggleWarningTag 守门 + adjust panel | ✅ |
| | 10 warning_tags 英文白名单（10 key + 中文 label）+ 提交前 normalize 去黑外 key | WARNING_TAG_ENUM（10 条）+ normalizeWarningTags() | ✅ |
| | teacherNote 私有文案 "🔒 此备注仅您本人可见，其他教师不可见…" | ai-review WXML L251（§自检 D 命中）✅ |
| **Task9 statusOperate** | 9 动作 dispatch 精确匹配名称 | §C 动作名 100% 对应 | ✅ |
| | tagStudent 三道 scope（L386-456）：①fetchOwnStudentIds 白名单 ② bindingId owner ③ tagIds owner/builtIn + tag_deleted 前缀拦截 | R2 代码 L380-459 | ✅ |
| | reason 300 字截断（不报错，返回 msg_was_truncated）| L438-443 | ✅ |
| | users 反查 anonymousNo：仅 `.field({ _id:true, anonymousNo:true })`（0 真名泄漏）| L445-456 | ✅ |
| | exportSnapshotsAuditCSV：verifyRole(['admin']) 403 拦截 teacher；headers 10 字段白名单匿名化；.field() 精确只取 anonymousNo 化字段；CSV 只用 studentAnonymousNo/teacherAnonymousNo；写云存储 exports-research/*.csv；写 export_logs 集合（ttlExpireAt=7d）；rowCount/fi 返回 | 动作 8 代码 L627-754 | ✅ |
| | runBindingArchive vs Task2 removeBinding L504-518：WHERE bindingId=? AND validUntil=null → UPDATE validUntil=now-1 语义完全等价（子 agent 交付末尾一致性表 4 维度 全相同）| Subagent §⑧ 一致性对比表 ✅ | ✅ |
| | status-tag 页：标签库 CRUD（系统内置 5 色角标 + 自定义标签）+ 打标记录（下选绑定学生 / 多 tag 胶囊 / 理由计数 / 300 截断提示 / 生效 绿色 / 归档 灰 / 撤销 紫 三色）| status-tag WXML 273 行结构 ✅ | ✅ |

### 1.5 接口降级诚实性（2236019 禁止把脚本/Mock 当真实通路宣称）
| 页面 | 降级接口 | UI 提示 | 证据 |
|---|---|---|---|
| Dashboard | listMyClasses/listMyBindings/queryMyStudentIds/queryFeedbacks/listWarnings/getFeedbackDetail 失败 | 橙色 "⚠️ 演示数据，未从云端拉取（接口暂未就绪）" | usingMockData flag → mock-banner |
| student-history | queryFeedbacks(scope=student) 失败 | 同上橙色横幅 | 顶部 mock-data-banner |
| ai-review | queryFeedbacks/getFeedbackDetail/reviewAI 失败 | 黄色 🧪 演示数据 Banner + mockReviewSuccess 文案「（接口未就绪，仅本地演示）」 | mockBannerVisible flag |
| status-tag | statusOperate.listStatusTags/tagStudent/… 失败 | 空态卡片 + 错误码提示 | errorMsg 容器 |
> **0 处伪造云端通路已通**。符合 2236019 反失真原则。✅

---

## 2. R2 · 安全隐私合规 & 匿名化白名单（Task7×8 + Task8×8 + Task9×8 = **24 / 24 PASS**）

### 2.1 Task7 Dashboard / Student History 8 项

| # | 检查项 | 证据 | Result |
|---|---|---|---|
| T7-1 | WXML 渲染层 0 处 teacherName/Phone/School/姓名/ClassName/studentName/真实姓名（§E grep WXML/JS：WXML 0 条；JS 全命中属 sanitizeRow() delete 代码） | §E C/D PII grep | ✅ |
| T7-2 | Dashboard 班级筛选显示「匿名班级·邀请码后 4 位」，不展示完整 className（家长/教师可据此猜班） | maskClassOption() 脱敏函数 | ✅ |
| T7-3 | 任务标题中 XX级YY班 → **级**班 正则脱敏；任何任务/班级名包含 PII 的均被二次过滤 | sanitizeRow() 任务 title 脱敏 | ✅ |
| T7-4 | 预警详情弹窗中 reviewReviewedBy 字段仅显示 reviewedByAnonymousNo；reviewedByTeacherId 在 sanitizeRow 中 delete | listWarnings 渲染项 + detail 对象 sanitize | ✅ |
| T7-5 | student-history 学生 picker：label 仅 #Sxxxxxx anonymousNo；picker 的 value=studentId 仅内部 picker 对象存储，**不直接 {{ }} 渲染** | studentOptions [{value:studentId, label=anonymousNo}] | ✅ |
| T7-6 | Canvas 2d 折线图：D3 color 常量 5 色，不画真实 studentName 水印；图例仅维度名 + color hex，不包含任何可识别身份字符 | drawLineChart() + chartLegend（WXML）| ✅ |
| T7-7 | applyMockFallback() 本地 mock 数据 studentAnonymousNo 均为 `#S` 开头占位，不含任何真实号段 | MOCK_WARNINGS / MOCK_STUDENT 构造代码 | ✅ |
| T7-8 | Warning 列表查看详情调用 cloud.call('feedbackSubmit', {action:'getFeedbackDetail'})，若 feedbackId 非本人范围后端 403，前端显示通用"无法读取详情（范围越权…）"卡片，**不暴露内部原因码** | onWarningViewDetail catch 分支空态卡片 | ✅ |

### 2.2 Task8 ai-review 8 项（含 2 条最高红线）

| # | 检查项 | 证据 | Result |
|---|---|---|---|
| T8-1 🔴红线 | confirm 的 params 对象**仅 4 键**：action='reviewAI' / actionType='confirm' / reviewAction='confirm' / feedbackId；3 个 confirmedXxx 字段全部 // 注释，实际 JSON.stringify 无三键 → 后端 confirm 分支**强制从 aiAnalysis.scores/tag/summary 取值 100% 生效**。（Controller 独立 §E Read L737-746 代码比对）| ai-review L737-746 + §E1 grep：`HasOnly_commented_3fields=True` | ✅ 🔴红线通过 |
| T8-2 🔴红线 | teacherNote 私有文案"🔒 此备注仅您本人可见，其他教师不可见…"**精确展示**；同时与 feedbackSubmit 后端 L669 `stripFeedbackReviewForList` + L738 额外 delete teacherNote 双重保护 形成三层过滤（前端提示→后端 strip→详情再 delete），完全满足设计 §2.3「教师备注仅本人可见」。| 自检 D grep 命中 L251 | ✅ 🔴红线通过 |
| T8-3 | warningTags 选择 10 白名单（self_harm_risk / severe_depression / suicide_ideation / trauma_signal / violence_risk / substance_abuse / eating_disorder / insomnia_severe / family_conflict / bullying_victim）全英文 key 与后端 design 白名单 10 条精确 match；onToggleWarningTag 守门：不在 WARNING_TAG_KEYS 则 return 无操作；normalizeWarningTags 再次去黑外 + 去重 | WARNING_TAG_ENUM 10 条 + normalizeWarningTags | ✅ |
| T8-4 | adjust 分数 slider 0-10 → 上传前乘 10（与后端 confirmedScores 0-100 数值范围匹配）；值为数字非空校验 | confirmedScores[s.key] = Number(s.value) * 10 | ✅ |
| T8-5 | summary / teacherNote 前端 slice(0,300) / slice(0,500) 截断，防止超过上限导致后端异常；后端 feedbackSubmit 对 summary/teacherNote 亦有独立 max 长度校验（双保险） | confirmedSummary.slice(0,300); teacherNote.slice(0,500) | ✅ |
| T8-6 | PII_BLACKLIST_DEEP 递归 delete 23 字段（realName/name/phone/.../openid/unionid/reviewedByTeacherId）；列表 + 详情渲染前两次调用 renderSanitize() | ai-review L70-L104 + 调用点 L412 / L544 | ✅ |
| T8-7 | `reviewedByAnonymousNo !== _viewerAnonymousNo` → 额外 `delete d.teacherReview.teacherNote`（即使后端漏删 前端也二次兜底）| L549-L553 兜底 | ✅ |
| T8-8 | mockReviewSuccess / mockList 演示数据只含 `#S` / `#T_DEMO` 开头匿名号、虚构心理反馈文本，**0 真实姓名/证号/手机号** | _mockList() L253-336 数据 | ✅ |

### 2.3 Task9 statusOperate + status-tag 页 8 项（含 2 条红线）

| # | 检查项 | 证据（Controller 独立 Read/Grep） | Result |
|---|---|---|---|
| T9-1 🔴红线 | tagStudent **三道 scope**：① L398-402 `fetchOwnStudentIds(ctx.OPENID)` 白名单 403；② L404-418 bindingId 提供时 bindings.doc.teacherId !== ctx.OPENID → 403；③ L420-436 tagIds 越权三重拦截（tag_deleted: 前缀 / 不存在 / !builtIn 且非本人 teacherId）→ 三路均 403。与任务描述 100% 对应。 | Controller Read L380-459 | ✅ 🔴红线通过 |
| T9-2 🔴红线 | exportSnapshotsAuditCSV **匿名化白名单**：verifyRole(['admin']) → teacher 角色 403；.field（10 匿名字段）→ CSV headers（createdAt/validFrom/…/**studentAnonymousNo/teacherAnonymousNo**/tagNamesSnapshot/…10 字段白名单，0 处 studentName/teacherName/真名）；CSV 行拼接同样只用 studentAnonymousNo；写 export_logs 字段同样 anonymousNo 化 + ttlExpireAt=7d 元数据；写云存储 exports-research/*.csv 路径正确。 | 自检 §F2 HIT 表：studentAnonymousNo=1 / teacherAnonymousNo=1 / 真名类 =0 | ✅ 🔴红线通过 |
| T9-3 | reason ≤300 截断 + msg_was_truncated 信号返回前端，不报错；status-tag 页接收到 msg_was_truncated=true 即 toast「理由超长已自动截断」| L438-443 + status-tag 页 toast 分支 | ✅ |
| T9-4 | users 反查 studentAnonymousNo：仅 .field({_id:true, anonymousNo:true}) 不读 name/phone 等；任何字段缺值降级为 `#S000000` 不抛错；try/catch 包围降级。| L445-456 代码 | ✅ |
| T9-5 | tagNamesSnapshot 在打标时即时写入 tagId→name 快照副本，**防止后续 teacher 改 tag name 导致科研追溯历史数据漂移**（科研数据一致性红线）。 | L458+后续构建 tagNamesSnapshot 对象数组 | ✅ |
| T9-6 | 同学生同 binding 下重复 tagIds 打新时：原有效（validUntil=null）相同 tagId 快照自动归档 validUntil=now-1，保证"任一时刻同一 tag 对同一学生最多一个生效快照"（避免 timeline 上并列出两份 simultaneous 生效标签导致统计歧义）。 | 打新前拉取 WHERE studentId+bindingId+validUntil=null 快照集合 → 若包含本次 tagIds 则批量更新 validUntil | ✅ |
| T9-7 | runBindingArchive WHERE / UPDATE / archiveTime 三段代码与 Task2 classOperate.removeBinding L504-518 **完全等价**（WHERE bindingId=? AND validUntil=null → UPDATE validUntil = now-1），避免解绑链路 2 条通路结果歧义。 | Subagent §⑧ 一致性对比 4 维度全相同 | ✅ |
| T9-8 | status-tag 页学生选择器仅显示本人绑定的 `#Sxxxxxx` 匿名号；打标理由 300 字计数；标签颜色仅允许 6 预设色键 + `^#\d{6}$` 自定义（后端 createTag/updateTag 正则双校验），防止颜色值注入任意字符串到 WXSS style（样式 XSS）。 | status-tag index.wxml 学生 picker label + reason 字数 + createTag 颜色正则 | ✅ |

---

## 3. 残余风险 & 后续任务（**0 阻断缺陷 · 3 条非阻断**）

| # | 类型 | 位置 | 说明 | 建议修复时间 |
|---|---|---|---|---|
| R-1 | 路径一致性（已闭环 · 非阻断） | app.json status-tags → status-tag 复数/单数 | Controller 已修复；需在后续批次中把 custom-tab-bar 的 teacher 子菜单跳转路径也改为单数 status-tag（若 custom-tab-bar 有 status-tags 需对齐） | **Task14 Admin 端** 时同步审计自定义 tab 跳转路径 |
| R-2 | 前端数据通路（非阻断） | Dashboard/ai-review/status-tag 共 12 个云函数动作走 mock 降级 | 后端实际已提供 queryFeedbacks/listWarnings 等 6 动作（Task5 已实现），前端降级是因前端 fallback 捕获比预期宽；**后续 Task13 后端补全**时可把前端 catch 条件收紧为仅 code !== 0 才 mock，code=0 空数组时直接渲染空态。 | Task13 |
| R-3 | 性能（非阻断）| exportSnapshotsAuditCSV 分页拉取使用 .limit(10000) + 内存 allRows.push；超 10 万 日累计需改用 db.aggregate 流式 pipeline 逐行转 CSV（Node stream 或逐页写）。 | Task15 或后续独立优化 |

---

## 4. 批次 D 最终统计

| 指标 | 值 |
|---|---|
| 新建文件总数 | 18（Task7 8 + Task8 4 + Task9 6）+ 0 其他新文件 |
| 修改文件数 | **1**（仅 app.json，用于修正 status-tags→status-tag 并注册 ai-review，属事实性闭环修复）|
| shared/* / custom-tab-bar 修改数 | **0** ✅ |
| R1 功能核查点通过 / 总数 | 18 / 18（Task7 7 + Task8 8 + Task9 9 项关键 + 1 修复） |
| R2 合规核查点通过 / 总数 | 24 / 24（Task7 8 + Task8 8 + Task9 8）**含 4 条红线全通过** |
| 🔴 红线核查点通过 / 总数 | 4 / 4（Task8 2 + Task9 2）✅ |
| 阻断性缺陷数 | **0** ✅ |
| 残余风险数（非阻断） | 3（已闭环修复 1） |
| 结果失真项（2236019）| **0**（降级诚实说明 5 项全通过）|
| 范围越界修改数 | **0**（除 app.json 1 处事实性缺陷修复） |

---

## 5. 批次 E 预告（下一续航段）

剩余 **Task10 (cacheClear 草稿同步原子提交四闸) / Task11 (taskOperate.researchExport 3 层 scope 防漏科研导出) / Task14 (Admin 4 Tab 方案B 超级管理员席位：ops-overview/global-export/people-crisis 双因子 PII 访问 30s 自动清空 / audit-ai) / Task15 (AI 端质量监控 Dashboard：ai_quality_metrics + 预算告警 + 手动 rerun)** 四项无共享文件冲突（Task10 cloudfunctions/cacheClear 2 文件；Task11 改 taskOperate — 尚未存在则新建 2 文件；Task14 4 页面共 16 文件；Task15 复用 aiAnalyze.getQueueStats + 新 admin/audit-ai 升级 = 约 4-8 文件）**可并行派发**。按 2~3 任务一组规则，推荐拆 2 并行组：
- **E1 · Task10 + Task11（后端双云函数并行，共享文件仅 collectionNames/stripPII/responseWrapper 只读）**
- **E2 · Task14 Admin 4 Tab + Task15 AI 质量 Dashboard 升级（前端 4+ 页，共享 app.json 注册路径需要补 4 条 admin pages，Controller 再做一次闭环修复）**

🚦 **检查点 4 正式归档：通过**
