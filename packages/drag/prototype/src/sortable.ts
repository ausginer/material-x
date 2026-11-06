/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits
 * or rejects it.
 */
import { draggable, type Drag, type Outcome } from './draggable.ts';
import {
  createFrameTask,
  listenForInvalidation,
} from './shared/invalidation.ts';
import type { LandingInstaller } from './shared/landing.ts';
import type {
  AxisInstaller,
  AxisRuntime,
  DisplacementInstaller,
} from './sortable/axis.ts';
import {
  buildReorderRequest,
  CHANGE_CANCEL,
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
  type SortableResult,
} from './sortable/domain.ts';
import { directionOf, keyboardInsertion } from './sortable/keyboard.ts';
import {
  createPlaceholder,
  movePlaceholder,
  type PlaceholderFactory,
  placeholderAt,
} from './sortable/placement.ts';

export { ReorderResolution };
export type { OnReorder, ReorderRequest, SortableResult };

export type SortableConfig = Readonly<{
  /** Pulled at each admission and on `invalidate()` during a drag. */
  items(): readonly HTMLElement[];
  axis: AxisInstaller;
  onReorder: OnReorder;
  onStart?(item: HTMLElement): void;
  onEnd?(result: SortableResult): void;
  threshold?: number;
  handle?(item: HTMLElement): HTMLElement | null;
  /** The node that is lifted. Defaults to the item. */
  visual?(item: HTMLElement): HTMLElement;
  /** The geometry source. Defaults to `visual`. */
  box?(item: HTMLElement): HTMLElement;
  /** Must return a detached element, which the library then owns. */
  placeholder?: PlaceholderFactory;
  landing?: LandingInstaller;
  displacement?: DisplacementInstaller;
}>;

export type SortableController = Readonly<{
  /** Re-reads the collection and the geometry during a drag. */
  invalidate(): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
}>;

const RECOVERY_DESTINATION = 1;
const RECOVERY_HOME = 2;
const RECOVERY_IMMEDIATE = 3;

type State = {
  readonly item: HTMLElement;
  snapshot: CollectionSnapshot;
  insertion: Insertion | null;
  pointerX: number;
  pointerY: number;
  request: ReorderRequest | null;
  noop: boolean;
  result: SortableResult | null;
  placeholder: HTMLElement | null;
  runtime: AxisRuntime | null;
  /** `drop` ran, so a later collection change no longer touches this drag. */
  released: boolean;
};

