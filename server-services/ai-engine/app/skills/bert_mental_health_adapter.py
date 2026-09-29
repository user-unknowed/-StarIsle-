"""
bert_mental_health_adapter.py - BERT 心理健康技能适配器

所属模块：ai-engine/app/skills
功能简述：
    包装 songlab-cal/bert-mental-health 开源项目为小星可调度能力，
    提供心理健康 Reddit 文本继续预训练模型的匹配与执行接口。
"""
from __future__ import annotations
from typing import Any, Dict, List
from app.skills.base_skill import BaseSkill
from pathlib import Path
import re

class BertMentalHealthSkill(BaseSkill):
    """
    BERT 心理健康技能 - 基于 Reddit 文本继续预训练模型

    继承 BaseSkill，实现 can_handle 与 execute 方法，通过关键词匹配判断技能匹配度，
    执行时从仓库 README 检索相关片段并返回。
    """
    name = 'bert_mental_health_skill'                       # 技能唯一标识
    display_name = '开源能力:bert_mental_health'             # 前端展示名称
    source_repo = 'songlab-cal/bert-mental-health'          # 上游开源仓库
    description = 'BERT 在心理健康 Reddit 文本上的继续预训练模型'  # 技能描述

    def can_handle(self, message: str, context: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> float:
        """
        判断技能对消息的匹配度。

        Args:
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像

        Returns:
            float: [0,1] 匹配度，基于关键词命中数计算
        """
        msg = (message or "").lower(); kws = ['songlab', 'cal', 'bert', 'mental', 'health', '在心理健康', 'reddit', '文本上的继续预训练模型', 'python', 'sentiment', 'emotion', '心理']
        hits = sum(1 for k in kws if k in msg)
        return 0.0 if hits == 0 else min(0.5 + 0.15 * hits, 0.95)

    async def execute(self, message: str, context: List[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        """
        执行技能，从仓库 README 检索相关内容。

        Args:
            message: 用户消息
            context: 对话历史
            **kwargs: 附加参数

        Returns:
            Dict[str, Any]: 包含检索文本、置信度与原始数据的结果
        """
        readme = Path('/workspace/server-services/ai-engine/data/forked_repos/bert-mental-health/README.md')
        content = readme.read_text(encoding="utf-8", errors="ignore") if readme.exists() else ""
        lines = [ln.strip() for ln in re.split(r"[\n\.。]", content) if ln.strip()]
        qs = [t for t in re.split(r"\W+", message.lower()) if len(t) >= 2]
        scored = []
        for ln in lines:
            score = sum(1 for t in qs if t and t in ln.lower())
            if score > 0: scored.append((score, ln[:200]))
        scored.sort(reverse=True); hits = [s[1] for s in scored[:3]]
        if not hits:
            text = f"【{self.display_name}】该开源项目来自 {self.source_repo}，描述：{self.description!r}. 小星会根据该仓库内容组织参考回复～"
        else:
            text = f"【{self.display_name}】从仓库 README 检索到相关片段：\n- " + "\n- ".join(hits) + "\n（仅供参考）"
        return {"text": text, "confidence": 0.7 if hits else 0.45,
                "raw_data": {"matched_lines": len(hits), "repo": self.source_repo}}
