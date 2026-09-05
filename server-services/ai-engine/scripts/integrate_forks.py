"""
integrate_forks.py - Fork 仓库三层整合脚本（M2 阶段）

所属模块：ai-engine/scripts
功能简述：
    对已克隆的 fork 仓库执行三层整合：
      M2a：生成技能适配器（Skill Adapter）注入 app/skills
      M2b：从 README 构建知识文档并入知识库（RAG 知识注入）
      M2c：抽取仓库文本语料扩充预训练语料
依赖关系：
    - langdetect：语言检测（可选，缺失时按中英文字符数估算）
"""
from __future__ import annotations
import json, logging, re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

log = logging.getLogger("integrate_forks")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "app"
DATA_DIR = ROOT / "data"
SKILL_OUTPUT_DIR = APP_DIR / "skills"
MANIFEST_PATH = DATA_DIR / "forked_repos" / "fork_manifest.json"
CORPUS_TXT = DATA_DIR / "combined_cleaned_text.txt"
KB_JSON = DATA_DIR / "knowledge_base.json"
STATS_JSON = DATA_DIR / "corpus_extend_stats.json"

try:
    from langdetect import detect as _langdetect  # type:ignore
except Exception:
    def _langdetect(t: str) -> str:
        """语言检测降级实现：按中英文字符数比例估算语言。"""
        cn = len(re.findall(r"[\u4e00-\u9fff]", t))
        en = len(re.findall(r"[A-Za-z]", t))
        if cn > en * 0.5: return "zh"
        return "en" if en else "unknown"

@dataclass
class CorpusStats:
    """
    单仓库语料抽取统计

    记录片段总数、中英通过数、丢弃数与字符总量，用于汇总整合结果。
    """
    repo_id: str = ""
    total_segments: int = 0
    language_zh_pass: int = 0
    language_en_pass: int = 0
    language_dropped: int = 0
    short_dropped: int = 0
    chars_total: int = 0

_TEXT_EXTS = {".md", ".markdown", ".rst", ".txt", ".py"}
_MIN_CHARS = 10

def _iter_text_files(rp: Path) -> Iterable[Path]:
    """递归遍历仓库内的文本文件，跳过 .git 与 __pycache__ 目录。"""
    for p in rp.rglob("*"):
        if not p.is_file() or ".git" in p.parts or "__pycache__" in p.parts: continue
        if p.suffix.lower() in _TEXT_EXTS: yield p

_PY_DOC = re.compile(r'"""([\s\S]*?)"""')
_PY_CN = re.compile(r'#\s*([\u4e00-\u9fff][^\n]*)')

def _raw_from_file(p: Path) -> List[str]:
    """从文件提取原始文本片段：.py 取 docstring 与中文注释，其他按段落拼接。"""
    try: t = p.read_text(encoding="utf-8", errors="ignore")
    except Exception: return []
    segs: List[str] = []
    if p.suffix.lower() == ".py":
        for m in _PY_DOC.finditer(t): segs.append(m.group(1).strip())
        for m in _PY_CN.finditer(t): segs.append(m.group(1).strip())
        return segs
    lines, buf = t.splitlines(), []
    for ln in lines:
        ln = ln.strip()
        if not ln:
            if buf: segs.append(" ".join(buf)); buf = []
            continue
        if ln.startswith("```"): continue
        buf.append(ln)
    if buf: segs.append(" ".join(buf))
    return segs

def _clean(s: str) -> Optional[str]:
    """清洗单段文本：去控制字符、合并空白、过滤过短与非中英文本。"""
    s = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) < _MIN_CHARS: return None
    try: lg = _langdetect(s[:200])
    except Exception: lg = "unknown"
    if lg not in ("zh","zh-cn","zh-tw","en"): return None
    return s

def extract_text_corpus_from_repo(meta: Dict[str, Any], out: Path) -> CorpusStats:
    """从单个仓库抽取清洗后语料并写入 out，返回统计结果。"""
    cs = CorpusStats(repo_id=meta["repo_id"])
    clean: List[str] = []
    for fp in _iter_text_files(Path(meta["local_path"])):
        for raw in _raw_from_file(fp):
            cs.total_segments += 1
            c = _clean(raw)
            if c is None:
                if raw and len(raw) < _MIN_CHARS: cs.short_dropped += 1
                else: cs.language_dropped += 1
                continue
            lg = _langdetect(c[:200])
            if lg.startswith("zh"): cs.language_zh_pass += 1
            else: cs.language_en_pass += 1
            cs.chars_total += len(c); clean.append(c)
    out.write_text("\n".join(clean) + ("\n" if clean else ""), encoding="utf-8")
    return cs

