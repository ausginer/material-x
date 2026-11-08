/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits or
 * rejects it.
 */
import type { SetNonNullable, Writable } from 'type-fest';
import {
  draggable,
  type Admission,
  type Behavior,
  type BehaviorOperation,
  type Drag,
  type Outcome,
} from './draggable.ts';
import { Lifter, type Lift } from './lift.ts';
import {
  createFrameTask,
  type FrameTask,
  listenForInvalidation,
} from './shared/invalidation.ts';
import type { LandingTiming } from './shared/landing.ts';
import type {
  AxisContext,
  AxisInstaller,
  AxisQuery,
  DisplacementInstaller,
  DisplacementSink,
  InsertionGeometry,
} from './sortable/axis.ts';
import {
  buildReorderRequest,
  homeInsertion,
  reconcileCollection,
} from './sortable/collection.ts';
import {
  ACCEPTED,
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  type OnReorder,
  type RejectedResolution,
  type ReorderRequest,
  ReorderResolution,
  type SortableAcceptedResult,
  type SortableCanceledResult,
  type SortableNoopResult,
  type SortableRejectedResult,
  type SortableResult,
} from './sortable/domain.ts';
import {
  directionOf,
  keyboardInsertion,
  type KeyboardDirection,
} from './sortable/keyboard.ts';
import {
  createPlaceholder,
  movePlaceholder,
  type PlaceholderContext,
  type PlaceholderFactory,
  placeholderAt,
} from './sortable/placement.ts';

export { ReorderResolution };
export type {
  OnReorder,
  PlaceholderContext,
  PlaceholderFactory,
  ReorderRequest,
  SortableAcceptedResult,
  SortableCanceledResult,
  SortableNoopResult,
  SortableRejectedResult,
  SortableResult,
};

export type SortableConfig = Readonly<{
  /**
   * The collection, pulled at each admission, at activation, and on `invalidate()`
   * during a drag. It holds no duplicates and is in DOM order under `root`. Each
   * pull copies the returned array, so the consumer keeps its array and may change
   * it at any time.
   */
  items(): readonly HTMLElement[];
  axis: AxisInstaller;
  /** Commit the reorder and resolve it, for example `root.insertBefore(item, next)`. */
  onReorder: OnReorder;
  onStart?(item: HTMLElement): void;
  onEnd?(result: SortableResult): void;
  threshold?: number;
  handle?(item: HTMLElement): HTMLElement | null;
  /** The node that is lifted. Defaults to the item. */
  visual?(item: HTMLElement): HTMLElement;
  /** The geometry source. Defaults to `visual`. */
  box?(item: HTMLElement): HTMLElement;
  placeholder?: PlaceholderFactory;
  landing?: LandingTiming;
  displacement?: DisplacementInstaller;
}>;

export type SortableController = Readonly<{
  /**
   * During a drag, re-reads the collection and the geometry. Between drags and
   * during a press nothing needs to be called.
   */
  invalidate(): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
}>;

const RECOVERY_DESTINATION = 1;
const RECOVERY_HOME = 2;
const RECOVERY_IMMEDIATE = 3;

type Recovery =
  | typeof RECOVERY_DESTINATION
  | typeof RECOVERY_HOME
  | typeof RECOVERY_IMMEDIATE;

/** What `activate` needs from the press. */
type PressState = Readonly<{
  /** `config.visual` from admission, or the item. */
  visual: HTMLElement;
  /** `config.box` from admission, or the visual. */
  box: HTMLElement;
  /** A command's direction, or `null` for a pointer operation. */
  direction: KeyboardDirection | null;
}>;

/** Step, once per frame: the gap under the pointer, and the placeholder moved to it. */
function updateInsertion(operation: SortableOperation | null): void {
  operation?.updateInsertion();
}

/**
 * One activated sortable operation, from `start` to `end`. The kernel calls each
 * hook as a method of this instance. It is also the query the axis rule reads.
 */
class SortableOperation implements BehaviorOperation<ReorderResolution> {
  readonly #behavior: SortableBehavior;
  readonly #drag: Drag<SortableOperation>;
  readonly #lift: Lift;
  /** A command's direction, or `null` for a pointer operation. */
  readonly #direction: KeyboardDirection | null;
  readonly #frame: FrameTask;
  readonly #context: AxisContext;
  readonly #query: Writable<SetNonNullable<AxisQuery>>;
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

