# ima 复刻版（Kotlin / JVM / Swing）

以《腾讯 ima.copilot 逆向报告》（`../reverse-report.md`）为依据，用 Kotlin 复刻 ima 桌面客户端的主要界面与可离线实现的核心功能。

- 桌面端入口：`com.ima.clone.MainKt`（`app/src/main/kotlin/com/ima/clone/Main.kt`）
- 手机 / 平板端入口：`com.ima.clone.web.MobileServerKt`（`app/src/main/kotlin/com/ima/clone/web/MobileServer.kt`）
- 技术栈：Kotlin 1.9.25 + Gradle 8.9 + JDK 17 + Java Swing 自绘 UI（桌面）/ JDK 内置 HttpServer + 响应式 PWA（手机、平板）
- 第三方依赖：**仅 kotlin-stdlib**（Markdown 渲染、检索、JSON 持久化均为自实现；移动端 Web 前端零依赖、零 CDN）

---

## 1. 目录结构

```
g:\逆向\ima\
├─ README.md                     # 本文件
├─ reverse-report.md             # 逆向报告
├─ assets\
│  ├─ ima-window.png             # 原版主窗口（证据）
│  ├─ ima-home.png               # 原版首页（证据）
│  ├─ ima-kb.png                 # 原版知识库（证据）
│  └─ clone-0..4.png             # 复刻版 5 个页面自测截图
└─ app\                          # Gradle 工程
   ├─ settings.gradle.kts
   ├─ build.gradle.kts
   ├─ gradle.properties          # 固定 JDK 17 + 内存/编译策略
   ├─ gradlew / gradlew.bat      # Gradle wrapper 8.9
   ├─ gradle\wrapper\...
   └─ src\main\
      ├─ kotlin\com\ima\clone\
      │  ├─ Main.kt                 # 桌面端入口 + 自测截图
      │  ├─ Theme.kt                # 深浅两套调色板 / 字体
      │  ├─ core\
      │  │  ├─ Json.kt              # 迷你 JSON 解析/序列化
      │  │  ├─ Model.kt             # Message/Session/Note/KbDoc/KbChunk
      │  │  ├─ Store.kt             # 本地 JSON 持久化
      │  │  ├─ Knowledge.kt         # 导入/切块/中文 bigram 检索
      │  │  ├─ AiEngine.kt          # 引擎接口 + 离线占位引擎
      │  │  ├─ App.kt               # 应用状态与用例
      │  │  └─ Catalog.kt           # 24 个内置扩展清单（实测版本）
      │  ├─ ui\
      │  │  ├─ Widgets.kt           # 圆角按钮/面板/输入框/细滚动条
      │  │  ├─ MarkdownView.kt      # 自绘 Markdown 渲染器
      │  │  ├─ ChatView.kt          # 对话页
      │  │  ├─ KnowledgeView.kt     # 知识库页
      │  │  ├─ NotesView.kt         # 笔记页
      │  │  ├─ DiscoverView.kt      # 发现页（扩展清单）
      │  │  ├─ SettingsView.kt      # 设置页
      │  │  └─ MainWindow.kt        # 外壳（左侧 rail + 页面切换）
      │  └─ web\
      │     └─ MobileServer.kt      # 手机/平板服务：JSON API + 静态资源托管（PWA）
      └─ resources\mobile\          # 手机/平板 Web 前端（零依赖、零 CDN）
         ├─ index.html              # 单页应用骨架（五视图 + 底部 Tab + 左侧 rail）
         ├─ app.css                 # 响应式样式（手机 <760px / 平板 ≥760px / 宽屏 ≥900/1100px）
         ├─ app.js                  # 状态管理、轻量 Markdown 渲染、全部交互
         ├─ manifest.webmanifest    # PWA 清单（可添加到主屏幕）
         ├─ sw.js                   # Service Worker（静态壳缓存，/api/ 永远走网络）
         └─ icon.svg                # 应用图标
```

---

## 2. 环境要求

| 项 | 要求 |
| --- | --- |
| JDK | 17（本机已固定为 `C:\Users\pc\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2`，见 `gradle.properties`） |
| Gradle | 使用自带 wrapper（8.9），无需单独安装 |
| 系统 | Windows（Swing；字体优先 Microsoft YaHei UI） |

> 本机 `java` / `gradle` 不在 PATH。工程已在 `app/gradle.properties` 写死 `org.gradle.java.home`，因此直接运行 `gradlew.bat` 即可，不需要配置环境变量。

---

## 3. 构建与运行

```powershell
cd g:\逆向\ima\app

# 编译
.\gradlew.bat --console=plain compileKotlin

# 运行（打开 GUI）
.\gradlew.bat --console=plain run
```

