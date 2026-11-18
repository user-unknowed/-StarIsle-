# 心理健康知识库（Mental Health KB）

面向 AI 检索的心理健康公开资料库：**只存原创摘要与链接，不复制受版权保护的正文**；方法部分**只收低风险自我调节做法**，不做诊断、不替代治疗。

- 建库时间：2026-11-16（2026-11-16 增补进食障碍与 PTSD）
- 条目总数：39（文章 25 + 方法 14）
- 语言：中文条目 29 条（文章 15 + 方法 14），英文原文 10 条（摘要均为中文）
- 存放位置：独立目录 `mental_health_kb/`，**未**写入或修改 `server-services/ai-engine/data/knowledge_base.json`

---

## 1. 目录结构

```
mental_health_kb/
├── README.md          # 本文件：分类体系、字段定义、检索示例、缺口
├── index.json         # 扁平索引，AI 检索入口
├── taxonomy.json      # 受控词表（主题/人群/方法类型/风险等级/来源类型）
├── sources.json       # 来源机构清单与可靠性分层
├── articles.json      # 文章类详情（25 条）
└── methods.json       # 方法类详情（14 条）
```

读取建议：**先读 `index.json` 做筛选与排序，命中后再按 `detail_file` + `detail_id` 打开详情**，避免一次性把全部详情塞进上下文。

---

## 2. 分类体系（5 个维度）

所有分类字段的取值都必须来自 `taxonomy.json`，已通过脚本校验，无越界取值。

### 2.1 主题 `themes`
按内容讨论的核心议题划分，可多选。用于回答"关于 X 有没有资料"。

| 取值 | 含义 | 条目数 |
|---|---|---|
| `depression` | 抑郁 / 抑郁障碍 / 情绪低落 | 11 |
| `anxiety` | 焦虑 / 广泛性焦虑 / 惊恐 / 社交焦虑 | 14 |
| `stress` | 压力与应激反应 | 15 |
| `sleep` | 睡眠问题与睡眠卫生 | 7 |
| `emotional-awareness` | 情绪觉察与情绪调节 | 7 |
| `wellbeing` | 整体心理健康与幸福感 | 6 |
| `help-seeking` | 求助路径与就医意识 | 6 |
| `adolescent-development` | 青少年心理发展 | 5 |
| `trauma-ptsd` | 创伤后应激障碍与创伤相关反应 | 3 |
| `eating-disorders` | 进食障碍（厌食、贪食、暴食、ARFID） | 3 |
| `aging-mental-health` | 老年心理健康 | 2 |
| `social-connection` | 人际连接与社会支持 | 2 |
| `suicide-prevention` | 自杀预防与危机识别 | 1 |

（主题计数为多标签累计，总和大于条目数。）

### 2.2 人群 `populations`
条目主要面向的读者，可多选。用于回答"给 X 人群看什么"。

`general`（普通成年人）、`adolescents`（约 10-19 岁）、`older-adults`（约 60/65 岁以上）、`parents-caregivers`（家长与照护者）、`students`（含大学生）、`workers`（职场人群）、`people-with-symptoms`（已出现轻中度困扰的人）。

### 2.3 方法类型 `method_types`
只对方法类条目填写，文章类为空数组。用于回答"有没有 X 类练习"。

`breathing`（呼吸调节）、`relaxation`（身体放松）、`mindfulness`（正念觉察）、`grounding`（接地/稳定化）、`sleep-hygiene`（睡眠卫生）、`worry-management`（担忧管理）、`mood-monitoring`（情绪/思维记录）、`behavioral-activation`（行为激活）、`physical-activity`（身体活动）、`social-connection`（社交连接）、`help-seeking-plan`（求助计划）。

### 2.4 风险等级 `risk_level`
衡量**"照此内容自行操作"的风险**，不衡量内容本身的严重程度。检索时应以此字段做安全过滤。

