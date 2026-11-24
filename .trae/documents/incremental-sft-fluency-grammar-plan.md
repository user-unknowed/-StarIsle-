# 小星模型增量训练计划：流畅度 + 语法正确性提升与零语法错误回归实测

> 创建：2026-11-19 ｜ 目标：对本地 SFT 模型（`models/sft_xiaoxing_v1/final_model`）继续增量训练，显著提升回复流畅度与语法正确性；用固定回归测试集实测并做到 0 语法违例；完成后同步 GitHub 与 Gitee。
> 原则：真实训练、真实测试，不仿真、不伪造；NDA 个案数据仅本机使用，绝不同步远端。

---

## 1. 现状分析（已核实）

| 项 | 现状 |
|---|---|
| 基座模型 | `Qwen/Qwen2.5-1.5B-Instruct`（本机 `.starisle-train/models/Qwen2.5-1.5B-Instruct`） |
| 已训模型 | `server-services/ai-engine/models/sft_xiaoxing_v1/final_model`（LoRA 合并，2.87GB） |
| 上次训练 | LoRA r=16/α=32/dropout0.05，216 步 = 2 epoch，样本 1832（train 1740 / eval 92），batch=1+grad_acc16，lr 1e-4 cosine，max_seq 1024，bf16+fp16 AMP + gradient checkpointing；train_loss 0.4903、eval_loss 0.0335、ppl 1.034 |
| 硬件 | RTX 5060 Laptop 8GB，CUDA 12.8，torch 2.8.0+cu128（可用 GPU 真实训练，无 SIMULATION） |
| 训练入口 | `server-services/ai-engine/scripts/sft_full_finetune.py`：`--model/--epochs/--batch/--grad-acc/--lr/--max-seq-len/--resume`；支持 `resume_from_checkpoint` 续训；训练后自动合并并写 `training_summary.json`；数据集路径为模块常量 `SFT_JSONL`（无 CLI 覆盖） |
| 数据管线 | `scripts/build_sft_dataset.py`：来源 A（设计文档场景扰动）+ 来源 B（知识库 Q&A）→ `data/sft_dataset_xiaoxing.jsonl`（字段 `instruction/input/output/source/risk_level`，1832 条） |
| 评估 | `scripts/evaluate_model.py`：60 条测试集 + 规则指标（共情关键词、去标签合规等）+ 可选 LLM-as-Judge（6 维：共情/去标签/温暖/卖萌/CBT/安全，走外部 OpenAI 兼容 API，`EVAL_API_KEY`）→ `evaluation_results.json` |
| 推理链路 | `app/services/chat_service.py`：`USE_LOCAL_MODEL=true` 时加载 `final_model`；解码 `max_new_tokens=200, temperature=0.7, top_p=0.9, repetition_penalty=1.05` |
| **语法/流畅度缺口** | 现有评估 rubric **没有语法、流畅度维度**；训练数据未专门覆盖语法纠错/流畅表达样本；无固定语法回归测试集 |
| 数据隐私 | 10 份 NDA 个案 docx 在 `data/private/`（.gitignore 排除，仅本机）；`sft_dataset_xiaoxing.jsonl` 已在远端（用户已决定维持现状） |
| 同步目标 | GitHub `user-unknowed/-StarIsle-`、Gitee `chenytsspace/StarIsle`，分支 `codex/kotlin-android-migration`；模型权重/`data/private/`/训练环境均在 .gitignore |

## 2. 目标与验收标准（可量化）

1. **流畅度/语法提升**：新增语法与流畅度定向训练样本 ≥400 条并完成增量训练（真实 GPU 训练、loss 正常下降、`training_summary.json completed=true`）。
2. **回归实测零语法违例**：固定回归测试集（约 50 条，覆盖中文常见语法陷阱 + 人设场景）经自研规则语法检查器检测，**违例数 = 0**（训练前先跑基线，训练后对比）；若外部评测 API 可用，追加 LLM-as-Judge 语法维度均分 ≥ 4.2/5 作为辅助证据。
3. **端到端可用**：ai-engine `/chat` 与网关 `/api/v1/chat/message` 冒烟通过，`model` 指向本地新模型。
4. **双平台同步**：脚本、报告、训练配置与新增公开样本同步 GitHub + Gitee（分支 `codex/kotlin-android-migration`），打 tag `v2.4.0` 并附 release 说明；**任何含 NDA 个案内容的样本与模型权重一律不上传**。

## 3. 实施方案

### 阶段 A：构造流畅度/语法定向训练样本（新增 ≥400 条）

