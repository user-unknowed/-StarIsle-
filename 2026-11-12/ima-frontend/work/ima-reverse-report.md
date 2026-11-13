# 腾讯 ima.copilot 桌面客户端 · 详细逆向报告

- 日期：2026-11-09
- 目标：腾讯 ima（ima.copilot）Windows 桌面客户端（本机已安装实例）
- 方法：REA（reverse-engineer-anything）CLI 编排 + 7-Zip 三层解包 + PE/字符串静态扫描 + 注册表/进程/目录运行观测 + 扩展 manifest 源码审读
- 逆向对象：`C:\Users\pc\AppData\Local\ima.copilot\Application\mini_installer.exe`（原始文件未修改、未删除）
- 中间产物：`g:\逆向\2026-11-09\ima-reverse\work\`
- 最终产物：`g:\逆向\ima\`（本报告 + Kotlin 复刻工程 + 截图证据）

---

## 1. 结论摘要

| 项 | 结论 |
| --- | --- |
| 客户端本质 | **腾讯定制 Chromium 浏览器外壳**（内核 150.0.7871.x），**不是 Electron**，全盘无 asar |
| 产品/内核双版本 | 产品版本 `2.6.17.5333`（`Last IMA Version` / 注册表 `version`）；Chromium 内核 `150.0.7871.5522`（已安装）/ `150.0.7871.5317`（安装器载荷） |
| 主界面 | 原生 WebUI 壳页 `chrome://home/` + 24 个解包安装的 MV3 扩展拼装 |
| 页面接管 | 扩展用 `chrome_url_overrides` 注册私有 scheme 页面：`allknowledge` / `note` / `history` / `global_settings` |
| 定制点 | 专有扩展权限 `imaFrame`、`chrome_proxy.exe`、`ima_context_menu.dll`、`client_extension.dll`、WASM TTS 引擎组件 |
| 前端栈 | React + TDesign React + markdown-it + KaTeX + markmap/mermaid + cytoscape + html2canvas（chrome.dll 与扩展内均有符号命中） |
| 安装/更新 | Chromium 系 `mini_installer.exe`（PE + 尾部 7z）；日常更新走 **Shiply 增量（`ima_delta_*.exe`）** |
| 腾讯底座 | Shiply（reshub/rdelivery 资源分发）、Beacon、Bugly、QIMEI、ImSDK（SDKAPPID 1600077650） |
| 复刻可行面 | 界面骨架、会话、本地知识库检索、笔记、Markdown 渲染可做实；云端问答/搜索/同步只能占位 |

---

## 2. REA 环境检查结论

- **REA skill 已安装**：`C:\Users\pc\.trae\skills\reverse-engineer-anything\SKILL.md`（含 `references/`）。
- **CLI 可用版本**：`npx -y rea-agents@6.8.0` 正常；`6.5.0` 启动报 `compiled runtime is missing`，不可用。
- **Windows 原生自检限制（实测）**：
  1. 要求目标卷为**固定本地 NTFS**。工作盘 `G:` 是 exFAT 可移动盘，原生自检会失败；需把 `TEMP` 指向 `C:` 上的 NTFS 目录。
  2. 要求工作/临时目录的 **owner 必须是当前用户**，否则报 `Win32 5 拒绝访问`；需 `icacls <dir> /setowner`。
- **能力边界（实测）**：
  - `inventory`（文件清单/结构）与 `observe`（运行观测）可用；
  - 对 292MB Release 混淆产物 `chrome.dll` 的 JS AST/深度分析出现 `capability_unavailable` 与 `provider_timeout`（默认 300s/源，已尝试 `--analysis-timeout-ms 900000`），仅获得 partial observation；
  - 因此本报告关键结论以 **7z 解包 + PE/字符串 + 注册表/进程 + 扩展源码** 为主证据，REA 负责清单化与流程编排。日志：`work\rea-kb.log`。

---

## 3. 制品确认（实测，非猜测）

### 3.1 安装包本体

| 项 | 值 |
| --- | --- |
| 路径 | `C:\Users\pc\AppData\Local\ima.copilot\Application\mini_installer.exe` |
| 大小 | 202,875,160 字节（约 193.5 MB） |
| SHA-256 | `6C8981884E8887F63EEB8C1428B328BD55ACE1EC27B89D69F6C291258E26E2BB` |
| 数字签名 | Valid，`Tencent Technology (Shenzhen) Company Limited`（EV，有效期至 2028-11-05） |
| FileDescription | `IMA Installer` |
| FileVersion | `150.0.7871.5317` |
| 格式 | Chromium 系 `mini_installer`：PE 头 + 尾部追加 7z 数据块（**不是 NSIS**，也不是 Electron 的 Squirrel/NSIS 壳） |

