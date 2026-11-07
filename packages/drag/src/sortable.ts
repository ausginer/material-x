/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits or
 * rejects it.
 */
import {
  draggable,
  type DraggableController,
  type Landing,
  type LiftedBehavior,
  type LiftedDrag,
  type Outcome,
} from './draggable.ts';
import { lift } from './lift.ts';
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
   * during a drag. It holds no duplicates and is in DOM order under `root`.
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
  const { request } = state;

  if (outcome.type === 'canceled') {
    state.result = {
      type: 'canceled',
      reason: outcome.reason,
      origin: outcome.origin,
      request,
    };

    return outcome.origin === 'fault' ? RECOVERY_IMMEDIATE : RECOVERY_HOME;
  }

  if (outcome.type === 'skipped') {
    state.result = { type: 'noop', request: request! };
    return RECOVERY_IMMEDIATE;
  }

  if (outcome.value === ACCEPTED) {
    state.result = { type: 'accepted', request: request! };
    return RECOVERY_DESTINATION;
  }

  state.result = {
    type: 'rejected',
    reason: (outcome.value as RejectedResolution)[0],
    request: request!,
  };

  return RECOVERY_HOME;
}

/** Only with a landing composed: the one forced layout a drop adds. */
function landingTarget(
  drag: LiftedDrag<State>,
  recovery: Recovery,
  composed: LandingTiming,
): Landing {
  const { state, item, rect } = drag;
  const placeholder = state.placeholder!;

  if (recovery === RECOVERY_DESTINATION) {
    if (
      item.isConnected &&
      item.parentElement === placeholder.parentElement &&
      placeholder.nextElementSibling !== item
    ) {
      item.before(placeholder);
    }
  } else {
    movePlaceholder(placeholder, homeInsertion(state.snapshot, item));
  }

  if (
    !placeholder.isConnected ||
    placeholder.parentElement !== item.parentElement
  ) {
    throw new Error('sortable/landing-placeholder-lost');
  }

  const { left: x, top: y } = placeholder.getBoundingClientRect();

  return {
    x,
    y,
    ...composed(drag.translatedX, drag.translatedY, x - rect.x, y - rect.y),
  };
}

type Kernel = DraggableController<LiftedDrag<State>>;

/**
 * The behavior `draggable` runs for one root. The kernel calls each hook as a
 * method of this instance. Every function handed elsewhere is created once per
 * instance, or once per operation when it closes over the operation, so the
 * kernel's identity coalescing sees the same step on every request. Operation
 * values live in `drag.state`; the instance holds only controller-lifetime ones.
 */
class SortableBehavior implements LiftedBehavior<State, ReorderResolution> {
  readonly lift: typeof lift = lift;
  declare readonly threshold?: number;

  /** What `sortable()` returns. Its methods do not depend on `this`. */
  readonly controller: SortableController;

  readonly #config: SortableConfig;
  readonly #window: Window;
  readonly #axis: InsertionGeometry;
  readonly #displacement: DisplacementSink | null;
  readonly #landing: LandingTiming | null;
  readonly #measuredBox: ((item: HTMLElement) => HTMLElement) | null;
  /** The version the next pulled snapshot carries. */
  #version = 0;

  constructor(root: HTMLElement, config: SortableConfig) {
    if (config.threshold !== undefined) {
      this.threshold = config.threshold;
    }

    this.#config = config;
    this.#window = root.ownerDocument.defaultView!;
    this.#axis = config.axis();
    this.#displacement = config.displacement ? config.displacement() : null;
    this.#landing = config.landing ?? null;
    this.#measuredBox = config.box ?? config.visual ?? null;

    const kernel: Kernel = draggable<State, ReorderResolution>(root, this);
    const displacement = this.#displacement;

    if (displacement) {
      kernel.use(() => {
        displacement.retire();
      });
    }

    this.controller = {
      invalidate: () => {
        kernel.requestStep(this.#reloadCollection);
      },
      requestCancel: (reason) => {
        kernel.requestCancel(reason);
      },
      requestDestroy: () => kernel.requestDestroy(),
    };
  }

  #pull(): CollectionSnapshot {
    this.#version += 1;
    return { items: [...this.#config.items()], version: this.#version };
  }

  /** Step, once per frame: the gap under the pointer, and the placeholder moved to it. */
  readonly #updateInsertion = (drag: LiftedDrag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state } = drag;
    const context = state.context!;
    const axis = this.#axis;

    state.pointerX = drag.x;
    state.pointerY = drag.y;

    const resolved = axis.resolve(state, context);

    if (resolved === null) {
      return;
    }

    state.insertion = resolved;

    if (placeholderAt(context.placeholder, resolved)) {
      return;
    }

    let stale = true;

    try {
      movePlaceholder(context.placeholder, resolved);
      axis.moved(
        state,
        context,
        this.#displacement ? this.#displacement.report : null,
      );
      stale = false;
    } finally {
      if (stale) {
        axis.invalidate();
      }
    }
  };

  /** Step, on scroll and resize: the cached geometry is stale. */
  readonly #invalidateGeometry = (): void => {
    this.#axis.invalidate();
  };

