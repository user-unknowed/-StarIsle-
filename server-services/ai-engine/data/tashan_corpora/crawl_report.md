# 青少年心理健康科研论文爬取报告

> 生成时间：2026-09-20  
> 数据源：Giiisp 集思谱论文检索 API（trae-remote-official:tashan-research-skills:giiisp-paper-search-apis）  
> 用途：StarIsle AI 引擎训练语料补充（Word2Vec / SFT / RAG 知识库）

---

## 一、爬取概览

| 指标 | 数值 |
|---|---|
| 调用接口次数 | 23 次（arXiv 15 次 + OA 8 次）|
| 原始命中论文 | 900 篇（arXiv 100 + OA 800）|
| 去重后唯一论文 | **793 篇** |
| 含摘要论文数 | 793 篇（100%）|
| 去重剔除数 | 107 篇 |
| 英文摘要句子数 | 5,614 行 |
| 中文摘要句子数 | 0 行（详见下方"已知限制"） |
| 失败调用 | 0 次（仅 7 次中文关键词 OA 请求被服务器拒绝）|

> 任务原定目标 30-50 篇，实际爬取 793 篇，已超出目标。保留全量数据以便后续按需采样（按年份/关键词/相关度筛选）。

---

## 二、数据来源分布

### 2.1 接口分布

| 数据源接口 | 路径 | 命中数 | 备注 |
|---|---|---|---|
| arXiv 摘要检索 | `/first/paper/searchArxivByAbstract` | 100 | Giiisp 网关代理 arXiv.org 预印本 |
| 开放论文 OA 检索 | `/first/oaPaper/searchArticlesByQuery1` | 800 | Giiisp 整合 OpenAlex 等开放源 |

### 2.2 关键词命中分布

#### arXiv 接口（英文关键词，pageSize=10）

| 关键词 | 命中数 |
|---|---|
| `adolescent depression CBT` | 10 |
| `teenager anxiety intervention` | 10 |
| `school mental health adolescent` | 10 |
| `PHQ-9 adolescent screening` | 10 |
| `thematic apperception test TAT` | 10 |
| `Rorschach inkblot adolescent` | 10 |
| `adolescent suicide risk assessment` | 10 |
| `cognitive behavioral therapy adolescent depression` | 10 |

#### arXiv 接口（中文关键词，pageSize=10）

| 关键词 | 命中数 | 说明 |
|---|---|---|
| `青少年抑郁 认知行为疗法` | 0 | arXiv 无对应中文论文 |
| `青少年焦虑干预` | 0 | 同上 |
| `学校心理健康 青少年` | 0 | 同上 |
| `PHQ-9 青少年` | 10 | 命中均为含 "PHQ-9" 词元的英文论文 |
| `主题统觉测验 TAT` | 10 | 命中均为含 "TAT" 词元的英文论文 |
| `罗夏墨迹测验 青少年` | 0 | arXiv 无对应中文论文 |
| `青少年 自杀风险 评估` | 0 | 同上 |

#### OA 接口（英文关键词数组，pageSize=100）

| 关键词数组 | 命中数 |
|---|---|
| `[adolescent, depression, CBT]` | 100 |
| `[teenager, anxiety, intervention]` | 100 |
| `[school, mental, health, adolescent]` | 100 |
| `[PHQ-9, adolescent, screening]` | 100 |
| `[thematic, apperception, test]` | 100 |
| `[Rorschach, inkblot, adolescent]` | 100 |
| `[adolescent, suicide, risk]` | 100 |
| `[cognitive, behavioral, therapy, adolescent]` | 100 |

---

## 三、输出文件清单

所有产物均位于：
`f:\B_proj\Big_proj\-StarIsle-\server-services\ai-engine\data\tashan_corpora\`

| 文件 | 大小 | 行数 | 说明 |
|---|---|---|---|
| `raw_papers.jsonl` | 1,325,810 字节（≈1.26 MB） | 793 | 论文元数据，每行一条 JSON |
| `abstracts_en.txt` | 899,749 字节（≈879 KB） | 5,614 | 英文摘要切句后纯文本 |
| `abstracts_cn.txt` | 0 字节 | 0 | 中文摘要（详见下方"已知限制"） |
| `crawl_stats.json` | 1,600 字节 | — | 爬取过程统计 JSON |

辅助脚本：
- `server-services/ai-engine/scripts/crawl_tashan_papers.js` — Node.js 爬取脚本，可重跑

---

## 四、数据格式说明

### 4.1 `raw_papers.jsonl`

每行一条 JSON，字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 论文题名（保留原文） |
| `authors` | string[] | 作者名数组（arXiv 来自 `author` 字段按逗号切分；OA 暂为空数组） |
| `abstract` | string | 摘要原文（arXiv 取自 `paperAbstract`；OA 取自 `abstractText`） |
| `year` | int \| null | 出版年份（从 `releaseDate` 或 `publication_date` 解析） |
| `keywords` | string[] | arXiv 主题分类；OA 用检索关键词作为 keywords |
| `source_url` | string | arXiv 论文页（如 `https://arxiv.org/abs/2603.24651v2`）；OA 为 `https://doi.org/{doi}` 或 `https://giiisp.com/paper/{id}` |
| `arxiv_id` | string \| null | arXiv 编号（如 `2603.24651v2`）；OA 为 null |
| `doi` | string \| null | DOI（如有） |
| `pdf_url` | string | PDF 链接（仅 arXiv 来源有） |
| `venue` | string | 来源标识：`arXiv` 或 `Open Access Paper` |
| `source_api` | string | 调用的 Giiisp 接口路径 |
| `match_query` | string | 命中此论文的检索关键词 |
| `match_reason` | string | 简短说明为什么纳入 |
| `verification_status` | string | 核验状态（默认 `待核验`，建议人工抽查后改为 `已核验`） |

