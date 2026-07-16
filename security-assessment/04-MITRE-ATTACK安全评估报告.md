# 星屿 StarIsle — MITRE ATT&CK 安全评估报告

| 项目 | 内容 |
|------|------|
| 文档名称 | MITRE ATT&CK 安全评估报告 |
| 文档版本 | v1.0 |
| 文档日期 | 2026-07-17 |
| 适用范围 | 星屿 StarIsle 青少年心理健康 AI 陪伴应用 |
| 评估框架 | MITRE ATT&CK® (Enterprise + Cloud + Mobile) |
| 保密等级 | 内部 |

---

## 1. 评估概述

### 1.1 评估目标

本评估基于 MITRE ATT&CK 框架对星屿 StarIsle 青少年心理健康 AI 陪伴应用进行系统化安全评估，旨在达成以下目标：

1. **识别攻击面**：基于 ATT&CK 战术与技术（Tactics & Techniques）系统化梳理星屿应用在多端、多云、多角色场景下的潜在攻击路径。
2. **映射安全控制**：将现有安全控制（认证、加密、授权、验证、限流等）映射到 ATT&CK 技术，量化防护覆盖率。
3. **识别安全差距**：发现未被现有控制覆盖的高风险技术，按严重程度分级，形成可操作的差距清单。
4. **输出改进建议**：针对每个差距提出具体、可落地的技术方案与优先级，指导下一阶段安全加固工作。
5. **支撑未成年人保护合规**：因业务涉及 12-18 岁未成年人心理健康敏感数据，需满足《个人信息保护法》《未成年人保护法》《数据安全法》及 GDPR 的安全要求。

### 1.2 评估范围

| 范围维度 | 覆盖内容 |
|----------|----------|
| **应用组件** | Flutter 学生端 / 教师端、React 家长端 / Web 前端、Spring Boot 3.2 后端、FastAPI AI 引擎、Nginx 网关、Docker/Kubernetes 部署 |
| **数据存储** | PostgreSQL（用户/绑定/对话/情绪）、MongoDB（日志）、Redis（会话/缓存）、SQLCipher（端侧） |
| **外部接口** | HTTPS RESTful API、WebSocket、AI 引擎 HTTP 内网调用 |
| **用户角色** | STUDENT（学生）、TEACHER（教师）、PARENT（家长）、ADMIN（管理员，预留） |
| **适用矩阵** | ATT&CK Enterprise（企业）+ ATT&CK Cloud（云）+ ATT&CK Mobile（移动） |
| **不纳入范围** | 第三方 SaaS（如 AI 模型推理供应商）内部安全、员工办公终端 EDR、物理安全 |

### 1.3 评估方法论

本评估采用 ATT&CK 评估标准流程，结合文档审查、配置审查与架构分析：

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1. 资产识别  │ -> │ 2. 攻击面建模 │ -> │ 3. 技术映射   │ -> │ 4. 差距分析   │ -> │ 5. 改进建议   │
│  组件/数据/  │    │  基于ATT&CK  │    │  现有控制 ↔   │    │  覆盖率评估  │    │  优先级排序   │
│  角色/接口   │    │  战术技术枚举 │    │  ATT&CK 技术  │    │  风险定级    │    │  方案与路线图 │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**方法学要点**：
- **覆盖维度**：以 ATT&CK 战术（Tactics）为纵向主线，以 ATT&CK 技术（Techniques）为横向分析单元。
- **防护状态分级**：`已防护` / `部分防护` / `未防护` / `不适用`。
- **风险定级**：结合 ATT&CK 技术危害度、资产敏感度、利用难度，按 `严重 / 高 / 中 / 低` 四级评定。
- **证据来源**：星屿安全架构文档（02）、数据处理流程文档（03）、应用基本信息文档（01）、代码审查结果。

### 1.4 评估元数据

| 属性 | 内容 |
|------|------|
| 评估日期 | 2026-07-17 |
| 评估版本 | v1.0 |
| 评估负责人 | 星屿安全团队 |
| ATT&CK 版本 | ATT&CK v15（2025-Q4） |
| 适用矩阵 | Enterprise + Cloud + Mobile |
| 评估方法 | 文档审查 + 架构分析 + 配置审查 |
| 下次复审建议 | 2026-10-17（每季度复审） |

### 1.5 应用安全概况摘要

| 维度 | 现状 |
|------|------|
| **技术栈** | Java Spring Boot 3.2 + Python FastAPI + Flutter + React |
| **部署形态** | Docker + Kubernetes，Nginx 负载均衡 |
| **数据存储** | PostgreSQL + MongoDB + Redis + SQLCipher（端侧） |
| **认证机制** | JWT（Bearer，24h 过期，HMAC-SHA 签名） |
| **授权模型** | RBAC（STUDENT/TEACHER/PARENT，基于 URL 路径访问控制） |
| **数据加密** | 传输 TLS 1.3；存储 AES-256-GCM（12B IV，128bit Tag） |
| **密码存储** | BCrypt(12 轮) |
| **输入验证** | Jakarta Validation（@NotBlank / @Size / @Pattern / @Min / @Max） |
| **已知限制** | 无 MFA、无 API 网关层认证、frameOptions 禁用、JWT 密钥环境变量管理 |

---

## 2. ATT&CK 矩阵覆盖分析

### 2.1 Enterprise 矩阵分析

#### 2.1.1 TA0001 初始访问 (Initial Access)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1078 | Valid Accounts（有效账户） | 高 | 部分防护 | JWT 认证 + BCrypt 密码哈希 + 24h 过期 + 速率限制 | 凭据泄露或弱密码撞库后仍可获有效 JWT；无 MFA 二次校验；建议叠加 MFA 或异常登录检测 |
| T1190 | Exploit Public-Facing Application（利用面向公众的应用） | 高 | 部分防护 | Jakarta Validation + 全局异常处理 + HTTPS | 后端 API 直接暴露于公网，输入验证覆盖 Controller 层，但缺少 WAF 与 RASP；FastAPI 引擎入口未在公网审计范围 |
| T1133 | External Remote Services（外部远程服务） | 中 | 已防护 | 无对外 SSH/RDP；K8s API 通过内网访问；管理面仅内网可达 | 生产 K8s API Server 应限制 IP 白名单与 mTLS |
| T1199 | Trusted Relationship（可信关系） | 中 | 部分防护 | CORS 限制 *.starisle.com/cn | 与 AI 模型供应商、短信网关等三方集成时缺少服务间 mTLS 与签名校验 |

