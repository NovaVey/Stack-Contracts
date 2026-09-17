import { describe, expect, it } from 'vitest';
import {
  formatObjectRef,
  formatSubjectRef,
  parseObjectRef,
  parseSubjectRef,
} from '../src/identity/tuple-ref.js';

describe('parseObjectRef / formatObjectRef', () => {
  it('parses namespace:id', () => {
    expect(parseObjectRef('document:readme')).toEqual({ ns: 'document', id: 'readme' });
  });

  it('splits on the FIRST colon, so an id containing a colon survives', () => {
    expect(parseObjectRef('principal:github:alice')).toEqual({
      ns: 'principal',
      id: 'github:alice',
    });
  });

  it('round-trips through formatObjectRef', () => {
    const ref = parseObjectRef('repo:owner/name');
    expect(ref).toBeDefined();
    expect(formatObjectRef(ref!)).toBe('repo:owner/name');
  });

  it.each(['', 'noNamespace', 'ns:', ':noNamespace'])('rejects %j', (raw) => {
    expect(parseObjectRef(raw)).toBeUndefined();
  });
});

describe('parseSubjectRef / formatSubjectRef', () => {
  it('parses a plain namespace:id subject', () => {
    expect(parseSubjectRef('user:alice')).toEqual({ ns: 'user', id: 'alice' });
  });

  it('parses a tuple-to-userset namespace:id#relation subject', () => {
    expect(parseSubjectRef('group:eng#member')).toEqual({
      ns: 'group',
      id: 'eng',
      relation: 'member',
    });
  });

  it('round-trips both shapes through formatSubjectRef', () => {
    expect(formatSubjectRef({ ns: 'user', id: 'alice' })).toBe('user:alice');
    expect(formatSubjectRef({ ns: 'group', id: 'eng', relation: 'member' })).toBe(
      'group:eng#member',
    );
  });

  it('rejects an empty relation after #', () => {
    expect(parseSubjectRef('group:eng#')).toBeUndefined();
  });

  it('rejects a malformed object half', () => {
    expect(parseSubjectRef('')).toBeUndefined();
  });
});
