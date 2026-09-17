import { describe, expect, it } from 'vitest';
import { resolveFacts } from '../src/adc/facts.js';

describe('resolveFacts', () => {
  it('passes an explicit now through unchanged', () => {
    expect(resolveFacts({ sink: 'net:outbound', now: 1893456000 })).toEqual({
      sink: 'net:outbound',
      now: 1893456000,
    });
  });

  it('defaults now to the real wall clock when omitted', () => {
    const before = Math.floor(Date.now() / 1000);
    const resolved = resolveFacts({ resourceKind: 'tool' });
    const after = Math.floor(Date.now() / 1000);
    expect(resolved.resourceKind).toBe('tool');
    expect(resolved.now).toBeGreaterThanOrEqual(before);
    expect(resolved.now).toBeLessThanOrEqual(after);
  });

  it('resolves an empty Facts object to just a now', () => {
    const resolved = resolveFacts({});
    expect(Object.keys(resolved).sort()).toEqual(['now']);
  });
});