  /** Disposer, per operation: the cache releases the operation's elements. */
  readonly #retireAxis = (): void => {
    this.#axis.retire();
  };

  /** Step, on `invalidate()`: re-reads the collection and rebases the gap. */
  readonly #reloadCollection = (drag: LiftedDrag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state, item } = drag;
    const next = this.#pull();

    state.snapshot = next;

    if (next.items.includes(item)) {
      const insertion = state.insertion
        ? reconcileCollection(next, item, state.insertion)
        : null;

      if (insertion) {
        state.insertion = insertion;
      } else {
        drag.requestCancel(CANCEL_COLLECTION_INVALIDATED);
      }
    } else {
      drag.requestCancel(CANCEL_ITEM_REMOVED);
    }

    this.#axis.invalidate();
  };

  /**
   * The pressed item from a fresh collection, and the admission for it. A command
   * names its direction and is refused at the collection's edge.
   */
  #admission(event: Event, direction: KeyboardDirection | null) {
    const config = this.#config;
    const snapshot = this.#pull();
    const path = event.composedPath();
    const item = path.find((node) =>
      snapshot.items.includes(node as HTMLElement),
    ) as HTMLElement | undefined;

    if (!item) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (config.handle) {
      const named = config.handle(item);

      if (!named || !path.includes(named)) {
        return null;
      }

      handle = named;
    }

    const insertion =
      direction === null ? null : keyboardInsertion(snapshot, item, direction);

    if (direction !== null && !insertion) {
      return null;
    }

    const visual = config.visual ? config.visual(item) : item;
    const state: State = {
      item,
      snapshot,
      insertion,
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
      visual,
      box: config.box ? config.box(item) : visual,
      ...(handle ? { handle } : {}),
      state,
    };
  }

  admit(event: PointerEvent) {
    return event.altKey ? null : this.#admission(event, null);
  }

  command(event: KeyboardEvent) {
    const direction = event.isComposing ? null : directionOf(event.key);

    return direction === null ? null : this.#admission(event, direction);
  }

  activate(drag: LiftedDrag<State>): false | undefined {
    const { item, visual, box, state, boxWidth, boxHeight } = drag;
    const view = this.#window;

    // The second pull closes the window between the press and the threshold. A
    // command has no such window, and its gap belongs to its admission's snapshot.
    if (drag.pointerId !== -1) {
      const snapshot = this.#pull();

      if (!snapshot.items.includes(item)) {
        return false;
      }

      state.snapshot = snapshot;
      state.insertion = homeInsertion(snapshot, item);
    }

    const placeholder = createPlaceholder(
      view.document,
      { item, visual, box, rect: drag.rect },
      boxWidth,
      // Across the lift: a box around the visual keeps the part of its height the
      // visual did not take with it.
      visual.contains(box) ? boxHeight : boxHeight - box.offsetHeight,
      this.#config.placeholder ?? null,
    );

    drag.use(() => {
      placeholder.remove();
    });
    item.after(placeholder);

    if (!placeholder.isConnected || item.nextElementSibling !== placeholder) {
      throw new Error('sortable/insertion-placeholder-lost');
    }

    const updateInsertion = this.#updateInsertion;
    const invalidateGeometry = this.#invalidateGeometry;
    const frame = createFrameTask(view, () => {
      drag.requestStep(updateInsertion);
    });

    drag.use(() => {
      frame.cancel();
    });
    drag.use(this.#retireAxis);
    listenForInvalidation(view, drag.signal, () => {
      drag.requestStep(invalidateGeometry);
    });
    state.placeholder = placeholder;
    state.frame = frame;
    state.context = {
      placeholder,
      box: this.#measuredBox,
      settle: this.#displacement ? this.#displacement.settle : null,
      space: drag.itemSpace,
    };
    this.#axis.invalidate();

    return undefined;
  }

  start(drag: LiftedDrag<State>): void {
    this.#config.onStart?.(drag.item);
  }

  // oxlint-disable-next-line class-methods-use-this -- a hook the kernel calls as a method of the instance
  move(drag: LiftedDrag<State>): void {
    drag.translate(drag.x - drag.originX, drag.y - drag.originY);
    drag.state.frame!.schedule();
  }

  drop(drag: LiftedDrag<State>) {
    const { state, item } = drag;
    const pointer = drag.pointerId !== -1;
    const config = this.#config;

    state.frame!.cancel();

    if (pointer) {
      this.#axis.invalidate();
      state.pointerX = drag.x;
      state.pointerY = drag.y;
      state.insertion =
        this.#axis.resolve(state, state.context!) ?? state.insertion;
    }

    const insertion = state.insertion!;
    const request = buildReorderRequest(state.snapshot, item, insertion);

    state.request = request;
    movePlaceholder(state.placeholder!, insertion);

    if (pointer) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
    }

    return request.to === request.from
      ? null
      : (signal: AbortSignal) => config.onReorder(request, { signal });
  }

  settle(
    drag: LiftedDrag<State>,
    outcome: Outcome<ReorderResolution>,
  ): Landing | null {
    const recovery = recordResult(drag.state, outcome);
    const composed = this.#landing;

    return composed && recovery !== RECOVERY_IMMEDIATE
      ? landingTarget(drag, recovery, composed)
      : null;
  }

  end(drag: LiftedDrag<State>): void {
    this.#config.onEnd?.(drag.state.result!);
  }
}

/** Makes `root` a sortable collection. */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  return new SortableBehavior(root, config).controller;
}
