"""Skill Router — can_handle打分 → execute注入 → 失败自动摘除"""
from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import Any, Dict, List
from .base_skill import BaseSkill

log = logging.getLogger(__name__)
ACTIVATE_THRESHOLD = 0.6

@dataclass
class SkillRuntimeState:
    skill: BaseSkill
    state: str = "active"     # active / disabled
    activation_count: int = 0
    error_count: int = 0
    last_error: str = ""

class SkillRouter:
    def __init__(self, skills: List[BaseSkill]):
        self._states: Dict[str, SkillRuntimeState] = {}
        for s in skills: self.register(s)

    def register(self, s: BaseSkill) -> None:
        if s.name in self._states:
            log.warning("Skill %s already registered, overriding", s.name)
        self._states[s.name] = SkillRuntimeState(skill=s)

    def status(self) -> List[Dict[str, Any]]:
        return [{"name":v.skill.name,"display_name":v.skill.display_name,
                 "source_repo":v.skill.source_repo,"state":v.state,
                 "activation_count":v.activation_count,"error_count":v.error_count,
                 "last_error":v.last_error} for v in self._states.values()]

    def build_available_skills_description(self) -> str:
        active = [s for s in self._states.values() if s.state=="active"]
        if not active: return ""
        lines = ["【可用能力参考】",
                 "（以下为小星可自动调用的外部工具能力，结果仅作参考：）"]
        for s in active:
            lines.append(f"- [{s.skill.display_name}] {s.skill.description}")
        return "\n".join(lines) + "\n"

    def build_prompt_context(self, msg: str, ctx: List[Dict], up: Dict) -> str:
        parts: List[str] = []
        for name, s in self._states.items():
            if s.state != "active": continue
            try: score = s.skill.can_handle(msg, ctx, up)
            except Exception as e:
                log.warning("can_handle %s failed: %s", name, e); score = 0
            if score >= ACTIVATE_THRESHOLD:
                parts.append(f"· 可能激活「{s.skill.display_name}」(匹配度 {score:.2f})")
        if not parts: return ""
        return "【技能预判】\n" + "\n".join(parts) + "\n\n"

    async def inject_for_chat(self, msg: str, ctx: List[Dict[str, Any]],
                              up: Dict[str, Any]) -> str:
        activated: List[str] = []
        for name, s in list(self._states.items()):
            if s.state != "active": continue
            try: score = s.skill.can_handle(msg, ctx, up)
            except Exception as e:
                s.state="disabled"; s.error_count+=1; s.last_error=str(e); continue
            if score < ACTIVATE_THRESHOLD: continue
            try:
                res = await s.skill.execute(msg, ctx, profile=up)
                s.activation_count += 1
                t, c = res.get("text") or "", res.get("confidence") or 0
                activated.append(f"【{s.skill.display_name} 已激活(置信度{c:.2f})】\n{t}\n")
            except Exception as e:
                s.state="disabled"; s.error_count+=1; s.last_error=str(e)
        return "\n".join(activated)
