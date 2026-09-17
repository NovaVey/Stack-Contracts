# PROTOCOL.md

**PROTOCOL.md v1 — as of `0.1.0` of this package.**

## 0. Status and scope

This document specifies the protocol shared **between** the NovaVey
agent-security repos — Taint-Tracked-Tool-Broker (TTTB),
Relationship-Based-Authorization (RBA), Principal-Graph (PG),
Attenuated-Delegation-Chain (ADC), and Control-Coverage-Range (CCR) — as
opposed to any one repository's internal design, which is out of scope
here and stays owned by that repository's own docs (TTTB's own
`PROTOCOL.md`/`DESIGN.md`, ADC's `docs/PLAN.md`, and so on).

Before this package existed, each seam below lived as independently
maintained, byte-for-byte-matching logic or literal regexes duplicated
across repos — correct only as long as nobody edited one copy without
remembering the others. `@novavey/contracts` makes each seam ONE
implementation, imported everywhere it's used, with round-trip conformance
vectors (`conformance/vectors.json`) proving the implementation and the
spec agree — the same "the JSON IS the spec's own claim" discipline TTTB's
own `PROTOCOL.md` §6.1 established for its taint-decision corpus.

Where this document and `src/`'s actual behavior diverge, that is a bug in
one of the two — either this document needs correcting, or the
implementation does — never two independently valid variants. This
package's own `test/conformance-vectors.spec.ts` is the mechanical proof
that they agree.

---

## 1. The identity codec

**Owns:** `src/identity/codec.ts`, `src/identity/tuple-ref.ts`.

Two related grammars, both previously duplicated across repos:

1. **The `${source}:${externalId}` convention** — encoding a foreign-system
   identity (which adapter/source saw it, that source's own id for it) as
   a single opaque string. `encodeIdentityRef`/`decodeIdentityRef` split on
   the FIRST colon, never any other — an `externalId` (e.g. a GitHub
   `"owner/repo"`) is never guaranteed colon-free, but a `source` name (a
   short, fixed string an adapter defines) always is; `encodeIdentityRef`
   throws if `source` itself contains a colon, rather than risk a silently
   corrupted round trip. Any `%`/`#`/`@`/control character in either field
   is percent-encoded before the two are joined, so the composite id always
   satisfies grammar (2) below regardless of what the foreign `externalId`
   itself contains — an email address's `@`, say (see the now-closed
   `workspace-grant-unescaped-identity` gap this closed: Principal-Graph's
   Workspace adapter feeding an unescaped `@`-bearing id into RBA's real
   write validation, which correctly rejected it, silently dead-lettering
   every Workspace grant).

   Previously independently implemented in Principal-Graph's
   `src/exporters/rba.ts` (`identityRef`/`splitIdentityRef`) and
   Control-Coverage-Range's `src/scenario/identifiers.ts` (`scoped`/
   `rbaSubject`/`rbaObject`); both now import `encodeIdentityRef`/
   `decodeIdentityRef` from here instead.

2. **The data-plane id validation grammar** — what makes a value valid as
   an `objectId`/`subjectId` on an RBA tuple. Deliberately loose: it's an
   opaque foreign key from another system, not a developer-authored schema
   symbol, so RBA's own strict schema-symbol grammar
   (`IDENTIFIER_PATTERN`, internal to RBA's DSL compiler and out of scope
   here) is the wrong constraint. Only what would actually break the tuple
   wire format is rejected: empty, over `MAX_DATA_PLANE_ID_LENGTH` (512), a
   control character, or either wire delimiter (`#`/`@`). A colon is
   explicitly allowed, since wire-parsing always splits on the FIRST colon.

   **Authoritative source: relationship-based-authorization's
   `src/store/tuples.ts`** (`invalidDataPlaneIdReason`/
   `isValidDataPlaneId`/`MAX_DATA_PLANE_ID_LENGTH`), ported here verbatim.
   Before RBA's own D-187/D-190 split this grammar from the schema-symbol
   grammar, a real `${source}:${externalId}` id was rejected outright by
   RBA's write endpoint — see the now-closed
   `rba-exporter-identifier-grammar-mismatch` gap
   (Control-Coverage-Range's `taxonomy/gaps/principal-graph.yaml`) for that
   history. Principal-Graph and Control-Coverage-Range each independently
   hardcoded their own copy of this same grammar before adopting this
   package; both now import it from here instead.

3. **The RBA tuple wire format** — `namespace:id` (object) and
   `namespace:id` / `namespace:id#relation` (subject), ported from
   `src/cli/commands/tuple.ts`'s `parseObjectRef`/`parseSubjectRef`.
   Namespace/relation *names* are not validated here (that's RBA's own
   schema-symbol grammar, not a cross-repo seam) — only the wire-format
   split and the id half's data-plane validation are shared.

**Conformance:** `conformance/vectors.json`'s `identityCodec` and
`tupleRef` sections.

---

## 2. The shared `AuditEvent` floor

**Owns:** `src/events/audit-event.ts`.

The minimum shape an event crossing the broker/audit-sink seam MUST
satisfy — every field an audit-sink implementation (e.g. Principal-Graph's
`src/adapters/broker-audit-sink.ts`) is entitled to depend on when
consuming events from a `taint-tracked-tool-broker` instance.

This is a structural **floor**, ported from
taint-tracked-tool-broker's own `PROTOCOL.md` §4.1 (as of that document's
`protocolVersion` 1.1) — never the full, richer TTTB `AuditEvent` type
(which additionally carries `matchedRecords`, `argFingerprintFloor`,
`enforcement`, `requestedAt`, and more). Consuming this package's
`MinimalAuditEvent` type, rather than importing TTTB's own `AuditEvent`
directly, is deliberate: an audit-sink implementation should only ever
depend on the fields it actually needs, so TTTB is free to grow its own
richer internal shape without that being a breaking change for every
consumer on the other side of the seam.

