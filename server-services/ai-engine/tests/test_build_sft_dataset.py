"""
test_build_sft_dataset.py - SFT 微调数据集构造单元测试

所属模块：ai-engine/tests
功能简述：
    验证 build_sft_dataset.py 的数据集构造与校验逻辑：
      1. 数据来源集合（test_sources_exist）：design_doc/knowledge_base/fork_skills 必须存在
      2. 设计文档样本（test_design_doc_500_and_no_red_words）：须 500 条、
         无红线词、来源场景数 >=10
      3. 空知识库（test_empty_kb）：KB 为空时返回数量 <= target
      4. 校验与写入（test_validate_and_write）：合法/非法样本校验正确，
         write_jsonl 仅写入合法样本
测试对象：scripts.build_sft_dataset 的 SOURCES、build_from_design_doc、
         build_from_knowledge_base、build_from_skills、write_jsonl、validate_sample
"""
import json, pathlib
from scripts.build_sft_dataset import (
    SOURCES, build_from_design_doc, build_from_knowledge_base,
    build_from_skills, write_jsonl, validate_sample,
)


def test_sources_exist():
    """数据来源集合须包含 design_doc/knowledge_base/fork_skills。"""
    assert set(("design_doc","knowledge_base","fork_skills")).issubset(set(SOURCES))


def test_design_doc_500_and_no_red_words():
    """设计文档来源：须生成 500 条样本，无红线词且场景来源 >=10。"""
    a = build_from_design_doc()
    assert len(a) == 500
    # 红线词：回复中不应出现诊断性词汇
    RED = ("抑郁症","焦虑症","心理疾病","患者","病人","治疗")
    bad = [s for s in a if any(w in s["output"] for w in RED)]
    assert bad == [], f"发现红线输出 {bad[:2]}"
    # 来源场景数应 >=10（设计文档 §8 的 10 场景）
    assert len({s["source"] for s in a}) >= 10


def test_empty_kb(tmp_path, monkeypatch):
    """空知识库：KB 为 [] 时返回数量应 <= target，不抛异常。"""
    kb = tmp_path/"kb.json"; kb.write_text("[]", encoding="utf-8")
    # 将模块内 KB_JSON 路径重定向到临时空文件
    monkeypatch.setattr("scripts.build_sft_dataset.KB_JSON", pathlib.Path(kb))
    out = build_from_knowledge_base(target=100)
    assert len(out) <= 100


def test_validate_and_write(tmp_path):
    """样本校验与写入：合法样本通过、非法样本被拒，write_jsonl 仅写合法样本。"""
    # 合法样本：字段齐全且无红线词
    good = {"instruction":"你是小星","input":"输入","output":"小星温柔回复",
            "source":"ut","risk_level":"green"}
    # 非法样本：空输入且输出含红线词抑郁症
    bad = {"instruction":"","input":"","output":"抑郁症多休息","source":"x","risk_level":"green"}
    assert validate_sample(good) is True and validate_sample(bad) is False
    # write_jsonl 应仅写入通过校验的样本（这里为 1 条）
    f = tmp_path/"sft.jsonl"; n = write_jsonl([good, bad], f)
    assert n == 1 and sum(1 for _ in open(f, encoding="utf-8")) == 1
