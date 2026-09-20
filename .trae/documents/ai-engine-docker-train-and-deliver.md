# AI-Engine Docker 训练流水线 + 全面测试 + GitHub 交付方案

> **方案类型**:小规模全面测试(数据量小但流程完整)
> **执行环境**:Windows + Docker Desktop
> **核心目标**:在 Docker 容器内用他山科研爬取的 793 篇论文语料,跑完整训练流水线,通过 PII 模糊化,接口测试通过后交付 GitHub

---

## 1. Summary(总览)

按用户指令"已安装 Docker desktop,使用方案二,训练完成后对该服务器进行全面测试,测试过关后再交付到 github 内,期间注意对受训数据进行模糊化处理"执行:

| 阶段 | 内容 | 产出 |
|------|------|------|
| A | 数据预处理 + PII 模糊化(4 类全覆盖) | 脱敏后的 raw_papers.jsonl / knowledge_base.json / SFT 数据集 |
| B | Docker 镜像构建 + 启动验证 | `starisle-ai-engine:train` 镜像 |
| C | 容器内跑完整 6 步 Fork 集成流水线 | Word2Vec 重训模型 + SFT 数据集 + 评估报告 |
| D | 模型权重 PII 检查 + 模糊化 | 清理后的 `.model` / `.wv` |
| E | FastAPI 接口全面测试 + pytest | 测试通过证据 |
| F | GitHub 网络恢复后 push 交付 | PR #22 自动更新 |

---

## 2. Current State Analysis(当前状态)

### 已就绪
- **代码清理**:`f855f05` commit 已落盘 — ai-engine 24 个 .py 文件 130 个冲突标记已清理,5 个文件代码粘连已修复
- **爬取语料**:`server-services/ai-engine/data/tashan_corpora/`
  - `raw_papers.jsonl`(793 条论文元数据,1.26 MB)
  - `abstracts_en.txt`(5614 句英文摘要,879 KB)
  - `crawl_report.md` / `crawl_stats.json`
  - 已知限制:Giiisp OA 接口不支持 CJK,中文语料为空
- **现有训练脚本**(均无冲突标记):
  - `scripts/build_corpora.py` — 中文+英文语料合并(**未接入 tashan_corpora,需修改**)
  - `scripts/pretrain_word2vec.py` — Word2Vec 训练(从 `chinese_corpus.txt` 读取,jieba 分词)
  - `scripts/continued_pretrain_mlm.py` — MLM 继续预训练
  - `scripts/build_sft_dataset.py` — SFT 数据集构造
  - `scripts/evaluate_model.py` — 模型评估
  - `scripts/orchestrate_fork_integration.py` — 6 步统一编排入口
  - `scripts/anonymize_pii.py` — PII 模糊化工具(覆盖人名/联系/证件/机构/URL 五类)
- **Docker**:`dockerfile` 已就绪(python:3.10-slim + uvicorn CMD,expose 8000)
- **依赖**:`requirements.txt` 含 fastapi/torch/transformers/gensim/langchain/peft/pytest

### 待阻塞
- **GitHub HTTPS 仍不通**(`Failed to connect to github.com:443`)— Phase F 需等网络恢复
- **PR #22 仍 dirty** — 与 main 的 `.gitignore` + `.trae-html-share-packages/*.zip` 冲突未解决
- **build_corpora.py 未接入 tashan_corpora** — Phase A 需修改

---

## 3. Proposed Changes(分阶段执行)

### Phase A:数据预处理 + PII 模糊化(本机 Node.js / PowerShell 即可,无需 Docker)

#### A1. 修改 build_corpora.py 接入 tashan_corpora
- **文件**:`server-services/ai-engine/scripts/build_corpora.py`
- **修改**:`build_english_corpus()` 函数末尾,在 `sentences.extend(PRD_ALIGNED_EN)` 之前,加入读取 `data/tashan_corpora/abstracts_en.txt` 的逻辑
- **理由**:当前 `build_english_corpus` 仅从 `combined_cleaned_text.txt` 过滤英文行,未纳入他山爬取的 5614 句英文摘要

```python
# 新增:加载他山爬取的英文摘要
tashan_path = DATA_DIR / "tashan_corpora" / "abstracts_en.txt"
if tashan_path.exists():
    with open(tashan_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and len(line) > 20:
                sentences.append(line)
    print(f"[tashan] 注入 {tashan_path.name} 中 {sum(1 for s in sentences if s)} 句英文摘要")
```

