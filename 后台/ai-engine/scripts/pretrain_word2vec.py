import os
import json
import math
import logging
from pathlib import Path
from datetime import datetime
import jieba
from gensim.models import Word2Vec
from gensim.models.callbacks import CallbackAny2Vec

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("pretraining_word2vec.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

PRETRAIN_CONFIG = {
    "vector_size": 300,
    "window": 5,
    "min_count": 3,
    "sg": 1,
    "hs": 0,
    "negative": 5,
    "workers": 4,
    "epochs": 10,
    "seed": 42,
    "output_dir": "./models/pretrained_word2vec"
}

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(PRETRAIN_CONFIG["output_dir"])
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

class EpochLogger(CallbackAny2Vec):
    def __init__(self):
        self.epoch = 0
        self.losses = []
    
    def on_epoch_begin(self, model):
        self.epoch += 1
        logger.info(f"Epoch {self.epoch}/{PRETRAIN_CONFIG['epochs']} starting...")
    
    def on_epoch_end(self, model):
        loss = model.get_latest_training_loss()
        self.losses.append(loss)
        logger.info(f"Epoch {self.epoch} completed - Loss: {loss:.4f}")

def load_and_tokenize_data():
    logger.info("Loading and tokenizing data...")
    
    combined_text_path = DATA_DIR / "combined_cleaned_text.txt"
    
    with open(combined_text_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    sentences = []
    for line in text.split('\n'):
        line = line.strip()
        if len(line) > 10:
            tokens = jieba.lcut(line)
            tokens = [t for t in tokens if t.strip() and len(t) > 1]
            if len(tokens) >= 5:
                sentences.append(tokens)
    
    logger.info(f"Total sentences: {len(sentences)}")
    logger.info(f"Total tokens: {sum(len(s) for s in sentences)}")
    
    return sentences

def train_word2vec(sentences):
    logger.info("=" * 60)
    logger.info("Starting Word2Vec Pre-training")
    logger.info("=" * 60)
    logger.info(f"Configuration: {PRETRAIN_CONFIG}")
    
    epoch_logger = EpochLogger()
    
    model = Word2Vec(
        sentences=sentences,
        vector_size=PRETRAIN_CONFIG["vector_size"],
        window=PRETRAIN_CONFIG["window"],
        min_count=PRETRAIN_CONFIG["min_count"],
        sg=PRETRAIN_CONFIG["sg"],
        hs=PRETRAIN_CONFIG["hs"],
        negative=PRETRAIN_CONFIG["negative"],
        workers=PRETRAIN_CONFIG["workers"],
        epochs=PRETRAIN_CONFIG["epochs"],
        seed=PRETRAIN_CONFIG["seed"],
        callbacks=[epoch_logger]
    )
    
    logger.info("Training completed!")
    
    model.save(str(OUTPUT_DIR / "word2vec.model"))
    model.wv.save(str(OUTPUT_DIR / "word2vec.wv"))
    
    logger.info(f"Model saved to: {OUTPUT_DIR}")
    
    vocab_size = len(model.wv.key_to_index)
    logger.info(f"Vocabulary size: {vocab_size}")
    
    summary = {
        "config": PRETRAIN_CONFIG,
        "vocab_size": vocab_size,
        "total_sentences": len(sentences),
        "total_tokens": sum(len(s) for s in sentences),
        "training_losses": epoch_logger.losses,
        "completed_at": datetime.now().isoformat()
    }
    
    with open(OUTPUT_DIR / "training_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    return model, summary

def evaluate_model(model):
    logger.info("Evaluating model...")
    
    test_words = ["抑郁", "焦虑", "情绪", "心理健康", "治疗", "症状"]
    results = {}
    
    for word in test_words:
        if word in model.wv:
            similar_words = model.wv.most_similar(word, topn=5)
            results[word] = similar_words
            logger.info(f"Similar to '{word}': {similar_words}")
        else:
            results[word] = []
            logger.info(f"'{word}' not in vocabulary")
    
    with open(OUTPUT_DIR / "evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    return results

if __name__ == "__main__":
    try:
        sentences = load_and_tokenize_data()
        
        model, summary = train_word2vec(sentences)
        
        eval_results = evaluate_model(model)
        
        print("\n" + "=" * 60)
        print("Word2Vec Pre-training Summary")
        print("=" * 60)
        print(f"Vector size: {PRETRAIN_CONFIG['vector_size']}")
        print(f"Vocabulary size: {summary['vocab_size']}")
        print(f"Total sentences: {summary['total_sentences']}")
        print(f"Training epochs: {PRETRAIN_CONFIG['epochs']}")
        print(f"Training losses: {summary['training_losses']}")
        print(f"Model saved to: {OUTPUT_DIR}")
        print(f"Training summary saved to: {OUTPUT_DIR / 'training_summary.json'}")
        print(f"Evaluation results saved to: {OUTPUT_DIR / 'evaluation_results.json'}")
        print()
        print("Sample similarity results:")
        for word, similar in eval_results.items():
            if similar:
                print(f"  {word}: {[w[0] for w in similar]}")
        
        print("\nPre-training completed successfully!")
    except Exception as e:
        logger.error(f"Pre-training failed: {e}", exc_info=True)
        raise