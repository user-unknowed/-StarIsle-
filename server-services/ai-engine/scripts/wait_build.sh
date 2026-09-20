#!/bin/bash
# Wait for build PID 366 to complete
PID=366
for i in {1..40}; do
  if ! kill -0 $PID 2>/dev/null; then
    echo "BUILD_DONE at iteration $i"
    break
  fi
  sleep 20
done
echo '---final images---'
podman images | head -10
echo '---tail log---'
tail -20 /tmp/podman_build_nohup.log
