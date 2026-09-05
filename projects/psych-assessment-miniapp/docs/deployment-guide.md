# 心理测评反馈小程序 · 云函数上传与真机测试操作指南

> 本文档面向运维工程师与测试工程师，涵盖从项目导入到真机验收的完整部署流程。
> 项目路径：`projects/psych-assessment-miniapp/`
> 技术栈：微信小程序原生 + 微信云开发（CloudBase）+ Node.js 云函数

---

## 目录

1. [前置准备](#1-前置准备)
2. [项目导入与环境配置](#2-项目导入与环境配置)
3. [云函数依赖安装](#3-云函数依赖安装)
4. [云函数上传部署](#4-云函数上传部署)
5. [云数据库集合创建](#5-云数据库集合创建)
6. [云存储与环境变量](#6-云存储与环境变量)
7. [系统图片种子初始化](#7-系统图片种子初始化)
8. [管理员账号创建](#8-管理员账号创建)
9. [真机冒烟测试](#9-真机冒烟测试)
10. [34 条验收测试执行](#10-34-条验收测试执行)
11. [常见问题排查](#11-常见问题排查)

---

## 1. 前置准备

### 1.1 工具与账号

| 资源 | 要求 | 获取方式 |
|---|---|---|
| 微信开发者工具 | 稳定版 ≥ 1.06.2307 | https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html |
| 小程序 AppID | 已认证的企业/组织账号 | 微信公众平台 → 开发 → 开发管理 → 开发设置 |
| 云开发环境 | 按量计费（推荐）或包年包月 | 微信开发者工具内开通，获取环境 ID（形如 `cloud1-xxx`） |
| Node.js | ≥ 16 | https://nodejs.org |
| 测试手机 | 安卓 / iOS / 鸿蒙各一台 | 微信已登录 |

### 1.2 环境变量清单

部署前需准备以下密钥，在云开发控制台为对应云函数配置：

| 变量名 | 所属云函数 | 用途 | 获取方式 |
|---|---|---|---|
| `DASHSCOPE_KEY` | aiAnalyze | 千问 qwen-plus API 调用 | 阿里云百炼平台创建 API Key |
| `DASHSCOPE_MODEL` | aiAnalyze | AI 模型名（默认 `qwen-plus`） | 阿里云百炼控制台 |

> **安全提醒**：DASHSCOPE_KEY 属于机密，切勿写入代码仓库。仅在云开发控制台的云函数环境变量中配置。

---

## 2. 项目导入与环境配置

### 2.1 导入项目

1. 打开微信开发者工具 → **导入项目**。
2. 项目目录选择：`g:\mental health\projects\psych-assessment-miniapp`
3. AppID 填入你的真实小程序 AppID。
4. 点击 **导入**。

### 2.2 配置云开发环境

1. 点击工具栏 **云开发** 按钮，开通云开发（如未开通）。
2. 记录云环境 ID。
3. 在项目根目录 `project.private.config.json` 中追加云环境配置：

```json
{
  "description": "项目私有配置文件",
  "projectname": "mental-health-feedback",
  "setting": {
    "compileHotReLoad": false,
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true
  },
  "cloudfunctionRoot": "cloudfunctions/",
  "cloud": {
    "env": "你的云环境ID"
  }
}
```

> ⚠️ `project.private.config.json` 不会上传到 Git 仓库（已在 `.gitignore` 中），仅在本地生效。

### 2.3 关联云函数与环境

在微信开发者工具的 **云开发** 面板中：

1. 点击 **设置** → **环境设置**。
2. 确认当前环境为目标环境。
3. 在左侧文件树中，`cloudfunctions/` 文件夹应显示为 **云开发图标**（云朵标记），表示已正确识别云函数根目录。

---

## 3. 云函数依赖安装

本项目共有 **9 个云函数**，需逐个安装依赖。所有云函数均依赖 `wx-server-sdk`，其中 `login` 额外依赖 `bcryptjs`。

### 3.1 批量安装依赖（推荐）

在项目根目录打开终端，执行以下 PowerShell 脚本批量安装所有云函数的依赖：

```powershell
Set-Location "g:\mental health\projects\psych-assessment-miniapp\cloudfunctions"

$funcs = @("login", "taskOperate", "feedbackSubmit", "aiAnalyze", "crisis", "classOperate", "imageOperate", "statusOperate", "cacheClear", "_utils")

foreach ($f in $funcs) {
    Write-Host "Installing deps for $f ..."
    Set-Location $f
    npm install --production
    Set-Location ".."
}
```

> 注意：`_utils` 是内部工具函数（定时清理入口），也需上传部署。

### 3.2 单函数安装（备用）

若批量安装失败，可逐个安装：

```powershell
# login 云函数（含 bcryptjs）
Set-Location "g:\mental health\projects\psych-assessment-miniapp\cloudfunctions\login"
npm install --save bcryptjs@2.4.3 wx-server-sdk@latest

# 其他云函数（仅需 wx-server-sdk）
Set-Location "..\taskOperate"
npm install --save wx-server-sdk@latest
```

### 3.3 验证安装

```powershell
# 检查每个云函数目录下是否生成了 node_modules
Get-ChildItem "g:\mental health\projects\psych-assessment-miniapp\cloudfunctions" -Directory |
    ForEach-Object { $hasNM = Test-Path "$($_.FullName)\node_modules"; Write-Host "$($_.Name): node_modules = $hasNM" }
```

预期输出：9 个云函数目录均显示 `node_modules = True`。

---

## 4. 云函数上传部署

### 4.1 逐个上传（推荐）

在微信开发者工具中：

1. 展开左侧文件树 `cloudfunctions/` 目录。
2. 右键点击第一个云函数（如 `login`）→ **上传并部署：云端安装依赖**。
3. 等待上传完成，弹出提示 **上传成功**。
4. 依次对所有 9 个云函数重复操作：

| 云函数 | 说明 | 超时设置 |
|---|---|---|
| `login` | 登录、角色、管理员双因子认证 | 10s |
| `taskOperate` | 任务创建/查询/更新 | 10s |
| `feedbackSubmit` | 反馈提交、三写原子提交、msSecCheck | 10s |
| `aiAnalyze` | DashScope AI 分析（含重试） | **30s** |
| `crisis` | 危机干预、PII 访问二次 2FA | 10s |
| `classOperate` | 班级管理 | 10s |
| `imageOperate` | 图片库操作 | 10s |
| `statusOperate` | 状态标签管理 | 10s |
| `cacheClear` | 草稿/缓存 30 天 TTL 清理 | 10s |
| `_utils` | 定时清理入口（内部） | 10s |

> ⚠️ `aiAnalyze` 涉及外部 API 调用与重试，**必须将超时设为 30 秒**，否则 AI 分析会因超时而失败。

### 4.2 配置 aiAnalyze 超时

1. 打开 **云开发** 控制台 → **云函数** → 找到 `aiAnalyze`。
2. 点击 **配置** → 将 **超时时间** 改为 **30 秒**。
3. 保存。

### 4.3 验证部署

在云开发控制台 → **云函数** 列表中，确认所有 9 个云函数状态为 **已部署**，且 `aiAnalyze` 的超时为 30s。

### 4.4 云端测试 login 函数

1. 在云函数列表点击 `login` → **云端测试**。
2. 输入测试参数：

```json
{
  "action": "jscode2session",
  "code": "test_code"
}
```

3. 点击 **运行测试**，预期返回：
   - 若 code 为测试值，返回错误码（如 `4001`）属正常现象。
   - 关键是确认云函数能正常启动，无模块找不到错误（`Cannot find module`）。

---

## 5. 云数据库集合创建

### 5.1 需创建的集合

在 **云开发控制台 → 云数据库** 中，创建以下集合（集合名严格区分大小写）：

| 集合名 | 用途 | 权限设置 |
|---|---|---|
| `users` | 用户表（三角色） | 仅创建者可读写 |
| `tasks` | 测评任务 | 仅创建者可读写 |
| `feedbacks` | 反馈记录 | 仅创建者可读写 |
| `anonymized_records` | 脱敏科研记录 | 仅管理员可写 |
| `status_snapshots` | 状态快照 | 仅创建者可读写 |
| `images` | 系统图片库 | 所有用户可读 |
| `audit_logs` | 审计日志 | 仅管理员可读写 |
| `cache_sync_drafts` | 草稿缓存 | 仅创建者可读写 |
| `retry_queue` | 重试队列 | 仅管理员可读写 |
| `ai_quality_metrics` | AI 质量指标 | 仅管理员可读写 |
| `classes` | 班级信息 | 仅创建者可读写 |
| `rate_limits` | 限频计数（可选） | 仅管理员可读写 |

### 5.2 创建步骤

1. 云开发控制台 → **云数据库** → **+ 新建集合**。
2. 输入集合名（如 `users`）→ 点击 **确定**。
3. 在集合列表中点击该集合 → **权限设置** → 按上表配置权限。
4. 重复创建所有 12 个集合。

### 5.3 关键索引（可选但推荐）

为常用查询字段添加索引，提升查询性能：

| 集合 | 字段 | 索引类型 |
|---|---|---|
| `users` | `openid` | 唯一索引 |
| `users` | `role` | 普通索引 |
| `users` | `anonymousNo` | 唯一索引 |
| `tasks` | `deadline` | 普通索引（降序） |
| `feedbacks` | `studentId` | 普通索引 |
| `feedbacks` | `taskId` | 普通索引 |
| `anonymized_records` | `anonymousNo` | 普通索引 |
| `audit_logs` | `anonymousNo` | 普通索引 |
| `audit_logs` | `createTime` | 普通索引（降序） |

---

## 6. 云存储与环境变量

### 6.1 云存储目录

在 **云开发控制台 → 存储** 中，创建以下目录结构：

```
psych-assessment/
├── rorschach/      # 罗夏卡片图片
├── tat/            # TAT 卡片图片
└── avatars/        # 用户头像（可选）
```

### 6.2 云函数环境变量

为 `aiAnalyze` 云函数配置 DashScope API Key：

1. 云开发控制台 → **云函数** → 点击 `aiAnalyze`。
2. 点击 **配置** → **环境变量**。
3. 添加：

| 变量名 | 值 |
|---|---|
| `DASHSCOPE_KEY` | sk-xxxxxxxxxxxx（你的 DashScope API Key） |
| `DASHSCOPE_MODEL` | qwen-plus |

4. 点击 **保存**。

> 环境变量修改后云函数会自动重新部署，约 1-2 分钟生效。

---

## 7. 系统图片种子初始化

### 7.1 生成种子数据

在本地终端执行种子脚本，生成 12 张系统图片的元数据 JSON：

```powershell
Set-Location "g:\mental health\projects\psych-assessment-miniapp"
node scripts/seed-images.js
```

输出文件：`scripts/seed/seed_images_12.json`

### 7.2 导入到云数据库

1. 打开 **云开发控制台 → 云数据库 → `images` 集合**。
2. 点击 **导入** → 选择 `scripts/seed/seed_images_12.json` 文件。
3. 导入模式选择 **插入** → 点击 **导入**。
4. 确认 `images` 集合中有 12 条记录（6 罗夏 + 6 TAT）。

### 7.3 上传真实卡片图片

将罗夏和 TAT 卡片图片上传到云存储对应目录，然后更新 `images` 集合中每条记录的 `storageFileID` 字段为实际的云存储 FileID。

> 若暂不使用真实图片，前端会显示占位图，不影响功能测试。

---

## 8. 管理员账号创建

> 详细说明见 `scripts/create-admin-user.md`。以下为核心步骤。

### 8.1 生成 bcrypt 密码哈希

```powershell
Set-Location "g:\mental health\projects\psych-assessment-miniapp\cloudfunctions\login"
$env:ADMIN_PASSWORD_READ_FROM_ENV = '你的管理员密码'
node -e "const b=require('./node_modules/bcryptjs'); console.log(b.hashSync(process.env.ADMIN_PASSWORD_READ_FROM_ENV, 10))"
Remove-Item Env:ADMIN_PASSWORD_READ_FROM_ENV
```

复制输出的 `$2b$10$...` 哈希值。

### 8.2 在 users 集合插入管理员记录

1. 云开发控制台 → **云数据库 → `users` 集合 → 添加记录**。
2. 切换到 **JSON 视图**，粘贴以下模板并替换占位符：

```json
{
  "openid": "",
  "role": "admin",
  "anonymousNo": "#A01",
  "nickname": "超级管理员",
  "name": "",
  "avatarUrl": "",
  "phone": "管理员真实手机号",
  "loginExpireAt": 0,
  "teacherStatus": "approved",
  "studentInfo": null,
  "teacherInfo": null,
  "adminInfo": {
    "passwordHash": "$2b$10$粘贴上面生成的哈希",
    "mfaPhone": "管理员真实手机号",
    "role": "super",
    "createdBy": "initial_deployment",
    "lastPwChange": 1788606000000,
    "failedCount": 0,
    "loginLockedUntil": 0,
    "adminPwAuthTs": 0
  },
  "createTime": 1788606000000
}
```

> ⚠️ `anonymousNo` 必须全局唯一；`phone` 和 `adminInfo.mfaPhone` 必须填写真实手机号，用于接收 2FA 短信验证码。

### 8.3 绑定 openid（推荐）

1. 用管理员本人的微信扫码打开小程序，选择 **学生** 角色登录一次。
2. 在 `users` 集合中找到该 openid 对应的记录，复制 openid。
3. 回到管理员记录，将 `openid` 字段填入刚复制的值。
4. 此时管理员再次扫码登录，会直接进入管理员后台。

---

## 9. 真机冒烟测试

### 9.1 预览

1. 微信开发者工具 → 点击 **预览** 按钮（或 Ctrl+P）。
2. 用测试手机微信扫码打开小程序。

### 9.2 冒烟测试清单（必须全过）

| # | 操作 | 预期结果 | 通过标记 |
|---|---|---|---|
| 1 | 打开小程序 → 角色选择页 | 显示学生/教师两个角色卡片，无管理员入口 | ☐ |
| 2 | 学生角色登录 | 微信授权 → 进入任务大厅 | ☐ |
| 3 | 任务大厅 | 显示空状态或已发布任务列表 | ☐ |
| 4 | 切换到教师角色 | 提示教师待审核（首次） | ☐ |
| 5 | 管理员登录 | 输入密码 → 进入管理员后台 | ☐ |
| 6 | 管理员后台 → 全局导出 | 页面正常加载 | ☐ |
| 7 | 管理员后台 → 危机干预 | 显示匿名高危列表（空状态正常） | ☐ |
| 8 | 管理员后台 → AI 审计 | 显示仪表盘 | ☐ |
| 9 | 学生 → 我的 → 退出登录 | 清除 session，返回角色选择页 | ☐ |
| 10 | 退出后 30 天内重新打开 | 自动跳过角色选择，直接进入上次角色 | ☐ |

### 9.3 冒烟失败排查

- **云函数调用失败（-501007）**：云函数未部署或环境 ID 配置错误。
- **数据库权限错误**：集合权限未按 §5.1 配置。
- **管理员登录无反应**：检查 `users` 集合中 admin 记录的 `openid` 是否与当前微信匹配。
- **AI 分析无返回**：检查 `aiAnalyze` 云函数的 `DASHSCOPE_KEY` 环境变量是否配置。

---

## 10. 34 条验收测试执行

### 10.1 测试用例分布

完整用例见 `docs/test-cases-34.md`，共 34 条：

| 分类 | 数量 | P0 | P1 |
|---|---|---|---|
| S 学生端 | 11 | 8 | 3 |
| T 教师端 | 10 | 6 | 4 |
| A 管理员端 | 10 | 8 | 2 |
| P 跨端 | 3 | 3 | 0 |
| **合计** | **34** | **25** | **9** |

### 10.2 执行方式

**方式 A：真机手动测试（三端各一次）**

1. 安卓手机扫码 → 按 `docs/test-cases-34.md` 逐条执行 34 条用例。
2. iOS 手机扫码 → 重复 34 条。
3. 鸿蒙手机扫码 → 重复 34 条。

**方式 B：源码结构自动验收（辅助）**

```powershell
Set-Location "g:\mental health\projects\psych-assessment-miniapp"
python acceptance_check.py
```

该脚本执行 37 项源码级断言，覆盖 P0/P1 用例的核心逻辑。

### 10.3 关键 P0 用例速查

| 用例 | 核心验证点 |
|---|---|
| S3/S5 | msSecCheck 红线拦截，违规内容不调用 DashScope |
| S4 | 三写原子提交（feedbacks + anonymized_records + status_snapshots） |
| S7 | 学生端看不到教师批注（teacherNote 被 stripPII 过滤） |
| S9/S10 | 草稿 30 秒自动保存 + 30 天过期四闸清理 |
| T3/T7 | 教师人工批注写入 + 审计留痕 |
| A4 | 管理员导出科研数据 7 天自动删除 |
| A7 | PII 访问后端二次 2FA 校验，30 秒实名窗口 |
| A8 | audit_logs 全 anonymousNo 化，0 PII 字段 |
| P1-P3 | 跨端安全区域适配 + 鸿蒙检测 |

### 10.4 验收通过标准

- 34 条用例在安卓、iOS、鸿蒙三端全部 PASS（共 102 次执行）。
- `acceptance_check.py` 输出 `37/37 PASS`。
- 审计日志 `audit_logs` 集合中无任何 PII 字段（name/phone/idCardNo 等）。

---

## 11. 常见问题排查

### 11.1 云函数相关

| 现象 | 原因 | 解决 |
|---|---|---|
| `Error: Cannot find module 'wx-server-sdk'` | 未执行 `npm install` 或上传时未选「云端安装依赖」 | 重新上传并选择「上传并部署：云端安装依赖」 |
| `Error: Cannot find module 'bcryptjs'` | login 云函数未安装 bcryptjs | 在 `cloudfunctions/login/` 下执行 `npm install bcryptjs@2.4.3` |
| 云函数超时（-501005） | aiAnalyze 超时设置不足 | 将 aiAnalyze 超时改为 30s |
| DashScope 调用 401 | API Key 未配置或错误 | 检查 aiAnalyze 云函数环境变量 `DASHSCOPE_KEY` |
| 短信验证码不发送 | mfaPhone 未配置 | 在 users 集合中填写 `phone` 和 `adminInfo.mfaPhone` |

### 11.2 数据库相关

| 现象 | 原因 | 解决 |
|---|---|---|
| `permission denied` | 集合权限配置错误 | 按 §5.1 重新设置集合权限 |
| 匿名编号重复 | anonymousNo 未设唯一索引 | 为 `users.anonymousNo` 创建唯一索引 |
| 查询返回空 | 集合不存在或数据未导入 | 确认集合已创建，种子数据已导入 |

### 11.3 前端相关

| 现象 | 原因 | 解决 |
|---|---|---|
| 打开白屏 | app.json 页面路径错误或云环境未配置 | 检查 app.json 中 pages 数组，确认云环境 ID |
| 角色选择页无管理员入口 | 正常设计（管理员通过 openid 自动识别） | 绑定 admin openid 后扫码自动进入 |
| 鸿蒙安全区域异常 | platform.js 未正确识别 | 检查 `utils/platform.js` 中鸿蒙检测逻辑 |
| 改昵称提示演示模式 | users 集合权限或 nickname 云函数未部署 | 确认 login 云函数已部署，users 权限正确 |

### 11.4 安全合规相关

| 现象 | 原因 | 解决 |
|---|---|---|
| 学生端看到教师批注 | stripPII 未生效或前端绑定了 teacherNote | 检查 `pages/student/` 下 wxml 是否有 teacherNote 绑定 |
| audit_logs 含 PII | 审计日志写入未脱敏 | 检查 `cloudfunctions/shared/stripPII.js` 是否正确应用 |
| 管理员 PII 访问无 2FA | crisis 云函数未部署或 piiGate 逻辑被绕过 | 确认 crisis 云函数已部署，检查 accessPII 分支 |

---

## 附录 A：部署检查清单

部署完成后，逐项确认：

- [ ] 9 个云函数已上传部署
- [ ] aiAnalyze 超时设为 30s
- [ ] aiAnalyze 环境变量 DASHSCOPE_KEY 已配置
- [ ] 12 个数据库集合已创建
- [ ] 集合权限已按规范配置
- [ ] images 集合已导入 12 条种子数据
- [ ] 管理员账号已创建并绑定 openid
- [ ] 冒烟测试 10 项全通过
- [ ] acceptance_check.py 37/37 PASS

## 附录 B：相关文档

- 完整测试用例：`docs/test-cases-34.md`
- 管理员账号创建：`scripts/create-admin-user.md`
- 项目概述：`docs/project-overview.md`