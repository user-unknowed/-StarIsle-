"""三层整合 - 语料/KnowledgeDoc/Skill 生成 UT"""
import pathlib, re
from scripts.integrate_forks import (
    extract_text_corpus_from_repo, build_knowledge_docs_from_repo,
    build_skill_adapter_for_repo, SKILL_OUTPUT_DIR, CorpusStats,
)

SAMPLE_MD = """# Sample Mental Toolkit
一个情绪分析小工具
## Install
pip install -r requirements.txt
## Features
- Sentiment classification using pretrained RoBERTa
- Emotion category: happy/sad/angry/fear/surprise
## 中文说明
本项目基于 RoBERTa，在公开心理数据集上可达到 88% 的情绪分类准确率。
作者推荐：适用于短文本情绪识别场景。"""

def _fake(tmp_path):
    d = pathlib.Path(tmp_path) / "Repo"; d.mkdir()
    (d/"README.md").write_text(SAMPLE_MD, encoding="utf-8")
    (d/"sentiment.py").write_text('''"""
情绪分类模块：输入文本，输出情绪标签+置信度
采用 RoBERTa fine-tune 模型。
"""
def classify(text):
    """分类函数，返回 {label, confidence}"""
    return {"label":"neutral","confidence":0.5}
''', encoding="utf-8")
    return {"repo_id":"demo/S-M-T", "repo_url":"https://x", "description":"示例",
            "language":"Python", "local_path":str(d),
            "readme_path": str(d/"README.md"),
            "integration_layers":{"code_capability":True,"knowledge_injection":True,"corpus_extraction":True}}

def test_corpus(tmp_path):
    cs = extract_text_corpus_from_repo(_fake(tmp_path), tmp_path/"seg.txt")
    assert isinstance(cs, CorpusStats) and cs.total_segments > 0 and cs.chars_total > 100
    assert (tmp_path/"seg.txt").stat().st_size > 0

def test_knowledge_docs(tmp_path):
    docs = build_knowledge_docs_from_repo(_fake(tmp_path))
    assert len(docs) >= 1 and docs[0]["source_repo_id"] == "demo/S-M-T" and docs[0]["category"] == "GitHub开源项目"

def test_skill_gen(tmp_path, monkeypatch):
    out = tmp_path/"skills"; out.mkdir()
    monkeypatch.setattr("scripts.integrate_forks.SKILL_OUTPUT_DIR", pathlib.Path(out))
    py = build_skill_adapter_for_repo(_fake(tmp_path))
    assert pathlib.Path(py).exists()
    content = pathlib.Path(py).read_text(encoding="utf-8")
    assert "BaseSkill" in content and "can_handle" in content and "execute" in content
    compile(content, py, "exec")