  drop() {
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
      this.#behavior.axis.moved(
        this.#query,
        this.#context,
        this.#behavior.displacement?.report ?? null,
      );
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
      movePlaceholder(
        this.#context.placeholder,
        homeInsertion(this.#query.snapshot, this.#query.item),
      );
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

/**
 * The behavior `draggable` runs for one root: admission and activation. Every
 * function handed elsewhere is created once per instance, or once per operation
 * when it closes over the operation, so the kernel's identity coalescing sees the
 * same step on every request. It holds only controller-lifetime values, and the
 * operation reads the ones it needs through it.
 */
class SortableBehavior implements Behavior<
  PressState,
  ReorderResolution,
  SortableOperation
> {
  declare readonly threshold?: number;

  readonly config: SortableConfig;
  readonly #window: Window;
  readonly #lifter: Lifter;
  readonly axis: InsertionGeometry;
  readonly displacement: DisplacementSink | undefined;
  readonly landing: LandingTiming | null;
  readonly #measuredBox: ((item: HTMLElement) => HTMLElement) | null;
  /** The version the next pulled snapshot carries. */
  #version = 0;

  constructor(
    root: HTMLElement,
    config: SortableConfig,
    displacement: DisplacementSink | undefined,
    lifter: Lifter,
  ) {
    if (config.threshold !== undefined) {
      this.threshold = config.threshold;
    }

    this.config = config;
    this.#window = root.ownerDocument.defaultView!;
    this.#lifter = lifter;
    this.axis = config.axis();
    this.displacement = displacement;
    this.landing = config.landing ?? null;
    this.#measuredBox = config.box ?? config.visual ?? null;
  }

  /** Step, on `invalidate()`: re-reads the collection and rebases the gap. */
  readonly invalidate = (operation: SortableOperation | null): void => {
    if (operation) {
      operation.rebase(this.#pull());
    }
  };

  admit(event: PointerEvent) {
    return event.altKey ? null : this.#admission(event, null);
  }

  command(event: KeyboardEvent) {
    const direction = event.isComposing ? null : directionOf(event.key);

    return direction === null ? null : this.#admission(event, direction);
  }

  activate(
    drag: Drag<SortableOperation>,
    state: PressState,
  ): SortableOperation | null {
    // First, so that its release is the operation's first disposer and runs last.
    const lift = this.#lifter.acquire(drag, state.visual, state.box);

    // The second pull closes the window between admission and activation, in
    // which foreign code runs: a press before its threshold, and a command
    // through the lift's popover events. An item that left, or a command whose
    // move is no longer possible, declines quietly.
    const snapshot = this.#pull();

    if (!snapshot.items.includes(drag.item)) {
      return null;
    }

    const insertion =
      state.direction === null
        ? homeInsertion(snapshot, drag.item)
        : keyboardInsertion(snapshot, drag.item, state.direction);

    if (!insertion) {
      return null;
    }

    const placeholder = createPlaceholder(
      this.#window.document,
      // An object of its own: the factory may keep its argument, and must not
      // keep the operation.
      {
        item: drag.item,
        visual: lift.visual,
        box: lift.box,
        rect: lift.rect,
      },
      lift.boxWidth,
      // Across the lift: a box around the visual keeps the part of its height the
      // visual did not take with it.
      lift.visual.contains(lift.box)
        ? lift.boxHeight
        : lift.boxHeight - lift.box.offsetHeight,
      this.config.placeholder ?? null,
    );

    drag.use(() => {
      placeholder.remove();
    });

    drag.item.after(placeholder);

    if (
      !placeholder.isConnected ||
      drag.item.nextElementSibling !== placeholder
    ) {
      throw new Error('sortable/insertion-placeholder-lost');
    }

    const frame = createFrameTask(this.#window, () => {
      drag.requestStep(updateInsertion);
    });

    drag.use(() => {
      frame.cancel();
    });
    drag.use(this.#retireAxis);
    listenForInvalidation(this.#window, drag.signal, () => {
      drag.requestStep(this.#invalidateGeometry);
    });

    const operation = new SortableOperation(
      this,
      drag,
      lift,
      state.direction,
      snapshot,
      insertion,
      frame,
      {
        placeholder,
        box: this.#measuredBox,
        settle: this.displacement ? this.displacement.settle : null,
        space: lift.itemSpace,
      },
    );

    this.axis.invalidate();

    return operation;
  }

  /** Step, on scroll and resize: the cached geometry is stale. */
  readonly #invalidateGeometry = (): void => {
    this.axis.invalidate();
  };

  /** Disposer, per operation: the cache releases the operation's elements. */
  readonly #retireAxis = (): void => {
    this.axis.retire();
  };

  #pull(): CollectionSnapshot {
    this.#version += 1;
    return { items: [...this.config.items()], version: this.#version };
  }

  /**
   * The pressed item from a fresh collection, and the admission for it. A command
   * names its direction and is refused at the collection's edge, so that the key
   * keeps its native meaning there.
   */
  #admission(
    event: Event,
    direction: KeyboardDirection | null,
  ): Admission<PressState> | null {
    const snapshot = this.#pull();
    const path = event.composedPath();
    const item = path.find((node) =>
      snapshot.items.includes(node as HTMLElement),
    ) as HTMLElement | undefined;

    if (!item) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this.config.handle) {
      const named = this.config.handle(item);

      if (!named || !path.includes(named)) {
        return null;
      }

      handle = named;
    }

    if (direction !== null && !keyboardInsertion(snapshot, item, direction)) {
      return null;
    }

    const visual = this.config.visual?.(item) ?? item;

    return {
      item,
      ...(handle ? { handle } : {}),
      state: {
        visual,
        box: this.config.box?.(item) ?? visual,
        direction,
      },
    };
  }
}

/** Makes `root` a sortable collection. */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  const displacement = config.displacement?.();
  const lifter = new Lifter(root.ownerDocument.defaultView!);
  const behavior = new SortableBehavior(root, config, displacement, lifter);
  const kernel = draggable(root, behavior);

  if (displacement) {
    kernel.use(() => {
      displacement.retire();
    });
  }

  // Registered last, so a running landing is cancelled first at destruction.
  kernel.use(lifter.cancelLanding);

  return {
    invalidate: () => {
      kernel.requestStep(behavior.invalidate);
    },
    requestCancel: (reason) => kernel.requestCancel(reason),
    requestDestroy: () => kernel.requestDestroy(),
  };
}
