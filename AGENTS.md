This repository follows the same working agreements as [LycheeOrg/Lychee](https://github.com/LycheeOrg/Lychee/blob/master/AGENTS.md), adapted to a Capacitor + Ionic Vue mobile app (ADR-0001).

## Before You Code
- **Clarify ambiguity first.** Do not plan or implement until every requirement is understood. Ask the user, record unresolved items in the feature's own `docs/specs/4-architecture/features/<NNN>-<feature-name>/open-questions.md` (create it from [docs/specs/templates/feature-open-questions-template.md](docs/specs/templates/feature-open-questions-template.md) if missing), and wait for answers. Capture accepted answers by updating the relevant specification's requirements/NFR/behaviour/telemetry sections so the spec remains the single source of truth for behaviour.
  - **No-direct-question rule:** For feature work, never ask the user for clarification, approval, or a decision in chat until the matching open question is logged in the feature's `open-questions.md` (table row + Question Details entry). Treat violations as blockers: stop work, add the missing entry, then resume the conversation by referencing that question ID.
  - **Governance/tooling exemption:** Questions about work that belongs to no feature (AGENTS.md, runbooks, templates, conventions, scripts, CI, release pipeline) are asked directly in chat without logging. Still present them in the Options A, B, C format below, ordered by preference, and record the outcome in the governing document itself.
  - Whenever you present alternative approaches, first capture or update the entry in the feature's `open-questions.md` (summary row + Question Details section), then present it **inline in chat** as a Decision Card ([open-questions-format.md](docs/specs/4-architecture/spec-guidelines/open-questions-format.md)), calling out the question ID (for example, Q-004-01). **Order the options by preference** (Option A is always the recommended path).
- **Work in small steps.** During planning, break every change into logical, self-contained tasks expected to complete within ≤90 minutes, and prepare a Conventional Commit for each finished slice (see **Commit protocol**).
- **Prime the knowledge map.** Skim [docs/specs/4-architecture/knowledge-map.md](docs/specs/4-architecture/knowledge-map.md) before planning so new work reinforces the relationships already captured there.
- **Template usage.** Author specifications, plans, task checklists and open-questions logs from [docs/specs/templates/](docs/specs/templates/) so structure and verification notes stay uniform.
- **ADR context.** Before planning or implementation, skim ADRs under `docs/specs/6-decisions/` that reference the active feature, plus the repository-level ADR-0001 … ADR-0003.

## Specification Pipeline
- Start every feature by creating or updating its specification at `docs/specs/4-architecture/features/<NNN>-<feature-name>/spec.md`. `<feature-name>` is a short, hyphen-separated action-noun name (2–4 words), e.g. "server-login", "album-browsing", "photo-upload". Numbering: [feature-numbering-conventions.md](docs/specs/4-architecture/spec-guidelines/feature-numbering-conventions.md).
- For any new UI or UI change, include an ASCII mock-up in the specification ([ui-ascii-mockups.md](docs/specs/4-architecture/spec-guidelines/ui-ascii-mockups.md)), for phone layout first and tablet when it differs.
- Capture every high-impact clarification (and each medium-impact uncertainty) in the feature's `open-questions.md`; once resolved, record the outcome in the spec's normative sections. For architecturally significant clarifications (cross-feature boundaries, native permissions, security/telemetry, offline/sync strategy, major NFR trade-offs), create or update an ADR from [docs/specs/templates/adr-template.md](docs/specs/templates/adr-template.md), then mark the question resolved with links to the spec sections and ADR.
- Generate or refresh the feature plan (`plan.md`) only after the spec is current and high/medium clarifications are resolved.
- Maintain a per-feature `tasks.md` that mirrors the plan, orders tests before code, and keeps increments ≤90 minutes.
- When revising a specification, only document fallback or compatibility behaviour if the user explicitly asked for it.
- Run the analysis gate in [docs/specs/5-operations/analysis-gate-checklist.md](docs/specs/5-operations/analysis-gate-checklist.md) once spec, plan and tasks agree; address findings before implementation.

## Session Kickoff
- Follow [docs/specs/5-operations/runbook-session-reset.md](docs/specs/5-operations/runbook-session-reset.md) whenever a chat session starts without prior context.
- Begin every fresh interaction by summarising roadmap status, feature plan progress and open questions.
- Request clarification on outstanding questions before planning or implementation; log new questions immediately.

> Quick reference: [docs/specs/5-operations/session-quick-reference.md](docs/specs/5-operations/session-quick-reference.md).
- Maintain `docs/specs/_current-session.md` as the live snapshot across chats (git-ignored, local to each checkout; create it if missing).

## SDD Feedback Loops
- Specification-Driven Development is the default cadence, aligned with the [GitHub Spec Kit reference](https://github.com/github/spec-kit/blob/main/spec-driven.md).
- **Update specs before code.** Refresh the feature plan and note open questions before each task.
- **Test-first cadence.** Write or extend tests (Vitest units, component tests) ahead of implementation, confirm they fail, then drive code to green before refactoring.
- **Branch coverage upfront.** List the success, validation and failure branches (offline, server unreachable, permission denied, …) and add thin failing tests for each path first.
- **Reflection checkpoint.** After loops close, record lessons, coverage deltas and follow-ups in the feature plan or roadmap.

## During Implementation
- **Follow coding conventions.** [docs/specs/3-reference/coding-conventions.md](docs/specs/3-reference/coding-conventions.md): license header in new files, strict comparison (`===`), `<script setup lang="ts">`, Ionic Vue components, no `any`, tests as `*.test.ts` next to the module.
- **Sync context to disk.** Update the roadmap, feature spec, plan and tasks as progress is made. Use ADRs only for final decisions.
- **Check off tasks immediately.** Mark each task `[x]` in `tasks.md` as soon as it passes verification.
- **No unapproved deletions.** Never delete files or directories unless the user approved the exact paths in the current session; surface unexpected untracked files instead of removing them.
- **Tests are compulsory.** Run the tests covering your change (`npx vp test <file>`). A red test blocks the increment. Never skip, disable or delete a failing test to get green; a quarantine needs the user's explicit approval, an owner and a follow-up task.
- **Native projects.** `android/` and `ios/` are generated by Capacitor and committed. Change them only for what Capacitor cannot express (permissions, usage strings, signing/version wiring, native plugins), and document each hand edit in the feature plan. Run `npx vp build && npx cap sync` after web changes that the native shells must pick up.
- **Maintain the knowledge map** whenever modules, services, stores, plugins or API contracts appear or change.
- **Straight-line increments.** Keep control flow flat by delegating validation/normalisation to small pure helpers that return simple values, then compose them.
- **RCI self-review.** Before hand-off, review your own changes, rerun checks, and ensure docs/tests match the behaviour.
- **Commit protocol.** Once an increment passes `npx vp check`, `npx vp run typecheck` and `npx vp test`, prepare the commit for the operator instead of executing it: stage (or list) the files, write a Conventional Commit message with a `Spec impact:` line whenever docs and code change together and no semicolons (use multiple `-m` flags), and hand over a copy/paste-ready `git commit …` command. The operator commits unless they delegate it.
- **Dependencies.** **Never add or upgrade libraries (npm, Capacitor plugins, Gradle, CocoaPods/SPM, Ruby gems) without explicit user approval.** When granted, document the rationale in the feature plan. Dependabot opens weekly PRs; they still need owner approval.
- **No surprises.** Avoid destructive commands (`rm -rf`, `git reset --hard`, …) unless requested. Stay within the repository.

## Guardrails & Governance
- **Backward-compat stance.** Treat every interface as greenfield; add no fallbacks or shims unless the user asks for them in the current task. Exception: the Lychee server API, whose supported versions are stated in the spec of the feature that calls it.
- **Intent logging.** Capture prompt summaries, command sequences and rationale in the active feature plan.
- **Escalation policy.** Propose risky refactors, storage/sync changes, new native permissions or dependency updates to the user before touching code; record approvals in the plan.

## Tracking & Documentation
- **Implementation plans.** High-level plans live in [docs/specs/4-architecture/roadmap.md](docs/specs/4-architecture/roadmap.md); each feature's spec/plan/tasks/open-questions live in `docs/specs/4-architecture/features/<NNN>-<feature-name>/` and are kept after completion.
- **Open questions.** Each feature owns its `open-questions.md`. List unresolved ones with `grep -H '^| Q-' docs/specs/4-architecture/features/*/open-questions.md | grep -v '| ~~Q'`. When resolved, keep the row, strike the ID (`~~Q-NNN-NN~~`) and set the status to `Resolved (…)`.
- **Decisions.** Confirmed architectural decisions go to `docs/specs/6-decisions/` as `ADR-<NNN>-<YY>` (feature, then sequence); repository-level ones keep `ADR-XXXX`.
- **Local overrides.** A subdirectory with different rules gets its own `AGENTS.md`, referenced from the roadmap/feature plan.

## After Completing Work
- **Validate the task checklist** before committing; the roadmap reflects current progress.
- **Prepare a commit after each feature** and hand the command to the operator (see **Commit protocol**).
- **Quality gate** ([docs/specs/5-operations/quality-gate.md](docs/specs/5-operations/quality-gate.md)), run for the file types you changed:
  1. `npx vp check` (Oxfmt + Oxlint, the same rules as Lychee). Do **not** run `npx vp check --fix` on the whole tree; format single files with `npx vp fmt <file>`.
  2. `npx vp run typecheck` (vue-tsc).
  3. `npx vp test` (Vitest).
  4. `npx vp run build`.
  5. Native changes: Android `cd android && ./gradlew assembleDebug` (JDK 21); iOS through CI (`.github/workflows/ci.yml`) unless Xcode is available locally.
- Update or close entries in the feature's `open-questions.md`, and summarise lasting decisions in an ADR.

## CRITICAL: Signing & Release Rules

### NEVER:
- Commit keystores, `.p8`/`.p12` files, provisioning profiles, service-account JSON or any password (they are git-ignored; keep it that way).
- Print secrets in workflow logs, or pass them to steps that do not need them.
- Run `fastlane … alpha|production`, `match` in write mode, or anything that uploads to TestFlight/App Store Connect/Google Play from a local machine without the owner's explicit approval in the current session.
- Change the app identifier (`com.mlapaglia.lycheemobile`, ADR-0003) without an ADR.

### Releases
- Alpha ships automatically from `main`; production ships when the owner publishes a GitHub release tagged `vX.Y.Z` ([runbook-releases.md](docs/specs/5-operations/runbook-releases.md), ADR-0002).

## Testing

- Run tests with `npx vp test` (all) or `npx vp test <path>` (scoped). Unit tests live next to the module as `*.test.ts` and run in jsdom.
- CI also builds the Android debug APK and the iOS simulator app on every push and pull request.
