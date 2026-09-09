/**
 * The behavior's action tags and the one per-operation object its feature views
 * bind to.
 *
 * **There is no runtime aggregate here**: the behavior's per-operation state is
 * closure-local, which is what keeps the kernel unable to name or type it. What
 * lives here is what is not per-operation state at all — the tags, which
 * `arm()` validates through `config.actionTags` and `dispatch` bounds-checks;
 * and {@link SortableActivation}, whose role — one object two feature views
 * bind to, with a non-null `placeholder` — is what requires an object.
 */
import type {
  BehaviorLiftSession,
  InheritedSpace,
} from '../kernel/presentation.ts';
import type { CollectionSnapshot, Insertion } from './domain.ts';
import type { DisplacementSettle } from './rect-index.ts';

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
 * **What activation acquired, as one record.** It exists because both feature
 * views need a **non-null** `placeholder`, which no controller-lifetime state
 * can promise before activation.
 *
 * **Complete-or-absent**: every member is written in the one statement that
 * builds it and the whole record is dropped at retirement, so a partial state
 * is unrepresentable rather than asserted away per site. A member belongs here
 * when its lifetime is the activation's, or when a published view this record
 * must satisfy names it — and never when the frame commits it, which is where
 * committed state is read from.
 *
 * **Not a second lifecycle authority**: `phase` on the frame is the sole
 * lifecycle discriminant, and this record is read for what activation
 * acquired, never for where the operation is.
 *
 * Created in `activation.effect`, with `snapshot` rewritten by a collection
 * replacement — and nothing written per call.
 */
export type SortableActivation = {
  readonly placeholder: HTMLElement;
  /**
   * The **projection**: the lift session the kernel handed activation, whose
   * `rendered` reading and `dispose` sequencing stay the kernel's own.
   */
  readonly lift: BehaviorLiftSession;
  /**
   * The composed displacement sink's settle walk, or `null` when nothing
   * displaces. Copied off the slots once per operation so an axis rebuild reads
   * one field of this object rather than reaching the slot record.
   */
  readonly settle: DisplacementSettle | null;
  /**
   * **The inverse of the linear part the collection inherits**, or `null` when
   * that part is the identity — which is the common case, and answers the
   * projection in one null test.
   *
   * A fact about the ancestry at grab: the kernel derives it from the
   * measurement the lift already took, before it moved anything, so this costs
   * no DOM read of its own and cannot disagree with the geometry the operation
   * began in. Carried here so a displaced element's viewport vector can state
   * its own units when it reaches the sink.
   */
  readonly space: InheritedSpace;
  /**
   * The installed `box` resolver, for the axis rule's candidate measurement.
   * Copied off the slots once per operation rather than read through `slots`
   * per rebuild, so the axis feature keeps naming only fields of this object
   * and never reaches the slot record.
   */
  readonly box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The controller's terminal latch, read as a predicate.
   *
   * The candidate loop inside `RectIndex.refresh` calls the consumer's `box`
   * resolver once per candidate, and a resolver may destroy the controller. The
   * loop is feature-private and can reach nothing of the behavior's, so the
   * reading travels through the per-operation view, with no import edge and one
   * closure per controller copied by reference per operation.
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style -- `readonly` is not expressible on a method signature
  readonly live: () => boolean;
  snapshot: CollectionSnapshot;
  /**
   * The destination gap of the placeholder move currently being bracketed.
   *
   * Written at the head of the committed-move bracket and read only inside it,
   * and the bracket runs nowhere else — so it is a field on the shared
   * per-operation object rather than a fresh view per move. One write per
   * *committed* move, and none per pointer move.
   *
   * It is `null` outside a bracket, and nothing but the bracket can observe it.
   */
  insertion: Insertion | null;
};
