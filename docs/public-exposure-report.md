# StarIsle 公网暴露方案与实测报告

日期：2026-11-21
范围：backend-java 网关（8081，`/api/v1/...`）、ai-engine（8000）、部署配置
结论：同意门禁、单入口架构、TLS/限流/CORS、管理端点关闭均已实现并在本地实测通过；**真实公网入口尚未开通**（缺域名/证书或隧道账号授权，见第六节）。

---

## 一、端点分层清单

### 第 1 档：公网可匿名访问（不含个人数据）

| 端点 | 说明 |
|---|---|
| `GET /health` | 健康检查 |
| `GET /error` | 错误页 |
| `POST /api/v1/auth/register` / `login` | 注册、登录 |
| `POST /api/v1/users/register` / `login` | 学生/教师注册、登录 |
| `POST /api/v1/parents/register` / `login` | 家长注册、登录 |
| `GET /api/v1/content/**` | 冥想内容、呼吸练习（纯内容） |
| `GET /api/v1/chat/topics` | 推荐话题卡片 |
| `GET /api/v1/risk/crisis/hotlines` | 危机热线（公益信息） |
| `GET /api/v1/assessment/questions/**` | 测评问卷题干（不含结果） |
| `GET /api/v1/consent/policy` | 隐私政策/同意范围说明（同意前必须可见） |

### 第 2 档：需登录（仅本人，无需额外同意）

| 端点 | 角色 | 说明 |
|---|---|---|
| `GET /api/v1/consent`、`POST /grant`、`POST /revoke`、`GET /audit` | 所有 | 同意管理只能操作本人 |
| `GET/PUT/DELETE /api/v1/users/{id}`、`GET /{id}/export` | 所有 | 仅本人 |
| `POST /api/v1/risk/detect`、`GET /api/v1/risk/level/{userId}` | 所有 | 仅本人 |
| `POST /api/v1/risk/crisis/report` | 所有 | |
| `GET /api/v1/parents/me`、绑定/解绑/授权、紧急预警与资源 | PARENT | 孩子心情/风险另有第 3 档门禁 |

### 第 3 档：需本人显式同意（未同意返回 403 code=40301，绝不返回空数据）

| 端点 | 同意范围 |
|---|---|
| `POST /api/v1/chat/message` | CHAT_MEMORY（对话记忆与对话历史） |
| `GET /api/v1/chat/history/{userId}` | CHAT_MEMORY |
| `POST /api/v1/mood/checkin` | MOOD（心情记录） |
| `GET /api/v1/mood/history/{userId}`、`GET /api/v1/mood/chart/{userId}` | MOOD |
| `POST /api/v1/assessment/submit` | ASSESSMENT（心理测评结果） |
| `GET /api/v1/assessment/result/{id}` | ASSESSMENT |
| `GET /api/v1/parents/children`、`/children/{bindingId}` | GUARDIAN_MOOD_VIEW（学生本人授权 + 绑定已由学生授权） |

### 永不公开（双闸门）

- `POST /api/migration/**`（execute/verify/checksum/keys/rotate/add/encrypt/test）
- `GET /actuator/**`
- `GET /h2-console/**`
- 未在 SecurityConfig 显式声明的路径一律 `denyAll()`
- nginx 层额外显式 `return 404` 阻断以上前缀，即使应用配置出错也不会到达网关

### ai-engine（8000）端点

除 `GET /health` 外全部要求 `X-Internal-Token`（缺令牌返回 401 `{"detail":"internal service only"}`），包括 `/chat`、`/risk/check`、`/emotion/analyze`、`/topics`、`/ws/chat/{user_id}`、`/knowledge/**`、`/skills/status`。默认绑定 `127.0.0.1`，容器内 `0.0.0.0` 但仅存在于内网，无公网端口映射。

---

## 二、同意门禁实现

- **范围**：四个 scope（CHAT_MEMORY / MOOD / ASSESSMENT / GUARDIAN_MOOD_VIEW），每个 scope 有 displayName 与用途说明，`GET /api/v1/consent/policy` 公开可读。
- **有效期与版本**：`ConsentRecord` 记录 grantedAt / expiresAt / policyVersion（当前 `2026-11-21`）；默认 180 天，上限 365 天。
- **记录与撤回**：`POST /grant` `{scope, ttlDays}`、`POST /revoke` `{scope}`；撤回即置 `revokedAt=now`、`expiresAt=now`，**立即失效**（已实测：撤回后下一次请求即 403）。
- **审计留痕**：`ConsentAuditLog` 仅追加，记录 GRANT / REVOKE / DENIED、scope、policyVersion、clientIp、userAgent、detail；`GET /api/v1/consent/audit` 可查本人记录。
- **明确错误码**：未同意返回 HTTP 403 + `{"code":40301,"message":"CONSENT_REQUIRED: ...","data":{scope, policyVersion, grantEndpoint, statusEndpoint}}`；家长场景另带 `reason=STUDENT_CONSENT_MISSING|BINDING_NOT_AUTHORIZED` 与 `blockedBindings` 明细。
- **防冒用**：测评提交的用户 ID 一律取登录态，忽略请求体中的 userId（已实测：body 伪造 userId 被忽略）。
- **防泄露修复**：家长绑定/授权接口的响应不再返回 `latestMood/riskLevel/lastCheckinDate`（此前未授权即回传心情与风险，属隐私泄露，已修复并实测为 null）。

