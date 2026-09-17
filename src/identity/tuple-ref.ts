/**
 * The RBA tuple wire-format grammar — PROTOCOL.md §1 — `namespace:id` and
 * `namespace:id#relation`, ported from relationship-based-authorization's
 * `src/cli/commands/tuple.ts` (`parseObjectRef`/`parseSubjectRef`).
 *
 * Namespace/relation NAMES are not validated against RBA's own schema-symbol
 * grammar here (that grammar — `IDENTIFIER_PATTERN` — is internal to RBA's
 * DSL compiler, not a cross-repo seam concern). Only the wire-format split
 * itself, and the id half's data-plane validation (`../identity/codec.js`),
 * are shared.
 */

export interface ObjectRef {
  ns: string;
  id: string;
}

export interface SubjectRef extends ObjectRef {
  /** Present only for a tuple-to-userset subject ("group:eng#member"). */
  relation?: string;
}

/** Parses `namespace:id` — used for the object side, which is never a userset reference. */
export function parseObjectRef(raw: string): ObjectRef | undefined {
  const colon = raw.indexOf(':');
  if (colon <= 0 || colon === raw.length - 1) return undefined;
  return { ns: raw.slice(0, colon), id: raw.slice(colon + 1) };
}

/** Parses `namespace:id` or `namespace:id#relation` — used for the subject side. */
export function parseSubjectRef(raw: string): SubjectRef | undefined {
  const hash = raw.indexOf('#');
  const objectPart = hash === -1 ? raw : raw.slice(0, hash);
  const object = parseObjectRef(objectPart);
  if (!object) return undefined;
  if (hash === -1) return object;
  const relation = raw.slice(hash + 1);
  if (relation.length === 0) return undefined;
  return { ...object, relation };
}

/** Formats an `ObjectRef` back to `namespace:id`. */
export function formatObjectRef(ref: ObjectRef): string {
  return `${ref.ns}:${ref.id}`;
}

/** Formats a `SubjectRef` back to `namespace:id` or `namespace:id#relation`. */
export function formatSubjectRef(ref: SubjectRef): string {
  return ref.relation !== undefined ? `${ref.ns}:${ref.id}#${ref.relation}` : `${ref.ns}:${ref.id}`;
}
