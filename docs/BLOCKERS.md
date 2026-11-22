# Blockers

No task hit the three-failed-attempts limit, and nothing was skipped.

Resolved issues, recorded for transparency:
- **Playwright browser version mismatch:** the first e2e run failed with "Executable doesn't exist … chromium_headless_shell-1255". `npx playwright install chromium` downloaded the right build, and `npm run verify` now runs that install step itself. If the network is unavailable, verify reports the e2e step as SKIPPED and exits with a failure instead of pretending it passed.

Things that genuinely cannot be done from inside the build (by design, not blockers):
- The mock-test prompts cannot be run against ChatGPT or Claude here, so the "Observed results" sections are empty for the team to fill in.
- Deployment needs the team's own hosting accounts, so no public URL exists.
