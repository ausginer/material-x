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

const KERNEL_FRAME_KEY_SET = new Set(KERNEL_FRAME_KEYS);

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
 * This catches **explicitly declared literal collisions only**: a broad index
 * signature declares no colliding key even though a runtime `phase` property is
 * entirely possible. `validateFramePart` is the authoritative check; this layer
 * makes the common mistake unwriteable, not every mistake (review 6 §19) — and
 * it is named in prose rather than linked because it is deliberately *not*
 * published (D-68) and a published type must not point at a name a reader
 * cannot reach.
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
 * Rejects a frame part before the first `Object.assign`.
 *
 * A behavior frame part is still *defined* as a **plain, own, enumerable,
 * writable, string-keyed data record** — that is the authoring contract. What
 * is **checked** is the part of it whose violation corrupts something the
 * library owns, which is three shapes and not six. The type guard above is
 * defeatable by an `any` at the behavior boundary and the runtime consequence
 * of a silently overwritten `phase` is severe enough to be worth one loop per
 * factory result (review 4 §28).
 *
 * **The three that stay, and why each is the library's** — the composed frame
 * is `Object.assign(createKernelFrame(), part)`, so what each shape does is
 * observable rather than argued:
 *
 * - a **kernel frame key** overwrites the kernel's own slice — `phase` becomes
 *   the part's value. Silent state corruption, which is contract 04's
 *   discriminator for a production check, and the one check that discriminator
 *   was written about (see `scrub`'s note below);
 * - an own data **`__proto__`** makes `Object.assign` invoke the target's
 *   inherited setter and mutate the frame's prototype instead of adding a
 *   field, which breaks the fixed-record model itself;
 * - a **symbol key** survives on the frame *and* survives the `Object.keys`
 *   reset, so a symbol-held DOM node is retained for the controller's life —
 *   the leak argument D-108 makes for `assertFrameScrubbed`. It costs 6 B.
 *
 * **The three that went, 2026-08-22, and why none was ours.** A non-plain
 * prototype, an accessor and a non-enumerable key each cost the *author* their
 * own field and cost the library nothing: own data fields are copied and a
 * class instance's methods are simply absent; an accessor is read once, here,
 * into an ordinary data property, before any transaction exists to observe; a
 * non-enumerable key is skipped by `Object.assign`, so the field never exists
 * in either frame and `assertFrameShapesMatch` passes. A fourth check, on
 * **non-writable** keys, described a failure that cannot happen at all: it said
 * the key "would throw on write", and `Object.assign` uses `[[Set]]` on a fresh
 * extensible object, so the frame's copy is an ordinary writable data property.
 * `tests/kernel/frames.node.test.ts` pins each of those four outcomes, so what
 * used to be a rejection is now an asserted result rather than an assumption.
 *
 * **Proxies are not detected, and this does not claim to detect them.** A proxy
 * over a plain target can report an ordinary prototype and ordinary descriptors
 * and pass every check here. Using one as a frame part is unsupported
 * discipline, not a rejected input (review 5 §11).
 */
export function validateFramePart(part: object): void {
  if (Object.getOwnPropertySymbols(part).length > 0) {
    // `Object.assign` copies enumerable symbols, but the `Object.keys`-based
    // reset and dev checks never see them — so a symbol-keyed DOM reference
    // would survive every scrub.
    throw new TypeError('drag: a frame part may not declare a symbol key');
  }

  for (const key of Object.getOwnPropertyNames(part)) {
    if (KERNEL_FRAME_KEY_SET.has(key)) {
      throw new TypeError(
        `drag: a frame part may not declare the kernel frame key "${key}"`,
      );
    }

    if (key === '__proto__') {
      // An own enumerable writable `__proto__` *data* property — creatable only
      // through `defineProperty` — makes `Object.assign` invoke the target's
      // inherited `__proto__` setter and mutate the frame's prototype instead
      // of adding a field.
      throw new TypeError('drag: a frame part may not declare "__proto__"');
    }
  }
}

/**
 * Composes one physical frame. Called **twice** per controller, from one code
 * path, so both frames traverse an identical construction sequence.
 *
 * The part factory is not proven deterministic (F-2), so **each** result is
 * validated: checking only the first would let the second introduce a colliding
 * or `__proto__` key.
 */
export function composeFrame<Part extends object>(
  createFramePart: () => Part,
): Frame<Part> {
  const part = createFramePart();

  validateFramePart(part);

  // `Object.assign` is declared `(target: T, source: U) => T & U`, so
  // `KernelFrame & Part` falls out of the expression with no cast.
  return Object.assign(createKernelFrame(), part);
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
// in `validateFramePart` was never gated. A part factory that is not
// deterministic and a reset that leaves a live reference are both silent state
// corruption: a retained element leaks a DOM node across every later
// operation. Behavior authoring went public at Revision 2.1, so gating these
// would strip validation from a published authoring API in the exact build a
// third-party author ships (F-78).
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
    'drag: the two frames have different shapes — a part factory is not deterministic',
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
      `drag: the frame key "${key}" was redefined after arm()`,
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
 */
export function assertFrameScrubbed(
  frame: object,
  armedKeys: readonly string[],
): void {
  const keys: readonly string[] = Object.keys(frame);

  assert(
    sameKeys(keys, armedKeys),
    'drag: resetFramePart changed the frame shape',
  );

  validateFrameDescriptors(frame, keys);

  for (const key of keys) {
    const value = (frame as Record<string, unknown>)[key];

    assert(
      typeof value !== 'object' || value === null,
      `drag: reset left a reference in "${key}"`,
    );
  }
}
