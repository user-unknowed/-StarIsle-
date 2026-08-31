"""
test_supervision_case_skill.py - 督导案例对话技能单元测试

所属模块：ai-engine/tests
功能简述：
    验证 SupervisionCaseSkill 的契约与行为：
      1. 技能元信息字段符合预期（name/display_name/source_repo）
      2. can_handle 对督导相关输入返回 >=0.6，对无关输入返回 0.0
      3. execute 返回 {text, confidence, raw_data} 三键结构
      4. execute 命中多个技能包时 matched_packages 正确归类
      5. execute 返回文本符合小星人设（含"小星"或技能包名称，末尾含免责标注）
测试对象：app.skills.supervision_case_skill.SupervisionCaseSkill
"""
import asyncio
import pytest
from app.skills.supervision_case_skill import SupervisionCaseSkill


@pytest.fixture
def skill():
    """提供 SupervisionCaseSkill 实例 fixture。"""
    return SupervisionCaseSkill()


def test_skill_metadata(skill):
    """技能元信息字段须符合预期，便于 SkillRouter 注入与状态展示。"""
    assert skill.name == "supervision_case_skill"
    assert skill.display_name == "督导案例:儿少心理咨询"
    assert skill.source_repo == "internal/supervision-teaching"
    assert "父母观察" in skill.description


def test_can_handle_hit_family_system(skill):
    """含家庭系统+逃避信号的输入，匹配度须 >= 0.6（激活阈值）。"""
    score = skill.can_handle("我爸妈天天吵架，我想躲起来", [], {})
    assert score >= 0.6


def test_can_handle_hit_multiple_packages(skill):
    """同时命中多组关键词时，匹配度须随命中组数提升。"""
    score = skill.can_handle("我厌学，爸妈控制我，想逃避", [], {})
    assert score >= 0.65


def test_can_handle_miss(skill):
    """无关输入匹配度须为 0.0，不激活技能。"""
    assert skill.can_handle("今天天气不错", [], {}) == 0.0
    assert skill.can_handle("", [], {}) == 0.0


def test_execute_contract(skill):
    """execute 返回须含 text/confidence/raw_data 三键，且 confidence 在 [0,1]。"""
    out = asyncio.run(skill.execute("我厌学，爸妈控制我，想逃避", []))
    assert isinstance(out, dict)
    assert {"text", "confidence", "raw_data"} <= set(out.keys())
    assert 0 <= out["confidence"] <= 1
    assert isinstance(out["text"], str) and out["text"]


def test_execute_matched_packages(skill):
    """命中多包时 matched_packages 须正确归类，且 source 标注督导教学。"""
    out = asyncio.run(skill.execute("我厌学，爸妈控制我，想逃避", []))
    raw = out["raw_data"]
    assert "matched_packages" in raw
    assert isinstance(raw["matched_packages"], list)
    assert len(raw["matched_packages"]) >= 1
    assert raw.get("source") == "supervision-teaching"


def test_execute_text_style(skill):
    """返回文本须符合小星人设：含技能包名称，末尾含免责标注。"""
    out = asyncio.run(skill.execute("我厌学，爸妈控制我", []))
    # 至少含一个技能包标识
    assert any(tag in out["text"] for tag in ["父母观察法", "循环发展督导五步",
                                              "结构性概念化四维评估", "家庭系统视角"])
    # 末尾含免责标注
    assert "仅供参考" in out["text"]


def test_execute_no_match_fallback(skill):
    """未命中任何技能包时，execute 须返回兜底说明而非空文本。"""
    out = asyncio.run(skill.execute("今天天气不错", []))
    assert out["text"]
    assert "督导案例" in out["text"]


def test_repr_contains_name(skill):
    """__repr__ 输出须包含技能 name，便于日志定位。"""
    assert "supervision_case_skill" in repr(skill)