> 本机未发现名为 `ima-setup.exe` 的独立下载包；随客户端自带的 `mini_installer.exe` 就是完整安装载荷（含全部二进制），故以其为逆向对象。约束遵守：未修改、未删除。

### 3.2 已安装运行时

| 项 | 值 |
| --- | --- |
| 主程序 | `C:\Users\pc\AppData\Local\ima.copilot\Application\ima.copilot.exe`（4,000,536 字节；`chrome_proxy.exe` 2,412,632 字节） |
| 内核版本目录 | `Application\150.0.7871.5522\` |
| 产品版本 | `2.6.17.5333`（`User Data\Last IMA Version`、卸载注册表 DisplayVersion 一致） |
| 内核版本 | `150.0.7871.5522`（`User Data\Last Version`） |
| 用户数据 | `C:\Users\pc\AppData\Local\ima.copilot\User Data\`（Chromium Profile 布局） |
| 注册表 | `HKCU\Software\Ima.copilot`（详见 §7） |
| 卸载器 | `Application\uninstall\ImaUninstall.exe`（769,536 字节，`--uninstall --verbose-logging`） |

---

## 4. 安装器解包链（三层）

```
mini_installer.exe                         202,875,160 B（PE + 尾部追加 7z）
└─ 偏移 2,583,688 处截取 → ima-payload.7z   200,291,472 B
   └─ chrome.7z                            560,027,153 B
      └─ Chrome-bin\150.0.7871.5317\       312 个文件 / 8 个文件夹（共 560,024,099 B）
