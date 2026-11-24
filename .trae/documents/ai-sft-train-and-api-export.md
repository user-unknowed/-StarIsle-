# 星屿 AI 模型续训与 API 对接前端 · 实施计划

> 状态：已完成（A–G 全部完成，端到端验证通过）｜ 生成时间：2026-11-16 ｜ 当前分支：`codex/kotlin-android-migration`
> 目标：把中断的 SFT 微调真正跑完，产出一个可加载的本地模型，并让 web 前端通过 `POST /api/v1/chat/message` 拿到模型真实回复。

## 执行进度速览

| 阶段 | 状态 | 说明 |
|---|---|---|
| A 训练环境 | ✅ 完成 | Python 3.10 + torch 2.8.0+cu128 + transformers/peft/datasets 全部就位，CUDA (12,0) 验证通过 |
| B 脚本加固 | ✅ 完成 | 已去 SIMULATION、加 gradient checkpointing、修 label 掩码、统一 bf16 AMP |
| C 冒烟训练 | ✅ 完成 | 60 条 1 epoch，train_loss=3.35，eval_loss=2.23，perplexity=9.33，产物完整 |
| D 全量训练 | ✅ 完成 | 1740 train/92 eval，216 步，train_loss=0.4903，eval_loss=0.0335，perplexity=1.034，`final_model` 已合并（2.87GB） |
| E ai-engine 推理 | ✅ 完成 | `_generate_local` 重写、ChatResponse 加 model 字段、`.env.example` 已建 |
| F Java 网关 | ✅ 完成 | ChatService 真实转发、ChatController camelCase、Maven Lombok 处理器已修、补 sqlite-jdbc；新增 `/api/v1/auth/login|register` 适配前端登录契约，`web-frontend/.env` 指向 8081 |
| G .gitignore | ✅ 完成 | 模型目录与训练环境已忽略（`git check-ignore` 验证命中） |
| V 端到端验证 | ✅ 完成 | ai-engine `/chat` 直连与 Java `/api/v1/chat/message` 均返回真实模型回复 |

> 边界说明：前端 `.env`/`.env.example` 端口对齐（原 F4）由另一会话负责，本计划不再执行。

---

## 1. 摘要

本计划分两步交付：

1. **续训**：在本机（RTX 5060 Laptop 8GB / F 盘 91.4GB 可用）用 LoRA 微调 `Qwen/Qwen2.5-1.5B-Instruct`，数据为已有的 `server-services/ai-engine/data/sft_dataset_xiaoxing.jsonl`（1784 条），产物落到 `server-services/ai-engine/models/sft_xiaoxing_v1/final_model`。
2. **导出 API 到前端**：不新建服务，复用 ai-engine 现有 FastAPI `POST /chat`（端口 8000）加载微调后的本地模型；再把 Java 网关里那个"回显占位"的 `generateApiResponse` 改成真实调用 ai-engine，并让 `ChatController` 把 `response` 正文返回给前端。前端代码无需改动，只改 `.env`。

**"导出 API" 的落地形态**：`ai-engine:8000/chat`（模型推理）+ `backend-java:8081/api/v1/chat/message`（前端唯一调用入口）。前端 `chatApi.sendMessage` 已经在调后者。

> 插件说明：`trae-remote-official:frappe-agent` 是 Frappe/ERPNext 技术栈专用技能，本仓库是 Spring Boot + FastAPI + React，**不适用**，本计划不使用它。`trae-capabilities` 已用于本轮能力/环境探测。

---

## 2. 现状分析（均已核实）

### 2.1 训练产物

| 任务 | 产物/日志 | 结论 |
|---|---|---|
| Word2Vec 中文 | `models/pretrained_word2vec/`、`pretraining_word2vec.log` | 已完成（10/10 epoch，玩具级词表 479） |
| Word2Vec 英文 | `models/pretrained_english/`、`pretraining_english.log` | 已完成（15/15 epoch，词表 3294） |
| BERT MLM 预训练 | `pretraining.log` | **中断**：最后一条是第 4 次重试下载 `bert-base-chinese`（WinError 10060），无输出目录 |
| MLM v2 | 无 | **从未执行** |
| Qwen SFT 微调 | 无 `models/sft_xiaoxing_v1/`、无 `sft_full_finetune.log` | **从未执行**（脚本存在但没跑过） |