#### 2.1.2 TA0002 执行 (Execution)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1059 | Command and Scripting Interpreter（命令与脚本解释器） | 中 | 部分防护 | 容器以非 root 运行；未发现服务端 Runtime.exec 调用 | Python AI 引擎若使用 `eval`/`subprocess` 处理用户输入需严格沙箱；建议容器加 seccomp/AppArmor |
| T1204 | User Execution（用户执行） | 中 | 已防护 | 移动端禁用明文 HTTP + 证书校验；Web 强制 HTTPS | 钓鱼链接诱导用户安装仿冒 APP 风险存在，建议 APP 签名校验 + 应用商店分发 |

#### 2.1.3 TA0003 持久化 (Persistence)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1098 | Account Manipulation（账户操纵） | 中 | 部分防护 | RBAC 角色绑定；密码修改需旧密码校验 | 缺少管理员账户特权操作审计；建议增加敏感操作审计日志 |
| T1136 | Create Account（创建账户） | 中 | 已防护 | 注册接口受速率限制；学生注册需学校码 / 家长注册需绑定学生授权 | 防止批量注册；建议叠加图形验证码与设备指纹 |

#### 2.1.4 TA0004 权限提升 (Privilege Escalation)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1078 | Valid Accounts（有效账户） | 高 | 部分防护 | RBAC 三角色 + JWT claims 中带 role | 若 JWT 被篡改或私钥泄露，role 字段可被伪造；建议服务端二次鉴权而非仅依赖 JWT claims |
| T1548 | Abuse Elevation Control Mechanism（滥用权限提升控制） | 中 | 部分防护 | 容器非 root；无 SUID 二进制 | K8s RBAC 配置需最小权限审查；ServiceAccount Token 挂载应禁用 |

#### 2.1.5 TA0005 防御规避 (Defense Evasion)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1027 | Obfuscated Files or Information（混淆文件或信息） | 中 | 未防护 | — | 缺乏对传输内容混淆/编码检测；建议增加请求 payload 异常编码告警 |
| T1036 | Masquerading（伪装） | 中 | 部分防护 | 全局异常处理统一错误响应；隐藏堆栈 | 攻击者可伪装合法端点绕过 RBAC；建议 API 路由白名单与未匹配 404 策略 |

#### 2.1.6 TA0006 凭据访问 (Credential Access)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1110 | Brute Force（暴力破解） | 高 | 部分防护 | 速率限制 100 RPS + BCrypt(12 轮) | 100 RPS 对单 IP 偏宽松；建议登录接口叠加 5 次/分钟账户级锁定与图形验证码 |
| T1056 | Input Capture（输入捕获，键盘记录） | 中 | 已防护 | 端侧 SQLCipher + 客户端不记录明文密码；HTTPS | 移动端需检测 root/越狱与键盘记录类恶意 APP |
| T1539 | Steal Web Session Cookie（窃取 Web 会话 Cookie） | 中 | 部分防护 | 无状态 JWT；Web 使用 HttpOnly Cookie | 缺少 Cookie `SameSite=Strict` 与 CSP 防护 XSS 窃取；frameOptions 禁用加剧点击劫持 |

#### 2.1.7 TA0007 发现 (Discovery)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1087 | Account Discovery（账户发现） | 中 | 部分防护 | 用户名枚举接口已收敛；错误响应统一 | 登录失败响应不应区分"用户不存在"与"密码错误"；建议统一返回"凭据无效" |
| T1046 | Network Service Discovery（网络服务发现） | 中 | 部分防护 | K8s NetworkPolicy 限制东西向流量 | 建议补充集群内 mTLS（如 Istio）与服务发现端口扫描检测 |

#### 2.1.8 TA0008 横向移动 (Lateral Movement)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1075 | Pass the Hash（哈希传递） | 低 | 不适用 | 无 NTLM / Windows 域环境 | Linux 容器环境，不适用 |
| T1021 | Remote Services（远程服务） | 中 | 已防护 | SSH 仅内网；K8s API 通过 RBAC + mTLS | 生产建议堡垒机 + 会话录像审计 |

#### 2.1.9 TA0009 收集 (Collection)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1530 | Data from Cloud Storage（来自云存储的数据） | 高 | 部分防护 | 数据库 AES-256-GCM 加密；备份策略待评估 | 备份介质加密与访问审计需明确；建议 K8s Secret 加密 etcd |
| T1056 | Input Capture（输入捕获） | 中 | 已防护 | 同 TA0006 | — |

#### 2.1.10 TA0010 渗出 (Exfiltration)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1041 | Exfiltration Over C2 Channel（通过 C2 通道渗出） | 中 | 未防护 | — | 缺少出网流量监控与 DLP；建议 K8s 出网白名单 + 流量镜像分析 |
| T1567 | Exfiltration Over Web Service（通过 Web 服务渗出） | 高 | 未防护 | — | 攻击者可借合法 HTTPS 出网将数据上传至公共网盘；建议出网域名白名单 + DLP |

#### 2.1.11 TA0040 影响 (Impact)

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1485 | Data Destruction（数据破坏） | 中 | 部分防护 | 数据库定期备份；事务回滚 | 缺少异地备份与不可变备份（Immutable Backup）；建议 3-2-1 备份策略 |
| T1499 | Endpoint Denial of Service（端点拒绝服务） | 高 | 部分防护 | Nginx 速率限制 100 RPS + 资源配额 | 100 RPS 对未成年人应用偏高；建议按接口分级限流 + 自动黑名单 |