```

- 内层 `chrome.7z` 为 `Method = Copy`（不压缩归档，因 DLL 本身已压缩），外层 `ima-payload.7z` 将其从 560MB 压到 200MB。
- 解包命令要点（7za 来自 `npm i 7zip-bin`，路径 `work\node_modules\7zip-bin\win\x64\7za.exe`）：

```powershell
7za.exe x ima-payload.7z -oextracted
7za.exe x extracted\chrome.7z -oextracted\chrome
```

- 产物：`work\ima-payload.7z`、`work\extracted\chrome.7z`、`work\chrome-listing.txt`（完整清单）。

### 4.1 载荷内主要文件（150.0.7871.5317）

| 文件 | 大小 | 说明 |
| --- | --- | --- |
| chrome.dll | 291,880,728 | 定制 Chromium 主库（已安装版为 292,070,680，增量更新后有差异） |
| resources.pak | 27,184,856 | 内置资源（已安装版 22,032,424，版本不同） |
| icudtl.dat | 10,876,560 | ICU 国际化数据 |
| ImSDK.dll | 9,856,896 | 腾讯 IM SDK |
| libGLESv2.dll / vk_swiftshader.dll / dxcompiler.dll / dxil.dll / d3dcompiler_47.dll / vulkan-1.dll | 7.5M / 5.4M / 24.5M / 1.5M / 4.5M / 0.9M | 图形栈（含 SwiftShader 软件渲染回退） |
| shiply.dll | 6,899,480 | Shiply 增量更新/资源分发 |
| beacon_sdk.dll | 3,044,120 | Beacon 数据上报 |
| crashpad_handler_bugly.exe | 3,096,344 | Bugly 定制崩溃处理器 |
| bugly_logger.dll / bugly_extra_handler.dll | 2,946,840 / 115,992 | Bugly 日志 |
| ima_context_menu.dll | 2,491,672 | 系统右键菜单桥接 |
| chrome_elf.dll | 2,703,128 | 进程早期注入（ELC 黑名单） |
| notification_helper.exe | 2,752,280 | Windows 通知 |
| chrome_pwa_launcher.exe | 2,810,136 | PWA 启动器 |
| ima.copilot.exe | 3,994,904 | 主程序（Chrome-bin 根） |
| qimei.dll | 1,305,880 | QIMEI 设备指纹 |
| client_extension.dll | 1,115,416 | 扩展原生桥接 |
| v8_context_snapshot.bin | 740,048 | V8 快照 |
| ima_viewer.ico / VisualElements\Logo.png / SmallLogo.png | — | 图标与磁贴 |
| Extensions\*.crx × 25 + *.json × 25 | 见 §11 | 内置扩展包 |
| Locales\*.pak × 60+ 语言 | — | 本地化资源 |
| IwaKeyDistribution / MEIPreload / PrivacySandboxAttestationsPreloaded | — | Chromium 标准组件 |

---

## 5. 安装目录结构（已安装实例）

```
C:\Users\pc\AppData\Local\ima.copilot\
├─ Application\
│  ├─ ima.copilot.exe                 # 启动器/浏览器主进程（3.82 MB）
│  ├─ chrome_proxy.exe                # 代理/转发进程（2.41 MB）
│  ├─ mini_installer.exe              # 完整安装载荷（本次逆向对象）
│  ├─ shiply.dll / beacon_sdk.dll / qimei.dll / bugly_logger.dll / client_extension.dll
│  ├─ crashpad_handler_bugly.exe / crashpad_handler_extension.exe
│  ├─ ima_install.log / ima_viewer.ico / chrome.VisualElementsManifest.xml
│  ├─ CR_9DCC5.tmp\                   # 安装/更新暂存目录
│  ├─ 150.0.7871.5522\                # 版本化运行时（见 §4.1 文件表）
│  │  ├─ Installer\                   # 含 setup.exe（增量更新执行器，注册表 DowngradeCleanupCommand 引用）
│  │  ├─ beacon\  Extensions\  Locales\  IwaKeyDistribution\  MEIPreload\
│  │  └─ PrivacySandboxAttestationsPreloaded\  VisualElements\
│  ├─ Dictionaries\en-US-10-1.bdic    # 拼写检查（仅 en-US）
│  ├─ imainfo\                        # 更新/安装日志（mini_installer_log.log + 按日的 other_ima_bin.log）
│  └─ uninstall\ImaUninstall.exe
└─ User Data\                         # Chromium Profile（详见 §8）
```

---

## 6. 注册表与安装器行为

### 6.1 `HKCU\Software\Ima.copilot`（完整实测字段）

| 键 | 值 | 含义 |
| --- | --- | --- |
| name / lang | `ima` / `zh-cn` | 产品名与语言 |
| pv | `150.0.7871.5522` | 产品版本（Chromium 内核号） |
| version | `2.6.17.5333` | 应用版本（ima 产品版本） |
| ImaInstallPath | `...\AppData\Local\ima.copilot\Application` | 安装根目录 |
| InstallerName | `ima_delta_3ffa1e7e-40d0-4e13-9e39-1070596571be.exe` | **Shiply 增量安装包**（delta 命名） |
| InstallerProgress / InstallerResult / InstallerError | 100 / 0 / 30 | 安装进度与结果 |
| InstallerSuccessLaunchCmdLine | `ima.copilot.exe --from-installer` | 装完自启动命令 |
| DowngradeCleanupCommand | `...\150.0.7871.5522\Installer\setup.exe --cleanup-for-downgrade-version=$1 --cleanup-for-downgrade-operation=$2 --verbose-logging` | 版本回退清理 |
| CleanInstallRequiredForVersionBelow | `85.0.4169.0` | 低于该版本需全新安装（Chromium 85 分界） |
| FirstNotDefault | `13433776619060563`（FILETIME） | 首次安装时间戳 |
| InstallAutoLaunch | `1` | 开机自启动 |
| UsageStatsInSample / usagestats / metricsid* | 1 / 0 / … | 使用统计采样 |
| ImaInstallLogPath | `...\Application\ima_install.log` | 安装日志 |
| UninstallString / UninstallArguments | `uninstall\ImaUninstall.exe` / `--uninstall --verbose-logging` | 卸载命令 |

### 6.2 卸载注册表项

- DisplayName `ima`，DisplayVersion `2.6.17.5333`，Publisher `The ima.copilot Authors`，InstallLocation `...\Application`。

---

## 7. 进程模型（实测命令行，12 个进程）

| 进程类型 | 数量 | 关键参数 |
| --- | --- | --- |
| browser（主） | 1 | `--enable-logging --log-level=2 --v=-1 --win-auto-start --restart` |
| gpu-process | 1 | `--gpu-preferences=UAAAAA…` + metrics/field-trial handle |
| utility（NetworkService） | 1 | `--utility-sub-type=network.mojom.NetworkService --lang=zh-CN --service-sandbox-type=none` |
| utility（StorageService） | 1 | `--utility-sub-type=storage.mojom.StorageService --service-sandbox-type=service` |
| renderer | 5 | `--lang=zh-CN --device-scale-factor=2.5 --num-raster-threads=4`（其中 4 个带 `--extension-process`） |

判定：
- 标准 Chromium 多进程模型（browser / gpu / network utility / storage utility / renderer），**不是 Electron**；
- 大量 `--extension-process` 印证业务 UI 由扩展渲染；
- `--device-scale-factor=2.5` 表明该机显示器 250% 缩放；
- 主进程 `--win-auto-start` 与注册表 `InstallAutoLaunch=1` 一致（开机自启）。

---

## 8. User Data 结构（腾讯定制痕迹）

```
User Data\
├─ Default\                          # Chromium Profile
│  ├─ Extensions\<32位id>\<ver>_0\   # 24 个已解包扩展（HTML/JS/CSS 可读源码）
│  ├─ Preferences / History / Cookies / Local Storage / …
│  └─ …
├─ Last IMA Version  = 2.6.17.5333   # 产品版本
├─ Last Version      = 150.0.7871.5522
├─ Local State（os_crypt.encrypted_key 存在）
├─ bugly\                            # Bugly 崩溃/日志
├─ imsdk\                            # ImSDK：imsdk_config_1600077650 + *.xlog + im.db/msg_0.db
├─ key_info\                         # LevelDB（密钥信息）
├─ reshub\                           # Shiply 资源包：924cd926ee_10010__<id>_release__* + app_online + business_report_data
├─ rdelivery\                        # Shiply 配置分发：924cd926ee_10001__<id>_release__*
├─ tdosConfig\                       # Bugly TDOS 配置（1f28a6beea_buglyLog）
├─ UpdateExtensions\ / extensions_crx_cache\ / component_crx_cache\
├─ WasmTtsEngine\                    # WASM TTS 引擎组件（ima 特有）
├─ imainfo\                          # 客户端自诊断日志
└─ 标准 Chromium 组件目录：WidevineCdm / Safe Browsing / CertificateRevocation / MEIPreload / … 
```

要点：`reshub`/`rdelivery` 的资源名以 `924cd926ee_` 前缀开头（Shiply 项目 ID），佐证 Shiply 同时承担**客户端增量更新**与**资源/配置热分发**；ImSDK 使用 SDKAPPID `1600077650`。

---

## 9. 技术栈判定

| 层 | 结论 | 证据 |
| --- | --- | --- |
| 运行时 | 腾讯定制 Chromium（150.0.7871.x） | chrome.dll / *.pak / v8_context_snapshot / 多进程模型 |
| 打包 | 非 Electron，无 asar | 全盘未发现 asar；入口是 `chrome://home/` |
| 壳页面 | 原生 WebUI `chrome://home`、`chrome://allknowledge` 等 | chrome.dll 字符串命中（§13） |
| 业务 UI | MV3 扩展（Content Script / Service Worker + Web 页面） | User Data 内 24 个解包扩展 + `--extension-process` |
| 前端框架 | React + TDesign React | 扩展 bundle 内 react/tdesign 符号；chrome.dll 亦含 `tdesign` 字符串 |
| 内容渲染 | markdown-it + KaTeX + markmap + mermaid + cytoscape + html2canvas | chrome.dll 命中 katex/mermaid/cytoscape/html2canvas；扩展依赖 |
| 更新 | Shiply（增量 delta + reshub/rdelivery） | shiply.dll + `ima_delta_*.exe` + reshub/rdelivery 目录 |
| 遥测 | Beacon / Bugly / QIMEI | 对应 DLL + bugly/tdosConfig 目录 |
| IM | 腾讯 ImSDK | ImSDK.dll + imsdk 数据目录（SDKAPPID 1600077650） |
| TTS | WASM TTS 引擎组件 | `WasmTtsEngine\` 目录 |
| 定制权限 | 扩展声明 `imaFrame`、`sidePanel` | 扩展 manifest（§12） |

---

## 10. 内部页面与扩展接管机制（关键发现）

### 10.1 chrome:// 私有 scheme 页面

`chrome_url_overrides` 实测映射（扩展 → scheme 页面）：

| 扩展 | override 键 | 目标页面 | 实际 URL |
| --- | --- | --- | --- |
| IMA知识库 | `allknowledge` | `index.html` | `chrome://allknowledge/` |
| 记笔记 | `note` | `pages/ima-editor.html` | `chrome://note/` |
| IMA历史 | `history` | `index.html` | `chrome://history/` |
| IMA设置 | `global_settings` | `index.html` | `chrome://global_settings/` |

