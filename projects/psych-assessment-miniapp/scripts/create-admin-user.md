# 部署期手工建 admin 账号说明（给运维工程师）

> 目标：在 **微信云开发控制台** 的 `users` 集合中手工插入一条 `role='admin'` 的记录，作为超级管理员 / 危机管理员 / 科研管理员席位。
> 前端 **不提供** 任何管理员注册入口，防止社工攻击。

---

## ① 生成 bcrypt 密码哈希（Windows PowerShell 命令）

要求：`passwordHash` 字段是 **bcrypt cost=10**。本机已有 `bcryptjs@2.4.3`（在 `cloudfunctions/login/node_modules`）。

```powershell
# 第一步：确保 login 云函数依赖已安装（若已装可跳过）
Set-Location "g:\mental health\cloudfunctions\login"
if (-not (Test-Path "node_modules\bcryptjs")) {
  npm install --save bcryptjs@2.4.3 wx-server-sdk@latest
}

# 第二步：设置【环境变量】传入密码（绝不要把明文密码写在命令历史里！）
#   方案 A（推荐，生产）：提前在系统环境变量里设置 ADMIN_PASSWORD_READ_FROM_ENV
#   方案 B（本地临时）：$env:ADMIN_PASSWORD_READ_FROM_ENV = '你的强密码'
$env:ADMIN_PASSWORD_READ_FROM_ENV = 'ChangeMeToRealP@ssw0rd!'

Set-Location "g:\mental health"
node -e "const b=require('./cloudfunctions/login/node_modules/bcryptjs'); console.log('passwordHash=',b.hashSync(process.env.ADMIN_PASSWORD_READ_FROM_ENV || 'ChangeMeToRealP@ssw0rd!',10))"
```

执行后会输出类似：

```
passwordHash= $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

> ⚠️ 把 **整段 `$2b$10$...`** 复制备用。命令执行完毕后，清空 PowerShell 中的环境变量：
> ```powershell
> Remove-Item Env:ADMIN_PASSWORD_READ_FROM_ENV
> ```

---

## ② users 集合手工插入 JSON 模板

1. 打开 **微信开发者工具 / 云开发控制台 → 云数据库 → `users` 集合 → 添加记录**。
2. 选择 **JSON 视图**，粘贴以下模板，把 **6 处占位符**替换为真实值：

```json
{
  "openid": "建议：先以该管理员的微信号登录小程序一次（先选学生角色）→ 在 users 集合里把 openid 复制到这里 → 再把整条记录 role 改成 admin。防止手输错误。如暂未绑定 openid，留空字符串，jscode2session 首次登录会自动回填，但建议先登录再改以确保身份一致。",
  "role": "admin",
  "anonymousNo": "#A01",
  "nickname": "超级管理员A",
  "name": "",
  "avatarUrl": "",
  "phone": "管理员本人真实手机号（MFA 短信会发到此处）",
  "loginExpireAt": 0,
  "teacherStatus": "approved",
  "studentInfo": null,
  "teacherInfo": null,
  "adminInfo": {
    "passwordHash": "$2b$10$把步骤①生成的哈希粘贴到这里",
    "mfaPhone": "同上方 phone（或者另填更私密的危机干预号码）",
    "role": "super",
    "createdBy": "initial_deployment_script / 你的工号",
    "lastPwChange": 1788446700000,
    "failedCount": 0,
    "loginLockedUntil": 0,
    "adminPwAuthTs": 0
  },
  "createTime": 1788446700000
}
```

### 字段说明

| 字段 | 说明 |
| --- | --- |
| `anonymousNo` | 管理员匿名编号，`#A01` / `#A02` / ... 递增；**必须全局唯一**，建议在控制台里先 `count({role:'admin'})` 确认后再填。 |
| `adminInfo.role` | 三选一：`super`（全能）、`crisis`（仅危机干预+教师审批）、`research`（仅导出+监控）。|
| `adminInfo.lastPwChange` | **必须填 `Date.now()` 对应毫秒数**，否则首次登录会判定"从未改密"而强制立即改密（这其实也是合规的，但上线第一天体验不好）。 |
| `phone / mfaPhone` | 部署时必须填，否则 `adminSend2FACode` 动作会返回 `4006 管理员未配置 MFA 短信手机号`。|

> 如需批量再建 2、3 号管理员（crisis / research）：重复①② 两步，anonymousNo 换成 `#A02` / `#A03` 即可。

---

## ③ 忘记密码 / 重置密码

**规则：小程序前端不提供任何"找回密码"通道**。只允许运维在 **云数据库里改 `passwordHash`**。

