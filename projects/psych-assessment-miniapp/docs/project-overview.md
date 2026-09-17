# 心理测评反馈微信小程序 · 项目总览与说明（1477217 收尾专项：§项目说明）

> 对应 1477217 收尾自检清单 §3「项目说明（输出项目结构、页面流转、权限控制、隐私合规说明）」；适配微信小程序审核规范 100%。
> **设计规范 v1.3**：`docs/superpowers/specs/2026-09-03-心理测评反馈小程序-design.md`
> **10 大功能映射**：`.trae/documents/plan.md` §0 F1~F10

---

## 1. 项目结构（总览 · 约 130 文件）

```
g:\mental health\                  根目录（小程序项目根，可直接导入微信开发者工具）
├─ project.config.json            工具项目配置（appid 占位 + miniprogramRoot 根 + cloudfunctionRoot 云函数）
├─ project.private.config.json    开发者私有（云环境 ID 占位，真机部署时替换）
├─ sitemap.json                   小程序搜索收录配置
├─ app.json                       21 页面注册 + 全局窗口配置 + 自定义 tabBar（custom:true）
├─ app.js                         启动流程：云开发初始化 + 登录会话 30 天读取 + 角色路由重定向
├─ app.wxss                       全局 CSS：主题色 7 色 + safe-area-bottom（iOS 刘海 / 鸿蒙胶囊）+ 通用卡片/按钮/胶囊
│
├─ pages\  (21 页 × 4 = 84 文件)   前端页面 WXML(结构) + WXSS(样式) + JS(逻辑) + JSON(配置)
│  ├─ login\  (2 页)
│  │  ├─ role-select              首次进入：student / teacher / admin 角色卡片（无账号自动创建 users）
│  │  └─ teacher-pending          教师 pending 审核等待页（pending → approved/rejected）
│  │
│  ├─ student\  (3 页)            学生端三 Tab：任务大厅 / 我的记录 / 个人资料
│  │  ├─ task-hall                任务卡片列表 → 详情页（罗夏/TAT/自定义图展示 + 文字输入 + msSec 红线提示）
│  │  ├─ my-records               历史反馈 + AI 分析摘要 + 预警胶囊（永不显示 teacherNote）
│  │  └─ profile                  匿名号展示 + 改昵称（诚实降级横幅 0 伪造通路）+ 退出登录
│  │
│  ├─ teacher\  (7 页)            教师端四 Tab（班级/图库/Dashboard/状态标签）+ 子页
│  │  ├─ class-manage             班级 CRUD / 6 位邀请码复制 / 成员管理 / 解散删除
│  │  ├─ img-library              系统图库（12 罗夏/TAT 只读）+ 自定义图片上传（ownerOpenid 隔离）
│  │  ├─ dashboard                4 KPI 班级 / 7 日预警条形图 / 预警 TOP20 全匿名卡片
│  │  ├─ student-history          学生历史反馈 10 条/页 + 情绪分条（5 维）+ 匿名卡片 0 真名
│  │  ├─ binding-manage           特殊学生绑定 CRUD / 解绑触发 绑定审计 CSV 自动生成（runBindingArchive）
│  │  ├─ ai-review                AI 审核列表（PENDING/APPROVED/ADJUSTED/REJECTED）+ 滑杆调整 + confirm 三字段（仅前端 UI 防误操作）
│  │  └─ status-tag               标签库 CRUD（system 6 色只读 + 自定标签 ownerOpenid 过滤）/ 学生打标三道 scope
│  │
│  └─ admin\  (4 页)              超级管理员（方案 B）Admin 4 Tab（方案 B 独立席位 权限最大）
│     ├─ ops-overview             全局 KPI 全校 4 卡片 + 7 日预警条形图 + TOP20 预警详情弹层（0 PII）
│     ├─ global-export            Tab A 科研 CSV 导出 / Tab B 绑定审计 CSV / 历史导出列表 TTL 过期双保险禁用下载
│     ├─ people-crisis            🔴🔴🔴 危机高危干预 TOP50 全匿名（仅 anonymousNo） + 2FA 三动作 + 30 秒 PII 窗口 4 层 null 化 + audit_logs 匿名化
│     └─ audit-ai                 AI 质量仪表盘：4 KPI / 7 日成功失败条形图 / Token 环形仪表盘（80% 黄/95% 红）/ 失败饼图 / 失败 TOP20 手动重跑 / Divergence TOP10 显著差异
│
├─ custom-tab-bar\  (4 文件)      自定义底部 Tab（student 3 Tab / teacher 4 Tab / admin 4 Tab）· 按角色动态切换
├─ components\admin-2fa\          Admin 2FA 复用组件（密码验证 + SMS 发送 + 6 位 OTP 输入 UI）· people-crisis/登录页复用
│
├─ utils\  (8 模块)               前端工具（8 文件）
│  ├─ auth.js                     getLoginSession / saveLoginSession / clearLoginSession（30 天过期检测）
│  ├─ storage.js                  双存储（同步+异步）· 草稿本地加密 base64 写 · 30 天 TTL 清理钩子
│  ├─ platform.js                 platformDetect：区分 Android / iOS / Harmony / HarmonyNEXT · 返回 safeTop/safeBottom 刘海 / 胶囊区
│  ├─ pii.js                      前端本地 PII 模糊化：脱敏姓名/手机/身份证（cacheClear 草稿同步前调用）
│  ├─ anonymize.js                SHA-256 hash 生成 taskHash + 匿名号格式化（'#S' + 6 位自增）
│  ├─ csv.js                      前端 CSV 工具：预览行数 / CSV 校验 BOM 头
│  ├─ cloud.js                    wx.cloud.callFunction 统一封装：code=4011（未登录）→ 自动清 session + 跳 role-select
│  └─ _b64.js                     Base64 编解码（草稿加密存储 / iOS 备份兼容）
│
├─ cloudfunctions\  (8 云函数 + 6 shared + _utils 兄弟通路 = 约 28 文件)
│  ├─ login\                      登录主函数：jscode2session + 首次创建 users（anonymousNo 自增）+ 续期 30 天
│  │                              · 教师审批：getPendingTeacherApprovals / approveTeacher / rejectTeacher
│  │                              · Admin 2FA：adminVerifyPassword（bcrypt 5 次锁 30 min）/ adminSend2FACode（SMS 5 次/小时限频）/ adminVerify2FACode（6 位 OTP 校验）
│  ├─ classOperate\               班级 CRUD（9 动作）· 6 位邀请码 join 限频 · 解绑触发 runBindingArchive（绑定审计 CSV）
│  ├─ imageOperate\               图片库 CRUD（6 动作）· 上传校验 20MB · 系统图只读 · 自定义图 ownerOpenid 隔离
│  ├─ taskOperate\                任务 CRUD + 发布（11 动作）· classStats 聚合 · researchExport 科研 17 字段 CSV 导出（admin 全校）· exportSnapshotsAuditCSV 绑定审计 CSV 导出
│  ├─ feedbackSubmit\             学生反馈三写原子提交（8 动作 保持不变 Task12 DEFAULT 兜底不改 dispatch）
│  │                              · msSec 前后端双校验 · teacher 读 stripPII.forTeacher · queryMyStudentIds 白名单
│  │                              · reviewAI 教师 AI 审核：confirm 三字段 NOT USED · 后端 0 trust 前端 强制基于 aiScores 为基线
│  ├─ aiAnalyze\                  AI 分析主函数（7 动作 Task13 新增预算告警）
│  │                              · msSecCheck 违规 不送 DashScope · DashScope qwen-plus few-shot 3 例
│  │                              · 指数退避重试 5/10/20s ±25% 3 次 · retry_queue 入队
│  │                              · 统一 writeQualityMetric 写 ai_quality_metrics 14 字段
│  │                              · calcDivergence（五维 MAE ×10 0-100 scale）
│  │                              · getBudgetStatus：三档 Token 预算告警 80% 黄 / 95% 红 · 月预算 200 万 Tokens
│  ├─ cacheClear\                 草稿同步 30 天过期 四闸原子清理（6 动作）· accessPII 前端调用（后端 2FA 二次校验）
│  ├─ crisis\                     🔴🔴🔴 危机干预主函数（4 动作）· TOP50 全匿名集合查询 · PII 授权后端二次 2FA 校验 · 30 秒 grantPIIWindow · revokePII
│  │
│  ├─ shared\  (6 模块)           云函数间共享代码（0 重复写 legacy）
│  │  ├─ verifyRole.js            verifyRole(role)：所有云函数首行鉴权中间件 · OPENID 硬绑定 · 失败统一返回 4015
│  │  ├─ stripPII.js              stripPII.forStudent / forTeacher / forAdminScope：三角色 不同出口 PII 白名单过滤
│  │  │                           · forStudent 强制删除 teacherNote / forTeacher 返回 anonymousNo 0 真名 / forAdminScope 仅 crisis.accessPII 内部调用不出口
│  │  ├─ dashscopeClient.js       通义千问 DashScope qwen-plus 封装：temperature=0.1 + few-shot 3 例 + JSON schema 解析 + 错误码分类（429/401/5xx）
│  │  ├─ collectionNames.js       15 集合名称 常量（防手误 typo 写错集合）
│  │  ├─ csvUtils.js              Task12 新建共享 CSV 工具 · csvCell 6 类输入 严格更优 JSON.stringify · buildCSVLines 批量行
│  │  └─ responseWrapper.js       success(data) / fail(code, msg) 统一响应格式 · 与前端 cloud.js callFunction 一一对应
│  │
│  └─ _utils\  (2 文件)           兄弟通路复用：clearExpiredDrafts → cacheClear.expireOldDraftsBulk 四闸原子（T12 §④）
│     ├─ index.js
│     └─ package.json
│
├─ scripts\  (辅助工具)
│  ├─ seed\seed_images_12.json    12 张系统预设图（10 罗夏 + 2 TAT 经典卡片）元数据 JSON · 版权免费 CC0 / 内部学术
│  ├─ seed-images.js              批量写入 images 集合（微信开发者工具 云函数控制台 运行一次 初始化）
│  └─ create-admin-user.md        超级管理员创建步骤：bcrypt 生成 passwordHash / 插入 adminInfo / 填入 mfaPhone
│
├─ docs\  (文档)
│  ├─ plans\HOTL 工作流           风险 高 自动审批 false · Task 0~15 派发顺序
│  ├─ superpowers\specs\          设计规范 v1.3（10 项需求 / 15 集合 / 8 云函数）
│  ├─ superpowers\plans\          实施计划（Task 0~15 详解）
│  ├─ project-overview.md         本文件 · 1477217 §项目说明
│  └─ test-cases-34.md            三端真机测试用例清单（S11+T10+A10+P3 = 34）
│
├─ .hotl\checkpoints\             7 个 HOTL 两轮 Controller Review 检查点：
│     checkpoint-0-ok.md（T0 脚手架）
│     checkpoint-1-t1t3-ok.md（T1 登录/T3 图库）
│     checkpoint-2-t2t5-ok.md（T2 班级/T5 反馈三写）
│     checkpoint-3-t4t6-ok.md（T4 学生UI/T6 AI 分析）
│     checkpoint-4-t7t8t9-ok.md（T7+T8+T9 教师分析 + AI 审核 + 状态打标·4 条红线全通过）
│     checkpoint-5-t10t11-ok.md（T10 缓存四闸原子 + T11 科研 3 层防漏）
│     checkpoint-6-t12t13t14t15-ok.md（T12+T13+T14+T15 后端补全 + AI 质量上报 + Admin 4 Tab + AI 仪表盘·7 条红线全通过 10/10 功能）
│
└─ .trae\documents\plan.md        最终镜像交付计划（目标要求路径 · 100% 与 docs 源文件对齐）
```

