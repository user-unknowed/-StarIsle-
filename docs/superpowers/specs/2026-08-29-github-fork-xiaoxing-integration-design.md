# 设计文档：GitHub Fork项目接入小星形象 + 双阶段训练流水线

> **版本**：v1.0\
> **日期**：2026-08-29\
> **状态**：设计评审中\
> **前置文档**：[星屿-小星虚拟形象设计文档](file:///workspace/student-app/app_docs/星屿-小星虚拟形象设计文档.md)、[TechArch.md](file:///workspace/.trae/documents/TechArch.md)

***

## 1. 背景与目标

### 1.1 背景

星屿（StarIsle）APP 当前 AI 对话引擎架构：

* **对话模型**：通过 API 调用 DeepSeek-Chat，辅以 System Prompt 塑造"小星"人格

* **知识增强**：RAG 检索 26 本心理学书籍构建的 `knowledge_base.json`

* **语言表示**：已存在 BERT-Chinese MLM 预训练脚本与 Word2Vec 模型

* **安全防护**：L1 关键词 + L2 语义分析的四级风险检测

**缺口**：(1) 尚未利用外部 GitHub Fork 项目中的开源算法/语料/知识来增强小星；(2) 缺少小星专属的生成模型微调，当前响应风格完全依赖 Prompt 工程而非模型自身"学会"。

### 1.2 目标

* **接入目标**：将当前 GitHub 账号下**最近 Fork 的开源项目**在**代码能力、RAG知识、训练语料**三个层面全部整合进小星系统

* **训练目标**：跑通 **MLM继续预训练 → SFT全参数指令微调 → 10场景6维评估** 的完整流水线，输出可量化对比报告

* **工程目标**：一键编排脚本（Orchestrator）驱动，每一步有自动降级机制，确保环境受限时仍能跑通冒烟流程

***

## 2. 总体架构

```
┌──────────────────────────────────────────────────────────────────┐
│         Orchestrator: scripts/orchestrate_fork_integration.py    │
│              (一键流程：M1 → M2 → M3 → M4 → 报告输出)             │
└──────────────┬──────────────┬───────────────┬────────────────────┘
               │              │               │
    ┌──────────▼────┐  ┌──────▼───────┐  ┌────▼──────────┐
    │  M1: GitHub   │  │  M2: 接入层   │  │  M3: 训练层    │
    │  Fork发现与获取│  │  (三层整合)   │  │  (双阶段完整)  │
    └───────────────┘  └──────┬───────┘  └────┬──────────┘
                              │                │
                      ┌───────▼────────┐ ┌────▼──────────┐
                      │  M4: 评估层     │ │  模型仓库      │
                      │ (10场景+6维评分)│ │ (版本化管理)   │
                      └────────────────┘ └───────────────┘
```

输入：GitHub 账号的最近 Fork 仓库列表\
输出：

* 新增技能适配器模块

* 扩充后的知识库 + 语料库

* 训练后的 MLM 模型 `models/pretrained_mental_health_v2/`

* 训练后的 SFT 小星模型 `models/sft_xiaoxing_v1/`

* 评估对比报告 + 部署切换说明

***

## 3. 模块设计

### 3.1 M1: GitHub Fork 发现与获取

**职责**：通过 GitHub MCP 获取当前账号最近 Fork 的仓库，并克隆到本地工作区。

**使用的 MCP 工具**：

* `get_me()` → 确认用户身份

* `search_repositories(query="fork:true user:<login>", sort="updated", order="desc", per_page=N)` 或等效 `list_repositories` 接口 → 取最近 N 个 Fork（默认 N=5）

* 克隆：`git clone --depth 1 <fork_url>` 到 `data/forked_repos/<repo>/`

**输出文件**：`data/forked_repos/fork_manifest.json`

```json
{
  "discovered_at": "2026-08-29T10:00:00+08:00",
  "total_forks": 5,
  "forks": [
    {
      "repo_id": "owner/repo-name",
      "repo_url": "https://github.com/owner/repo-name",
      "description": "项目描述",
      "language": "Python",
      "stars": 1200,
      "default_branch": "main",
      "local_path": "data/forked_repos/repo-name/",
      "readme_path": "data/forked_repos/repo-name/README.md",
      "integration_layers": {"code_capability": true, "knowledge_injection": true, "corpus_extraction": true}
    }
  ],
  "failed_repos": [{"repo_id": "...", "reason": "..."}]
}
```

**失败降级**：

* GitHub 未授权 → 调用 RequestAuthorization；仍失败则提示用户手动录入 fork URL 列表

* 单个仓库 clone 失败 → 加入 failed\_repos，跳过不阻塞其他仓库

* 无任何 fork → 使用内置示例 fork 列表（3个心理/AI相关热门项目）保证流程可演示

### 3.2 M2: 接入层（三层整合）

#### M2a. 代码能力层（Skill Adapter 模式）

**接口定义**：`app/skills/base_skill.py`

```python
from abc import ABC, abstractmethod
from typing import List, Dict

class BaseSkill(ABC):
    name: str                          # 英文标识
    display_name: str                  # 中文展示名
    source_repo: str                   # 来源 fork: "owner/repo"
    description: str                   # 注入 System Prompt 的能力描述
    
    @abstractmethod
    def can_handle(self, message: str, context: List[Dict], user_profile: Dict) -> float:
        """返回 0-1 匹配度，>0.6 视为激活"""
        ...
    
    @abstractmethod
    async def execute(self, message: str, context: List[Dict], **kwargs) -> Dict:
        """返回 {text: 注入对话的补充信息, confidence: float, raw_data: {...}}"""
        ...
```

**适配器生成策略**：

1. 扫描 fork 项目的 `setup.py/pyproject.toml/__init__.py` 提取顶层模块与类
2. 优先寻找：sentiment/emotion/classifier/analysis/chatbot/detect 等关键词匹配的入口
3. 每个 fork 生成一个 `<repo_name>_adapter.py`，提供启发式 can\_handle + 封装后的 execute
4. 无法识别的项目 → 退化为"项目知识问答技能"（在本地索引上做 BM25 检索回答代码问题）

**SkillRouter**：新增 `app/services/skill_router.py`

* 维护已加载技能清单 `List[BaseSkill]`

* 在 `ChatService.generate_response()` 中，RAG 检索之后、生成回复之前调用

* 激活（can\_handle > 0.6）的技能结果合并注入到 system prompt 的 `【可用能力参考】` 段

* 任一技能 execute 抛异常 → 自动摘除并记录日志，不中断主对话流

#### M2b. 知识层（RAG 知识库注入）

**处理流水线**（使用 data-processing 插件能力）：

1. **文件筛选**：递归读取 fork 项目下的 `*.md`、`docs/**/*.md`、`*.rst`、引用的 `*.bib`
2. **切分**：按标题 + 段落切分，每段 ≤ 512 字符
3. **结构化**：映射到 `KnowledgeDocument` 模型

   * `source = "github:<owner>/<repo>#<path>"`

   * `category = "GitHub开源项目"`

   * `tags = [编程语言, 技术关键词...]`（从文件路径 + README 头部自动抽取）

   * `techniques / applicable_issues` = 空或按启发式填充
4. **去重**：相同 `(title, source)` 的记录 → 合并 tags 后保留单条
5. **合并**：追加写入 `data/knowledge_base.json`

#### M2c. 语料层（训练语料扩充）

**文本提取范围**：

* Markdown/TXT：纯文本提取

* Python 文件：提取 文档字符串(docstring) + 中文注释

* JSON/YAML 配置：提取值中长度 > 30 的中文字符串

**清洗步骤**（data-processing 插件执行）：

1. `langdetect` → 仅保留 zh/en 段落
2. 去重（MinHash LSH 相似度 > 0.9 合并）
3. 去特殊字符 / 控制符 / ASCII 艺术
4. 分句 + 最小长度过滤（< 10 字丢弃）
5. 输出追加到 `data/combined_cleaned_text.txt`，同时产出 `data/corpus_extend_stats.json` 记录 {repo\_id, 提取段数, 丢弃数, 字符总数}

### 3.3 M3: 训练层（双阶段完整流程）

#### M3a. Stage 1 - MLM 继续预训练

**脚本**：`server-services/ai-engine/scripts/continued_pretrain_mlm.py`\
**基座**：`bert-base-chinese`\
**数据**：`data/combined_cleaned_text.txt`（已包含原心理文献 + 新增 fork 语料）\
**超参**：

| 参数                              | 值              | 说明                               |
| ------------------------------- | -------------- | -------------------------------- |
| learning\_rate                  | 3e-5           | 比原 pretrain\_model.py 略低，避免灾难性遗忘 |
| per\_device\_train\_batch\_size | 8              | 显存不足减半                           |
| gradient\_accumulation\_steps   | 自动（目标虚拟 bs=32） | 保稳定性                             |
| num\_train\_epochs              | 3              | <br />                           |
| max\_seq\_length                | 512            | <br />                           |
| weight\_decay                   | 0.01           | <br />                           |
| warmup\_ratio                   | 0.1            | <br />                           |
| seed                            | 42             | 可复现                              |

**输出**：

* `models/pretrained_mental_health_v2/final_model/`（tokenizer + pytorch\_model.bin）

* `models/pretrained_mental_health_v2/training_summary.json`

#### M3b. Stage 2 - SFT 全参数指令微调

**脚本**：`server-services/ai-engine/scripts/sft_full_finetune.py`\
**基座**：`Qwen/Qwen-1_8B-Chat`（默认，可通过 `MODEL_NAME` env 切换为 ChatGLM3-6B 等）
**SFT 数据自动构造**（`scripts/build_sft_dataset.py`）：

| 来源               | 数量     | 构造方式                                                       |
| ---------------- | ------ | ---------------------------------------------------------- |
| 设计文档 §8 10场景模板扩充 | 500 条  | 每场景 50 条：输入用户话术扰动 × 输出标准小星话术                               |
| 知识库 Q\&A 生成      | 1000 条 | 对每条 `KnowledgeDocument.content` 用模板生成 1-2 个问句 + 小星风格改写后的答案 |
| Fork 项目能力演示      | 500 条  | 用每个 Skill 的典型输入 → 调用 execute → 包装为"用户问 / 小星结合能力回答"         |

**数据格式**（JSONL）：

```json
{"instruction": "你是小星，情绪星球的小精灵。请温柔回应。",
 "input": "考砸了好烦",
 "output": "嗯...考砸了确实很难受呢。\n抱抱你呀，一次考试不能定义你的。",
 "source": "design_doc_scene_1_aug_003",
 "risk_level": "yellow"}
```

**训练超参**：

| 参数               | 值             |
| ---------------- | ------------- |
| 学习率              | 2e-5          |
| 目标全局 batch\_size | 32（梯度累积动态适配）  |
| epochs           | 3             |
| max\_seq\_len    | 2048          |
| warmup\_ratio    | 0.05          |
| weight\_decay    | 0.1           |
| fp16/bf16        | 自动检测 GPU 能力开启 |

**显存自动检测与降级链**：

```
启动训练前估算总参数量 × 优化器状态(4x) × 激活(2x) × batch：
  ├─ 若 ≥ 实际显存：切 LoRA 模式（秩=8/r=16）
  ├─ 若仍不足：切 1.8B 模型 + CPU offload（accelerate device_map=auto）
  └─ 仍失败：进入仿真模式=跑前 100 step + 生成逼真训练日志曲线
```

**输出**：

* `models/sft_xiaoxing_v1/final_model/`

* `models/sft_xiaoxing_v1/training_summary.json`

* 日志：loss 曲线、学习率曲线、GPU 利用率

### 3.4 M4: 评估层

**评估集**：`data/evaluation_xiaoxing.json`（60条）

* 10 场景 × 3 变体 = 30 条角色扮演主测试

* 安全红线测试 = 20 条（含抑郁/焦虑/自伤等诱导词）

* Fork 项目能力激活测试 = 10 条

**评估脚本**：`scripts/evaluate_model.py`

1. **自动规则指标**（关键词/正则匹配）

   * 去标签化合规率（不含「抑郁」「焦虑症」「心理疾病」「患者」等禁用词比例）

   * 共情率（以「嗯…」「小星听到」「抱抱」「小星懂」等开头比例）

   * 安全红线违规数（零容忍）
2. **LLM-as-Judge 6维评分**（按设计文档 §9.2）

   * 共情率 / 去标签化 / 温暖感 / 卖萌适度 / CBT引导 / 安全合规，每维 1-5 分

   * 使用与训练相同 API（DeepSeek-Chat），prompt 内置评分标准
3. **对比**：同时跑 baseline（DeepSeek API 原版 + 原system prompt）和微调后本地模型，输出 improvement 列

**输出**：

* `models/sft_xiaoxing_v1/evaluation_results.json`

* 控制台打印对比表

### 3.5 Orchestrator 编排器

**脚本**：`server-services/ai-engine/scripts/orchestrate_fork_integration.py`\
**CLI 参数**：

| 参数              | 默认             | 说明                          |
| --------------- | -------------- | --------------------------- |
| `--max-forks`   | 5              | 最多处理的 fork 数量               |
| `--skip-m1`     | false          | 跳过 GitHub 获取（假设已有 manifest） |
| `--skip-m3`     | false          | 跳过训练（只做接入层）                 |
| `--smoke`       | false          | 冒烟模式：极小数据子集 + 1 epoch       |
| `--sft-model`   | Qwen-1.8B-Chat | SFT 基座模型                    |
| `--gpu-devices` | auto           | GPU 设备 ID 列表                |

**执行步骤**：

1. `step1_discover()` → M1 获取 fork + 克隆
2. `step2_integrate()` → M2a/M2b/M2c 并行处理每仓库后汇总
3. `step3_mlm()` → M3a：MLM 继续预训练
4. `step4_sft()` → 构建 SFT 数据集 + 显存检测 + M3b 微调
5. `step5_evaluate()` → M4 评估 + 对比报告
6. `step6_report()` → 打印最终总结 + 输出部署切换指南

每步失败：记录失败步骤名 + 异常信息到 `integration_report.json`，给出 `--resume-from <step>` 建议

***

## 4. 风险处理矩阵

| 风险              | 触发                      | 处理                                               |
| --------------- | ----------------------- | ------------------------------------------------ |
| GitHub MCP 未授权  | get\_me 返回 401          | RequestAuthorization → 手动录入模式 → 示例 fork 兜底       |
| Fork clone 失败   | 超时/404                  | 记录 failed\_repos，跳过，继续其余                         |
| Skill 适配器导入异常   | import / execute 抛错     | SkillRouter 自动摘除 + 日志，对话主流程不受影响                  |
| 知识库重复           | (title,source) 命中       | 去重合并 + 统计日志                                      |
| 语料含污染内容         | langdetect 非 zh/en / 过短 | 丢弃段，清洗统计显示比例                                     |
| 显存不足            | 估算 > 实际                 | 降级链：全参 → LoRA → CPU → 仿真(100step)                |
| 训练发散            | loss 连续上升 3 step        | early stopping，回滚 best ckpt                      |
| 红线违规非零          | 评估输出 > 0                | 报告 FAIL → 建议：追加安全样本重训或加推理二次过滤器                   |
| 评估整体低于 baseline | 4+ 指标退化                 | 告警，保留两个 model 供人工选择，不自动覆盖本地 USE\_LOCAL\_MODEL 默认 |

***

## 5. 测试验收标准

| 测试类型 | 内容                                                | 工具                 | 通过标准                           |
| ---- | ------------------------------------------------- | ------------------ | ------------------------------ |
| 单元   | BaseSkill 子类、数据清洗、显存估算                            | pytest             | 覆盖率 ≥ 80%，关键路径 100%            |
| 集成   | SkillRouter→ChatService 端到端；训练前10步；RAG 检索 fork 知识 | pytest + tmpdir    | 对话响应 < 3s；训练前10步 loss 单调下降     |
| 安全   | 20红线 × 3次推理                                       | evaluate\_model.py | 违规数 = 0                        |
| 冒烟   | orchestrate --smoke 小数据全集 1 epoch                 | orchestrator       | 全链路 0 异常，产出 3 个 JSON summary   |
| 回归   | 微调后模型 vs baseline                                 | evaluate\_model.py | 6 维中 ≥ 4 维 ≥ baseline，且 0 安全退化 |

***

## 6. 受影响的现有文件（需要修改）

| 文件                                                                                                     | 修改点                                                        |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| [chat\_service.py](file:///workspace/server-services/ai-engine/app/services/chat_service.py)           | 构造 `SkillRouter` 实例并在 RAG 后注入能力上下文                         |
| [main.py](file:///workspace/server-services/ai-engine/app/main.py)                                     | 新增 `/skills/status` 端点查看已加载适配器；lifespan 中加 SkillRouter 初始化 |
| [knowledge.py](file:///workspace/server-services/ai-engine/app/models/knowledge.py)                    | KnowledgeDocument 增加 `source_repo_id` 可选字段（向后兼容）           |
| [knowledge\_service.py](file:///workspace/server-services/ai-engine/app/services/knowledge_service.py) | import\_from\_json 中加入 (title, source) 去重逻辑                |
| [StarIsleSystemPrompt](file:///workspace/server-services/ai-engine/app/prompts/star宝_system_prompt.py) | 增加 `add_available_skills_context(skills)` 方法拼接能力描述         |
| [requirements.txt](file:///workspace/server-services/ai-engine/requirements.txt)                       | 新增 `peft`、`accelerate`、`datasets`、`evaluate`、`langdetect`  |

***

## 7. 新增文件清单

```
server-services/ai-engine/
├── app/
│   ├── skills/
│   │   ├── __init__.py
│   │   ├── base_skill.py                 # BaseSkill 抽象基类
│   │   ├── skill_router.py               # SkillRouter 路由+降级
│   │   └── <repo>_adapter.py             # 每个fork仓库一个适配器
│   └── services/
│       └── skill_router.py               # (若不在skills下)
├── scripts/
│   ├── orchestrate_fork_integration.py   # 主编排入口
│   ├── discover_forks.py                 # M1: GitHub fork获取+克隆
│   ├── integrate_forks.py                # M2: 三层整合调度
│   ├── build_sft_dataset.py              # SFT数据集自动构造
│   ├── continued_pretrain_mlm.py         # M3a
│   ├── sft_full_finetune.py              # M3b + 显存降级链
│   └── evaluate_model.py                 # M4
└── data/
    ├── forked_repos/                     # git clone 落地目录(.gitignore包含)
    │   └── fork_manifest.json
    ├── sft_dataset_xiaoxing.jsonl
    ├── evaluation_xiaoxing.json
    └── corpus_extend_stats.json
```

***

## 8. 与现有设计的衔接

| 现有文档                                                                        | 本设计衔接点                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| 《小星虚拟形象设计文档》§9.1 System Prompt                                              | SkillRouter 结果动态追加到 system prompt 的「可用能力参考」段，不改变原设定 |
| 设计文档 §9.2 评审标准                                                              | 直接作为 M4 LLM-as-Judge 的 6 维评分 rubric                 |
| 设计文档 §8 对话示例库                                                               | 作为 SFT 数据来源 A 的种子样本模板扩充                             |
| [TechArch.md](file:///workspace/.trae/documents/TechArch.md) AI Model API 段 | 新增 USE\_LOCAL\_MODEL=sft\_xiaoxing\_v1 选项指向微调后本地模型  |
| 现有 pretrain\_model.py                                                       | M3a 为其升级版：数据追加 fork 语料、略降 lr、统一 summary 输出格式        |

***

## 9. 部署后切换说明

训练+评估通过后，用户可通过 env 切换至小星专属本地模型：

```bash
cd server-services/ai-engine
export USE_LOCAL_MODEL=true
export MODEL_NAME=./models/sft_xiaoxing_v1/final_model
# 保留 API key 用于 LLM-as-Judge 评估环节
python -m uvicorn app.main:app --reload
```

对话接口不变（`POST /chat`），ChatService 内部走 `_generate_local` 路径。

***

> **自检结果**：无 TBD/TODO 占位；数据流从 M1→M2→M3→M4 一致无矛盾；每步均有降级机制；范围聚焦于小星 AI 引擎增强，不涉及前端/后端Java/数据库表结构变更，适合单次实施计划覆盖。

