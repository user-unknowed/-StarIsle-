"""SkillRouter 路由、异常降级、激活注入。"""
import asyncio
import pytest
from typing import Dict, List, Any
from app.skills.base_skill import BaseSkill
from app.skills.skill_router import SkillRouter, ACTIVATE_THRESHOLD

class SkillA(BaseSkill):
    name="skill_a"; display_name="技能A"; source_repo="t/a"; description="处理foo相关"
    def can_handle(self,m,c,u): return 0.95 if "foo" in m else 0.0
    async def execute(self,m,c,**kw): return {"text":f"A by {m}","confidence":0.95,"raw_data":{}}

class SkillB(BaseSkill):
    name="skill_b"; display_name="技能B"; source_repo="t/b"; description="处理bar相关"
    def can_handle(self,m,c,u): return 0.85 if "bar" in m else 0.0
    async def execute(self,m,c,**kw): return {"text":f"B by {m}","confidence":0.85,"raw_data":{}}

class Broken(BaseSkill):
    name="broken"; display_name="坏技能"; source_repo="t/x"; description="总报错"
    def can_handle(self,m,c,u): return 1.0
    async def execute(self,m,c,**kw): raise RuntimeError("boom")

def test_empty_router():
    assert SkillRouter([]).build_prompt_context("x",[],{}) == ""
    assert SkillRouter([]).build_available_skills_description() == ""

def test_multi_match_and_degrade():
    async def _run():
        r = SkillRouter([SkillA(),SkillB(),Broken()])
        ctx = await r.inject_for_chat("hi foo and bar", [], {})
        assert "A by" in ctx and "B by" in ctx
        # broken应该disabled
        st = {s["name"]:s for s in r.status()}
        assert st["broken"]["state"] == "disabled" and "boom" in st["broken"]["last_error"]
    asyncio.run(_run())

def test_available_description_shows_active():
    txt = SkillRouter([SkillA(),SkillB()]).build_available_skills_description()
    assert "技能A" in txt and "处理foo" in txt
    assert "技能B" in txt and "处理bar" in txt