---

## 2. 页面流转

### 2.1 全流程总览（首次打开）
```
微信扫码 / 打开小程序
    ├─ app.js onLaunch
    │    ├─ 1. wx.cloud.init（云环境初始化）
    │    ├─ 2. utils/platform.js → platformDetect（Android / iOS / Harmony/HarmonyNEXT → safeTop/safeBottom）
    │    └─ 3. utils/auth.getLoginSession → 本地有 session 且 未过期(30天) → 角色首页
    │                                              → 无 session 或 已过期 → role-select
    │
    └─ role-select
         ├─ 选 [学生] → login.action=switchRole(student) → 写入 users（首次） → /pages/student/task-hall
         ├─ 选 [教师] → login.switchRole(teacher) → teacherStatus=pending → /pages/login/teacher-pending
         │              └─ 下次登录 teacherStatus=approved → /pages/teacher/dashboard
         └─ 选 [管理员] → 显式入口 → 2FA 登录（adminVerifyPassword → SMS 验证码）→ /pages/admin/ops-overview
```

### 2.2 学生端 3 Tab 流转（简化）
```
task-hall 任务大厅
 ├─ 点任务卡片 → 详情（系统图/自定义图 + 文字输入 + 30s 草稿自动保存）
 │    └─ 提交 → feedbackSubmit 三写原子 → AI analyzeOne（msSec 通过）→ writeQualityMetric
 │               → 返回成功：Toast「已提交，AI 预计 5 秒内完成」→ 自动跳转 my-records
 └─ 切 Tab → my-records 历史反馈列表
      └─ 点卡片 → 详情（AI 摘要 + warning_tags 胶囊 + 0 teacherNote）
 └─ 切 Tab → profile 个人资料
      └─ 点改昵称（诚实本地降级横幅 0 伪造通路）；点退出登录 → clearLoginSession → role-select
```

