// Primitive value types shared across the kernel. Every value is an immutable
// plain object so it can be passed to consumer callbacks and compared without
// risk of mutation.
//
// A module header and not a doc block: it documents the module and no single
// declaration. As JSDoc it would ship orphaned into `kernel/types.d.ts`, where
// the orphan detector cannot tell it from an injected one.

/** A coordinate pair. The space (viewport vs local) is documented per use. */
export type Point = Readonly<{
  x: number;
  y: number;
}>;

/**
 * A CSS offset box, in layout pixels: `offsetWidth`/`offsetHeight`, never a
 * bounding rect.
 *
 * The difference matters. These boxes are only ever subtracted from one
 * another, and by the second read the element may already be transformed. A
 * running translate corrupts a bounding rect's top by the full travel and
 * leaves its height alone. An offset box is unaffected by the element's own
 * transform and by ancestor zoom, so the two reads are comparable.
 *
 * There is no position, because a rule that never asks where the box was should
 * not carry that value.
 */
export type OffsetBox = Readonly<{
  width: number;
  height: number;
}>;
