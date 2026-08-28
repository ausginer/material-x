/**
 * The behavior's action tags and the one per-operation object its feature views
 * bind to.
 *
 * **There is no runtime aggregate here any more** (D-149). The object that gave
 * this module its name held the host, the slot record, the frame task and five
 * mutable fields; the spec destructured the first two on its own first line,
 * and the rest are now locals in the closure that already held their siblings.
 * H-2 and D-4 are about the kernel being unable to name or type the behavior's
 * state, and closure-local state satisfies that more literally than a named
 * container does.
 *
 * What is left is what was never per-operation state: the tags, which `arm()`
 * validates through `config.actionTags` and `dispatch` bounds-checks; and
 * {@link PresentationView}, which is a genuine runtime value whose own role —
 * one object two feature views bind to, with a non-null `placeholder` — is what
 * requires an object.
 */
import type { DOMRealm } from '../kernel/realm.ts';
import type { CollectionSnapshot, Insertion } from './domain.ts';

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
 * they need a **non-null** `placeholder`, which no controller-lifetime state
 * can promise before activation.
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
  readonly box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The controller's terminal latch, read as a predicate (I-36).
   *
   * The candidate loop inside `RectIndex.refresh` calls the consumer's `box`
   * resolver once per candidate, and a resolver may destroy the
   * controller. The loop is feature-private (D-19, H-4) and can reach nothing
   * of the behavior's, so the reading travels through the per-operation view — the **fourth
   * additive widening** of the D-13 consumer-declared view (8a `item`, 17
   * `pointerX`, D2 `visual`, C2-01 `live`), with no import edge and one
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
