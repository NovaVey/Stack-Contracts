# conformance/vectors.json

Machine-readable conformance vectors for every contract this package
exports — the same "the JSON IS the spec's own claim, not a second copy of
it" discipline taint-tracked-tool-broker's own `conformance/vectors.json`
established for its taint-decision corpus, applied here to the seams
*between* repos instead of one repo's internal behavior.

`test/conformance-vectors.spec.ts` loads this file at runtime and asserts
every vector against this package's own real implementation — running this
repository's test suite green is, by construction, this package conforming
to its own vectors. A sibling repo wanting to verify ITS OWN identity-codec
usage, `AuditEvent` shape, or `Facts` handling stays consistent with this
contract can read `vectors.json` directly (a plain JSON parser, no
dependency on this repository's test harness) and check its own behavior
against the same vectors.

## Sections

- **`identityCodec`** — round-trip `encodeIdentityRef`/`decodeIdentityRef`
  vectors, plus `invalid`/`valid` cases for `invalidDataPlaneIdReason`/
  `isValidDataPlaneId`. `invalid`/`valid` entries may carry `generateLength`
  instead of a literal `value` for the length-boundary case (513/512
  `'a'` characters) rather than embedding a long string literal.
- **`tupleRef`** — round-trip `parseObjectRef`/`parseSubjectRef` vectors
  (`object.valid`/`object.invalid`, `subject.valid`/`subject.invalid`).
- **`auditEventShape`** — ported verbatim from taint-tracked-tool-broker's
  own `conformance/vectors.json`, documenting PROTOCOL.md §4.1 (that
  repository's) as of protocolVersion 1.1. `requiredFields` is walked by
  `checkAuditEventShape()`; `validExample`/`invalidExamples` are fixtures
  proving the walker itself behaves correctly.
- **`adcFacts`** — `resolveFacts` input/output pairs, ported from
  attenuated-delegation-chain's `packages/adc-core/src/caveats.ts`.
