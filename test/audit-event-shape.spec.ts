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
});
