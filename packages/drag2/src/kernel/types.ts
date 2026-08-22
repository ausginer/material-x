// Primitive value types shared across the kernel. Every value is an immutable
// plain object so it can be handed to consumer callbacks and compared without
// risk of mutation.
//
// A module header rather than a doc block (D-113, extended 2026-08-22 to close
// MNT-02): it documents the module and no single declaration, and as JSDoc it
// shipped orphaned into `kernel/types.d.ts`. A block in that position is
// indistinguishable from an orphan injected there, so the detector's positional
// exemption is removed rather than tightened — the same repair D-113 made for
// `kernel/spec.ts`'s section header.

/** A coordinate pair. The space (viewport vs local) is documented per use. */
export type Point = Readonly<{
  x: number;
  y: number;
}>;

/**
 * A CSS **offset box**, in layout pixels — `offsetWidth`/`offsetHeight`, never
 * a bounding rect.
 *
 * **The distinction is load-bearing, not stylistic** (D-43). The footprint rule
 * subtracts one of these from another across `acquireLift`, and by the second
 * read the visual is already transformed: a running translate corrupts a
 * bounding rect's top by the full travel and leaves its height alone, so a
 * `DOMRect` difference is wrong in the one component the rule depends on. The
 * offset box is unaffected by the element's own transform and by ancestor zoom,
 * which is what makes the two reads comparable at all.
 *
 * There is no position, deliberately: the windows are only ever subtracted, and
 * a rule that never asks *where* the box was should not carry an answer.
 */
export type OffsetBox = Readonly<{
  width: number;
  height: number;
}>;
