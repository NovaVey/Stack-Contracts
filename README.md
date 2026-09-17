# Stack-Contracts

`@novavey/contracts` — the shared protocol between five sibling
agent-security repos: [Taint-Tracked-Tool-Broker](https://github.com/NovaVey/Taint-Tracked-Tool-Broker),
[Relationship-Based-Authorization](https://github.com/NovaVey/Relationship-Based-Authorization),
[Principal-Graph](https://github.com/NovaVey/Principal-Graph),
[Attenuated-Delegation-Chain](https://github.com/NovaVey/Attenuated-Delegation-Chain),
and [Control-Coverage-Range](https://github.com/NovaVey/Control-Coverage-Range).

## The problem this solves

That protocol used to live as copied regex literals and long explanatory
comments scattered across repos — the tuple identifier grammar, the
`${source}:${externalId}` convention, `AuditEvent` field expectations, the
ADC `Facts` shape. Each copy was a place where one repo could change and
nothing would turn red anywhere else.

This package makes each of those seams **one implementation**, with
machine-readable, round-trip conformance vectors (`conformance/`) proving
the implementation and the spec agree. See [`PROTOCOL.md`](./PROTOCOL.md)
for the full normative contract.

## What's in here

| Module | Contract |
|---|---|
| `src/identity/codec.ts` | The `${source}:${externalId}` identity-ref codec and the data-plane id validation grammar. Authoritative source: relationship-based-authorization's `src/store/tuples.ts`. |
| `src/identity/tuple-ref.ts` | The RBA tuple wire-format grammar (`namespace:id`, `namespace:id#relation`). |
| `src/events/audit-event.ts` | The minimum `AuditEvent` shape shared across the broker/audit-sink seam, ported from taint-tracked-tool-broker's `PROTOCOL.md` §4.1. |
| `src/adc/facts.ts` | The ADC verification-time `Facts` shape, ported from `@adc/core`. |

See [`PROTOCOL.md`](./PROTOCOL.md) for the full rationale behind each.

## Install

As a git dependency, pinned by commit sha (works without any npm org
setup):

```json
{
  "dependencies": {
    "@novavey/contracts": "github:NovaVey/Stack-Contracts#<commit-sha>"
  }
}
```

`prepare`/`prepack` build `dist/` on install, and `src` ships in the
package's `files` allowlist, so this works identically whether installed
from git or (if later published) from the npm registry.

## Usage

```ts
import {
  encodeIdentityRef,
  decodeIdentityRef,
  isValidDataPlaneId,
  parseObjectRef,
  parseSubjectRef,
  checkAuditEventShape,
  resolveFacts,
  type MinimalAuditEvent,
  type Facts,
} from '@novavey/contracts';

const objectId = encodeIdentityRef({ source: 'github', externalId: 'owner/repo' });
// "github:owner/repo"

isValidDataPlaneId(objectId); // true

parseObjectRef('document:readme'); // { ns: 'document', id: 'readme' }
```

## Versioning

This package follows SemVer. A change to `PROTOCOL.md`'s normative
sections that breaks an existing consumer is a major version bump; adding
a new, optional contract is minor; a documentation or conformance-vector
clarification with no behavior change is patch. See `CHANGELOG.md`.

## Development

```
npm install
npm run verify   # typecheck && build && test && lint && format:check
```
