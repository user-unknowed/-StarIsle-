"""
test_base_skill.py - BaseSkill 抽象基类契约与辅助方法单元测试

所属模块：ai-engine/tests
功能简述：
    验证 BaseSkill 抽象基类的契约约束与默认行为：
      1. 抽象类不可直接实例化（未实现 can_handle/execute 时应抛 TypeError）
      2. 具体子类 DummySkill 满足 name/source_repo/can_handle/execute 契约
      3. __repr__ 输出包含技能名，便于日志调试
测试对象：app.skills.base_skill.BaseSkill
"""
import asyncio
import pytest
from typing import List, Dict, Any
from app.skills.base_skill import BaseSkill


class DummySkill(BaseSkill):
    """测试桩技能：匹配包含 'dummy' 的用户输入，返回固定参考结果。"""
    name = "dummy"; display_name = "虚拟技能"; source_repo = "test/test-repo"
    description = "测试用技能，匹配包含'dummy'的用户输入"
    def can_handle(self, msg, ctx, up):
        """输入含 dummy 时返回 0.9 高置信度，否则返回 0.0 不匹配。"""
        return 0.9 if "dummy" in msg.lower() else 0.0
    async def execute(self, msg, ctx, **kw):
        """执行技能并返回固定参考字典，便于断言结构。"""
        return {"text":"[Dummy参考]已触发样例能力","confidence":0.9,"raw_data":{"matched":True}}


def test_base_skill_abc_cannot_instantiate():
    """抽象基类未实现全部抽象方法时实例化应抛 TypeError。"""
    with pytest.raises(TypeError): BaseSkill()


def test_dummy_contract():
    """验证 DummySkill 的字段契约、can_handle 匹配逻辑与 execute 返回结构。"""
    async def _run():
        s = DummySkill()
        # 技能标识字段必须符合预期
        assert s.name == "dummy" and s.source_repo == "test/test-repo"
        # can_handle 对包含 dummy 的输入应返回高置信度
        assert s.can_handle("hello DUMMY here", [], {}) == 0.9
        # 不相关输入应返回 0
        assert s.can_handle("nothing", [], {}) == 0.0
        # execute 返回的字典须含 text 字段且 confidence 在 [0,1]
        out = await s.execute("hello dummy", [])
        assert isinstance(out, dict) and "text" in out and 0<=out["confidence"]<=1
    asyncio.run(_run())


def test_repr_contains_name():
    """__repr__ 输出须包含技能 name，便于在日志中定位技能实例。"""
    s = DummySkill()
    assert "dummy" in repr(s)
