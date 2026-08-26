/**
 * The behavior's private runtime: an ordinary object, declared and created in
 * one place, **never handed to the kernel and never widened** (H-2, D-4).
 *
 * **Six mutable fields**, and two things a seventh and an eighth would be are
 * deliberately not among them.
 *
 * There is **no `pendingRequest`** (D-41): it would key `controller.ready(request)`
 * to one operation, and with no readiness protocol there is no acknowledgement
 * to key.
 *
 * There is **no private terminal latch** (D-53): the host publishes the latch,
 * and a hand-kept copy is state that can disagree — it is blind to a
 * kernel-internal `panic()`, and with the kernel published (D-47) a third-party
 * behavior author cannot be expected to know to maintain one.
 *
 * Probe 1's shared runtime had those plus fourteen kernel
 * fields — the queue, the frame references, the attempt slots, the cancel latch
 * — all of which are now unreachable, unnameable and untestable from outside,
 * which is correct: none of them is a behavior concern.
 *
 * Note what is *not* here: `rects`. The geometry cache lives inside the axis
 * feature, which is probe 1's open question about cache ownership answered by
 * construction rather than by argument.
 */
import { createFrameTask, type FrameTask } from '../kernel/invalidation.ts';
import type { BehaviorLiftSession } from '../kernel/presentation.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { KernelHost } from '../kernel/spec.ts';
import type { CollectionSnapshot, Insertion } from './domain.ts';
import type { SortableSlots } from './slots.ts';

/** Behavior action tags. Behavior-local: the kernel offsets them. */
export const TAG_SPATIAL = 0;
export const TAG_COLLECTION = 1;
/**
 * Carries an invalidation failure raised from a native scroll/resize listener
 * back into a seam, which is the only place a stage can be classified. Never
 * dispatched on a healthy drag.
 */
export const TAG_INVALIDATION = 2;
export const SORTABLE_ACTION_TAGS = 3;

/**
 * The one per-operation object both feature views bind to. It exists because
 * they need a **non-null** `placeholder`, which a controller-lifetime runtime
 * cannot promise before activation.
 *
 * Two writes per operation — created in `activation.effect`, `snapshot`
 * rewritten by a collection replacement — and none per call.
 */
export type PresentationView = {
  readonly realm: DOMRealm;
  readonly placeholder: HTMLElement;
  /**
   * The dragged item, for the displacement hooks. Committed frame state, so it
   * cannot change for the life of the view — hence `readonly` and written once
   * at activation rather than rewritten per move.
   */
  readonly item: HTMLElement;
  /**
   * The installed `box` resolver, for the axis rule's candidate measurement
   * (D-58, superseding parity D2's choice of node). Copied off the slots once
   * per operation rather than read through `slots` per rebuild, so the axis
   * feature keeps naming only fields of this object and never reaches the slot
   * record.
   */
  readonly getBox: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The controller's terminal latch, read as a predicate (I-36).
   *
   * The candidate loop inside `RectIndex.refresh` calls the consumer's `box`
   * resolver once per candidate, and a resolver may destroy the
   * controller. The loop is feature-private (D-19, H-4) and cannot reach `rt`,
   * so the reading travels through the per-operation view — the **fourth
   * additive widening** of the D-13 consumer-declared view (8a `item`, 17
   * `pointerX`, D2 `getVisual`, C2-01 `live`), with no import edge and one
   * closure per controller copied by reference per operation.
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style -- `readonly` is not expressible on a method signature
  readonly live: () => boolean;
  snapshot: CollectionSnapshot;
  /**
   * The destination gap of the placeholder move currently being bracketed.
   *
   * Written immediately before the `beforeMove` pipeline and read only by the
   * displacement hooks, which run nowhere else — so it is a field on the shared
   * per-operation object rather than a fresh view per move. One write per
   * *committed* move, and none per pointer move.
   *
   * It is `null` outside a bracket, and the hook-facing `DisplacementView`
   * declares it non-null: nothing but the bracket can observe it.
   */
  insertion: Insertion | null;
};

