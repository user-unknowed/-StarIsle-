# StarIsle 导入清单

## 一、plan.md §3 · 21 条验收断言速查

- [ ] 1. feat 分支相对于 main：0 M 行（纯新增）
- [ ] 2. StarIsle 根 README.md / .gitignore / docs/README.md SHA 合前合后一致
- [ ] 3. docs/psych-assessment 六文件存在且 size > 0
- [ ] 4. acceptance_check.py 重跑仍 Overall: 100% PASS
- [ ] 5. tokens.json 八色 HEX 与 Spec §4.1 表一致
- [ ] 6. starisle-bridge.css 仅包含 gap/p/m classes + rounded 三档 + btn-primary/secondary/disabled 三态，不含 card 布局样式
- [ ] 7. miniapp-app.wxss 无硬编码色值（全部通过八色 HEX 常量展开）
- [ ] 8. 主按钮禁用态 opacity ≤ 0.45
- [ ] 9. tailwind.preset.js 可 require()，执行 preset.theme.extend.colors.heal.green[600] === '#3C765C'
- [ ] 10. 6 Tool 签名统一 (args, meta) => Promise<{content, isError?}>，且 handler 文件数 = 6
- [ ] 11. scopeGuard mock 对越权 anonymousNo 返回 code 4015
- [ ] 12. submitFeedback msSec 违规返回 ms_sec_blocked 且 DashScope call count === 0
- [ ] 13. reviewFeedback 传 confirm_3 → code 4015 + audit.extras.confirm_3_present = true
- [ ] 14. exportResearch dimension='phone' → 403 pii_forbidden 且导出目录文件数 0
- [ ] 15. accessPII 密码 5 次错误 → 第 6 次 429 password_locked_10min；SMS 5 次/小时 → 第 6 次 429 sms_rate_limited
- [ ] 16. accessPII 成功返 expireAt = now + 30s，mock Date 误差 ≤ 1s
- [ ] 17. piiGate.forceReMask 对 5 个非 accessPII Tool 输出自动置空 name/phone 字段
- [ ] 18. auditLogger stdout JSON 输出行不包含 name/phone/password/otp/sms_code
- [ ] 19. .env.example 仅占位 YOUR_*，不包含 sk- / 手机号 / bcrypt hash / AKIA…
- [ ] 20. package.json deps 包含 @modelcontextprotocol/sdk + crypto-js + qrcode + jsonwebtoken + otplib，devDeps 含 typescript + vitest
- [ ] 21. PR Ready for Review → GitHub Review Decision = APPROVED → Squash Merge main 成功

## 二、手动部署 · §5.1 小程序端（5 条）

- [ ] 1. 微信开发者工具打开 `projects/psych-assessment-miniapp/`，在 `project.private.config.json` 填 `appid` 与 `cloudenv.default.envID`
- [ ] 2. 逐个上传 8 个云函数并 `npm install`：login / classOperate / imageOperate / taskOperate / feedbackSubmit / aiAnalyze / cacheClear / statusOperate（含 crisis）
- [ ] 3. 运行系统图片初始化脚本：`node projects/psych-assessment-miniapp/scripts/seed-images.js`
- [ ] 4. 按 `projects/psych-assessment-miniapp/scripts/create-admin-user.md`，在云开发控制台 users 集合手工写入 admin 记录
- [ ] 5. 真机 34 条用例复跑（安卓基准 / iOS ≥ 4 / 鸿蒙 ≥ 4），参考 `docs/psych-assessment/test-cases-34.md`

## 三、手动部署 · §5.2 MCP 接入 server-services（3 条）

- [ ] 1. `cd server-services/mcp-psych-assessment && cp .env.example .env.local`，填入真键（DASHSCOPE_KEY / WX_CLOUD_MODE / 2FA_SMS_PROVIDER / PII_ADMIN_PASSWORD_PEPPER / PII_ADMIN_PASSWORD_HASH / PII_JWT_SECRET）
- [ ] 2. 聊天后端 dispatcher 集成：MCP Client stdio spawn + metadata.callerRole 透传 + features 开关 + 30s 软清零
- [ ] 3. 重启 server-services，做一次真实 E2E（accessPII 双 2FA → 30s 自动清空 + audit_logs 不含真姓名/手机）

---

导入前核对：Modify = 0（硬红线）
