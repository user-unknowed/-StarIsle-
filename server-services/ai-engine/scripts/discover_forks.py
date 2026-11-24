"""
discover_forks.py - GitHub Fork 仓库发现与获取脚本（M1 阶段）

所属模块：ai-engine/scripts
功能简述：
    发现并获取心理学/AI 相关开源 Fork 仓库。流程：
    尝试读取环境变量 FORKS_JSON（由 Orchestrator 通过 MCP 预取注入）→
    失败时回退到内置演示列表 → 浅克隆仓库到本地 → 写入 manifest JSON。
依赖关系：
    - git：浅克隆工具（可选，缺失时跳过克隆）
"""
from __future__ import annotations
import json, logging, os, shutil, subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

log = logging.getLogger("discover_forks")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

# 项目根目录与 fork 仓库存放目录
ROOT = Path(__file__).resolve().parent.parent
FORKS_DIR = ROOT / "data" / "forked_repos"
FORKS_DIR.mkdir(parents=True, exist_ok=True)
# 默认 manifest 输出路径
DEFAULT_MANIFEST_PATH = FORKS_DIR / "fork_manifest.json"


def build_fallback_fork_list() -> List[Dict[str, Any]]:
    """无可用 fork 时的演示数据（3 个心理/AI 热门开源项目），并补充本地路径等集成字段。"""
    samples = [
        {"repo_id":"thu-coai/Emotional-Support-Conversation",
         "repo_url":"https://github.com/thu-coai/Emotional-Support-Conversation",
         "description":"清华CoAI 情绪支持对话数据集(ESC)与模型，与小星CBT框架高度匹配",
         "language":"Python","stars":980,"default_branch":"master"},
        {"repo_id":"songlab-cal/bert-mental-health",
         "repo_url":"https://github.com/songlab-cal/bert-mental-health",
         "description":"BERT 在心理健康 Reddit 文本上的继续预训练模型",
         "language":"Python","stars":520,"default_branch":"main"},
        {"repo_id":"Utkarsh-Agrawal-17/Sentiment-Analysis-Mental-Health",
         "repo_url":"https://github.com/Utkarsh-Agrawal-17/Sentiment-Analysis-Mental-Health",
         "description":"心理健康文本情感分类模型(基于BERT/RoBERTa)",
         "language":"Python","stars":130,"default_branch":"main"},
    ]
    for s in samples:
        name = s["repo_id"].split("/")[-1]
        s["local_path"] = str(FORKS_DIR / name)
        s["readme_path"] = str(FORKS_DIR / name / "README.md")
        s["integration_layers"] = {"code_capability":True,"knowledge_injection":True,"corpus_extraction":True}
    return samples


def validate_manifest(data: Dict[str, Any]) -> List[str]:
    """校验 manifest 数据结构完整性，返回错误信息列表（空列表表示通过）。"""
    errs: List[str] = []
    if not isinstance(data, dict): return ["root not dict"]
    for k in ("discovered_at","total_forks","forks","failed_repos"):
        if k not in data: errs.append(f"missing top-level {k}")
    for i,f in enumerate(data.get("forks", [])):
        for k in ("repo_id","repo_url","description","language","local_path"):
            if k not in f: errs.append(f"fork[{i}] missing {k}")
    for i,fr in enumerate(data.get("failed_repos", [])):
        if "repo_id" not in fr or "reason" not in fr:
            errs.append(f"failed[{i}] invalid")
    return errs


def write_manifest(forks: List[Dict[str, Any]],
                   failed_repos: List[Dict[str, str]] | None = None,
                   manifest_path: Path | None = None) -> str:
    """将 fork 列表与失败记录写入 manifest JSON 文件，并返回文件路径。"""
    path = Path(manifest_path or DEFAULT_MANIFEST_PATH)
    payload = {"discovered_at": datetime.now().isoformat(timespec="seconds"),
               "total_forks": len(forks), "forks": forks,
               "failed_repos": failed_repos or []}
    errs = validate_manifest(payload)
    if errs: raise ValueError(f"manifest invalid: {errs}")
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Manifest written: %s (%d forks)", path, len(forks))
    return str(path)


def _try_clone(url: str, dest: Path, timeout: int = 180) -> None:
    """使用 git 浅克隆仓库到指定目录；git 不可用时跳过并告警。"""
    if dest.exists(): shutil.rmtree(dest)
    if not shutil.which("git"):
        log.warning("git not found, skip clone for %s", url); return
    subprocess.run(["git","clone","--depth","1",url,str(dest)], check=True, timeout=timeout)


def discover_forks_via_mcp(max_forks: int = 5
                           ) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """优先读 env FORKS_JSON（由 Orchestrator 通过 MCP 预取后注入）；否则返回[]"""
    raw = os.environ.get("FORKS_JSON")
    forks, failed = [], []
    if raw:
        try:
            for r in json.loads(raw)[:max_forks]:
                n = r["repo_id"].split("/")[-1]
                r.setdefault("local_path", str(FORKS_DIR / n))
                r.setdefault("readme_path", str(FORKS_DIR / n / "README.md"))
                r.setdefault("integration_layers",
                             {"code_capability":True,"knowledge_injection":True,"corpus_extraction":True})
                forks.append(r)
        except Exception as e:
            log.error("FORKS_JSON parse failed: %s", e)
    return forks, failed


def clone_forks_local(forks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """逐个浅克隆 fork 仓库到本地，返回克隆失败的仓库与原因列表。"""
    failed: List[Dict[str, str]] = []
    for f in forks:
        try: _try_clone(f["repo_url"], Path(f["local_path"]))
        except Exception as e:
            log.warning("clone failed %s: %s", f["repo_id"], e)
            failed.append({"repo_id":f["repo_id"],"reason":f"clone: {type(e).__name__}: {e}"})
    return failed


def run(max_forks: int = 5, manifest_path: Path | None = None) -> str:
    """完整执行发现→克隆→写 manifest 流程，返回 manifest 文件路径。"""
    forks, failed_mcp = discover_forks_via_mcp(max_forks)
    if not forks:
        log.warning("no forks available, using fallback demo list")
        forks = build_fallback_fork_list()[:max_forks]
    fails = clone_forks_local(forks)
    return write_manifest(forks, failed_mcp + fails, manifest_path)


if __name__ == "__main__":
    mf = run(max_forks=int(os.environ.get("MAX_FORKS", "5")))
    print(f"MANIFEST={mf}")
