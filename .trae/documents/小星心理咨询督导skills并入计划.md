# 小星心理咨询督导 skills 并入计划

## 摘要（Summary）

将 B 站视频《儿童青少年心理咨询 案例及督导教学》（BV1LG9wBhEMP）所代表的儿童青少年心理咨询督导专业知识，提炼为可被小星 AI 助手调度的 skills，**优先并入对话 skills**，同时配套更新判断决策 skills、System Prompt 对话原则与知识库 RAG 条目，使小星在 12-18 岁儿少场景下具备督导级的专业对话与风险判断能力。

## 现状分析（Current State Analysis）

### 探索确认的代码结构

基于对 6 个核心文件的实地读取，确认 skills 体系如下：

| 模块            | 文件路径                                                                                        | 职责                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 对话 skills 基类  | `/workspace/server-services/ai-engine/app/skills/base_skill.py`                             | `BaseSkill` ABC，定义 `can_handle`（打分 0-1）+ `execute`（返回 dict）双抽象方法，类属性 `name/display_name/source_repo/description`                                      |
| 对话 skills 路由  | `/workspace/server-services/ai-engine/app/skills/skill_router.py`                           | `SkillRouter`，阈值 `ACTIVATE_THRESHOLD=0.6`；三段注入：`build_available_skills_description`（可用能力）→ `build_prompt_context`（预判）→ `inject_for_chat`（执行结果）；失败自动摘除 |
| 现有适配器示例       | `/workspace/server-services/ai-engine/app/skills/emotional_support_conversation_adapter.py` | ESC 适配器，`can_handle` 用关键词命中数打分（0.5+0.15×hits，上限 0.95），`execute` 从 README 检索返回 `{"text","confidence","raw_data"}`                                      |
| 对话生成主流程       | `/workspace/server-services/ai-engine/app/services/chat_service.py`                         | `ChatService.generate_response`：System Prompt → RAG 知识注入 → Skill 三段注入 → 大模型生成；`set_skills(skills)` 由 Orchestrator 注入适配器列表                             |
| 判断决策 skills   | `/workspace/server-services/ai-engine/app/services/risk_detection_service.py`               | `RiskDetectionService`：L1 关键词（high/medium）+ L1.5 持续时间+情绪低落 + L2 语义；`_calculate_final_risk` 含积极词降级（"好起来/会好/想好/好多了/帮帮我"）与社交孤立降级                         |
| System Prompt | `/workspace/server-services/ai-engine/app/prompts/star宝_system_prompt.py`                   | `Star宝SystemPrompt.generate_prompt`：人设+说话风格+对话原则+安全红线+危机模式+CBT 框架；`add_available_skills_context` 拼接三段                                                 |

### 关键扩展点

* **新增对话 skill**：在 `app/skills/` 下新建 `*.py` 继承 `BaseSkill`，实现 `can_handle`/`execute`，由 Orchestrator（`integrate_forks.py`）或 `ChatService.set_skills` 注册即可生效，无需改动路由器。

* **三段注入格式**：`available_skills_description` 以 `【可用能力参考】` 开头列 `- [display_name] description`；`build_prompt_context` 输出 `【技能预判】\n· 可能激活「...」(匹配度 ...)`；`inject_for_chat` 输出 `【display_name 已激活(置信度...)】\n结果文本`。

* **execute 返回契约**：`{"text": str, "confidence": float, "raw_data": dict}`，`text` 会原样注入到 System Prompt。

## 提炼的督导专业知识（来自 WebSearch 公开信息）

基于对视频主题相关的权威公开资料检索，提炼 4 个督导技能包：

### 技能包 A：父母观察法（卢林督导精华）

* **核心动作**：不批评、不教育、不干扰；父母每周观察孩子一小时并记录片段；咨询师督导父母理解孩子"话里的话"。

* **识别信号**：亲子错位（孩子怎么说 vs 父母怎么接/误解/错过）、孩子"关在家里"=给父母机会而非拒绝。