- `chrome://home/` 是编译进 chrome.dll 的原生壳页（左 rail + 各模块入口），不被扩展 override；
- 壳页通过 `externally_connectable` 与扩展通信（Chrome Messaging）。

### 10.2 externally_connectable 白名单（各业务扩展一致）

```
chrome://home/*
https://ima.qq.com/*
https://ima-pre.qq.com/*
https://ima-test.qq.com/*
https://ima-debug.qq.com/*
```

- 生产 / 预发 / 测试 / 调试四套域名分离；
- 记笔记额外放行 `https://ima.qq.com/note/visitor*`（游客态笔记页）。

### 10.3 定制扩展权限 `imaFrame`

所有核心业务扩展 manifest 中均出现权限 `imaFrame`——这是**腾讯在此定制 Chromium 中注册的专有权限**（原生 Chromium 无此权限），与 `client_extension.dll` / `ima_context_menu.dll` 同属定制桥接层，用于扩展与原生能力的互通（如打开独立 ima 框架窗口）。

---

## 11. 内置扩展清单

### 11.1 载荷 CRX：25 个（`Application\150.0.7871.5522\Extensions\`）

CRX 体积（载荷内实测，前 8 名）：

| 扩展 ID | CRX 大小 |
| --- | --- |
| jmfjadjclplhcchkjjnjoinbfmdhjkhh（office 查看器） | 20,689,239 |
| gbkeegbaiigmenfmjfclcdgdpimamgkj（qo_documents） | 6,861,269 |
| cninonkgpcmdognjppglnkelbkhlhhee（记笔记） | 8,203,388 |
| elhgpcianbbmeilccnddimfddkgegeee（PDF） | 5,933,511 |
| cnpjbkidlfannncommmljnmmmjijfdgg（问问ima） | 5,729,461 |
| nkohmbngmopdajidckglcoehlaeepeoi（IMA知识库） | 5,653,687 |
| akncmfemomfkkgiffphoedpiioanbflo（IMA搜索） | 4,727,497 |
| plpfbadbocioapeolmdippopkebeapof（脑图编辑器） | 4,389,921 |