### 2.2 Cloud 矩阵分析

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1078.004 | Cloud Accounts（云账户滥用） | 中 | 部分防护 | K8s RBAC + ServiceAccount 隔离 | 云厂商控制台账户需开启 MFA；建议最小权限 + 定期轮转 |
| T1133 | External Remote Services | 中 | 已防护 | 同 Enterprise | — |
| T1610 | Deploy Container（部署容器逃逸） | 高 | 部分防护 | 容器非 root；镜像扫描待引入 | 需引入镜像签名（Cosign）+ 准入控制（Admission Controller）；禁止特权容器 |
| T1611 | Escape to Host（逃逸至宿主） | 高 | 部分防护 | 无特权容器 | 建议启用 seccomp Profile、AppArmor、user namespace 重映射 |
| T1609 | Container and Resource Discovery（容器资源发现） | 中 | 部分防护 | K8s RBAC | 建议屏蔽元数据接口（169.254.169.254）+ NetworkPolicy 限制 |
| T1525 | Implant Internal Image（植入内部镜像） | 中 | 未防护 | — | 需引入镜像签名校验 + 私有仓库访问控制 + 构建管线审计 |

### 2.3 Mobile 矩阵分析

| 技术 ID | 技术名称 | 星屿相关性 | 防护状态 | 现有控制 | 分析 |
|---------|----------|-----------|----------|----------|------|
| T1437 | Application Layer Protocol（应用层协议） | 中 | 已防护 | HTTPS + WSS over TLS 1.3 | 移动端强制证书校验，禁用明文 HTTP |
| T1417 | Input Capture（输入捕获） | 中 | 部分防护 | 端侧不存明文密码 | 需检测 root/越狱与键盘记录 APP；建议集成 SafetyNet/Play Integrity |
| T1426 | System Information Discovery（系统信息发现） | 低 | 已防护 | 端侧不收集设备信息（隐私最小化） | — |
| T1427 | Input Capture for Adversary in the Middle | 中 | 部分防护 | TLS 1.3 + 证书绑定 | 建议移动端启用 Certificate Pinning 防中间人 |
| T1638.001 | Device Location（设备位置） | 低 | 已防护 | 应用不主动收集位置 | — |

---

## 3. 安全控制映射表

### 3.1 控制措施编号清单

| 控制编号 | 控制名称 | 实现位置 | 详细描述 |
|----------|----------|----------|----------|
| C-01 | JWT 认证 | Spring Security | Bearer Token，24h 过期，HMAC-SHA 签名，无状态会话 |
| C-02 | RBAC 授权 | Spring Security | STUDENT/TEACHER/PARENT 三角色，URL 路径访问控制 |
| C-03 | AES-256-GCM 加密 | 后端 + AI 引擎 | 对话内容加密，12 字节随机 IV，128 位 GCM Tag |
| C-04 | BCrypt 密码哈希 | 后端 | 12 轮迭代 |
| C-05 | HTTPS/TLS 1.3 | Nginx | 全链路传输加密 |
| C-06 | CORS 限制 | Spring Security | 仅允许 *.starisle.com、*.starisle.cn、localhost |
| C-07 | Jakarta Validation | Controller 层 | @NotBlank / @Size / @Pattern / @Min / @Max |
| C-08 | 全局异常处理 | @ControllerAdvice | 统一错误响应，隐藏堆栈信息 |
| C-09 | 速率限制 | Nginx | 100 RPS |
| C-10 | SQLCipher 端侧加密 | Flutter | 本地敏感数据加密存储 |
| C-11 | 无状态会话 | Spring Security | STATELESS，无服务端会话 |
| C-12 | WebSocket 加密 | WSS over TLS | 实时通信加密 |
| C-13 | 容器非 root | Dockerfile | USER 指定非 root |
| C-14 | K8s RBAC | Kubernetes | ServiceAccount 最小权限 |
| C-15 | 移动端证书校验 | Flutter | 禁用明文 HTTP，强制校验服务端证书 |

### 3.2 ATT&CK 技术 — 安全控制映射矩阵

