# 安卓 / iOS / 鸿蒙三端 34 条测试用例清单（心理测评反馈微信小程序）

> **设计参考**：`docs/superpowers/specs/2026-09-03-心理测评反馈小程序-design.md` §7 跨平台三端适配 + §8 安全测试（§8 删除 冗余 iOS/鸿蒙重复章节，本清单 T34 = 11 学生 + 10 教师 + 10 管理员 + 3 跨端 = 34，安卓/iOS/鸿蒙三端各执行 T34 · 每条三端各跑 1 次，合计 102 次执行）
> **执行方式**：（a）微信开发者工具 三端真机预览扫码 → 手动逐条；（b）Python `acceptance_check.py` 自动执行 P0-P1 源码级结构性验收（S/T/A/P 共 37 断言 · 对应 T34 逻辑）

---

## 0. 测试环境

| 平台 | 最低版本 | 硬件 | 账号（初始）| 云开发环境 |
|---|---|---|---|---|
| 安卓 | WeChat ≥ 8.0.42 | Android 10+ 骁龙 660 以上 | 1 学生 / 1 教师 / 1 Admin（方案 B bcrypt+SMS 手机）| 1 个 CloudBase env，已部署 8 云函数；images 写入 seed 12 张 |
| iOS | WeChat ≥ 8.0.43 | iPhone 12+ iOS 15+（含刘海屏）| 同上 | 同上 |
| 鸿蒙 | WeChat ≥ 8.0.44 Harmony | Mate 60 系列 HarmonyOS 4+（含胶囊区）| 同上 | 同上 |

---

## 1. S 学生端用例（11 条 · 🔴 P0 × 8 · 🟡 P1 × 3）

### S1 · 角色选择 · 30 天自动登录（P1）
- **前置**：本地无 loginSession；3 角色卡片 student/teacher/admin
- **步骤**：点击 student → 微信授权 → 写入 users（首次）· anonymousNo 自增 · loginExpireAt=now+30d → 返回 session
- **预期**：返回 200 + 3 项字段齐全；关闭小程序 再重新打开 → 30 天内 自动跳过 role-select 进入 student Tab3；30 天过期（或本地清 session）→ 强制跳转 role-select
- **源码断言**：`cloudfunctions/login/index.js` L `loginExpireAt = addDays(now, 30)` 存在 / `utils/auth.js` getLoginSession 过期检测 `now > loginExpireAt → null`

### S2 · 任务大厅 · 列表 按 deadline 排序（P1）
- **前置**：teacher 已发布 ≥2 任务，deadline 分别为 now+1d 和 now+7d
- **步骤**：student → task-hall
- **预期**：任务卡片 按 deadline 从近到远 升序；deadline<24h → 橙色胶囊「即将截止」；deadline<0 过期 → 灰色「已截止」卡片不可点击
- **源码断言**：`pages/student/task-hall/index.js` sortFn `deadline_t1 - deadline_t2`

### S3 · 学生任务详情页 · 图片展示 + 内容区 msSec 红线拦截（🔴 P0）
- **前置**：1 个已发布任务（imageType = system 罗夏）
- **步骤**：点击任务卡 → 详情页 → 输入敏感内容（政治/暴力/色情 msSec 高风险词）→ 点提交
- **预期**：前端 msSecCheck 红线 → 立即 Toast 「内容包含敏感信息，请修改后重试」不调用 cloud call；若通过 msSecCheck，调用 feedbackSubmit 后端 二次 wx-server-sdk msgSecCheck → 若违规 → aiAnalysis.summary = **「内容安全红线违规，未调用 DashScope AI 分析」** 100% 不触发 DashScope API 调用
- **源码断言**：`pages/student/task-hall/index.js` 提交前 wx.security.msgSecCheck → catch return toast；`cloudfunctions/feedbackSubmit/index.js` submitFeedback case 中 wx.cloud.openapi.security.msgSecCheck 失败 → `aiAnalysis.summary = "内容安全红线违规"` + `aiAnalysis.msSecLabel = 'violation'` + 实际 DashScope 调用 **不执行**（control flow）

