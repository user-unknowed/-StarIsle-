"""
test_integrate_forks.py - Fork 仓库三层整合单元测试

所属模块：ai-engine/tests
功能简述：
    验证 Fork 仓库三层整合脚本的核心函数，使用临时目录构造示例仓库：
      1. 语料抽取（test_corpus）：extract_text_corpus_from_repo 须返回非空统计与文件
      2. 知识文档生成（test_knowledge_docs）：build_knowledge_docs_from_repo 须输出
         含 source_repo_id 与 category 的文档结构
      3. 技能适配器生成（test_skill_gen）：build_skill_adapter_for_repo 须生成
         可编译的 Python 文件，含 BaseSkill/can_handle/execute 关键结构
测试对象：scripts.integrate_forks 的 extract_text_corpus_from_repo、
         build_knowledge_docs_from_repo、build_skill_adapter_for_repo
"""

import pathlib, re
from scripts.integrate_forks import (
    extract_text_corpus_from_repo, build_knowledge_docs_from_repo,
    build_skill_adapter_for_repo, SKILL_OUTPUT_DIR, CorpusStats,
)

# 示例 README 内容：包含中英文说明、特性列表与准确率信息
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
    """在临时目录构造一个示例 fork 仓库（README + sentiment.py），返回 manifest 元数据。"""
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
    """语料抽取：须返回 CorpusStats 且片段数与字符总量非零，输出文件非空。"""
    cs = extract_text_corpus_from_repo(_fake(tmp_path), tmp_path/"seg.txt")
    assert isinstance(cs, CorpusStats) and cs.total_segments > 0 and cs.chars_total > 100
    assert (tmp_path/"seg.txt").stat().st_size > 0


def test_knowledge_docs(tmp_path):
    """知识文档生成：须至少 1 篇，且首篇含 source_repo_id 与 category=GitHub开源项目。"""
    docs = build_knowledge_docs_from_repo(_fake(tmp_path))
    assert len(docs) >= 1 and docs[0]["source_repo_id"] == "demo/S-M-T" and docs[0]["category"] == "GitHub开源项目"


def test_skill_gen(tmp_path, monkeypatch):
    """技能适配器生成：须生成可编译的 .py 文件，含 BaseSkill/can_handle/execute 结构。"""
    out = tmp_path/"skills"; out.mkdir()
    # 重定向技能输出目录到临时目录，避免污染真实 app/skills
    monkeypatch.setattr("scripts.integrate_forks.SKILL_OUTPUT_DIR", pathlib.Path(out))
    py = build_skill_adapter_for_repo(_fake(tmp_path))
    assert pathlib.Path(py).exists()
    content = pathlib.Path(py).read_text(encoding="utf-8")
    # 须包含基类继承与抽象方法实现
    assert "BaseSkill" in content and "can_handle" in content and "execute" in content
    # 生成的代码须可编译（语法合法）
    compile(content, py, "exec")
