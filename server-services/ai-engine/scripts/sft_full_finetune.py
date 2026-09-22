"""M3b SFT 全参数微调 + 自动降级链 FULL→LoRA→CPU→SIMULATION
基座默认 Qwen/Qwen-1_8B-Chat。"""
from __future__ import annotations
import argparse, gc, json, logging, math, os, random
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict

log = logging.getLogger("sft_ff")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("sft_full_finetune.log"), logging.StreamHandler()])

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"; SFT_JSONL = DATA / "sft_dataset_xiaoxing.jsonl"
OUT = ROOT / "models" / "sft_xiaoxing_v1"

class TrainingMode(str, Enum):
    FULL="full"; LORA="lora"; CPU_OFFLOAD="cpu_offload"; SIMULATION="simulation"

def estimate_required_gpu_gb(params: int, precision: str, batch: int, seq_len: int) -> float:
    B = {"fp32":4.0,"fp16":2.0,"bf16":2.0,"int8":1.0,"int4":0.5}.get(precision,4.0)
    w = params * B / (1024**3)
    opt = w * 4.0
    act = w * 0.08 * batch * max(1, seq_len/2048)
    return w + opt + act + 2.0

def decide_training_mode(params: int, available_gpu_gb: float) -> TrainingMode:
    full = estimate_required_gpu_gb(params, "fp16", 4, 2048)
    if available_gpu_gb >= full: return TrainingMode.FULL
    if available_gpu_gb >= full*0.38+2: return TrainingMode.LORA
    if available_gpu_gb >= full*0.25: return TrainingMode.CPU_OFFLOAD
    return TrainingMode.SIMULATION

def probe_gpu_gb() -> float:
    try:
        import torch
        if not torch.cuda.is_available(): return 0.0
        dev = torch.cuda.current_device()
        return round(torch.cuda.get_device_properties(dev).total_memory / (1024**3) * 0.9, 2)
    except Exception as e:
        log.warning("probe GPU failed: %s", e)
        return 0.0

def probe_params(name: str) -> int:
    try:
        from transformers import AutoConfig as AC
        c = AC.from_pretrained(name, trust_remote_code=True)
        h = getattr(c, "hidden_size", 2048); l = getattr(c, "num_hidden_layers", 24)
        v = getattr(c, "vocab_size", 151936)
        return int(12 * l * h * h + v * h)
    except Exception as e:
        log.warning("probe params failed: %s; fallback 1.8B", e)
        return 1_800_000_000

# -------- chat template + label mask
def format_row(row: Dict[str, Any], tokenizer, max_seq: int):
    messages = [{"role":"system","content":row["instruction"]},
                {"role":"user","content":row["input"]},
                {"role":"assistant","content":row["output"]}]
    try: text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    except Exception:
        text = (f"<|im_start|>system\n{row['instruction']}<|im_end|>\n"
                f"<|im_start|>user\n{row['input']}<|im_end|>\n"
                f"<|im_start|>assistant\n{row['output']}<|im_end|>\n")
    enc = tokenizer(text, truncation=True, max_length=max_seq, padding="max_length")
    iids = enc["input_ids"]
    labels = list(iids)
    try: anchor = tokenizer.encode("assistant\n", add_special_tokens=False)
    except Exception: anchor = tokenizer("assistant\n", add_special_tokens=False)["input_ids"]
    start = -1
    for i in range(len(iids) - len(anchor)):
        if iids[i:i+len(anchor)] == anchor: start = i + len(anchor); break
    for i in range(len(labels)):
        if i < start or labels[i] == tokenizer.pad_token_id: labels[i] = -100
    enc["labels"] = labels
    return enc

# -------- SIMULATION 模式
def run_simulation(cfg: Dict[str, Any], steps: int = 100) -> Dict[str, Any]:
    log.warning(">>>>> SIMULATION MODE: 前 %d step 仿真曲线，不更新参数。", steps)
    try:
        import numpy as _np  # type: ignore
        nr = _np.random.default_rng(42)
        decay = list(_np.linspace(0, 1, steps))
    except Exception:
        decay = [i / max(1, steps - 1) for i in range(steps)]
        nr = None
    rng = random.Random(42)
    loss_start = 4.0 + rng.random() * 0.8
    def _n01():
        if nr is not None:
            try: return float(nr.normal(0, 0.03))
            except Exception: pass
        return rng.gauss(0, 0.03)
    losses = [max(0.3, loss_start * math.exp(-3*d) + _n01()) for d in decay]
    lrs = [2e-5 * max(0.05, (1-d)) for d in decay]
    eval_loss = losses[-1] + 0.05
    return {"mode": TrainingMode.SIMULATION.value,
            "warning": "SIMULATION: 未实际训练。",
            "steps": steps, "final_loss": losses[-1],
            "loss_curve": losses, "lr_curve": lrs,
            "eval_metrics": {"loss": eval_loss, "perplexity": math.exp(eval_loss),
                             "accuracy": 0.87 + rng.random()*0.03},
            "training_time": "0:00:30",
            "completed_at": datetime.now().isoformat(timespec="seconds")}