* **触发关键词**：父母观察、看见孩子、亲子错位、不上学、不出门、关在家里、不理解孩子。

### 技能包 B：循环发展督导五步（萧文）

* **五步流程**：①了解咨询师对来访者的解读与感受 → ②了解已用策略与技巧 → ③核验假设与理论基础 → ④再检核技巧策略适当性 → ⑤重新整理咨询计划与目标。

* **触发关键词**：督导、概念化、策略检核、咨询计划、专业发展。

### 技能包 C：结构性概念化四维评估（岳晓东）

* **四维**：行为层面（请假/逃避/暴食）+ 情绪层面（焦虑/自责/无助）+ 认知层面（非理性信念"考砸就完了"）+ 家庭系统（纠缠依附/控制欲/被冷落）。

* **防御链条**："逃避—否认—退缩"识别。

* **核心话术**："我们不是要改变来访者的意愿，而是要看见他们背后的无力"；"你不是不行，而是你不敢说自己行"。

* **触发关键词**：厌学、概念化、防御、逃避、否认、退缩、完美主义、自我认同。

### 技能包 D：家庭系统视角（杜亚松）

* **两类家庭模式**："缺乏回应" vs "高控制"。

* **系统信号映射**：进食障碍=难以言说的情绪表达；厌学=家庭关系失衡的外在映射；问题行为=家庭报警器。

* **干预取向**：从"追究谁的错"转向"探索可能改变的路径"；中立立场；聚焦"现在"而非"过去"；尊重脱落/节律。

* **触发关键词**：家庭、亲子、高控制、缺乏回应、家庭系统、谁的错、脱落。

## 提议变更（Proposed Changes）

### 变更 1（优先）：新增对话 skill 适配器

**文件**：`/workspace/server-services/ai-engine/app/skills/supervision_case_skill.py`（新建）

**What**：新建 `SupervisionCaseSkill(BaseSkill)`，整合上述 4 个督导技能包为内部分支，作为小星对话 skills 的新成员。

**Why**：用户明确要求"优先并入对话 skills 内"。该适配器复用现有 `BaseSkill` 契约与 `SkillRouter` 三段注入机制，无需改动路由器，注册后即被小星对话流自动调度。

**How**：

* 类属性：`name="supervision_case_skill"`、`display_name="督导案例:儿少心理咨询"`、`source_repo="internal/supervision-teaching"`、`description="儿童青少年心理咨询案例与督导教学知识包：父母观察法、循环发展督导五步、结构性概念化四维评估、家庭系统视角"`。

* `can_handle(message, context, user_profile)`：维护 4 组触发关键词（A/B/C/D），按命中组数打分 `min(0.5 + 0.15×hits, 0.95)`，与 `emotional_support_conversation_adapter` 一致风格。

* `execute(message, context, **kwargs)`：内部按命中的技能包分支返回对应督导要点文本，包含：

  * 技能包标识与名称

  * 核心动作/流程要点（3-5 条）

  * 1-2 句示范话术（融入小星温柔短句风格，如"小星想到一个方法呀～"）

  * 末尾标注"（仅供参考，小星会结合你的情况调整）"

  * 返回 `{"text":..., "confidence": 0.75, "raw_data": {"matched_packages":[...], "source":"supervision-teaching"}}`。

**话术风格约束**：执行返回的 `text` 会原样注入 System Prompt，需符合小星人设（短句、语气词、邀请式建议、去标签化），不直接抛诊断词。

### 变更 2：System Prompt 对话原则扩展

**文件**：`/workspace/server-services/ai-engine/app/prompts/star宝_system_prompt.py`（编辑）

**What**：在 `generate_prompt` 的 `base_prompt` 中，于 `## CBT 对话框架` 段之后追加 `## 儿少咨询督导原则` 段落。

**Why**：让小星在所有对话中默认内化督导级原则，而非仅当 skill 激活时才体现，提升基础对话质量。