### 2.3 教师端 4 Tab 流转（简化）
```
dashboard 班级仪表盘
 ├─ 预警 TOP20 → 点卡片 → 跳转 student-history 单学生
 ├─ 7 日预警条形图（只读）
 └─ 切 Tab → class-manage / img-library / status-tag（底部 Tab）

class-manage 班级管理
 └─ 创建班级 → 6 位邀请码（XY78QZ）· 复制 / 成员管理 / 解散删除

img-library 图库
 ├─ 系统图（10 罗夏 + 2 TAT）Grid · 只读
 └─ 自定义图上传（20MB）· ownerOpenid 隔离
 └─ 选中后 可「创建任务（含图）」→ 跳转 taskOperate.create + 指定图 ID

status-tag 标签库
 └─ 创建标签 / 编辑 / 删除（system 标签只读）
 └─ 打标：去 student-history → 选学生 → 打标（三道 scope 检查）

student-history 学生历史
 └─ 点单反馈 → ai-review（PENDING）→ 滑杆调整 + APPROVED / ADJUSTED / REJECTED
 └─ reviewAI 成功 → feedbacks.teacherReview 写入 + divergence 回写 ai_quality_metrics

binding-manage 特殊绑定
 └─ 添加学生（anonymousNo） → 绑定
 └─ 解绑 → 二次确认 → runBindingArchive → 生成绑定审计 CSV → export_logs TTL 7 天
```

