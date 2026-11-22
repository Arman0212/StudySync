#!/usr/bin/env bash
# Runs Claude Code headlessly, over and over, until .loop/DONE exists.
# Usage: put PROMPT.md and this file in an empty project folder, then:
#   chmod +x loop.sh && ./loop.sh
# Optional: MAX_ITERS=80 ./loop.sh
set -u
MAX_ITERS="${MAX_ITERS:-60}"
mkdir -p .loop

for i in $(seq 1 "$MAX_ITERS"); do
  if [ -f .loop/DONE ]; then
    echo "StudySync finished after $((i - 1)) iterations."
    cat .loop/DONE
    exit 0
  fi
  echo "===== Iteration $i  $(date '+%Y-%m-%d %H:%M:%S') =====" | tee -a .loop/run.log
  claude -p --dangerously-skip-permissions --max-turns 300 < PROMPT.md 2>&1 | tee -a .loop/run.log
  sleep 10   # small pause, also gives you a moment to Ctrl+C
done

echo "Stopped after $MAX_ITERS iterations without .loop/DONE. Check .loop/PROGRESS.md and docs/BLOCKERS.md."
exit 1
