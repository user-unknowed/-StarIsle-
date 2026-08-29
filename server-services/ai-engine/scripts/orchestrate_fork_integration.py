"""Orchestrator 一键跑 M1→M2→M3→M4 全流程。
Steps: discover → integrate → mlm → sft → evaluate → report
支持 --resume-from、--smoke、--max-forks。"""
from __future__ import annotations
import argparse, json, logging, os, sys, traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List

log = logging.getLogger("orch")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("orchestrator.log"), logging.StreamHandler()])

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
REPORT = ROOT / "integration_report.json"

ALL_STEPS: List[str] = ["discover", "integrate", "mlm", "sft", "evaluate", "report"]

def _cli(cmd: str, env: Dict[str, str] | None = None) -> int:
    log.info("$ %s", cmd)
    import subprocess
    merged = dict(os.environ); merged.update(env or {})
    return subprocess.call(cmd, shell=True, cwd=str(ROOT), env=merged)

def step_discover(max_forks: int, github_forks_json: str | None = None) -> str:
    env = {}
    if github_forks_json: env["FORKS_JSON"] = github_forks_json
    rc = _cli(f"PYTHONPATH=. python scripts/discover_forks.py", {**env, "MAX_FORKS": str(max_forks)})
    if rc != 0: raise RuntimeError(f"discover 失败 exit={rc}")
    manifest = ROOT/"data"/"forked_repos"/"fork_manifest.json"
    if not manifest.exists(): raise FileNotFoundError(manifest)
    return str(manifest)

def step_integrate() -> Dict[str, Any]:
    import importlib, scripts.integrate_forks as m; importlib.reload(m)
    return m.integrate_all()

def step_mlm(smoke: bool) -> str:
    extra = " --smoke" if smoke else ""
    rc = _cli(f"PYTHONPATH=. python scripts/continued_pretrain_mlm.py{extra}")
    if rc != 0: raise RuntimeError(f"mlm 失败 exit={rc}")
    out = ROOT/"models"/"pretrained_mental_health_v2"/"training_summary.json"
    return str(out)

def step_sft(smoke: bool, sft_model: str, force_mode: str | None) -> str:
    parts = ["PYTHONPATH=.", "python scripts/sft_full_finetune.py"]
    if smoke: parts.append("--smoke")
    if sft_model: parts += ["--model", sft_model]
    if force_mode: parts += ["--force-mode", force_mode]
    rc = _cli(" ".join(parts))
    if rc != 0: raise RuntimeError(f"sft 失败 exit={rc}")
    return str(ROOT/"models"/"sft_xiaoxing_v1"/"training_summary.json")

def step_evaluate(force_judge: str | None) -> str:
    parts = ["PYTHONPATH=.", "python scripts/evaluate_model.py"]
    if force_judge: parts += ["--force-judge-model", force_judge]
    rc = _cli(" ".join(parts))
    if rc != 0: raise RuntimeError(f"evaluate 失败 exit={rc}")
    return str(ROOT/"models"/"sft_xiaoxing_v1"/"evaluation_results.json")

def fetch_github_forks_via_mcp(max_forks: int) -> str | None:
    """通过 GitHub MCP 取最近 fork。提示运行前注入 FORKS_JSON env。"""
    log.info("提示：可在调用 Orchestrator 之前使用 GitHub MCP 取 fork 列表并设置 FORKS_JSON=<json> 环境变量。"
             " MCP 调用示例：get_me() → search_repositories(query='fork:true user:<login>' sort=updated desc per_page=%d)"
             % max_forks)
    return None

STEP_FN: Dict[str, Callable[..., Any]] = {
    "discover":  lambda kw: step_discover(kw["max_forks"], fetch_github_forks_via_mcp(kw["max_forks"])),
    "integrate": lambda _k: step_integrate(),
    "mlm":       lambda kw: step_mlm(kw["smoke"]),
    "sft":       lambda kw: step_sft(kw["smoke"], kw["sft_model"], kw["force_mode"]),
    "evaluate":  lambda kw: step_evaluate(kw["force_judge"]),
    "report":    lambda _k: {"report_ready": True},
}

def run(args) -> Dict[str, Any]:
    start_idx = ALL_STEPS.index(args.resume_from) if args.resume_from else 0
    steps_to_run = ALL_STEPS[start_idx:]
    result: Dict[str, Any] = {"started_at": datetime.now().isoformat(timespec="seconds"),
                              "selected_steps": steps_to_run,
                              "smoke": args.smoke,
                              "max_forks": args.max_forks,
                              "step_results": {},
                              "failed_step": None, "error": None, "traceback": None}
    for step in steps_to_run:
        log.info("====== Step: %s ======", step)
        try:
            out = STEP_FN[step]({"max_forks":args.max_forks, "smoke":args.smoke,
                                 "sft_model":args.sft_model, "force_mode":args.force_sft_mode,
                                 "force_judge":args.force_judge_model})
            result["step_results"][step] = out if isinstance(out, (dict, list)) else str(out)
        except Exception as e:
            log.exception("Step %s failed:", step)
            result["failed_step"] = step
            result["error"] = f"{type(e).__name__}: {e}"
            result["traceback"] = traceback.format_exc()
            REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
            log.error("失败已写入 %s，可 --resume-from %s 重试", REPORT, step)
            return result
    result["finished_at"] = datetime.now().isoformat(timespec="seconds")
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    log.info("全流程完成！报告写入 %s", REPORT)
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-forks", type=int, default=5)
    ap.add_argument("--smoke", action="store_true", help="极小数据子集 + 1 epoch + SIMULATION SFT 默认")
    ap.add_argument("--skip-mlm", action="store_true", help="(遗留，使用 --resume-from integrate 替代)")
    ap.add_argument("--sft-model", default="Qwen/Qwen-1_8B-Chat")
    ap.add_argument("--force-sft-mode", choices=["full","lora","cpu_offload","simulation"], default=None)
    ap.add_argument("--force-judge-model", default=None)
    ap.add_argument("--resume-from", choices=ALL_STEPS, default=None,
                    help="从某个步骤重跑，跳过之前的步骤。例如 --resume-from integrate")
    args = ap.parse_args()
    r = run(args)
    print("\n========== ORCHESTRATOR FINISH ==========")
    print(f"失败步骤: {r.get('failed_step') or '无'}")
    print(f"完成步骤: {list(r.get('step_results', {}).keys())}")
    print(f"报告文件: {REPORT}")
    if r.get("error"): print(f"错误摘要: {r['error']}")
    print("部署切换说明（如 sft 模型 final_model 存在）:")
    print("  cd server-services/ai-engine")
    print("  export USE_LOCAL_MODEL=true")
    print("  export MODEL_NAME=$(pwd)/models/sft_xiaoxing_v1/final_model")
    print("  uvicorn app.main:app --port 8000 --reload")

if __name__ == "__main__":
    main()
