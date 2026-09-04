# mcp-psych-assessment

心理测评反馈管线 MCP Server（stdio 协议）。

## 6 个 Tool

| Tool | 作用 | 可调用角色 |
| --- | --- | --- |
| `listTasks` | 查询学生/教师测评任务 | student / teacher / admin |
| `submitFeedback` | 学生提交反馈（含微信内容安全预检） | student |
| `aiAnalyze` | DashScope AI 分析反馈（带 token 预算与退避重试） | admin / teacher |
| `reviewFeedback` | 教师复核反馈（含 confirm_3 信任标签校验） | teacher |
| `exportResearch` | 匿名维度研究导出（PII 维度拒绝） | admin / researcher |
| `accessPII` | 双 2FA 授权后访问实名 PII | admin |

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `DASHSCOPE_KEY` DashScope API Key
- `WX_CLOUD_MODE` 微信云开发模式
- `2FA_SMS_PROVIDER` 短信服务提供商
- `PII_ADMIN_PASSWORD_PEPPER` 32 字节随机串
- `PII_ADMIN_PASSWORD_HASH` 经 SHA256(pepper+password) 后的密码哈希
- `PII_ADMIN_TOTP_SECRET` Base32 编码的 TOTP 密钥
- `PII_JWT_SECRET` 32 字节随机串（JWT 签名）
- `PII_ADMIN_SMS_CODE` 测试用 6 位短信验证码或留空

## 启动

```bash
npm install
npm run build
node dist/index.js
```

以 stdio MCP server 方式启动，连接客户端通过 JSON-RPC 调用上述 Tool。