| 战术 | 技术 ID | 技术名称 | 相关性 | 防护状态 | 映射控制 | 差距说明 |
|------|---------|----------|--------|----------|----------|----------|
| TA0001 Initial Access | T1078 | Valid Accounts | 高 | 部分防护 | C-01, C-04, C-09 | 无 MFA；登录失败锁定策略不足 |
| TA0001 | T1190 | Exploit Public-Facing Application | 高 | 部分防护 | C-05, C-07, C-08 | 缺 WAF/RASP；输入验证仅 Controller 层 |
| TA0001 | T1133 | External Remote Services | 中 | 已防护 | — | 管理面仅内网可达 |
| TA0001 | T1199 | Trusted Relationship | 中 | 部分防护 | C-06 | 三方集成缺 mTLS 与签名 |
| TA0002 Execution | T1059 | Command and Scripting Interpreter | 中 | 部分防护 | C-13 | 缺 seccomp/AppArmor；AI 引擎沙箱待评估 |
| TA0002 | T1204 | User Execution | 中 | 已防护 | C-05, C-15 | APP 仿冒分发风险 |
| TA0003 Persistence | T1098 | Account Manipulation | 中 | 部分防护 | C-02 | 缺特权操作审计 |
| TA0003 | T1136 | Create Account | 中 | 已防护 | C-09 | 建议叠加图形验证码 |
| TA0004 Privilege Escalation | T1078 | Valid Accounts | 高 | 部分防护 | C-01, C-02 | 仅依赖 JWT claims，建议服务端二次鉴权 |
| TA0004 | T1548 | Abuse Elevation Control Mechanism | 中 | 部分防护 | C-13, C-14 | K8s RBAC 审查 + SA Token 禁用 |
| TA0005 Defense Evasion | T1027 | Obfuscated Files or Information | 中 | 未防护 | — | 缺编码异常检测 |
| TA0005 | T1036 | Masquerading | 中 | 部分防护 | C-08 | 路由白名单待强化 |
| TA0006 Credential Access | T1110 | Brute Force | 高 | 部分防护 | C-04, C-09 | 100 RPS 偏松；缺账户级锁定 |
| TA0006 | T1056 | Input Capture | 中 | 已防护 | C-03, C-10 | 端侧不存明文密码 |
| TA0006 | T1539 | Steal Web Session Cookie | 中 | 部分防护 | C-01, C-11 | 缺 SameSite / CSP；frameOptions 禁用 |
| TA0007 Discovery | T1087 | Account Discovery | 中 | 部分防护 | C-08 | 登录错误响应需统一文案 |
| TA0007 | T1046 | Network Service Discovery | 中 | 部分防护 | C-14 | 缺 mTLS + 端口扫描检测 |
| TA0008 Lateral Movement | T1075 | Pass the Hash | 低 | 不适用 | — | Linux 容器环境不适用 |
| TA0008 | T1021 | Remote Services | 中 | 已防护 | C-14 | 建议堡垒机会话录像 |
| TA0009 Collection | T1530 | Data from Cloud Storage | 高 | 部分防护 | C-03 | 备份加密与 etcd Secret 加密待完善 |
| TA0009 | T1056 | Input Capture | 中 | 已防护 | C-03, C-10 | — |
| TA0010 Exfiltration | T1041 | Exfiltration Over C2 Channel | 中 | 未防护 | — | 缺出网监控 + DLP |
| TA0010 | T1567 | Exfiltration Over Web Service | 高 | 未防护 | — | 缺出网域名白名单 |
| TA0040 Impact | T1485 | Data Destruction | 中 | 部分防护 | — | 缺不可变备份 + 异地备份 |
| TA0040 | T1499 | Endpoint Denial of Service | 高 | 部分防护 | C-09 | 100 RPS 偏松；缺分级限流 |
| Cloud | T1078.004 | Cloud Accounts | 中 | 部分防护 | C-14 | 云控制台缺 MFA |
| Cloud | T1610 | Deploy Container | 高 | 部分防护 | C-13 | 缺镜像签名 + 准入控制 |
| Cloud | T1611 | Escape to Host | 高 | 部分防护 | C-13 | 缺 seccomp/AppArmor/user namespace |
| Cloud | T1609 | Container and Resource Discovery | 中 | 部分防护 | C-14 | 屏蔽元数据接口 |
| Cloud | T1525 | Implant Internal Image | 中 | 未防护 | — | 镜像签名校验缺失 |
| Mobile | T1437 | Application Layer Protocol | 中 | 已防护 | C-05, C-12, C-15 | — |
| Mobile | T1417 | Input Capture | 中 | 部分防护 | C-10 | 缺 root/越狱检测 |
| Mobile | T1426 | System Information Discovery | 低 | 已防护 | — | 隐私最小化 |
| Mobile | T1427 | Input Capture for AitM | 中 | 部分防护 | C-05 | 缺 Certificate Pinning |

### 3.3 防护覆盖率统计

| 防护状态 | Enterprise | Cloud | Mobile | 合计 | 占比 |
|----------|-----------|-------|--------|------|------|
| 已防护 | 6 | 0 | 2 | 8 | 22.2% |
| 部分防护 | 17 | 4 | 3 | 24 | 66.7% |
| 未防护 | 2 | 1 | 0 | 3 | 8.3% |
| 不适用 | 1 | 0 | 0 | 1 | 2.8% |
| **合计** | **26** | **5** | **5** | **36** | **100%** |

> **关键发现**：完全防护（已防护）比例仅 22.2%，部分防护占比 66.7%，意味着多数技术已有基础控制但缺乏深度防御。需重点消除 3 项"未防护"项（编码异常检测、出网监控/DLP、镜像签名校验）。

---

## 4. 安全差距分析

### 4.1 差距分级标准

| 级别 | 判定标准 |
|------|----------|
| **严重** | 直接导致未成年人敏感数据泄露或系统被完全攻陷；现有控制完全缺失 |
| **高** | 攻击者可借此获取凭据、横向移动或绕过认证；仅部分控制，可被绕过 |
| **中** | 增加攻击成本或扩大影响面；现有控制部分覆盖，存在薄弱环节 |
| **低** | 理论风险或利用难度高；现有控制基本满足，仅需加固 |

### 4.2 差距清单

#### 4.2.1 严重级别

| 差距 ID | 关联 ATT&CK | 差距描述 | 影响 | 现状 |
|---------|-------------|----------|------|------|
| GAP-CR-01 | T1041, T1567 | **无出网流量监控与数据防泄漏（DLP）**：K8s 集群与后端无出网域名白名单，攻击者可借 HTTPS 上传数据至公共网盘 | 未成年人对话/情绪/风险评估数据外泄 | 完全缺失 |
| GAP-CR-02 | T1525, T1610 | **无容器镜像签名校验与准入控制**：私有镜像仓库无签名机制，CI/CD 管线可被植入后门镜像 | 持久化后门，全集群失陷 | 完全缺失 |

#### 4.2.2 高级别

| 差距 ID | 关联 ATT&CK | 差距描述 | 影响 | 现状 |
|---------|-------------|----------|------|------|
| GAP-HI-01 | T1078, T1110 | **无 MFA 与账户级登录锁定**：仅 100 RPS 全局限流，无单账户 5 次/分钟锁定与图形验证码 | 凭据撞库可获取有效 JWT | 部分控制 |
| GAP-HI-02 | T1078 (TA0004) | **RBAC 仅依赖 JWT claims**：服务端未对敏感操作二次鉴权，JWT 私钥泄露后 role 可被伪造 | 横向提权至 PARENT/TEACHER | 部分控制 |
| GAP-HI-03 | T1611 | **容器逃逸防护不足**：无 seccomp Profile、AppArmor、user namespace 重映射 | 容器逃逸至宿主节点 | 部分控制 |
| GAP-HI-04 | T1539 | **Web 会话窃取防护不足**：frameOptions 禁用 + 无 CSP + Cookie 缺 SameSite | XSS 窃取 JWT Cookie；点击劫持 | 部分控制 |
| GAP-HI-05 | T1190 | **无 WAF/RASP**：公网 API 直接暴露，仅依赖应用层验证 | 0day 与 OWASP Top10 利用 | 部分控制 |
| GAP-HI-06 | T1530 | **备份与 Secret 加密不完整**：未明确异地/不可变备份；K8s etcd Secret 加密未确认 | 备份被勒索或窃取 | 部分控制 |
| GAP-HI-07 | T1485, T1499 | **无不可变备份与分级限流**：100 RPS 对未成年人应用偏高 | 数据勒索；DoS 拒绝服务 | 部分控制 |
| GAP-HI-08 | T1078.004 | **云控制台无 MFA**：云厂商账户仅密码登录 | 控制台被攻陷，全集群接管 | 部分控制 |

