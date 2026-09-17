import { describe, expect, it } from 'vitest';
import {
  decodeIdentityRef,
  encodeIdentityRef,
  invalidDataPlaneIdReason,
  isValidDataPlaneId,
} from '../src/identity/codec.js';
import { parseObjectRef, parseSubjectRef } from '../src/identity/tuple-ref.js';
import { resolveFacts, type Facts } from '../src/adc/facts.js';
import vectors from '../conformance/vectors.json' with { type: 'json' };

function resolveValue(entry: { value?: string; generateLength?: number }): string {
  return entry.value ?? 'a'.repeat(entry.generateLength!);
}

describe('conformance/vectors.json — identityCodec', () => {
  it.each(vectors.identityCodec.roundTrip)(
    'encodes/decodes $source / $externalId',
    ({ source, externalId, encoded }) => {
      expect(encodeIdentityRef({ source, externalId })).toBe(encoded);
      expect(decodeIdentityRef(encoded)).toEqual({ source, externalId });
    },
  );

  it.each(vectors.identityCodec.invalid)('rejects invalid vector $reason', (entry) => {
    const value = resolveValue(entry);
    expect(invalidDataPlaneIdReason(value)).toBe(entry.reason);
    expect(isValidDataPlaneId(value)).toBe(false);
  });

  it.each(vectors.identityCodec.valid)('accepts valid vector', (entry) => {
    const value = resolveValue(entry);
    expect(isValidDataPlaneId(value)).toBe(true);
  });
});

describe('conformance/vectors.json — tupleRef', () => {
  it.each(vectors.tupleRef.object.valid)('parses object ref $raw', ({ raw, parsed }) => {
    expect(parseObjectRef(raw)).toEqual(parsed);
  });

  it.each(vectors.tupleRef.object.invalid)('rejects invalid object ref %j', (raw) => {
    expect(parseObjectRef(raw)).toBeUndefined();
  });

  it.each(vectors.tupleRef.subject.valid)('parses subject ref $raw', ({ raw, parsed }) => {
    expect(parseSubjectRef(raw)).toEqual(parsed);
  });

  it.each(vectors.tupleRef.subject.invalid)('rejects invalid subject ref %j', (raw) => {
    expect(parseSubjectRef(raw)).toBeUndefined();
  });
});

describe('conformance/vectors.json — adcFacts', () => {
  it.each(vectors.adcFacts.cases)('resolves facts case', ({ input, expected, nowOmitted }) => {
    const resolved = resolveFacts(input as Facts);
    if (nowOmitted) {
      const { now: _now, ...rest } = resolved;
      expect(rest).toEqual(expected);
      expect(typeof resolved.now).toBe('number');
    } else {
      expect(resolved).toEqual(expected);
    }
  });
});
