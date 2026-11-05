/**
 * Transactional frame slicing.
 *
 * There is one physical `current` and one physical `draft`, composed from parts
 * with the kernel's part first: the kernel assigns its own slice, then copies
 * the behavior's part over it. There are two sources, and no fold over feature
 * parts. No participant authors a concrete whole-frame shape. The kernel's own
 * private generic is `KernelFrame & Part`, which is the intersection
 * `Object.assign` produces with no cast.
 */
import { IDLE, type Phase } from './phases.ts';

/**
 * Per-operation identity. Every kernel-side attempt compares the object
 * identity. `id` exists for diagnostics only and is never compared.
 */
export type OperationIdentity = Readonly<{ id: number }>;

/**
 * The kernel's frame slice: seven fields, all written by the kernel, none
 * writable by a behavior.
 */
export type KernelFrame = {
  /**
   * The phase this frame was composed in. This is a closed union and not a bare
   * `number`: the eight phase constants are published with it, so a behavior
   * tests a phase by name and no other value is a phase.
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

// The kernel slice's defaults, written once. A create/reset pair cannot keep
// the invariant that every field is both allocated and cleared; only a shared
// source can.
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
 * Both frame operations the kernel needs over its own slice. With no argument,
 * this allocates a slice at its defaults. With a frame, this returns that frame
 * to the defaults.
 *
 * The key order is the allocation order, so a composed frame has the kernel
 * slice first and a reset preserves the shape the frame was armed with.
 */
export function frame(existing?: KernelFrame): KernelFrame {
  return Object.assign(existing ?? {}, DEFAULT_FRAME);
}

/**
 * The composed frame. It exists only inside the kernel.
 *
 * Every field must be a scalar, immutable, or replaced on write. The kernel
 * opens a transaction with `Object.assign(draft, current)`, so afterwards the
 * two frames reference the same nested objects, and a field mutated in place is
 * mutated in both.
 */
export type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write: its own part, plus a read-only kernel slice.
 *
 * The kernel slice stays read-only through a draft: a colliding mutable key
 * declared in `Part` is removed before the read-only slice is intersected back
 * in, behind {@link FramePartOf}.
 */
export type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;

/**
 * `Part` when it declares no kernel frame key, and an uninhabitable
 * intersection that names the offending key when it does.
 *
 * The frame-part authoring contract: a behavior frame part is a plain, own,
 * enumerable, writable, string-keyed data record. Nothing detects a violation,
 * and the last term matters most to an author.
 *
 * Keys must be strings. `Object.assign` copies a symbol-keyed field between
 * frames like any other, and nothing in the kernel resets or inspects it. The
 * kernel returns its own slice to its defaults and delegates the part to your
 * `resetFramePart`. So a DOM node held on a symbol key lives for the
 * controller's whole life unless you clear it by name yourself. The type cannot
 * express this: `Extract<keyof Part, keyof KernelFrame>` is `never` for a
 * symbol key, so `{ [MY_SYMBOL]: node }` is admitted here and is ordinary
 * JavaScript. This is stated because it is yours to get right, not because the
 * library refuses it.
 *
 * This type catches explicitly declared literal collisions only: a broad index
 * signature declares no colliding key even though a runtime `phase` property is
 * entirely possible. A part that declares a kernel frame key is uninhabitable
 * here, so reaching that state takes a cast or plain JavaScript. Nothing
 * detects a violation: `Object.assign` copies a colliding key over the kernel's
 * own slice and the frame carries the author's value for it.
 */
export type FramePartOf<Part> = [
  Extract<keyof Part, keyof KernelFrame>,
] extends [never]
  ? Part
  : Part &
      Readonly<{
        __kernelFrameKeyCollision: Extract<keyof Part, keyof KernelFrame>;
      }>;
