"""
base_skill.py - 技能基类 BaseSkill 抽象定义

所属模块：ai-engine/app/skills
功能简述：
    定义所有 Fork Skills 适配器的抽象基类，包装 GitHub Fork 项目为
    小星可调度的能力，统一 can_handle 匹配打分与 execute 执行接口。
依赖关系：
    - abc：提供抽象基类与抽象方法支持
    - typing：提供类型注解
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseSkill(ABC):
    """
    技能抽象基类 — 包装 GitHub Fork 项目为小星可调度能力

    子类需实现 can_handle（匹配度打分）与 execute（执行能力）两个抽象方法，
    由 SkillRouter 统一调度。
    """
    name: str = "unnamed_skill"            # 技能唯一标识
    display_name: str = "未命名技能"        # 展示名称
    source_repo: str = ""                  # 来源 GitHub fork 仓库 owner/repo
    description: str = ""                  # 技能描述

    @abstractmethod
    def can_handle(self, message: str, context: List[Dict[str, Any]],
                   user_profile: Dict[str, Any]) -> float:
        """
        判断当前技能对消息的匹配度。

        Args:
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像

        Returns:
            float: [0,1] 匹配度；SkillRouter 阈值 0.6
        """
        ...

    @abstractmethod
    async def execute(self, message: str, context: List[Dict[str, Any]],
                      **kwargs: Any) -> Dict[str, Any]:
        """
        执行技能逻辑，返回能力结果。

        Args:
            message: 用户消息
            context: 对话历史
            **kwargs: 附加参数（如 profile）

        Returns:
            Dict[str, Any]: 包含 text、confidence、raw_data 的结果字典
        """
        ...

    def __repr__(self) -> str:
        """
        返回技能对象的字符串表示，便于调试。

        Returns:
            str: 包含技能名与来源仓库的表示
        """
        return f"<Skill {self.name} src={self.source_repo}>"
