#!/usr/bin/env bash
# 从 hf-mirror.com 镜像下载模型文件到本地，绕过 huggingface.co SNI 阻断。
# 用法: ./download_model.sh [model_id] [local_dir]
# 例: ./download_model.sh Qwen/Qwen2-0.5B-Instruct /workspace/.hf_cache/Qwen2-0.5B-Instruct
set -euo pipefail

MODEL_ID="${1:-Qwen/Qwen2-0.5B-Instruct}"
LOCAL_DIR="${2:-/workspace/.hf_cache/$(echo $MODEL_ID | tr '/' '_')}"
MIRROR="https://hf-mirror.com"

mkdir -p "$LOCAL_DIR"
cd "$LOCAL_DIR"

echo "=== Downloading $MODEL_ID to $LOCAL_DIR ==="

# 必需文件清单（Qwen2 系列标准文件）
FILES=(
  "config.json"
  "tokenizer_config.json"
  "tokenizer.json"
  "generation_config.json"
  "model.safetensors"
  "merges.txt"
  "vocab.json"
  "special_tokens_map.json"
  "tokenization_config.json"
)

for f in "${FILES[@]}"; do
  url="$MIRROR/$MODEL_ID/resolve/main/$f"
  echo "--- $f ---"
  # -f 静默 404，-L 跟随重定向
  curl -fsSL --max-time 300 -o "$f" "$url" 2>/dev/null || {
    echo "  (skipped: $f not found or 404)"
    rm -f "$f"
  }
done

echo ""
echo "=== Downloaded files ==="
ls -la "$LOCAL_DIR"
echo ""
echo "=== Total size ==="
du -sh "$LOCAL_DIR"
echo ""
echo "=== Config preview ==="
head -c 300 config.json 2>/dev/null && echo "" || echo "(no config.json)"

echo ""
echo "=== Done. Use with: ==="
echo "  model = AutoModelForCausalLM.from_pretrained('$LOCAL_DIR', trust_remote_code=True)"
