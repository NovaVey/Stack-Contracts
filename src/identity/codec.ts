/**
 * The data-plane identity codec — PROTOCOL.md §1.
 *
 * Authoritative source: relationship-based-authorization's
 * `src/store/tuples.ts` (`invalidDataPlaneIdReason`/`isValidDataPlaneId`/
 * `MAX_DATA_PLANE_ID_LENGTH`), ported here verbatim. That validation grammar
 * — and the `${source}:${externalId}` encoding it validates — was previously
 * duplicated as independent literal checks in Principal-Graph's exporter
 * (`src/exporters/rba.ts`'s `identityRef`/`splitIdentityRef`) and
 * Control-Coverage-Range's scenario identifiers (`src/scenario/identifiers.ts`).
 * See PROTOCOL.md §1 for the full history, including the
 * rba-exporter-identifier-grammar-mismatch gap this grammar split closed.
 */

/**
 * A generous bound for an opaque, foreign-system id — comfortably covers a
 * long AWS ARN or a compound "source:externalId" id (e.g. "github:owner/repo")
 * without being unbounded.
 */
export const MAX_DATA_PLANE_ID_LENGTH = 512;

function containsControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Reason a value is invalid as a data-plane id, or `null` if it's fine.
 * Deliberately loose: a data-plane id is an opaque foreign key from another
 * system, not a developer-authored schema symbol — only what would actually
 * break the tuple wire format (`objectNs:objectId#relation@subjectNs:subjectId`)
 * is rejected: a control character, or either wire delimiter (`#`/`@`). A
 * colon is explicitly allowed, since wire-parsing always splits on the FIRST
 * colon (see `../identity/tuple-ref.js`'s `parseObjectRef`).
 */
export function invalidDataPlaneIdReason(value: string): string | null {
  if (value.length === 0) return 'must not be empty';
  if (value.length > MAX_DATA_PLANE_ID_LENGTH) {
    return `exceeds the maximum data-plane id length (${MAX_DATA_PLANE_ID_LENGTH})`;
  }
  if (containsControlCharacter(value)) return 'must not contain control characters';
  if (value.includes('#') || value.includes('@')) {
    return "must not contain '#' or '@' (reserved tuple wire delimiters)";
  }
  return null;
}

/** Public predicate wrapping `invalidDataPlaneIdReason` for callers that just need a boolean. */
export function isValidDataPlaneId(value: string): boolean {
  return invalidDataPlaneIdReason(value) === null;
}

/** A foreign-system identity: which adapter/source saw it, and that source's own id for it. */
export interface IdentityRef {
  source: string;
  externalId: string;
}

/**
 * Encodes a foreign-system identity as a single opaque data-plane id — the
 * `${source}:${externalId}` convention (e.g. `"github:owner/repo"`).
 */
export function encodeIdentityRef(ref: IdentityRef): string {
  return `${ref.source}:${ref.externalId}`;
}

/**
 * Splits an encoded identity ref back into `(source, externalId)`, on the
 * FIRST colon — an `externalId` (e.g. a GitHub "owner/repo") is never
 * guaranteed colon-free, but a `source` name (a short, fixed string an
 * adapter defines) always is.
 */
export function decodeIdentityRef(ref: string): IdentityRef {
  const i = ref.indexOf(':');
  return i === -1
    ? { source: ref, externalId: '' }
    : { source: ref.slice(0, i), externalId: ref.slice(i + 1) };
}