**How**：追加内容（保持小星语气）：

```
## 儿少咨询督导原则
1. 看见而非改变：先看见少年背后的无力，不急于改变意愿
2. 家庭系统视角：问题行为常是家庭关系的报警器，留意"高控制"与"缺乏回应"两类模式
3. 防御链条识别：察觉"逃避—否认—退缩"循环，不评判、不说教
4. 中立与当下：聚焦"现在"而非纠结"过去"，不追问"谁的错"
5. 尊重节律：少年关在家里≠拒绝世界，可能是给父母机会；尊重脱落与节奏
6. 父母观察法：可邀请家长"不批评不教育，先观察一小时"，帮助父母重新看见孩子
```

### 变更 3：判断决策 skills 增强

**文件**：`/workspace/server-services/ai-engine/app/services/risk_detection_service.py`（编辑）

**What**：在 `RiskDetectionService` 中新增"家庭系统失衡信号"关键词组与"防御链条"组合识别规则。

**Why**：现有判断仅覆盖个体危机词与持续时间，未识别儿少特有的家庭系统信号与防御链条，导致 case 级判断偏差。

**How**：

* 在 `__init__` 新增 `self.family_system_keywords = ["父母离异", "父母吵架", "家里没人理", "妈妈控制", "爸爸打人", "被冷落", "没人管我"]`（medium 级）。

* 在 `__init__` 新增 `self.defense_chain_indicators = ["逃避", "否认", "退缩", "不敢", "不敢说自己行"]`。

* 新增方法 `_detect_family_system(content)`：命中 family\_system\_keywords 返回 `{"level":"orange","reason":"family_system_signal"}`，否则 green。

* 在 `_detect_duration` 后调用，纳入 `_calculate_final_risk` 的 `max()` 比较。

* 在 `_calculate_final_risk` 末尾新增"防御链条降级"：当含 3 个以上 defense\_chain\_indicators 且同时含求助意愿词（"帮帮我/想好/好起来"）时，降为 yellow（避免把自我觉察的求助误判为高危）。

### 变更 4：知识库 RAG 条目导入脚本

**文件**：`/workspace/server-services/ai-engine/scripts/import_supervision_knowledge.py`（新建）

**What**：新建导入脚本，将 4 个督导技能包结构化为知识条目，供 `KnowledgeService.get_relevant_knowledge_for_chat` 检索。

**Why**：用户多选了"知识库 RAG 条目"。脚本化导入符合现有 `import_knowledge.py` 模式，可在对话时作为 RAG 上下文增强，与 skill 注入形成互补。

**How**：

* 复用 `import_knowledge.py` 的 argparse 与 KnowledgeService 调用模式（需先 Read 该文件确认签名）。

* 定义 `SUPERVISION_ENTRIES` 列表，每条含 `title/category/content/tags` 字段：

  * `title`: "父母观察法"、"循环发展督导五步"、"结构性概念化四维评估"、"家庭系统视角"

  * `category`: "supervision"

  * `content`: 各技能包要点（来自上方"提炼的督导专业知识"）

  * `tags`: 对应触发关键词

* 脚本支持 `--dry-run` 预览与 `--apply` 实际写入。

* 由于 `import_knowledge.py` 的具体函数签名需执行时再确认，本步骤在实现阶段先读取该文件再对齐调用方式。

### 变更 5：技能注册（ wiring ）

**文件**：`/workspace/server-services/ai-engine/app/main.py`（编辑，需先确认 skills 初始化位置）

**What**：将 `SupervisionCaseSkill` 实例加入 `ChatService.set_skills` 的适配器列表。

**Why**：新适配器需被注册才能被 `SkillRouter` 调度。`main.py` 的 `_autodiscover_skills` 已有自动发现机制，新文件放入 `app/skills/` 后可能被自动发现；若未自动发现则手动注册。