| 等级 | 定义 | 当前条目 |
|---|---|---|
| `L0` | 纯信息/科普，无可执行干预步骤 | 3（心理健康素养十条、NIMH 压力事实页、NIMH 进食障碍专题页） |
| `L1` | 低风险自助做法，健康成人可自行尝试 | 35 |
| `L2` | 需谨慎或在专业指导下使用 | 0（本库当前未收） |
| `L3` | 仅用于识别与转介，不得据此自行处理 | 1（WHO 自杀事实清单） |

> `L2` 已在词表中定义但暂无条目，原因是本库协议只收低风险方法；保留该等级便于后续扩展。

### 2.5 来源类型 `source_type`
用于权威度分层与排序：`international-organization`、`government-health-agency`、`hospital-specialist`、`academic-institute`、`clinical-resource-center`。

---

## 3. 字段定义

### 3.1 索引字段（`index.json` 的 `entries[]`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 全局唯一。文章 `art-zh-001`…/`art-en-001`…，方法 `mth-001`… |
| `type` | string | `article` 或 `method` |
| `lang` | string | `zh-CN` 或 `en`（指**原文语言**） |
| `title` | string | 条目标题 |
| `summary` | string | 150-250 字原创中文摘要，可直接用于召回与重排 |
| `themes` | string[] | 主题，取值见 2.1 |
| `populations` | string[] | 目标人群，取值见 2.2 |
| `method_types` | string[] | 方法类型，文章为 `[]` |
| `risk_level` | string | `L0`/`L1`/`L2`/`L3` |
| `source_org` | string | 来源机构中文名 |
| `url` | string | 原文链接（唯一权威出处） |
| `published_at` | string \| null | 发布日期；未标注时为 `null`（不猜） |
| `date_type` | string | `published` / `last_reviewed` / `reposted` / `unknown` / `not_applicable`(方法) |
| `collected_at` | string | 采集日期 `YYYY-MM-DD` |
| `detail_file` | string | `articles.json` 或 `methods.json` |
| `detail_id` | string | 与 `id` 相同，用于在详情文件中定位 |

### 3.2 文章详情额外字段（`articles.json`）

`source_type`、`key_points`（3-5 条要点）、`quote`（可选短引用，**本库目前全部为 `null`**）、`when_to_seek_help`（何时应求助）、`copyright_note`（版权说明）、`related_methods`（关联方法 id 数组）。

### 3.3 方法详情额外字段（`methods.json`）

| 字段 | 说明 |
|---|---|
| `steps` | 可执行步骤，4-6 条 |
| `duration` | 建议时长/频率 |
| `suitable_for` | 适用场景 |
| `not_suitable_for` | 不适用或需谨慎的情况 |
| `when_to_seek_help` | 何时应停止自助并求助 |
| `evidence_note` | 证据强度说明（区分"研究较多"与"辅助性"） |
| `copyright_note` | 版权说明 |
| `related_articles` | 关联文章 id 数组 |

---

## 4. 检索示例

### 4.1 找出所有低风险睡眠类方法

```powershell
$idx = (Get-Content -Raw -Encoding UTF8 .\index.json | ConvertFrom-Json).entries
$idx | Where-Object { $_.type -eq "method" -and $_.themes -contains "sleep" -and $_.risk_level -eq "L1" } |
    Select-Object id, title, url
```

```bash
jq '.entries[] | select(.type=="method" and (.themes|index("sleep")) and .risk_level=="L1") | {id,title,url}' index.json
```

### 4.2 面向青少年、排除 L3 的条目

```bash
jq '.entries[] | select((.populations|index("adolescents")) and .risk_level!="L3") | {id,title,source_org}' index.json
```

### 4.3 按主题召回摘要，再打开详情

```python
import json
idx = json.load(open("index.json", encoding="utf-8"))["entries"]
hits = [e for e in idx if "anxiety" in e["themes"] and e["risk_level"] != "L3"]
hits.sort(key=lambda e: (e["lang"] != "zh-CN", e["source_org"]))
for e in hits[:5]:
    print(e["id"], e["title"], e["summary"][:60], e["url"])

# 取第一条详情
det = json.load(open(hits[0]["detail_file"], encoding="utf-8"))
entry = next(x for x in det["entries"] if x["id"] == hits[0]["detail_id"])
print(entry["steps"] if entry["type"] == "method" else entry["key_points"])
```

