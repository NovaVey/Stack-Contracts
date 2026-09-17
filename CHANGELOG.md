# Changelog

All notable changes to this package are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); versioning is
[SemVer](https://semver.org/) — see README.md's "Versioning" section for
what counts as a breaking change for this package specifically.

## [Unreleased]

## [0.2.0] - 2026-09-17

### Fixed

- `encodeIdentityRef`/`decodeIdentityRef` now percent-encode/decode `%`,
  `#`, `@`, and control characters in `source`/`externalId`. Previously
  neither escaped anything, so a foreign `externalId` containing a
  reserved character (an email address's `@`, say) produced a composite
  id that `invalidDataPlaneIdReason` — and RBA's real tuple-write
  validation — correctly rejected outright. Confirmed in Principal-Graph:
  every Workspace grant (ids shaped like `workspace:alice@acme.example`)
  was silently dead-lettered by this. `encodeIdentityRef` also now throws
  if `source` itself contains a colon, instead of silently corrupting the
  round trip for that ref's `externalId`.

## [0.1.0] - 2026-09-17

Initial release.

### Added

- `src/identity/codec.ts` — the `${source}:${externalId}` identity-ref
  codec (`encodeIdentityRef`/`decodeIdentityRef`) and the data-plane id
  validation grammar (`invalidDataPlaneIdReason`/`isValidDataPlaneId`/
  `MAX_DATA_PLANE_ID_LENGTH`), ported from
  relationship-based-authorization's `src/store/tuples.ts` (authoritative).
- `src/identity/tuple-ref.ts` — the RBA tuple wire-format grammar
  (`parseObjectRef`/`parseSubjectRef`/`formatObjectRef`/`formatSubjectRef`),
  ported from relationship-based-authorization's
  `src/cli/commands/tuple.ts`.
- `src/events/audit-event.ts` — the minimum `AuditEvent` shape shared
  across the broker/audit-sink seam (`MinimalAuditEvent`,
  `checkAuditEventShape`), ported from taint-tracked-tool-broker's
  `PROTOCOL.md` §4.1 (protocolVersion 1.1).
- `src/adc/facts.ts` — the ADC verification-time `Facts` shape
  (`Facts`/`ResolvedFacts`/`resolveFacts`), ported from
  attenuated-delegation-chain's `packages/adc-core/src/caveats.ts`.
- `conformance/vectors.json` — round-trip conformance vectors for every
  contract above, plus `test/conformance-vectors.spec.ts` running them.
- `PROTOCOL.md` — the normative specification for every seam this package
  owns.
