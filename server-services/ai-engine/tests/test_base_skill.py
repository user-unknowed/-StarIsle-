"""Test BaseSkill ABC contract and helpers."""
import asyncio
import pytest
from typing import List, Dict, Any
from app.skills.base_skill import BaseSkill

class DummySkill(BaseSkill):
    name = "dummy"; display_name = "虚拟技能"; source_repo = "test/test-repo"
    description = "测试用技能，匹配包含'dummy'的用户输入"
    def can_handle(self, msg, ctx, up): return 0.9 if "dummy" in msg.lower() else 0.0
    async def execute(self, msg, ctx, **kw):
        return {"text":"[Dummy参考]已触发样例能力","confidence":0.9,"raw_data":{"matched":True}}

def test_base_skill_abc_cannot_instantiate():
    with pytest.raises(TypeError): BaseSkill()

def test_dummy_contract():
    async def _run():
        s = DummySkill()
        assert s.name == "dummy" and s.source_repo == "test/test-repo"
        assert s.can_handle("hello DUMMY here", [], {}) == 0.9
        assert s.can_handle("nothing", [], {}) == 0.0
        out = await s.execute("hello dummy", [])
        assert isinstance(out, dict) and "text" in out and 0<=out["confidence"]<=1
    asyncio.run(_run())

def test_repr_contains_name():
    s = DummySkill()
    assert "dummy" in repr(s)