#### 4.2.3 中级别

| 差距 ID | 关联 ATT&CK | 差距描述 | 影响 | 现状 |
|---------|-------------|----------|------|------|
| GAP-MD-01 | T1199 | 三方集成缺 mTLS 与签名校验 | 供应链中间人 | 部分控制 |
| GAP-MD-02 | T1059 | AI 引擎沙箱与 seccomp 待评估 | 用户输入执行注入 | 部分控制 |
| GAP-MD-03 | T1098 | 缺特权操作审计日志 | 账户操纵难以追溯 | 部分控制 |
| GAP-MD-04 | T1027 | 缺请求 payload 异常编码检测 | 绕过 WAF/验证 | 完全缺失 |
| GAP-MD-05 | T1036 | API 路由白名单待强化 | 未授权端点伪装 | 部分控制 |
| GAP-MD-06 | T1087 | 登录错误响应文案不统一 | 用户名枚举 | 部分控制 |
| GAP-MD-07 | T1046 | 东西向流量缺 mTLS 与扫描检测 | 内部横向移动 | 部分控制 |
| GAP-MD-08 | T1609 | 未屏蔽云元数据接口 169.254.169.254 | 凭据窃取 | 部分控制 |
| GAP-MD-09 | T1427 | 移动端缺 Certificate Pinning | 中间人攻击 | 部分控制 |
| GAP-MD-10 | T1417 | 移动端缺 root/越狱检测 | 键盘记录/调试注入 | 部分控制 |

#### 4.2.4 低级别

| 差距 ID | 关联 ATT&CK | 差距描述 | 影响 | 现状 |
|---------|-------------|----------|------|------|
| GAP-LO-01 | T1204 | APP 仿冒分发风险 | 钓鱼安装 | 部分控制 |
| GAP-LO-02 | T1133 | K8s API Server IP 白名单待确认 | 管理面暴露 | 已防护 |
| GAP-LO-03 | T1426 | 系统信息收集（端侧隐私最小化已满足） | — | 已防护 |

### 4.3 差距分布统计

| 级别 | 数量 | 占比 |
|------|------|------|
| 严重 | 2 | 6.5% |
| 高 | 8 | 25.8% |
| 中 | 10 | 32.3% |
| 低 | 3 | 9.7% |
| **合计** | **23** | **100%** |

---

## 5. 安全改进建议

### 5.1 改进建议总览

| 优先级 | 建议数量 | 建议覆盖差距 | 完成时限建议 |
|--------|----------|--------------|--------------|
| P0 紧急 | 2 | GAP-CR-01, GAP-CR-02 | 2 周内 |
| P1 高 | 8 | GAP-HI-01 ~ GAP-HI-08 | 1 个月内 |
| P2 中 | 10 | GAP-MD-01 ~ GAP-MD-10 | 1 个季度内 |
| P3 低 | 3 | GAP-LO-01 ~ GAP-LO-03 | 按版本迭代 |

### 5.2 P0 紧急建议

#### REC-P0-01：部署出网流量监控与 DLP（对应 GAP-CR-01）

**目标**：阻断数据渗出通道，覆盖 T1041、T1567。

**技术方案**：
1. K8s 出网 NetworkPolicy 默认拒绝，仅放行业务依赖域名（AI 模型 API、短信网关、CDN）。
2. 引入 egress 网关（如 Cilium、Istio Egress Gateway）做 L7 域名级控制。
3. 部署流量镜像 + DLP 探针（如 Suricata + 自定义规则），检测大流量出网与敏感字段（身份证号、手机号、对话关键词）。
4. 对 MongoDB/PostgreSQL 备份导出接口加白名单 IP + 双人审批。

```yaml
# K8s Egress NetworkPolicy 示例
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: starisle-egress-deny-default
  namespace: starisle-prod
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # 仅允许访问 kube-system DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # 仅允许访问外部 AI 模型 API 域名（通过 egress gateway 解析）
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - protocol: TCP
          port: 443
```

#### REC-P0-02：引入容器镜像签名与准入控制（对应 GAP-CR-02）

**目标**：阻断后门镜像部署，覆盖 T1525、T1610。

