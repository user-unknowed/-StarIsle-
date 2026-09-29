"""
emotional_support_conversation_adapter.py - 情绪支持对话技能适配器

所属模块：ai-engine/app/skills
功能简述：
    包装 thu-coai/Emotional-Support-Conversation 开源项目，提供情绪支持对话数据集与模型能力。
"""
from __future__ import annotations
from typing import Any, Dict, List
from app.skills.base_skill import BaseSkill
from pathlib import Path
import re

class EmotionalSupportConversationSkill(BaseSkill):
    """
    情绪支持对话技能 - 基于清华 CoAI ESC 数据集与模型

    实现 can_handle 判断消息匹配度，execute 从仓库 README 检索相关内容并返回。
    """
    name = 'emotional_support_conversation_skill'               # 技能唯一标识
    display_name = '开源能力:Emotional_Support_Conversation'      # 前端展示名称
    source_repo = 'thu-coai/Emotional-Support-Conversation'     # 上游开源仓库
    description = '清华CoAI 情绪支持对话数据集(ESC)与模型，与小星CBT框架高度匹配'  # 技能描述

    def can_handle(self, message: str, context: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> float:
        """
        基于关键词判断技能匹配度。

        Args:
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像

        Returns:
            float: [0,1] 匹配度
        """
        msg = (message or "").lower(); kws = ['thu', 'coai', 'emotional', 'support', 'conversation', '清华coai', '情绪支持对话数据集', 'esc', '与模型', '与小星cbt框架高度匹配', 'python', 'sentiment']
        hits = sum(1 for k in kws if k in msg)
        return 0.0 if hits == 0 else min(0.5 + 0.15 * hits, 0.95)

    async def execute(self, message: str, context: List[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        """
        执行技能，检索仓库 README 内容。

        Args:
            message: 用户消息
            context: 对话历史
            **kwargs: 附加参数

        Returns:
            Dict[str, Any]: 技能执行结果
        """
        readme = Path('/workspace/server-services/ai-engine/data/forked_repos/Emotional-Support-Conversation/README.md')
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