**How**：实现阶段先 Read `main.py` 确认 `_autodiscover_skills` 逻辑；若自动扫描 `app/skills/*.py`，则新文件自动生效，无需改动；若需手动列表，则在该列表追加 `SupervisionCaseSkill()`。

## 假设与决策（Assumptions & Decisions）

1. **视频内容来源**：WebFetch 无法读取 B 站视频流。经用户确认采用 WebSearch 搜索视频公开信息 + 通用儿少心理咨询督导专业知识构建，不依赖该视频的逐字稿。已通过 WebSearch 获取卢林父母观察法、萧文循环发展督导、岳晓东结构性概念化、杜亚松家庭系统视角等权威公开内容。
2. **优先级**：用户明确"优先并入对话 skills 内"，故变更 1（对话 skill 适配器）为核心交付，变更 2/3/4 为配套增强。
3. **不改动路由器**：`SkillRouter` 与 `BaseSkill` 契约稳定，新适配器零侵入接入，避免影响现有 ESC/BERT/Sentiment 三个适配器。
4. **话术风格一致性**：所有注入文本需符合小星人设（短句、语气词、邀请式、去标签化），避免诊断性词汇污染对话。
5. **导入脚本签名对齐**：变更 4 的 `import_knowledge.py` 函数签名在实现阶段先 Read 确认，避免假设错误。
6. **不引入新依赖**：仅用标准库（`re`/`pathlib`/`typing`），与现有适配器一致。
7. **测试**：参考 `tests/test_base_skill.py` 模式，为 `SupervisionCaseSkill` 补一份 `tests/test_supervision_case_skill.py`，覆盖 `can_handle` 命中/未命中与 `execute` 返回结构。

## 验证步骤（Verification Steps）

1. **静态检查**：

   * `python -c "from app.skills.supervision_case_skill import SupervisionCaseSkill; s=SupervisionCaseSkill(); print(s.name, s.display_name)"` 确认导入无误。

   * `grep -n "class SupervisionCaseSkill" app/skills/supervision_case_skill.py` 确认类定义存在。

2. **can\_handle 单测**：

   * 输入"我爸妈天天吵架，我想躲起来" → 期望 ≥0.6（命中家庭系统+逃避）。

   * 输入"今天天气不错" → 期望 0.0。

3. **execute 返回契约**：

   * `await s.execute("我厌学，爸妈控制我", [], profile={})` 返回 dict 含 `text/confidence/raw_data` 三键，`text` 非空且含"督导"或技能包名称。

4. **路由三段注入**：

   * 启动服务后调用 `/skills/status`，确认 `supervision_case_skill` 出现在状态列表且 `state=active`。

   * 调用 `/chat` 发送"我爸妈不理解我，我不想上学"，检查响应中 `rag_enhanced`/技能注入痕迹（响应文本或日志）。

5. **风险判断回归**：

   * 运行 `pytest tests/`，确认 `risk_detection_service` 既有测试（如有）未因新增 family\_system\_keywords 与 defense\_chain 逻辑而回归。

   * 手工验证："父母吵架，我想逃避一切，但想好起来" → 期望降为 yellow（防御链条+求助意愿降级生效）。

6. **System Prompt 注入**：

   * 打印 `Star宝SystemPrompt().generate_prompt({})`，确认含"## 儿少咨询督导原则"段落。

7. **知识库导入**：

   * `python scripts/import_supervision_knowledge.py --dry-run` 预览 4 条条目。

   * `python scripts/import_supervision_knowledge.py --apply` 写入后，`/knowledge/stats` 确认条目数 +4。

## 实现顺序建议

1. 变更 1（对话 skill 适配器）— 核心优先交付
2. 变更 5（注册 wiring）— 让变更 1 生效
3. 变更 2（System Prompt 原则）— 基础对话质量提升
4. 变更 3（判断决策增强）— 风险判断准确度
5. 变更 4（知识库导入脚本）— RAG 增强，可选
6. 补充测试 `tests/test_supervision_case_skill.py`

