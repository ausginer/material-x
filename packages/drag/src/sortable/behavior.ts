import type { Admission, Behavior, Drag } from '../draggable.ts';
import type { Lifter } from '../lift.ts';
import {
  createFrameTask,
  listenForInvalidation,
} from '../shared/invalidation.ts';
import type {
  AxisInstaller,
  DisplacementInstaller,
  DisplacementSink,
  InsertionGeometry,
} from './axis.ts';
import { homeInsertion } from './collection.ts';
import type {
  CollectionSnapshot,
  OnReorder,
  ReorderResolution,
  SortableResult,
} from './domain.ts';
import {
  type KeyboardDirection,
  directionOf,
  keyboardInsertion,
} from './keyboard.ts';
import type { Landing } from './landing.ts';
import { SortableOperation } from './operation.ts';
import { type PlaceholderFactory, createPlaceholder } from './placement.ts';

export type SortableConfig = Readonly<{
  /**
   * The collection, pulled at each admission, at activation, and on `invalidate()`
   * during a drag. It holds no duplicates and is in DOM order under `root`.
   *
   * The library keeps the array returned at activation, or at the last
   * `invalidate()`, until the drop, and doesn't copy it. In that window, change it
   * in place only when the change is complete before the library can read again:
   * the array changed, the DOM showing the change, and `invalidate()` called. In a
   * callback the library called, such as `onStart`, complete it before the callback
   * returns. In your own code, such as an event handler, a timer or an `await`
   * continuation, complete it within the microtasks that code queues. Otherwise
   * leave the array unchanged, return a new array from later calls, and call
   * `invalidate()` once the DOM shows the change. Never change it in place from
   * `handle`, `visual`, `box` or the placeholder element's own callbacks. Between
   * drags, during a press and from the drop on, change it freely.
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
  landing?: Landing;
  displacement?: DisplacementInstaller;
}>;

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
 * The behavior `draggable` runs for one root: admission and activation. Each
 * step it requests is the same function on every request, or the axis's method
 * passed with the axis, so the kernel coalesces a step requested again before it
 * runs. A function it creates to hand elsewhere is created once per instance, or
 * once per operation when it closes over the operation. It holds only
 * controller-lifetime values, and the operation reads the ones it needs through
 * it.
 */
export class SortableBehavior implements Behavior<
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
  readonly landing: Landing | null;
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

  admit(event: PointerEvent): Admission<PressState> | null {
    return event.altKey ? null : this.#admission(event, null);
  }

  command(event: KeyboardEvent): Admission<PressState> | null {
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

    // A pointer operation starts in its home gap, so one object serves as both.
    const home = homeInsertion(snapshot, drag.item);
    const insertion =
      state.direction === null
        ? home
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
    drag.use(this.axis.retire, this.axis);
    listenForInvalidation(this.#window, drag.signal, () => {
      drag.requestStep(this.axis.invalidate, this.axis);
    });

    const operation = new SortableOperation(
      this,
      drag,
      lift,
      state.direction,
      snapshot,
      home,
      insertion,
      frame,
      {
        placeholder,
        box: this.#measuredBox,
        displacement: this.displacement ?? null,
        space: lift.itemSpace,
      },
    );

    this.axis.invalidate();

    return operation;
  }

  #pull(): CollectionSnapshot {
    this.#version += 1;
    return { items: this.config.items(), version: this.#version };
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