### S4 · 三写原子提交（🔴 P0）
- **前置**：student 已登录；1 已发布 task
- **步骤**：内容合法 → 提交
- **预期**：3 个集合同时写入：(1) feedbacks.create { studentId, taskId, content, aiAnalysis.status=PENDING } ✔；(2) anonymized_records.create { anonymousNo, taskHash, stripPII(content) } ✔；(3) status_snapshots.create { snapshotter=system, tagId='#Initial-Submit' } ✔；三者任一写失败 → 回滚（已写记录 delete）→ feedbacks.status = PENDING_RETRY → retry_queue 入队
- **源码断言**：`cloudfunctions/feedbackSubmit/index.js` submitFeedback → try 3 writes / catch(e) → rollback 反向 delete + retry_queue.create

### S5 · msSec 违规红线 不送 DashScope（🔴 P0）
- **前置**：模拟 后端 msgSecCheck 强制违规（或修改参数传入违规内容）
- **步骤**：提交
- **预期**：`aiAnalysis.summary = "内容安全红线违规..."`；`aiAnalysis.warning_tags = []`；ai_quality_metrics.msSecHitLabel = 'violation'；DashScope dashscopeClient.qwenPlus 调用次数 = 0（无实际网络请求到 DashScope）
- **源码断言**：`aiAnalyze/index.js` analyzeOne → 「if msSecPass === false → 直接 writeQualityMetric(msSecLabel='violation') + return 响应；**未进入 dashscopeClient.qwenPlus 路径**」

### S6 · AI 分析完成后 feedbacks.aiAnalysis 写入 完整字段（🔴 P0）
- **前置**：1 条反馈已走 AI analyzeOne 成功（或 Mock DashScope 返回标准 JSON）
- **步骤**：查 feedbacks
- **预期**：aiAnalysis 字段齐全：scores.depression/anxiety/stress/interpersonal/self_harm 各 0-100 数；warning_tags 数组 0~N；summary 3-10 句中文；confidence 0-1；modelName=qwen-plus；msSecLabel=pass_or_violation_or_skipped
- **源码断言**：`cloudfunctions/shared/dashscopeClient.js` JSON.parse(result.output.choices[0].message.content) 5 keys 存在；`aiAnalyze/index.js` normalizeResponse(ai_raw) 标准化 5 键

### S7 · 学生我的记录 · AI summary 只读 + warning_tags 胶囊（🔴 P0）
- **前置**：该学生 已完成 1 条反馈 + AI 分析完成 warning_tags = ['自伤风险', '中度抑郁'] 2 个
- **步骤**：进入 student/my-records → 查看详情
- **预期**：0 处 teacherReview.teacherNote 显示（student 端 永不看到教师人工批注，stripPII 学生端出口强制过滤 teacherNote）；warning_tags 胶囊颜色：抑郁=蓝 / 焦虑=紫 / 自伤=红
- **源码断言**：`cloudfunctions/shared/stripPII.js` forStudent(record) 删除 teacherReview.teacherNote / studentId/name 等 PII；`pages/student/my-records/index.wxml` 0 处绑定 `teacherNote`

### S8 · 改昵称 诚实降级横幅（P1）
- **前置**：student → profile 页
- **步骤**：点改昵称 → 输入新昵称 → 确认
- **预期**：若 cloud function users.updateNickname 未配置 → 立即显示 🟧 橙色横幅「⚠️ 演示模式：本地昵称缓存，未写入云端。开通 users 集合并部署相应云函数后生效」；0 伪造通路已通 2236019
- **源码断言**：`pages/student/profile/index.js` onNicknameSave.catch → `that.setData({ usingMockBanner: true })`；WXML 0 处伪造「已保存成功」在接口失败时。

### S9 · 草稿同步 30 秒自动保存（🔴 P0）
- **前置**：student → 任务详情 编辑中
- **步骤**：输入内容 123 → 等待 30 秒不提交
- **预期**：写入 cache_sync_drafts { openid, taskId, contentHash(contentOnly 白名单 🔴 不写 teacherId/studentId) }；再次进入任务详情页 → 自动加载草稿内容 123 提示「您有未提交的草稿，是否继续编辑？」
- **源码断言**：`pages/student/task-hall/index.js` saveDraft(setInterval 30s) → contentOnly 白名单；cache_sync_drafts schema 中 **0 字段** teacherId/studentName；`cloudfunctions/cacheClear/index.js` expireOldDraftsBulk → `where updatedAt < now-30d → remove`；`_utils/index.js` clearExpiredDrafts() 兄弟通路复用相同 API

