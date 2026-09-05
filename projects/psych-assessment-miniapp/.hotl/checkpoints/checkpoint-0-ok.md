# 检查点 1 ✅ · Task0 脚手架通过 Controller 两轮 Review

## 当前项目初始化状态摘要

### 🗂️ 产物清单（28 文件 / 826 行）
| 分组 | 数量 | 关键文件 |
|---|---:|---|
| 根配置 | 5 | [project.config.json](file:///g:/mental%20health/project.config.json) / app.json / app.js / app.wxss / .gitignore / sitemap.json |
| 云函数共享模块 | 6 | verifyRole / stripPII / dashscopeClient / responseWrapper / collectionNames（15集合常量）/ wx-server-sdk 本地降级 stub |
| 前端 utils | 8 | auth(双会话) / storage(双存储+Base64加密备份) / cloud(4011→forceRelogin 自动) / platform(安卓/iOS/鸿蒙/纯血鸿蒙) / _b64 / pii & anonymize & csv(最小空壳) |
| 自定义 TabBar(三角色) | 4 | student 3Tab / teacher 4Tab / **admin 4Tab(方案B)**（运营总览/全局出口/人危审批/审计AI emoji 占位图标） |
| 组件壳 | 4 | admin-2fa(密码+短信弹层最小壳) |

### 🔬 自检命令真实输出（12 / 12 ✅ 0 FAIL）
```
OK ./utils/auth.js
OK ./utils/storage.js
OK ./utils/cloud.js
OK ./utils/platform.js
OK ./utils/pii.js
OK ./utils/anonymize.js
OK ./utils/csv.js
OK ./cloudfunctions/shared/verifyRole.js
OK ./cloudfunctions/shared/stripPII.js
OK ./cloudfunctions/shared/dashscopeClient.js
OK ./cloudfunctions/shared/responseWrapper.js
OK ./cloudfunctions/shared/collectionNames.js
---Task0 modules loading done---
```

### 🔒 Controller 两轮 Review 结论（全部 ✅）

**Round1 Functional Correctness：**
- ✅ 所有路径/文件名 与 实施计划 File Structure 严格一致；
- ✅ app.json pages 数组 末尾已追加 4 admin 路由（ops-overview/global-export/people-crisis/audit-ai）；
- ✅ app.js `switchTabBarByRole` 支持 role='admin' 分支；
- ✅ custom-tab-bar `ADMIN_TABS` 4 Tab 正确；setRole/setSelectedByPage 方法齐全；
- ✅ collectionNames.js 15 集合 users/classes/bindings/images/tasks/feedbacks/anonymized_records/export_logs/status_snapshots/archive_logs/teacher_approvals/ai_quality_metrics/retry_queue/audit_logs 与设计 §3.2 完全一致；
- ✅ verifyRole.js / stripPII.js / dashscopeClient.js / cloud.call / auth 3 核心 语法 修正 8 处后 全 Node require 可加载。

**Round2 安全 + 隐私合规 + 匿名化白名单：**
- ✅ dashscopeClient: `process.env.DASHSCOPE_API_KEY` 只读环境变量，**无任何硬编码 Key / sk-xxx / Bearer 固定字符串**；
- ✅ stripPII `forSelf=false` 匿名模式：仅返回 `{_id, role, anonymousNo, gradeHash}`，**不返 name/nickname/phone/openid/teacherCert**；
- ✅ stripPII `forSelf=true`：主动 delete `out.openid` + delete `out.teacherInfo.teacherCertNo`；
- ✅ verifyRole：**完全不信任 event.role 入参**，一律查 `users.where({openid:ctx.OPENID})`，teacherStatus 强制 approved；loginExpireAt 过期抛 4011；
- ✅ storage.js：session 双写 `session` + `_secure_session_`（base64 encodeBackup），避免 iOS 文件管理器明文可见；**没有任何字段存管理员密码/PII**（admin 密码只在 bcrypt hash 存在 users.adminInfo.passwordHash）；
- ✅ WXSS composes 语法已改为显式赋值（避免微信编译器 WXSS 语义警告）。

### 📌 下一检查点（检查点2 · 3个任务完成后）
下一批派发 **批次 A 两任务并行（独立无共享文件）**：
- Task1 · 登录流（role-select页 / teacher-pending页 / login云函数分派 action=jscode2session/register/profile/teacherApprovalSubmit/adminVerifyPassword/adminSend2FACode/adminVerify2FACode + bcrypt + SMS 限频）；
- Task3 · 图片库预置（images 集合 + 12 张罗夏/TAT system 图 seed 脚本 + imageOperate 云函数(CRUD+上传校验路径权限) + teacher/img-library 页三段展示）。
  > 批次A通过 → 再派 Task2(班级) / Task5(反馈提交云函数)。

### 🚦 下一步你只需要回复一句：
- `"继续批次A"` → Controller 立即派发 Task1 + Task3 两子 agent 并行；
- 或 `"先只派 Task1"` / `"先只派 Task3"` → 串行发其中一个。