`checkAuditEventShape(event, requiredFields)` walks any candidate event
against the field list and returns every violation found — the same
mechanism TTTB's own `test/audit-event-shape-conformance.spec.ts` uses
against its real, live `AuditEvent` output. Each `RequiredFieldSpec` entry
can also carry `enum` (the value must be one of a fixed set — not just
type-checked) and `unless` (the field is only required when another named
field doesn't equal a given value, e.g. `verdict.reason` is required
unless `verdict.action` is a bare `"ALLOW"`) — both close a real gap: a
field whose `notes` merely described its allowed values in prose was never
actually enforced, and a conditionally-required field (TTTB's own
`verdict.reason`) had no way to be expressed at all before this, so this
package's copy of that entry was simply missing it.

If TTTB's `PROTOCOL.md` §4.1 changes its normative field list, this
document's §2 and `conformance/vectors.json`'s `auditEventShape` section
must be updated in the same change — this package's copy is a deliberate
port, not a live reference, precisely so a consumer doesn't have to accept
a direct dependency on TTTB's own package to use this floor.

**Conformance:** `conformance/vectors.json`'s `auditEventShape` section.

---

## 3. The ADC `Facts` shape

**Owns:** `src/adc/facts.ts`.

The shape a caller (typically a broker adapter, e.g.
attenuated-delegation-chain's `packages/adc-broker`) must supply at ADC
token-verification time — ported from `@adc/core`'s
`packages/adc-core/src/caveats.ts` (`Facts`/`ResolvedFacts`/
`resolveFacts`).

Every field is optional: a caveat kind whose required fact is missing
denies (fails closed) rather than silently passing — this package restates
that contract as documentation, it does not itself implement caveat
evaluation (that stays owned by `@adc/core`, which this package takes no
dependency on).

`now` is the one field with a default: `resolveFacts` fills it with the
real wall clock (Unix seconds) when omitted.

**A note on vocabulary collision:** ADC's own `TaintLevel`
(`TRUSTED`/`DERIVED`/`RAW_UNTRUSTED`) is a *different, narrower* enum from
§2's broker `BrokerTaintLevel` (`CLEAN`/`DERIVED_UNTRUSTED`/
`RAW_UNTRUSTED`) — a caller must translate explicitly between them (see
attenuated-delegation-chain's `packages/adc-broker/src/taint.ts`'s
`adcTaintLevel()` for the reference translation). This package exports
both under distinct names (`BrokerTaintLevel`, `AdcTaintLevel`) specifically
so they can never be silently substituted for one another.

**Conformance:** `conformance/vectors.json`'s `adcFacts` section.

---

## 4. Conformance vectors

`conformance/vectors.json` carries round-trip fixtures for every section
above as plain JSON — a sibling repo can read it directly (no dependency
on this package's own test harness) to check its own behavior against the
same vectors this package's `test/conformance-vectors.spec.ts` checks
itself against. See `conformance/README.md` for the file's structure.

A change to any normative section above (§1–§3) should be accompanied by a
matching update to the relevant `conformance/vectors.json` section and
`CHANGELOG.md`, in the same commit — the vectors are the spec's own claim
made mechanically checkable, not a second copy of it that can drift.