> 每个 CRX 同目录附带同名 `.json`（`external_crx` + `external_version`），这是外部组件安装声明；`external_extensions.json` 内容为空 `{}`，即真正的“预装清单”由这 25 个独立 json 构成。

### 11.2 已解包安装：24 个（`User Data\Default\Extensions\`）

| 扩展 | 版本 | override | 扩展 ID | 复刻状态 |
| --- | --- | --- | --- | --- |
| IMA知识库 | 5.22.5 | allknowledge→index.html | nkohmbngmopdajidckglcoehlaeepeoi | 部分实装 |
| 问问ima | 5.20.4 | — | cnpjbkidlfannncommmljnmmmjijfdgg | 占位 |
| 记笔记 | 4.62.2 | note→pages/ima-editor.html | cninonkgpcmdognjppglnkelbkhlhhee | 已实装 |
| imaHub | 5.12.1 | — | kelliennekihkkpejaejdbaaindamfkh | 占位 |
| IMA设置 | 5.12.0 | global_settings→index.html | khmgfdkajnigikondkcjbaflpjflfiee | 部分实装 |
| IMA搜索 | 5.19.3 | — | akncmfemomfkkgiffphoedpiioanbflo | 部分实装 |
| IMA收藏 | 5.8.2 | — | egkgeljgkehpdelhobnmbpkjjjfmacfl | 占位 |
| IMA历史 | 5.1.4 | history→index.html | lbkbcakndpflbdfccignkdljhbkaglha | 占位 |
| IMA 网页翻译 | 1.13.0 | — | jgbkoppinnkajdckajmppgnefifmgnld | 占位 |
| 脑图编辑器 | 5.8.3 | — | plpfbadbocioapeolmdippopkebeapof | 占位 |
| PDF Extension | 5.14.3 | — | elhgpcianbbmeilccnddimfddkgegeee | 占位 |
| office 查看器 | 5.13.3 | — | jmfjadjclplhcchkjjnjoinbfmdhjkhh | 占位 |
| epub查看器 | 5.10.3 | — | oaifjdgehbjmnnfkjagnadaipgjdkbaa | 占位 |
| markdown查看器 | 5.14.3 | — | cbgfjbdckbpenliighcjcbjfiihnnkfe | 已实装 |
| code查看器 | 5.12.3 | — | eelcllbacbedmhanfdfaapgmmnckpbhh | 部分实装 |
| HTML沙箱 | 5.7.0 | — | ocabijiofglkcngiibeoenlbhgaffkki | 占位 |
| 播客播放器 | 5.9.0 | — | emagenjhmpjalpoconjkojjhiljigfoh | 占位 |
| 音频播放器 | 5.8.3 | — | jkfgholpigobipmfnpckjghnfbbkpecn | 占位 |
| 录音插件 | 5.7.0 | — | hgpacghgeonehmbpbfgfceodbeaohlfb | 占位 |
| 图片工具 | 5.9.4 | — | jhnkclbnlaofmbgaepmgiedepkbafipg | 占位 |
| txt查看器 | 5.10.3 | — | edmepjlhfjgindglnlieahgkijdampma | 已实装 |
| copilot | 4.8.5 | — | miolgkmpainjjfndkopicefgbjdmpllk | 占位 |
| qo_documents（Chromium 内置） | 152.160.162 | — | gbkeegbaiigmenfmjfclcdgdpimamgkj | 占位 |
| 用量统计活动 | 5.2.0 | — | cdldgbooaochlonaceckeeooaajplpef | 占位 |

