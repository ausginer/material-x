/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits or
 * rejects it.
 */
import {
  draggable,
  type Behavior,
  type Drag,
  type Outcome,
} from './draggable.ts';
import { createLifter, type Landing, type Lift, type Lifter } from './lift.ts';
import {
  createFrameTask,
  type FrameTask,
  listenForInvalidation,
} from './shared/invalidation.ts';
import type { LandingTiming } from './shared/landing.ts';
import type {
  AxisContext,
  AxisInstaller,
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

type State = {
  readonly item: HTMLElement;
  /** `config.visual` from admission, or the item. */
  readonly visual: HTMLElement;
  /** `config.box` from admission, or the visual. */
  readonly box: HTMLElement;
  /** Acquired as the first statement of `activate`. */
  lift: Lift | null;
  /** A command's direction, or `null` for a pointer operation. */
  readonly direction: KeyboardDirection | null;
  snapshot: CollectionSnapshot;
  insertion: Insertion | null;
  pointerX: number;
  pointerY: number;
  request: ReorderRequest | null;
  result: SortableResult | null;
  placeholder: HTMLElement | null;
  context: AxisContext | null;
  frame: FrameTask | null;
};

/** Records the terminal result, and says where the visual goes. */
function recordResult(
  state: State,
  outcome: Outcome<ReorderResolution>,
): Recovery {
  if (outcome.type === 'canceled') {
    state.result = {
      type: 'canceled',
      reason: outcome.reason,
      origin: outcome.origin,
      request: state.request,
    };

    return outcome.origin === 'fault' ? RECOVERY_IMMEDIATE : RECOVERY_HOME;
  }

  if (outcome.type === 'skipped') {
    state.result = { type: 'noop', request: state.request! };
    return RECOVERY_IMMEDIATE;
  }

  if (outcome.value === ACCEPTED) {
    state.result = { type: 'accepted', request: state.request! };
    return RECOVERY_DESTINATION;
  }

  state.result = {
    type: 'rejected',
    reason: (outcome.value as RejectedResolution)[0],
    request: state.request!,
  };

  return RECOVERY_HOME;
}

/** Only with a landing composed: the one forced layout a drop adds. */
function landingTarget(
  drag: Drag<State>,
  lift: Lift,
  recovery: Recovery,
  composed: LandingTiming,
): Landing {
  const placeholder = drag.state.placeholder!;

  if (recovery === RECOVERY_DESTINATION) {
    if (
      drag.item.isConnected &&
      drag.item.parentElement === placeholder.parentElement &&
      placeholder.nextElementSibling !== drag.item
    ) {
      drag.item.before(placeholder);
    }
  } else {
    movePlaceholder(placeholder, homeInsertion(drag.state.snapshot, drag.item));
  }

  if (
    !placeholder.isConnected ||
    placeholder.parentElement !== drag.item.parentElement
  ) {
    throw new Error('sortable/landing-placeholder-lost');
  }

  const { left: x, top: y } = placeholder.getBoundingClientRect();

  return {
    x,
    y,
    ...composed(
      lift.translatedX,
      lift.translatedY,
      x - lift.rect.x,
      y - lift.rect.y,
    ),
  };
}

/**
 * The behavior `draggable` runs for one root. The kernel calls each hook as a
 * method of this instance. Every function handed elsewhere is created once per
 * instance, or once per operation when it closes over the operation, so the
 * kernel's identity coalescing sees the same step on every request. Operation
 * values live in `drag.state`; the instance holds only controller-lifetime ones.
 */
class SortableBehavior implements Behavior<State, ReorderResolution> {
  declare readonly threshold?: number;

  readonly #config: SortableConfig;
  readonly #window: Window;
  readonly #lifter: Lifter;
  readonly #axis: InsertionGeometry;
  readonly #displacement: DisplacementSink | undefined;
  readonly #landing: LandingTiming | null;
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

    this.#config = config;
    this.#window = root.ownerDocument.defaultView!;
    this.#lifter = lifter;
    this.#axis = config.axis();
    this.#displacement = displacement;
    this.#landing = config.landing ?? null;
    this.#measuredBox = config.box ?? config.visual ?? null;
  }

  /** Step, on `invalidate()`: re-reads the collection and rebases the gap. */
  readonly invalidate = (drag: Drag<State> | null): void => {
    if (!drag) {
      return;
    }

    const next = this.#pull();

    drag.state.snapshot = next;

    if (next.items.includes(drag.item)) {
      const insertion = drag.state.insertion
        ? reconcileCollection(next, drag.item, drag.state.insertion)
        : null;

      if (insertion) {
        drag.state.insertion = insertion;
      } else {
        drag.requestCancel(CANCEL_COLLECTION_INVALIDATED);
      }
    } else {
      drag.requestCancel(CANCEL_ITEM_REMOVED);
    }

    this.#axis.invalidate();
  };

  admit(event: PointerEvent) {
    return event.altKey ? null : this.#admission(event, null);
  }

  command(event: KeyboardEvent) {
    const direction = event.isComposing ? null : directionOf(event.key);

    return direction === null ? null : this.#admission(event, direction);
  }

  activate(drag: Drag<State>): false | undefined {
    // First, so that its release is the operation's first disposer and runs last.
    drag.state.lift = this.#lifter.acquire(
      drag,
      drag.state.visual,
      drag.state.box,
    );

    const { lift } = drag.state;
    const window = this.#window;

    // The second pull closes the window between admission and activation, in
    // which foreign code runs: a press before its threshold, and a command
    // through the lift's popover events. An item that left, or a command whose
    // move is no longer possible, declines quietly.
    const snapshot = this.#pull();

    if (!snapshot.items.includes(drag.item)) {
      return false;
    }

    const insertion =
      drag.state.direction === null
        ? homeInsertion(snapshot, drag.item)
        : keyboardInsertion(snapshot, drag.item, drag.state.direction);

    if (!insertion) {
      return false;
    }

    drag.state.snapshot = snapshot;
    drag.state.insertion = insertion;

    const placeholder = createPlaceholder(
      window.document,
      // An object of its own: the factory may keep its argument, and must not
      // keep the operation.
      { item: drag.item, visual: lift.visual, box: lift.box, rect: lift.rect },
      lift.boxWidth,
      // Across the lift: a box around the visual keeps the part of its height the
      // visual did not take with it.
      lift.visual.contains(lift.box)
        ? lift.boxHeight
        : lift.boxHeight - lift.box.offsetHeight,
      this.#config.placeholder ?? null,
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

    const updateInsertion = this.#updateInsertion;
    const invalidateGeometry = this.#invalidateGeometry;
    const frame = createFrameTask(window, () => {
      drag.requestStep(updateInsertion);
    });

    drag.use(() => {
      frame.cancel();
    });
    drag.use(this.#retireAxis);
    listenForInvalidation(window, drag.signal, () => {
      drag.requestStep(invalidateGeometry);
    });
    drag.state.placeholder = placeholder;
    drag.state.frame = frame;
    drag.state.context = {
      placeholder,
      box: this.#measuredBox,
      settle: this.#displacement ? this.#displacement.settle : null,
      space: lift.itemSpace,
    };
    this.#axis.invalidate();

    return undefined;
  }

  start(drag: Drag<State>): void {
    this.#config.onStart?.(drag.item);
  }

  // oxlint-disable-next-line class-methods-use-this -- a hook the kernel calls as a method of the instance
  move(drag: Drag<State>): void {
    drag.state.lift!.translate(drag.x - drag.originX, drag.y - drag.originY);
    drag.state.frame!.schedule();
  }

  drop(drag: Drag<State>) {
    const pointer = drag.state.direction === null;

    drag.state.frame!.cancel();

    if (pointer) {
      this.#axis.invalidate();
      drag.state.pointerX = drag.x;
      drag.state.pointerY = drag.y;
      drag.state.insertion =
        this.#axis.resolve(drag.state, drag.state.context!) ??
        drag.state.insertion;
    }

    const insertion = drag.state.insertion!;
    const request = buildReorderRequest(
      drag.state.snapshot,
      drag.item,
      insertion,
    );

    drag.state.request = request;
    movePlaceholder(drag.state.placeholder!, insertion);

    if (pointer) {
      drag.state.lift!.translate(drag.x - drag.originX, drag.y - drag.originY);
    }

    return request.to === request.from
      ? null
      : (signal: AbortSignal) => this.#config.onReorder(request, { signal });
  }

  settle(drag: Drag<State>, outcome: Outcome<ReorderResolution>): void {
    const recovery = recordResult(drag.state, outcome);
    const composed = this.#landing;

    if (composed && recovery !== RECOVERY_IMMEDIATE) {
      const lift = drag.state.lift!;

      lift.land(landingTarget(drag, lift, recovery, composed));
    }
  }

  end(drag: Drag<State>): void {
    this.#config.onEnd?.(drag.state.result!);
  }

  /** Step, on scroll and resize: the cached geometry is stale. */
  readonly #invalidateGeometry = (): void => {
    this.#axis.invalidate();
  };

  /** Disposer, per operation: the cache releases the operation's elements. */
  readonly #retireAxis = (): void => {
    this.#axis.retire();
  };

  #pull(): CollectionSnapshot {
    this.#version += 1;
    return { items: [...this.#config.items()], version: this.#version };
  }

  /** Step, once per frame: the gap under the pointer, and the placeholder moved to it. */
  readonly #updateInsertion = (drag: Drag<State> | null): void => {
    if (!drag) {
      return;
    }

    const context = drag.state.context!;
    const axis = this.#axis;

    drag.state.pointerX = drag.x;
    drag.state.pointerY = drag.y;

    const resolved = axis.resolve(drag.state, context);

    if (resolved === null) {
      return;
    }

    drag.state.insertion = resolved;

    if (placeholderAt(context.placeholder, resolved)) {
      return;
    }

    let stale = true;

    try {
      movePlaceholder(context.placeholder, resolved);
      axis.moved(drag.state, context, this.#displacement?.report ?? null);
      stale = false;
    } finally {
      if (stale) {
        axis.invalidate();
      }
    }
  };

  /**
   * The pressed item from a fresh collection, and the admission for it. A command
   * names its direction and is refused at the collection's edge, so that the key
   * keeps its native meaning there.
   */
  #admission(event: Event, direction: KeyboardDirection | null) {
    const snapshot = this.#pull();
    const path = event.composedPath();
    const item = path.find((node) =>
      snapshot.items.includes(node as HTMLElement),
    ) as HTMLElement | undefined;

    if (!item) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this.#config.handle) {
      const named = this.#config.handle(item);

      if (!named || !path.includes(named)) {
        return null;
      }

      handle = named;
    }

    if (direction !== null && !keyboardInsertion(snapshot, item, direction)) {
      return null;
    }

    const visual = this.#config.visual?.(item) ?? item;
    const state: State = {
      item,
      visual,
      box: this.#config.box?.(item) ?? visual,
      lift: null,
      direction,
      snapshot,
      insertion: null,
      pointerX: 0,
      pointerY: 0,
      request: null,
      result: null,
      placeholder: null,
      context: null,
      frame: null,
    };

    return {
      item,
      ...(handle ? { handle } : {}),
      state,
    };
  }
}

/** Makes `root` a sortable collection. */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  const displacement = config.displacement?.();
  const lifter = createLifter(root.ownerDocument.defaultView!);
  const behavior = new SortableBehavior(root, config, displacement, lifter);
  const kernel = draggable<State, ReorderResolution>(root, behavior);

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