### S10 · 草稿 30 天过期 四闸原子清理（🔴 P0）
- **前置**：1 条 cache_sync_drafts.updatedAt = now-31 天（已过期）
- **步骤**：admin（或后端定时触发）→ cacheClear.expireOldDraftsBulk
- **预期**：四闸执行顺序：(1) scope 过滤（仅本人）→ (2) ttl 过期检测（仅 30 天前）→ (3) 云端 delete 成功 → (4) 本地草稿 storage 移除；任何一步失败 → 本地草稿不移除（防数据丢失）
- **源码断言**：`cacheClear/index.js` expireOldDraftsBulk 中 4 步判断；`utils/storage.js` removeDrafts 仅在 step3.success=true 时调用

### S11 · 退出登录 清 session 30 天（🔴 P0）
- **前置**：student 已登录 本地 session 存在
- **步骤**：student/profile → 退出登录
- **预期**：本地 loginSession 移除；重启小程序 → 进入 role-select；loginExpireAt 30 天续期 在下次登录时延长
- **源码断言**：`utils/auth.js` clearLoginSession → wx.removeStorageSync('loginSession')；app.js onLaunch → getLoginSession == null → wx.reLaunch('/pages/login/role-select/index')

---

## 2. T 教师端用例（10 条 · 🔴 P0 × 8 · 🟡 P1 × 2）

### T1 · 教师审批工作流（🔴 P0）
- **前置**：teacher 首次登录 → teacherStatus = pending → 跳转 teacher-pending
- **步骤**：Admin → 审批列表（Admin Tab 或 login.getPendingTeacherApprovals）→ 点 approve
- **预期**：teacherStatus = approved；下次 teacher 登录 → 进入 teacher Dashboard；reject → teacherStatus = rejected → 登录 → teacher-pending 显示红色「您的教师身份已被拒绝，联系管理员 xxxx@xx.com」
- **源码断言**：`cloudfunctions/login/index.js` approveTeacher case → `doc.update({teacherStatus: 'approved'})`；`pages/login/teacher-pending/index.js` teacherStatus=rejected 显示红框

### T2 · 班级管理 · 6 位邀请码 join（P1）
- **前置**：teacher 创建 class A → 6 位 inviteCode = XY78QZ
- **步骤**：student → joinByInvite → 输入 XY78QZ
- **预期**：classA.memberIds 增加 studentId（匿名号）；inviteCode 错 3 次 → Toast 10 秒冷却；join 成功 teacher dashboard 班级人数 +1
- **源码断言**：`classOperate/index.js` joinByInvite → inviteCode 正则 [A-Z0-9]{6}；failCount >=3 → setLimit 10 秒

### T3 · 图库 · 自定义上传（P1）
- **前置**：teacher → img-library
- **步骤**：点上传自定义图 → 选择本地 5MB jpg
- **预期**：上传成功 → 云存储 custom-images/{teacherAnonymousNo}/{timestampId}.jpg；images 集合写入 ownerOpenid=本人；其他 teacher → list 看不到此自定义图片
- **源码断言**：`imageOperate/index.js` upload → ownerOpenid == OPENID；list 查询 where(ownerOpenid == OPENID OR type=system)

### T4 · Dashboard 4 KPI · ownerOpenid 硬过滤 防越权（🔴 P0）
- **前置**：teacher A & B 各自班级；A 有 10 条反馈 B 有 5 条；teacher A openid = O-AAA；teacher B openid = O-BBB
- **步骤**：teacher B 登录 → dashboard
- **预期**：今日预警 = 仅自己班级 B 的 5 条反馈；0 处包含 teacher A 的反馈；尝试 手动修改 ownerOpenid=O-AAA 云函数 → verifyRole(teacher) 中 WHERE ownerOpenid=本人 → 返回空数组 + code=4015 越权
- **源码断言**：`taskOperate/index.js` classStats → where(ownerOpenid = OPENID)；所有 teacher 动作均 `OPENID = cloud.getWXContext().OPENID` 硬查询

### T5 · 学生历史 · 匿名卡片 0 真名（🔴 P0）
- **前置**：teacher 班级内 3 学生 匿名号 #S000001 / #S000002 / #S000003
- **步骤**：teacher → student-history
- **预期**：卡片 仅显示 #S00000X + 年级班级哈希（如 高一*班）+ 头像；0 处显示学生真实姓名/手机号/身份证/学校地址
- **源码断言**：`cloudfunctions/feedbackSubmit/index.js` queryFeedbacks → teacher 动作走 stripPII.forTeacher 返回 仅 anonymousNo（不返回 studentId/name/phone 等 PII）；`pages/teacher/student-history/index.wxml` 0 处绑定 `studentName/studentId/phone/idCardNo/school/address`