### 11.3 差异发现：第 25 个 CRX

载荷内含 `eemjhliengnnmjmbdjagekdddmkhanna.crx`（1,588,581 字节，external_version `1.5.0`），但 `User Data\Default\Extensions` 中**无对应解包目录**——即该扩展随安装器分发但当前未安装/未启用（灰度或废弃组件），故运行时业务扩展按 24 个计。

---

## 12. 关键扩展行为细节（manifest 实测）

### 12.1 IMA知识库 5.22.5

- permissions：`storage, offscreen, tabs, activeTab, scripting, contextMenus, webNavigation, clipboardRead, clipboardWrite, cookies, background, webRequest, imaFrame, fileSystem, downloads`
- host_permissions：`<all_urls>`, `*://*/`, `file:///*/*`
- 页面接管：`chrome://allknowledge/`（知识库主界面）
- 能力面：剪贴板、Cookies、文件系统、下载、网页请求拦截——覆盖“导入任意网页/文件到知识库”。

### 12.2 问问ima 5.20.4

- 额外权限：`sidePanel`（侧边栏）
- background：MV3 `service-worker-loader.js`（type=module，构建链为 vite-plugin-web-extension 风格 loader）
- content_scripts 2 组：
  1. `http://*/*`、`https://*/*`、`file:///*/*`（通用注入）
  2. `https://www.bilibili.com/*`、`https://bilibili.com/*`（**B 站视频总结/问答** 专有注入）

### 12.3 记笔记 4.62.2

- 页面接管：`chrome://note/` → `pages/ima-editor.html`（编辑器为本地 HTML 页）
- permissions 含 `unlimitedStorage`、`alarms`、`<all_urls>`
- externally_connectable 含 `https://ima.qq.com/note/visitor*`（分享/游客页）

---

## 13. chrome.dll 字符串证据（两轮流式扫描）

方法：4MB 分块 ASCII 精确匹配（块间 64 字节重叠）。原始记录：`work\chrome-strings-evidence.txt`。

### 13.1 第一轮：IMA 专有标识

| 字符串 | 命中 | 含义 |
| --- | --- | --- |
| `chrome://home/` | 12 | 原生壳页（自绘新标签页） |
| `chrome://allknowledge/` | 2 | 知识库页 scheme |
| `res-pkb.ima.qq.com` | 2 | 知识库资源 CDN |
| `ima.qq.com/ai-search` | 2 | 联网 AI 搜索入口（`https://ima.qq.com/ai-search?query=`） |
| `ima.copilot` | 5 | 产品标识/路径 |
| `ima://` | 0 | **未定义自定义协议**（与原版不用 ima:// 深链一致） |
| `Software\Ima.copilot` | 0 | 注册表路径在安装器/主 exe 侧，不在 chrome.dll |

### 13.2 第二轮：端点/技术栈/协议

| 字符串 | 命中 | 含义 |
| --- | --- | --- |
| shiply | 18 | Shiply 更新/分发代码路径 |
| ima.qq.com | 16 | 主业务域 |
| qq.com/ | 15 | 腾讯域（通用） |
| qimei | 15 | QIMEI 设备指纹 |
| chrome://home | 12 | 壳页 |
| bugly | 7 | Bugly 崩溃上报 |
| allknowledge | 6 | 知识库页面 |
| myqcloud.com | 5 | 腾讯云 COS/接口 |
| mermaid | 4 | 图表渲染 |
| ai-search | 4 | AI 搜索入口 |
| wss:// | 4 | WebSocket 安全连接（流式对话） |
| katex | 3 | 公式渲染 |
| tdesign | 2 | TDesign 组件库 |
| res-pkb.ima.qq.com | 2 | 知识库资源 CDN |
| chrome://allknowledge | 2 | 知识库页 scheme |
| ima-hub | 1 | imaHub 模块 |
| html2canvas | 1 | 截图导出 |
| cytoscape | 1 | 关系图渲染 |

未命中（说明对应端点不在此二进制硬编码）：`beacon.qq.com`、`oth.eve.mdt.qq.com`、`h.trace.qq.com`、`android.rqd.qq.com`、`markmap`、`graphql`、`aegis.qq.com`、`ima://`。

---

## 14. 网络端点与遥测栈