---

## 三、公网架构与加固

```
公网 ──> [nginx 唯一入口 80/443] ──> backend-java 网关(容器内 8080)
                                        └──> ai-engine(内网 8000，需 X-Internal-Token)
                                        └──> postgres/mongodb/redis（仅容器内网）
```

- **单入口**：docker-compose 中仅 nginx 映射 80/443；backend 改为 `127.0.0.1:8081:8080`；ai-engine 与三个数据库只 `expose`，无宿主端口。
- **TLS**：nginx 仅 TLS 1.2/1.3 + HSTS；网关另有 `application-public.yml` 可选自带 TLS（PKCS12，TLS1.2/1.3）。
- **限流**：双层——nginx `limit_req` 20r/s + 网关内 `RateLimitFilter` 令牌桶（键=IP+登录用户，超限 429 `code=42900`）；公网 profile 默认 rps=20/burst=40、`trust-proxy=true`。
- **CORS 白名单**：`CORS_ALLOWED_ORIGINS` 显式配置；通配时禁止凭证；未允许来源不带 `Access-Control-Allow-Origin`。
- **管理端点关闭**：网关内需 `X-Admin-Token` 且 `admin-enabled=true`（公网 profile 硬编码 false，默认关闭）；nginx 直接 404 阻断。
- **ai-engine 收紧**：除 `/health` 全端点需内部令牌；WebSocket 握手前校验 `x-internal-token`，失败 close(1008)；无 CORS 白名单时不注册 CORS 中间件。
- **网关 WebSocket**：`/ws/chat/{userId}` 握手校验 JWT、userId 与路径一致、Origin 白名单。

---

## 四、实际改动文件清单

**backend-java 新增**
- `consent/ConsentScope.java`、`entity/ConsentRecord.java`、`entity/ConsentAuditLog.java`
- `repository/ConsentRecordRepository.java`、`repository/ConsentAuditLogRepository.java`
- `service/ConsentService.java`、`controller/ConsentController.java`
- `exception/ConsentRequiredException.java`
- `config/RateLimitFilter.java`、`config/WebSocketAuthInterceptor.java`
- `src/main/resources/application-public.yml`

**backend-java 修改**
- `config/SecurityConfig.java`（最小放行 + 管理端点双闸门 + denyAll 兜底 + 统一 401/403 JSON）
- `config/AppConfig.java`（consent/rate-limit/admin/CORS/AI token 配置）
- `config/GlobalExceptionHandler.java`（ConsentRequiredException → 403/40301；兜底异常落日志）
- `config/WebSocketConfig.java`（握手鉴权）
- `controller/ChatController.java`、`MoodController.java`、`AssessmentController.java`（重写）、`ParentController.java`（门禁 + `toBindingSummary` 防泄露）
- `service/ChatService.java`（转发 ai-engine 时带 `X-Internal-Token`）
- `src/main/resources/application.yml`

**ai-engine 修改**
- `app/main.py`：内部令牌中间件、CORS 白名单化、WebSocket 令牌校验、默认绑定 127.0.0.1

**部署**
- `server-services/deployment/docker-compose.yml`：端口隔离 + nginx 服务 + 安全环境变量
- `server-services/deployment/nginx/nginx.conf`：重写为单入口公网配置（TLS、限流、管理路径 404 阻断、WebSocket 代理）

---

## 五、实测结果（HTTP 8081 本地实例，全部真实响应）

### 未登录 / 匿名
| 请求 | 实际响应 |
|---|---|
| `GET /health` | 200 `{"status":"healthy","service":"starisle-api","version":"1.0.0"}` |
| `GET /api/v1/consent/policy` | 200，含 4 个 scope 说明与撤回路径 |
| `GET /api/v1/chat/topics` | 200 |
| `GET /api/v1/content/meditations` | 200 |
| `GET /api/v1/assessment/questions/phq9` | 200 |
| `GET /api/v1/chat/history/u1` | **401** `{"code":401,"message":"请先登录"}` |
| `GET /api/v1/mood/history` | **401** |
| `GET /api/migration/keys` | **401** |
| `GET /api/migration/keys` + 正确 `X-Admin-Token`（但 admin 默认关闭） | **401**（双闸门第二层生效） |
| `GET /actuator/health` | **401** |
| `GET /h2-console` | **401** |