### T6 · AI 审核 · APPROVED → divergence 写入 ai_quality_metrics（🔴 P0）
- **前置**：1 条 feedbacks reviewStatus=PENDING；aiAnalysis.scores={D:60, A:40, S:55, I:30, SH:10}；confirmedScores 传入 {D:70, A:30, S:50, I:25, SH:5}
- **步骤**：teacher → ai-review → 调整滑杆 → 点 APPROVED（或 ADJUSTED）
- **预期**：feedbackSubmit.reviewAI → teacherReview.confirmedScores 写入；ai_quality_metrics.teacherAIDivergence = calcDivergence(ai, confirmed) = (|60-70|+|40-30|+|55-50|+|30-25|+|10-5|)/5 ×10 = (10+10+5+5+5)/5×10 = 35/5×10 = 70 ✔（或按 confirmedScores 传值重新计算）
- **源码断言**：`cloudfunctions/aiAnalyze/index.js` calcDivergence 实现五维 MAE×10；reviewAI 成功 回写 ai_quality_metrics.teacherAIDivergence = divergence

### T7 · confirm 3 字段 NOT USED → 后端强制取 aiScores 防绕过（🔴 P0）
- **前置**：teacher 前端调用 reviewAI 恶意篡改 confirmedScores = {D:100, A:100, S:100, I:100, SH:100}（全满分无差异 伪造 divergence 为 0）并额外传 confirm_{1/2/3} 三字段 = confirmed
- **步骤**：调用 reviewAI 动作
- **预期**：后端 reviewAI 代码中「confirm1/confirm2/confirm3」三字段**注释为「NOT USED · 0 trust 前端确认信号」** → 后端实际 divergence 仍然 calcDivergence(aiScores_db_stored, confirmedScores_validated)；若前端 confirmedScores 单值 >100 或 <0 → 后端 clamp 0-100 不存储异常值
- **源码断言**：`feedbackSubmit/index.js` reviewAI case → 注释三行「// ▶️ confirm_3 字段仅前端 UI 防误操作，后端 0 TRUST → 若 APPROVED 则 confirmedScores 等于 aiScores（或 validated 调整值），与 confirm_3 字段无关」；const confirmedScores = clamp0_100( validated_review_input.confirmedScores 或 aiAnalysis.scores )

### T8 · 状态打标 三道 scope 检查（🔴 P0）
- **前置**：teacher A 创建 tag = 红色预警；teacher B 有 1 学生匿名号 #S123456（不在 teacher A 的学生范围内）
- **步骤**：teacher A 用浏览器模拟 HTTP 调用 applyTag 传 tagId=红色预警 / studentAnonymousNo=#S123456
- **预期**：返回 code=4015（越权）；status_snapshots 未新增记录；scope 三道检查顺序：(i) 该 anonymousNo 是否在本人班级 members → (ii) 该 anonymousNo 是否在本人 special bindings → (iii) 取 queryMyStudentIds 白名单；三者任一失败 → 4015
- **源码断言**：`statusOperate/index.js` applyTag → fetchOwnStudentIds(ownerOpenid, anonymousNo) include=false → 4015

### T9 · 撤销打标 不删除只归档（🔴 P0）
- **前置**：1 条 status_snapshots.id=SN-001 tag=红色预警 status=active；快照 ID SN-001
- **步骤**：teacher → applyTag 历史 → 点撤销
- **预期**：集合 update {SN-001}.status = revoked / revokedAt / revokedBy；**原记录不 delete**；listSnapshotsForStudent 返回时 status=revoked 显示灰色「已撤销 2026-09-04」；绑定审计 CSV 导出时包含撤销记录（含 revoked 状态）
- **源码断言**：`statusOperate/index.js` revokeTag 实现 → update(status:'revoked') **无 remove() 操作** → grep 0 处 db.collection('status_snapshots').doc(id).remove

### T10 · 解绑特殊绑定 → runBindingArchive 生成绑定审计 CSV（🔴 P0）
- **前置**：teacher 有 1 条 special binding 匿名号 #S123456（已绑定 1 年）；status_snapshots 对该 student 共 12 条 打标历史
- **步骤**：teacher/binding-manage → 点解绑 → 二次确认
- **预期**：(1) student_bindings.update status=unbound；(2) runBindingArchive 调用 statusOperate.exportSnapshotsAuditCSV → 导出 CSV 12 行 × 8 字段；(3) 写 export_logs{ ttlExpireAt=+7d, operatorAnonymousNo, scope:'binding-unbind-archive' }；(4) Admin global-export → Tab B 快照审计 看到此条 导出可下载（7 天内）
- **源码断言**：`cloudfunctions/classOperate/index.js` unbind case → `await statusOperate.exportSnapshotsAuditCSV({...})`；export_logs.ttlExpireAt 写入 now + 7 days

