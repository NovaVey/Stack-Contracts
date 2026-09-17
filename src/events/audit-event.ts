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

export type Verdict = 'ALLOW' | 'ALLOW_WITH_WARNING' | 'REQUIRE_APPROVAL' | 'BLOCK';
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
      violations.push(`${field.path}: missing`);
      continue;
    }
    if (field.type !== 'any' && typeof value !== field.type) {
      violations.push(`${field.path}: expected ${field.type}, got ${typeof value}`);
    }
  }
  return violations;
}
