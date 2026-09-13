"""Auto-generated Skill Adapter for songlab-cal/bert-mental-health @ 2026-08-29T09:25:27"""
from __future__ import annotations
from typing import Any, Dict, List
from app.skills.base_skill import BaseSkill
from pathlib import Path
import re

class BertMentalHealthSkill(BaseSkill):
    name = 'bert_mental_health_skill'
    display_name = '开源能力:bert_mental_health'
    source_repo = 'songlab-cal/bert-mental-health'
    description = 'BERT 在心理健康 Reddit 文本上的继续预训练模型'

    def can_handle(self, message: str, context: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> float:
        msg = (message or "").lower(); kws = ['songlab', 'cal', 'bert', 'mental', 'health', '在心理健康', 'reddit', '文本上的继续预训练模型', 'python', 'sentiment', 'emotion', '心理']
        hits = sum(1 for k in kws if k in msg)
        return 0.0 if hits == 0 else min(0.5 + 0.15 * hits, 0.95)

    async def execute(self, message: str, context: List[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
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
