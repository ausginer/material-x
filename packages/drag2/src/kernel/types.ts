/**
 * Primitive value types shared across the kernel. Every value is an immutable
 * plain object so it can be handed to consumer callbacks and compared without
 * risk of mutation.
 */

/** A coordinate pair. The space (viewport vs local) is documented per use. */
export type Point = Readonly<{
  x: number;
  y: number;
}>;

/** A value that may be produced synchronously or as a promise. */
export type MaybePromise<T> = T | Promise<T>;