### 4.4 推荐检索流程（给 AI 的约定）

1. 用 `themes` + `populations` 过滤候选；
2. 用 `risk_level` 硬过滤：`L3` 仅可转述"识别信号 + 立即求助"，不得给自助操作；`L2` 需提示"在专业指导下使用"；
3. 按 `source_org` 的 `sources.json.tier`（A>B>C）与 `date_type` 排序；
4. 只把命中的 `summary` 放进上下文，需要细节时再读 `detail_file`；
5. 输出时**必须**附 `url` 与 `when_to_seek_help`。

---

## 5. 来源清单

可靠性分层定义见 `sources.json.reliability_tiers`：A=国际组织与国家级卫生机构，B=精神专科医院/科研院所，C=临床资源中心公开自助材料。

| 机构 | 层级 | 用途 | 状态 |
|---|---|---|---|
| 世界卫生组织 WHO | A | 抑郁、焦虑、青少年、老年、自杀、压力、PTSD | 正常（进食障碍中文页已失效） |
| 美国 NIMH | A | 压力与焦虑识别、进食障碍 | 部分（GAD 专题页抓取失败） |
| 英国 NHS | A | 幸福感、减压、睡眠、呼吸、担忧管理、厌食症、PTSD | 正常（进食障碍入口页已失效，改用厌食症页） |
| 美国 CDC/NIOSH | A | 压力期睡眠管理 | 正常 |
| 澳大利亚 healthdirect | A | 放松技术（PMR、意象、正念） | 正常 |
| 国家卫健委（烟台市卫健委转载） | A | 心理健康素养十条 | 部分（原文页难定位，用转载版） |
| 北京大学第六医院 | B | 情绪觉察 | 正常 |
| 上海市精神卫生中心 | B | 阳光型抑郁、老年抑郁、儿童焦虑 | 正常 |
| 北京安定医院 | B | 睡眠障碍、情绪状态分层、神经性厌食 | 部分（2 篇无发布日期） |
| 中国科学院心理研究所 | B | 抑郁风险年轻化数据 | 正常 |
| 西澳临床干预中心 CCI | C | 思维日记、行为激活 | 正常 |

---

## 6. 版权原则

1. 所有条目均为**原创中文摘要 + 原文链接**，未复制原文正文；
2. `quote` 字段预留给必要的短引用，**上限 50 字**，本库当前 0 条使用；
3. 方法步骤是对公开页面要点的**转述改写**，不是原文照录；
4. 使用本库内容对外输出时，应保留 `source_org` 与 `url`，并注明"摘要，详见原文"。

---

## 7. 覆盖范围与已知缺口

### 已覆盖
- 议题：抑郁、焦虑、压力、睡眠、情绪觉察、幸福感、求助、青少年、老年、社会连接、自杀预防（识别层面）、创伤后应激障碍、进食障碍。
- 地域来源：国际（WHO/NIMH）、英国（NHS）、美国（CDC/NIOSH）、澳大利亚（healthdirect）、中国大陆（卫健委/北大六院/上海精卫/北京安定/中科院心理所）。
- 方法类型：呼吸、放松、正念、接地、睡眠卫生、担忧管理、情绪记录、行为激活、身体活动、社交连接、求助计划。