首次运行会自动创建本地数据目录并写入欢迎会话与示例笔记。

### 3.1 数据目录

默认：`%USERPROFILE%\.ima-clone\`

```
~/.ima-clone/
├─ sessions.json
├─ notes.json
├─ knowledge.json
└─ settings.json
```

可通过 JVM 参数覆盖：`-Dima.data=D:\some\dir`。

### 3.2 无人值守自测（可选）

```powershell
.\gradlew.bat --console=plain run "-Dima.selftest=all" "-Dima.selftest.out=G:\逆向\ima\assets\clone.png"
```

- `ima.selftest=all`：依次切换 5 个页面并截图（`clone-0.png` ~ `clone-4.png`），完成后自动退出。
- `ima.selftest=<页码>`：只截当前页，输出 `clone.png`。
- 用途：无人工介入地验证「能编译 + 能启动 + 各页面能渲染」。

### 3.3 手机端 / 平板端（PWA）

同一套 Kotlin 核心（`App` / `Store` / `KnowledgeBase` / `AiEngine`）+ 同一数据目录，额外提供一个本地 HTTP 服务与响应式 Web 客户端。**桌面端的 Swing 代码没有任何改动**。

```powershell
cd g:\逆向\ima\app

# 启动（默认 8088，绑定本机 + 局域网所有网卡）
.\gradlew.bat --console=plain runMobile

# 改端口
.\gradlew.bat --console=plain runMobile "-Dima.port=8099"

# 指定数据目录（与桌面端隔离，常用于验证/演示）
.\gradlew.bat --console=plain runMobile "-Dima.port=8099" "-Dima.data=G:\逆向\2026-11-09\ima-reverse\work\mobile-data"
```

启动后控制台会打印：

```
手机 / 平板端已启动（同一 Wi-Fi 下可访问）
本机访问 : http://127.0.0.1:8088/
局域网   : http://192.168.x.x:8088/
数据目录 : C:\Users\<你>\.ima-clone
```

- **手机 / 平板访问**：设备与电脑连同一 Wi-Fi，浏览器打开上面的「局域网」地址即可。
- **添加到主屏幕（PWA）**：Android Chrome / iOS Safari（分享 → 添加到主屏幕）安装后以独立窗口全屏运行，图标为品牌绿 `ima`。
- 端口被占用时会自动向后试 20 个端口，以控制台打印的实际端口为准。
- 若数据目录不可写（例如在受限沙箱/其他用户目录下运行），会返回 `500 … 拒绝访问`；用 `-Dima.data=<可写目录>` 换个位置即可。

#### 能力对照

| 能力 | 手机 / 平板 | 说明 |
| --- | --- | --- |
| 对话 | ✅ | 会话新建/切换/删除、发送、Markdown 气泡、流式前的「检索中」占位 |
| 知识库 | ✅ | 文件上传导入（txt/md/html/csv/json 等，上限 8MB）、文档列表、删除/清空、片段检索 |
| 笔记 | ✅ | 新建/编辑/删除、Markdown 实时预览、900ms 防抖自动保存 |
| 发现 | ✅ | 24 个内置扩展清单（名称/版本/扩展 ID/状态） |
| 设置 | ✅ | 深浅主题切换、版本与引擎信息、数据目录展示、重置数据 |
| 云端问答 / 全网搜索 / 登录 | ⬜ | 与桌面端一致：依赖 ima 私有后端，占位 |

#### 响应式断点

| 视口宽度 | 布局 |
| --- | --- |
| `< 760px`（手机竖屏） | 底部 5 个 Tab 导航；会话列表为抽屉，点左上角菜单或从左边缘滑出，带遮罩 |
| `≥ 760px`（平板竖屏 / 横屏） | 底部 Tab 隐藏，改为左侧 78px 图标 rail |
| `≥ 900px`（平板横屏 / 小笔记本） | 对话页右侧会话栏常驻，双栏布局 |
| `≥ 1100px`（桌面浏览器） | rail 展开为 208px 并显示文字与品牌名 |

已适配刘海屏安全区（`env(safe-area-inset-*)`）与 `100dvh` 动态视口，避免移动端地址栏伸缩导致的高度跳动。

#### 接口一览

服务端路由全部为本地明文 HTTP（无鉴权，仅供同一局域网内使用）：

```
GET  /api/state                              全量状态（会话/笔记/知识库/设置）
GET  /api/catalog                            24 个扩展清单
GET  /api/session?id=                        单个会话详情
POST /api/sessions/new | select | delete     会话管理
POST /api/chat                               发送消息（body: {sessionId, text}）
POST /api/notes/new | save | delete          笔记管理
POST /api/kb/upload?name=xxx                 导入文档（body 为纯文本，≤8MB）
POST /api/kb/remove | clear                  删除 / 清空文档
GET  /api/kb/search?q=                       片段检索
POST /api/settings                           切换主题（body: {dark}）
POST /api/reset                              重置数据
```

修改类接口统一返回 `{ ok, state }`，前端拿到最新的全量状态后重渲染；除 `/api/` 外的路径都返回 `index.html`（单页应用回落）。

#### 为什么不是原生 APK

本机没有安装 Android SDK（无 `ANDROID_HOME` / `sdkmanager` / `adb`），无法编译和签名 APK。若强行引入 Android 工程，既不能在这里验证「能编译」，也会破坏「仅 kotlin-stdlib、零第三方依赖」的约束。因此改用 PWA：同一份 Kotlin 核心代码、零额外依赖、手机与平板浏览器直接可用，并且可以「添加到主屏幕」获得接近原生 App 的体验。

---

## 4. 功能对照

| 页面 | 复刻内容 | 说明 |
| --- | --- | --- |
| 对话 | 会话列表（新建/切换/删除）、消息气泡、输入发送、异步「检索中」占位 | 回答由**本地占位引擎**基于知识库片段生成，不是 ima 官方模型 |
| 知识库 | 文档导入（txt/md/html/csv/json 等）、切块、中文 bigram + idf 检索、结果卡片 | 纯本地；原版检索在云端 |
| 笔记 | 笔记 CRUD、Markdown 实时预览、700ms 防抖自动保存 | 已实装 |
| 发现 | 24 个内置扩展清单：名称/版本/扩展 ID/状态 | 数据来自 `User Data\Default\Extensions` 实测 |
| 设置 | 深浅主题切换、数据目录打开、重置数据、引擎状态、关于（逆向事实表） | 部分实装 |
| 外壳 | 84px 左侧 rail、页面切换、窗口标题同步 | 对应原版 `chrome://home` 外壳 |