1. **语法纠错样本（约 150 条，真实来源）**：用当前 `final_model` 对约 150 条提示（设计文档场景 + 知识库问题）批量推理，收集真实输出中经规则/人工判定含语法问题的回复，产出 `(input=原提示, output=语法修正后的规范回复)` 纠错对。修正仅由人/规则完成，不虚构对话。
2. **流畅表达改写样本（约 150 条）**：从知识库 Q&A 与设计文档场景中精选高频话题，撰写语法严谨、标点规范、无口语冗余的标准回复（统一「小星」人设语气）。
3. **个案文档样本（约 150 条，仅本机，默认启用需确认）**：从 `data/private/` 10 份个案文档中提取咨询对话片段，脱敏后改写为符合人设的标准回复样本（标注 `source=case_doc`）。**这些样本只进本机训练文件，绝不进入提交与远端同步**（见决策 1）。
4. 实现位置：扩展 `scripts/build_sft_dataset.py` 新增来源 C（语法纠错）与来源 D（流畅改写/个案改写），输出统一写入 `data/sft_dataset_xiaoxing.jsonl`（先备份原文件为 `sft_dataset_xiaoxing_v1_backup.jsonl`；新增条目带 `source` 标记与 `grammar_flagged` 字段）。
5. 数据质量校验：复用脚本内已有样本校验（字段完整、去重、长度限制），并新增「输出侧语法预检」：凡输出侧被规则检查器判违例的样本一律不入库。

### 阶段 B：增量训练（GPU 真实训练）

1. 给 `sft_full_finetune.py` 增加 `--data-file` 参数（默认维持原 `SFT_JSONL`），便于指向合并后的新数据集；其余逻辑不动。
2. 以混合数据（**原 1832 条全量 + 新增 ≥400 条**，防灾难性遗忘）执行续训：
   - `--resume models/sft_xiaoxing_v1/checkpoint-216`（LoRA 续训）
   - `--epochs 1`、`--lr 5e-5`（低学习率增量）、`--batch 1 --grad-acc 16`、`--max-seq-len 1024`、`--model .starisle-train/models/Qwen2.5-1.5B-Instruct`
   - 复用既有 AMP/gradient-checkpointing 配置（8GB 显存已验证可行）
3. 训练完成后脚本自动合并写入 `final_model`（先备份旧 `final_model` 为 `final_model_v1_baseline`，供回归对比）。
4. 记录真实日志并生成训练摘要（`training_summary.json`），不启用 `--allow-simulation`。

### 阶段 C：回归实测（零语法违例）

1. 新增 `scripts/grammar_checker.py`：纯 Python 高精度规则检查器，覆盖：
   - 截断句（无结束标点、结尾在助词/连词上）
   - 标点错误（连续标点、中英标点混用、逗号滥用分句、省略号不规范 `...`/`。。`）
   - 连续重复字 ≥3（如「嗯嗯嗯嗯」「然后然后」）
   - 乱码/异常字符（非中英文常用符号占比过高）
   - 「的/地/得」高频误用（白名单规则，只报高置信度）
   - 口语冗余连词堆叠（「然后」「就是」连用 ≥2 次且无标点）
   只做高精度规则，宁漏勿错报。
2. 新增 `scripts/grammar_regression.py`：
   - 内置固定回归测试集约 50 条（语法陷阱题 + 人设场景题，写死于脚本内保证可复现）；
   - 支持 `--baseline`（加载旧 `final_model_v1_baseline`）与 `--current`（加载新 `final_model`）；
   - 输出 `grammar_regression.json`：逐条违例明细、总违例数、流畅度规则指标（平均句长、标点规范率、重复率、截断率）。
3. `scripts/evaluate_model.py` 增加语法维度：规则指标并入 `compute_automatic_metrics`；LLM-as-Judge rubric 增加第 7 维「语法正确性(grammar)」与第 8 维「流畅度(fluency)」（无 API key 时自动跳过，不影响主判定）。
4. 判定标准：训练后回归集 **违例数 = 0**；并附基线对比表（训练前基线违例数 N0 → 训练后 0）。若 judge 可用，语法维度均分 ≥ 4.2/5。
5. 端到端冒烟：启动 ai-engine（8000）与网关（8081），`POST /api/v1/chat/message` 实测 3 条，确认回复正常且 `model` 指向本地模型。

### 阶段 D：同步 GitHub + Gitee

