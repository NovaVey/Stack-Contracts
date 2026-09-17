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
 *
 * `encodeIdentityRef`/`decodeIdentityRef` are this package's own addition on
 * top of that ported grammar, not themselves part of the RBA port: an
 * `externalId` is opaque foreign data (an email address, an AWS ARN) that can
 * legitimately contain a character `invalidDataPlaneIdReason` rejects — the
 * confirmed bug this closes was Principal-Graph's Workspace adapter feeding
 * `workspace:alice@acme.example` (an unescaped `@`) into RBA's real
 * tuple-write validation, which correctly rejected it, silently dropping
 * every Workspace grant into the dead-letter table. Both functions now
 * percent-encode/decode the reserved characters within `source`/`externalId`
 * so the composite id they produce always satisfies that unchanged grammar,
 * whatever the foreign externalId itself contains.
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
 * Characters that must never appear literally in an encoded data-plane id:
 * '#'/'@' are the tuple wire format's own reserved delimiters
 * (`invalidDataPlaneIdReason` rejects them outright), control characters are
 * rejected for the same reason, and '%' is reserved here as this codec's own
 * escape character. A colon is deliberately NOT in this set — it stays
 * literal in an escaped `externalId`, since `decodeIdentityRef` only ever
 * splits on the FIRST colon (see its own doc comment).
 */
const RESERVED_CHARACTER = /[%#@\x00-\x1f\x7f-\x9f]/g;

function percentEncodeReserved(value: string): string {
  return value.replace(
    RESERVED_CHARACTER,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
  );
}

function percentDecodeReserved(value: string): string {
  return value.replace(/%([0-9A-Fa-f]{2})/g, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/**
 * Encodes a foreign-system identity as a single opaque data-plane id — the
 * `${source}:${externalId}` convention (e.g. `"github:owner/repo"`). Any
 * reserved character (see `RESERVED_CHARACTER`) in either field is
 * percent-encoded first, so the result always satisfies
 * `invalidDataPlaneIdReason` regardless of what the foreign `externalId`
 * itself contains — an email address's `@`, say.
 *
 * `source` must not contain a colon: source names are short, adapter-defined
 * constants (`"github"`, `"workspace"`), never foreign data, and
 * `decodeIdentityRef` splits on the FIRST colon — a colon in `source` would
 * silently corrupt the round trip for every `externalId`, so this throws
 * rather than risk that happening unnoticed.
 */
export function encodeIdentityRef(ref: IdentityRef): string {
  if (ref.source.includes(':')) {
    throw new Error(
      `IdentityRef.source must not contain ':' (source names are fixed, adapter-defined ` +
        `strings, never foreign data — see encodeIdentityRef's own doc comment): got ${JSON.stringify(ref.source)}`,
    );
  }
  return `${percentEncodeReserved(ref.source)}:${percentEncodeReserved(ref.externalId)}`;
}

/**
 * Splits an encoded identity ref back into `(source, externalId)`, on the
 * FIRST colon — an `externalId` (e.g. a GitHub "owner/repo") is never
 * guaranteed colon-free, but a `source` name (a short, fixed string an
 * adapter defines) always is. Each half is then percent-decoded, undoing
 * `encodeIdentityRef`'s own escaping.
 */
export function decodeIdentityRef(ref: string): IdentityRef {
  const i = ref.indexOf(':');
  const rawSource = i === -1 ? ref : ref.slice(0, i);
  const rawExternalId = i === -1 ? '' : ref.slice(i + 1);
  return {
    source: percentDecodeReserved(rawSource),
    externalId: percentDecodeReserved(rawExternalId),
  };
}
