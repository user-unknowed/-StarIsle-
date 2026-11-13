# 星屿 StarIsle MVP 前端 · 接入说明

> 配套文档：[MVP 差距与改编映射](./mvp-gap-and-mapping.md)、[API 契约](./api-contract.md)
> 源码目录：`mvp-frontend/frontend/`　交付目录：`mvp-frontend/outputs/`

---

## 1. 交付物与目录结构

```
frontend/
├── index.html              唯一入口（三端共用）
├── manifest.webmanifest    PWA 清单
├── sw.js                    离线缓存（starisle-v1）
├── icon.svg                 图标
└── assets/
    ├── app.css              设计 token + 三形态布局（桌面侧栏 / 平板 rail / 手机 Tab）
    ├── md.js                自写 Markdown 渲染器，暴露 window.SIMD
    ├── api.js               API 适配层，暴露 window.StarIsleAPI（唯一切换点在此）
    └── app.js               状态机 + 路由 + 三端全部页面与交互
```

零第三方依赖、零 CDN、无构建步骤。`index.html` 直接双击即可运行（演示模式）。

---

## 2. 快速开始

### 2.1 演示模式（默认，不需要后端）

直接浏览器打开 `index.html`。落地页选择「学生 / 教师 / 家长」任一角色即可进入，数据由 `assets/api.js` 内置的演示库（`localStorage['starisle-demo-db']`）驱动，包含 8 名学生、3 条预警、1 条家长绑定。

### 2.2 挂静态服务

```bash
# 方式一：Python
python -m http.server 8100 -d mvp-frontend/frontend
# 方式二：Node（无需安装依赖）
npx --yes http-server mvp-frontend/frontend -p 8100
```

访问 `http://localhost:8100/`。用 `http://` 打开时可获得 PWA 能力（`manifest` + Service Worker 离线缓存）。

### 2.3 验收用测试账号（演示模式）

演示模式无账号密码，落地页的角色卡片就是登录入口；`assets/app.js` 中 `loginAs(role)` 是唯一的登录调用。

---

## 3. 切换到真实后端

**只改适配层，不改页面。** 三者任选其一：

### 方式 A：改常量（最简单）

`assets/api.js` 顶部（第 23–24 行）：

```js
var USE_MOCK = false;             // 由 true 改为 false
var BASE_URL = '/api';            // 真实后端前缀；同源反向代理时保持 '/api'
```

### 方式 B：运行时配置（推荐，便于多环境）

在 `assets/api.js` 之后、`assets/app.js` 之前插入一个 `defer` 脚本（例如 `assets/config.js`）：

```html
<script src="assets/api.js" defer></script>
<script src="assets/config.js" defer></script>
<script src="assets/app.js" defer></script>
```

```js
/* assets/config.js */
window.StarIsleAPI.configure({
  useMock: false,
  baseUrl: 'https://api.starisle.com'   // 尾斜杠会被自动去掉
});
```

`defer` 脚本按文档顺序执行，因此 `configure` 一定早于 `app.js` 的 `boot()`。

### 方式 C：嵌入宿主页面

宿主（如管理后台）在 `app.js` 加载前调用 `window.StarIsleAPI.configure({...})`，或直接注入会话（见 4.2）。

> 切换后所有页面自动走真实请求。演示数据仍在 `localStorage` 里，不会被读取；需要时可用 `StarIsleAPI.resetDemo()` 清掉。

---

## 4. 鉴权与会话

### 4.1 契约

- 请求头：`Authorization: Bearer <token>`（`assets/api.js` 的 `request()` 统一注入）。
- 会话存储键：`localStorage['starisle-auth']`，值为 `{"state": { token, role, userId, nickname, avatar, classId, loginAt }}`。
- `role` 仅接受 `student` / `teacher` / `parent`（小写）。
- 401 → 适配层自动清除会话并回到落地页；403/404/408/500/501 → 页面内降级提示，不整页报错。

### 4.2 真实模式的登录入口（接入时需二选一）

演示模式靠「选角色」进入；真实后端需要凭证，当前 `app.js` 的 `loginAs(role)` 只传 `{ role }`，因此**真实模式下点击角色卡会返回 `400 需要输入账号密码或手机验证码`**。两种接入方式：

**A. 宿主注入会话（零改动）**

宿主登录页 / SSO 拿到 token 后写入：

```js
localStorage.setItem('starisle-auth', JSON.stringify({
  state: { token: '<jwt>', role: 'student', userId: 'stu-1001', nickname: '林小满', avatar: '', classId: 'cls-201', loginAt: new Date().toISOString() }
}));
location.href = './index.html';
```

`app.js` 的 `boot()` 会先读 `StarIsleAPI.auth.current()`，命中即直接进入对应角色首页。

**B. 把角色卡换成登录表单（约 20 行）**

保留 `runAction` 的 `entry:role` 分支不变，改 `loginAs` 内的一行：

```js
API.auth.login({ username: form.username, password: form.password, role: role })
```

适配层已支持 `POST /v1/auth/login`（用户名密码）与 `POST /v1/auth/login/phone`（手机验证码）两条路径，并在成功后调用 `setSession()`。

---

