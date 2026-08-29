"""BaseSkill ABC — 包装 GitHub Fork 项目为小星可调度能力"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseSkill(ABC):
    name: str = "unnamed_skill"
    display_name: str = "未命名技能"
    source_repo: str = ""
    description: str = ""

    @abstractmethod
    def can_handle(self, message: str, context: List[Dict[str, Any]],
                   user_profile: Dict[str, Any]) -> float:
        """返回 [0,1] 匹配度；SkillRouter阈值0.6"""
        ...

    @abstractmethod
    async def execute(self, message: str, context: List[Dict[str, Any]],
                      **kwargs: Any) -> Dict[str, Any]:
        """返回 {text, confidence, raw_data}"""
        ...

    def __repr__(self) -> str:
        return f"<Skill {self.name} src={self.source_repo}>"