export type SortableRuntime = {
  readonly host: KernelHost;
  readonly slots: SortableSlots;
  /**
   * Created once per **controller**, not per operation, and cancelled at
   * retirement and at destroy.
   *
   * Per-controller removes both the nullability and an allocation from the
   * activation path, and costs nothing in staleness handling: the task's
   * identity is never operation-scoped, because staleness is carried by the
   * monotonic attempt number it schedules.
   *
   * **Measured against both alternatives** (M-2 —
   * `.plan/measurements/m2.md`). Eager costs 148 B more on a
   * controller that never drags, and wins everywhere else: an active controller
   * is *cheaper* than under lazy-retained or per-operation (281 B against
   * 309 B), because their nullable slot and initialization branch cost more than
   * the task they defer, and `schedule` is half the price with no null check. No
   * policy leaks across a thousand drag cycles.
   */
  readonly frame: FrameTask<number>;
  /** The published collection. Replaced wholesale, never mutated. */
  snapshot: CollectionSnapshot;
  /**
   * **The last array identity `items()` returned** (D-44), and the whole of the
   * structural-change test.
   *
   * This is the consumer's *own* array, held by reference and never read from —
   * only compared. `snapshot.items` cannot stand in for it: that is the
   * library's shallow copy, so its identity moves on every structural update
   * and never matches what the consumer hands back.
   *
   * Comparing identities is what keeps the O(n) copy on structural change
   * instead of on every invalidation, and a resize, a zoom or a scroll produces
   * the latter. React, Vue and Svelte all return a new array when order
   * changes, so the signal costs the consumer nothing to produce.
   */
  source: readonly HTMLElement[];
  /** Null when idle. */
  view: PresentationView | null;
  placeholder: HTMLElement | null;
  /**
   * Handed in at activation, cleared at retire.
   *
   * The **projection** (D-35, C5-01): `rendered` is the kernel's own reading
   * and `dispose` is the kernel's own sequencing, so this behavior can do
   * neither through the capability it was handed.
   */
  lift: BehaviorLiftSession | null;
  /** Monotonic; the identity of the latest coalesced spatial attempt (D-11). */
  spatialSeq: number;
  /** The attempt the frame task actually dispatched. Zero when none is live. */
  pendingSpatial: number;
};

/**
 * `source` is the consumer's own array and `items` is the validated copy of it.
 * **Both are supplied rather than derived here** (D-80 (b)): the validation
 * moved to the construction boundary, ahead of the first installer, because
 * this function runs inside `install` — after `assemble` has returned — and a
 * throw from here left every recorded `retire` hook unrun (F-68).
 */
export function createSortableRuntime(
  host: KernelHost,
  source: readonly HTMLElement[],
  items: readonly HTMLElement[],
  slots: SortableSlots,
): SortableRuntime {
  // The task's body reads the runtime it schedules against, and the runtime
  // holds the task: one of the two has to be closed over rather than passed.
  let runtime!: SortableRuntime;

  const frame = createFrameTask<number>(host.realm, (attempt) => {
    // The producer-side half of the double validation (I-4): a frame that fires
    // after the operation lost its presentation has nothing to resolve against.
    // `action.prepare` validates the attempt again when it applies.
    if (!runtime.view) {
      return;
    }

    runtime.pendingSpatial = attempt;
    host.dispatch(TAG_SPATIAL, attempt);
  });

  runtime = {
    host,
    slots,
    frame,
    // Already copied *and* validated by the caller (D-80 (b)), so a consumer
    // mutating its own array cannot change a snapshot the behavior has
    // published, and the identity precondition holds from construction rather
    // than only from the first `invalidate()`.
    snapshot: { items, version: 0 },
    // **The consumer's array, not the copy** (D-44). This is the identity a
    // later pull is compared against; storing the copy would make the first
    // `invalidate()` take the structural branch against an unchanged
    // collection.
    source,
    view: null,
    placeholder: null,
    lift: null,
    spatialSeq: 0,
    pendingSpatial: 0,
  };

  return runtime;
}