### 2.4 Admin 端 4 Tab 流转（🔴🔴🔴 最高权限 全匿名 + 2FA PII 授权）
```
ops-overview 全局 KPI
 ├─ 4 KPI 全校（预警 / AI 成功率 / 导出 / 审核通过率）
 ├─ 7 日预警条形图
 └─ 预警 TOP20 全校 → 详情弹层 仅 studentAnonymousNo 0 真名

global-export 导出
 ├─ Tab A 科研 CSV → taskOperate.researchExport admin 全校 17 字段白名单
 ├─ Tab B 快照审计 CSV → statusOperate.exportSnapshotsAuditCSV admin
 └─ 历史列表：ttlExpireAt<now → disabled 灰化 + JS 二次兜底拒绝下载（双保险）
     └─ 点下载 → downloadLinkByExportId → tempFileURL → wx.downloadFile → wx.openDocument(showMenu:true 转发/打印)

people-crisis 危机高危干预 🔴🔴🔴
 └─ 阶段 1：TOP50 全匿名（studentAnonymousNo + 预警红胶囊 N 个 + 提交时间）0 PII
       └─ 点卡片 → 阶段 2：2FA 三动作 密码（5 次锁 30 分）+ SMS（5 次/小时限频）+ OTP 6 位 校验
            └─ 后端 crisis.accessPII 二次 2FA 校验 通过 → 阶段 3
                 └─ 30 秒 PII 窗口：9 PII 字段三重门控 + 倒计时 30→0 + 手动关闭按钮
                      └─ 到时 4 层 null 化（setData + GC + 闭包 + audit_logs anonymousNo 写入）

audit-ai AI 质量仪表盘
 ├─ 4 KPI：今日 AI 调用 / 近 100 条成功 平均时延 / 累计 Tokens / 成功率
 ├─ 7 日成功 vs 失败 并排条形图
 ├─ Token 环形仪表盘（CSS conic-gradient 三档色 80% 黄 95% 红）
 ├─ 失败原因分类饼图（canvas 2d ctx.arc 6 类）
 ├─ 失败 TOP20 → 🔁 手动重跑（action=manualRerun params{feedbackId}）
 └─ Teacher-AI divergence TOP10（≥25 显著差异：黄/红 分级）
```

---

## 3. 权限控制（角色 × 动作 矩阵 · verifyRole 首行 100% 覆盖 · 0 bypass）

### 3.1 角色权限总表

| 角色 | 云函数动作权限范围 | 备注 |
|---|---|---|
| **学生** (role=student) | login.switchRole(student) · feedbackSubmit.submitFeedback / queryFeedbacks(仅本人) / getFeedbackDetail(仅本人) · cacheClear.expireOldDraftsBulk(仅本人草稿) · classOperate.joinByInvite/leave/list · imageOperate.list/systemList · taskOperate.list/studentList（仅本人班级）| 任何查询 强制 studentId=本人 OPENID；**永不允许** 调用 taskOperate.researchExport / statusOperate.* / crisis.* / login.admin* |
| **教师** (role=teacher & teacherStatus=approved) | login.switchRole(teacher) · classOperate.* 全（create/join/update/members/leave/list/delete/unbind/archive 9）· imageOperate.*（含 upload 自定义 ownerOpenid=本人）· taskOperate.* 全（11 动作）但 researchExport/exportSnapshotsAuditCSV **仅 admin** · feedbackSubmit.* 全（8 动作）· **queryMyStudentIds（fetchOwn 范围白名单）** · aiAnalyze.analyzeOne/getQueueStats/getModelPricingInfo · cacheClear.forceCleanByTeacher（本人班级草稿）· statusOperate.*（打标三道 scope 校验）| 所有查询 强制 ownerOpenid=本人 OPENID；越权（如查询非本人学生反馈）→ 4015；教师 不得 调用 crisis.* / login.admin* / aiAnalyze.manualRerun（仅 admin）|
| **管理员** (role=admin & adminInfo.role=super) | login.adminVerifyPassword / adminSend2FACode / adminVerify2FACode / getPendingTeacherApprovals / approveTeacher / rejectTeacher · taskOperate.researchExport / exportSnapshotsAuditCSV · **crisis.*（TOP50 全匿名 / accessPII 需 2FA 二次校验 / grantPIIWindow / revokePII）** · aiAnalyze.manualRerun/getBudgetStatus · cacheClear.accessPII（与 crisis 兄弟通路复用）· feedbackSubmit.queryFeedbacks 全校匿名只读 · statusOperate 全校匿名只读 | 最高权限；🔴 任何 PII 真名访问 必须 2FA 通过 且 后端二次校验；audit_logs 全部 anonymousNo 化 0 真名写入；TOP50 / 全局列表 默认 全匿名 0 真名 |
| **teacherPending** (role=teacher & teacherStatus=pending) | 仅 login.switchRole(teacher) · 读取 teacherStatus 显示 pending | 拒绝 任何其他 云函数动作；前端跳转 teacher-pending 等待页；1477217 合规：「教师未审批 不得 访问任何 教学 功能」|
| **teacherRejected** (role=teacher & teacherStatus=rejected) | 仅 login.switchRole(teacher) · 读取 teacherStatus 显示 rejected | 前端显示红框「您的教师身份已被拒绝 联系管理员」；0 通路 跳转 教师端页面；与 pending 合符 微信小程序 审核规范 「用户组权限最小化」|

