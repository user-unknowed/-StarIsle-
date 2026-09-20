#!/bin/bash
# D: Scan model weights for PII
cd /mnt/f/B_proj/Big_proj/-StarIsle-/server-services/ai-engine
for f in models/pretrained_word2vec/word2vec.model \
         models/pretrained_word2vec/word2vec.wv \
         models/pretrained_word2vec/training_summary.json \
         models/pretrained_word2vec/evaluation_results.json \
         models/pretrained_english/word2vec_english.model \
         models/pretrained_english/word2vec_english.wv; do
  if [ -f "$f" ]; then
    hits=$(strings "$f" 2>/dev/null | grep -E -c '1[3-9][0-9]{9}|[A-Z][a-z]+@[a-z]+\.[a-z]{2,}|\+86[- ]?1[3-9]|HREC|IRB|伦理审查' || echo 0)
    echo "$f : $hits PII hits"
  else
    echo "$f : (missing)"
  fi
done
echo '--- sft_dataset check ---'
grep -c -E '1[3-9][0-9]{9}|[A-Za-z.]+@[a-z]+\.[a-z]{2,}' data/sft_dataset_xiaoxing.jsonl 2>/dev/null || echo '0'
