# 文档一致性修复计划（README / Wiki / Code-Wiki）

> 制定日期：2026-08-30
> 基准文档（最新版本）：`/workspace/README.md`（v2.0 · 小星形象增强版，2026-08-29）

---

## 一、仓库调研结论

### 1.1 需对比的核心文档清单

| 文件路径 | 当前标注版本 | 标注更新日期 | 状态 |
|----------|-------------|-------------|------|
| `/workspace/README.md` | v2.0（小星形象增强版） | 2026-08-29 | ✅ **基准（最新）** |
| `/workspace/wiki.md` | MVP v1.5 | 2026-08-01 | ❌ 落后 3 个大版本 |
| `/workspace/docs/code-wiki/README.md` | MVP v1.4 | 2026-07-30 | ❌ 落后 4 个大版本 |
| `/workspace/docs/code-wiki/architecture.md` | 未标注版本 | - | ❌ 缺失 v1.5–v2.0 内容 |
| `/workspace/docs/code-wiki/modules.md` | 未标注版本 | - | ❌ 目录结构与技术栈过时 |
| `/workspace/docs/code-wiki/key-classes.md` | 未标注版本 | - | ❌ 缺失新类/新接口 |
| `/workspace/docs/code-wiki/dependencies.md` | 未标注版本 | - | ❌ 依赖/数据库描述不一致 |
| `/workspace/docs/code-wiki/running.md` | 未标注版本 | - | ❌ `.env.template` 路径错误 |
| `/workspace/docs/code-wiki/api-reference.md` | 未标注版本 | - | ❌ 家长端 API 路径不一致 |

### 1.2 已识别的不一致分类（按严重程度）

#### **严重（事实错误 / 路径错误）**
1. **`.env.template` 路径错误**：所有文档均写 `server-services/deployment/.env.template`，但实际文件位于 `server-services/.env.template`
2. **家长端绑定 API 路径不一致**：
   - `wiki.md`：`POST /api/v1/parents/children`
   - `api-reference.md`：`POST /api/v1/parents/bind`
   - 需核对后端 `ParentController.java` 实际路由后统一
3. **数据库描述冲突**：
   - README 架构图标注 PostgreSQL
   - wiki / code-wiki 部署架构图标注 MySQL
   - code-wiki/running.md 同时支持 PostgreSQL 和 MySQL 切换，应统一为「支持 H2/PostgreSQL/MySQL，开发默认 H2，Docker 默认 MySQL」

#### **高（缺失 v2.0 核心功能）**
4. **缺失 v2.0 小星 Skill 架构**：wiki 与全部 code-wiki 文档均未提及 Skill Adapter、SkillRouter、`/skills/status` API
5. **缺失 v2.0 GitHub Fork 三层集成**：代码能力层 + RAG 知识层 + 训练语料层
6. **缺失 v2.0 训练流水线（M1–M4 + Orchestrator）**：7 个新脚本、20 项单元测试
7. **缺失 v2.0 AI 训练技术栈**：PEFT + Accelerate、Datasets + Evaluate、GitPython + LangDetect
8. **缺失 v2.0 新增指标**：技能激活率、去标签化合规率、红线词零容忍

#### **中（缺失 v1.5–v1.9 功能更新）**
9. **缺失 v1.5 三端紧急帮助按钮 + 前端危机关键词检测**
10. **缺失 v1.5 家长端完整应急预案（红色告警全屏阻断 + 二次确认 + 超时升级）**
11. **缺失 v1.6 关键词扩充（11→28 个）+ 持续时间规则（L1.5 文本 + L1.6 心情历史）**
12. **缺失 v1.7–v1.9 风险检测优化（分层重构、积极词降级、社交孤立降级，准确率 80%→100%）**
13. **缺失 AES 加密密钥默认值修复（41→32 字节）**

#### **低（目录结构 / 组件清单过时）**
14. **web-frontend 目录结构过时**：缺失 `pages/parent/`（5 个文件）、`store/parentStore.ts`、`store/apiDebugStore.ts`、`components/common/EmergencyHelpButton.tsx`、`components/common/ErrorBoundary.tsx`、`components/dev/ApiDebugOverlay.tsx`
15. **AI 引擎目录结构过时**：缺失 `app/skills/`、`app/models/knowledge.py`、`app/services/knowledge_service.py`、`app/utils/db_connection.py`、`scripts/`（7 个新脚本）、`tests/`（20 项测试）、`data/forked_repos/`、`models/pretrained_english/`
16. **web-frontend 路由表过时**：`key-classes.md` 缺失家长端 5 条路由
17. **AI 引擎 API 过时**：`key-classes.md` 缺失 `GET /skills/status` 端点
18. **code-wiki 文档缺少版本历史 / 变更日志章节**