### 4.1 Markdown 渲染能力

`MarkdownView` 自绘支持：

- 标题 H1–H6、段落、无序列表
- 代码块（等宽字体 + 底色）
- 引用块、分隔线
- 表格（自动测列宽）
- 行内 `**粗体**`、`` `代码` ``、`[链接](url)`

不支持（占位）：KaTeX 公式、markmap 脑图、mermaid 图、cytoscape 图、图片内联。

---

## 5. 明确占位的能力与原因

| 原版能力 | 状态 | 原因 |
| --- | --- | --- |
| 问问ima 云端问答 | 占位 | 依赖 `ima.qq.com` 私有 API 与登录态，无法离线还原 |
| 全网 AI 搜索 | 占位 | 同上（`https://ima.qq.com/ai-search?query=`） |
| 云端知识库/同步 | 占位 | 私有后端 + 账号体系 |
| PDF / Office / EPUB 预览 | 占位 | 需要 PDFium / Apache POI 等重型依赖，与「零依赖可编译」目标冲突 |
| 音视频/播客/录音 | 占位 | 需要媒体框架与设备采集 |
| 网页翻译 / 收藏 / 历史 | 占位 | 依赖浏览器内核与云端 |
| 脑图 / mermaid / KaTeX | 占位 | 需要对应渲染库 |
| 账号登录 | 未实现 | 无可用凭据，且不应模拟官方登录 |

替代策略：知识库导入 + 本地检索 + 引用片段，保证「离线也能跑通一条完整问答链路」。

---

## 6. 已知问题

1. **G: 盘（exFAT 可移动盘）上 Gradle 清理 `build` 目录可能失败**
   现象：`Unable to delete directory '...\build\classes\kotlin\main'`（目录已空但仍报 not empty）。
   处理：把 `app\build` 重命名（如 `build-old`）后重新构建；或手动在资源管理器中删除该目录。
2. **自测截图边缘可能混入桌面/任务栏**
   原因：125% DPI 下 `Robot` 截取物理像素区域与 Swing 逻辑 bounds 存在偏差；不影响实际使用。
3. Markdown 表格单元格内的行内粗体未做二次解析（会显示原始 `**`）。

---

## 7. 与逆向结论的对应关系

- 原版是「定制 Chromium + 24 个 MV3 扩展」，不是 Electron；因此本工程不追求「同构」，而是复刻**可观察的产品形态**：左侧 rail + 对话/知识库/笔记/发现/设置五区。
- 原版视觉基线取自 `assets\ima-window.png`：深色底 ≈ `#1a1a1a`、rail ≈ `#141414`、品牌绿 `#079D55`、圆角卡片、细滚动条。
- 扩展清单（名称/版本/ID）与「已实装/部分实装/占位」状态集中在 `core\Catalog.kt`，便于对照 `reverse-report.md` 第 7 节。