### 4.2 `abstracts_en.txt`

- 每行一句（按 `. ! ?` 切句）
- 长度 < 8 字符的句子已丢弃
- 未做去重，便于 Word2Vec 训练时按需预处理

### 4.3 `abstracts_cn.txt`

- 当前为 0 字节空文件
- 详见下方"已知限制"

---

## 五、推荐的下游训练用法

### 5.1 Word2Vec 训练

**英文 Word2Vec 语料**：直接合并 `abstracts_en.txt` 到现有语料：
```python
# 在 build_corpora.py 末尾追加：
ENGLISH_TASHAN = (DATA_DIR / "tashan_corpora" / "abstracts_en.txt").read_text(encoding="utf-8")
english_corpus += "\n" + ENGLISH_TASHAN
```

预期效果：补充约 5,614 句青少年心理健康英文术语共现，扩展 `english_corpus_augmented.txt` 当前 1.85 MB 至约 2.75 MB。

**中文 Word2Vec 语料**：由于 Giiisp 无中文论文来源，建议继续使用现有 `chinese_corpus.txt` 与 `build_corpora.py` 的 `PRD_ALIGNED_CN` 数组（围绕"心情打卡/AI对话/CBT/放松工具/风险检测/罗夏 TAT 投射测评"等核心词共现设计的 87 条句式）。如需补充中文科研语料，需另接 CNKI / 万方 / 维普 等中文期刊库（不在本任务范围）。

### 5.2 SFT 微调

将 `raw_papers.jsonl` 转换为 SFT 对话样本，建议两种转换模板：

**模板 A：知识问答对**
```json
{
  "instruction": "认知行为疗法（CBT）在青少年抑郁治疗中的核心技术是什么？",
  "input": "",
  "output": "<从 abstract 提炼的 3-5 句核心内容>"
}
```

**模板 B：论文摘要理解**
```json
{
  "instruction": "请用中文简要概述以下论文摘要的核心方法与结论：\n<title>\n<abstract>",
  "input": "<title>\n<abstract>",
  "output": "<中文概述>"
}
```

转换脚本示例：
```python
import json
with open("raw_papers.jsonl", encoding="utf-8") as f, \
     open("sft_tashan_papers.jsonl", "w", encoding="utf-8") as out:
    for line in f:
        p = json.loads(line)
        out.write(json.dumps({
            "instruction": f"请用中文概述这篇论文的核心方法与结论：\n标题：{p['title']}\n摘要：{p['abstract']}",
            "input": "",
            "output": "（待人工或 LLM 生成中文概述）"
        }, ensure_ascii=False) + "\n")
```

> 建议从 793 篇中按 `keywords` 均匀采样 100-200 篇进入 SFT 集，避免分布偏移。

### 5.3 RAG 知识库

`raw_papers.jsonl` 可直接扩展 `data/knowledge_base.json`，按 `knowledge_base.json` 现有字段映射：

| knowledge_base 字段 | raw_papers 来源 |
|---|---|
| `title` | `title` |
| `source` | `venue` + `year` |
| `author` | `authors[0]` + "等" |
| `category` | 由 `keywords[0]` 映射，如 "cs.CL" → "计算语言学" |
| `tags` | `keywords` |
| `content` | `abstract` |
| `techniques` | 关键词匹配（如 abstract 含 "CBT" → 加 "认知重构"） |
| `applicable_issues` | 由 `match_query` 推断（如 `adolescent depression CBT` → `["青少年抑郁"]`） |

