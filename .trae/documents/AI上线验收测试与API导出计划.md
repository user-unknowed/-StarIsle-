# AI 上线验收测试与 API 导出计划

## Context（为什么做）

ai-engine 已完成 RAG 知识库（37 基础 + 39 心理健康 + 20 数学笑话 = 96 条）、本地 Qwen2-0.5B SFT 模型、风险检测与情绪分析，并已通过手工冒烟验证。但目前：

- 只有 `tests/test_evaluate_safety.py`（离线文本规则检查），没有覆盖 HTTP 接口的上线验收测试；
- MVP 指标（对话 <3s P95、关键词检测 <500ms、语义分析 <5s、红色风险 2s 内危机话术）没有自动化门禁，人工结论不可复现；
- `/api/v1/chat/message` 的 OpenAPI 契约仍是旧字段（`user_id`/`response_time`），与 Java 网关实际返回的 `userId`/`emotionTags`/`responseTimeMs`/`model` 不一致，前端类型也缺 `model`。

本计划目标：补齐可复现的 AI 上线验收测试，使结果逐条对齐 MVP 指标；达标后重新导出 API 契约给前端应用。

## 验收指标映射（来源：student-app/docs/星屿-StarIsle-MVP-PRD.md）

| MVP 指标 | 测试断言 | 环境约束 |
|---|---|---|
| FR-3.1 对话响应 <3s（P95） | `/chat` 正常对话 P95 < 3000ms | 仅 API 模式或 CUDA 环境断言；CPU 本地模型记录实测并跳过 |
| FR-6.1 关键词检测 <500ms、误报 <5% | `_detect_keywords` P95 < 500ms；20 条良性语料误报率 ≤5% | 进程内调用，避免语义层干扰 |
| FR-6.2 语义分析 <5s、召回 >85% | `/risk/check` 语义路径 P95 < 5000ms；20 条危机语料命中率 ≥85% | 真实服务 |
| FR-6.3 红色风险 → 危机话术 <2s | 红线输入 `/chat` <2000ms 且话术含 12355/400-161-9995 | 需先修复：当前 `/chat` 先生成再判风险 |
| 功能契约 | 8 个字段齐全、类型正确、四色枚举 | 真实服务 |
| RAG 门控 | 相关话题 `rag_enhanced=true` 且命中≥1；无关话题 `rag_enhanced=false` 且 `knowledge_hits=[]` | 真实服务 |
| 笑话直达 | `model=joke-rag`、`rag_enhanced=true`、<2000ms、多次请求随机 | 真实服务 |
| 降级可用 | Mongo 不可用时 `knowledge_mode=fallback_memory`、接口仍 200 | 真实服务 |

## 实施步骤

### 1. 前置修复：红色风险快速通道（满足 FR-6.3）

文件：`server-services/ai-engine/app/main.py`

- 在 `POST /chat` 中把 `risk_service.detect_risk()` 前置到 `chat_service.generate_response()` 之前；
- 风险为 `red` 时直接返回固定危机话术（复用 `app/prompts/star宝_system_prompt.py:109` 的示例文案与热线），`model="crisis-rule"`、`rag_enhanced=false`、`knowledge_hits=[]`，不进入模型推理；
- 非 red 仍走原流程（复用已算出的 risk_level，避免重复检测）；
- `app/services/chat_service.py` 不改生成逻辑，只在必要时导出常量。

### 2. 新增验收测试套件

目录：`server-services/ai-engine/tests/acceptance/`

