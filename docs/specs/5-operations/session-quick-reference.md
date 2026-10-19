# Session Quick Reference

## Session Kickoff Checklist

1. Read `AGENTS.md` and `docs/specs/_current-session.md` (create it if missing; it is git-ignored).
2. Read `docs/specs/4-architecture/roadmap.md` and the active feature's `spec.md`, `plan.md`, `tasks.md`.
3. List open questions: `grep -H '^| Q-' docs/specs/4-architecture/features/*/open-questions.md | grep -v '| ~~Q'`
4. Skim `docs/specs/4-architecture/knowledge-map.md` and the ADRs that reference the feature.
5. Summarise roadmap status, plan progress and open questions to the user before planning or coding.

## Common Commands

| Purpose | Command |
|---------|---------|
| Install | `npm install` (CI: `vp install --frozen-lockfile`) |
| Dev server (browser) | `npx vp dev` |
| Lint + format check | `npx vp check` |
| Format one file | `npx vp fmt <file>` |
| Type check | `npx vp run typecheck` |
| Tests | `npx vp test` / `npx vp test <file>` |
| Build web app | `npx vp run build` |
| Copy web app into native shells | `npx cap sync` |
| Build + run on a device | `npm run android` / `npm run ios` (`-- --target <id>`) |
| Live reload on a device | `npm run android:live` / `npm run ios:live` (`-- --external` for Wi-Fi) |
| iOS on Xcode 27 | `npm run ios[:live]` fails until native-run#408 is released (README); use `npm run build && npx cap sync ios && npm run open:ios`, then Run |
| Open native IDEs | `npm run open:android` / `npm run open:ios` |
| Android debug build | `cd android && ./gradlew assembleDebug` |

## Handoff Prompt Template

```
Continue Feature <NNN> – <name> in Lychee-Mobile.
State: <tasks done>/<total>; last verified: <commands + results>.
Open questions: <IDs or none>.
Next task: T-<NNN>-<nn> – <title>.
Notes: <environment quirks, pending approvals>.
```
