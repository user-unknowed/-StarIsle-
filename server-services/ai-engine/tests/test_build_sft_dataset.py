"""SFT 数据集构造 UT"""
import json, pathlib
from scripts.build_sft_dataset import (
    SOURCES, build_from_design_doc, build_from_knowledge_base,
    build_from_skills, write_jsonl, validate_sample,
)

def test_sources_exist():
    assert set(("design_doc","knowledge_base","fork_skills")).issubset(set(SOURCES))

def test_design_doc_500_and_no_red_words():
    a = build_from_design_doc()
    assert len(a) == 500
    RED = ("抑郁症","焦虑症","心理疾病","患者","病人","治疗")
    bad = [s for s in a if any(w in s["output"] for w in RED)]
    assert bad == [], f"发现红线输出 {bad[:2]}"
    assert len({s["source"] for s in a}) >= 10

def test_empty_kb(tmp_path, monkeypatch):
    kb = tmp_path/"kb.json"; kb.write_text("[]", encoding="utf-8")
    monkeypatch.setattr("scripts.build_sft_dataset.KB_JSON", pathlib.Path(kb))
    out = build_from_knowledge_base(target=100)
    assert len(out) <= 100

def test_validate_and_write(tmp_path):
    good = {"instruction":"你是小星","input":"输入","output":"小星温柔回复",
            "source":"ut","risk_level":"green"}
    bad = {"instruction":"","input":"","output":"抑郁症多休息","source":"x","risk_level":"green"}
    assert validate_sample(good) is True and validate_sample(bad) is False
    f = tmp_path/"sft.jsonl"; n = write_jsonl([good, bad], f)
    assert n == 1 and sum(1 for _ in open(f, encoding="utf-8")) == 1
