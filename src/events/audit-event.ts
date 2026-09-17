/**
 * The minimum AuditEvent shape shared across the broker/audit-sink seam —
 * PROTOCOL.md §2, ported from taint-tracked-tool-broker's own PROTOCOL.md
 * §4.1 (as of that document's protocolVersion 1.1).
 *
 * This is a structural FLOOR, not TTTB's full internal `AuditEvent` type: an
 * audit-sink implementation on the other side of the seam (e.g.
 * Principal-Graph's `src/adapters/broker-audit-sink.ts`) only ever depends
 * on this shape, never on TTTB's richer fields (`matchedRecords`,
 * `argFingerprintFloor`, `enforcement`, `requestedAt`, ...) — see
 * PROTOCOL.md §2 here for why the floor, not the full type, is what's
 * shared between repos.
 */

/**
 * PROTOCOL.md §4.1's own "minimum viable shape" table names only the first
 * four as the required floor — but TTTB's real `PolicyDecision` (the actual
 * type `AuditEvent.verdict` holds, `src/types.ts`) is a 5-member union, and
 * `QUARANTINE_AND_RETRY` is a real, reachable `defaultPolicy` verdict in
 * production, not a hypothetical extension (`src/policy/default-policy.ts`'s
 * own `bestQuarantineCandidate()` path). Excluding it here would make
 * `checkAuditEventShape` reject a real, valid, unremarkable event — worse
 * than the original no-enum-enforcement gap this type closes, which at
 * least never produced a false positive on real data.
 */
export type Verdict =
  'ALLOW' | 'ALLOW_WITH_WARNING' | 'REQUIRE_APPROVAL' | 'BLOCK' | 'QUARANTINE_AND_RETRY';
export type SinkClass = 'EXEC' | 'MUTATE' | 'EXFIL' | 'NONE';
export type BrokerTaintLevel = 'CLEAN' | 'DERIVED_UNTRUSTED' | 'RAW_UNTRUSTED';

export interface MinimalAuditEvent {
  verdict: {
    action: Verdict;
    /** Required whenever `action` is not a bare `ALLOW`. */
    reason?: string;
  };
  call: {
    /** Unique per CALL, not per tool — distinct from `toolName`, which repeats across every call to the same tool. */
    id: string;
    toolName: string;
    /** The exact argument snapshot the gating decision was computed from. */
    args: unknown;
    /** Opaque label scoping this event to one broker/session instance. */
    sessionId: string;
  };
  taint: {
    scopeLevel: BrokerTaintLevel;
    privateDataSeen: boolean;
    sinkClass: SinkClass;
  };
  /** Epoch milliseconds when the event was recorded. */
  at: number;
  /** Whether the underlying action actually ran. */
  executed: boolean;
}

export interface RequiredFieldSpec {
  /** Dot-notation path into a real AuditEvent (e.g. "call.sessionId"). */
  path: string;
  /** "string" | "number" | "boolean" | "any" — "any" means "must be defined", no type check. */
  type: 'string' | 'number' | 'boolean' | 'any';
  /**
   * If present, a string value must be one of these — checked in addition to
   * `type`, never instead of it. Without this, a field whose `notes` merely
   * SAYS "one of ALLOW / ALLOW_WITH_WARNING / ..." was never actually
   * enforced — `verdict.action: "banana"` passed `checkAuditEventShape`
   * just as cleanly as a real verdict.
   */
  enum?: string[];
  /**
   * If present, this field is only required when the field at `unless.path`
   * equals `unless.equals` — e.g. `verdict.reason` is required unless
   * `verdict.action` is a bare `"ALLOW"` (PROTOCOL.md §4.1's own rule, and
   * TTTB's real `AuditEvent`'s actual behavior). Without this, the format
   * could only express "always required" or "always optional" — TTTB's own
   * conformance vectors needed `verdict.reason` conditionally required, so
   * that entry was simply left out of this package's copy entirely,
   * silently weaker than the grammar it claims to port. A value present
   * despite the condition holding is still type/enum-checked either way —
   * this only ever widens what's ALLOWED to be absent, never what's
   * accepted when present.
   */
  unless?: { path: string; equals: string };
  notes?: string;
}

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value);
}

/**
 * Walks `event` against `requiredFields` (see `conformance/vectors.json`'s
 * `auditEventShape.requiredFields`) and returns every violation found — an
 * empty array means `event` satisfies the shared floor. Mirrors the walk
 * TTTB's own `test/audit-event-shape-conformance.spec.ts` performs against
 * its real, richer `AuditEvent`.
 */
export function checkAuditEventShape(
  event: unknown,
  requiredFields: RequiredFieldSpec[],
): string[] {
  const violations: string[] = [];
  for (const field of requiredFields) {
    const value = readPath(event, field.path);
    if (value === undefined) {
      if (field.unless && readPath(event, field.unless.path) === field.unless.equals) {
        continue; // conditionally optional, and the condition holds — not a violation
      }
      violations.push(`${field.path}: missing`);
      continue;
    }
    if (field.type !== 'any' && typeof value !== field.type) {
      violations.push(`${field.path}: expected ${field.type}, got ${typeof value}`);
      continue;
    }
    if (field.enum && typeof value === 'string' && !field.enum.includes(value)) {
      violations.push(
        `${field.path}: expected one of ${field.enum.join(' / ')}, got ${JSON.stringify(value)}`,
      );
    }
  }
  return violations;
}