步骤：

1. 按第 ① 步用新密码生成一段新的 bcrypt hash。
2. 云数据库 → `users` → 找到对应 admin 记录 → **只修改** `adminInfo.passwordHash` 字段，粘贴新 hash。
3. **同时把以下字段清零**（清除失败锁定 + 强制下一次登录走改密流程）：

```json
{
  "adminInfo.failedCount": 0,
  "adminInfo.loginLockedUntil": 0,
  "adminInfo.adminPwAuthTs": 0,
  "adminInfo.lastPwChange": 0
}
```

> `lastPwChange=0` 的效果：下次 admin 执行动作 5（`adminVerifyPassword`）通过后，会立即返回 `passwordChangeRequired=true`，前端必须强制弹改密对话框，调用动作 8 `adminChangePassword` 才能继续高敏感操作。

---

## ④ 90 天强制改密（云函数逻辑）

对应云函数 `cloudfunctions/login/index.js`：

- **动作 5 `adminVerifyPassword` 成功分支**：
  ```
  if (users.adminInfo.lastPwChange < now - 90*86400*1000 || lastPwChange === 0)
      → 返回 { passwordChangeRequired: true, msg:'密码已满90天，请立即修改' }
  ```

- **动作 8 `adminChangePassword`**：
  - 前置条件 1：动作 5 通过 **10 分钟内**（校验 `adminInfo.adminPwAuthTs`）。
  - 前置条件 2：`passwordChangeRequired` 判定为 true（否则 403 拒绝）。
  - 流程：`bcrypt.compare(oldPassword, hash)` 通过 →
    - `bcrypt.hash(newPassword, 10)` 生成新 hash 写回；
    - `adminInfo.lastPwChange = now`；
    - 写 `audit_logs.admin_password_changed`。

### 运维侧检查脚本（可选）

每月巡检一次"哪些管理员距上次改密已 > 75 天"，提前发内部邮件提醒：

```powershell
# 在微信云开发 CLI（或控制台）里执行 users 聚合：
#   db.users.aggregate().match({ role:'admin' })
#     .project({ anonymousNo:1, 'adminInfo.lastPwChange':1, 'adminInfo.role':1 })
```

---

## ⑤ 部署后首验（运维自测清单）

| # | 操作 | 预期 |
| - | --- | --- |
| 1 | 管理员微信号扫码打开小程序 → 角色选择页**没有**管理员按钮 | ✅ 前端无 admin 注册入口 |
| 2 | 若 users 已绑定 openid → `jscode2session` 返 `role='admin'` → 直接进 `pages/admin/ops-overview` | ✅ openid 绑定成功 |
| 3 | 触发管理员密码框 → 输对密码 → 动作5 返回 `ok` + `adminPwAuthTs` 更新 | ✅ bcrypt 校验通路 |
| 4 | 连输错 5 次密码 → 动作5 返回 `4039 管理员账户已锁定30分钟` | ✅ 防爆破 |
| 5 | 动作6 `adminSend2FACode` → 成功；1 小时内连点 5 次以上 → 第 6 次返回 `429 本小时短信验证码已达5次上限` | ✅ 短信限频 |
| 6 | 动作7 `adminVerify2FACode` 输入正确 6 位 → 返回 `verified:true, validUntil=now+5min` | ✅ 双因子通路 |
| 7 | `lastPwChange=0` 情况下动作5 通过 → 返回 `passwordChangeRequired:true`；动作8 改密成功；`audit_logs` 集合新增 3 条记录（verify_success / 2fa_sent / 2fa_verified / password_changed） | ✅ 90 天改密 + 审计全链路 |

---

## 附：常见错误排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 动作5 一直密码错误，但 hash 是对的 | openid 未绑定 → 查到了另一条 student 记录 | 先让 admin 本人微信登录一次，拿到正确 openid 再改 users 记录 |
| 动作6 返回 `4006 管理员未配置 MFA 短信手机号` | `users.phone` / `adminInfo.mfaPhone` 为空或长度 < 6 | 重新手工插入 JSON，两处手机号都填 |
| 动作6 限频不生效（云函数冷启动多实例） | `_smsCache` 是**进程内 Map**，多实例冷启动会分别计数 | 生产环境建议：把限频计数迁到 Redis 或 云数据库 `rate_limits` 集合 TTL（本版本为简化实现，注释已标记） |
| 动作8 `403 当前无需强制修改密码` 但我要测试强制改密流程 | 把 `adminInfo.lastPwChange` 改为 `0` 或 `now - 91*86400*1000` 即可复现 | |