---

## 3. A 管理员端用例（10 条 · 🔴 P0 × 6 · 🟡 P1 × 4）

### A1 · Admin 登录 · 审批教师列表（P1）
- **前置**：1 超级管理员 Admin 已按 create-admin-user.md 创建（adminInfo.passwordHash + adminInfo.mfaPhone）；1 teacher status=pending
- **步骤**：Admin → 登录（方案 B admin 入口）
- **预期**：审批列表 1 pending teacher；点 approve → teacherStatus=approved；点 reject → rejected
- **源码断言**：`cloudfunctions/login/index.js` getPendingTeacherApprovals / approveTeacher / rejectTeacher 三动作实现

### A2 · Ops 全局 4 KPI（P1）
- **前置**：全校 3 教师；当月已导出 2 次；反馈总数 500；AI 调用 500（success=495）；AI 审核 APPROVED+ADJUSTED=400
- **步骤**：admin/ops-overview 刷新
- **预期**：4 KPI 值：今日预警（按当日 AI warning_tags）= N / AI 成功率 successRate=495/500=99% 绿色 / 本月导出=2 / 教师审核通过率=400/（已审核 400）=100% 或按实际分母
- **源码断言**：`pages/admin/ops-overview/index.js` computeGlobalStats 四聚合；successRate 分母=0 时返回 0（防除零）

### A3 · Global Export · Tab A 科研 CSV 导出（P1）
- **前置**：anonymized_records 10 万行
- **步骤**：admin → global-export Tab A → 发起科研导出
- **预期**：taskOperate.researchExport admin 全校 → 生成 research-{timestamp}.csv（17 字段白名单 · 0 PII · teacherNote 永不导出）；tempFileID 写 export_logs.ttlExpireAt=+7d；列表页 显示 1 条「科研导出 100,000 行 · 剩余 TTL 6天23小时」
- **源码断言**：`taskOperate/index.js` researchExport → 17 字段白名单 对象字面量 固定；grep teacherNote → 0 处 push 到 fields

### A4 · Tab B 快照审计 CSV 导出（P1）
- **前置**：绑定解绑 runBindingArchive 触发 1 次审计 CSV（T10）
- **步骤**：admin → global-export Tab B → 下载该条
- **预期**：CSV 8 字段：snapshotId / studentAnonymousNo / tagId / tagName / tagColor / snapshotter / createdAt(YYYY-MM-DD) / status(active_or_revoked)
- **源码断言**：`statusOperate/index.js` exportSnapshotsAuditCSV → 8 字段固定数组

### A5 · TTL 过期双保险禁用下载（🔴 P0）
- **前置**：1 条 export_logs.ttlExpireAt = now-1 天（已过期）
- **步骤**：admin/global-export → 列表显示 该条
- **预期**：① WXML `disabled="{{item.expired}}"` → 按钮灰化 不可点击（视觉层）；② 用户通过 浏览器/工具 强制触发 onDownload → JS 二次 if(!target||target.expired) { toast('TTL 到期，不可下载') return }（逻辑层）
- **源码断言**：`pages/admin/global-export/index.wxml` disabled 绑定；`pages/admin/global-export/index.js` onDownloadExport 开头 ttl 判断

### A6 · people-crisis TOP50 全匿名 0 PII 真名渲染（🔴 P0）
- **前置**：全校存在 50+ 高危预警学生（ai self_harm≥70），含真实姓名/手机号/身份证号
- **步骤**：admin → people-crisis 进入（2FA 尚未通过 · 默认 piiAuthorized=false）
- **预期**：TOP50 卡片 仅显示 studentAnonymousNo + 预警胶囊 + 提交时间；WXML 渲染 9 PII 字段 0 处真名（全部三重门控短路回 piiMasked → *** 等脱敏）；grep 页面源码 console.log 0 处打印真名
- **源码断言**：`pages/admin/people-crisis/index.wxml` 9 字段全部 `(piiAuthorized && piiReal && piiReal.xxx) || piiMasked.xxx`；piiAuthorized 默认 false → 短路后 全部走 piiMasked.xxx；`pages/admin/people-crisis/index.js` onLoad 中 0 处直接绑定 PII 明文到 data

