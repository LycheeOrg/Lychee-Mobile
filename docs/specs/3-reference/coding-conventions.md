# Coding Conventions

Coding standards for Lychee-Mobile, aligned with the Vue/TypeScript conventions of [LycheeOrg/Lychee](https://github.com/LycheeOrg/Lychee/blob/master/docs/specs/3-reference/coding-conventions.md) (its v8 tree).

## File Structure

- **License header:** every new `.ts`, `.css` and Ruby file starts with:

  ```ts
  /**
   * SPDX-License-Identifier: MIT
   * Copyright (c) 2026 Lychee-Mobile contributors.
   */
  ```

  `.vue` files carry no header (same as Lychee).
- **Layout:** `src/views/` (routed pages), `src/components/`, `src/composables/`, `src/services/` (Lychee API calls), `src/stores/`, `src/utils/` (pure helpers), `src/router/`, `src/theme/`. Import with the `@/` alias.

## Vue 3

- Composition API with `<script setup lang="ts">`; order: `<template>`, `<script>`, `<style>`.
- UI from **Ionic Vue** components (`IonPage`, `IonContent`, `IonList`, …) imported explicitly from `@ionic/vue`; every routed page is wrapped in `IonPage`.
- Navigation through `@ionic/vue-router` so page transitions and the back button behave natively.
- Both `function` declarations and arrow functions are fine; `async`/`await` is fine (Lychee v8 rules).
- No business logic in templates: move it to computed properties, composables or `src/utils/`.

## TypeScript

- `strict` mode; no `any` (Oxlint `typescript/no-explicit-any` is an error), no non-null assertions on optional chains.
- Strict comparison (`===`, `!==`) only.
- Types for Lychee API payloads live next to the service that calls the endpoint; keep their names aligned with Lychee's generated `App.Http.Resources.*` types.
- Pure helpers return simple values (`null`, enums, result records) instead of throwing for expected failures.

## Native and Capacitor

- Prefer official `@capacitor/*` plugins; any other plugin needs owner approval (AGENTS.md **Dependencies**).
- Call plugins through a small wrapper in `src/services/` so components stay testable in jsdom.
- Sensitive values (tokens, passwords) never go in `@capacitor/preferences`; use the platform keychain/keystore through a vetted plugin.
- Every new permission needs an iOS usage string (`Info.plist`) and an Android manifest entry, both described in the feature spec.

## API Communication

- Lychee server calls live in `src/services/`; the base URL comes from the stored server address (`normalizeServerUrl()`).
- Handle offline and unreachable-server states explicitly; they are spec scenarios, not afterthoughts.

## Testing

- Vitest (`npx vp test`), jsdom environment, files named `*.test.ts` next to the module they cover.
- Import test APIs from `vite-plus/test` (Oxlint `vite-plus/prefer-vite-plus-imports`).
- Components: `@vue/test-utils`; mock Capacitor plugins at the service wrapper, not inside components.

## Formatting and Lint

- Oxfmt: tabs (width 4), print width 150, semicolons, final newline (configured in `vite.config.ts`, same as Lychee).
- Oxlint: Lychee's rule set (vue essential + typescript recommended).
- `npx vp check` must pass. Do not run `npx vp check --fix` on the whole tree; use `npx vp fmt <file>` for the files you changed.

## Documentation

- Markdown under `docs/specs/` following the templates; specs are the source of truth (AGENTS.md).
- Reference code as `path/to/file.ts:line` in specs and plans.