- `conftest.py`：会话级 `httpx.Client(base_url=os.getenv("BASE_URL","http://127.0.0.1:8000"), timeout=120)`；`/health` 不通则 `pytest.skip`；`p95()` 采样助手（预热 2 次、N=20，可用 `MVP_PERF_SAMPLES` 调整）。
- `test_contract.py`（marker `contract`）：health、`/chat` 字段契约、笑话直达、`/knowledge/stats`（docs≥96、mode）、`/knowledge/search`（进食障碍/PTSD/笑话）、`/topics`、RAG 相关/无关门控。
- `test_perf.py`（marker `perf`）：FR-3.1/6.1/6.2/6.3 四项；阈值写成 PRD 常量（3000/500/5000/2000），仅允许通过环境变量调低（更严格），禁止调高；`/health` 扩展返回 `model_mode` 与 `device` 供环境判定（`app/main.py` health 增加两项，不破坏原字段）。
- `test_resilience.py`（marker `resilience`）：回复无诊断标签/URL、无自伤方法；坏 Mongo 配置下内存降级；超长消息 422；模型异常时兜底非空。
- `reporting.py`：`pytest_sessionfinish` 输出 `tests/acceptance/reports/acceptance_<ts>.json` 与同名 `.md`（用例状态、耗时、P50/P95、采样数、跳过原因、环境信息），不新增第三方依赖。

运行方式（服务需先启动）：
```
cd server-services\ai-engine
.venv\Scripts\python.exe -m pytest tests\acceptance -c tests\pytest.ini -m "contract or resilience"
.venv\Scripts\python.exe -m pytest tests\acceptance -c tests\pytest.ini -m perf
```

### 3. 性能门禁与环境

当前 `torch 2.1.2+cpu` → `/chat` 实测约 34s，无法满足 3s P95。按以下顺序处理：

1. **首选 GPU（测试真实交付模型）**：RTX 5060 需 sm_120，安装 `torch==2.8.0` cu128 构建到 `.venv`，确认 `torch.cuda.is_available()` 与 capability `(12,0)`；`chat_service.py` 已按 `torch.cuda.is_available()` 自动使用 cuda+fp16，无需改代码。0.5B 模型显存约 1.5GB，预计 200 token 生成 2s 左右，达 3s P95 有把握。
2. **备选 API 模式**：`server-services/deployment/.env` 已有 OpenRouter 配置，可临时以 `USE_LOCAL_MODEL=false` 验收；但它测的不是交付微调模型，报告中必须标注"环境差异"。
3. **若仍不达标**：不修改阈值，如实报告 P95 与原因，暂停"导出"步骤并向用户说明阻塞。

`requirements.txt` 保持 `torch==2.1.2`（CPU 部署用），GPU 安装命令写入验收报告与 `.env.example` 注释，避免影响其他环境。

### 4. 重新导出 API 给前端应用

- `api-docs/spec/openapi.yaml` 与 `api-docs/public/spec/openapi.yaml`（两份必须逐字一致）的 `/api/v1/chat/message` 响应改为实际契约：
  `userId`、`response`、`riskLevel`（green/yellow/orange/red）、`emotionTags`（string[]）、`responseTimeMs`、`model`；删除过时的 `user_id`/`response_time`。
- `web-frontend/src/types/index.ts` 的 `ChatResponse` 增加可选 `model?: string`；不暴露 `rag_enhanced`/`knowledge_hits`（前端无消费方，且属内部实现）。
- Java 网关无需改动：`ChatController.java:82-90` 已输出 camelCase 全字段，`ChatService` 反序列化忽略未知字段。

### 5. 验证

- 验收：contract + resilience 全绿；perf 四项按环境判定为通过或显式记录（报告含实测 P50/P95）。
- 契约：`Compare-Object` 校验两份 openapi 一致；`swagger` 渲染无报错。
- 前端：`cd web-frontend; npm run build`（或项目现有 `npm run check`）通过。
- 服务：重启后 `/health`、`/chat`（普通/笑话/红线）冒烟各一次。

## 风险与回滚

- 风险前置改动只影响 red 分支；回滚为单文件改动。
- GPU 安装替换 torch 可能影响其他依赖：先记录 `pip freeze` 快照，失败可按快照回退；不提交环境变更。
- 两处 openapi 漂移：用一致性对比纳入验证。
- 性能跳过逻辑必须在报告写明原因，禁止调高阈值。

## 插件适配说明

- `trae-capabilities`：用于发现外部插件；本任务是仓库内 pytest + 文档同步，无合适外部插件，故不推荐安装。
- `tashan-research-skills`：面向科研实验设计与统计分析，不适用于服务验收；P95/召回率在测试内直接计算。
- `data-analysis` skill：面向 Excel/CSV 分析，本任务无表格数据，不使用。
