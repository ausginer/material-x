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
 * compares; `id` exists for diagnostics only and is never compared.
 */
export type OperationIdentity = Readonly<{ id: number }>;

/**
 * The kernel's frame slice: seven fields, all kernel-written, none
 * behavior-writable.
 */
export type KernelFrame = {
  /**
   * The phase this frame was composed in. **A closed union, not a bare
   * `number`**: the eight phase constants publish with it, so a behavior tests
   * a phase by name and no other value is one.
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

// The kernel slice's defaults, written once. A create/reset pair cannot hold
// the invariant that every field is both allocated and cleared; only a shared
// source can (D-128).
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
 * **Every field must be a scalar, immutable, or replace-on-write.** The kernel
 * opens a transaction with
 * `Object.assign(draft, current)`, so the two frames reference the same nested
 * objects afterwards and a field mutated in place is mutated in both.
 */
export type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write: its own part, plus a read-only kernel slice.
 *
 * The kernel slice stays read-only through a draft: a colliding mutable key
 * declared in `Part` is projected away before the readonly slice is
 * intersected back in, behind {@link FramePartOf}.
 */
export type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;

/**
 * `Part` when it declares no kernel frame key, and an uninhabitable
 * intersection naming the offending key when it does.
 *
 * **The frame-part authoring contract.** A behavior frame part is a **plain,
 * own, enumerable, writable, string-keyed data record**. Nothing detects a violation, and the term worth the most to
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
 * property is entirely possible. A part declaring a kernel frame key is
 * uninhabitable here, so reaching that state takes a cast or plain JavaScript.
 * Nothing detects a violation: a colliding key is copied over the kernel's own
 * slice by `Object.assign` and the frame carries the author's value for it.
 */
export type FramePartOf<Part> = [
  Extract<keyof Part, keyof KernelFrame>,
] extends [never]
  ? Part
  : Part &
      Readonly<{
        __kernelFrameKeyCollision: Extract<keyof Part, keyof KernelFrame>;
      }>;