已有 SFT 脚本：[sft_full_finetune.py](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/scripts/sft_full_finetune.py)，数据 [sft_dataset_xiaoxing.jsonl](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/data/sft_dataset_xiaoxing.jsonl)（1.62MB，**1832 条**，字段 `instruction/input/output/source/risk_level`；最长样本 662 字符，max_seq_len=1024 余量充足）。

数据构造脚本 [build_sft_dataset.py](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/scripts/build_sft_dataset.py) 已新增第四个来源：独立心理健康知识库 [mental_health_kb](file:///f:/B_proj/Big_proj/-StarIsle-/mental_health_kb/README.md)（39 条：25 篇文章 + 14 个低风险方法，含进食障碍与 PTSD）。`build_from_mental_health_kb()` 读取其详情文件生成 Q&A，只取 `L0/L1`，`L2/L3` 跳过，并复用 `RED_WORDS` 去标签化；**不修改** `data/knowledge_base.json`，条数写入 `sft_dataset_report.json` 的 `mental_health_kb` 字段。下次重跑构造脚本时自动生效。

脚本里有 3 个必须先修的问题：

- **失败会被伪装成成功**：`main()` 的 `except` 分支直接调 `run_simulation()`，它返回 `accuracy: 0.87~0.90` 的伪造指标。真实训练失败也看不出来。
- **缺 `gradient_checkpointing`**：8GB 显存上 LoRA 很可能 OOM。
- **默认基座 `Qwen/Qwen-1_8B-Chat`** 需要 `trust_remote_code` 加载自定义建模代码，与 `torch 2.8 + transformers 4.46` 兼容风险高，且其 tokenizer 不一定有 `apply_chat_template`。

### 2.2 前端 → AI 链路的三处断点

```
web-frontend  ──POST /api/v1/chat/message──▶  backend-java  ──?──▶  ai-engine:8000/chat
     ▲                                            │                      │
     └──── 需要 data.response ◀──── 只返回 user_id + response_time ◀── 从未被调用
```

| # | 位置 | 问题 |
|---|---|---|
| 1 | [ChatService.java#L84-L86](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/service/ChatService.java#L84-L86) | `generateApiResponse` 是回显占位，返回 `"小星收到了你的消息：" + content`，从未请求 ai-engine。`application.yml` 里 `starisle.ai-service.url` 配了却没人用。 |
| 2 | [ChatController.java#L84-L91](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/controller/ChatController.java#L84-L91) | 只返回 `user_id` / `response_time`（snake_case），**丢弃了 AI 回复正文**；前端 [types/index.ts#L159-L164](file:///f:/B_proj/Big_proj/-StarIsle-/web-frontend/src/types/index.ts#L159-L164) 要求 `response` / `responseTimeMs` / `riskLevel`（camelCase），且 [http.ts#L193-L197](file:///f:/B_proj/Big_proj/-StarIsle-/web-frontend/src/services/http.ts#L193-L197) **不做下划线转驼峰**。 |
| 3 | [chat_service.py#L190-L219](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/app/services/chat_service.py#L190-L219) | `_generate_local` 未把模型/输入移到 GPU、未传 `attention_mask`、把 prompt 一起 decode（回复里混入整个提示词）、在 async 函数里做阻塞推理。 |

额外风险点：[chatStore.ts#L122-L126](file:///f:/B_proj/Big_proj/-StarIsle-/web-frontend/src/store/chatStore.ts#L122-L126) 在接口失败时会**静默降级成 mock 回复**。联调时必须确认 `isUsingMockData === false`，否则会被假回复骗过。

### 2.3 环境实测

| 项 | 结果 |
|---|---|
| GPU | RTX 5060 Laptop，8151 MiB，驱动 616.92，sm_120 → 需要 CUDA 12.8 轮子（torch ≥ 2.7/2.8） |
| Python | 官方安装器 AccessDenied（C 盘仅 0.07GB），改用 **embeddable zip** `python-3.10.11-embed-amd64.zip` 解压到 `.starisle-train/python310`，改 `python310._pth` 启用 site，`get-pip.py` 引导 pip |
| JDK | `C:\Users\pc\.jdks\temurin-24`（24.0.1）可用；`java` 不在 PATH，但可用绝对路径 |
| Maven | 无 `mvn`/`mvnw`，下载便携版 `apache-maven-3.9.9-bin.zip` 到 `.starisle-train/maven`，Aliyun 镜像 + 自定义 `localRepository`（F 盘） |
| torch | PyPI 的 `torch==2.8.0` 是 **+cpu** 版（241MB，不可用）；改用阿里云 cu128 镜像 `torch-2.8.0+cu128`（3.46GB），`pip install --no-index --find-links https://mirrors.aliyun.com/pytorch-wheels/cu128/` |
| Node / Git / winget / Docker | 可用 |
| 磁盘 | C: ~0.07GB（不可用）、F: 91.4GB → 所有依赖/缓存/模型全部落 F 盘 `.starisle-train/` |
| 网络 | `hf-mirror.com` 200、清华 PyPI 200、`huggingface.co` 不可达、`download.pytorch.org` 超时、`mirrors.aliyun.com/pytorch-wheels/cu128` 200 |
| 端口 | Java 默认 `8081`（`SERVER_PORT`），前端 `.env.example` 写的是 `8080` → **存在不一致，联调前必须统一**（前端侧由另一会话处理） |

---

## 3. 总体方案

| 阶段 | 内容 | 产出 |
|---|---|---|
| A | 在 F 盘装 Python 3.10 + venv + torch 2.8(cu128) + transformers/peft/datasets | 可用的训练环境 |
| B | 加固训练脚本（去 SIMULATION 伪装、加 gradient checkpointing、调整 LoRA 超参、log 落盘） | 可复现的脚本 |
| C | 冒烟训练 64 条 1 epoch，确认 loss 真的下降 | 冒烟日志 + 一次 checkpoint |
| D | 全量 1784 条 LoRA 训练 | `models/sft_xiaoxing_v1/final_model` |
| E | ai-engine 挂载本地模型，修 `_generate_local`，暴露 `POST /chat` | 可调用的模型 API |
| F | Java 网关真正转发 + Controller 返回 camelCase 正文；前端 `.env` 对齐 | 前端能显示真实回复 |
| G | `.gitignore` 加模型目录，防止 3GB 权重进公开远端 | 干净的仓库 |

---

## 3.1 实际执行偏离与补充（已落地，区别于原计划）

| 项 | 原计划 | 实际执行 | 原因 |
|---|---|---|---|
| Python 安装 | winget / 官方安装器 | **embeddable zip** 到 `.starisle-train/python310` | 官方安装器 AccessDenied（C 盘 0.07GB），embeddable 免管理员权限 |
| torch 源 | PyPI `torch==2.8.0` | 阿里云 cu128 镜像 `torch-2.8.0+cu128`（3.46GB） | PyPI 版是 +cpu（241MB），sm_120 不可用 |
| 模型下载 | `huggingface_hub.snapshot_download` | `curl.exe -C -` 逐文件续传到 `.starisle-train/models/` | HF SDK 下载中断后无法续传，curl 更稳定 |
| 权重精度 | `torch.float16` | **`torch.bfloat16`** + `fp16=True`（AMP） | RTX 50 系（sm_120）原生 bf16，避免 fp16 的 loss 溢出 |
| label 掩码 | 仅 assistant 前置 -100 | 增加 `labels[attention_mask == 0] = -100` | `padding="max_length"` 会把 pad token 的 label 置 0，导致模型学 padding；必须置 -100 |
| eval 时机 | 训练后 merge + eval | **训练后先 eval（adapter）→ 再 merge** | merge 是唯一瓶颈（3GB 权重拷贝 ~1.5min），adapter 上 eval 更快，且训练 summary 仍有 eval_loss |
| Maven Lombok | 依赖声明即可 | pom.xml 显式 `annotationProcessorPaths` | JDK 23+ 不再自动发现注解处理器，编译报 `cannot find symbol log` |
| 训练环境根目录 | `F:\starisle-work\` | 工作区内 `.starisle-train\` | 沙箱可写，免每次禁用沙箱；已加入 `.gitignore` |
| Java 启动依赖 | 未提及 | pom.xml 新增 `org.xerial:sqlite-jdbc:3.46.1.3` | `MemoryStorageService` 用 `jdbc:sqlite`，原 pom 缺驱动导致启动即失败 |

---

## 4. 详细实施步骤

### 阶段 A：训练环境（全部落在 F 盘，不碰 C 盘）

**A1 安装 Python 3.10（非 Store 版）**

```
winget install -e --id Python.Python.3.10 --scope user --accept-package-agreements --accept-source-agreements
```
若 winget 失败（网络/源问题），退回到 python.org 官方安装包静默安装到 `F:\pytools\Python310`：
`python-3.10.11-amd64.exe /quiet InstallAllUsers=0 TargetDir=F:\pytools\Python310 Include_pip=1 PrependPath=0`
校验：`F:\pytools\Python310\python.exe -V` 输出 `Python 3.10.x`。

**A2 建 venv**

```
F:\pytools\Python310\python.exe -m venv F:\starisle-work\venv310
```

**A3 设置缓存目录（每个新 shell 都要设，写进 `F:\starisle-work\env.ps1` 便于复用）**

```
$env:HF_ENDPOINT="https://hf-mirror.com"
$env:HF_HOME="F:\starisle-work\hf"
$env:TRANSFORMERS_CACHE="F:\starisle-work\hf"
$env:PIP_CACHE_DIR="F:\starisle-work\pip-cache"
$env:TMP="F:\starisle-work\tmp"; $env:TEMP="F:\starisle-work\tmp"
```

**A4 安装依赖（清华镜像）**

```
F:\starisle-work\venv310\Scripts\python.exe -m pip install -U pip -i https://pypi.tuna.tsinghua.edu.cn/simple
F:\starisle-work\venv310\Scripts\python.exe -m pip install torch==2.8.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
F:\starisle-work\venv310\Scripts\python.exe -m pip install "transformers==4.46.3" "peft==0.13.2" "accelerate==1.1.1" "datasets==3.1.0" "sentencepiece" "protobuf" "huggingface_hub" "numpy<2.2" -i https://pypi.tuna.tsinghua.edu.cn/simple
```
注意：**不要执行 `requirements.txt`**（它把 `torch` 钉在 2.1.2，不支持 sm_120）。改为新增 `server-services/ai-engine/requirements-train.txt` 记录上面这套可复现版本。

**A5 下载基座到本地目录**

```
F:\starisle-work\venv310\Scripts\python.exe -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen2.5-1.5B-Instruct', local_dir=r'F:\starisle-work\models\Qwen2.5-1.5B-Instruct')"
```
约 3.1GB，落在 F 盘。

**A6 环境自检（必须通过才继续）**

```
F:\starisle-work\venv310\Scripts\python.exe -c "import torch,transformers,peft;print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_capability(0), transformers.__version__, peft.__version__)"
```
通过标准：`torch.cuda.is_available()` 为 `True`，capability 为 `(12, 0)`。
若为 `False`：改用 CUDA 专用源重装 `torch==2.8.0 --index-url https://download.pytorch.org/whl/cu128`（该源直连会超时，重试或换镜像）；仍失败则记录阻塞，不用 CPU 假装训练完成。

---

### 阶段 B：训练脚本加固

文件：[sft_full_finetune.py](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/scripts/sft_full_finetune.py)

**B1 删除隐式 SIMULATION 降级（最重要）**
- `main()` 的 `except` 分支不再自动调用 `run_simulation`，改为记录完整 traceback 后 `sys.exit(1)`。
- 新增开关 `--allow-simulation`（默认 `False`）。只有显式传这个参数才跑仿真，且输出写到 `models/sft_xiaoxing_v1_SIMULATION/`，`training_summary.json` 里写 `"simulated": true`，绝不混入正式目录。

**B2 模式判定**
- 新增 `--force-mode {full,lora,cpu_offload}`，传了就跳过 `decide_training_mode`。
- 默认判定阈值保持不变（8GB 机器会被判 `cpu_offload`，所以本次**显式传 `--force-mode lora`**）。

**B3 LoRA 分支补显存优化**
```python
model = AutoModelForCausalLM.from_pretrained(
    model_name, torch_dtype=torch.float16, trust_remote_code=False)
model.enable_input_require_grads()
model = get_peft_model(model, lc)
model.config.use_cache = False
```
`TrainingArguments` 增加：
```python
gradient_checkpointing=True,
gradient_checkpointing_kwargs={"use_reentrant": False},
```

**B4 超参默认值调整（LoRA 专用）**
- `--lr` 默认从 `2e-5` 改为 `1e-4`（LoRA 常用区间 1e-4~2e-4；2e-5 是给全参微调的）。
- 其余保持：`r=16, alpha=32, dropout=0.05`，`target_modules` 维持 7 个投影层。

**B5 训练日志落盘 + 可控输出**
- 日志文件改为绝对路径 `ROOT/"sft_full_finetune.log"`（当前是相对 CWD，日志可能写到别处）。
- `training_summary.json` 增加字段：`base_model`、`dataset_rows`、`max_seq_len`、`loss_curve`（从 `trainer.state.log_history` 提取 `loss` / `eval_loss`）、`completed: true`。
- `Trainer` 加 `callbacks` 或直接训练后从 `log_history` 提取，不要新增依赖。

**B6 `format_row` 保持现状**
- `labels` 里 assistant 之前的位置置 `-100` 的逻辑继续用（`assistant\n` 锚点在 Qwen2.5 的 ChatML 模板里存在）。
- `padding="max_length"` 保留，配合 `max_seq_len=1024` 控制内存。

---

### 阶段 C：冒烟训练（先证明能学）

```
cd f:\B_proj\Big_proj\-StarIsle-\server-services\ai-engine
F:\starisle-work\venv310\Scripts\python.exe scripts\sft_full_finetune.py ^
  --smoke --force-mode lora ^
  --model F:\starisle-work\models\Qwen2.5-1.5B-Instruct ^
  --epochs 1 --batch 1 --grad-acc 8 --max-seq-len 1024 --lr 2e-4
```

通过标准（三条全中才继续）：
1. 日志里能看到多行 `{'loss': ...}`，**最后一条 loss 明显小于第一条**；
2. `models/sft_xiaoxing_v1/final_model/config.json` 存在；
3. `models/sft_xiaoxing_v1/training_summary.json` 里 `mode == "lora"`、`completed == true`、`simulated` 不存在。

OOM 处理顺序：`--max-seq-len 768` → `batch 1`（已是最小）→ 确认 `gradient_checkpointing=True` 生效 → 仍 OOM 才降级 `--force-mode cpu_offload`（真训练，只是慢）。

---

### 阶段 D：全量训练

```
F:\starisle-work\venv310\Scripts\python.exe scripts\sft_full_finetune.py ^
  --force-mode lora ^
  --model F:\starisle-work\models\Qwen2.5-1.5B-Instruct ^
  --epochs 2 --batch 1 --grad-acc 16 --max-seq-len 1024 --lr 1e-4
```

- 1832 条 → 约 115 step/epoch → 2 epoch 约 230 step。
- 训练完立即把 `final_model`（合并后的完整权重，约 3GB）写入 `server-services/ai-engine/models/sft_xiaoxing_v1/final_model`。
- **不承诺耗时**；如果显存足够（`nvidia-smi` 显示占用 < 6.5GB），可把 `--max-seq-len` 提到 1536 再跑，覆盖更多长样本。
- 若中途被打断：`TrainingArguments` 已设 `save_strategy="epoch"`，用 `resume_from_checkpoint` 续跑（脚本里补一个 `--resume` 参数指向最新 checkpoint 目录）。

---

### 阶段 E：让 ai-engine 用上微调后的模型

文件：[chat_service.py](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/app/services/chat_service.py)

**E1 `__init__` 加载本地模型**
- `self.model_name = os.getenv("MODEL_NAME", "deepseek-ai/deepseek-chat")` 保留，但本地模式下默认值改为 `models/sft_xiaoxing_v1/final_model`（相对 ai-engine 根目录解析成绝对路径）。
- `USE_LOCAL_MODEL=true` 时：
```python
self.device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if self.device == "cuda" else torch.float32
self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
self.model = AutoModelForCausalLM.from_pretrained(
    self.model_name, torch_dtype=dtype).to(self.device).eval()
```
- `pad_token` 为空时回填 `eos_token`。

**E2 重写 `_generate_local`**
```python
def _build_prompt(self, messages):
    try:
        return self.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        buf = "".join(f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n" for m in messages)
        return buf + "<|im_start|>assistant\n"

def _generate_sync(self, prompt):
    inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
    with torch.no_grad():
        out = self.model.generate(
            **inputs, max_new_tokens=200, do_sample=True,
            temperature=0.7, top_p=0.9, repetition_penalty=1.05,
            pad_token_id=self.tokenizer.pad_token_id,
            eos_token_id=self.tokenizer.eos_token_id)
    new_tokens = out[0][inputs["input_ids"].shape[-1]:]
    return self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

async def _generate_local(self, messages):
    import asyncio
    return await asyncio.to_thread(self._generate_sync, self._build_prompt(messages))
```
关键修复点：`.to(device)`、`**inputs`（带 `attention_mask`）、切片只 decode 新 token、`asyncio.to_thread` 避免阻塞事件循环。

**E3 响应里补 `model` 字段**
- [main.py](file:///f:/B_proj/Big_proj/-StarIsle-/server-services/ai-engine/app/main.py) 的 `ChatResponse` 增加 `model: str = ""`，`/chat` 里填 `response.get("model", "")`。这样 Java 侧能透传给前端（可选字段，不破坏现有契约）。

**E4 新增 `server-services/ai-engine/.env.example`**
```
USE_LOCAL_MODEL=true
MODEL_NAME=./models/sft_xiaoxing_v1/final_model
MODEL_API_KEY=
MODEL_API_BASE=https://api.deepseek.com
MONGODB_URL=mongodb://localhost:27017/starisle
```
（Mongo 不可用时 `KnowledgeService` 会自动 fallback，不影响启动。）

---

### 阶段 F：Java 网关转发 + 前端对齐

**F1 安装 Maven（当前缺失）**
```
winget install -e --id Apache.Maven --accept-package-agreements --accept-source-agreements
```
失败则下载 `apache-maven-3.9.x-bin.zip` 解压到 `F:\starisle-work\maven`，用绝对路径 `...\bin\mvn.cmd` 调用。

**F2 改 [ChatService.java](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/service/ChatService.java)**
- 注入 `AppConfig` 与 `RestTemplate`（用 `RestTemplateBuilder` 显式设 `connectTimeout=3s`、`readTimeout=90s`，本地 1.5B 生成 200 token 可能十几秒）。
- 新增 `AiChatResponse` 内部类承接 ai-engine 的 snake_case：`response/risk_level/emotion_tags/response_time_ms/model`。
- `generateResponse` 改为：只把 `context`（剔除 system 那条）和 `message` 传给 ai-engine，system prompt 交给 Python 侧的 `Star宝SystemPrompt` **单一来源**生成，避免两边各写一份。
- `generateApiResponse` 改为真实 POST `appConfig.getAiService().getUrl() + "/chat"`，body：
```json
{"user_id":"<userId>","message":"<message>","context":[...],"user_profile":{...}}
```
- 解析 `response` 字段；超时/异常仍返回现有兜底文案，但日志要 `log.warn` 记录原因（当前是静默吞掉）。
- `ChatResponse` 内部类扩展 `riskLevel`、`emotionTags`，`model` 取 ai-engine 返回值。

**F3 改 [ChatController.java](file:///f:/B_proj/Big_proj/-StarIsle-/backend-java/src/main/java/com/starisle/controller/ChatController.java)**
返回体改为前端期待的 camelCase：
```java
Map.of(
  "userId", request.getUserId(),
  "response", response.getContent(),
  "riskLevel", response.getRiskLevel() == null ? "green" : response.getRiskLevel(),
  "emotionTags", response.getEmotionTags() == null ? List.of() : response.getEmotionTags(),
  "responseTimeMs", response.getResponseTimeMs(),
  "model", response.getModel()
)
```
（`Map.of` 不接受 null，所以上面做了兜底；`riskLevel` 缺失时前端 `data.riskLevel === 'red'` 不会误触发危机上报。）

**F4 前端配置对齐**
- 新建 `web-frontend/.env`（从 `.env.example` 复制）：
```
VITE_API_BASE_URL=http://localhost:8081/api
VITE_WS_URL=ws://localhost:8081/ws
VITE_USE_MOCK=false
```
- 端口以 Java 实际启动端口为准（`application.yml` 默认 8081）。同步把 `.env.example` 的 8080 改成 8081，避免下一个人再踩。
- 前端**代码零改动**：`types/index.ts`、`api.ts`、`chatStore.ts` 已按 camelCase 写好。

---

### 阶段 G：`.gitignore` 防泄漏/防膨胀

`server-services/ai-engine/models/` 里已有 8 个小的 word2vec 文件被 Git 跟踪，不能整目录忽略。追加一条精确规则：

```
# 本机训练产出（体积大，禁止提交）
server-services/ai-engine/models/sft_xiaoxing_v1/
server-services/ai-engine/models/sft_xiaoxing_v1_SIMULATION/
```

用 `git check-ignore -v` 验证命中。

---

## 5. 假定与决策（已定，执行时不再二次确认）

| # | 决策 | 理由 | 备选/回退 |
|---|---|---|---|
| D1 | 基座用 `Qwen/Qwen2.5-1.5B-Instruct` | 原生 Transformers 支持、自带 ChatML `apply_chat_template`、1.5B 在 8GB 上 LoRA 可行；避开 Qwen1 的 `trust_remote_code` 与 torch 2.8 兼容坑 | 若必须保真原脚本基座，改 `--model Qwen/Qwen-1_8B-Chat` 一个参数即可，计划其余不变 |
| D2 | 用 LoRA 而非全参微调 | 1.8B 全参 fp16 ≈ 20GB，本机 8GB 不可能；LoRA 约 5–7GB | 全参需改配置并由用户提供 24GB+ 卡 |
| D3 | 绝不用 SIMULATION 冒充结果 | 脚本会伪造 `accuracy 0.87~0.90`；用户已明确要求"不要假装训练完成" | 只允许 `--allow-simulation` 显式开关，产物隔离命名 |
| D4 | 不新建独立推理服务 | ai-engine 已有 FastAPI + `/chat` + RAG + 风险检测，复用即可 | 若后续要独立部署再拆 |
| D5 | system prompt 只在 Python 侧生成 | 避免 Java/Python 两份人设漂移；RAG 与技能注入都在 Python | 无 |
| D6 | 前端不改代码，只改 `.env` | `chatApi` 已对接 `/v1/chat/message`，契约按前端现有类型反推后端输出 | 若 Java 无法构建，备选：前端新增直连 `ai-engine:8000/chat` 的调用（需加 CORS 与 snake_case 适配，改动更大） |
| D7 | Python/JDK 依赖产物全部放 F 盘 | C 盘只剩 0.1GB | 无 |
| D8 | 训练日志/检查点放 `models/` 与 gitignore | 3GB 权重不能进公开远端（origin/gitee 均为公开仓库） | 无 |

---

## 6. 验证步骤

1. **环境**：A6 自检输出 `True (12, 0)`。
2. **模型产物**：`final_model/` 下有 `config.json`、`model.safetensors`（约 3GB）；`training_summary.json` 里 `completed: true`、`eval_metrics.eval_loss` 为真实数值、无 `simulated`。
3. **ai-engine 直连**（不经过 Java）：
   ```
   curl -s -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d "{\"user_id\":\"u_test\",\"message\":\"我最近考试压力好大\",\"context\":[],\"user_profile\":{}}"
   ```
   通过标准：`response` 是一段连贯中文回复，**不是** `"小星收到了你的消息：..."`，且不是 `"小星好像有点迷糊了"` 兜底文案；`model` 字段指向本地路径。
4. **Java 网关**：启动后端 → `POST /api/v1/users/register` 拿 token → 带 `Authorization: Bearer` 调 `POST /api/v1/chat/message`，响应 JSON 里同时存在 `response`（正文）和 `responseTimeMs`，`response` 与第 3 步模型输出同源。
5. **构建**：`mvn -q -DskipTests package` 通过。
6. **前端端到端**：`npm run dev` 打开聊天页发一条消息，网络面板显示 `200 /api/v1/chat/message` 且响应含 `response`；同时 DevTools 里不应出现 `[chatStore] sendMessage 调用失败，降级使用 mock 回复` 的 warn。若出现该 warn，说明仍是 mock 兜底，不算通过。

---

## 7. 风险、阻塞与回退

| 风险 | 处置 |
|---|---|
| winget 装 Python/Maven 失败 | 改用官方安装包/便携 zip，落到 F 盘；仍不行则报告阻塞并给出用户需手动执行的命令 |
| torch 装成 CPU 版 / sm_120 不支持 | 用 cu128 源重装；仍失败则明确报告"本机无法 GPU 训练"，不伪造结果 |
| 8GB 显存 OOM | 按 C 阶段的降级顺序；最后可用 `cpu_offload` 真训练（慢） |
| HuggingFace 下载中断 | `HF_ENDPOINT=hf-mirror` + 重试；`final_model` 不依赖 HF 下线 |
| 训练耗时很长 | 分批执行、后台运行、给出真实进度；不虚报完成 |
| Java 构建环境缺失（Maven/JDK） | 先装 Maven；JDK 24 已存在，target 21 可编译。若 JDK 版本不兼容，可用 `C:\Users\pc\.jdks\temurin-23` |
| 前端端口不一致（8080 vs 8081） | F4 统一为实际端口，并同步 `.env.example` |
| Mongo 未启动 | `KnowledgeService` 自动 fallback，只影响 RAG，不影响对话 |

---

## 8. 明确不做的事

- 不重跑 BERT MLM 预训练（与 SFT 无关，且是独立中断任务，本轮只需 SFT）。
- 不修改 `requirements.txt`（避免破坏其他依赖 torch 2.1.2 的脚本），新增 `requirements-train.txt` 隔离。
- 不动 Android 三端。
- 不提交任何模型权重、训练数据、`.env` 到 Git 远端。
- 不引入 frappe-agent 相关任何技术栈。
- **不处理前端 `.env`/`.env.example` 端口对齐**（原 F4），前端重建由另一会话负责，本计划只覆盖训练环境、脚本加固、SFT 训练、ai-engine API、Java 网关转发。