---

## 二、待修改文件与模块

| 序号 | 文件 | 修改类型 | 主要工作量 |
|------|------|---------|-----------|
| 1 | `/workspace/wiki.md` | 大规模更新 | 版本头→v2.0、核心功能补充 v1.5–v2.0、技术栈补全 AI 训练依赖、补充小星训练流水线章节、补充 v2.0 FAQ、更新版本历史 |
| 2 | `/workspace/docs/code-wiki/README.md` | 大规模更新 | 版本头→v2.0、技术栈表补 AI 训练依赖、核心功能补 v1.5–v2.0 标记 |
| 3 | `/workspace/docs/code-wiki/architecture.md` | 中规模更新 | 技术选型理由补 PEFT/Accelerate 等、数据层统一说明多数据库支持、安全架构补 v1.5 前端检测说明 |
| 4 | `/workspace/docs/code-wiki/modules.md` | 大规模更新 | web-frontend 目录补 parent/ + 新 store/component、AI 引擎目录补 skills/ + knowledge + 新 scripts/tests、补 v2.0 训练脚本说明、AI 引擎依赖补 PEFT 等 |
| 5 | `/workspace/docs/code-wiki/key-classes.md` | 中规模更新 | App.tsx 路由补家长端 5 条、补 EmergencyHelpButton/ErrorBoundary/ApiDebugOverlay、AI 引擎补 SkillRouter/BaseSkill/KnowledgeService、补 `/skills/status` API |
| 6 | `/workspace/docs/code-wiki/dependencies.md` | 中规模更新 | Docker Compose 启动顺序对齐 README、Python 依赖补 PEFT 等、AI 引擎外部服务补知识库 RAG 接口 + skills/status |
| 7 | `/workspace/docs/code-wiki/running.md` | 小规模更新 | **修复 `.env.template` 路径**、补 v2.0 训练流水线启动命令、补 `/skills/status` 验证命令 |
| 8 | `/workspace/docs/code-wiki/api-reference.md` | 中规模更新 | **统一家长端绑定路径**（核对后端后修正）、补家长端 authorize 路径、补 AI 引擎 `GET /skills/status`、补 v1.6 风险等级说明的 L1.5/L1.6 规则注解 |

---

## 三、具体修改步骤

### 步骤 1：事实核对（执行前置）
1.1 核对 `backend-java/src/main/java/com/starisle/controller/ParentController.java` 实际绑定路径，确认 `/api/v1/parents/children` vs `/api/v1/parents/bind` 哪个正确
1.2 核对 `server-services/deployment/` 目录确认 `.env.template` 是否存在；确认 `server-services/.env.template` 为真实位置
1.3 核对 `backend-java/src/main/resources/application.yml` 的 AES 密钥默认值（确认 32 字节）
1.4 核对 `web-frontend/src/App.tsx` 的路由表，确认家长端路径

### 步骤 2：更新 `/workspace/wiki.md`（最大文档）
2.1 版本头：MVP v1.5 → v2.0，更新日期→2026-08-29
2.2 §1.2 核心功能：学生端补「小星 Skill 自适应能力」v2.0 标记；家长端补「告警超时升级机制」v1.5 标记
2.3 §1.3 技术栈：补 LangChain 版本、补 3 行 AI 训练技术栈（PEFT + Accelerate、Datasets + Evaluate、GitPython + LangDetect）
2.4 §7 AI 引擎：
   - 目录结构补 `skills/`、补 `models/knowledge.py`、补 `services/knowledge_service.py`、补 `utils/db_connection.py`
   - 补 scripts/ 下 7 个 v2.0 训练脚本
   - 补 tests/ 单元测试说明
   - 核心依赖补 7 项训练依赖
   - §7.4 风险检测补 v1.6 关键词分类（28 个）+ L1.5/L1.6 持续时间规则 + v1.7–v1.9 分层/降级规则
   - §7.5 知识库 RAG 补 `source_repo_id` 字段说明
   - 补 §7.8 Skill 架构章节（BaseSkill、SkillRouter、/skills/status）
   - 补 §7.9 小星训练流水线（Orchestrator 6 步 + 显存降级链 + smoke 用法）
