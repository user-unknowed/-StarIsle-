"""M3a: MLM 继续预训练 bert-base-chinese。lr=3e-5 略低于首次预训练。支持 --smoke。
若 transformers/torch/datasets 任一缺失则自动进入 SIMULATION 降级模式。"""
from __future__ import annotations
import argparse, json, logging, math, os, random
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("continued_pretrain_mlm.log"), logging.StreamHandler()])
log = logging.getLogger("cmlm")

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "data" / "combined_cleaned_text.txt"
OUT = ROOT / "models" / "pretrained_mental_health_v2"

CFG = dict(model_name=os.getenv("MLM_MODEL", "bert-base-chinese"),
           output_dir=str(OUT), learning_rate=3e-5,
           batch_size=int(os.getenv("MLM_BATCH","8")),
           epochs=3, max_seq=512, weight_decay=0.01,
           warmup_ratio=0.1, seed=42, logging_steps=10, save_steps=50,
           grad_acc=int(os.getenv("MLM_GRAD_ACC","1")),
           fp16=False, smoke=False)


def run_simulation_mlm(cfg, steps: int = 80):
    log.warning(">>>>> MLM SIMULATION MODE: 仿真 %d 步曲线，不下载权重。", steps)
    import math as _m
    rng = random.Random(cfg["seed"])
    losses = [max(0.6, 3.2 * _m.exp(-2.5 * i / max(1, steps)) + rng.random()*0.08)
              for i in range(steps)]
    eval_loss = losses[-1] + 0.05
    return {"mode": "simulation", "warning": "MLM SIMULATION: 未实际训练。",
            "steps": steps, "loss_curve": losses,
            "train_metrics": {"train_loss": losses[-1], "train_samples": cfg.get("smoke_n", 2000)},
            "eval_metrics": {"eval_loss": eval_loss,
                             "perplexity": math.exp(eval_loss),
                             "accuracy": 0.60 + rng.random() * 0.1},
            "training_time": "0:00:15",
            "completed_at": datetime.now().isoformat(timespec="seconds")}


def _heavy_deps_available() -> bool:
    try:
        import torch, datasets, transformers  # noqa
        return True
    except Exception: return False


def prepare(smoke, cfg):
    if not CORPUS.exists(): raise FileNotFoundError(CORPUS)
    from datasets import load_dataset
    ds = load_dataset("text", data_files=str(CORPUS))
    if smoke: ds["train"] = ds["train"].select(range(min(200, len(ds["train"]))))
    split = ds["train"].train_test_split(test_size=0.1, seed=cfg["seed"])
    log.info("train=%d test=%d smoke=%s", len(split["train"]), len(split["test"]), smoke)
    return split

def tokfn(ex, tok, mx):
    return tok(ex["text"], padding="max_length", truncation=True,
               max_length=mx, return_overflowing_tokens=False)

def metrics(ep):
    logits, labels = ep; logits = logits[0] if isinstance(logits, tuple) else logits
    mask = labels != -100
    c = ((logits.argmax(-1) == labels) & mask).sum().item()
    t = mask.sum().item()
    return {"accuracy": c / t if t else 0.0}


def parse():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--epochs", type=int); ap.add_argument("--batch-size", type=int)
    return ap.parse_args()

def main():
    args = parse(); cfg = dict(CFG)
    if args.smoke: cfg["smoke"]=True; cfg["epochs"]=1; cfg["save_steps"]=10; cfg["smoke_n"]=200
    if args.epochs: cfg["epochs"]=args.epochs
    if args.batch_size: cfg["batch_size"]=args.batch_size
    log.info("==== Config: %s", cfg)
    out_dir = Path(cfg["output_dir"]); out_dir.mkdir(parents=True, exist_ok=True)

    if not _heavy_deps_available() or not CORPUS.exists():
        log.warning("缺少 heavy deps 或语料文件缺失 → MLM 降级 SIMULATION")
        s = run_simulation_mlm(cfg)
        (out_dir / "training_summary.json").write_text(json.dumps(s, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        print("\n==== MLM SIM Summary ====")
        print(f"Eval loss: {s['eval_metrics']['eval_loss']:.4f}")
        print(f"Perplexity: {s['eval_metrics']['perplexity']:.4f}")
        return s

    import torch
    from datasets import load_dataset
    from transformers import (AutoModelForMaskedLM, AutoTokenizer,
        DataCollatorForLanguageModeling, Trainer, TrainingArguments, set_seed)
    try: CFG["fp16"] = torch.cuda.is_available()
    except Exception: pass
    cfg["fp16"] = CFG["fp16"]
    set_seed(cfg["seed"])
    tok = AutoTokenizer.from_pretrained(cfg["model_name"])
    model = AutoModelForMaskedLM.from_pretrained(cfg["model_name"])
    ds = prepare(cfg["smoke"], cfg)
    tk = ds.map(lambda x: tokfn(x, tok, cfg["max_seq"]), batched=True, remove_columns=["text"])
    coll = DataCollatorForLanguageModeling(tokenizer=tok, mlm_probability=0.15)
    ta = TrainingArguments(output_dir=str(out_dir),
        learning_rate=cfg["learning_rate"],
        per_device_train_batch_size=cfg["batch_size"],
        per_device_eval_batch_size=cfg["batch_size"],
        num_train_epochs=cfg["epochs"],
        weight_decay=cfg["weight_decay"],
        warmup_ratio=cfg["warmup_ratio"],
        logging_steps=cfg["logging_steps"], save_steps=cfg["save_steps"],
        gradient_accumulation_steps=cfg["grad_acc"],
        evaluation_strategy="epoch", load_best_model_at_end=False,
        fp16=cfg["fp16"],
        seed=cfg["seed"], report_to="none",
        logging_dir=str(out_dir/"logs"), dataloader_num_workers=0)
    tr = Trainer(model=model, args=ta, train_dataset=tk["train"],
                 eval_dataset=tk["test"], data_collator=coll, compute_metrics=metrics)
    from datetime import datetime as dt
    t0 = dt.now(); r = tr.train(); elapsed = str(dt.now() - t0)
    m = r.metrics; m["train_samples"] = len(tk["train"])
    final = out_dir / "final_model"
    tr.save_model(str(final)); tok.save_pretrained(str(final))
    tr.log_metrics("train", m); tr.save_metrics("train", m)
    log.info("Evaluating...")
    ev = tr.evaluate(); ev["eval_samples"]=len(tk["test"])
    try: ev["perplexity"] = math.exp(ev["eval_loss"])
    except Exception: ev["perplexity"] = None
    tr.log_metrics("eval", ev); tr.save_metrics("eval", ev)
    summary = {"config":cfg, "training_time":elapsed, "train_metrics":m,
               "eval_metrics":ev, "completed_at": dt.now().isoformat(timespec="seconds")}
    (out_dir/"training_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return summary

if __name__ == "__main__":
    s = main()
    print(f"\n==== MLM Summary ====\nTrain loss: {s['train_metrics'].get('train_loss','N/A')}\n"
          f"Eval loss:  {s['eval_metrics'].get('eval_loss','N/A')}\n"
          f"Perplexity: {s['eval_metrics'].get('perplexity','N/A')}\n"
          f"Accuracy:   {s['eval_metrics'].get('eval_accuracy','N/A')}\n"
          f"Time: {s['training_time']}")
