"""
skill_router.py - 技能路由器（can_handle 打分 → execute 注入 → 失败摘除）

所属模块：ai-engine/app/skills
功能简述：
    管理技能的注册、状态与调度。对话服务通过三段方法接入：
    build_available_skills_description（可用能力描述）、build_prompt_context
    （技能预判）、inject_for_chat（技能执行注入）。execute 失败会自动摘除技能。
依赖关系：
    - .base_skill：技能抽象基类
    - dataclasses/logging：运行时状态结构与日志
"""
from __future__ import annotations
import logging
from dataclasses import dataclass
from typing import Any, Dict, List
from .base_skill import BaseSkill

log = logging.getLogger(__name__)
# 技能激活阈值：can_handle 得分达到该值才真正执行
ACTIVATE_THRESHOLD = 0.6

@dataclass
class SkillRuntimeState:
    """
    技能运行时状态

    记录单个技能的激活状态、调用次数与错误信息，用于路由调度与摘除决策。
    """
    skill: BaseSkill                       # 技能实例
    state: str = "active"     # active / disabled    运行状态
    activation_count: int = 0              # 累计激活次数
    error_count: int = 0                    # 累计错误次数
    last_error: str = ""                    # 最近一次错误信息

class SkillRouter:
    """
    技能路由器 - can_handle打分 → execute注入 → 失败自动摘除

    维护技能注册表与运行时状态，提供可用能力描述、技能预判与执行注入
    三段方法，供对话服务拼装 System Prompt 上下文。
    """
    def __init__(self, skills: List[BaseSkill]):
        """
        初始化路由器并批量注册技能。

        Args:
            skills: 待注册的技能列表
        """
        self._states: Dict[str, SkillRuntimeState] = {}
        # 逐个注册传入的技能
        for s in skills: self.register(s)

    def register(self, s: BaseSkill) -> None:
        """
        注册单个技能，若同名已存在则覆盖并告警。

        Args:
            s: 待注册的技能实例
        """
        # 同名技能已存在时打印告警，随后覆盖
        if s.name in self._states:
            log.warning("Skill %s already registered, overriding", s.name)
        self._states[s.name] = SkillRuntimeState(skill=s)

    def status(self) -> List[Dict[str, Any]]:
        """
        返回所有技能的运行时状态摘要。

        Returns:
            List[Dict[str, Any]]: 各技能的状态、调用次数与错误信息
        """
        # 将运行时状态序列化为前端可读的结构
        return [{"name":v.skill.name,"display_name":v.skill.display_name,
                 "source_repo":v.skill.source_repo,"state":v.state,
                 "activation_count":v.activation_count,"error_count":v.error_count,
                 "last_error":v.last_error} for v in self._states.values()]

    def build_available_skills_description(self) -> str:
        """
        构造可用技能描述文本，注入 System Prompt 顶部。

        Returns:
            str: 可用能力描述；无激活技能时返回空字符串
        """
        # 仅描述 active 状态的技能
        active = [s for s in self._states.values() if s.state=="active"]
        if not active: return ""
        # 拼装可用能力列表，提示模型这些工具可调用
        lines = ["【可用能力参考】",
                 "（以下为小星可自动调用的外部工具能力，结果仅作参考：）"]
        for s in active:
            lines.append(f"- [{s.skill.display_name}] {s.skill.description}")
        return "\n".join(lines) + "\n"

    def build_prompt_context(self, msg: str, ctx: List[Dict], up: Dict) -> str:
        """
        对消息做技能预判，构造预判上下文文本。

        Args:
            msg: 用户消息
            ctx: 对话历史
            up: 用户画像

        Returns:
            str: 预判上下文文本；无技能可能激活时返回空字符串
        """
        parts: List[str] = []
        # 对每个 active 技能调用 can_handle 打分
        for name, s in self._states.items():
            if s.state != "active": continue
            # 打分异常时降级为 0 分并告警
            try: score = s.skill.can_handle(msg, ctx, up)
            except Exception as e:
                log.warning("can_handle %s failed: %s", name, e); score = 0
            # 达到阈值才列入预判
            if score >= ACTIVATE_THRESHOLD:
                parts.append(f"· 可能激活「{s.skill.display_name}」(匹配度 {score:.2f})")
        if not parts: return ""
        return "【技能预判】\n" + "\n".join(parts) + "\n\n"

    async def inject_for_chat(self, msg: str, ctx: List[Dict[str, Any]],
                              up: Dict[str, Any]) -> str:
        """
        执行命中技能并拼装注入文本，失败技能自动摘除。

        Args:
            msg: 用户消息
            ctx: 对话历史
            up: 用户画像

        Returns:
            str: 各激活技能的结果拼接文本
        """
        activated: List[str] = []
        # 遍历 active 技能，打分达标后执行
        for name, s in list(self._states.items()):
            if s.state != "active": continue
            # 打分异常直接摘除该技能
            try: score = s.skill.can_handle(msg, ctx, up)
            except Exception as e:
                s.state="disabled"; s.error_count+=1; s.last_error=str(e); continue
            # 未达阈值则跳过
            if score < ACTIVATE_THRESHOLD: continue
            # 执行技能逻辑，成功则记录激活次数与结果
            try:
                res = await s.skill.execute(msg, ctx, profile=up)
                s.activation_count += 1
                # 提取文本与置信度，缺失则降级
                t, c = res.get("text") or "", res.get("confidence") or 0
                activated.append(f"【{s.skill.display_name} 已激活(置信度{c:.2f})】\n{t}\n")
            except Exception as e:
                # 执行失败摘除技能并记录错误
                s.state="disabled"; s.error_count+=1; s.last_error=str(e)
        return "\n".join(activated)