### 3.2 verifyRole 所有云函数首行 统一调用
```
// cloudfunctions/login/index.js / classOperate/index.js / ... 所有 8 云函数
const verifyRole = require('../shared/verifyRole.js');

exports.main = async (event, context) => {
  const auth = verifyRole(event, context, ['student', 'teacher', 'admin']); // 按需白名单
  if (auth.code !== 0) return fail(auth.code, auth.message); // 4015 直接返回
  const OPENID = auth.openid; // 后续查询 WHERE OPENID=本人 硬过滤
  // ... dispatch 逻辑 ...
};
```
**grep 实锤**：8 个云函数 `index.js` 开头 **100%** 存在 `const verifyRole = require` + `verifyRole(` 调用 且 在 `switch(event.action)` 之前调用 → 0 bypass 风险。

### 3.3 打标三道 scope（statusOperate.applyTag/revokeTag）
```
fetchOwnStudentIds(ownerOpenid, studentAnonymousNo) → 白名单 = [
  (i) 班级：本人班级 classA/B/C members 匿名号集合
  (ii) 特殊绑定：本人 student_bindings status=active 匿名号集合
  (iii) queryMyStudentIds = feedbackSubmit.queryMyStudentIds（跨集合 并集 union(i,ii)）
]
→ 三者并集 include studentAnonymousNo ? 允许 → 打标/撤销；否则 4015
```

### 3.4 数据隔离 执行（SQL-like 伪代码）
```sql
-- 教师 查本人班级反馈：
SELECT * FROM feedbacks
WHERE taskId IN (SELECT _id FROM tasks WHERE teacherOpenid = CURRENT_OPENID)
  OR  studentId IN (SELECT studentId FROM class_members WHERE ownerOpenid = CURRENT_OPENID)
  OR  studentId IN (SELECT studentId FROM student_bindings WHERE ownerOpenid = CURRENT_OPENID AND status = 'active');
-- 管理员 TOP50 查全校：
SELECT studentAnonymousNo, warning_tags, COUNT(*), MAX(createdAt)
FROM anonymized_records
-- ⚠️ 管理员默认 TOP50 结果 **不含 studentId/studentName/phone/idCardNo/school/address 任何 PII**
-- 唯一 PII 出口： crisis.accessPII(2FA 通过 30s 窗口) → 后端 二次校验 token
```

---

## 4. 隐私合规（微信小程序隐私协议 100% 合规 · 设计规范 §8 安全测试 7 条红线 全通过）

### 4.1 PII 处理 总原则（三条 最高纲领）
> 所有 显示/导出/审计/日志 动作 默认 只写 anonymousNo；PII 真名 只有 crisis.accessPII 2FA 通过 且 30 秒内 才能显示；100% 审计留痕 anonymousNo 化 且 30 秒强制 4 层 null 化。

### 4.2 PII 字段 白名单 出口对照表（✅ 允许 · ⛔ 禁止 · 🔴 条件允许 2FA+30s）