| 组件 | 证据 | 说明 |
| --- | --- | --- |
| 主业务 API | `ima.qq.com`（16 处） | 问答/知识库/笔记同步私有 API；另有 pre/test/debug 三环境 |
| AI 搜索 | `https://ima.qq.com/ai-search?query=` | 联网搜索入口 |
| 知识库资源 | `res-pkb.ima.qq.com` | 知识库静态资源 CDN |
| 云存储 | `myqcloud.com`（5 处） | 腾讯云（上传/转码） |
| 流式对话 | `wss://`（4 处） | 答案流式输出走 WebSocket |
| Shiply | shiply.dll + reshub/rdelivery 目录 | 客户端 delta 更新 + 资源/配置分发 |
| Beacon | beacon_sdk.dll | 数据上报 |
| Bugly | bugly_logger.dll + crashpad_handler_bugly.exe + bugly/ + tdosConfig/ | 崩溃与日志 |
| QIMEI | qimei.dll | 设备指纹 |
| ImSDK | ImSDK.dll + imsdk/（SDKAPPID 1600077650） | IM 消息通道 |

---

## 15. 更新机制（Shiply 增量）

证据链：
1. 注册表 `InstallerName = ima_delta_3ffa1e7e-40d0-4e13-9e39-1070596571be.exe` → 增量包命名（delta + GUID）；
2. `Application\150.0.7871.5522\Installer\setup.exe`（DowngradeCleanupCommand 引用）→ 版本内安装器；
3. `Application\CR_9DCC5.tmp\` → 安装暂存；
4. `Application\imainfo\mini_installer_log.log` + 按日 `*_other_ima_bin.log` → 更新日志（mini_installer_log.log 尾部为二进制混淆内容）；
5. 版本化目录切换：内核升级 = 新建 `150.0.7871.xxxx` 目录 + `Application` 根下少量可复用 DLL 保持（shiply/beacon/bugly/qimei/client_extension 等同时在根目录与版本目录出现）；
6. 载荷（5317）与已安装（5522）的 chrome.dll / resources.pak 体积不同 → 增量更新已发生；
7. `User Data\Last IMA Version`（产品版）与 `Last Version`（内核版）双轨记录。

---

## 16. 主要功能模块与实现路径

1. **外壳与导航**：`ima.copilot.exe`（定制 Chromium）→ 打开 `chrome://home/` 原生壳页；左 rail 的「对话/知识库/笔记/发现/设置」通过 Chrome Messaging 与各扩展通信，扩展以 `chrome://allknowledge`、`chrome://note`、`chrome://history`、`chrome://global_settings` 等私有页面承接。
2. **问答（问问ima 5.20.4）**：扩展负责输入框、消息流、引用卡片；网络请求走 `ima.qq.com` 私有 API（含 `wss://` 流式），依赖登录态 Cookie/Token；另有 bilibili 专有注入（视频总结）。**无法离线复刻**。
3. **知识库（IMA知识库 5.22.5）**：接管 `chrome://allknowledge/`；导入（网页/文件，host_permissions `<all_urls>` + `file:///*/*`）、切片、检索、引用；本地有缓存但检索服务在云端。
4. **笔记（记笔记 4.62.2）**：`chrome://note/` 本地编辑器（`pages/ima-editor.html`）+ Markdown 渲染 + 云端同步 + 游客分享页。
5. **内容查看器族**：markdown / code / txt / PDF / office / epub / 图片 / 音频 / 播客——均为扩展 + 专用渲染器（PDF 用 PDFium，office 前端解析/服务端转换，office CRX 20.7MB 为最大扩展）。
6. **周边**：网页翻译、收藏、历史、脑图（markmap）、HTML 沙箱、录音、用量统计、WASM TTS。
7. **底座能力**：Shiply 增量更新与资源分发、Beacon/Bugly/QIMEI 遥测、ImSDK 消息、`ima_context_menu.dll` 系统右键、`client_extension.dll` + `imaFrame` 权限的原生桥接、`chrome_proxy.exe`。

---

## 17. 逆向局限与未覆盖项

- `chrome.dll` 为 Release 混淆产物（292MB），**未做符号级反编译**；关键路径由字符串/资源/进程与扩展源码推断。
- REA 深度分析受超时与 Windows 卷限制，仅 partial observation（`rea-kb.log` 可见 `capability_unavailable`）。
- 未抓取私有 API 报文（需登录且涉及账号数据），云端问答/检索/同步协议未还原。
- `mini_installer_log.log` 尾部为二进制/混淆内容，未解析。
- 扩展源码可读（`User Data\Default\Extensions`），但业务逻辑大量依赖远程接口与登录态。

---

## 18. 对 Kotlin 复刻的映射