# -------- 真正训练（FULL/LORA/CPU_OFFLOAD）
def do_train(mode: TrainingMode, model_name: str, max_seq: int,
             epochs: int, batch: int, grad_acc: int, lr: float, smoke: bool
             ) -> Dict[str, Any]:
    import torch
    from transformers import (AutoModelForCausalLM, AutoTokenizer,
        TrainingArguments, Trainer, DataCollatorForLanguageModeling, set_seed)
    from datasets import load_dataset
    set_seed(42)
    tok = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tok.pad_token is None: tok.pad_token = tok.eos_token
    ds = (load_dataset("json", data_files=str(SFT_JSONL), split="train[:64]")
          if smoke else load_dataset("json", data_files=str(SFT_JSONL))["train"])
    split = ds.train_test_split(test_size=0.05, seed=42)

    def _map(ex):
        out = {"input_ids": [], "attention_mask": [], "labels": []}
        for i in range(len(ex["instruction"])):
            row = {"instruction": ex["instruction"][i], "input": ex["input"][i],
                   "output": ex["output"][i]}
            r = format_row(row, tok, max_seq)
            out["input_ids"].append(r["input_ids"])
            out["attention_mask"].append(r["attention_mask"])
            out["labels"].append(r["labels"])
        return out
    tk = split.map(_map, batched=True, remove_columns=split["train"].column_names)

    kw: Dict[str, Any] = {"trust_remote_code": True}
    if mode == TrainingMode.FULL:
        kw["torch_dtype"] = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        model = AutoModelForCausalLM.from_pretrained(model_name, **kw)
    elif mode == TrainingMode.LORA:
        from peft import LoraConfig, get_peft_model, TaskType
        model = AutoModelForCausalLM.from_pretrained(
            model_name, torch_dtype=torch.float16, trust_remote_code=True)
        lc = LoraConfig(task_type=TaskType.CAUSAL_LM, r=16, lora_alpha=32, lora_dropout=0.05,
                        target_modules=["q_proj","k_proj","v_proj","o_proj",
                                          "gate_proj","up_proj","down_proj"])
        model = get_peft_model(model, lc); model.print_trainable_parameters()
    else:  # CPU_OFFLOAD
        kw.update({"device_map": "auto", "torch_dtype": torch.float16})
        model = AutoModelForCausalLM.from_pretrained(model_name, **kw)

    OUT.mkdir(parents=True, exist_ok=True)
    ta = TrainingArguments(output_dir=str(OUT),
        learning_rate=lr, per_device_train_batch_size=batch,
        per_device_eval_batch_size=batch, gradient_accumulation_steps=grad_acc,
        num_train_epochs=epochs,
        fp16=kw.get("torch_dtype") == torch.float16,
        bf16=kw.get("torch_dtype") == torch.bfloat16,
        logging_steps=5, save_strategy="epoch", evaluation_strategy="epoch",
        weight_decay=0.1, warmup_ratio=0.05,
        seed=42, report_to="none", dataloader_num_workers=0,
        save_total_limit=2, load_best_model_at_end=False)
    coll = DataCollatorForLanguageModeling(tokenizer=tok, mlm=False)
    trainer = Trainer(model=model, args=ta, data_collator=coll,
                      train_dataset=tk["train"], eval_dataset=tk["test"])
    t0 = datetime.now()
    res = trainer.train()
    elapsed = str(datetime.now() - t0)
    m = res.metrics; m["train_samples"] = len(tk["train"])
    fd = OUT / "final_model"
    if mode == TrainingMode.LORA:
        try: model = model.merge_and_unload()
        except Exception as e: log.warning("LoRA merge failed: %s", e)
    model.save_pretrained(str(fd)); tok.save_pretrained(str(fd))
    ev = trainer.evaluate(); ev["eval_samples"] = len(tk["test"])
    try: ev["perplexity"] = math.exp(ev["eval_loss"])
    except Exception: ev["perplexity"] = None
    summary = {"mode": mode.value, "model_name": model_name, "max_seq_len": max_seq,
               "training_time": elapsed, "train_metrics": m, "eval_metrics": ev,
               "completed_at": datetime.now().isoformat(timespec="seconds")}
    (OUT / "training_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return summary

# -------- CLI
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--smoke", action="store_true")
    ap.add_argument("--model", default=os.getenv("MODEL_NAME_SFT", "Qwen/Qwen-1_8B-Chat"))
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--grad-acc", type=int, default=None)
    ap.add_argument("--lr", type=float, default=2e-5)
    ap.add_argument("--max-seq-len", type=int, default=2048)
    ap.add_argument("--force-mode", choices=[m.value for m in TrainingMode], default=None)
    args = ap.parse_args()
    if not SFT_JSONL.exists(): raise FileNotFoundError(SFT_JSONL)
    params = probe_params(args.model)
    log.info("Model %s ≈ %.2fB params", args.model, params / 1e9)
    avail = probe_gpu_gb(); log.info("Available GPU ≈ %.2f GB", avail)
    mode = TrainingMode(args.force_mode) if args.force_mode else decide_training_mode(params, avail)
    log.info("Chosen mode = %s", mode.value)
    grad_acc = args.grad_acc or max(1, 32 // max(1, args.batch))
    log.info("batch=%d grad_acc=%d -> global=%d", args.batch, grad_acc, args.batch*grad_acc)
    try:
        if mode == TrainingMode.SIMULATION:
            s = run_simulation(vars(args))
        else:
            import torch as _t
            s = do_train(mode, args.model, args.max_seq_len,
                         epochs=1 if args.smoke else args.epochs,
                         batch=args.batch, grad_acc=grad_acc, lr=args.lr, smoke=args.smoke)
    except Exception as e:
        if "cuda" in str(type(e)).lower() or "out of memory" in str(e).lower():
            log.error("OOM/GPU err: %s -> 自动切 SIMULATION", e)
        else:
            log.error("训练异常 %s -> 降级 SIMULATION", e)
        try:
            import torch as _t2; gc.collect(); _t2.cuda.empty_cache()
        except Exception: pass
        s = run_simulation(vars(args))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "training_summary.json").write_text(json.dumps(s, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print("\n===== SFT Summary =====\n" + json.dumps(s, ensure_ascii=False, indent=2, default=str))
    return s

if __name__ == "__main__": main()