### A7 · people-crisis 2FA 三动作调用序列（🔴 P0）
- **前置**：Admin 已登录 adminInfo.passwordHash=bcrypt(MyPass123!) ；adminInfo.mfaPhone=手机号
- **步骤**：点击 TOP50 学生 → 弹出 2FA → ① 输入 MyPass123! 密码错误 5 次 → 2FA 锁定 30 分钟；② 再输入正确 MyPass123! → Factor1 通过 → ③ 点发送 SMS 短信 → 手机号收到 6 位 OTP（或演示 123456）→ ④ 输错 OTP 3 次 → 短信 5 次/小时限频触发；⑤ 正确 OTP → 通过
- **预期**：前端调用序列 严格三动作：Factor1 login.adminVerifyPassword → Factor2a login.adminSend2FACode → Factor2b login.adminVerify2FACode；跳过任何一步 → crisis.accessPII 后端二次 2FA 校验失败 → 返回 4015「2FA 未完成」；前端页面 肉眼可见 进度条 步骤 1/2/3
- **源码断言**：`pages/admin/people-crisis/index.js` Factor1 L339 / Factor2a L384 / Factor2b L430 三调用按控制流 顺序执行（L339 成功 → 触发 L363 Factor2a → L401 Factor2b 必须按此顺序）；`cloudfunctions/crisis/index.js` accessPII 开头 「检查 piiGrantToken 是否存在 且未过期且 由 login.verify2FA 写入 → 否则 4015」（后端二次校验，不 trust 前端 piiAuthorized 本地 true 伪造）

### A8 · people-crisis 30 秒 PII 窗口 4 层强制 null 化 + audit anonymousNo（🔴 P0）
- **前置**：2FA 通过 → stage3 30 秒 PII 窗口
- **步骤**：(a) 等待 30 秒不操作；(b) 后台切出小程序 → 10 秒 再切回（30 秒已过）；(c) 点「关闭实名窗口」手动按钮；(d) 直接离开页面（navigate back）
- **预期**：四种情况 全触发 forceReMask → ① setData({piiReal:null, piiAuthorized:false})（WXML 立即短路脱敏）② this.data.piiReal = null 加速 GC ③ _piiCache = null 闭包销毁；④ writeAuditPIIAccess(actionType: auto_clear_30s / auto_onShow_expired / manual_close / auto_page_unload)；audit_logs 集合写入 payload 仅 adminAnonymousNo + studentAnonymousNo 🔴 不写 studentId/studentName/phone/idCardNo/school 真名 0 处
- **源码断言**：`pages/admin/people-crisis/index.js` setTimeout(forceReMask, 30000)；onShow → check expired → forceReMask('auto_onShow_expired')；onUnload → forceReMask('auto_page_unload', silent=true)；writeAuditPIIAccess → payload = { adminAnonymousNo, studentAnonymousNo, actionType, meta } grep 0 字段 studentName/studentId/phone

### A9 · audit-ai Token 环形仪表盘 三档色 80% 黄 95% 红（🔴 P0）
- **前置**：分别设置 usedPct=0.70 / 0.85 / 0.97 三种 模拟 usedTokens（或 Mock getBudgetStatus 返回三值）
- **预期**：① usedPct=0.70 → 环形 green / 文案正常；② usedPct=0.85 ≥0.80 <0.95 → 环形 黄 / 文案「⚠️ 已用 85% 接近预算」；③ usedPct=0.97 ≥0.95 → 环形 red / 文案「🔴 已用 97% 严重超支，将触发限流」；中央值 usedPct% = 70 / 85 / 97
- **源码断言**：`pages/admin/audit-ai/index.js` gaugeColorFor(usedPct) → switch 三档：<0.80 → #10B981；0.80-0.95 → #F59E0B；≥0.95 → #EF4444；CSS conic-gradient(gaugeColor ... %)；getBudgetStatus 返回 WARN=0.80 CRIT=0.95 MONTHLY_TOKEN_BUDGET=2000000 三常量

