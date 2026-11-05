/**
 * The behavior's action tags and the one per-operation object that its feature
 * views bind to.
 *
 * There is no runtime aggregate here. The behavior's per-operation state is
 * closure-local, which keeps the kernel unable to name or type it. This module
 * holds what is not per-operation state: the tags, which `arm()` validates
 * through `config.actionTags` and `dispatch` bounds-checks. It also holds
 * {@link SortableActivation}, which must be an object because the feature views
 * bind to one object with a non-null `placeholder`.
 */
import type {
  BehaviorLiftSession,
  InheritedSpace,
} from '../kernel/presentation.ts';
import type { DisplacementSettle } from './rect-index.ts';

/** Behavior action tags. Behavior-local: the kernel offsets them. */
export const TAG_SPATIAL = 0;
export const TAG_COLLECTION = 1;
/**
 * Carries an invalidation failure raised from a native scroll/resize listener
 * back into a transition, which is the only place where a stage can be
 * classified. Never dispatched on a healthy drag.
 */
export const TAG_INVALIDATION = 2;
export const SORTABLE_ACTION_TAGS = 3;

/**
 * What activation acquired, as one record. The record exists because the
 * feature views need a non-null `placeholder`, which no controller-lifetime
 * state can promise before activation.
 *
 * The record is complete or absent: one statement writes every member, and
 * retirement drops the whole record. So a partial state is unrepresentable and
 * no call site has to assert against one. A member belongs here when its
 * lifetime is the activation's, or when a published view that this record must
 * satisfy names it. A member never belongs here when the frame commits it,
 * because committed state is read from the frame.
 *
 * This record is not a second lifecycle authority. `phase` on the frame is the
 * sole lifecycle discriminant. Read this record for what activation acquired,
 * never for where the operation is.
 *
 * Created whole in `activation.effect`, dropped whole at retirement, and never
 * written in between: one write per operation and none per call.
 */
export type SortableActivation = {
  readonly placeholder: HTMLElement;
  /**
   * The projection: the lift session that the kernel gave activation. Its
   * `rendered` reading and `dispose` sequencing stay with the kernel.
   */
  readonly lift: BehaviorLiftSession;
  /**
   * The composed displacement sink's settle walk, or `null` when nothing
   * displaces. Copied from the slots once per operation so that an axis rebuild
   * reads one field of this object and does not reach the slot record.
   */
  readonly settle: DisplacementSettle | null;
  /**
   * The inverse of the linear part that the collection inherits, or `null` when
   * that part is the identity. The identity is the common case, and the
   * projection then costs one null test.
   *
   * This value describes the ancestry at grab. The kernel derives it from the
   * measurement the lift already took, before the lift moved anything. So it
   * costs no DOM read of its own and cannot disagree with the geometry the
   * operation began in. It is carried here so that a displaced element's
   * viewport vector can state its own units when it reaches the sink.
   */
  readonly space: InheritedSpace;
  /**
   * The installed `box` resolver, for the axis rule's candidate measurement.
   * Copied from the slots once per operation and not read through `slots` per
   * rebuild, so the axis feature names only fields of this object and never
   * reaches the slot record.
   */
  readonly box: ((item: HTMLElement) => HTMLElement) | null;
};
