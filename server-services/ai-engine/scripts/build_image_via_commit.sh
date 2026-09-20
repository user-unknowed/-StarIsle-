#!/bin/bash
# Build image by running container, exec install, commit
# Uses CPU-only torch via --extra-index-url to avoid 4GB CUDA download
set -e

CTX=/mnt/f/B_proj/Big_proj/-StarIsle-/server-services/ai-engine
LOG=/tmp/build_via_commit.log
echo "=== Start: $(date) ===" > $LOG

# 1. Start container from base image
echo "STEP 1: Start container" >> $LOG
podman rm -f ai-engine-build 2>/dev/null || true
CID=$(podman run -d --name ai-engine-build -v $CTX:/app:Z python:3.10-slim sleep 7200)
echo "Container: $CID" >> $LOG

# 2. Install torch CPU-only first (avoids CUDA bloat)
echo "STEP 2a: pip install torch CPU" >> $LOG
podman exec ai-engine-build pip install --no-cache-dir \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  torch==2.1.2 >> $LOG 2>&1 || echo "WARN: torch install issue" >> $LOG

# 3. Install rest from requirements.txt (torch already satisfied)
echo "STEP 2b: pip install rest" >> $LOG
podman exec ai-engine-build pip install --no-cache-dir \
  -r /app/requirements.txt >> $LOG 2>&1 || echo "WARN: pip had conflicts" >> $LOG

# 4. Commit container as image with proper config
echo "STEP 3: Commit image" >> $LOG
podman commit \
  --change 'WORKDIR /app' \
  --change 'EXPOSE 8000' \
  --change 'CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]' \
  ai-engine-build starisle-ai-engine:train >> $LOG 2>&1

# 5. Cleanup build container
podman rm -f ai-engine-build >> $LOG 2>&1 || true

echo "=== End: $(date) ===" >> $LOG
echo "=== Final images ===" >> $LOG
podman images >> $LOG 2>&1
tail -30 $LOG