export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  const view = root.ownerDocument.defaultView!;
  const axis = config.axis();
  const sink = config.displacement ? config.displacement() : null;
  const timing = config.landing ? config.landing(view) : null;
  const report = sink ? sink.report : null;
  const measuredBox = config.box ?? config.visual ?? null;
  let version = 0;

  const pull = (): CollectionSnapshot => {
    version += 1;
    return { items: [...config.items()], version };
  };

  /** A frame fires with the drag it was scheduled for: `drop` cancels it. */
  const spatial = (drag: Drag<State> | null): void => {
    const { state } = drag!;
    const runtime = state.runtime!;

    state.pointerX = drag!.x;
    state.pointerY = drag!.y;

    const resolved = axis.resolve(state, runtime);

    if (resolved === null) {
      return;
    }

    state.insertion = resolved;

    if (placeholderAt(runtime.placeholder, resolved)) {
      return;
    }

    let stale = true;

    try {
      movePlaceholder(runtime.placeholder, resolved);
      axis.moved(state, runtime, report);
      stale = false;
    } finally {
      if (stale) {
        axis.invalidate();
      }
    }
  };

  const frame = createFrameTask(view, () => {
    panel.run(spatial);
  });

  const invalidated = (): void => {
    axis.invalidate();
  };

  const onLayoutChange = (): void => {
    panel.run(invalidated);
  };

  /** The pressed item from a fresh collection, and the admission for it. */
  const resolveAdmission = (
    event: Event,
    insertionOf: (
      snapshot: CollectionSnapshot,
      item: HTMLElement,
    ) => Insertion | null,
    requireInsertion: boolean,
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

    const insertion = insertionOf(snapshot, item);

    if (requireInsertion && !insertion) {
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
      noop: false,
      result: null,
      placeholder: null,
      runtime: null,
      released: false,
    };

    return {
      item,
      visual,
      box: config.box ? config.box(item) : visual,
      ...(handle ? { handle } : {}),
      state,
    };
  };

  const noInsertion = (): null => null;

  const panel = draggable<State, ReorderResolution>(root, {
    ...(config.threshold === undefined ? {} : { threshold: config.threshold }),

    admit(event) {
      return event.altKey ? null : resolveAdmission(event, noInsertion, false);
    },

    command(event) {
      const direction = event.isComposing ? null : directionOf(event.key);

      return direction === null
        ? null
        : resolveAdmission(
            event,
            (snapshot, item) => keyboardInsertion(snapshot, item, direction),
            true,
          );
    },

    activate(drag) {
      const { item, visual, box, state, boxWidth, boxHeight } = drag;

      if (drag.pointerId !== -1) {
        state.insertion = homeInsertion(state.snapshot, item);
      }

      // Across the lift: a box inside the visual keeps part of its height.
      const placeholder = createPlaceholder(
        view.document,
        { item, visual, box, rect: drag.rect },
        {
          width: boxWidth,
          height: box === visual ? boxHeight : boxHeight - box.offsetHeight,
        },
        config.placeholder ?? null,
      );

      drag.use(() => {
        placeholder.remove();
      });
      item.after(placeholder);

      if (!placeholder.isConnected || item.nextElementSibling !== placeholder) {
        throw new Error('sortable/insertion-placeholder-lost');
      }

      drag.use(frame.cancel);
      drag.use(axis.retire);
      listenForInvalidation(view, drag.signal, onLayoutChange);
      state.placeholder = placeholder;
      state.runtime = {
        placeholder,
        box: measuredBox,
        settle: sink ? sink.settle : null,
        space: drag.itemSpace,
      };
      axis.invalidate();
    },

    start(drag) {
      config.onStart?.(drag.item);
    },

    move(drag) {
      drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      frame.schedule();
    },

    drop(drag) {
      const { state, item } = drag;
      const pointer = drag.pointerId !== -1;

      frame.cancel();
      state.released = true;

      if (pointer) {
        axis.invalidate();
        state.pointerX = drag.x;
        state.pointerY = drag.y;
        state.insertion =
          axis.resolve(state, state.runtime!) ?? state.insertion;
      }

      const built = buildReorderRequest(state.snapshot, item, state.insertion!);

      if (!built) {
        throw new Error('sortable/release-no-request');
      }

      const { request, noop } = built;

      state.request = request;
      state.noop = noop;
      movePlaceholder(state.placeholder!, state.insertion!);

      if (pointer) {
        drag.translate(drag.x - drag.originX, drag.y - drag.originY);
      }

      return noop ? null : (signal) => config.onReorder(request, { signal });
    },

    settle(drag, outcome) {
      const recovery = decide(drag.state, outcome);

      return timing && recovery !== RECOVERY_IMMEDIATE
        ? landingTarget(drag, recovery)
        : null;
    },

    end(drag) {
      config.onEnd?.(drag.state.result!);
    },

    /** `invalidate()`: during a drag only, and never past its release. */
    apply(drag) {
      if (!drag || drag.state.released) {
        return;
      }

      const { state, item } = drag;
      const next = pull();

      state.snapshot = next;

      if (!next.items.includes(item)) {
        panel.requestCancel(CANCEL_ITEM_REMOVED);
      } else if (state.insertion) {
        const change = reconcileCollection(next, item, state.insertion);

        if (change.type === CHANGE_CANCEL) {
          panel.requestCancel(CANCEL_COLLECTION_INVALIDATED);
        } else {
          state.insertion = change.insertion;
        }
      }

      axis.invalidate();
    },
  });

  /** Records the terminal result, and says where the visual goes. */
  const decide = (
    state: State,
    outcome: Outcome<ReorderResolution>,
  ): number => {
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
  };

  /** Only with a landing composed: the one forced layout a drop adds. */
  const landingTarget = (drag: Drag<State>, recovery: number) => {
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
      const home = homeInsertion(state.snapshot, item);

      if (home) {
        movePlaceholder(placeholder, home);
      }
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
      ...timing!(drag.translatedX, drag.translatedY, x - rect.x, y - rect.y),
    };
  };

  if (sink) {
    panel.use(() => {
      sink.retire();
    });
  }

  return {
    invalidate() {
      panel.requestApply();
    },
    requestCancel(reason) {
      panel.requestCancel(reason);
    },
    requestDestroy() {
      return panel.requestDestroy();
    },
  };
}
