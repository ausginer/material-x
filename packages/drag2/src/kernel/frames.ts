/**
 * Transactional frame slicing (contract 04).
 *
 * There is one physical `current` and one physical `draft`, composed
 * **kernel-first from parts**: the kernel assigns its own slice, then folds the
 * behavior's part over it. Two sources, no fold over feature parts (D-10, D-15). No
 * participant authors a concrete whole-frame shape — the kernel's own private
 * generic *is* `KernelFrame & Part`, which is the intersection `Object.assign`
 * produces with no cast.
 */
import { IDLE, type Phase } from './phases.ts';

/**
 * Per-operation identity. Object identity is what every kernel-side attempt
 * compares (D-11); `id` exists for diagnostics only and is never compared.
 */
export type OperationIdentity = Readonly<{ id: number }>;

/**
 * The kernel's frame slice: seven fields, all kernel-written, none
 * behavior-writable. Probe 1's slice was thirteen (contract 04 §The kernel
 * slice).
 */
export type KernelFrame = {
  /**
   * **A closed union, not a bare `number`** (D-68). The behavior *reads* this —
   * the reference behavior tests it in three seams the kernel calls at times
   * the behavior cannot predict — so it is a value the kernel hands over, and
   * the same rule that made `FailureStage` closed applies: a participant must
   * not be able to forge an invalid or kernel-private phase, and a numeric
   * union whose members are unnameable is not a public type. The eight
   * constants publish with it.
   */
  phase: Phase;
  operation: OperationIdentity | null;
  pointerId: number;
  /** Grab point and latest committed pointer position, viewport space. */
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;
};

export const KERNEL_FRAME_KEYS: readonly string[] = [
  'phase',
  'operation',
  'pointerId',
  'originX',
  'originY',
  'pointerX',
  'pointerY',
];

/**
 * The kernel slice's defaults, written **once**.
 *
 * ~~`createKernelFrame` and `resetKernelFields`.~~ **One literal since
 * 2026-08-25 (D-128).** They were a create/reset mirror pair, and the mirror
 * was the invariant: a field added to the type and to one of them but not the
 * other is a reference the scrub never clears. Two functions cannot hold that
 * invariant — only a shared source can, which is what this is.
 */
const DEFAULT_FRAME: KernelFrame = {
  phase: IDLE,
  operation: null,
  pointerId: -1,
  originX: 0,
  originY: 0,
  pointerX: 0,
  pointerY: 0,
};

/**
 * Both frame operations the kernel needs over its own slice: called with no
 * argument it **allocates** one at its defaults, called with a frame it
 * **returns that frame to them**.
 *
 * The key order is the allocation order, so a composed frame reads
 * kernel-slice-first (contract 04 §Composition) and a reset preserves the
 * shape it was armed with.
 */
export function frame(existing?: KernelFrame): KernelFrame {
  return Object.assign(existing ?? {}, DEFAULT_FRAME);
}

/**
 * The composed frame. Exists only inside the kernel.
 *
 * **Every field must be a scalar, immutable, or replace-on-write** (contract 04
 * §The shallow-copy contract). The kernel opens a transaction with
 * `Object.assign(draft, current)`, so the two frames reference the same nested
 * objects afterwards and a field mutated in place is mutated in both.
 */
export type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write: its own part, plus a read-only kernel slice.
 *
 * The `Omit` is not cosmetic. A plain intersection lets a colliding mutable
 * `phase` declared in `Part` stay writable through the draft; projecting the
 * collision away before intersecting the readonly kernel slice back in is
 * defence in depth behind {@link FramePartOf} (contract 04 §Write protection,
 * Q-2).
 */
export type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;

/**
 * `Part` when it declares no kernel frame key, and an uninhabitable
 * intersection naming the offending key when it does.
 *
 * **The frame-part authoring contract, published here** (D-122, F-100). A
 * behavior frame part is a **plain, own, enumerable, writable, string-keyed
 * data record**. Nothing detects a violation, and the term worth the most to
 * an author is the last one:
 *
 * **Keys must be strings.** A symbol-keyed field is copied between frames by
 * `Object.assign` like any other, and nothing in the kernel resets or inspects
 * it — the kernel returns its **own** slice to its defaults and delegates the
 * part to your `resetFramePart`, so a DOM node held on a symbol key lives for
 * the controller's whole life unless you clear it by name yourself. The type
 * cannot say this: `Extract<keyof Part, keyof KernelFrame>` is `never` for a
 * symbol key, so `{ [MY_SYMBOL]: node }` is admitted here and is ordinary
 * JavaScript. It is stated because it is yours to get right, not because you
 * are refused.
 *
 * This type catches **explicitly declared literal collisions only**: a broad
 * index signature declares no colliding key even though a runtime `phase`
 * property is entirely possible. ~~`validateFramePart` is the authoritative
 * check; this layer makes the common mistake unwriteable, not every mistake
 * (review 6 §19).~~ **Reversed 2026-08-25 (D-124): this type _is_ the
 * contract**, and the runtime collision check that used to restate it is gone.
 * A part declaring a kernel frame key is uninhabitable here, so reaching that
 * state takes a cast or plain JavaScript — which leaves the contract rather
 * than finding a hole in it. Nothing detects a violation now: a colliding key
 * is copied over the kernel's own slice by `Object.assign` and the frame
 * carries the author's value for it.
 *
 * **The collision brand is inlined** (D-68). It was a private
 * `FrameKeyCollision<K>` alias, which put an unpublishable name in this
 * published type's closure for no gain: it has one use site, and the brand is
 * as readable written out.
 */
export type FramePartOf<Part> = [
  Extract<keyof Part, keyof KernelFrame>,
] extends [never]
  ? Part
  : Part &
      Readonly<{
        __kernelFrameKeyCollision: Extract<keyof Part, keyof KernelFrame>;
      }>;
