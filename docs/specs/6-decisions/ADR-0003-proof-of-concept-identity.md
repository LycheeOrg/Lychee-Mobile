# ADR-0003: Proof-of-concept identity

- **Status:** Accepted
- **Date:** 2026-10-19
- **Related features/specs:** repository setup (no feature)
- **Related open questions:** none (decided by the owner when creating the repository)

## Context

Lychee-Mobile starts as a proof of concept by one contributor, to be moved to the LycheeOrg organisation once it works. Store listings and app identifiers belong to a developer account and are hard to rename later.

## Decision

- **Repository:** `mlapaglia/Lychee-Mobile`, public, MIT licensed like Lychee; transferred to LycheeOrg after the PoC.
- **App identifier:** `com.mlapaglia.lycheemobile` (iOS bundle ID and Android application ID), under the owner's Apple and Google developer accounts.
- **Display name:** "Lychee".
- **Copyright line in file headers:** `Copyright (c) 2026 Lychee-Mobile contributors.`

## Consequences

### Positive
- No use of LycheeOrg's name or domain in store identities before the organisation agrees.
- The repository can move with `gh repo transfer`; history and issues follow.

### Negative
- At migration, LycheeOrg either publishes a new listing under its own identifier (testers reinstall) or the stores transfer the app between accounts.

## Alternatives Considered

- **LycheeOrg-style identifier now** (`dev.lycheeorg.mobile`): final identity from day one, but uses the organisation's domain before it agreed.
- **Private repository until the PoC:** hides early work, but costs Actions minutes and CodeRabbit seats.

## Security / Privacy Impact

None beyond ADR-0002's secret handling.

## Operational Impact

Migration checklist (when the PoC is accepted): transfer the repository, move or recreate the store listings, change `appId` in `capacitor.config.ts` and the native projects if the identifier changes, rotate secrets into the organisation.

## Links

- Related ADRs: ADR-0001, ADR-0002
