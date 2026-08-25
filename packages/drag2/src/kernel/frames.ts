/**
 * Transactional frame slicing (contract 04).
 *
 * There is one physical `current` and one physical `draft`, composed
 * **kernel-first from parts**: the kernel writes its own literal, then folds the
 * behavior's part. Two sources, no fold over feature parts (D-10, D-15). No
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

export function createKernelFrame(): KernelFrame {
  return {
    phase: IDLE,
    operation: null,
    pointerId: -1,
    originX: 0,
    originY: 0,
    pointerX: 0,
    pointerY: 0,
  };
}

export function resetKernelFields(frame: KernelFrame): void {
  frame.phase = IDLE;
  frame.operation = null;
  frame.pointerId = -1;
  frame.originX = 0;
  frame.originY = 0;
  frame.pointerX = 0;
  frame.pointerY = 0;
}

/** The composed frame. Exists only inside the kernel. */
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
 * `Object.assign` like any other, but `resetFramePart`, `assertFrameScrubbed`
 * and `assertFrameShapesMatch` all walk `Object.keys` — so a symbol key is
 * invisible to the checks that exist to tell you your own reset missed your
 * own field, and a DOM node held on one is retained for the controller's
 * whole life. The type cannot say this: `Extract<keyof Part, keyof KernelFrame>`
 * is `never` for a symbol key, so `{ [MY_SYMBOL]: node }` is admitted here and
 * is ordinary JavaScript. It is stated because you are outside the reach of
 * the instrument, not because you are refused.
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

/**
 * Composes one physical frame. Called **twice** per controller, from one code
 * path, so both frames traverse an identical construction sequence.
 *
 * ~~`validateFramePart` rejects the part first.~~ **Deleted 2026-08-25
 * (D-122), and with its last arm the whole function.** It ended at one shape —
 * a symbol key — and that shape corrupts nothing the library owns: the field
 * is declared by the author, reset by the author's own `resetFramePart`, and
 * invisible only to the two `Object.keys` instruments that check the author's
 * discharge of the author's obligation. The term is published on
 * {@link FramePartOf} instead, where it reaches an author while they are
 * writing the part rather than when they run it. Both frames of a controller
 * are still compared at `arm()` by `assertFrameShapesMatch`, which is what
 * covers a non-deterministic factory (F-2) for every shape either result can
 * take through `Object.keys`.
 */
export function composeFrame<Part extends object>(
  createFramePart: () => Part,
): Frame<Part> {
  // `Object.assign` is declared `(target: T, source: U) => T & U`, so
  // `KernelFrame & Part` falls out of the expression with no cast.
  return Object.assign(createKernelFrame(), createFramePart());
}

/**
 * Copies the committed frame into the draft. Shape-agnostic: it copies every
 * enumerable own key without the kernel knowing the behavior's field names.
 *
 * **Shallow.** Both frames reference the same nested objects afterwards, which
 * is why every frame field must be a scalar, immutable, or replace-on-write
 * (contract 04 §The shallow-copy contract).
 */
export function beginFrame<Part extends object>(
  draft: Frame<Part>,
  current: Frame<Part>,
): void {
  Object.assign(draft, current);
}

/**
 * Returns one frame to its defaults, mirroring {@link composeFrame}'s two
 * sources. The caller wraps each call individually: `resetFramePart` is
 * behavior code the API permits to throw, and an unwrapped throw would make
 * `destroy()` non-terminal against I-6 (D-29, F-36).
 */
export function scrubFrame<Part extends object>(
  frame: Frame<Part>,
  resetFramePart: (part: Part) => void,
): void {
  resetKernelFields(frame);
  resetFramePart(frame);
}

// ---------------------------------------------------------------------------
// Frame-authoring invariants (contract 04 §Dev-only invariants, whose
// heading D-108 makes a misnomer and which keeps it as a stable reference)
//
// **Unconditional, in every build** (D-108). 04's own discriminator is that a
// check is a production check when its failure mode is silent state corruption
// rather than a stale reference — which is why the kernel-key collision check
// in `validateFramePart` was never gated. ~~That check is the precedent.~~
// **Both it and the validator are gone** (D-124, D-122); the discriminator
// that justified them survives, and these two are what it still reaches. A
// part factory that is not deterministic and a reset that leaves a live
// reference are both silent state corruption: a retained element leaks a DOM
// node across every later operation. Behavior authoring went public at
// Revision 2.1, so gating these would strip validation from a published
// authoring API in the exact build a third-party author ships (F-78).
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const sameKeys = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((key, index) => key === b[index]);

/** The key set captured at `arm()`, against which every later scrub is checked. */
export function captureFrameKeys(frame: object): readonly string[] {
  return Object.keys(frame);
}

/**
 * F-2: intra-controller shape identity. Checked once, at `arm()`.
 *
 * The invariant that matters is intra-controller — the two frames of **one**
 * controller must have the same deterministic, stable shape. Cross-controller
 * uniformity is a consequence of the current feature model, not a promise
 * (contract 04 §Cross-controller shape variance).
 */
export function assertFrameShapesMatch(a: object, b: object): void {
  assert(
    sameKeys(Object.keys(a), Object.keys(b)),
    'drag: frame/shape-mismatch',
  );
}

function validateFrameDescriptors(
  frame: object,
  keys: readonly string[],
): void {
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(frame, key)!;

    assert(
      'value' in descriptor &&
        descriptor.enumerable === true &&
        descriptor.writable === true,
      `drag: frame/key-redefined ${key}`,
    );
  }
}

/**
 * Checked after every scrub: `resetFramePart` may not add or delete fields, may
 * not redefine one, and should clear every reference-bearing field.
 *
 * The three checks are separate on purpose. A key-set comparison proves the
 * *map* survived reset; it cannot see a *redefinition* — a field turned into an
 * accessor keeps its key and its position — so the descriptors are validated
 * again. The last check only guesses at whether the *contents* survived: it
 * catches retained elements, snapshots, proposals and domain results, but it
 * cannot catch a stale non-null scalar (F-11, I-28).
 *
 * **Partial by design, and this is the second known blind spot** (F-96). It
 * walks `Object.keys`, so a **symbol-keyed** field is not examined at all —
 * neither its presence, its descriptor nor its contents. That is deliberate
 * and is not widened to `Reflect.ownKeys`: the frame-part contract published
 * on {@link FramePartOf} says keys are strings, so walking symbols would be
 * this instrument policing input the contract already excludes, at a cost paid
 * twice per drag on every conforming author. What it means for an author is
 * stated where they meet it — a symbol key is outside the reach of this
 * check.
 */
export function assertFrameScrubbed(
  frame: object,
  armedKeys: readonly string[],
): void {
  const keys: readonly string[] = Object.keys(frame);

  assert(sameKeys(keys, armedKeys), 'drag: frame/scrub-shape-changed');

  validateFrameDescriptors(frame, keys);

  for (const key of keys) {
    const value = (frame as Record<string, unknown>)[key];

    assert(
      typeof value !== 'object' || value === null,
      `drag: frame/scrub-retained ${key}`,
    );
  }
}