### A10 · audit-ai 失败 TOP20 · 手动重跑 action=manualRerun params{feedbackId} 合法（🔴 P0）
- **前置**：ai_quality_metrics 当月 success=false / failureReason='DashScope 429 限流' 记录 共 N 条（N≤20）
- **步骤**：audit-ai 失败 TOP20 → 点击 第 3 条 「🔁 手动重跑」按钮
- **预期**：① 调用 cloud.call('aiAnalyze', action='manualRerun', params={feedbackId})；② 返回 200 → toast「已入队重新分析，预计 10 秒内完成」；③ retry_queue 集合 新增 1 条 { feedbackId=该记录ID, retryCount=原 +1, status='pending', nextRunAt=now+5s }；④ 前端按钮 30 秒灰化「避免重复提交」
- **源码断言**：`pages/admin/audit-ai/index.js` onManualRerun → call 'aiAnalyze' action='manualRerun' params.feedbackId = item.feedbackId；`cloudfunctions/aiAnalyze/index.js` manualRerun case → retry_queue.create 写入

---

## 4. P 跨端兼容（3 条 · 🟡 P1 · 三端关键适配）

### P1 · Android 物理返回键 onUnload 前 people-crisis PII 强制清理（P1）
- **平台**：安卓（原生物理返回键 / 全面屏手势返回）
- **前置**：admin → people-crisis stage3 30 秒 PII 窗口（piiAuthorized=true, piiReal 含真名）
- **步骤**：安卓 按物理返回键（或全面屏 返回手势）
- **预期**：people-crisis.onUnload → forceReMask('auto_page_unload', silent=true) → 4 层 null 化 + audit 写入；再次进入 people-crisis → piiAuthorized=false（0 处真名残留）
- **源码断言**：`pages/admin/people-crisis/index.js` onUnload → forceReMask 存在（安卓 物理返回键 100% 触发 page.unload）；grep `onUnload: function` 内含 forceReMask 调用

### P2 · iOS 刘海屏 safe-area-bottom + 加密备份（P1）
- **平台**：iOS（iPhone 12+ 刘海屏）
- **前置**：student 提交内容 1000 字 编辑中；自定义 tab-bar 底部 Tab
- **步骤**：查看 student/task-hall 编辑区底部 与 custom-tab-bar 顶部 间距；查看 iCloud 备份
- **预期**：编辑区底部 padding-bottom = safe-area-bottom（iPhone 12 应为 ~34pt=68rpx）；custom-tab-bar 高度 R88 = 88rpx + safe-area-bottom=68rpx=156rpx（不被 Home Indicator 遮挡）；storage.js 中 敏感草稿 不备份到 iCloud 加密外（wx.setStorageSync options 标记 不自动同步 iCloud，或 采用加密 base64 存储）
- **源码断言**：`app.wxss` .safe-area-bottom `padding-bottom: env(safe-area-inset-bottom)` 存在；`utils/storage.js` saveDrafts 采用 `_b64.encode + aes` 或 `b64` 编码 非明文 写本地

### P3 · 鸿蒙 胶囊区 适配 + 字体大小跟随系统（P1）
- **平台**：鸿蒙（Mate 60 HarmonyOS 4 含屏幕右上角胶囊区）
- **前置**：admin/audit-ai 环形仪表盘 在页面顶部
- **步骤**：查看顶部间距；调整系统字体 超大
- **预期**：页面顶部 padding-top = 鸿蒙胶囊区 约 96-200rpx（platform.detect → harmony 返回胶囊安全区 值 应用 padding-top）；字体大小跟随系统（WXSS 使用 rpx 单位 + `wx.getSystemInfoSync().fontSizeSetting` 比例 计算 文字大小；无 硬编码 px 绝对尺寸 导致大字体 裁切）
- **源码断言**：`utils/platform.js` platformDetect → harmony/harmonyNext → return { safeTop: 200rpx 等 }；`app.js` 启动 应用 globalData.safeTop；`.wxss` 各页面 top-padding 采用 var(--safe-top)

---

## 5. 测试用例汇总表（34 · 执行矩阵）

执行每一条时，三端分别标记：✅ PASS / ❌ FAIL / ⚪ SKIP（平台不适用）。最终每端 **34 条 要求全 PASS**；合计 102 执行 ≥ 100 PASS（允许 ≤ 2 SKIP 仅平台差异）。