2.5 §9 API 速查：补 AI 引擎 `GET /skills/status`；修正家长端绑定路径（基于步骤 1.1 结论）
2.6 §10 部署指南：**修正 `.env.template` 路径**
2.7 §12 FAQ：补 v2.0 新增 3 条 FAQ（训练流水线、Fork 接入、无 GPU 训练）
2.8 末尾补完整版本历史（v1.0–v2.0，对齐 README.md）

### 步骤 3：更新 `/workspace/docs/code-wiki/README.md`
3.1 版本：MVP v1.4 → v2.0；最后更新→2026-08-29
3.2 技术栈总览：补 AI 训练 3 行（PEFT/Accelerate、Datasets/Evaluate、GitPython/LangDetect）
3.3 仓库结构：补 `server-services/ai-engine/scripts/`（训练脚本）、`server-services/ai-engine/tests/`、`server-services/ai-engine/app/skills/`（技能适配器）
3.4 核心功能：补 v1.5 紧急帮助按钮、v2.0 小星 Skill 自适应能力

### 步骤 4：更新 `/workspace/docs/code-wiki/architecture.md`
4.1 数据层表格：补「支持 H2（开发）/ PostgreSQL（测试）/ MySQL（生产）三档切换」说明
4.2 §3.2 AI 引擎职责：补「Skill 路由、GitHub Fork 三层集成、训练流水线（可选）」
4.3 技术选型理由表：补 PEFT（LoRA 微调显存节省）、Accelerate（分布式训练）、Datasets（训练数据统一格式）3 行

### 步骤 5：更新 `/workspace/docs/code-wiki/modules.md`
5.1 §2 web-frontend 目录结构：
   - `pages/` 下补 `parent/` 子树（ParentHome/ParentChat/ParentEmergency/ParentChildren/ParentProfile）
   - `store/` 下补 `parentStore.ts`、`apiDebugStore.ts`
   - `components/common/` 下补 `EmergencyHelpButton.tsx`、`ErrorBoundary.tsx`
   - `components/dev/` 下补 `ApiDebugOverlay.tsx`
5.2 §3 AI 引擎：
   - 目录结构补 `app/skills/`（`base_skill.py`、`skill_router.py`、`*_adapter.py`）
   - 补 `app/models/knowledge.py`
   - 补 `app/services/knowledge_service.py`
   - 补 `app/utils/db_connection.py`
   - `scripts/` 下补 7 个 v2.0 训练脚本（discover_forks / integrate_forks / build_sft_dataset / continued_pretrain_mlm / sft_full_finetune / evaluate_model / orchestrate_fork_integration）
   - 补 `tests/`（7 个文件 20 项单元测试）
   - 核心依赖表补 `peft`、`accelerate`、`datasets`、`evaluate`、`GitPython`、`langdetect`、`sentencepiece`
5.3 AI 引擎职责补充：「Skill 动态路由 + 错误降级」、「RAG 知识库去重（title+source_repo_id）」

### 步骤 6：更新 `/workspace/docs/code-wiki/key-classes.md`
6.1 §2.1 App.tsx 路由表：补 5 条家长端路由
   - `/parent` → 家长首页
   - `/parent/chat` → 家长对话
   - `/parent/children` → 家长孩子列表
   - `/parent/emergency` → 家长预警管理
   - `/parent/profile` → 家长个人中心
6.2 §2.4 通用组件：补 EmergencyHelpButton（三端紧急帮助）、ErrorBoundary（错误边界）、ApiDebugOverlay（调试覆盖层）
6.3 §3.1 `main.py` API 端点：补 `GET /skills/status`（技能状态查询）
6.4 §3 新增 §3.5 Skill 架构类：
   - `BaseSkill`（`app/skills/base_skill.py`）— can_handle / execute 契约
   - `SkillRouter`（`app/skills/skill_router.py`）— 意图匹配 + 错误自动禁用降级
6.5 §3.2 服务层：补 `KnowledgeService`（`app/services/knowledge_service.py`）— RAG 检索 + (title+source) 去重

