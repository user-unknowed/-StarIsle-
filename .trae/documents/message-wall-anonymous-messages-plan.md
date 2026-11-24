# 「星屿·心声墙」— 匿名留言收集网页 实施计划

## Summary

在项目根目录新建独立文件夹 `message-wall/`，构建一个 Node.js 全栈独立应用：

- **公开页 `/`**：匿名提交「想对抑郁症患者说的话」表单 + 展示已通过审核的留言墙（卡片流）
- **审核后台 `/admin`**：密码登录，对 pending 留言进行 通过/拒绝/删除 操作
- **数据库**：MongoDB Atlas 云端（独立 database `message_wall`，与主项目 starisle 库隔离）
- **技术栈**：Express + 官方 mongodb 驱动 + 原生 HTML/CSS/JS 前端（无构建步骤，`npm start` 一键运行）

## Current State Analysis

- 工作区为「星屿 StarIsle」青少年心理健康项目，已有 PostgreSQL + MongoDB + Redis 的 docker-compose（`server-services/deployment/docker-compose.yml`），但用户明确选择 **MongoDB Atlas 云端**而非本地 docker 实例。
- 用户选择 **Node.js 全栈独立应用**，不对接现有 backend-java。
- 展示方式：同一页面「上方提交表单 + 下方留言墙」，审核后台单独入口 `/admin`。

## Proposed Changes

全部文件位于新目录 `f:\B_proj\Big_proj\-StarIsle-\message-wall\`，与主项目完全隔离：

```
message-wall/
├── package.json          # express + mongodb 依赖, start 脚本
├── .env.example          # MONGODB_URI / ADMIN_PASSWORD / PORT 模板
├── .gitignore            # node_modules / .env
├── server.js             # Express 入口：静态托管 + API 路由
├── lib/
│   └── db.js             # Mongo 连接与集合访问（单例）
└── public/
    ├── index.html        # 公开页：提交表单 + 留言墙
    ├── admin.html        # 审核后台：登录 + 待审列表
    ├── css/style.css     # 治愈系视觉（柔和渐变、星光主题，呼应星屿）
    └── js/app.js         # 提交/加载留言墙逻辑
    └── js/admin.js       # 登录/审核操作逻辑
```

### 1. 后端 `server.js` + `lib/db.js`

- Express 托管 `public/` 静态文件，监听 `PORT`（默认 3210）。
- MongoDB Atlas 连接：`MONGODB_URI` 从 `.env` 读取（用 `dotenv`），database 名 `message_wall`，collection 名 `messages`。启动时确保索引：`{ status: 1, createdAt: -1 }`。

**API 设计：**

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/messages` | 匿名提交。body: `{ nickname?, content }`。nickname 缺省为「匿名」；content 必填 1–200 字。写入 `status: 'pending'`。服务端做基础限流（同一 IP 60 秒内最多 1 条，内存 Map 即可）与敏感词/危机关键词过滤（命中仍入库但标记 `flagged: true` 供审核优先看）。IP 仅存 SHA-256 哈希，不存明文。 |
| GET | `/api/messages` | 公开接口，仅返回 `status: 'approved'`，按 `createdAt` 倒序，limit 100。不返回 ip/flagged 字段。 |
| POST | `/api/admin/login` | 校验 `ADMIN_PASSWORD`，成功签发 httpOnly cookie token（随机 token 存内存 Map，24h 过期）。 |
| GET | `/api/admin/messages?status=pending` | 需鉴权，按状态列出全部留言（含 flagged 标记）。 |
| POST | `/api/admin/messages/:id/review` | 需鉴权，body `{ action: 'approve' \| 'reject' }`，更新 status 与 reviewedAt。 |
| DELETE | `/api/admin/messages/:id` | 需鉴权，硬删除。 |

**文档结构**（`messages` 集合）：

```js
{
  nickname: String,        // 默认 "匿名"
  content: String,         // 1-200 字
  status: 'pending' | 'approved' | 'rejected',
  flagged: Boolean,        // 危机/敏感词标记
  ipHash: String,          // SHA-256，用于限流与滥用追溯
  createdAt: Date,
  reviewedAt: Date | null
}
```

### 2. 公开页 `public/index.html` + `app.js` + `style.css`

- 视觉：治愈系柔和渐变背景 + 星光/岛屿意象（与「星屿」品牌呼应），卡片圆角、柔和投影，移动端响应式。
- 结构：顶部标语区（如「每一句话，都是一座照亮黑夜的灯塔」）→ 提交表单（昵称选填 + 200 字留言框 + 字数统计 + 提交按钮）→ 留言墙瀑布/卡片流。
- 交互：提交成功后显示「已收到，审核通过后会出现在留言墙上」提示；留言墙定时或进入时拉取 `/api/messages`。
- 危机提示：表单下方固定一行心理援助热线提示（与项目 v1.5 危机响应风格一致）。

### 3. 审核后台 `public/admin.html` + `admin.js`

- 简洁管理页：密码登录 → 待审列表（内容、时间、flagged 标记高亮）→ 每条带「通过 / 拒绝 / 删除」按钮；顶部可切换 tab 查看 approved / rejected。

### 4. 配置与部署

- `.env.example`：
  ```
  MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/
  ADMIN_PASSWORD=changeme
  PORT=3210
  ```
- **MongoDB Atlas**：实现时向用户索取连接串（若用户尚无集群，指导创建免费 M0 集群 + 开启 `0.0.0.0/0` 网络 access + 创建数据库用户）。URI 只写入 `message-wall/.env`（已被 .gitignore 排除），不入库不外泄。
- 独立部署：应用完全自包含于 `message-wall/`，`npm install && npm start` 即可在任意机器运行；主项目文件零改动。

## Assumptions & Decisions

1. 前端用原生 HTML/CSS/JS，无框架无构建——独立应用追求轻量可移植。
2. 鉴权用简单 token cookie（内存态），单管理员场景足够，不引入用户系统。
3. 限流用内存 Map（重启即清），满足轻量场景；不上 Redis。
4. 敏感词过滤为关键词表内置在代码中（自伤/自杀类危机词 → flagged），最终裁量权在人工审核。
5. 端口默认 3210，避开主项目常用端口（8080/5173）。

## Verification

1. `cd message-wall && npm install && npm start` 启动无报错，Atlas 连接成功。
2. 浏览器打开 `http://localhost:3210`：提交一条留言 → 返回成功提示。
3. 通过 Mongo 检查（Atlas 网页或 mongosh）：`message_wall.messages` 中出现该条 `status: 'pending'` 记录。
4. 打开 `/admin` 登录 → 通过该留言 → 回到公开页刷新，留言墙上出现该内容。
5. 拒绝/删除流程各验证一次；重复快速提交触发限流提示。
6. 用 browser-use 子代理对公开页做一次视觉与交互走查（桌面 + 移动视口）。
