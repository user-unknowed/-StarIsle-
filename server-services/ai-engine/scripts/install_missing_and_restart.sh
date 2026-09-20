#!/bin/bash
# Install missing cryptography dep, copy code, commit, test /health
set -e
CTX=/mnt/f/B_proj/Big_proj/-StarIsle-/server-services/ai-engine
LOG=/tmp/install_and_restart.log
echo "=== Start: $(date) ===" > $LOG

# 1. Start temp container with code mount
podman rm -f ai-engine-codecopy 2>/dev/null || true
podman run -d --name ai-engine-codecopy -v $CTX:/src:Z starisle-ai-engine:train sleep 600 >> $LOG

# 2. Install missing cryptography and pin httpx
echo "STEP 2: Install cryptography + httpx pin" >> $LOG
podman exec ai-engine-codecopy pip install --no-cache-dir cryptography==41.0.7 'httpx==0.26.0' >> $LOG 2>&1

# 3. Copy fresh code to /app
echo "STEP 3: Copy code to /app" >> $LOG
podman exec ai-engine-codecopy bash -c "rm -rf /app && cp -r /src /app" >> $LOG 2>&1

# 4. Commit image
echo "STEP 4: Commit image" >> $LOG
podman commit \
  --change 'WORKDIR /app' \
  --change 'EXPOSE 8000' \
  --change 'CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]' \
  ai-engine-codecopy starisle-ai-engine:train >> $LOG 2>&1

podman rm -f ai-engine-codecopy >> $LOG 2>&1 || true

# 5. Start server
echo "STEP 5: Start server" >> $LOG
podman rm -f ai-engine-run 2>/dev/null || true
podman run -d --name ai-engine-run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-dummy-for-healthcheck \
  -e MONGODB_URL=mongodb://dummy:dummy@localhost:27017/ \
  -e REDIS_URL=redis://localhost:6379/0 \
  -e HF_HUB_OFFLINE=1 \
  -e TRANSFORMERS_OFFLINE=1 \
  starisle-ai-engine:train >> $LOG
sleep 15

# 6. Test /health
echo "STEP 6: curl /health" >> $LOG
curl -s -o /tmp/health_out -w "HTTP %{http_code}\n" http://localhost:8000/health >> $LOG 2>&1
echo "--- /health response ---" >> $LOG
cat /tmp/health_out >> $LOG
echo "" >> $LOG

# 7. Container log
echo "--- container log tail ---" >> $LOG
podman logs ai-engine-run 2>&1 | tail -20 >> $LOG

echo "=== End: $(date) ===" >> $LOG
tail -40 $LOG
