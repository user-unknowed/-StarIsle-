# 星屿项目变更日志

## [v1.2.0] - 2026-07-16 家长端API安全漏洞修复与接口规范统一

### 安全漏洞修复

| 漏洞类型 | 修复内容 | 影响范围 | 严重程度 |
| :--- | :--- | :--- | :--- |
| 身份验证绕过 | 修复SecurityConfig中所有端点permitAll的安全漏洞，实现基于角色的访问控制（RBAC） | 全部API端点 | 高 |
| 授权缺失 | 为所有Controller添加用户身份校验，防止IDOR（用户A访问用户B数据） | UserController、MoodController、ChatController、RiskController | 高 |
| 输入验证不足 | 添加Jakarta Validation注解（@NotBlank、@Size、@Pattern、@Min、@Max） | 所有请求DTO | 中 |
| CORS配置不当 | 限制CORS允许源为已知域名，禁止通配符 | SecurityConfig | 中 |
| 敏感信息泄露 | 统一API响应格式，隐藏敏感字段，统一错误处理 | 所有控制器 | 中 |

### 新增功能

- ✅ 家长端完整后端API层（注册、登录、孩子绑定、应急预案）
- ✅ 统一API响应包装器 `ApiResponse<T>`
- ✅ 全局异常处理器 `GlobalExceptionHandler`
- ✅ 家长角色认证与授权机制
- ✅ 应急预案与紧急联系人管理

### 技术改进

- **Entity层**: 新增 `ParentUser`、`ParentStudentBinding`、`EmergencyAlert`、`EmergencyResource`
- **Repository层**: 新增4个Repository接口及查询方法
- **Service层**: 新增 `ParentService` 业务逻辑层
- **DTO层**: 统一请求/响应数据传输对象，添加验证注解
- **Controller层**: 新增 `ParentController`，重构所有现有控制器

### API规范统一

- 统一响应格式：`{"code": 200, "message": "success", "data": {...}, "timestamp": "..."}`
- 统一状态码：200(成功)、201(创建)、400(参数错误)、401(未认证)、403(未授权)、404(不存在)、500(服务器错误)
- 统一错误处理：全局异常捕获，参数校验失败返回字段级错误信息

### 提交记录

| 提交SHA | 提交信息 |
| :--- | :--- |
| cd3b05e | security: 家长端API安全漏洞检测与修复，统一接口规范梳理 |
| 88fbd57 | security: 上传Repository和Service层代码 |
| 241e5c3 | security: 上传DTO和Controller层代码 |
| 2b5e1da | security: 上传ParentController和安全配置文件 |
| 01ef7d4 | security: 上传更新后的其他控制器文件 |
| d9d8852 | security: 上传ChatController、RiskController、ContentController和Repository更新 |

---

## [v1.0.0] - 2026-06-27 MVP版本发布

### 新增功能
- ✅ 匿名注册与隐私保护系统
- ✅ 极简心情打卡功能（5档表情）
- ✅ AI星宝对话系统（基于CBT框架）
- ✅ 情绪探索测评（PHQ-9映射）
- ✅ 冥想放松内容（3-5个音频）
- ✅ 风险检测与危机响应机制
- ✅ 端到端加密通信系统

### 技术架构
- ✅ Flutter 3.x跨平台前端应用
- ✅ Go微服务后端架构
- ✅ Python FastAPI AI对话引擎
- ✅ PostgreSQL + MongoDB + Redis数据库
- ✅ Kubernetes容器化部署方案
- ✅ Nginx负载均衡配置

### 安全合规
- ✅ AES-256-GCM端到端加密
- ✅ L1关键词 + L2语义风险检测
- ✅ 数据最小化采集原则
- ✅ 用户数据可导出/删除
- ✅ HTTPS/TLS 1.3全程加密

### 文档体系
- ✅ 完整的API文档
- ✅ 部署指南
- ✅ 开发规范
- ✅ 测试配置文档

### 待完成功能（V1.1）
- ❌ 咨询师匹配与转介系统
- ❌ 家长端应用
- ❌ 学校管理后台
- ❌ 匿名树洞社区
- ❌ CBT自助练习库
- ❌ 游戏化成长体系

---

## 版本规划

### [v1.1.0] - 计划2026年8月
- 咨询师匹配与预约系统
- 家长端小程序
- CBT自助练习库
- 情绪周报/月报

### [v2.0.0] - 计划2026年10月
- 学校管理后台
- 匿名树洞社区
- 游戏化成长体系
- 微信小程序版本