| 原版模块 | 复刻实现 | 状态 |
| --- | --- | --- |
| 外壳 rail + 页面切换（chrome://home） | `MainWindow`（Swing 自绘 84px rail） | 已实装 |
| 问问ima 对话 | `ChatView` + 本地检索引擎 + JSON 持久化 | 已实装（引擎占位） |
| IMA知识库（chrome://allknowledge） | `KnowledgeView` + `KnowledgeBase`（导入/切块/bigram 检索） | 已实装（本地版） |
| 记笔记（chrome://note） | `NotesView`（编辑 + Markdown 实时预览 + 700ms 防抖保存） | 已实装 |
| markdown查看器 | `MarkdownView`（自绘标题/段落/列表/代码/引用/表格/行内样式） | 已实装 |
| IMA设置（chrome://global_settings） | `SettingsView`（主题/数据目录/引擎状态/关于） | 部分实装 |
| 发现（扩展清单） | `DiscoverView` + `Catalog`（24 条实测清单） | 已实装 |
| 云端问答/全网搜索/同步/PDF/office/epub/音视频/TTS | — | 占位（私有后端或需重型依赖） |

### 18.1 手机端 / 平板端映射（同一核心的第二种壳）

原版 ima 没有独立的手机端二进制，其移动侧由扩展页面自适应 + 云端账号承接。复刻版在不引入 Android SDK 的前提下，用「同一 Kotlin 核心 + 本地 HTTP 服务 + 响应式 PWA」把同一套能力开放到手机与平板。

| 项 | 实现 | 状态 |
| --- | --- | --- |
| 服务端 | `web\MobileServer.kt`（JDK 内置 `com.sun.net.httpserver.HttpServer`，端口自动后试 20 个） | 已实装 |
| 数据共享 | 复用 `App` / `Store` / `KnowledgeBase` / `AiEngine` 与同一 `~/.ima-clone`（可用 `-Dima.data` 覆盖） | 已实装 |
| 前端 | `resources\mobile\` 五视图单页（对话/知识库/笔记/发现/设置），零依赖零 CDN | 已实装 |
| 导航形态 | 手机 `<760px` 底部 5 Tab + 会话抽屉；`≥760px` 78px rail；`≥1100px` 展开 208px | 已实装 |
| PWA | `manifest.webmanifest` + `sw.js`（静态壳缓存，`/api/` 永远走网络） | 已实装 |
| 接口 | `/api/state`、`/api/catalog`、`/api/session`、`/api/sessions/*`、`/api/chat`、`/api/notes/*`、`/api/kb/*`、`/api/settings`、`/api/reset` | 已实装 |
| 桌面端影响 | Swing 代码零改动 | — |

启动与验证结论：`runMobile` 任务（或直接 `java -cp ... MobileServerKt`）启动后，6 个静态资源全部 200 且 MIME 正确，11 组 API 全部成功，局域网地址可达；533px 视口下 `.rail` 为 `display:none`、`.tabbar` 为 `display:flex`。详见 `README.md` 第 3.3 节。

---

## 19. 证据索引

| 文件 | 说明 |
| --- | --- |
| `work\chrome-listing.txt` | chrome.7z 完整文件清单（312 文件） |
| `work\chrome-strings-evidence.txt` | chrome.dll 两轮字符串扫描结果 |
| `work\rea-kb.log` | REA 运行日志（能力/超时记录） |
| `work\ima-payload.7z` | 第一层解包产物（200MB） |
| `work\extracted\chrome.7z` | 第二层解包产物（560MB） |
| `assets\ima-window.png` | 原版主窗口截图 |
| `assets\ima-home.png` | 原版首页截图 |
| `assets\ima-kb.png` | 原版知识库截图 |
| `assets\clone-0..4.png` | 复刻版五个页面自测截图 |
| `app\src\main\kotlin\com\ima\clone\core\Catalog.kt` | 24 条扩展清单（实测版本/ID/状态） |
| `app\src\main\kotlin\com\ima\clone\web\MobileServer.kt` | 手机/平板服务端：JDK HttpServer + JSON API + 静态资源托管 |
| `app\src\main\resources\mobile\index.html` | 移动端单页骨架（五视图 + 底部 Tab + rail） |
| `app\src\main\resources\mobile\app.css` | 响应式样式（760 / 900 / 1100 三档断点） |
| `app\src\main\resources\mobile\app.js` | 移动端状态管理与轻量 Markdown 渲染 |
| `app\src\main\resources\mobile\manifest.webmanifest` | PWA 清单（可添加到主屏幕） |
| `app\src\main\resources\mobile\sw.js` | Service Worker（静态壳缓存，`/api/` 走网络） |
| `work\mobile-data\` | 移动端接口冒烟测试使用的独立数据目录（与桌面端隔离） |
| `README.md` 第 3.3 节 | 手机/平板端启动方式、能力对照、断点与接口清单 |

> 注册表实测字段、进程命令行、扩展 manifest 细节均于 2026-11-09 采集自本机实例；相关命令与原始输出见本次会话记录。
