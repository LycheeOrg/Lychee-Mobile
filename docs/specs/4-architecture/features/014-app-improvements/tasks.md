# Feature 014 Tasks - App Improvements

_Status: In Progress_  
_Last updated: 2026-11-22_

- [ ] Restore dependencies from the lockfile and run the quality gate. Restoration passed; typecheck, 715 tests, build, and production audit passed. `npx vp check` remains red because 125 existing source files do not match the configured formatter.
- [x] Audit dependency updates and apply only compatible, necessary updates. Applied Ionic 9.0.13, Vue 3.5.46, Vue Router 5.5.1, Ionicons 8.1.1, Capacitor CLI 8.6.2, Vue plugin 6.0.11, and Vue Test Utils 2.6.0; then synchronized Capacitor Android/iOS shells.
- [ ] Reproduce the highest-impact concrete finding and confirm a failing focused test.
- [ ] Implement the smallest verified fix and rerun the focused test and quality gate. No app defect was exposed: the only test failure came from the rejected shared-jsdom experiment and was reverted.
- [ ] Update knowledge map, feature docs, and roadmap if modules or contracts change. Feature docs and roadmap updated; modules and contracts unchanged.