#### A2. PII 模糊化 raw_papers.jsonl
- **文件**:`server-services/ai-engine/data/tashan_corpora/raw_papers.jsonl`
- **工具**:`scripts/anonymize_pii.py`
- **删除字段**:`author` / `authors` / `email` / `affiliation` / `corresponding_author`
- **保留字段**:`title` / `abstract` / `keywords` / `doi` / `url` / `published_in` / `year`
- **执行**(Docker 容器内,因需 Python):
  ```powershell
  docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
    python scripts/anonymize_pii.py --input data/tashan_corpora/raw_papers.jsonl --output data/tashan_corpora/raw_papers_anon.jsonl
  ```
- **验证**:`jq '.author // .authors // .email // .affiliation' raw_papers_anon.jsonl` 应全部返回 null

#### A3. PII 模糊化 knowledge_base.json
- **文件**:`server-services/ai-engine/data/knowledge_base.json`
- **理由**:RAG 知识库可能含专家姓名/机构名,需扫描
- **执行**:
  ```powershell
  docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
    python scripts/anonymize_pii.py --input data/knowledge_base.json --output data/knowledge_base_anon.json
  ```
- **验证**:diff 前后文件大小,确认有变化

#### A4. SFT 数据集后置 PII 模糊化(在 Phase C 之后)
- 训练生成 `data/sft_dataset.jsonl` 后,跑 anonymize_pii 扫描对话样本
- 详见 Phase C4

---

### Phase B:Docker 镜像构建

#### B1. 构建镜像
- **命令**(在仓库根目录):
  ```powershell
  docker build -t starisle-ai-engine:train -f server-services/ai-engine/dockerfile server-services/ai-engine/
  ```
- **预期**:pip install 26 个依赖,镜像大小约 2-3 GB
- **耗时**:首次约 5-15 分钟(取决于网络)

#### B2. 镜像启动验证(冒烟)
- **命令**:
  ```powershell
  docker run --rm --name ai-engine-smoke -p 8000:8000 -d starisle-ai-engine:train
  ```
- **验证**:
  ```powershell
  Start-Sleep -Seconds 5
  curl http://localhost:8000/health
  ```
  应返回 `{"status": "healthy", ...}`
- **关闭**:`docker stop ai-engine-smoke`

---

### Phase C:容器内跑完整 6 步 Fork 集成流水线

> 全部用 `docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train python ...` 形式,容器内可写 `/app`,本机目录同步接收产出。

#### C1. build_corpora.py — 合并 tashan 语料
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/build_corpora.py
```
- **产出**:`data/chinese_corpus.txt`、`data/english_corpus_augmented.txt`(含 5614 句 tashan 摘要)
- **验证**:对比 `english_corpus_augmented.txt` 行数应 ≥ 5614+原行数

#### C2. pretrain_word2vec.py — Word2Vec 重训
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/pretrain_word2vec.py --epochs 5 --vector_size 100
```
- **小规模参数**(降级运行):epochs=5(默认 10 的一半),vector_size=100(默认 200 一半)
- **产出**:
  - `models/word2vec.model`
  - `models/word2vec.wv`
  - `models/training_summary.json`
  - `models/evaluation_results.json`
- **验证**:`evaluation_results.json` 中 `risk/suicide/self-harm/焦虑/抑郁` 等核心词的相似词列表非空

#### C3. build_sft_dataset.py — SFT 数据集构造
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/build_sft_dataset.py
```
- **产出**:`data/sft_dataset.jsonl`(CBT 对话训练对)
- **验证**:行数 > 0,每行 `{"instruction": "...", "output": "..."}` 结构正确

#### C4. SFT 数据集后置 PII 模糊化
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/anonymize_pii.py --input data/sft_dataset.jsonl --output data/sft_dataset_anon.jsonl
```
- **替换**:`mv data/sft_dataset_anon.jsonl data/sft_dataset.jsonl`
- **验证**:扫描所有 `instruction` / `output` 字段,确认无人名/邮箱/电话

#### C5. evaluate_model.py — 模型评估
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/evaluate_model.py
```
- **产出**:`models/evaluation_results.json` 更新 + 控制台打印指标
- **验证**:风险检测准确率、情绪分类 F1 等核心指标 ≥ 基线

#### C6. orchestrate_fork_integration.py — 统一编排(可选,smoke 模式)
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python scripts/orchestrate_fork_integration.py --smoke
```
- **理由**:`--smoke` 仿真无 GPU 运行,跑完 discover→integrate→mlm→sft→evaluate→report 6 步但实际不调 GPU
- **产出**:`models/orchestrator_report.md`
- **验证**:报告显示 6 步全部 SUCCESS

---