## 5. 适配层职责边界

`assets/api.js` 分两层：

| 区块 | 作用 | 改动时机 |
| --- | --- | --- |
| `Mock`（第 1–5 节） | 演示数据 + 与 UI 完全一致的返回结构 | 只在补充演示内容时改 |
| `request()`（第 6 节） | 统一 HTTP：JSON、Bearer、10s 超时、`{code,data}` 解包 | 基本不动 |
| **6b 字段适配** | 把后端字段/结构归一化为 UI 结构（`adaptSession` / `adaptScale` / `adaptResult` / `adaptClassStats` / `adaptStudents` / `adaptAlerts` / `adaptChildren` / `adaptChildMood` / `adaptRiskLevel` / `adaptList`） | **后端字段有变时只改这里** |
| `API.*`（第 7 节） | 对外接口：`API.auth` / `API.mood` / `API.knowledge` / `API.community` / `API.assessment` / `API.classroom` / `API.parents` / `API.risk` / `API.content` | 新增端点时按同样模式加 |

返回约定：`{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`，全部为 Promise，页面侧只判 `res.ok`。

字段映射表见 [api-contract.md 第 11 节](./api-contract.md)。

---

## 6. 同源与跨域

- 推荐把 `BASE_URL` 设为 `/api`，由 Nginx / 网关把 `/api/*` 反代到后端（与 `openapi.yaml` 的 `servers` 前缀一致：`http://localhost:8080/api/v1/...`）。
- 若直接跨域指向 `https://api.starisle.com`，后端需放行前端源并允许 `Authorization` 头；本项目为纯静态页，**不使用 cookie**，无需 `withCredentials`。
- 后端统一响应 `{ code, message, data }`：`code` 为 `0` 或 `200` 视为成功；裸 JSON 也能被接受（适配层会兜底）。

---

## 7. `file://` 与 `http(s)://` 的差异

| 能力 | `file://` | `http(s)://` |
| --- | --- | --- |
| 三端界面与演示数据 | 可用 | 可用 |
| hash 路由 | 可用 | 可用 |
| Service Worker / 离线 | 不可用（浏览器限制） | 可用 |
| 真实 API 请求 | 受同源策略限制，建议走静态服务 | 正常 |

`index.html` 已按 `location.protocol.indexOf('http') === 0` 判断后再注册 SW，不会在 `file://` 下报错。

---

## 8. 缓存与更新

- 缓存名：`starisle-v1`（`sw.js` 第 2 行）。**改动 `assets/` 下任一文件后，请把版本号提升为 `starisle-v2`**，否则旧的缓存优先策略会把老脚本继续发给用户。
- 导航请求为网络优先，静态资源为缓存优先；`install` 阶段 `skipWaiting`，`activate` 阶段清除非当前版本缓存。
- 强刷仍无效时：开发者工具 → Application → Service Workers → Unregister，再清 Cache Storage。

---

## 9. 演示数据重置

控制台执行：

```js
StarIsleAPI.resetDemo();   // 清空 starisle-demo-db 并重新播种
localStorage.removeItem('starisle-auth');   // 退出登录
location.reload();
```

演示库结构（`DB_VERSION = 3`）：8 名学生（`stu-1001` 林小满 / `cls-201` 高一 (3) 班）、3 条预警（`alt-3001` 高危未处理、`alt-3002` 重点未处理、`alt-3003` 需关注已处理）、1 条家长绑定（`bind-7001` → `stu-1001`，关系「妈妈」）。

---

## 10. 已知限制与后续待接

| 项 | 现状 | 后续 |
| --- | --- | --- |
| 真实模式登录表单 | 未内置，见 4.2 | 接入时按 A 或 B 落地 |
| 取消绑定授权 | 后端无端点，前端返回 `501` 并提示使用「解除绑定」 | 后端补 `POST /v1/parents/children/{bindingId}/revoke` 后，把 `API.parents.authorize` 的 `authorized === false` 分支改为真实请求 |
| 「下载星屿 App」二维码 | 静态示意图，**不含真实码** | 换成正式小程序码 / 下载页二维码图片 |
| AI 陪伴对话 | README v2.2 已裁决 Web 端不做，改为 App 下载引导 | 不做假入口；App / 小程序侧已有 |
| `GET /v1/parents/children/{bindingId}/mood` | 契约中标注为【新增】，前端**不依赖**（改用 `GET /v1/parent/mood/{studentId}`） | 可选实现，前端无需改动 |

---

## 11. 接入自检清单

1. 双击 `index.html` → 落地页可选三种角色，三端首页均有数据。
2. 三端切换（顶栏「切换角色」）后导航与页面随之变化，同一份构建。
3. `USE_MOCK = false` + `BASE_URL` 指向后端 → 控制台 Network 出现 `/api/v1/...` 请求且携带 Bearer。
4. 未登录直接访问受限页 → 401 后被清会话并回到落地页。
5. 教师端复核提交后，预警从「待处理」移到「已处理」。
6. 家长端绑定 → 授权 → 解除绑定，列表与孩子情绪卡同步刷新。
7. `http://` 下 DevTools → Application 能看到 `starisle-v1` 缓存与已激活的 SW。