### 步骤 7：更新 `/workspace/docs/code-wiki/dependencies.md`
7.1 Docker Compose 启动顺序注释：删除 PostgreSQL，改为 mysql（与 deployment/docker-compose.yml 一致）
7.2 AI 引擎外部服务表：补 `KnowledgeService`→`knowledge_base.json` / MongoDB
7.3 Python (ai-engine) 依赖表：补 peft/accelerate/datasets/evaluate/GitPython/langdetect 7 项
7.4 AI 引擎 API 依赖：补 `GET /skills/status` 技能状态

### 步骤 8：更新 `/workspace/docs/code-wiki/running.md`
8.1 **严重修复**：所有 Docker Compose 步骤中的 `.env.template` 路径从 `server-services/deployment/` 修正为 `server-services/`
8.2 §3 AI 引擎启动命令后补：v2.0 训练流水线 smoke 用法（对齐 README.md）
   ```bash
   # 一键执行全流程（smoke 模式，无需 GPU）
   PYTHONPATH=. python scripts/orchestrate_fork_integration.py \
     --smoke --max-forks 3 --force-sft-mode simulation
   # 查看技能状态
   curl http://localhost:8000/skills/status
   ```
8.3 §常见问题：补「Q: 没有 GPU 能跑训练吗？」（对齐 README.md）

### 步骤 9：更新 `/workspace/docs/code-wiki/api-reference.md`
9.1 **严重修复**：基于步骤 1.1 核对结果，统一家长端绑定接口路径。授权路径补充 wiki.md 缺失的 `PUT /api/v1/parents/children/{bindingId}/authorize`
9.2 AI 引擎接口部分：补 `GET /skills/status`
   ```http
   GET /skills/status
   ```
   返回示例：注册技能列表、各技能启用状态
9.3 风险检测部分 §风险等级说明：补 v1.6 L1.5 持续时间规则与 L1.6 心情历史规则脚注
9.4 接口权限速查表：补 `GET /skills/status`（AI 引擎内部，无需认证）

### 步骤 10：交叉验证与统一
10.1 全局 grep 检查所有文档中 `.env.template` 路径是否统一
10.2 全局检查家长端 API 路径是否统一
10.3 全局检查版本号 / 更新日期头是否统一为 v2.0 / 2026-08-29
10.4 读取各文档的「数据库」描述，确保不互相矛盾（H2 默认开发 / MySQL Docker 默认 / PostgreSQL 可选）
10.5 对所有 v1.5–v2.0 新增功能，确认 wiki.md 和 code-wiki 至少各有一处提及

---

## 四、潜在依赖或注意事项

1. **路径事实必须先核对再改**：步骤 1.1–1.4 是所有文档修正的基础，严禁凭记忆修改（特别是 ParentController 路由和 .env.template 位置）
2. **不添加冗余内容**：code-wiki 的子文档应各司其职，避免将 README.md 的所有版本历史原样复制到每个子文档（版本历史只放 wiki.md + code-wiki/README.md，子文档只补当前版本的功能）
3. **不修改非文档文件**：本计划只修正 `.md` 说明文档，不修改源代码、Dockerfile、application.yml 等
4. **技术栈版本号要交叉校验**：补 PEFT/Accelerate 等的版本号时，需先读取 `server-services/ai-engine/requirements.txt` 获取真实版本，不可照抄 README.md 中的近似值

---

## 五、风险处理

| 风险场景 | 应对方案 |
|---------|---------|
| 步骤 1.1 核对后发现 wiki.md 的 API 路径才是正确的 | 以代码真实路径为准，修正 api-reference.md 并在计划中记录 |
| 步骤 1.2 发现两个路径都存在 `.env.template` | 优先使用与 `docker-compose.yml` 同一目录（deployment/）的，记录差异并在文档中加注释说明 |
| requirements.txt 中未声明 PEFT 等版本号 | 写「见 requirements.txt」，不硬编码假版本 |
| 修改后文档过长、出现冗余重复 | code-wiki 子文档只补结构化数据（目录、类、API、依赖表），叙事性大段更新集中在 wiki.md |
| 某些 v2.0 功能是否真的上线（比如 tests 目录）需确认 | 先检查 `server-services/ai-engine/tests/` 目录是否存在，不存在则不写入 |
