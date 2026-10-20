# Lychee-Mobile Overview

Lychee-Mobile is an iOS and Android client for a self-hosted [Lychee](https://github.com/LycheeOrg/Lychee) photo gallery: browse albums, view photos and upload from the phone.

- **Status:** hosted at [`LycheeOrg/Lychee-Mobile`](https://github.com/LycheeOrg/Lychee-Mobile), transferred from `mlapaglia/Lychee-Mobile` on 2026-10-20; the store identities are still the proof of concept's (ADR-0003).
- **Stack:** Capacitor 8 + Ionic Vue 9 on Vue 3 and TypeScript, built with Lychee's toolchain (ADR-0001).
- **Delivery:** alpha builds to TestFlight and Google Play internal testing on every push to `main`; production on published GitHub releases (ADR-0002).

## Documentation map

| Folder | Contents |
|--------|----------|
| `1-concepts/` | Domain concepts (shared with Lychee: albums, photos, users) as the app needs them |
| `2-how-to/` | Task guides |
| `3-reference/` | Coding conventions and other reference material |
| `4-architecture/` | Roadmap, knowledge map, feature specs (`features/<NNN>-<name>/`), spec guidelines |
| `5-operations/` | Quality gate, analysis gate, session runbooks, release runbook |
| `6-decisions/` | Architecture decision records |
| `templates/` | Templates for specs, plans, tasks, open questions, ADRs and how-tos |
