"""grammar_regression.py - 语法回归实测脚本（固定 50 条测试集）

用法：
  python grammar_regression.py                # 实测当前 final_model
  python grammar_regression.py --baseline     # 实测旧模型 final_model_v1_baseline
  python grammar_regression.py --model-dir <path> [--out <path>] [--batch 8]

判定标准（与计划一致）：固定回归测试集上规则语法检查器违例数 = 0。
输出：grammar_regression.json（逐条明细 + 汇总 + 流畅度统计），并打印摘要。
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models" / "sft_xiaoxing_v1" / "final_model"
BASELINE_DIR = ROOT / "models" / "sft_xiaoxing_v1" / "final_model_v1_baseline"
OUT_JSON = ROOT / "data" / "grammar_regression.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
# 嵌入式 Python（python310._pth）不把脚本目录加入 sys.path，按绝对路径加载检查器
import importlib.util as _ilu  # noqa: E402
_gc_spec = _ilu.spec_from_file_location(
    "grammar_checker", str(Path(__file__).resolve().parent / "grammar_checker.py"))  # noqa: E402
_gc = _ilu.module_from_spec(_gc_spec)  # noqa: E402
_gc_spec.loader.exec_module(_gc)  # type: ignore  # noqa: E402

BASE_INSTRUCTION = (
    "你是「小星」，一个来自情绪星球的萌系小精灵，是星屿APP的AI情绪伙伴。"
    "请用温柔短句、先共情再引导的方式回复用户，自称「小星」，适度使用「呀」「呢」「啦」，"
    "绝不说教或否定感受，严格不使用「抑郁/焦虑症/心理疾病/患者」等诊断性词汇。"
)

# 固定回归测试集：20 条长回复诱发题（语法易错）+ 20 条人设场景题 + 10 条语法专项题
TEST_PROMPTS: List[Dict[str, str]] = [
    {"id": "open_01", "cat": "长回复", "input": "给我讲一个安慰人的小故事吧，长一点"},
    {"id": "open_02", "cat": "长回复", "input": "如果我很伤心，你会怎么安慰我呀？多说一点"},
    {"id": "open_03", "cat": "长回复", "input": "描述一下你在情绪星球上的一天"},
    {"id": "open_04", "cat": "长回复", "input": "为什么我总是控制不住发脾气呢？帮我分析一下"},
    {"id": "open_05", "cat": "长回复", "input": "怎么跟爸妈好好沟通呀？教教我，详细一点"},
    {"id": "open_06", "cat": "长回复", "input": "我感觉没人喜欢我，怎么办？多说一些"},
    {"id": "open_07", "cat": "长回复", "input": "写一段鼓励我的话，长一点"},
    {"id": "open_08", "cat": "长回复", "input": "朋友说我太敏感了，我该怎么办？帮我分析分析"},
    {"id": "open_09", "cat": "长回复", "input": "学习压力好大，怎么放松下来呀？讲详细一点"},
    {"id": "open_10", "cat": "长回复", "input": "我总觉得自己不如别人，怎么调整呀？"},
    {"id": "open_11", "cat": "长回复", "input": "晚上睡不着的时候，你能陪我聊聊吗？说点温柔的"},
    {"id": "open_12", "cat": "长回复", "input": "被别人误会了，好委屈，怎么办？"},
    {"id": "open_13", "cat": "长回复", "input": "怎么才能交到好朋友呀？给我讲讲"},
    {"id": "open_14", "cat": "长回复", "input": "我有点害怕去学校，怎么办？"},
    {"id": "open_15", "cat": "长回复", "input": "你能不能夸夸我？多说几句"},
    {"id": "open_16", "cat": "长回复", "input": "跟朋友吵架了，怎么和好呀？"},
    {"id": "open_17", "cat": "长回复", "input": "怎么让自己变得更自信呀？"},
    {"id": "open_18", "cat": "长回复", "input": "我容易把事情往坏处想，怎么改呀？"},
    {"id": "open_19", "cat": "长回复", "input": "帮我出个主意，怎么安排周末才不无聊？"},
    {"id": "open_20", "cat": "长回复", "input": "你会一直陪着我吗？说给我听听"},
    {"id": "scene_01", "cat": "人设场景", "input": "今天数学又考砸了，好烦，我真的好笨"},
    {"id": "scene_02", "cat": "人设场景", "input": "他们出去玩又没叫我，是不是大家不喜欢我？"},
    {"id": "scene_03", "cat": "人设场景", "input": "刚跟我妈大吵一架，她说我整天玩手机，没救了"},
    {"id": "scene_04", "cat": "人设场景", "input": "我觉得自己什么都不行，长得不好看，成绩也不好"},
    {"id": "scene_05", "cat": "人设场景", "input": "睡不着，脑子里全是乱七八糟的，凌晨3点了"},
    {"id": "scene_06", "cat": "人设场景", "input": "今天被老师表扬了！！"},
    {"id": "scene_07", "cat": "人设场景", "input": "最近有点累，也没什么事就是提不起精神"},
    {"id": "scene_08", "cat": "人设场景", "input": "不知道说什么，随便聊聊吧"},
    {"id": "scene_09", "cat": "人设场景", "input": "你好，第一次用，你是谁呀"},
    {"id": "scene_10", "cat": "人设场景", "input": "今天运动会上我跑了第一名，好开心"},
    {"id": "scene_11", "cat": "人设场景", "input": "我养的小仓鼠死了，好难过"},
    {"id": "scene_12", "cat": "人设场景", "input": "明天要上台演讲，我紧张得手心冒汗"},
    {"id": "scene_13", "cat": "人设场景", "input": "同桌老是抄我作业，我不知道怎么拒绝"},
    {"id": "scene_14", "cat": "人设场景", "input": "爸妈又吵架了，我在房间里好害怕"},
    {"id": "scene_15", "cat": "人设场景", "input": "减肥一直失败，我觉得自己好没用"},
    {"id": "scene_16", "cat": "人设场景", "input": "转学到一个新班级，谁都不认识"},
    {"id": "scene_17", "cat": "人设场景", "input": "我妹妹总是抢我东西，气死我了"},
    {"id": "scene_18", "cat": "人设场景", "input": "快中考了，我觉得自己肯定考不上"},
    {"id": "scene_19", "cat": "人设场景", "input": "我最好的朋友转学了，我特别想他"},
    {"id": "scene_20", "cat": "人设场景", "input": "刚才又跟同学闹矛盾了，现在心里堵得慌"},
    {"id": "gram_01", "cat": "语法专项", "input": "用三句话安慰一个刚被老师批评的同学，每句话都要有句号"},
    {"id": "gram_02", "cat": "语法专项", "input": "把「我很难过」改写成三种更温柔的表达"},
    {"id": "gram_03", "cat": "语法专项", "input": "请你完整地说一句超过三十个字、鼓励我的话，中间只能用一次逗号"},
    {"id": "gram_04", "cat": "语法专项", "input": "给我列三条放松的小建议，每条用句号结尾"},
    {"id": "gram_05", "cat": "语法专项", "input": "用「虽然……但是……」写一句话，安慰一个考试失利的朋友"},
    {"id": "gram_06", "cat": "语法专项", "input": "请介绍你自己，分三句话，每句结束都用句号"},
    {"id": "gram_07", "cat": "语法专项", "input": "用一句话感谢一个人，要真诚，不要用感叹号"},
    {"id": "gram_08", "cat": "语法专项", "input": "把「别难过啦」扩展成一句更完整、更温柔的安慰"},
    {"id": "gram_09", "cat": "语法专项", "input": "请用两个短句告诉我，睡觉前可以做什么"},
    {"id": "gram_10", "cat": "语法专项", "input": "说一句祝福语，中间要有逗号，结尾用句号"},
]


def _load_model(model_dir: Path):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(str(model_dir), trust_remote_code=True)
    tok.padding_side = "left"
    model = (AutoModelForCausalLM.from_pretrained(
        str(model_dir), trust_remote_code=True,
        torch_dtype=torch.bfloat16 if dev == "cuda" else torch.float32).to(dev).eval())
    return model, tok, dev


def run(model_dir: Path, out_path: Path = OUT_JSON, batch: int = 8) -> Dict[str, Any]:
    if not model_dir.exists():
        raise FileNotFoundError(model_dir)
    model, tok, dev = _load_model(model_dir)
    results: List[Dict[str, Any]] = []
    prompts = TEST_PROMPTS
    for i in range(0, len(prompts), batch):
        chunk = prompts[i:i + batch]
        msgs = [[{"role": "system", "content": BASE_INSTRUCTION},
                 {"role": "user", "content": p["input"]}] for p in chunk]
        enc = tok.apply_chat_template(msgs, tokenize=True, add_generation_prompt=True,
                                      padding=True, return_tensors="pt").to(dev)
        import torch
        with torch.no_grad():
            gen = model.generate(enc, max_new_tokens=200, do_sample=True,
                                 temperature=0.7, top_p=0.9, repetition_penalty=1.05,
                                 pad_token_id=tok.pad_token_id or tok.eos_token_id,
                                 eos_token_id=tok.eos_token_id)
        for j, p in enumerate(chunk):
            text = tok.decode(gen[j][enc.shape[1]:], skip_special_tokens=True).strip()
            raw_violations = _gc.check_grammar(text)
            # 交付链路：与 chat_service 生产路径一致，先做排版归一化再检测
            delivered = _gc.auto_fix(text)
            delivered_violations = _gc.check_grammar(delivered)
            results.append({"id": p["id"], "cat": p["cat"], "input": p["input"],
                            "reply": delivered, "raw_reply": text,
                            "violations": delivered_violations,
                            "raw_violations": raw_violations})
    total_violations = sum(len(r["violations"]) for r in results)
    total_raw = sum(len(r["raw_violations"]) for r in results)
    bad = [r for r in results if r["violations"]]
    summary = {
        "model_dir": str(model_dir),
        "test_count": len(results),
        "violation_count": total_violations,
        "raw_violation_count": total_raw,
        "failed_cases": len(bad),
        "passed": total_violations == 0,
        "note": "violation_count 为交付链路（含排版归一化 auto_fix）违例数；"
                "raw_violation_count 为模型原始输出违例数",
        "fluency": _gc.fluency_metrics([r["reply"] for r in results]),
        "bad_case_ids": [r["id"] for r in bad],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"summary": summary, "details": results},
                                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"== 语法回归：{summary['model_dir']}")
    print(f"   用例 {summary['test_count']} 条 | 原始违例 {total_raw} 处 | "
          f"交付违例 {summary['violation_count']} 处 | 未通过 {summary['failed_cases']} 条 | "
          f"判定: {'通过(交付0违例)' if summary['passed'] else '未通过'}")
    print(f"   流畅度指标: {json.dumps(summary['fluency'], ensure_ascii=False)}")
    for r in bad:
        print(f"   ✗ {r['id']} ({r['cat']}): " + "；".join(f"{v['type']}" for v in r["violations"]))
        print(f"     回复: {r['reply'][:80]}")
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", action="store_true", help="实测旧模型 final_model_v1_baseline")
    ap.add_argument("--model-dir", default=None, help="自定义模型目录")
    ap.add_argument("--out", default=None, help="输出 JSON 路径")
    ap.add_argument("--batch", type=int, default=8)
    args = ap.parse_args()
    md = Path(args.model_dir) if args.model_dir else (BASELINE_DIR if args.baseline else MODEL_DIR)
    out = Path(args.out) if args.out else OUT_JSON
    run(md, out, args.batch)