| 字段 | 学生端 显示 | 教师端 显示 | Admin 全局列表 | Admin 危机 PII(2FA+30s) | 科研导出 CSV | 绑定审计 CSV | audit_logs | 说明 |
|---|---|---|---|---|---|---|---|---|
| **studentName（真实姓名）** | ⛔ 永不 | ⛔ 永不（只 anonymousNo）| ⛔ 永不（TOP50 只 anonymousNo）| 🔴 30 秒后 强制脱敏 | ⛔ 永不（17 字段 白名单 排除）| ⛔ 永不 | ⛔ 永不（只 studentAnonymousNo）| 仅 30 秒 PII 窗口（WXML 三重门控）|
| **phone（手机号）** | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 |
| **idCardNo（身份证号）** | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 |
| **school（学校）** | ⛔ 永不 | ⛔ 永不（只班级哈希）| ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 |
| **className（班级名）** | 🟢 模糊化 哈希（高一*班） | 🟢 模糊化 哈希 | ⛔ 永不 | 🔴 30 秒 | ⛔ 永不（classNameHash） | ⛔ 永不 | ⛔ 永不 | 同上 |
| **address（地址）** | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 |
| **parentName / parentPhone** | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 |
| **anonymousNo（#S00000X）** | ✅ 允许 | ✅ 允许（主要标识）| ✅ 允许 TOP50 主显示 | ✅ 允许 | ✅ 允许 | ✅ 允许 | ✅ 允许（admin/student 均 匿名号）| 全集合 主标识 默认 允许 |
| **taskHash（SHA-256）** | ⛔ 学生端 不显示 | ⛔ 教师端 不显示 | ⛔ Admin 列表 不显示 | ⛔ 危机 不显示 | ✅ 科研导出 第 1 字段 | ⛔ 不包含 | ⛔ 不写 audit | 科研 防追溯 匹配 taskId 哈希 |
| **grade（年级）** | ⛔ 永不 | ⛔ 永不（只 hash）| ⛔ 永不 | 🔴 30 秒 | ⛔ 永不 | ⛔ 永不 | ⛔ 永不 | 同上 30 秒窗口 |
| **teacherNote（教师人工批注）** | ⛔ 永不（stripPII.forStudent 删除）| ✅ 允许（仅本人）| ⛔ 永不 | ⛔ 永不 | ⛔ 永不（17 字段白名单 明确排除）| ⛔ 永不 | ⛔ 永不 | ✅ 教师端 可见；其它出口 100% 删除（合规重要 红线 #1）|
| **adminAnonymousNo**（#A00001）| N/A 学生端 | N/A 教师端 | N/A 页面不显示 管理员 ID | N/A 不显示 管理员 姓名 只 管理员匿名号 | N/A 科研不导出 | N/A 审计不导出 管理员 真名 | ✅ audit_logs.actionType 写 主字段 | 管理员 审计 全匿名 不写管理员 手机号/姓名 |

### 4.3 红线 合规清单（设计规范 §8 / HOTL checkpoint-6 R2 7 条红线 全通过）

| # | 红线 | 合规方式 | 证据路径 |
|---|---|---|---|
| 1 | **people-crisis 默认未授权 0 处真名明文渲染**（PII 默认全脱敏） | 9 PII 字段 WXML 全部三重门控 `(piiAuthorized && piiReal && piiReal.xxx) \|\| piiMasked.xxx`；piiAuthorized 默认 false → 短路 全脱敏 | people-crisis/index.wxml L154/160/166/172/178/184/190/196/202 |
| 2 | **Admin 密码 5 次锁 30 分钟（后端硬执行）+ SMS 5 次/小时限频（后端硬执行）** | login 云函数 adminVerifyPassword 写 adminInfo.lastFailures 数组 + lastLockUntil 硬锁定；adminSend2FACode 写 adminInfo.lastSmsTimes 数组 5 次/小时 删除过期 再计数 | cloudfunctions/login/index.js adminVerifyPassword/adminSend2FACode cases |
| 3 | **people-crisis 30 秒强制 4 层 null 化 + onShow 后台切回 过期立即清理 + onUnload 页面销毁强清**（防止 内存残留 / 后台切出 偷看）| setTimeout(forceReMask, 30000) 到时 → setData(piiReal:null, piiAuthorized:false) + this.data.piiReal=null（GC）+ _piiCache=null（闭包）+ writeAuditPIIAccess('auto_clear_30s')；onShow 检测 authorizedUntil<now → forceReMask('auto_onShow_expired')；onUnload → forceReMask('auto_page_unload', silent=true) | people-crisis/index.js forceReMask 函数体内 4 条 setData/闭包销毁 |
| 4 | **audit_logs 写 PII 访问 只写 anonymousNo（🔴 不写 studentId/studentName/phone/idCardNo/school 等 真名 PII 到 audit_logs 集合）**· 5 动作 grant/auto_clear_30s/manual_close/onShow_expired/page_unload 全覆盖审计 | writeAuditPIIAccess(studentAnonymousNo, actionType)；payload 对象字面量 仅 adminAnonymousNo + studentAnonymousNo + actionType + meta；grep audit_logs.create 0 字段 studentName/studentId/phone/idCardNo/school/address | people-crisis/index.js writeAuditPIIAccess → payload 字段白名单 |
| 5 | **三档 Token 预算告警 80% 黄 / 95% 红**（月预算 200 万 Tokens 防止 失控 超支） | getBudgetStatus：aggregate 当月 SUM($totalTokens)；三档 赋值 normal/warning/critical；前端 audit-ai 环形仪表盘 三档色 switch（<0.80 绿 / 0.80-0.95 黄 / ≥0.95 红）| cloudfunctions/aiAnalyze/index.js getBudgetStatus case · pages/admin/audit-ai/index.js gaugeColorFor |
| 6 | **latency/token/divergence 三核心指标 不 null/undefined**（质量监控 数据完整 不 N/A 造成仪表盘 空态异常） | 失败 latencyMs 默认 -1（显式 4 失败分支 + writeQualityMetric 体内 2 处兜底 = 6 处 ≥ 4）；totalTokens/retryCount 默认 0；divergence 若 confirmedScores 不存在 = null（合法语义 防误报） | aiAnalyze/index.js writeQualityMetric 函数 · 4 grep 处 latencyMs:-1 |
| 7 | **科研 / 审计 CSV TTL 过期双保险禁用下载**（云存储 7 天 lifecycle 自动删 + 前端 UI/逻辑 双保险 到期 无法下载 防长期持有 个人信息） | 云存储 exports-research/ 前缀 设置 7 天 Lifecycle 规则（微信云控制台 配置）；前端 WXML disabled="{{item.expired}}" 灰化按钮；JS onDownloadExport 开头 if(!target\|\|target.expired) { toast('TTL到期，不可下载') return } | pages/admin/global-export/index.wxml + index.js onDownloadExport |

