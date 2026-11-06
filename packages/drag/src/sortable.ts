/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits or
 * rejects it.
 */
import { draggable, type LiftedDrag, type Outcome } from './draggable.ts';
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
import { directionOf, keyboardInsertion } from './sortable/keyboard.ts';
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

/** Makes `root` a sortable collection. */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  const view = root.ownerDocument.defaultView!;
  const axis = config.axis();
  const sink = config.displacement ? config.displacement() : null;
  const timing = config.landing ?? null;
  const report = sink ? sink.report : null;
  const measuredBox = config.box ?? config.visual ?? null;
  let version = 0;

  const pull = (): CollectionSnapshot => {
    version += 1;
    return { items: [...config.items()], version };
  };

  const resolveSpatially = (drag: LiftedDrag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state } = drag;
    const context = state.context!;

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
      axis.moved(state, context, report);
      stale = false;
    } finally {
      if (stale) {
        axis.invalidate();
      }
    }
  };

  const invalidateGeometry = (): void => {
    axis.invalidate();
  };

  const applyCollectionChange = (drag: LiftedDrag<State> | null): void => {
    if (!drag) {
      return;
    }

    const { state, item } = drag;
    const next = pull();

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

    axis.invalidate();
  };

  /** The pressed item from a fresh collection, and the admission for it. */
  const resolveAdmission = (
    event: Event,
    insertionOf:
      | ((snapshot: CollectionSnapshot, item: HTMLElement) => Insertion | null)
      | null,
  ) => {
    const snapshot = pull();
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

    const insertion = insertionOf ? insertionOf(snapshot, item) : null;

    if (insertionOf && !insertion) {
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
  };

  /** Only with a landing composed: the one forced layout a drop adds. */
  const landingTarget = (
    drag: LiftedDrag<State>,
    recovery: Recovery,
    composed: LandingTiming,
  ) => {
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
  };

  const panel = draggable<State, ReorderResolution>(root, {
    lift,
    ...(config.threshold === undefined ? {} : { threshold: config.threshold }),

    admit(event) {
      return event.altKey ? null : resolveAdmission(event, null);
    },

    command(event) {
      const direction = event.isComposing ? null : directionOf(event.key);

      return direction === null
        ? null
        : resolveAdmission(event, (snapshot, item) =>
            keyboardInsertion(snapshot, item, direction),
          );
    },

    activate(drag) {
      const { item, visual, box, state, boxWidth, boxHeight } = drag;

      // The second pull closes the window between the press and the threshold. A
      // command has no such window, and its gap belongs to its admission's snapshot.
      if (drag.pointerId !== -1) {
        const snapshot = pull();

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
        config.placeholder ?? null,
      );

      drag.use(() => {
        placeholder.remove();
      });
      item.after(placeholder);

      if (!placeholder.isConnected || item.nextElementSibling !== placeholder) {
        throw new Error('sortable/insertion-placeholder-lost');
      }

      const frame = createFrameTask(view, () => {
        drag.requestStep(resolveSpatially);
      });

      drag.use(() => {
        frame.cancel();
      });
      drag.use(() => {
        axis.retire();
      });
      listenForInvalidation(view, drag.signal, () => {
        drag.requestStep(invalidateGeometry);
      });
      state.placeholder = placeholder;
      state.frame = frame;
      state.context = {
        placeholder,
        box: measuredBox,
        settle: sink ? sink.settle : null,
        space: drag.itemSpace,
      };
      axis.invalidate();

      return undefined;
    },

    start(drag) {
      config.onStart?.(drag.item);
    },

    move(drag) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      drag.state.frame!.schedule();
    },

    drop(drag) {
      const { state, item } = drag;
      const pointer = drag.pointerId !== -1;

      state.frame!.cancel();

      if (pointer) {
        axis.invalidate();
        state.pointerX = drag.x;
        state.pointerY = drag.y;
        state.insertion =
          axis.resolve(state, state.context!) ?? state.insertion;
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
        : (signal) => config.onReorder(request, { signal });
    },

    settle(drag, outcome) {
      const recovery = recordResult(drag.state, outcome);

      return timing && recovery !== RECOVERY_IMMEDIATE
        ? landingTarget(drag, recovery, timing)
        : null;
    },

    end(drag) {
      config.onEnd?.(drag.state.result!);
    },
  });

  if (sink) {
    panel.use(() => {
      sink.retire();
    });
  }

  return {
    invalidate() {
      panel.requestStep(applyCollectionChange);
    },
    requestCancel(reason) {
      panel.requestCancel(reason);
    },
    requestDestroy() {
      return panel.requestDestroy();
    },
  };
}
