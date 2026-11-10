import type { SetNonNullable, Writable } from 'type-fest';
import type {
  BehaviorOperation,
  Drag,
  Outcome,
  VerdictAwaiter,
} from '../draggable.ts';
import type { Lift } from '../lift.ts';
import type { FrameTask } from '../shared/invalidation.ts';
import type { AxisContext, AxisQuery } from './axis.ts';
import type { SortableBehavior } from './behavior.ts';
import {
  buildReorderRequest,
  homeInsertion,
  reconcileCollection,
} from './collection.ts';
import {
  ACCEPTED,
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  type RejectedResolution,
  type ReorderRequest,
  type ReorderResolution,
  type SortableResult,
} from './domain.ts';
import type { KeyboardDirection } from './keyboard.ts';
import { movePlaceholder, placeholderAt } from './placement.ts';

const RECOVERY_DESTINATION = 1;
const RECOVERY_HOME = 2;
const RECOVERY_IMMEDIATE = 3;

type Recovery =
  | typeof RECOVERY_DESTINATION
  | typeof RECOVERY_HOME
  | typeof RECOVERY_IMMEDIATE;

/**
 * One activated sortable operation, from `start` to `end`. The kernel calls each
 * hook as a method of this instance.
 */
export class SortableOperation implements BehaviorOperation<ReorderResolution> {
  readonly #behavior: SortableBehavior;
  readonly #drag: Drag<SortableOperation>;
  readonly #lift: Lift;
  /** A command's direction, or `null` for a pointer operation. */
  readonly #direction: KeyboardDirection | null;
  readonly #frame: FrameTask;
  readonly #context: AxisContext;
  /** The operation state the axis rule reads. */
  readonly #query: Writable<SetNonNullable<AxisQuery>>;
  /**
   * The item's gap in the pull that is the operation's collection. A landing at
   * home reads it, so no cancel, verdict or release reads the consumer's array.
   */
  #home: Insertion;
  /** `null` until the drop: a cancel before it has none. */
  #request: ReorderRequest | null = null;
  /** Recorded at `settle` and reported at `end`. */
  #result: SortableResult | null = null;

  constructor(
    behavior: SortableBehavior,
    drag: Drag<SortableOperation>,
    lift: Lift,
    direction: KeyboardDirection | null,
    snapshot: CollectionSnapshot,
    home: Insertion,
    insertion: Insertion,
    frame: FrameTask,
    context: AxisContext,
  ) {
    this.#behavior = behavior;
    this.#drag = drag;
    this.#lift = lift;
    this.#direction = direction;
    this.#frame = frame;
    this.#context = context;
    this.#home = home;
    this.#query = {
      item: drag.item,
      snapshot,
      insertion,
      pointerX: 0,
      pointerY: 0,
    };
  }

  start(): void {
    this.#behavior.config.onStart?.(this.#query.item);
  }

  move(): void {
    const drag = this.#drag;

    this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);
    this.#frame.schedule();
  }

  drop(): VerdictAwaiter<ReorderResolution> | null {
    const isPointerOperation = this.#direction === null;

    this.#frame.cancel();

    if (isPointerOperation) {
      this.#behavior.axis.invalidate();
      this.#query.pointerX = this.#drag.x;
      this.#query.pointerY = this.#drag.y;
      this.#query.insertion =
        this.#behavior.axis.resolve(this.#query, this.#context) ??
        this.#query.insertion;
    }

    const request = buildReorderRequest(
      this.#query.snapshot,
      this.#drag.item,
      this.#query.insertion,
    );

    this.#request = request;
    movePlaceholder(this.#context.placeholder, this.#query.insertion);

    if (isPointerOperation) {
      this.#lift.translate(
        this.#drag.x - this.#drag.originX,
        this.#drag.y - this.#drag.originY,
      );
    }

    return request.to === request.from
      ? null
      : (signal: AbortSignal) =>
          this.#behavior.config.onReorder(request, { signal });
  }

  settle(outcome: Outcome<ReorderResolution>): void {
    const recovery = this.#recordResult(outcome);
    const composed = this.#behavior.landing;

    if (composed && recovery !== RECOVERY_IMMEDIATE) {
      const { left, top } = this.#landingTarget(recovery);

      this.#lift.land(left, top, composed);
    }
  }

  end(): void {
    this.#behavior.config.onEnd?.(this.#result!);
  }

  /** The collection was pulled again: rebases the gap, or cancels. */
  rebase(next: CollectionSnapshot): void {
    this.#query.snapshot = next;
    this.#home = homeInsertion(next, this.#drag.item);

    if (next.items.includes(this.#drag.item)) {
      const insertion = reconcileCollection(
        next,
        this.#drag.item,
        this.#query.insertion,
      );

      if (insertion) {
        this.#query.insertion = insertion;
      } else {
        this.#drag.requestCancel(CANCEL_COLLECTION_INVALIDATED);
      }
    } else {
      this.#drag.requestCancel(CANCEL_ITEM_REMOVED);
    }

    this.#behavior.axis.invalidate();
  }

  /** The gap under the pointer, and the placeholder moved to it. */
  updateInsertion(): void {
    this.#query.pointerX = this.#drag.x;
    this.#query.pointerY = this.#drag.y;

    const resolved = this.#behavior.axis.resolve(this.#query, this.#context);

    if (resolved === null) {
      return;
    }

    this.#query.insertion = resolved;

    if (placeholderAt(this.#context.placeholder, resolved)) {
      return;
    }

    let stale = true;

    try {
      movePlaceholder(this.#context.placeholder, resolved);
      this.#behavior.axis.moved(this.#query, this.#context);
      stale = false;
    } finally {
      if (stale) {
        this.#behavior.axis.invalidate();
      }
    }
  }

  /** Records the terminal result, and says where the visual goes. */
  #recordResult(outcome: Outcome<ReorderResolution>): Recovery {
    if (outcome.type === 'canceled') {
      this.#result = {
        type: 'canceled',
        reason: outcome.reason,
        origin: outcome.origin,
        request: this.#request,
      };

      return outcome.origin === 'fault' ? RECOVERY_IMMEDIATE : RECOVERY_HOME;
    }

    if (outcome.type === 'skipped') {
      this.#result = { type: 'noop', request: this.#request! };
      return RECOVERY_IMMEDIATE;
    }

    if (outcome.value === ACCEPTED) {
      this.#result = { type: 'accepted', request: this.#request! };
      return RECOVERY_DESTINATION;
    }

    this.#result = {
      type: 'rejected',
      reason: (outcome.value as RejectedResolution)[0],
      request: this.#request!,
    };

    return RECOVERY_HOME;
  }

  /**
   * Only with a landing composed: the one forced layout a drop adds. Returns the
   * placeholder's rect, whose top-left is where the visual lands.
   */
  #landingTarget(recovery: Recovery): DOMRectReadOnly {
    if (recovery === RECOVERY_DESTINATION) {
      if (
        this.#query.item.isConnected &&
        this.#query.item.parentElement ===
          this.#context.placeholder.parentElement &&
        this.#context.placeholder.nextElementSibling !== this.#query.item
      ) {
        this.#query.item.before(this.#context.placeholder);
      }
    } else {
      movePlaceholder(this.#context.placeholder, this.#home);
    }

    if (
      !this.#context.placeholder.isConnected ||
      this.#context.placeholder.parentElement !== this.#query.item.parentElement
    ) {
      throw new Error('sortable/landing-placeholder-lost');
    }

    return this.#context.placeholder.getBoundingClientRect();
  }
}