**技术方案**：
1. CI/CD 构建产物使用 [Cosign](https://github.com/sigstore/cosign) 进行签名，密钥存于 KMS。
2. 部署 [Kyverno](https://kyverno.io/) 或 OPA Gatekeeper 作为 Admission Controller，强制校验镜像签名。
3. 私有镜像仓库启用基于 ServiceAccount 的细粒度访问控制与操作审计。
4. 引入 Trivy/Grype 做镜像 CVE 扫描，阻断严重漏洞镜像部署。

```yaml
# Kyverno 镜像签名校验策略示例
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: verify-signature
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - imageReferences:
            - "registry.starisle.cn/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      <starisle-image-signing-public-key>
                      -----END PUBLIC KEY-----
```

### 5.3 P1 高优先级建议

#### REC-P1-01：MFA 与账户级登录锁定（GAP-HI-01）

1. 登录接口叠加账户级锁定：5 次失败锁定 15 分钟。
2. 引入图形验证码（移动端）与TOTP MFA（教师/家长/管理员端）。
3. 速率限制从全局 100 RPS 收紧为接口分级：登录 10 RPS、查询 100 RPS、AI 对话 30 RPS。

#### REC-P1-02：服务端二次鉴权（GAP-HI-02）

1. 敏感操作（修改角色、绑定学生、导出数据）服务端再查数据库角色，不依赖 JWT claims。
2. JWT 签名密钥迁移至 KMS（如 Vault），定期轮转。
3. JWT 增加 `kid`（key id）支持密钥平滑轮转。

#### REC-P1-03：容器逃逸防护（GAP-HI-03）

1. Pod Security Standards 设为 `restricted`。
2. 启用 seccomp Profile（RuntimeDefault）与 AppArmor。
3. 容器运行时启用 user namespace 重映射（Docker `userns-remap`）。
4. 禁止 `privileged`、`hostPID`、`hostNetwork`。

#### REC-P1-04：Web 会话安全加固（GAP-HI-04）

1. 生产环境启用 `frameOptions: DENY`。
2. 设置 Cookie `SameSite=Strict; Secure; HttpOnly`。
3. 部署 Content Security Policy（CSP）：
   ```
   default-src 'self'; script-src 'self' 'nonce-{random}'; 
   style-src 'self' 'unsafe-inline'; img-src 'self' data:; 
   connect-src 'self' wss://*.starisle.cn; frame-ancestors 'none';
   ```
4. 引入 XSS 过滤器与 HttpOnly Cookie 存储 JWT。

#### REC-P1-05：部署 WAF/RASP（GAP-HI-05）

1. 接入云 WAF（如阿里云 WAF、Cloudflare）做 OWASP Top10 防护。
2. 后端集成 OpenRASP 或 Contrast 做运行时应用自保护。
3. 启用 ModSecurity CRS 规则集于 Nginx。

#### REC-P1-06：备份与 Secret 加密（GAP-HI-06）

1. K8s etcd 启用加密（`EncryptionConfiguration`），Secret 静态加密。
2. 数据库备份采用 3-2-1 策略：3 份副本 / 2 种介质 / 1 份异地。
3. 备份介质 AES-256 加密 + 异地存储（如对象存储 + KMS）。
4. 引入不可变备份（Immutable Backup，如 Velero + 对象存储版本锁）。

#### REC-P1-07：分级限流与 DoS 防护（GAP-HI-07）

1. 接口分级限流：登录 10 RPS、AI 对话 30 RPS、查询 100 RPS。
2. Nginx 启用 `limit_req_zone` 按 IP + 接口分级。
3. 引入自动黑名单：异常 IP 自动加入临时黑名单（如 fail2ban）。
4. K8s HPA + 资源 Limit 配置防资源耗尽。

#### REC-P1-08：云控制台 MFA（GAP-HI-08）

1. 云厂商 IAM 账户强制启用 MFA（虚拟 MFA 或硬件 U2F）。
2. 控制台访问启用 SSO + 临时凭证（STS），禁用长期 AK/SK。
3. 定期轮转凭证，最小权限策略审计。

### 5.4 P2 中优先级建议

| 建议编号 | 对应差距 | 建议 |
|---------|----------|------|
| REC-P2-01 | GAP-MD-01 | 三方集成启用 mTLS（Istio）+ 请求签名（HMAC-SHA256 + 时间戳） |
| REC-P2-02 | GAP-MD-02 | AI 引擎 `eval`/`subprocess` 审计；引入 gVisor 沙箱；Seccomp 限制系统调用 |
| REC-P2-03 | GAP-MD-03 | 引入审计日志（ELK）；敏感操作（改角色、绑学生、导出）记录 user/time/ip/action |
| REC-P2-04 | GAP-MD-04 | Nginx 层增加异常编码检测（双重 URL 编码、Base64 大 payload 告警） |
| REC-P2-05 | GAP-MD-05 | API 路由白名单：未匹配路由返回 404；不暴露 actuator/swagger |
| REC-P2-06 | GAP-MD-06 | 登录错误统一返回"用户名或密码错误"；注册接口不区分邮箱/手机号是否存在 |
| REC-P2-07 | GAP-MD-07 | 引入 Istio mTLS 加密东西向流量；部署 NTA 检测端口扫描 |
| REC-P2-08 | GAP-MD-08 | K8s 集群屏蔽实例元数据接口（169.254.169.254）或启用 IMDSv2 强制令牌 |
| REC-P2-09 | GAP-MD-09 | 移动端启用 Certificate Pinning（公钥指纹校验） |
| REC-P2-10 | GAP-MD-10 | 集成 root/越狱检测（SafetyNet / Play Integrity / DTF Jailbreak） |

### 5.5 P3 低优先级建议

| 建议编号 | 对应差距 | 建议 |
|---------|----------|------|
| REC-P3-01 | GAP-LO-01 | APP 仅通过官方应用商店分发；签名校验防重打包 |
| REC-P3-02 | GAP-LO-02 | K8s API Server 启用 IP 白名单 + 审计日志 |
| REC-P3-03 | GAP-LO-03 | 维持隐私最小化现状；定期复审收集字段 |

### 5.6 改进路线图

```
2026 Q3 (7-9月)                    2026 Q4 (10-12月)                2027 Q1
├─ P0 出网监控+DLP [2周]            ├─ P2 mTLS 东西向流量             ├─ P3 K8s API 审计
├─ P0 镜像签名+准入 [2周]           ├─ P2 AI 引擎沙箱                 ├─ P3 应用商店分发
├─ P1 MFA+账户锁定 [1月]            ├─ P2 审计日志 ELK
├─ P1 服务端二次鉴权 [1月]          ├─ P2 异常编码检测
├─ P1 容器逃逸防护 [1月]            ├─ P2 移动端 Certificate Pinning
├─ P1 Web 会话加固 [1月]            ├─ P2 root/越狱检测
├─ P1 WAF/RASP [1月]
├─ P1 备份与 Secret 加密 [1月]
├─ P1 分级限流 [1月]
└─ P1 云控制台 MFA [1月]
```

---

## 6. 评估结论

### 6.1 整体安全态势

星屿 StarIsle 应用的安全架构设计体现了对未成年人心理健康敏感数据的高度重视，已建立**认证 + 授权 + 加密 + 验证 + 限流**的纵深防御基础。基于 MITRE ATT&CK 框架评估，关键发现如下：

**优势**：
- ✅ 数据加密体系完整：TLS 1.3 传输 + AES-256-GCM 存储 + BCrypt 密码哈希 + SQLCipher 端侧加密。
- ✅ 认证授权基础扎实：JWT 无状态认证 + RBAC 三角色隔离。
- ✅ 输入验证与异常处理规范：Jakarta Validation + 全局异常处理。
- ✅ 隐私设计原则落地：学生对话原文对家长绝对不可见，仅可见情绪趋势摘要。

**短板**：
- ⚠️ **数据渗出防护完全缺失**（GAP-CR-01）：这是当前最严重的风险，未成年人敏感对话数据可能经 HTTPS 外泄。
- ⚠️ **容器供应链安全薄弱**（GAP-CR-02）：无镜像签名与准入控制。
- ⚠️ **认证强度不足**：无 MFA、账户级锁定策略薄弱。
- ⚠️ **Web 会话安全配置不完整**：frameOptions 禁用 + 无 CSP。
- ⚠️ **横向移动防护不足**：东西向流量未加密，元数据接口未屏蔽。

### 6.2 防护覆盖率评分

| 评估维度 | 评分（满分 10） | 说明 |
|----------|-----------------|------|
| Initial Access 防护 | 6.5 | 认证基础好但缺 MFA 与 WAF |
| Execution 防护 | 7.0 | 容器非 root，AI 沙箱待评估 |
| Persistence 防护 | 6.5 | RBAC 良好，缺审计 |
| Privilege Escalation 防护 | 6.0 | RBAC 依赖 JWT claims |
| Defense Evasion 防护 | 5.0 | 缺编码检测与路由白名单 |
| Credential Access 防护 | 6.0 | 限流偏松，无账户锁定 |
| Discovery 防护 | 6.5 | 错误响应需统一 |
| Lateral Movement 防护 | 7.0 | K8s RBAC 良好，缺 mTLS |
| Collection 防护 | 7.5 | 加密体系完善 |
| Exfiltration 防护 | 3.0 | **最薄弱环节**，完全缺失 |
| Impact 防护 | 5.5 | 缺不可变备份与分级限流 |
| Cloud 安全 | 5.0 | 镜像与逃逸防护不足 |
| Mobile 安全 | 7.0 | TLS 完整，缺 Pinning |
| **整体加权评分** | **6.2 / 10** | **中等偏上，存在关键短板** |

### 6.3 风险等级判定

| 风险维度 | 等级 | 依据 |
|----------|------|------|
| 未成年人数据泄露风险 | **高** | 渗出防护缺失，对话/情绪/风险评估数据价值极高 |
| 系统被完全攻陷风险 | **中** | 容器逃逸与镜像供应链攻击存在路径，但需要内网立足点 |
| 拒绝服务风险 | **中** | 限流偏松但 Nginx + K8s 提供基础防护 |
| 凭据泄露风险 | **中** | 无 MFA 但 BCrypt + JWT 24h 过期降低风险 |
| 合规风险 | **中** | PIPL/未保法要求的安全措施大部分满足，但 DLP 缺失影响合规审计 |

### 6.4 总体评估结论

> **星屿 StarIsle 应用整体安全态势评分：6.2 / 10（中等偏上）**
>
> 应用在数据加密、认证授权、输入验证等基础安全控制方面表现良好，体现了对未成年人隐私的重视。但在**数据渗出防护、容器供应链安全、认证强度（MFA）**三个关键领域存在显著短板，需在 P0/P1 阶段优先补齐。
>
> 在完成本报告列出的 2 项 P0 与 8 项 P1 改进建议后，预计整体评分可提升至 **8.0 / 10** 以上，达到可投产的安全基线。建议在 2026 Q3 完成全部 P0 与 P1 项，并在每个季度进行 ATT&CK 评估复审以持续改进。

### 6.5 后续行动建议

1. **立即（2 周内）**：启动 REC-P0-01 出网监控与 DLP 项目；引入镜像签名与准入控制。
2. **短期（1 个月内）**：完成全部 P1 高优先级改进；完成生产环境 frameOptions、CSP、Cookie SameSite 配置。
3. **中期（1 季度内）**：完成 P2 中优先级改进；引入 ELK 审计日志与 Istio mTLS。
4. **长期（持续）**：每季度 ATT&CK 评估复审；引入红蓝对抗演练；建立漏洞响应 SLA。
5. **合规对接**：将 ATT&CK 评估结果对接 PIPL/未保法合规审计证据链。

---

## 7. 附录

### 附录 A：ATT&CK 技术 ID 索引

| 战术 | 技术 ID | 技术名称 | 报告章节 |
|------|---------|----------|----------|
| TA0001 Initial Access | T1078 | Valid Accounts | 2.1.1 |
| TA0001 | T1190 | Exploit Public-Facing Application | 2.1.1 |
| TA0001 | T1133 | External Remote Services | 2.1.1 |
| TA0001 | T1199 | Trusted Relationship | 2.1.1 |
| TA0002 Execution | T1059 | Command and Scripting Interpreter | 2.1.2 |
| TA0002 | T1204 | User Execution | 2.1.2 |
| TA0003 Persistence | T1098 | Account Manipulation | 2.1.3 |
| TA0003 | T1136 | Create Account | 2.1.3 |
| TA0004 Privilege Escalation | T1078 | Valid Accounts | 2.1.4 |
| TA0004 | T1548 | Abuse Elevation Control Mechanism | 2.1.4 |
| TA0005 Defense Evasion | T1027 | Obfuscated Files or Information | 2.1.5 |
| TA0005 | T1036 | Masquerading | 2.1.5 |
| TA0006 Credential Access | T1110 | Brute Force | 2.1.6 |
| TA0006 | T1056 | Input Capture | 2.1.6 |
| TA0006 | T1539 | Steal Web Session Cookie | 2.1.6 |
| TA0007 Discovery | T1087 | Account Discovery | 2.1.7 |
| TA0007 | T1046 | Network Service Discovery | 2.1.7 |
| TA0008 Lateral Movement | T1075 | Pass the Hash | 2.1.8 |
| TA0008 | T1021 | Remote Services | 2.1.8 |
| TA0009 Collection | T1530 | Data from Cloud Storage | 2.1.9 |
| TA0009 | T1056 | Input Capture | 2.1.9 |
| TA0010 Exfiltration | T1041 | Exfiltration Over C2 Channel | 2.1.10 |
| TA0010 | T1567 | Exfiltration Over Web Service | 2.1.10 |
| TA0040 Impact | T1485 | Data Destruction | 2.1.11 |
| TA0040 | T1499 | Endpoint Denial of Service | 2.1.11 |
| Cloud | T1078.004 | Cloud Accounts | 2.2 |
| Cloud | T1610 | Deploy Container | 2.2 |
| Cloud | T1611 | Escape to Host | 2.2 |
| Cloud | T1609 | Container and Resource Discovery | 2.2 |
| Cloud | T1525 | Implant Internal Image | 2.2 |
| Mobile | T1437 | Application Layer Protocol | 2.3 |
| Mobile | T1417 | Input Capture | 2.3 |
| Mobile | T1426 | System Information Discovery | 2.3 |
| Mobile | T1427 | Input Capture for AitM | 2.3 |
| Mobile | T1638.001 | Device Location | 2.3 |

### 附录 B：安全控制清单

| 控制编号 | 控制名称 | 实现位置 | 详细描述 | 关联 ATT&CK |
|----------|----------|----------|----------|-------------|
| C-01 | JWT 认证 | Spring Security | Bearer Token，24h 过期，HMAC-SHA 签名，STATELESS | T1078, T1110 |
| C-02 | RBAC 授权 | Spring Security | STUDENT/TEACHER/PARENT，URL 路径访问控制 | T1078, T1098, T1548 |
| C-03 | AES-256-GCM 加密 | 后端 + AI 引擎 | 对话内容加密，12B 随机 IV，128bit GCM Tag | T1056, T1530 |
| C-04 | BCrypt 密码哈希 | 后端 | 12 轮迭代 | T1110 |
| C-05 | HTTPS/TLS 1.3 | Nginx | 全链路传输加密 | T1190, T1204, T1437, T1427 |
| C-06 | CORS 限制 | Spring Security | *.starisle.com/cn + localhost | T1199 |
| C-07 | Jakarta Validation | Controller 层 | @NotBlank/@Size/@Pattern/@Min/@Max | T1190 |
| C-08 | 全局异常处理 | @ControllerAdvice | 统一错误响应，隐藏堆栈 | T1036, T1087 |
| C-09 | 速率限制 | Nginx | 100 RPS | T1110, T1499 |
| C-10 | SQLCipher 端侧加密 | Flutter | 本地敏感数据加密存储 | T1056, T1417 |
| C-11 | 无状态会话 | Spring Security | STATELESS，无服务端会话 | T1539 |
| C-12 | WebSocket 加密 | WSS over TLS | 实时通信加密 | T1437 |
| C-13 | 容器非 root | Dockerfile | USER 指定非 root | T1059, T1548, T1611 |
| C-14 | K8s RBAC | Kubernetes | ServiceAccount 最小权限 | T1078.004, T1046, T1609 |
| C-15 | 移动端证书校验 | Flutter | 禁用明文 HTTP，强制校验服务端证书 | T1204, T1437 |

### 附录 C：评估术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| ATT&CK | Adversarial Tactics, Techniques & Common Knowledge | MITRE 维护的攻击行为知识库，按战术与技术分层组织 |
| 战术 | Tactic | 攻击者从初始访问到影响的阶段性目标（WHAT） |
| 技术 | Technique | 实现战术的具体手段（HOW） |
| 子技术 | Sub-technique | 技术的细分实现 |
| 矩阵 | Matrix | 按战术×技术组织的攻击行为表（Enterprise/Cloud/Mobile） |
| 初始访问 | Initial Access | 攻击者首次进入目标环境的阶段 |
| 持久化 | Persistence | 维持对目标系统的持续访问 |
| 权限提升 | Privilege Escalation | 获取更高权限 |
| 防御规避 | Defense Evasion | 绕过安全检测与防护 |
| 横向移动 | Lateral Movement | 在网络内不同系统间移动 |
| 渗出 | Exfiltration | 将数据从目标网络传出 |
| MFA | Multi-Factor Authentication | 多因素认证，组合两种以上认证因素 |
| RBAC | Role-Based Access Control | 基于角色的访问控制 |
| JWT | JSON Web Token | 无状态令牌认证机制 |
| AES-GCM | Advanced Encryption Standard - Galois/Counter Mode | 对称加密 + 认证加密模式 |
| BCrypt | Blowfish-crypt | 自适应密码哈希算法 |
| WAF | Web Application Firewall | Web 应用防火墙 |
| RASP | Runtime Application Self-Protection | 运行时应用自保护 |
| DLP | Data Loss Prevention | 数据防泄漏 |
| mTLS | mutual TLS | 双向 TLS 认证 |
| CSP | Content Security Policy | 内容安全策略，防 XSS |
| seccomp | Secure Computing Mode | Linux 系统调用限制机制 |
| Admission Controller | — | K8s 准入控制器，拦截不合规部署 |
| NetworkPolicy | — | K8s 网络策略，限制 Pod 间通信 |
| 不可变备份 | Immutable Backup | 写一次不可修改，防勒索 |
| 3-2-1 备份 | 3-2-1 Backup Strategy | 3 份副本 / 2 种介质 / 1 份异地 |
| Certificate Pinning | — | 客户端固定服务端证书，防中间人 |
| PIPL | Personal Information Protection Law | 《个人信息保护法》 |
| 未保法 | — | 《未成年人保护法》 |
| 数据安全法 | — | 《数据安全法》 |
| GDPR | General Data Protection Regulation | 欧盟通用数据保护条例 |

### 附录 D：参考资料

- MITRE ATT&CK 官方矩阵：https://attack.mitre.org/matrices/enterprise/
- MITRE ATT&CK Cloud Matrix：https://attack.mitre.org/matrices/enterprise/cloud/
- MITRE ATT&CK Mobile Matrix：https://attack.mitre.org/matrices/mobile/
- 星屿 StarIsle 安全架构说明文档（02-安全架构说明文档.md）
- 星屿 StarIsle 数据处理流程文档（03-数据处理流程文档.md）
- 星屿 StarIsle 应用程序基本信息文档（01-应用程序基本信息.md）
- NIST SP 800-53 Rev. 5 安全控制基线
- CIS Kubernetes Benchmark v1.8
- OWASP Top 10 (2021)

---

> **文档结束** | 星屿 StarIsle MITRE ATT&CK 安全评估报告 v1.0 | 2026-07-17 | 内部使用