# ---------------- M2b Knowledge
def _split(text: str, max_c: int = 512) -> List[str]:
    """按句切分文本为不超过 max_c 字符的块。"""
    if len(text) <= max_c: return [text]
    parts, buf = [], ""
    for sent in re.split(r"(?<=[。！？\.\!\?])\s*", text):
        if len(buf) + len(sent) <= max_c: buf += sent
        else:
            if buf: parts.append(buf)
            buf = sent
    if buf: parts.append(buf)
    return parts or [text]

def build_knowledge_docs_from_repo(meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """从仓库 README 切分构建知识文档列表，供知识库注入。"""
    rid = meta["repo_id"]; rm = Path(meta["local_path"]) / "README.md"
    src = rm.read_text(encoding="utf-8", errors="ignore") if rm.exists() else meta.get("description") or ""
    docs: List[Dict[str, Any]] = []
    for i, chunk in enumerate(_split(src)):
        docs.append({"id": f"github-{rid.replace('/','-')}-{i}",
                     "title": f"[{rid}] {meta.get('description','README')[:30]}",
                     "source": f"github:{rid}#README.md:chunk{i}",
                     "author": None, "category": "GitHub开源项目",
                     "tags": [meta.get("language","unknown"), "fork-integration"],
                     "content": chunk, "techniques": [], "applicable_issues": [],
                     "source_repo_id": rid,
                     "created_at": datetime.now().isoformat(timespec="seconds"),
                     "updated_at": datetime.now().isoformat(timespec="seconds")})
    return docs

def _append_kb(new: List[Dict[str, Any]]) -> Tuple[int, int]:
    """将新文档去重后追加到知识库 JSON，返回 (新增数, 去重跳过数)。"""
    existing = json.loads(KB_JSON.read_text(encoding="utf-8")) if KB_JSON.exists() else []
    seen = {(d.get("title"), d.get("source")) for d in existing}
    added = 0
    for d in new:
        k = (d.get("title"), d.get("source"))
        if k in seen: continue
        seen.add(k); existing.append(d); added += 1
    KB_JSON.parent.mkdir(parents=True, exist_ok=True)
    KB_JSON.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    return added, len(new) - added

# ---------------- M2a Skill 生成
_SKILL_TEMPLATE = '''"""Auto-generated Skill Adapter for {repo_id} @ {ts}"""
from __future__ import annotations
from typing import Any, Dict, List
from app.skills.base_skill import BaseSkill
from pathlib import Path
import re

class {classname}(BaseSkill):
    name = {name!r}
    display_name = {display_name!r}
    source_repo = {repo_id!r}
    description = {description!r}

    def can_handle(self, message: str, context: List[Dict[str, Any]], user_profile: Dict[str, Any]) -> float:
        msg = (message or "").lower(); kws = {keywords!r}
        hits = sum(1 for k in kws if k in msg)
        return 0.0 if hits == 0 else min(0.5 + 0.15 * hits, 0.95)

    async def execute(self, message: str, context: List[Dict[str, Any]], **kwargs: Any) -> Dict[str, Any]:
        readme = Path({readme_path!r})
        content = readme.read_text(encoding="utf-8", errors="ignore") if readme.exists() else ""
        lines = [ln.strip() for ln in re.split(r"[\\n\\.。]", content) if ln.strip()]
        qs = [t for t in re.split(r"\\W+", message.lower()) if len(t) >= 2]
        scored = []
        for ln in lines:
            score = sum(1 for t in qs if t and t in ln.lower())
            if score > 0: scored.append((score, ln[:200]))
        scored.sort(reverse=True); hits = [s[1] for s in scored[:3]]
        if not hits:
            text = f"【{{self.display_name}}】该开源项目来自 {{self.source_repo}}，描述：{{self.description!r}}. 小星会根据该仓库内容组织参考回复～"
        else:
            text = f"【{{self.display_name}}】从仓库 README 检索到相关片段：\\n- " + "\\n- ".join(hits) + "\\n（仅供参考）"
        return {{"text": text, "confidence": 0.7 if hits else 0.45,
                "raw_data": {{"matched_lines": len(hits), "repo": self.source_repo}}}}
'''

def _keywords(meta: Dict[str, Any]) -> List[str]:
    tags: List[str] = []
    for s in (meta.get("repo_id",""), meta.get("description",""), meta.get("language","")):
        for t in re.split(r"[\W_]+", s.lower()):
            if 3 <= len(t) <= 20: tags.append(t)
    for w in ["sentiment","emotion","mental","health","心理","情绪","分类","识别","detect","analysis","分析","对话","chat"]:
        tags.append(w)
    seen = set(); out = []
    for t in tags:
        if t in seen: continue
        seen.add(t); out.append(t)
    return out[:12]

def build_skill_adapter_for_repo(meta: Dict[str, Any]) -> str:
    SKILL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    slug = meta["repo_id"].split("/")[-1].replace("-","_")
    classname = "".join(x.capitalize() for x in re.split(r"[\W_]+", slug)) + "Skill"
    code = _SKILL_TEMPLATE.format(
        repo_id=meta["repo_id"], ts=datetime.now().isoformat(timespec="seconds"),
        classname=classname, name=slug.lower()+"_skill",
        display_name=f"开源能力:{slug}",
        description=(meta.get("description") or "集成自GitHub fork项目")[:80],
        keywords=_keywords(meta),
        readme_path=meta.get("readme_path") or str(Path(meta["local_path"])/"README.md"))
    compile(code, "?", "exec")  # 先语法预检查，出错即抛
    fp = SKILL_OUTPUT_DIR / f"{slug.lower()}_adapter.py"
    fp.write_text(code, encoding="utf-8")
    return str(fp)

# ---------------- 调度
def integrate_all(manifest_path: Path = MANIFEST_PATH,
                  do_code: bool = True, do_knowledge: bool = True,
                  do_corpus: bool = True) -> Dict[str, Any]:
    if not manifest_path.exists(): raise FileNotFoundError(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    per_repo: Dict[str, Any] = {}
    csum = CorpusStats(); kb_a = kb_s = 0; skills: List[str] = []
    CORPUS_TXT.parent.mkdir(parents=True, exist_ok=True)
    with CORPUS_TXT.open("a", encoding="utf-8") as fap:
        for meta in manifest.get("forks", []):
            rid = meta["repo_id"]; rep: Dict[str, Any] = {"repo_id": rid}
            log.info("Processing %s", rid)
            cs = CorpusStats()
            if do_corpus and meta.get("integration_layers", {}).get("corpus_extraction", True):
                tmp = Path(meta["local_path"]).parent / f".corpus_{rid.replace('/','_')}.txt"
                cs = extract_text_corpus_from_repo(meta, tmp)
                if tmp.exists():
                    d = tmp.read_text(encoding="utf-8")
                    if d: fap.write(d)
                    tmp.unlink(missing_ok=True)
            for k in asdict(csum):
                setattr(csum, k, getattr(csum, k) + getattr(cs, k, 0))
            rep["corpus_stats"] = asdict(cs)
            docs: List[Dict[str, Any]] = []
            if do_knowledge and meta.get("integration_layers", {}).get("knowledge_injection", True):
                docs = build_knowledge_docs_from_repo(meta)
                a, s = _append_kb(docs)
                kb_a += a; kb_s += s
            rep["knowledge_new"] = len(docs); rep["kb_added"] = kb_a
            if do_code and meta.get("integration_layers", {}).get("code_capability", True):
                try: skills.append(build_skill_adapter_for_repo(meta)); rep["skill"] = skills[-1]
                except Exception as e: log.error("skill %s: %s", rid, e); rep["skill_err"] = str(e)
            per_repo[rid] = rep
    report = {"completed_at": datetime.now().isoformat(timespec="seconds"),
              "manifest": str(manifest_path), "per_repo": per_repo,
              "corpus": asdict(csum),
              "knowledge": {"added": kb_a, "dedup_skipped": kb_s, "file": str(KB_JSON)},
              "skills_generated": skills}
    STATS_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("integrate_all done. stats -> %s", STATS_JSON)
    return report

if __name__ == "__main__":
    r = integrate_all()
    print(json.dumps({"corpus_chars": r["corpus"]["chars_total"],
                      "kb_added": r["knowledge"]["added"],
                      "skills": len(r["skills_generated"])}, ensure_ascii=False))
