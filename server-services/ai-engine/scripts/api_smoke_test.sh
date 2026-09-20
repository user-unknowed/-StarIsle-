#!/bin/bash
# E1-E4: API smoke test (6 endpoints) + pytest
set -e
BASE=http://127.0.0.1:8000
echo "=== E1: /health ==="
curl -s -w '\nHTTP %{http_code}\n' $BASE/health
echo ""

echo "=== E2: /skills/status ==="
curl -s -w '\nHTTP %{http_code}\n' $BASE/skills/status | head -c 300
echo ""

echo "=== E3: /topics ==="
curl -s -w '\nHTTP %{http_code}\n' $BASE/topics | head -c 300
echo ""

echo "=== E4: /knowledge/stats ==="
curl -s -w '\nHTTP %{http_code}\n' $BASE/knowledge/stats | head -c 300
echo ""

echo "=== E5: /knowledge/categories ==="
curl -s -w '\nHTTP %{http_code}\n' $BASE/knowledge/categories | head -c 300
echo ""

echo "=== E6: POST /chat (will likely fail due to dummy OPENAI_API_KEY) ==="
curl -s -w '\nHTTP %{http_code}\n' -X POST $BASE/chat \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"smoke_test_user","message":"你好，我心情有点不好"}' | head -c 500
echo ""

echo "=== E7: POST /risk/check ==="
curl -s -w '\nHTTP %{http_code}\n' -X POST $BASE/risk/check \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"smoke_test_user","content":"我不想活了，想自杀","content_type":"chat"}' | head -c 500
echo ""

echo "=== E8: POST /emotion/analyze ==="
curl -s -w '\nHTTP %{http_code}\n' -X POST $BASE/emotion/analyze \
  -H 'Content-Type: application/json' \
  -d '{"content":"今天心情很低落，感觉很累"}' | head -c 500
echo ""
