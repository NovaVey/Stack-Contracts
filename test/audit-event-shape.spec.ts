import { describe, expect, it } from 'vitest';
import { checkAuditEventShape, type RequiredFieldSpec } from '../src/events/audit-event.js';
import vectors from '../conformance/vectors.json' with { type: 'json' };

// conformance/vectors.json's `type` field is plain JSON (typed `string` on
// import); RequiredFieldSpec narrows it to a closed union — the JSON is
// this package's own fixture, so the cast just restates what the fixture
// is already guaranteed (by test/conformance-vectors.spec.ts) to satisfy.
const requiredFields = vectors.auditEventShape.requiredFields as RequiredFieldSpec[];
const { validExample, invalidExamples } = vectors.auditEventShape;

describe('checkAuditEventShape', () => {
  it('finds no violations against a conforming event', () => {
    expect(checkAuditEventShape(validExample, requiredFields)).toEqual([]);
  });

  it.each(invalidExamples)('$description', ({ event, expectedViolations }) => {
    expect(checkAuditEventShape(event, requiredFields)).toEqual(expectedViolations);
  });

  it('reports every missing field on a bare empty object', () => {
    const violations = checkAuditEventShape({}, requiredFields);
    expect(violations).toHaveLength(requiredFields.length);
  });

  // A real, reachable defaultPolicy verdict in TTTB (src/policy/default-policy.ts's
  // bestQuarantineCandidate() path) — not part of PROTOCOL.md section 4.1's own
  // "minimum required" floor table, but a real value verdict.action can legitimately
  // hold on a conformant event. This locks in that the enum above accepts it, since
  // an enum that rejected real production data would be worse than having none.
  it('accepts a real QUARANTINE_AND_RETRY verdict, not just the four floor-table values', () => {
    const event = {
      ...validExample,
      verdict: { action: 'QUARANTINE_AND_RETRY', reason: 'retry via summarize()' },
    };
    expect(checkAuditEventShape(event, requiredFields)).toEqual([]);
  });
});
