# Feature 014 - App Improvements

| Field | Value |
|-------|-------|
| Status | In Progress |
| Last updated | 2026-11-22 |
| Owners | Owner |
| Linked plan | [plan.md](plan.md) |
| Linked tasks | [tasks.md](tasks.md) |
| Roadmap entry | #014 |

## Overview

This draft feature captures the owner's request for a dependency update and a general application improvement. The affected modules depend on the selected improvement scope and remain undefined until Q-014-01 is resolved.

## Goals

- Deliver one concrete, measurable improvement to Lychee-Mobile.
- Preserve existing browsing, upload, download, and native behavior.

## Non-Goals

- No new user-facing feature is included unless a concrete finding requires one.
- No major dependency migration or native permission change is implicit.

## Open Questions

None. [Q-014-01](open-questions.md#q-014-01---improvement-scope) resolved to a quality and reliability audit.

## Functional Requirements

| ID | Requirement | Success path | Validation path | Failure path | Telemetry & traces | Source |
|----|-------------|--------------|-----------------|--------------|--------------------|--------|
| FR-014-01 | The audit verifies the application using the repository quality gates. | Formatting/lint, type checking, tests, and build complete successfully. | Report each command and its result; retain reproducible focused findings. | A failure is reproduced and the smallest root-cause fix is test-first. | No new telemetry. | Owner 2026-11-22 |
| FR-014-02 | Dependency updates are applied only when compatible and necessary. | Lockfile and declared ranges remain consistent; web/native builds stay valid. | Run the quality gates and native compatibility checks where applicable. | Dependency incompatibility is reported and reverted without hiding the failure. | No new telemetry. | Owner 2026-11-22 |

## Non-Functional Requirements

| ID | Requirement | Driver | Measurement | Dependencies | Source |
|----|-------------|--------|-------------|--------------|--------|
| NFR-014-01 | Existing behavior remains covered. | Prevent regressions during cleanup. | Existing and focused tests pass. | Vitest and jsdom. | AGENTS.md |
| NFR-014-02 | Changes stay surgical. | Avoid unrelated churn. | Diff contains only the verified finding and directly related docs/tests. | Git diff. | AGENTS.md |

## Branch & Scenario Matrix

| Scenario ID | Description / Expected outcome |
|-------------|--------------------------------|
| S-014-01 | Quality gate passes; no code change is required. |
| S-014-02 | Quality gate exposes a reproducible defect; add a failing test and implement the smallest fix. |
| S-014-03 | A dependency has a compatible update; update the manifest/lockfile and verify all gates. |
| S-014-04 | A dependency update is incompatible or cannot be safely verified; report it and preserve the current lock state. |

## Test Strategy

- **Repository:** `npx vp check`, `npx vp run typecheck`, `npx vp test`, and `npx vp run build`.
- **Focused:** add or extend `*.test.ts` beside the changed module before implementation.
- **Native:** run Android Gradle verification or sync/build only if web/native boundaries change.

## Audit Outcome

- Dependency restoration and lockfile reconciliation succeeded.
- Capacitor patch/minor updates were verified through tests, typecheck, build, and `npx cap sync`.
- Production dependencies report zero known vulnerabilities.
- The repository quality gate remains blocked by formatting drift across 125 existing source files, not a test or type failure.