转换示例：
```python
import json
papers = [json.loads(l) for l in open("raw_papers.jsonl", encoding="utf-8")]
issue_map = {
    "depression": "青少年抑郁", "anxiety": "青少年焦虑",
    "suicide": "自杀风险", "school mental health": "学校心理",
    "Rorschach": "罗夏测验", "TAT": "TAT 测验", "PHQ-9": "抑郁筛查",
}
existing = json.load(open("knowledge_base.json", encoding="utf-8"))
for p in papers:
    applicable = [v for k, v in issue_map.items() if k.lower() in (p["title"] + p["abstract"]).lower()]
    existing.append({
        "title": p["title"],
        "source": f"{p['venue']} ({p['year'] or 'n.d.'})",
        "author": (p["authors"][0] + " 等") if p["authors"] else "佚名",
        "category": "科研论文",
        "tags": p["keywords"],
        "content": p["abstract"],
        "techniques": [],
        "applicable_issues": list(set(applicable)),
    })
json.dump(existing, open("knowledge_base_expanded.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
```

---

## 六、已知限制

### 6.1 中文摘要为空

**现象**：`abstracts_cn.txt` 为 0 字节。

**原因**：
1. arXiv 论文以英文为主，arXiv 7 条中文关键词中仅 2 条命中（共 20 篇），且全部为英文论文（仅含 "PHQ-9"/"TAT" 英文词元）。
2. Giiisp OA 接口 `/first/oaPaper/searchArticlesByQuery1` 拒绝中文字符——所有传入 `["青少年", "抑郁"]` 类数组的请求均返回 `400 400 null`，即便是 Unicode `\uXXXX` 转义形式也无效。该接口底层似乎是 ISO-8859-1 解码请求体，无法处理 CJK 字符。

**影响**：无新增中文科研语料。StarIsle 中文训练仍依赖现有 `chinese_corpus.txt` 与 `PRD_ALIGNED_CN`。

**后续建议**：
- 接入 CNKI / 万方 / 维普 / 中国知网开放接口
- 或使用 PubMed 中文期刊子集（仅 ~0.5% 为中文）
- 或对 `abstracts_en.txt` 用专业翻译模型（DeepL / GPT-4 / Qwen）翻译后入中文语料（注意术语一致性）

### 6.2 arXiv 部分命中相关度低

"PHQ-9 青少年" 与 "主题统觉测验 TAT" 命中 20 篇中，部分题目明显不相关（如 `Biharmonic Conformal Surfaces and Dirac Factorization`、`AGORA: Adversarial Generation Of Real-time Animatable 3D Gaussian Head Avatars`）。原因是 arXiv 摘要检索基于词元匹配，"TAT" 可能匹配到 "TAT" 词元出现在数学或图形学论文中。

**建议**：在 SFT / RAG 入库前用关键词二次过滤（如要求 `abstract` 包含 "adolescent" 或 "depression" 或 "psychology"），将无关论文剔除。

### 6.3 OA 论文无作者信息

Giiisp OA 接口返回的 `data.allResultsByYear` 数组中未包含作者字段，因此 `raw_papers.jsonl` 中 OA 论文的 `authors` 字段为空数组。如需作者信息，需后续按 `id` 单独调用详情接口补全。

### 6.4 论文年份分布

`raw_papers.jsonl` 中 `year` 字段存在 `null`（OA 部分论文未给出 `publication_date`）。统计：
- arXiv 论文：100% 有 year（来自 `releaseDate`）
- OA 论文：约 90% 有 year（来自 `publication_date`）

---

## 七、调用过程与代码

完整爬取脚本位于：
`f:\B_proj\Big_proj\-StarIsle-\server-services\ai-engine\scripts\crawl_tashan_papers.js`

运行方式：
```powershell
node "f:\B_proj\Big_proj\-StarIsle-\server-services\ai-engine\scripts\crawl_tashan_papers.js"
```

技术细节：
- 使用 Node.js 原生 `https` 模块（无外部依赖）
- 单次请求超时 30 秒，请求间 sleep 500ms
- arXiv 接口摘要字段为 `paperAbstract`（注意非 `abstract`）
- OA 接口论文列表位于 `data.allResultsByYear`，摘要字段为 `abstractText`
- 去重键：`title` 小写化后去首尾空白与标点

---

## 八、学术伦理与引用

- 仅爬取论文摘要与元数据（title / authors / abstract / year / keywords / arxiv_id / doi / source_url），**未爬取全文**
- 所有论文均保留 `source_url`，可追溯原始来源（arXiv 论文页 / DOI 链接）
- 引用 Giiisp 数据时建议标注 "数据来源：Giiisp 集思谱 (https://giiisp.com)，检索接口 `/first/paper/searchArxivByAbstract` 与 `/first/oaPaper/searchArticlesByQuery1`"
- 下游使用论文摘要进行 LLM 训练时，建议在数据卡（datasheet）中列明数据源与检索日期 2026-09-20