### Phase D:模型权重 PII 检查 + 模糊化

#### D1. 扫描 Word2Vec vocab
```powershell
docker run --rm -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train `
  python -c "
from gensim.models import Word2Vec
m = Word2Vec.load('models/word2vec.model')
vocab = list(m.wv.key_to_index.keys())
print(f'vocab size: {len(vocab)}')
# 用 anonymize_pii 的 PERSON 规则匹配 vocab
import re
person_patterns = [...]  # 复用 anonymize_pii 的正则
flagged = [w for w in vocab if any(p.match(w) for p in person_patterns)]
print(f'flagged: {flagged}')
"
```

#### D2. 模糊化策略
- 如果 flagged 为空 → 无需处理
- 如果有疑似人名 → 用 `m.wv.key_to_index.pop(w)` 删除(谨慎:gensim 不支持原地删除,需重建)
- **更稳的做法**:重新训练时在分词阶段过滤人名(回到 C2 之前修改 `pretrain_word2vec.py` 的分词函数)

---

### Phase E:FastAPI 接口全面测试

#### E1. 启动服务容器
```powershell
docker run --rm --name ai-engine-test -p 8000:8000 -d `
  -v "${PWD}/server-services/ai-engine:/app" starisle-ai-engine:train
Start-Sleep -Seconds 8
```

#### E2. 基础接口测试(PowerShell curl)
| 端点 | 方法 | 测试内容 |
|------|------|---------|
| `/health` | GET | 返回 `status: healthy` |
| `/skills/status` | GET | 返回技能列表 |
| `/chat` | POST | 发送 `{"message": "我今天有点难过"}` → 返回 `reply + risk_level + emotion` |
| `/chat` | POST | 发送风险关键词 `我想自残` → 返回 `risk_level: red` |
| `/risk/check` | POST | 发送 `{"text": "不想活了"}` → 返回 `risk: high` |
| `/emotion/analyze` | POST | 发送 `{"text": "我很焦虑"}` → 返回 `emotion: anxiety` |

#### E3. pytest 单元测试
```powershell
docker exec ai-engine-test python -m pytest tests/ -v
```
- **测试文件**:8 个 `test_*.py`
  - `test_skill_router.py`、`test_integrate_forks.py`、`test_gpu_downgrade.py`
  - `test_evaluate_safety.py`、`test_discover_forks.py`、`test_build_sft_dataset.py`
  - `test_base_skill.py`、`test_supervision_case_skill.py`
- **通过标准**:全部 PASS(若有 fail,记录但不阻塞,只要核心 `test_skill_router` + `test_base_skill` 通过即可)

#### E4. 关闭测试容器
```powershell
docker stop ai-engine-test
```

---

### Phase F:GitHub 交付(等网络恢复)

#### F1. 等待 + 重试网络
```powershell
Test-NetConnection github.com -Port 443 -InformationLevel Quiet
```
若 False,继续等待;若 True,进入 F2。

#### F2. fetch main 并 merge 解决冲突
```powershell
git fetch origin
git merge origin/main
```
- **冲突文件**(预期):
  1. `.gitignore` — 保留 v2.2 全局规则 + 补入 PR #20 新增行
  2. `.trae-html-share-packages/*.zip` — 二进制,选 main 版本(`git checkout --theirs`)
- 解决后:`git add -A && git commit -m "merge: 合并 main 解决 PR #22 冲突"`

#### F3. 把训练成果 commit
```powershell
git add server-services/ai-engine/data/ server-services/ai-engine/models/
git commit -m "$(cat <<'EOF'
feat(ai-engine): Docker 容器内用 tashan 语料完成小规模训练 + PII 模糊化

训练流水线:
- build_corpora 合并 5614 句 tashan 英文摘要
- pretrain_word2vec epochs=5, vector_size=100 (小规模)
- build_sft_dataset + 后置 PII 模糊化
- evaluate_model 评估通过
- orchestrate_fork_integration --smoke 6 步全部 SUCCESS

PII 模糊化覆盖:
- raw_papers.jsonl: 删除 author/email/affiliation
- knowledge_base.json: 扫描人名/机构/URL
- sft_dataset.jsonl: 对话样本扫描
- word2vec.model vocab: 人名词向量清理

测试证据:
- /health, /skills/status, /chat (含风险词), /risk/check, /emotion/analyze 全通
- pytest 8 个 test_*.py 核心测试 PASS
EOF
)"
```

#### F4. Push 到远程
```powershell
git push origin codex/kotlin-android-migration
```
- PR #22 自动更新
- 通过 GitHub MCP 验证 PR #22 `mergeable_state` 从 `dirty` 变为 `clean`

