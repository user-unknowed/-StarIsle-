#!/bin/bash
# Copy app code into image and re-commit
set -e
CTX=/mnt/f/B_proj/Big_proj/-StarIsle-/server-services/ai-engine
LOG=/tmp/copy_code_and_test.log
echo "=== Start: $(date) ===" > $LOG

# 1. Start temp container with code mount
echo "STEP 1: Start temp container" >> $LOG
podman rm -f ai-engine-codecopy 2>/dev/null || true
podman run -d --name ai-engine-codecopy -v $CTX:/src:Z starisle-ai-engine:train sleep 600 >> $LOG 2>&1

# 2. Copy /src -> /app (so /app exists in committed image)
echo "STEP 2: Copy code to /app" >> $LOG
podman exec ai-engine-codecopy bash -c "rm -rf /app && cp -r /src /app && ls /app" >> $LOG 2>&1

# 3. Re-commit
echo "STEP 3: Re-commit image" >> $LOG
podman commit \
  --change 'WORKDIR /app' \
  --change 'EXPOSE 8000' \
  --change 'CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]' \
  ai-engine-codecopy starisle-ai-engine:train >> $LOG 2>&1

# 4. Cleanup
podman rm -f ai-engine-codecopy >> $LOG 2>&1 || true

# 5. Start server on port 8000
echo "STEP 4: Start server" >> $LOG
podman rm -f ai-engine-run 2>/dev/null || true
podman run -d --name ai-engine-run -p 8000:8000 starisle-ai-engine:train >> $LOG 2>&1
sleep 8

# 6. Test /health
echo "STEP 5: curl /health" >> $LOG
curl -s -o /tmp/health_out -w "HTTP %{http_code}\n" http://localhost:8000/health >> $LOG 2>&1
echo "--- /health response ---" >> $LOG
cat /tmp/health_out >> $LOG 2>&1
echo "" >> $LOG

# 7. Container log
echo "--- container log ---" >> $LOG
podman logs ai-engine-run 2>&1 | tail -30 >> $LOG

echo "=== End: $(date) ===" >> $LOG
tail -50 $LOG
