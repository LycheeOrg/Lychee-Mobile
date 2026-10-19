# Quality Gate

Checks that must pass before an increment is committed (AGENTS.md **After Completing Work**). CI runs the same ones (`.github/workflows/ci.yml`).

| Check | Command | When |
|-------|---------|------|
| Format + lint | `npx vp check` | `.ts`, `.vue`, `.css` changed |
| Type check | `npx vp run typecheck` | `.ts`, `.vue` changed |
| Unit tests | `npx vp test` (or `npx vp test <file>` while iterating) | always |
| Web build | `npx vp run build` | always before native checks |
| Android | `npx cap sync android && (cd android && ./gradlew assembleDebug)` | native or plugin changes (JDK 21 + Android SDK) |
| iOS | `npx cap sync ios`, then build the `App` scheme in Xcode for a simulator | native or plugin changes (macOS + Xcode); otherwise rely on CI |

## Notes

- `npx vp check --fix` rewrites every file in scope, including files you did not touch. Use `npx vp fmt <file>` instead and review `git status` afterwards.
- CI matrix: Node 24 and 26 for the web checks; Android debug build on Ubuntu with JDK 21; unsigned iOS simulator build on the latest macOS runner and Xcode.
- Release builds (signed) run only in `.github/workflows/release.yml` (ADR-0002); never run release lanes locally without the owner's approval.