### 已知缺口（如实记录，未用编造条目填补）
1. **NIMH 广泛性焦虑（GAD）专题页抓取失败**（本地抓取器返回空内容），因此英文焦虑类权威条目仅有 1 条（healthdirect），焦虑主题的英文覆盖偏薄。
2. **国家卫健委《心理健康素养十条》原文页面未能定位**，采用烟台市卫健委 2023-12-13 的转载版，`date_type` 记为 `reposted`，非原始发布日期。
3. **北京安定医院 2 篇文章未标注发布时间**（情绪主题 1 篇、进食障碍 1 篇），`published_at` 为 `null`、`date_type` 为 `unknown`，未推测日期。
4. **healthdirect、NHS、NIMH 部分页面无单一发布日期**，`date_type` 记为 `unknown`，仅 `last_reviewed` 可查者标注审核日期（如 NIMH 进食障碍专题页 2024-12）。
5. **未覆盖的议题**：物质使用与成瘾、强迫症（OCD）、注意缺陷多动（ADHD）、围产期心理、慢性病共病心理问题、留守/流动人群、残障人群。
6. **进食障碍缺 A 级中文来源**：WHO 中文进食障碍事实清单页已失效（返回资源已移除），中文侧仅有北京安定医院 1 篇 B 级科普；其余 2 条为 NIMH/NHS 英文页面。本库**未收录进食障碍的自助方法**，因为营养恢复与体重监测必须在医疗监督下进行，不属于低风险自助范围。
7. **PTSD 只覆盖科普与自助基线**：创伤聚焦 CBT、EMDR 等循证干预均含暴露技术，须由专业人员实施，本库不做步骤化转载，也没有 L2 条目。
8. **中文一手自助方法来源偏少**：方法步骤多来自英文官方页面的中文转述，尚无中文官方自助手册原文可比对。
9. **未做临床审校**：摘要是基于公开页面的二次提炼，可能存在理解偏差；涉及具体医疗决策时应以原文与医生意见为准。
10. **无向量检索**：当前仅支持字段过滤与关键词匹配，未生成 embedding；如需语义检索需另行构建。
11. **时间范围偏窄**：条目集中在 2020-2026 年的科普与事实清单，未系统回溯 NICE/APA 等临床指南原文。

---

## 8. 使用边界（重要）

- 本库**不做诊断**，任何条目都不能用于自我确诊；
- 本库**不替代专业治疗**，`L1` 方法仅适用于轻度困扰的日常调节；
- 出现自伤/自杀念头、无法保证自身安全时，应立即联系当地急救或精神卫生危机干预热线，**不要**依赖本库自助内容；
- 未成年人、孕产妇、有严重躯体疾病者的自助练习，建议先咨询专业人员。

---

## 9. 维护方式

- 新增条目：先在 `taxonomy.json` 登记新取值（如需要），再写入 `articles.json` / `methods.json`，最后重建 `index.json`（保持 `id` = `detail_id`）。
- 必填校验：`id`、`type`、`lang`、`title`、`summary`、`risk_level`、`source_org`、`url`、`collected_at`、`detail_file`、`detail_id`、`when_to_seek_help`。
- 引用机器可读约束：`index.json` 的 `fields` 数组即为索引字段白名单。
- 本目录当前未被 `.gitignore` 忽略；若不希望入库，请自行将其加入 `.gitignore`。

### 9.1 接入 SFT 训练计划

本库已接入星屿 AI 的监督微调数据构造流程（见 `.trae/documents/ai-sft-train-and-api-export.md`）：

| 项 | 说明 |
|---|---|
| 入口脚本 | `server-services/ai-engine/scripts/build_sft_dataset.py`，新增"来源D：mental_health_kb" |
| 读取文件 | 本目录的 `articles.json` 与 `methods.json`（按 `id` 排序），不读取 `index.json`，避免二次解析 |
| 风险过滤 | 只取 `risk_level` 为 `L0`/`L1` 的条目；`L2` 与 `L3` 一律跳过（`L3` 按硬规则只用于识别与转介，不能生成自助答复） |
| 去标签化 | 复用脚本内的 `RED_WORDS` 与 `_desensitize()`，把"抑郁/焦虑症/患者/治疗/诊断"等词替换为中性表述 |
| 样本形态 | 文章类：`_qa()` 生成介绍型问答；方法类：按 `steps` 生成步骤型问答，并在结尾附 `when_to_seek_help` |
| 输出 | 并入 `server-services/ai-engine/data/sft_dataset_xiaoxing.jsonl`；条数写入 `data/sft_dataset_report.json` 的 `mental_health_kb` 字段 |
| 隔离性 | **不修改** `data/knowledge_base.json`，新增条目只在内存中拼接 |

注意：重新生成数据集需要训练环境（计划中的 Python 3.10 + venv），当前机器未安装 Python，脚本改动已就绪但尚未实际执行生成。新增条目会在下次运行 `build_sft_dataset.py` 时自动进入训练集。