1. 提交内容（**仅以下**）：
   - 脚本改动：`build_sft_dataset.py`、`sft_full_finetune.py`（--data-file）、`evaluate_model.py`、新增 `grammar_checker.py`、`grammar_regression.py`
   - 报告：`.trae/documents/ai-sft-fluency-grammar-report.md`（训练摘要 + 回归结果，不含个案内容）
   - 本次计划文档本文件
   - **同步含个案衍生样本的数据集**（默认不同步，见决策 2）
2. 不提交：`models/`、`data/private/`、备份文件、`grammar_regression.json` 中个案相关内容（报告只含统计数字）。
3. 提交并推送 `codex/kotlin-android-migration` 到 GitHub 与 Gitee 两个远端。
4. 打 annotated tag `v2.4.0`，推送双远端；在两个平台各创建 release（GitHub 用 draft→assets→publish 流程规避 immutable 限制，Gitee 直建），正文附本次训练摘要与回归结果要点。

## 4. 涉及文件清单

| 文件 | 动作 |
|---|---|
| `server-services/ai-engine/scripts/sft_full_finetune.py` | 修改：新增 `--data-file` 参数（默认不变） |
| `server-services/ai-engine/scripts/build_sft_dataset.py` | 修改：新增来源 C（语法纠错）/D（流畅改写·个案改写，本机）与输出侧语法预检 |
| `server-services/ai-engine/scripts/grammar_checker.py` | 新增：规则语法检查器 |
| `server-services/ai-engine/scripts/grammar_regression.py` | 新增：固定回归测试集 + 基线/新模型对比 + JSON 报告 |
| `server-services/ai-engine/scripts/evaluate_model.py` | 修改：规则指标并入语法检查；judge rubric 增 7/8 维 |
| `server-services/ai-engine/data/sft_dataset_xiaoxing.jsonl` | 本机更新（备份原文件）；是否同步见决策 2 |
| `.trae/documents/ai-sft-fluency-grammar-report.md` | 新增：训练 + 回归实测报告 |
| `models/sft_xiaoxing_v1/final_model*` | 本机更新（备份为 `final_model_v1_baseline`），gitignore 内 |

## 5. 假设与决策（待你确认，默认值如下）

- **决策 1（默认：允许）**：允许把 10 份 NDA 个案文档用于构造本次训练样本，条件：仅本机训练与本地回归，样本与任何派生内容绝不同步 GitHub/Gitee。
- **决策 2（默认：不同步个案衍生样本）**：`sft_dataset_xiaoxing.jsonl` 若混入个案衍生样本，则本次**不同步**该文件（远端维持现状）；只同步脚本、报告（统计数字）与不含个案内容的公开样本增量。若你希望同步无个案部分的数据集增量，确认后我拆分文件单独提交。
- **决策 3（默认：规则检查器为准）**：「不出现语法错误」= 固定回归测试集（约 50 条）规则检查器违例数 0；LLM-as-Judge 语法维度仅作辅助证据（需外部 API key，可选）。
- **决策 4（默认：LoRA 续训）**：从 `checkpoint-216` 低学习率续训 1 epoch，混合全量旧样本，防遗忘；若你希望从基座全量重训（更稳但更慢）请说明。

## 6. 验证步骤

1. 基线回归：训练前对旧 `final_model` 跑 `grammar_regression.py --baseline`，记录违例数 N0。
2. 数据：新增样本 ≥400 条、字段校验与去重通过、输出侧语法预检 0 违例。
3. 训练：`training_summary.json` `completed=true`、`mode=lora`、无 `simulated` 字段、loss 曲线下降；`final_model` 落盘。
4. 回归：新模型违例数 = 0 且 ≤ N0；流畅度规则指标较基线改善；judge 语法维度（如可用）≥4.2。
5. 端到端：`/chat` 与 `/api/v1/chat/message` 实测 3 条正常。
6. 同步：双远端分支最新；`v2.4.0` tag 与 release 存在于 GitHub 与 Gitee；`git ls-files` 中无模型权重、无 `data/private/`。

## 7. 风险与对策

- **8GB 显存 OOM**：沿用已验证配置（batch=1、grad_acc=16、gradient checkpointing、合并前先搬 CPU）。
- **灾难性遗忘**：混合全量旧样本 + 低学习率 + 1 epoch。
- **规则检查器误报**：只做高精度规则；争议条目人工复核；judge 辅助佐证。
- **训练不收敛/NaN**：AMP 配置沿用 bf16（sm_80+）；若异常退 fp16 或降 lr 重跑。
- **NDA 泄露**：个案样本与备份不进 git 索引（提交前 `git status` 复核清单）。