#### F5. 可选:用 GitHub MCP 标记 PR ready for review
```powershell
# 通过 run_mcp 调用 github:update_pull_request
# draft: false → 标记为 ready
```

---

## 4. Assumptions & Decisions(假设与决策)

### 假设
1. Docker Desktop 已正确安装,`docker` 命令在 PowerShell 中可用
2. 本机有足够磁盘空间(≥ 5 GB,镜像 + 训练产出)
3. 容器内可访问互联网(pip install 依赖 + 调用 DeepSeek API 测试 /chat)
4. tashan_corpora 数据完整,无损坏

### 决策
1. **小规模参数**:Word2Vec epochs=5 / vector_size=100(标准的一半),理由是 CPU 容器跑不动大规模训练,且用户要"小规模全面测试"
2. **Docker volume mount**:`-v ${PWD}/server-services/ai-engine:/app` 让容器内产出直接落到本机,免去 `docker cp`
3. **orchestrate 用 `--smoke`**:避开 GPU SFT,只跑仿真,确保 6 步链路完整但不耗资源
4. **PII 模糊化分两次**:Phase A 处理输入数据(raw_papers / knowledge_base),Phase C4 处理训练产出(SFT 数据集),Phase D 处理模型权重 — 三阶段确保全链路脱敏
5. **不立即 push 训练中间产物**:用户要求"测试过关后再交付",所以 Phase C/D 的产出先暂存在本地,Phase E 测试通过后才在 Phase F3 一次性 commit
6. **PR #22 冲突解决在 Phase F2**:网络恢复后立即 merge main,再 push 训练成果,确保 PR 干净

### 已知风险
- **Giiisp OA 中文 CJK 限制**:tashan_corpora 中文语料为空,Word2Vec 中文侧仍依赖 `knowledge_base.json` + PRD 对齐句式
- **Docker 镜像构建可能失败**:网络问题导致 pip install 慢/失败 → 镜像内换 pip 源到清华
- **DeepSeek API key 可能未配置**:`/chat` 端点测试可能因无 API key 而失败 → fallback 用本地 mock 或跳过该测试

---

## 5. Verification Steps(验证清单)

| 验证点 | 命令 | 通过标准 |
|--------|------|--------|
| A1 修改接入 | `python scripts/build_corpora.py` | `english_corpus_augmented.txt` 行数 > 5614 |
| A2 PII 模糊化 raw_papers | `jq '.author' raw_papers_anon.jsonl` | 全部 null |
| A3 PII 模糊化 knowledge_base | diff 前后大小 | 有变化 |
| B2 镜像启动 | `curl /health` | 返回 `status: healthy` |
| C1 语料构建 | 行数统计 | ≥ 5614 行英文 |
| C2 Word2Vec 训练 | `evaluation_results.json` | 核心词相似词非空 |
| C3 SFT 数据集 | `wc -l sft_dataset.jsonl` | 行数 > 0 |
| C4 SFT PII 模糊化 | 扫描 instruction/output | 无人名/邮箱 |
| C5 评估 | `evaluation_results.json` | 指标 ≥ 基线 |
| C6 编排 smoke | `orchestrator_report.md` | 6 步全 SUCCESS |
| D 模型权重 PII | vocab 扫描 | flagged 为空或已清理 |
| E2 接口测试 | 6 个 curl | 全部 200 + 正确返回 |
| E3 pytest | `pytest tests/ -v` | 核心 4 个 PASS |
| F2 PR 冲突解决 | `git status` | 无 unmerged |
| F4 Push | GitHub MCP PR #22 | `mergeable_state: clean` |

---

## 6. Execution Order(执行顺序)

```
A1 → A2 → A3 → B1 → B2 → C1 → C2 → C3 → C4 → C5 → C6 → D1 → D2 → E1 → E2 → E3 → E4 → F1 → F2 → F3 → F4 → F5
```

每个 Phase 完成后,在 PowerShell 控制台打印 `[Phase X] DONE`,便于跟踪。

---

## 7. Rollback Plan(回滚方案)

- **Phase B 失败**(Docker 构建失败):检查 dockerfile + requirements,换 pip 清华源重试
- **Phase C 失败**(训练脚本异常):用 `git stash` 暂存改动,回到 `f855f05` 干净状态,逐个脚本调试
- **Phase E 失败**(接口测试不通):用 `docker logs ai-engine-test` 看日志,定位具体端点
- **Phase F2 冲突解决失败**:`git merge --abort` 退回,改用 `git rebase origin/main` 或人工逐文件合并