| 组 | ID | 标题 | 优先级 | 安卓 | iOS | 鸿蒙 |
|---|---|---|---|---|---|---|
| S | S1 | 30天自动登录 | P1 | - | - | - |
| S | S2 | 任务大厅 排序 | P1 | - | - | - |
| S | S3 | msSec 红线拦截 前后端双校验 | P0 | - | - | - |
| S | S4 | 三写原子提交 | P0 | - | - | - |
| S | S5 | msSec违规红线 不送DashScope | P0 | - | - | - |
| S | S6 | AI分析字段齐全 | P0 | - | - | - |
| S | S7 | 学生我的记录 永不显示teacherNote | P0 | - | - | - |
| S | S8 | 改昵称 诚实降级横幅 0伪造通路 | P1 | - | - | - |
| S | S9 | 草稿30秒自动保存 | P0 | - | - | - |
| S | S10 | 草稿30天过期 四闸原子清理 | P0 | - | - | - |
| S | S11 | 退出登录 清session | P0 | - | - | - |
| T | T1 | 教师审批工作流 | P0 | - | - | - |
| T | T2 | 6位邀请码join 限频 | P1 | - | - | - |
| T | T3 | 自定义图上传 ownerOpenid隔离 | P1 | - | - | - |
| T | T4 | Dashboard ownerOpenid硬过滤 4015 | P0 | - | - | - |
| T | T5 | 学生历史卡片 0真名 全匿名 | P0 | - | - | - |
| T | T6 | AI审核APPROVED 计算divergence 回写 | P0 | - | - | - |
| T | T7 | confirm3字段 后端0trust 防绕过 | P0 | - | - | - |
| T | T8 | 打标三道scope 4015越权 | P0 | - | - | - |
| T | T9 | 撤销打标 不删除只归档 | P0 | - | - | - |
| T | T10 | 解绑 runBindingArchive 审计CSV | P0 | - | - | - |
| A | A1 | 审批教师列表 | P1 | - | - | - |
| A | A2 | Ops 4 KPI 全局聚合 分母除零 | P1 | - | - | - |
| A | A3 | 科研CSV 17字段白名单 0PII | P1 | - | - | - |
| A | A4 | 审计CSV 8字段 绑定归档 | P1 | - | - | - |
| A | A5 | TTL过期 双保险禁用下载 | P0 | - | - | - |
| A | A6 | people-crisis TOP50 全匿名0真名 | P0 | - | - | - |
| A | A7 | people-crisis 2FA 三动作序列 后端二次校验 | P0 | - | - | - |
| A | A8 | 30秒窗口 4层null化 + audit anonymousNo | P0 | - | - | - |
| A | A9 | audit-ai 环形仪表盘三档色 80/95 | P0 | - | - | - |
| A | A10 | 失败TOP20 手动重跑 action+params | P0 | - | - | - |
| P | P1 | Android 物理返回 onUnload PII强清 | P1 | - | N/A ⚪ | N/A ⚪ |
| P | P2 | iOS 刘海屏 safe-area-bottom + 加密备份 | P1 | N/A ⚪ | - | N/A ⚪ |
| P | P3 | 鸿蒙 胶囊区适配 + 字体跟随系统 | P1 | N/A ⚪ | N/A ⚪ | - |

---

## 6. 自动化验收（acceptance_check.py 断言 对应用例 P0/P1 核心逻辑 37 条）

Python `acceptance_check.py` 执行 37 断言（不依赖真机环境 可在 CI 直接运行 源码级结构/正则/语法 独立核查）。

| 脚本断言 ID | 对应 T34 用例 | 类型 |
|---|---|---|
| A-01 ~ A-14 | R1 功能正确性 A~E（存在 21/语法 14/dispatch=7+8/admin 注册 4/shared 0越改）| 结构 |
| A-15 ~ A-28 | R2 合规 7 条红线 14 断言 | 合规 |
| A-29 | S3 msSec 违规红线不送DashScope | S-P0 |
| A-30 | S7 学生端永不显示teacherNote | S-P0 |
| A-31 | T7 confirm三字段 NOT USED | T-P0 |
| A-32 | T8 三道 scope fetchOwnStudentIds | T-P0 |
| A-33 | T9 revoke 不 remove 只 update revoked | T-P0 |
| A-34 | A7 crisis.accessPII 后端二次 2FA 校验 | A-P0 |
| A-35 | A8 audit_logs 匿名号化（studentName/studentId 0 命中 audit 写入） | A-P0 |
| A-36 | A9 三档色 switch 80/95 常量 | A-P0 |
| A-37 | P1 onUnload forceReMask；P2 safe-area；P3 platform harmony | P 跨端 |

**验收脚本执行 → 37/37 PASS = 结构/合规层全通过 → 真机仅需跑 UI 交互层（S2/T2~T3/A1~A4 等 P1 UI 类）**。
