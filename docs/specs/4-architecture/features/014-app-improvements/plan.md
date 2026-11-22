# Feature Plan 014 - App Improvements

_Linked specification: [spec.md](spec.md)_  
_Status: In Progress_  
_Last updated: 2026-11-22_

## Vision & Success Criteria

Establish a green baseline, update only compatible necessary dependencies, and fix any reproducible highest-impact finding test-first.

## Scope Alignment

- In scope: repository quality gates, dependency compatibility, verified defect fixes.
- Out of scope: new feature behavior and native permission changes unless the audit identifies an unavoidable direct defect.

## Dependencies & Interfaces

- Owner explicitly approved dependency updates.
- Existing npm lockfile and pinned Capacitor/native dependencies.

## Increment Map

1. Restore dependencies from the lockfile and run the baseline quality gate.
2. Identify compatible dependency updates and verify them.
3. Reproduce and fix the highest-impact concrete audit finding test-first.

## Analysis Gate
- 2026-11-22: pass.
- Specification, plan, tasks, and open questions agree on a quality/reliability scope.
- Q-014-01 resolved to Option A; no open blocking questions remain.
- S-014-01 through S-014-04 cover success and failure branches.
- Tests precede any verified code fix.
- Dependency changes require compatibility verification.
- No UI, native permission, telemetry, or architectural change is assumed.

## Intent Log

- 2026-11-22: kickoff identified Feature 013 as testing; only device verification remains.
- 2026-11-22: owner selected a quality/reliability audit and authorized dependency updates.
- 2026-11-22: dependency restoration passed with Node 24.14.0 engine warnings from jsdom's transitive packages.
- 2026-11-22: typecheck passed, 715 tests passed, build passed, and production dependency audit found zero vulnerabilities.
- 2026-11-22: `npx vp check` found formatting issues in 125 existing source files; no whole-tree formatter was run because this feature found no originating app defect.
- 2026-11-22: a test-only `isolate: false` experiment passed faster but produced 6 mock-contamination failures; reverted before completion.
- 2026-11-22: applied compatible patch/minor updates and ran `npx cap sync`; Android and iOS synced to Capacitor 8.6.2.
