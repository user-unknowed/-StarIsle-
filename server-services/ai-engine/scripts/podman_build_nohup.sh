#!/bin/bash
# Detached build that survives parent shell exit
cd /mnt/f/B_proj/Big_proj/-StarIsle-/server-services/ai-engine
LOG=/tmp/podman_build_nohup.log
nohup podman build --pull=never -t starisle-ai-engine:train -f dockerfile > $LOG 2>&1 &
PID=$!
disown $PID
echo "Build PID=$PID started at $(date)"
echo $PID > /tmp/podman_build.pid