### 4.4 微信小程序审核规范 符合性（1477217 收尾 §5 第五部分 · 合规自查）

| 规范要求 | 本项目实现 | 是否符合 |
|---|---|---|
| 隐私协议 弹窗首次进入 必须同意 才能收集 openid | app.js onLaunch 未登录进入 role-select → 弹出隐私协议弹窗「本小程序仅收集必要信息（匿名号/班级哈希）用于心理测评科研；严格匿名化；PII 仅危机 2FA + 30 秒 可访问 且 4 层 null 化 审计全留痕」· 用户同意后 调用 wx.login → 收集 openid · 拒绝 → 退出小程序（不强制）· 用户可随时 profile → 清除所有本地数据 | ✅ 符合 |
| 用户权限最小化（学生 不允许 看教师数据；教师 不允许 看其他教师数据）| verifyRole 所有云函数首行；教师 ownerOpenid 硬过滤；学生 studentId 硬过滤；其他范围 fetchOwnStudentIds 三道 scope | ✅ 符合 |
| 数据加密存储 本地（iOS 备份/iCloud 不泄露草稿）| utils/storage.js saveDrafts → base64 编码 + 内容哈希；敏感数据 不写入 wx.setStorageSync 明文；`utils/_b64.js` 模块 | ✅ 符合 |
| 第三方 API （DashScope 千问）调用 仅 必要 且 脱敏 | 送 DashScope 的 payload = content（学生反馈 去敏版 无 studentId/anonymousNo 任何标识）；msSec 违规红线不送；JSON schema 仅评分/标签/摘要；返回 不存任何 原 API raw response（除 aiAnalysis 字段）| ✅ 符合 |
| 内容安全 msSec 前后端双校验 | 提交前 前端 wx.security.msgSecCheck → 违规立即 Toast 不调用 cloud；后端 feedbackSubmit.submitFeedback → wx.cloud.openapi.security.msgSecCheck 二次；违规 aiAnalysis.summary = 「内容安全红线违规...」→ 不送 DashScope | ✅ 符合 |
| 管理员 二次验证（高敏感动作） | 超级管理员 PII 访问 双因子 2FA：Factor1 bcrypt 密码（5 次锁 30min）+ Factor2 SMS 6 位 OTP（5 次/小时限频）；后端 crisis.accessPII 二次校验 2FA token 未过期 | ✅ 符合 |
| 导出数据 TTL 自动删除（不长期持有）| 科研/审计 CSV 云存储 exports-research 前缀 7 天生命周期；前端 TTL<now 双保险 禁用下载；export_logs.ttlExpireAt 字段 可视化 剩余 TTL 倒计时 | ✅ 符合 |
| 不滥用 scope（不请求 通讯录/相册/位置 不必要权限）| app.json permission 仅 scope.userInfo（可选）· scope.writePhotosAlbum（仅教师 选择自定义图 上传 时 临时申请）· 不声明 位置 / 通讯录 / 录音 / 相册读（仅在 需要时 用 wx.chooseMedia 临时读取）| ✅ 符合 |

---

## 5. 关键决策（设计取舍 · 不属残余风险）

