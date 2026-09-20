"""
test_skill_router.py - SkillRouter 路由与降级单元测试

所属模块：ai-engine/tests
功能简述：
    验证技能路由器的多技能匹配、异常降级与可用技能描述生成：
      1. 空路由器（test_empty_router）：无技能时 prompt 上下文与描述均为空串
      2. 多技能匹配与降级（test_multi_match_and_degrade）：同时匹配 SkillA/SkillB，
         Broken 技能报错后应被标记 disabled 且记录 last_error
      3. 可用技能描述（test_available_description_shows_active）：
         描述文本须包含各技能的 display_name 与匹配关键词
测试对象：app.skills.skill_router.SkillRouter、ACTIVATE_THRESHOLD
"""
import asyncio
import pytest
from typing import Dict, List, Any
from app.skills.base_skill import BaseSkill
from app.skills.skill_router import SkillRouter, ACTIVATE_THRESHOLD


class SkillA(BaseSkill):
    """测试技能 A：匹配 'foo' 关键词，返回高置信度结果。"""
    name="skill_a"; display_name="技能A"; source_repo="t/a"; description="处理foo相关"
    def can_handle(self,m,c,u):
        """输入含 foo 时返回 0.95，否则返回 0.0。"""
        return 0.95 if "foo" in m else 0.0
    async def execute(self,m,c,**kw):
        """执行并返回带前缀的文本结果。"""
        return {"text":f"A by {m}","confidence":0.95,"raw_data":{}}


class SkillB(BaseSkill):
    """测试技能 B：匹配 'bar' 关键词，置信度低于 A。"""
    name="skill_b"; display_name="技能B"; source_repo="t/b"; description="处理bar相关"
    def can_handle(self,m,c,u):
        """输入含 bar 时返回 0.85，否则返回 0.0。"""
        return 0.85 if "bar" in m else 0.0
    async def execute(self,m,c,**kw):
        """执行并返回带前缀的文本结果。"""
        return {"text":f"B by {m}","confidence":0.85,"raw_data":{}}


class Broken(BaseSkill):
    """测试坏技能：can_handle 恒为 1.0，execute 总抛异常，用于验证降级。"""
    name="broken"; display_name="坏技能"; source_repo="t/x"; description="总报错"
    def can_handle(self,m,c,u):
        """总是返回 1.0 以强制触发执行。"""
        return 1.0
    async def execute(self,m,c,**kw):
        """执行时抛 RuntimeError，触发路由器禁用该技能。"""
        raise RuntimeError("boom")


def test_empty_router():
    """空路由器：build_prompt_context 与 build_available_skills_description 均返回空串。"""
    assert SkillRouter([]).build_prompt_context("x",[],{}) == ""
    assert SkillRouter([]).build_available_skills_description() == ""


def test_multi_match_and_degrade():
    """多技能匹配：同时命中 A/B，Broken 报错后须 disabled 且 last_error 含 boom。"""
    async def _run():
        r = SkillRouter([SkillA(),SkillB(),Broken()])
        ctx = await r.inject_for_chat("hi foo and bar", [], {})
        # 上下文须同时包含 A 与 B 的输出
        assert "A by" in ctx and "B by" in ctx
        # broken 应被禁用，并记录错误信息
        st = {s["name"]:s for s in r.status()}
        assert st["broken"]["state"] == "disabled" and "boom" in st["broken"]["last_error"]
    asyncio.run(_run())


def test_available_description_shows_active():
    """可用技能描述：须包含技能 display_name 与描述关键词。"""
    txt = SkillRouter([SkillA(),SkillB()]).build_available_skills_description()
    assert "技能A" in txt and "处理foo" in txt
    assert "技能B" in txt and "处理bar" in txt
