# Runs Claude Code headlessly, over and over, until .loop/DONE exists.
# Usage (PowerShell, in an empty project folder containing PROMPT.md):
#   powershell -ExecutionPolicy Bypass -File .\loop.ps1
#   powershell -ExecutionPolicy Bypass -File .\loop.ps1 -MaxIters 80
param([int]$MaxIters = 60)

New-Item -ItemType Directory -Force -Path .loop | Out-Null

for ($i = 1; $i -le $MaxIters; $i++) {
    if (Test-Path .loop/DONE) {
        Write-Host "StudySync finished after $($i - 1) iterations."
        Get-Content .loop/DONE
        exit 0
    }
    "===== Iteration $i  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') =====" | Tee-Object -FilePath .loop/run.log -Append
    Get-Content PROMPT.md -Raw | claude -p --dangerously-skip-permissions --max-turns 300 2>&1 |
        Tee-Object -FilePath .loop/run.log -Append
    Start-Sleep -Seconds 10
}

Write-Host "Stopped after $MaxIters iterations without .loop/DONE. Check .loop/PROGRESS.md and docs/BLOCKERS.md."
exit 1
