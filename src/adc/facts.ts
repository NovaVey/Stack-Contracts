/**
 * The ADC verification-time Facts shape — PROTOCOL.md §3, ported from
 * attenuated-delegation-chain's `packages/adc-core/src/caveats.ts`
 * (`Facts`/`ResolvedFacts`/`resolveFacts`).
 *
 * Every field is optional: a caveat kind whose required fact is missing
 * denies (fails closed) rather than silently passing — this is
 * `@adc/core`'s own `evaluateCaveat` contract, restated here as the shape a
 * fact-supplying integrator (e.g. a broker adapter) must produce. `now` is
 * the one field with a default (the real wall clock), applied by
 * `resolveFacts`.
 *
 * Note this is a DIFFERENT taint vocabulary from `../events/audit-event.js`'s
 * `BrokerTaintLevel` (`CLEAN`/`DERIVED_UNTRUSTED`/`RAW_UNTRUSTED`) — ADC's own
 * `TaintLevel` (`TRUSTED`/`DERIVED`/`RAW_UNTRUSTED`) is a separate, narrower
 * enum a caller must translate into (see attenuated-delegation-chain's
 * `packages/adc-broker/src/taint.ts`'s `adcTaintLevel()` for the reference
 * translation) — never assume the two are interchangeable.
 */

export type AdcTaintLevel = 'TRUSTED' | 'DERIVED' | 'RAW_UNTRUSTED';

export interface Facts {
  readonly resourceKind?: string;
  readonly resourceId?: string;
  readonly relation?: string;
  readonly sink?: string;
  readonly host?: string;
  readonly taintLevel?: AdcTaintLevel;
  /** Unix seconds. Defaults to the real wall clock if omitted — pass this explicitly for deterministic tests. */
  readonly now?: number;
  readonly audience?: string;
}

export interface ResolvedFacts extends Facts {
  readonly now: number;
}

export function resolveFacts(facts: Facts): ResolvedFacts {
  return { ...facts, now: facts.now ?? Math.floor(Date.now() / 1000) };
}