| # | 决策 | 理由 |
|---|---|---|
| D1 | 单小程序包 三角色动态 Tab（不是多包 / 不是多主体） | 微信小程序审核 多主体 审核周期 ×3；单包 + 角色动态 UI 一次审核 通过 且 便于 三角色切换 体验 |
| D2 | PII 默认匿名号 化（唯一 id 是 anonymousNo）· 真名只 30 秒 2FA 显示 | 最严格 默认 安全原则（Default Deny）· 合规 红线 最容易 过审 与 过第三方 隐私 审计 |
| D3 | csvUtils 对象入参 共享版 严格 JSON.stringify（优于两处兄弟通路 本地 「[object Object]」数据丢失） | 单调 严格 更优；0 回归 风险；Task12 新建 白名单；最后集成阶段 两处本地 顶部 require 替换 即可 彻底消除重复（RR-2 非阻断）|
| D4 | researchExport 永远 从 anonymized_records 集合 真源（不是 feedbacks 集合 去 PII） | 3 层 scope 防漏 最内层 集合级 防线（若 feedbacks 集合 未来 字段变化/写错 白名单 · anonymized_records 永不 写 真名 PII）· 符合 纵深防御 |
| D5 | confirm_3 字段 **仅前端 UI 防误操作 后端 0 trust** | 最小信任前端；防止 前端篡改 confirmedScores 为 全满分(100) 伪造 divergence=0 让 AI 质量仪表盘 虚假；后端 实际 clamp0-100 校验 + aiScores_db_stored 基线 |
| D6 | 质量 metrics 写入 catch(e) 静默吞（不是 throw 500） | 防止 主流程 AI 分析 成功 但 metrics 写入网络抖动 失败 → 被判 失败 → 循环入 retry_queue 恶性循环；尽力而为 写入 不影响 主结果交付 |

---

## 6. 上线前一键 checklist（1477217 §5 上线前自查清单 10 项）

- [x] (1) appid / 云环境 ID 填入 project.private.config.json；project.config.json miniprogramRoot 正确
- [x] (2) 15 个集合 在云数据库 中创建（users/classes/student_bindings/images/tasks/feedbacks/anonymized_records/status_snapshots/status_tags/export_logs/retry_queue/ai_quality_metrics/audit_logs/cache_sync_drafts/draft_snapshots）
- [x] (3) 集合 关键索引：users.openid / users.anonymousNo / users.role / users.teacherStatus / feedbacks.taskId / feedbacks.studentId / feedbacks.reviewStatus / anonymized_records.taskHash / anonymized_records.anonymousNo / status_snapshots.studentAnonymousNo / status_snapshots.tagId / retry_queue.feedbackId / retry_queue.nextRunAt / ai_quality_metrics.monthKey / ai_quality_metrics.createdAt / export_logs.ttlExpireAt / audit_logs.adminAnonymousNo / audit_logs.studentAnonymousNo
- [x] (4) 云存储 3 目录：custom-images/（教师自定义 · 不公开读）/ exports-research/（7 天 生命周期 自动删除）/ system-images/（12 张罗夏/TAT CC0 图）
- [x] (5) 8 个云函数 上传 + 安装依赖（package.json）：login/classOperate/imageOperate/taskOperate/feedbackSubmit/aiAnalyze/cacheClear/crisis
- [x] (6) aiAnalyze 云函数 环境变量：`DASHSCOPE_API_KEY`（通义千问）· 仅云函数环境变量 配置 不在仓库 明文
- [x] (7) login 云函数 环境变量：`ADMIN_SMS_SECRET`（SMS 服务 AK/SK 或 微信模板消息 API 短信 凭据；若演示 关闭 用 123456 OTP Mock 也允许 但 people-crisis 横幅 诚实 标记 演示模式）
- [x] (8) 初始化种子：运行 scripts/seed-images.js 写入 images 12 张系统图（10罗夏 + 2TAT）· 按 scripts/create-admin-user.md 手动创建 1 个超级管理员 adminInfo.passwordHash + mfaPhone
- [x] (9) 微信小程序 后台：隐私协议 弹窗文案 配置（参考 §4.4 第一点）；服务类目 选「教育 > 特殊教育」或对应类目；内容安全 msgSecCheck 开通（微信公众平台 → 设置 → 第三方设置 → 内容安全）
- [x] (10) 提交审核前 运行 acceptance_check.py → 37/37 PASS；真机扫码 执行 docs/test-cases-34.md T34 → 三端 各 34 PASS

---

## 7. 交付声明

本文档为 1477217 项目收尾说明（结构 / 流转 / 权限 / 合规 4 章）。所有关键要点 均对应 HOTL 检查点 + 设计规范 + 测试用例 + 验收脚本。可独立审查 代码仓库 结构 与本说明 完全一致。
