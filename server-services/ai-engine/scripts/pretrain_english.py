"""
pretrain_english.py - 英文 Word2Vec 预训练脚本

所属模块：ai-engine/scripts
功能简述：
    基于清洗后的英文语料（combined_cleaned_text.txt）训练 Word2Vec 词向量，
    并通过相似词检索与困惑度（perplexity）评估模型质量。
依赖关系：
    - gensim：Word2Vec 模型与回调
"""
import os
import json
import math
import re
import logging
from pathlib import Path
from datetime import datetime
from gensim.models import Word2Vec
from gensim.models.callbacks import CallbackAny2Vec

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("pretraining_english.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 预训练超参数配置
PRETRAIN_CONFIG = {
    "vector_size": 300,
    "window": 5,
    "min_count": 5,
    "sg": 1,
    "hs": 0,
    "negative": 5,
    "workers": 4,
    "epochs": 15,
    "seed": 42,
    "output_dir": "./models/pretrained_english"
}

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(PRETRAIN_CONFIG["output_dir"])
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

class EpochLogger(CallbackAny2Vec):
    """训练回调：记录每个 epoch 的损失，便于监控收敛过程。"""

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

def tokenize_english(text):
    """英文分词：转小写、去除非字母字符、按空格切分为词列表。"""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    tokens = text.split()
    return tokens

def load_and_tokenize_data():
    """加载并 tokenize 英文语料，返回句子（词列表）集合。"""
    logger.info("Loading and tokenizing English data...")

    combined_text_path = DATA_DIR / "combined_cleaned_text.txt"

    with open(combined_text_path, 'r', encoding='utf-8') as f:
        text = f.read()

    sentences = []
    for line in text.split('\n'):
        line = line.strip()
        if len(line) > 20:
            tokens = tokenize_english(line)
            tokens = [t for t in tokens if len(t) > 2]
            if len(tokens) >= 5:
                sentences.append(tokens)

    logger.info(f"Total sentences: {len(sentences)}")
    logger.info(f"Total tokens: {sum(len(s) for s in sentences)}")

    return sentences

def train_word2vec(sentences):
    """使用语料训练 Word2Vec 模型，保存模型与词向量并输出训练摘要。"""
    logger.info("=" * 60)
    logger.info("Starting English Word2Vec Pre-training")
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

    model.save(str(OUTPUT_DIR / "word2vec_english.model"))
    model.wv.save(str(OUTPUT_DIR / "word2vec_english.wv"))

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
    """通过预设测试词检索相似词，评估模型语义表示质量。"""
    logger.info("Evaluating model...")

    test_words = ["depression", "anxiety", "emotion", "mental", "health", "treatment", "symptoms", "trauma", "childhood", "stress"]
    results = {}

    for word in test_words:
        if word in model.wv:
            similar_words = model.wv.most_similar(word, topn=8)
            results[word] = similar_words
            logger.info(f"Similar to '{word}': {similar_words}")
        else:
            results[word] = []
            logger.info(f"'{word}' not in vocabulary")

    with open(OUTPUT_DIR / "evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results

def calculate_perplexity(model, sentences):
    """基于上下文词向量余弦相似度近似计算困惑度（perplexity）。"""
    logger.info("Calculating perplexity...")

    total_log_prob = 0
    total_words = 0

    for sentence in sentences:
        for i, word in enumerate(sentence):
            if word in model.wv:
                # 取窗口内上下文词
                context = sentence[max(0, i-5):i] + sentence[i+1:min(len(sentence), i+6)]
                context = [w for w in context if w in model.wv]

                if len(context) > 0:
                    word_vec = model.wv[word]
                    context_vecs = [model.wv[w] for w in context]

                    avg_context_vec = sum(context_vecs) / len(context_vecs)

                    similarity = model.wv.cosine_similarities(word_vec, [avg_context_vec])[0]

                    # 将相似度归一化为概率
                    prob = (similarity + 1) / 2
                    if prob > 0:
                        total_log_prob += math.log(prob)
                        total_words += 1

    if total_words > 0:
        avg_log_prob = total_log_prob / total_words
        perplexity = math.exp(-avg_log_prob)
    else:
        perplexity = float('inf')

    logger.info(f"Perplexity: {perplexity:.4f}")
    return perplexity

if __name__ == "__main__":
    try:
        sentences = load_and_tokenize_data()
        
        model, summary = train_word2vec(sentences)
        
        eval_results = evaluate_model(model)
        
        perplexity = calculate_perplexity(model, sentences)
        summary["perplexity"] = perplexity
        
        with open(OUTPUT_DIR / "training_summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        print("\n" + "=" * 60)
        print("English Word2Vec Pre-training Summary")
        print("=" * 60)
        print(f"Vector size: {PRETRAIN_CONFIG['vector_size']}")
        print(f"Vocabulary size: {summary['vocab_size']}")
        print(f"Total sentences: {summary['total_sentences']}")
        print(f"Total tokens: {summary['total_tokens']:,}")
        print(f"Training epochs: {PRETRAIN_CONFIG['epochs']}")
        print(f"Final training loss: {summary['training_losses'][-1]:.4f}")
        print(f"Perplexity: {perplexity:.4f}")
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