# Mock-test prompt sheets

StudySync never calls an AI model. The Mock test screen builds a prompt that the student copies into an assistant of their choice (for example ChatGPT or Claude).

| Version | File | Main improvement |
|---|---|---|
| v1 | [mock-test-v1.md](mock-test-v1.md) | Baseline request |
| v2 | [mock-test-v2.md](mock-test-v2.md) | Hide answers until the student replies; examiner role; marks |
| v3 | [mock-test-v3.md](mock-test-v3.md) | Proportional coverage, no duplicates, rubric, weak topics, revision plan |
| final | [mock-test-final.md](mock-test-final.md) | Scope guard, defined difficulty mix, marks sum check, strict two-phase protocol, student instructions |

The template text in each sheet is copied from `src/prompts/*.ts`; `src/prompts/builder.test.ts` checks that every version renders with no leftover placeholders and that the final prompt contains every chosen setting.

**Observed results are intentionally empty** for every version: they must be filled in by the team after real use.