### 同意门禁（登录学生）
| 请求 | 实际响应 |
|---|---|
| `POST /chat/message` 未同意 | **403** `{"code":40301,"message":"CONSENT_REQUIRED: 未获得本人对 CHAT_MEMORY 的授权","data":{scope,policyVersion,grantEndpoint,statusEndpoint}}` |
| `GET /chat/history/{uid}` 未同意 | **403** 同上 |
| `POST /mood/checkin` 未同意 | **403** `... 未获得本人对 MOOD 的授权` |
| `POST /assessment/submit` 未同意（body 伪造他人 userId） | **403** `... 未获得本人对 ASSESSMENT 的授权` |
| `POST /consent/grant CHAT_MEMORY` | 200，expiresAt=+30天 |
| `POST /chat/message` 已同意 | 200，真实模型回复（model=sft_xiaoxing_v1/final_model，22.2s） |
| `POST /consent/revoke` | 200 `"已撤回，授权立即失效"` |
| `POST /chat/message` 撤回后 | **403** 40301（立即失效） |
| `GET /consent/audit` | 200，可见 GRANT/REVOKE/DENIED、clientIp、detail |
| 测评已同意提交（body 伪造 userId） | 200，`user_id` 为登录本人、返回真实 result_id |
| `GET /assessment/result/{id}` 本人 | 200 |
| 撤回 ASSESSMENT 后再提交/查结果 | **403** 40301 |

### 家长查看孩子
| 请求 | 实际响应 |
|---|---|
| `POST /parents/children/bind` | 200，**latestMood/riskLevel/lastCheckinDate 均为 null**（修复后） |
| `POST /parents/children/{id}/authorize` | 200，同样不含隐私字段 |
| `GET /parents/children`（学生未同意） | **403** 40301 + `reason=STUDENT_CONSENT_MISSING` + `blockedBindings` 明细 |
| 学生授予 GUARDIAN_MOOD_VIEW 后 | 200，含 latestMood/riskLevel |

### 加固实测
| 项目 | 结果 |
|---|---|
| CORS 允许来源（localhost:3000 预检） | 200，`Access-Control-Allow-Origin: http://localhost:3000` |
| CORS 未允许来源（evil.example.com） | 403，无 ACAO 头 |
| 限流（400 并发请求，默认 100rps/burst200） | 208×200 / 192×429，429 体 `{"code":42900,"message":"RATE_LIMITED: 请求过于频繁"}` |
| 公网 profile（8443，20rps） | 44×200 / 36×429 |
| ai-engine 直连无令牌 | **401** `{"detail":"internal service only"}` |
| ai-engine 带令牌 | 200 |
| 网关经内部令牌转发 chat | 200，真实模型回复 |
| TLS：`https://127.0.0.1:8443/health` | 200 + `Strict-Transport-Security` 头 |
| 明文 HTTP 访问 TLS 端口 | 拒绝（requires TLS） |
| 公网 profile CORS（app.example.com） | 200 + ACAO 正确 |
| 公网 profile 管理端点 | 401 |

---

## 六、公网通道说明与局限

**当前状态：代码与配置层面的公网就绪工作全部完成，但真实公网入口尚未开通。**

可选通道（需你选择其一并提供凭据，我不会擅自注册账号或使用第三方临时隧道）：

1. **自建 VPS + 域名（推荐，已备好配置）**：执行 `server-services/deployment` 的 docker-compose + nginx 单入口配置即可；需要：一台带公网 IP 的服务器、一个域名、该域名的 TLS 证书（或 DNS 指向服务器后用 certbot 签发），并将 `nginx/ssl/starisle.crt|key` 与 `.env` 就位。局限：需自运维服务器与证书续期；本机性能影响模型推理速度。
2. **Cloudflare Tunnel**：需要 Cloudflare 账号授权与域名托管，免公网 IP；局限：依赖第三方服务，需登录授权，通道带宽与延迟受其影响。
3. **cpolar / 花生壳等内网穿透**：需要账号 authtoken；局限：免费档带宽/并发低、域名随机、生产不建议。
4. **应用层直挂网关 8443 + 端口映射（不推荐）**：仅需证书即可 TLS 直接对外（已实测可用），但没有 nginx 层限流与管理路径阻断，防护更弱。

请提供：所选通道 + 域名 + 证书/账号授权。收到后我再执行公网打通与公网实测（从外部地址访问并记录真实响应）。

---

## 七、约束核对

- 未提交、未外泄任何密钥、`.env`、模型私有数据、督导个案库。
- 隐私数据默认拒绝：未同意一律 403 + 明确错误码，不返回空数据。
- 未擅自纳入公开范围的端点一律 `denyAll()` + nginx 404 双闸门。
- 公网清单仅含第一节列明的端点。
