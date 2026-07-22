import os
import json
import math
import torch
import logging
from pathlib import Path
from datetime import datetime
from transformers import (
    AutoTokenizer,
    AutoModelForMaskedLM,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
    set_seed
)
from datasets import load_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("pretraining.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

PRETRAIN_CONFIG = {
    "model_name": "bert-base-chinese",
    "output_dir": "./models/pretrained_mental_health",
    "learning_rate": 5e-5,
    "batch_size": 8,
    "num_train_epochs": 3,
    "max_seq_length": 512,
    "weight_decay": 0.01,
    "warmup_ratio": 0.1,
    "seed": 42,
    "logging_steps": 10,
    "save_steps": 50,
    "evaluation_strategy": "epoch",
    "per_device_eval_batch_size": 8,
    "load_best_model_at_end": True,
    "metric_for_best_model": "loss"
}

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(PRETRAIN_CONFIG["output_dir"])
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def prepare_dataset():
    logger.info("Loading and preparing dataset...")
    
    combined_text_path = DATA_DIR / "combined_cleaned_text.txt"
    
    dataset = load_dataset("text", data_files=str(combined_text_path))
    
    logger.info(f"Dataset loaded: {dataset}")
    
    dataset = dataset["train"].train_test_split(test_size=0.1, seed=PRETRAIN_CONFIG["seed"])
    
    logger.info(f"Train samples: {len(dataset['train'])}")
    logger.info(f"Test samples: {len(dataset['test'])}")
    
    return dataset

def tokenize_function(examples, tokenizer):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=PRETRAIN_CONFIG["max_seq_length"],
        return_overflowing_tokens=False
    )

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = predictions[0] if isinstance(predictions, tuple) else predictions
    
    mask = labels != -100
    correct = ((predictions.argmax(-1) == labels) & mask).sum().item()
    total = mask.sum().item()
    accuracy = correct / total if total > 0 else 0
    
    return {
        "accuracy": accuracy
    }

def train_model():
    set_seed(PRETRAIN_CONFIG["seed"])
    
    logger.info("=" * 60)
    logger.info("Starting Model Pre-training")
    logger.info("=" * 60)
    logger.info(f"Configuration: {PRETRAIN_CONFIG}")
    
    tokenizer = AutoTokenizer.from_pretrained(PRETRAIN_CONFIG["model_name"])
    logger.info(f"Tokenizer loaded: {PRETRAIN_CONFIG['model_name']}")
    
    model = AutoModelForMaskedLM.from_pretrained(PRETRAIN_CONFIG["model_name"])
    logger.info(f"Model loaded: {PRETRAIN_CONFIG['model_name']}")
    
    dataset = prepare_dataset()
    
    tokenized_dataset = dataset.map(
        lambda x: tokenize_function(x, tokenizer),
        batched=True,
        remove_columns=["text"]
    )
    
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm_probability=0.15
    )
    
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        learning_rate=PRETRAIN_CONFIG["learning_rate"],
        per_device_train_batch_size=PRETRAIN_CONFIG["batch_size"],
        per_device_eval_batch_size=PRETRAIN_CONFIG["per_device_eval_batch_size"],
        num_train_epochs=PRETRAIN_CONFIG["num_train_epochs"],
        weight_decay=PRETRAIN_CONFIG["weight_decay"],
        warmup_ratio=PRETRAIN_CONFIG["warmup_ratio"],
        logging_steps=PRETRAIN_CONFIG["logging_steps"],
        save_steps=PRETRAIN_CONFIG["save_steps"],
        evaluation_strategy=PRETRAIN_CONFIG["evaluation_strategy"],
        load_best_model_at_end=PRETRAIN_CONFIG["load_best_model_at_end"],
        metric_for_best_model=PRETRAIN_CONFIG["metric_for_best_model"],
        seed=PRETRAIN_CONFIG["seed"],
        report_to="none",
        logging_dir=str(OUTPUT_DIR / "logs"),
        dataloader_num_workers=0,
        disable_tqdm=False
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset["train"],
        eval_dataset=tokenized_dataset["test"],
        data_collator=data_collator,
        compute_metrics=compute_metrics
    )
    
    logger.info("Starting training...")
    start_time = datetime.now()
    
    train_result = trainer.train()
    
    training_time = datetime.now() - start_time
    logger.info(f"Training completed in {training_time}")
    
    metrics = train_result.metrics
    metrics["train_samples"] = len(tokenized_dataset["train"])
    
    logger.info(f"Training metrics: {metrics}")
    
    trainer.save_model(str(OUTPUT_DIR / "final_model"))
    tokenizer.save_pretrained(str(OUTPUT_DIR / "final_model"))
    logger.info(f"Model saved to: {OUTPUT_DIR / 'final_model'}")
    
    trainer.log_metrics("train", metrics)
    trainer.save_metrics("train", metrics)
    
    logger.info("Evaluating model...")
    eval_results = trainer.evaluate()
    eval_results["eval_samples"] = len(tokenized_dataset["test"])
    
    perplexity = math.exp(eval_results["eval_loss"])
    eval_results["perplexity"] = perplexity
    
    logger.info(f"Evaluation metrics: {eval_results}")
    
    trainer.log_metrics("eval", eval_results)
    trainer.save_metrics("eval", eval_results)
    
    with open(OUTPUT_DIR / "training_summary.json", "w", encoding="utf-8") as f:
        summary = {
            "config": PRETRAIN_CONFIG,
            "training_time": str(training_time),
            "train_metrics": metrics,
            "eval_metrics": eval_results,
            "completed_at": datetime.now().isoformat()
        }
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    logger.info("=" * 60)
    logger.info("Pre-training completed successfully!")
    logger.info("=" * 60)
    
    return summary

if __name__ == "__main__":
    try:
        summary = train_model()
        print("\n" + "=" * 60)
        print("Pre-training Summary")
        print("=" * 60)
        print(f"Model: {PRETRAIN_CONFIG['model_name']}")
        print(f"Training time: {summary['training_time']}")
        print(f"Train loss: {summary['train_metrics'].get('train_loss', 'N/A'):.4f}")
        print(f"Eval loss: {summary['eval_metrics'].get('eval_loss', 'N/A'):.4f}")
        print(f"Perplexity: {summary['eval_metrics'].get('perplexity', 'N/A'):.4f}")
        print(f"Accuracy: {summary['eval_metrics'].get('accuracy', 'N/A'):.4f}")
        print(f"Model saved to: {OUTPUT_DIR / 'final_model'}")
        print(f"Training summary saved to: {OUTPUT_DIR / 'training_summary.json'}")
    except Exception as e:
        logger.error(f"Pre-training failed: {e}", exc_info=True)
        raise