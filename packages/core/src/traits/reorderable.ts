import { Bool } from '../attribute.ts';
import { useEvents } from '../controllers/useEvents.ts';
import { useSlot } from '../controllers/useSlot.ts';
import { ControlledElement, internals, use } from '../element.ts';
import { toggleState } from '../utils/DOM.ts';
import { trait, type Interface, type Props, type Trait } from './attributes.ts';

const REORDER_EVENT_INIT: Readonly<EventInit> = {
  bubbles: true,
  cancelable: true,
  composed: true,
};

/**
 * Fired by a reorderable container when the user drops a dragged item, proposing
 * a move from `from` to `to`. It is an *intent*, dispatched before anything is
 * committed: the consumer owns the collection and decides whether and how to
 * apply the move, then updates its own state so the item lands at `to`.
 *
 * @remarks Bubbles and crosses shadow DOM boundaries. Call `preventDefault()` to
 * reject the move — the item animates back to where it started and nothing is
 * committed. The event is dispatched as the landing animation begins, so the
 * consumer's (possibly asynchronous) re-render runs *concurrently* with the
 * animation; the container watches its slot and only settles once the item has
 * actually reached `to`, so no synchronous `flushSync` is required.
 */
export class ReorderEvent extends Event {
  readonly item: HTMLElement;
  readonly from: number;
  readonly to: number;

  constructor(item: HTMLElement, from: number, to: number) {
    super('reorder', REORDER_EVENT_INIT);
    this.item = item;
    this.from = from;
    this.to = to;
  }
}

const $reorderable: unique symbol = Symbol('Reorderable');

/**
 * Element trait that exposes a presence-based `reorderable` boolean field,
 * indicating that the element's children can be dragged to reorder.
 */
export const Reorderable: Trait<{ reorderable: boolean }, typeof $reorderable> =
  trait({ reorderable: Bool }, $reorderable);

/**
 * Branded instance interface derived from {@link Reorderable}.
 */
export type Reorderable = Interface<typeof Reorderable>;

/**
 * Framework-facing props derived from {@link Reorderable}.
 */
export type ReorderableProps = Props<typeof Reorderable>;

type ReorderableHost = ControlledElement & Reorderable;

/** A viewport coordinate pair. */
type Point = Readonly<{ x: number; y: number }>;

const ORIGIN: Point = { x: 0, y: 0 };

const DRAGGED_STATE = 'drag';

/**
 * Pointer travel, in pixels, before the footprint starts tracking the pointer.
 * `pointermove` can fire immediately after `pointerdown` with a minimal delta,
 * which would jump the footprint away from its initial position.
 */
const DRAG_THRESHOLD = 8;

/**
 * How long, after the landing animation, to keep waiting for the consumer to
 * commit the reorder before settling anyway. With the intent dispatched up
 * front, a normal consumer commits *during* the animation, so this grace is only
 * spent when a render lands late (or the consumer ignores the event); it bounds
 * how long the session stays busy rather than hanging forever.
 */
const COMMIT_TIMEOUT = 500;

/**
 * Inline properties written onto the dragged visual while it is lifted. On
 * teardown each is restored to its pre-drag inline value, or removed if it had
 * none. No `z-index`: the lift renders in the top layer, above everything.
 */
const DRAGGING_PROPS: readonly string[] = [
  'position',
  'inset',
  'top',
  'left',
  'width',
  'height',
  'margin',
  'border',
  'transform',
];

/**
 * Maps each reorderable item to the inner visual element used as the drag
 * ghost. Set by {@link useReorderableItem}, read by {@link useReorderable}.
 */
const itemTargets = new WeakMap<ControlledElement, HTMLElement>();

function getItemTarget(item: ControlledElement): HTMLElement {
  return itemTargets.get(item) ?? item;
}

export type AnimationTiming = Pick<EffectTiming, 'duration' | 'easing'>;

/** Viewport rects of every item except `dragged`, keyed by visual element. */
function measure(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
): ReadonlyMap<HTMLElement, DOMRect> {
  const rects = new Map<HTMLElement, DOMRect>();

  for (const item of items) {
    if (item !== dragged) {
      const visual = getItemTarget(item);
      rects.set(visual, visual.getBoundingClientRect());
    }
  }

  return rects;
}

/** Centre point of a rect. */
function center(rect: DOMRect): Point {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Squared distance between two points — order-preserving without the sqrt. */
function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * The item whose centre is nearest the pointer, or `null` when the footprint's
 * own slot is nearest — meaning the footprint should stay put.
 *
 * The reorder area is treated as a plain field of rectangles, with no notion of
 * rows, columns, or a flow axis: a vertical list, a horizontal row, and a grid
 * are all just centres to measure against. Including the footprint as a
 * candidate is what lets the dragged item rest in its own slot, and gives the
 * gesture its hysteresis — the footprint only moves once another item's centre
 * is genuinely closer than its own.
 */
function nearestItem(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
  rects: ReadonlyMap<HTMLElement, DOMRect>,
  footprintCentre: Point,
  pointer: Point,
): ControlledElement | null {
  let best = distanceSquared(pointer, footprintCentre);
  let nearest: ControlledElement | null = null;

  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    // Missing rect means the item was slotted in mid-drag and never measured;
    // skip it rather than throw.
    const rect = rects.get(getItemTarget(item));

    if (rect) {
      const d = distanceSquared(pointer, center(rect));

      if (d < best) {
        best = d;
        nearest = item;
      }
    }
  }

  return nearest;
}

/** Landing index of the dragged item: non-dragged items before the footprint. */
function footprintIndex(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
  footprint: Element,
): number {
  let index = 0;

  for (const item of items) {
    const precedes =
      // oxlint-disable-next-line no-bitwise
      (footprint.compareDocumentPosition(item) &
        Node.DOCUMENT_POSITION_PRECEDING) !==
      0;

    if (item !== dragged && precedes) {
      index += 1;
    }
  }

  return index;
}

/**
 * The non-dragged item immediately after (`following`) or before the footprint
 * in DOM order, or `null` at that edge. Used to step the footprint one slot for
 * keyboard moves and to capture the landing anchor.
 */
function neighbor(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
  footprint: Element,
  following: boolean,
): ControlledElement | null {
  const bit = following
    ? Node.DOCUMENT_POSITION_FOLLOWING
    : Node.DOCUMENT_POSITION_PRECEDING;
  let result: ControlledElement | null = null;

  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    // oxlint-disable-next-line no-bitwise
    if ((footprint.compareDocumentPosition(item) & bit) !== 0) {
      // The first following item, or the last preceding one — both are the
      // footprint's nearest neighbour on that side.
      if (following) {
        return item;
      }

      result = item;
    }
  }

  return result;
}

/** Builds the placeholder that fills the lifted item's slot. */
function createFootprint(
  item: ControlledElement,
  width: number,
  height: number,
): HTMLDivElement {
  const footprint = document.createElement('div');
  footprint.dataset['footprint'] = '';
  // Physical width/height, not logical inline/block-size: the rect is measured
  // in physical pixels, so mapping it through logical sizes would swap the
  // dimensions under a vertical writing mode.
  footprint.style.width = `${width}px`;
  footprint.style.height = `${height}px`;
  footprint.setAttribute('aria-hidden', 'true');
  // Take the item's slot so the footprint is assigned to the same named slot and
  // lays out where the item did.
  if (item.slot) {
    footprint.slot = item.slot;
  }

  return footprint;
}

/** Pre-existing inline values of the properties the lift overwrites. */
type SavedStyles = ReadonlyMap<
  string,
  readonly [value: string, priority: string]
>;

/** Snapshots the inline {@link DRAGGING_PROPS} so teardown can restore them. */
function snapshotStyles(visual: HTMLElement): SavedStyles {
  const saved = new Map<string, readonly [string, string]>();

  for (const prop of DRAGGING_PROPS) {
    const value = visual.style.getPropertyValue(prop);

    if (value) {
      saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
    }
  }

  return saved;
}

/** Restores the snapshot from {@link snapshotStyles}, clearing what it lacks. */
function restoreStyles(visual: HTMLElement, saved: SavedStyles): void {
  for (const prop of DRAGGING_PROPS) {
    const value = saved.get(prop);

    if (value) {
      visual.style.setProperty(prop, value[0], value[1]);
    } else {
      visual.style.removeProperty(prop);
    }
  }
}

/** Pins the visual as a fixed-position box exactly over `rect`. */
function pinVisual(visual: HTMLElement, rect: DOMRect): void {
  visual.style.position = 'fixed';
  // Cancel the UA popover `inset: 0` before pinning top/left, or the ghost would
  // stretch to the viewport edges.
  visual.style.inset = 'auto';
  visual.style.top = `${rect.top}px`;
  visual.style.left = `${rect.left}px`;
  visual.style.width = `${rect.width}px`;
  visual.style.height = `${rect.height}px`;
  // Strip the UA popover chrome (`border: solid`, centering `margin: auto`).
  visual.style.margin = '0';
  visual.style.border = '0';
}

/**
 * Lifts the visual into the top layer via a manual popover. The top layer
 * escapes any transformed / filtered / contained ancestor, so `position: fixed`
 * with the item's viewport rect lands correctly — a plain fixed shadow
 * descendant would be offset by such an ancestor's containing block. It also
 * paints above everything (no z-index needed), and the element keeps its own
 * styles and inherited tokens because it stays put in the DOM; only its
 * rendering moves.
 */
function enterTopLayer(visual: HTMLElement, rect: DOMRect): void {
  pinVisual(visual, rect);
  visual.popover = 'manual';
  visual.showPopover();
}

/** Returns the visual from the top layer and clears the popover attribute. */
function exitTopLayer(visual: HTMLElement): void {
  if (visual.matches(':popover-open')) {
    visual.hidePopover();
  }
  visual.removeAttribute('popover');
}

/**
 * Observes the consumer's commit of a proposed move. The trait never reorders
 * the light DOM itself; instead it captures the item's target neighbour at drop
 * and watches assigned-node changes to recognise when the consumer has actually
 * placed the item there — anchoring to a neighbour rather than a raw index
 * survives the collection changing while the (possibly async) commit lands.
 */
type CommitTracker = Readonly<{
  /** Captures the item's landing anchor from the footprint's current slot. */
  capture(footprint: Element): void;
  /** Resolves once the consumer has committed, or after {@link COMMIT_TIMEOUT}. */
  wait(): Promise<void>;
  /** A slot change happened: resolve the wait if the item has now landed. */
  notify(): void;
  /** Force-resolves a pending wait unconditionally (abandoned gesture). */
  release(): void;
}>;

function createCommitTracker(
  items: () => readonly ControlledElement[],
  item: ControlledElement,
): CommitTracker {
  // The item the dragged one should end up before once committed (null = last).
  let anchor: ControlledElement | null = null;
  // Resolver for the in-flight "consumer has committed" wait, if any.
  let resolve: (() => void) | null = null;

  const committed = (): boolean => {
    const list = items();
    const index = list.indexOf(item);

    // Removed by the consumer — treat as resolved rather than wait forever.
    if (index === -1) {
      return true;
    }

    return anchor ? list[index + 1] === anchor : index === list.length - 1;
  };

  return {
    capture(footprint) {
      anchor = neighbor(items(), item, footprint, true);
    },

    wait() {
      if (committed()) {
        return Promise.resolve();
      }

      return new Promise<void>((res) => {
        let timer: ReturnType<typeof setTimeout>;

        const done = () => {
          clearTimeout(timer);
          resolve = null;
          res();
        };

        resolve = done;
        timer = setTimeout(done, COMMIT_TIMEOUT);
      });
    },

    notify() {
      if (resolve && committed()) {
        resolve();
      }
    },

    release() {
      resolve?.();
    },
  };
}

/**
 * One drag gesture, from `pointerdown` to the moment the item lands.
 *
 * @remarks Every value belonging to the gesture lives in the session closure,
 * so it is created and discarded with the drag and cannot leak into the next
 * one.
 */
type DragSession = Readonly<{
  /** The `pointerId` that initiated the gesture; only this pointer drives it. */
  pointerId: number;
  /**
   * Notifies the session that the container's assigned items changed, so a
   * landing waiting on the consumer's commit can settle once the item has
   * reached its proposed slot.
   */
  itemsChanged(): void;
  /**
   * Animates the item home and dispatches {@link ReorderEvent}, then resolves
   * once it has landed. Idempotent — repeat calls return the in-flight landing
   * rather than starting a second one. The trait does not reorder siblings; the
   * consumer does, in response to the event.
   */
  commit(): Promise<void>;
  /**
   * Tears a pending or live drag down synchronously, restoring the item and
   * announcing nothing. A no-op once a landing is in flight, so the
   * `lostpointercapture` that fires right after a normal `pointerup` cannot
   * interrupt the landing that `pointerup` started.
   */
  cancel(): Promise<void>;
  /**
   * Force-ends the gesture in any phase, including a landing in flight: stops
   * the animation, suppresses the event, and cleans up. For teardown that must
   * win unconditionally, such as the host disconnecting mid-gesture.
   */
  abandon(): Promise<void>;
}>;

/**
 * Starts tracking a potential drag. Creating the session *is* the `pointerdown`
 * transition, but nothing is lifted yet: the session watches the pointer and
 * only activates — inserting the footprint, lifting the visual, taking capture —
 * once the pointer has travelled past {@link DRAG_THRESHOLD}. A press that never
 * crosses the threshold stays a plain click: no footprint, no lift, no event.
 *
 * @param host - Container the drag belongs to, and the pointer capture target.
 * @param timing - Called at drop time for the landing animation's timing.
 * @param items - Current item children, re-read because slotting can change
 *   them mid-drag.
 * @param item - The item being dragged.
 * @param event - The `pointerdown` that started the gesture.
 */
function createDragSession(
  host: ReorderableHost,
  timing: () => AnimationTiming,
  items: () => readonly ControlledElement[],
  item: ControlledElement,
  event: PointerEvent,
): DragSession {
  const visual = getItemTarget(item);
  const start: Point = { x: event.clientX, y: event.clientY };
  const { pointerId } = event;
  const fromIndex = items().indexOf(item);
  const tracking = new AbortController();

  // Assigned by activate(); only ever read once activated is true.
  let footprint: HTMLDivElement;
  let origin: Point = ORIGIN;
  let rects: ReadonlyMap<HTMLElement, DOMRect> = new Map();
  // Set when scroll or resize invalidates the cached rects; the next hit test
  // remeasures rather than trusting stale viewport coordinates.
  let rectsDirty = false;
  let delta: Point = ORIGIN;
  let toIndex = fromIndex;
  let frame = -1;
  let activated = false;
  let settling: Promise<void> | null = null;
  // Set when a landing must be abandoned (host disconnected mid-animation):
  // stop the animation and skip the announcement, but still clean up.
  let canceled = false;
  let animation: Animation | undefined;
  // Captured drop-time neighbour and commit-observation for the consumer's move.
  const tracker = createCommitTracker(items, item);
  // Pre-existing inline values of the properties the lift overwrites, captured
  // at activation and restored on teardown so a custom target keeps its own
  // inline geometry/transform.
  let savedStyles: SavedStyles = new Map();

  /** Undoes the lift: footprint gone, styles cleared, dragged state removed. */
  const teardown = () => {
    footprint.remove();
    // Return the visual from the top layer before restoring its styles.
    exitTopLayer(visual);
    restoreStyles(visual, savedStyles);
    toggleState(internals(item), DRAGGED_STATE, false);
  };

  /**
   * Promotes a pending press into a live drag: the visual is lifted to a fixed
   * position, the footprint fills the gap, and the host takes pointer capture.
   * Runs once, the first time the pointer crosses the threshold.
   */
  const activate = () => {
    activated = true;

    const draggedRect = visual.getBoundingClientRect();
    origin = { x: draggedRect.left, y: draggedRect.top };

    footprint = createFootprint(item, draggedRect.width, draggedRect.height);
    item.before(footprint);

    // Snapshot before overwriting, so teardown can put back whatever inline
    // geometry the target already had.
    savedStyles = snapshotStyles(visual);
    enterTopLayer(visual, draggedRect);

    // Capture on the host: it is the only element guaranteed to stay in the
    // document for the whole gesture, so the pointer cannot escape the listeners.
    host.setPointerCapture(pointerId);
    toggleState(internals(item), DRAGGED_STATE, true);

    // Measured after the lift, so the footprint already occupies the gap.
    rects = measure(items(), item);
  };

  /** Current pointer position in viewport coordinates. */
  const currentPointer = (): Point => ({
    x: start.x + delta.x,
    y: start.y + delta.y,
  });

  /** Moves the footprint to the item slot nearest the pointer. */
  const reposition = (pointer: Point) => {
    frame = -1;

    // Scrolling or a reflow since the last measurement moved every item under
    // the pointer; refresh before hit testing against them.
    if (rectsDirty) {
      rects = measure(items(), item);
      rectsDirty = false;
    }

    const footprintCentre = center(footprint.getBoundingClientRect());
    const nearest = nearestItem(items(), item, rects, footprintCentre, pointer);

    // The footprint's own slot is nearest — nothing to do.
    if (!nearest) {
      return;
    }

    // Move the footprint to the near side of that item, in DOM order: if the
    // item currently follows the footprint the pointer has moved forward past
    // it, otherwise backward before it.
    const follows =
      // oxlint-disable-next-line no-bitwise
      (footprint.compareDocumentPosition(nearest) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
      0;

    if (follows) {
      nearest.after(footprint);
    } else {
      nearest.before(footprint);
    }

    toIndex = footprintIndex(items(), item, footprint);
    rects = measure(items(), item);
  };

  /**
   * Runs a reposition still owed to a frame. `pointerup` can arrive in the same
   * frame as the last `pointermove`, and the drop has to land where the pointer
   * finished — not where it was a frame ago.
   */
  const flush = () => {
    if (frame !== -1) {
      cancelAnimationFrame(frame);
      reposition(currentPointer());
    }
  };

  /** Animates the ghost to `endTransform` and pins it there once it lands. */
  const animateTo = async (endTransform: string): Promise<void> => {
    animation = visual.animate(
      [
        { transform: `translate(${delta.x}px, ${delta.y}px)` },
        { transform: endTransform },
      ],
      timing(),
    );

    toggleState(internals(item), DRAGGED_STATE, false);

    try {
      await animation.finished;
    } catch {
      // Finished rejects when the animation is cancelled — abandoned session or
      // a browser interruption. Fall through to pinning + teardown.
    }

    // Pin the landed transform so removing the (fill: none) effect doesn't snap
    // the ghost back to the drag delta for a frame.
    if (!canceled) {
      visual.style.transform = endTransform;
    }
  };

  const land = async (): Promise<void> => {
    flush();
    // Stop following the pointer the moment the gesture is over.
    tracking.abort();
    tracker.capture(footprint);

    // A no-op drop proposes nothing; only a real move is announced. The intent
    // goes out *before* the animation so the consumer's commit overlaps it.
    const move = toIndex !== fromIndex;
    const accepted =
      move && host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));

    // All cleanup lives in the finally, so a throw from `timing()`/`animate()` —
    // or an abandoned landing — can never leave the item stuck lifted with a
    // dangling footprint.
    try {
      if (accepted) {
        const fp = footprint.getBoundingClientRect();
        await animateTo(
          `translate(${fp.left - origin.x}px, ${fp.top - origin.y}px)`,
        );

        // Wait for the consumer's reorder to actually land the item at `to`, so
        // teardown never reveals it in the wrong slot for a frame.
        if (!canceled) {
          await tracker.wait();
        }
      } else {
        // No move, or the consumer rejected it: return the item home.
        await animateTo('translate(0px, 0px)');
      }
    } finally {
      teardown();
    }
  };

  host.addEventListener(
    'pointermove',
    (moveEvent: PointerEvent) => {
      // Only the initiating pointer drives the gesture; a second touch moving
      // over the host must not steer someone else's drag.
      if (moveEvent.pointerId !== pointerId) {
        return;
      }

      delta = {
        x: moveEvent.clientX - start.x,
        y: moveEvent.clientY - start.y,
      };

      // The threshold is a one-time activation gate. Until the pointer has
      // travelled far enough once, the press stays a plain click — nothing is
      // lifted. After activation the drag is live and every move re-hit-tests,
      // including a return close to the origin, which must carry the footprint
      // back rather than freeze it wherever it last went.
      if (!activated) {
        if (
          Math.abs(delta.x) < DRAG_THRESHOLD &&
          Math.abs(delta.y) < DRAG_THRESHOLD
        ) {
          return;
        }

        activate();
        // Now a real drag: suppress text selection and native behaviours. Held
        // off pointerdown so a plain click keeps its focus and activation.
        moveEvent.preventDefault();
      }

      visual.style.transform = `translate(${delta.x}px, ${delta.y}px)`;

      const pointer = currentPointer();

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        reposition(pointer);
      });
    },
    { signal: tracking.signal },
  );

  // Scroll (of the list or any ancestor) and viewport resize shift the items in
  // viewport space without a pointermove, invalidating the cached rects. Mark
  // them stale and re-hit-test against the pointer's last position, so a drop or
  // a stationary-pointer scroll still lands correctly.
  const invalidate = () => {
    if (!activated) {
      return;
    }

    rectsDirty = true;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      reposition(currentPointer());
    });
  };

  // `capture` catches scrolls from descendant scrollers (scroll does not bubble).
  addEventListener('scroll', invalidate, {
    capture: true,
    passive: true,
    signal: tracking.signal,
  });
  addEventListener('resize', invalidate, {
    passive: true,
    signal: tracking.signal,
  });

  return {
    pointerId,

    itemsChanged() {
      // Slot changed: if we are waiting on the consumer and the item has now
      // reached its proposed slot, the landing can settle.
      tracker.notify();
    },

    commit() {
      if (!settling) {
        if (activated) {
          settling = land();
        } else {
          // A press that never crossed the threshold is a click, not a drop:
          // tear down quietly and announce nothing.
          tracking.abort();
          settling = Promise.resolve();
        }
      }

      return settling;
    },

    cancel() {
      // A landing already owns its teardown; a stray lostpointercapture right
      // after pointerup must not interrupt it.
      if (!settling) {
        tracking.abort();
        cancelAnimationFrame(frame);

        if (activated) {
          teardown();
        }

        settling = Promise.resolve();
      }

      return settling;
    },

    abandon() {
      // Suppress any announcement whatever phase we are in.
      canceled = true;

      if (settling) {
        // A landing is in flight: stop it. `land`'s finally still runs teardown.
        animation?.cancel();
        // Unblock a commit-wait too, so teardown isn't held by the timeout.
        tracker.release();
      } else {
        tracking.abort();
        cancelAnimationFrame(frame);

        if (activated) {
          teardown();
        }

        settling = Promise.resolve();
      }

      return settling;
    },
  };
}

/** Announces reorder feedback to assistive tech via a live region. */
type Announce = (message: string) => void;

/**
 * One keyboard-driven reorder gesture, from grab to drop. The item is lifted the
 * same way a pointer drag lifts it — into the top layer over a footprint — but
 * the destination is chosen with arrow keys rather than pointer coordinates, and
 * each step is announced by position so a screen-reader user can follow it. The
 * drop dispatches the same {@link ReorderEvent} intent and waits for the same
 * consumer commit, so keyboard and pointer share one transaction model.
 */
type KeyboardSession = Readonly<{
  /** Steps the footprint one slot back (`-1`) or forward (`1`). */
  move(step: -1 | 1): void;
  /**
   * Notifies the session that assigned items changed, so a drop waiting on the
   * consumer's commit settles as soon as the item reaches its slot rather than
   * lingering until the timeout.
   */
  itemsChanged(): void;
  /** Dispatches the intent and resolves once the consumer commits (or times out). */
  commit(): Promise<void>;
  /** Aborts the grab, returning the item home and announcing nothing was moved. */
  cancel(): Promise<void>;
  /** Force-ends the gesture in any phase (e.g. the host disconnecting). */
  abandon(): Promise<void>;
}>;

/**
 * Starts a keyboard reorder: lifts `item` immediately (there is no travel
 * threshold to arm — the grab key is the intent) and returns handles the caller
 * drives from subsequent key presses.
 *
 * @param host - Container the reorder belongs to, and the event target.
 * @param items - Current item children, re-read because slotting can change them.
 * @param item - The grabbed item.
 * @param announce - Sink for the position feedback announced at each step.
 */
function createKeyboardSession(
  host: ReorderableHost,
  items: () => readonly ControlledElement[],
  item: ControlledElement,
  announce: Announce,
): KeyboardSession {
  const visual = getItemTarget(item);
  const fromIndex = items().indexOf(item);
  const tracker = createCommitTracker(items, item);
  let toIndex = fromIndex;
  let settling: Promise<void> | null = null;
  let canceled = false;

  const total = (): number => items().length;

  const draggedRect = visual.getBoundingClientRect();
  const footprint = createFootprint(
    item,
    draggedRect.width,
    draggedRect.height,
  );
  item.before(footprint);
  const savedStyles = snapshotStyles(visual);
  enterTopLayer(visual, draggedRect);
  toggleState(internals(item), DRAGGED_STATE, true);
  announce(
    `Grabbed. Item ${fromIndex + 1} of ${total()}. ` +
      `Use the arrow keys to move, space or enter to drop, escape to cancel.`,
  );

  const teardown = () => {
    footprint.remove();
    exitTopLayer(visual);
    restoreStyles(visual, savedStyles);
    toggleState(internals(item), DRAGGED_STATE, false);
  };

  return {
    move(step) {
      if (settling) {
        return;
      }

      // Step the footprint past its nearest neighbour on that side; at the edge
      // there is none, so the move is a no-op with nothing new to announce.
      const target = neighbor(items(), item, footprint, step > 0);

      if (!target) {
        return;
      }

      if (step > 0) {
        target.after(footprint);
      } else {
        target.before(footprint);
      }

      toIndex = footprintIndex(items(), item, footprint);
      // Move the lifted visual onto the footprint's new slot so the item is seen
      // to travel, not just the placeholder.
      pinVisual(visual, footprint.getBoundingClientRect());
      announce(`Item ${toIndex + 1} of ${total()}.`);
    },

    itemsChanged() {
      tracker.notify();
    },

    commit() {
      if (settling) {
        return settling;
      }

      settling = (async () => {
        const move = toIndex !== fromIndex;
        const accepted =
          move &&
          host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));

        try {
          if (accepted) {
            tracker.capture(footprint);
            announce(`Dropped. Item ${toIndex + 1} of ${total()}.`);

            if (!canceled) {
              await tracker.wait();
            }
          } else {
            // No move, or the consumer rejected it: the item is already home.
            announce(
              move
                ? 'Reorder cancelled.'
                : `Item ${fromIndex + 1} of ${total()}.`,
            );
          }
        } finally {
          teardown();
        }
      })();

      return settling;
    },

    cancel() {
      if (!settling) {
        announce('Reorder cancelled.');
        teardown();
        settling = Promise.resolve();
      }

      return settling;
    },

    abandon() {
      canceled = true;

      if (settling) {
        // Unblock a commit-wait so teardown isn't held by the timeout.
        tracker.release();
      } else {
        teardown();
        settling = Promise.resolve();
      }

      return settling;
    },
  };
}

/**
 * Registers pointer-based drag-and-drop reorder coordination on a container
 * host.
 *
 * The host must implement {@link Reorderable}. Drag behaviour is gated by
 * `host.reorderable` — `pointerdown` is a no-op when false.
 *
 * A drag begins only on a primary press (left button / first touch) over a
 * tracked item. If the item contains a `[data-handle]` element the press must
 * land on that handle; items without one are draggable by their whole surface.
 *
 * The press does not lift anything until the pointer has travelled past the
 * activation threshold — a click, or a press with no meaningful movement, leaves
 * the DOM untouched and dispatches nothing. Once the threshold is crossed the
 * item's visual element lifts into the top layer (as a manual popover) and
 * follows the pointer — escaping any transformed or contained ancestor while
 * keeping its own styles — and a footprint placeholder — a `<div>` carrying a
 * `data-footprint` attribute, sized
 * inline to match the lifted item — is inserted to show the insertion point. The
 * footprint moves to whichever item slot is nearest the pointer, treating the
 * reorder area as a plain field of rectangles — so vertical lists, horizontal
 * rows, and grids are all handled without configuration. Style the footprint
 * from the caller's shadow styles via `::slotted([data-footprint])`.
 *
 * On `pointerup`, if the item would actually move, a {@link ReorderEvent} intent
 * is dispatched and the lifted visual animates to the footprint's position. The
 * hook never reorders siblings itself — the consumer applies the move in
 * response to the event; because the intent is dispatched as the animation
 * begins, the consumer's (async) re-render overlaps it, and the hook watches its
 * slot to settle only once the item has reached the proposed slot, so no
 * `flushSync` is needed. A no-op drop (or a `preventDefault()`'d intent) just
 * animates the item home and announces nothing. On `pointercancel` or lost
 * capture the item is restored to its original position. A `pointerdown`
 * arriving while a previous item is still settling is ignored.
 *
 * The same reorder is available from the keyboard: pressing space or enter on an
 * item's `[data-handle]` grabs it (a handle is required — the whole-surface
 * affordance is pointer-only), the arrow keys step it through the siblings, and
 * space/enter drops it while escape cancels. A keyboard drop dispatches the same
 * {@link ReorderEvent} intent and awaits the same consumer commit as a pointer
 * drop; each step is announced by position through a visually hidden live region
 * the hook owns in the host's shadow root, and focus returns to the handle once
 * the reorder settles.
 *
 * @param host - Container host implementing {@link Reorderable}.
 * @param timing - Called at drop time for the landing animation's timing, so
 *   the values can track live CSS custom properties.
 * @param slotSelector - Selector for the slot that provides item children.
 */
export function useReorderable(
  host: ReorderableHost,
  timing: () => AnimationTiming,
  slotSelector = 'slot',
): void {
  let items: readonly ControlledElement[] = [];
  let itemSet: ReadonlySet<ControlledElement> = new Set();
  // Non-null for the whole gesture, including the landing animation, so it
  // doubles as the "a pointer drag is already happening" guard.
  let session: DragSession | null = null;
  // The active keyboard reorder, if any — the equivalent guard for key control.
  let keyboard: KeyboardSession | null = null;
  // The handle that started the keyboard grab, refocused after it settles.
  let keyboardItem: ControlledElement | null = null;
  // Lazily created shadow-owned live region for keyboard reorder announcements.
  let liveRegion: HTMLElement | null = null;

  const getItems = () => items;

  /** Announces `message` to assistive tech via a visually hidden live region. */
  const announce: Announce = (message) => {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      // Visually hidden but exposed to assistive tech. Injected without a
      // stylesheet, so the utility styles are inline here by necessity.
      liveRegion.style.cssText =
        'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';
      // Kept in the shadow root so it is never slotted or seen as a child item.
      (host.shadowRoot ?? host).append(liveRegion);
    }

    liveRegion.textContent = message;
  };

  useSlot<ControlledElement>(host, slotSelector, (_, nodes) => {
    items = nodes.filter(
      (n): n is ControlledElement => n instanceof ControlledElement,
    );
    itemSet = new Set(items);
    // A landing (pointer or keyboard) may be waiting for this change to confirm
    // the consumer's commit.
    session?.itemsChanged();
    keyboard?.itemsChanged();
  });

  /**
   * Ends the active gesture, if any: `commit` lands the item and dispatches,
   * otherwise the gesture is cancelled and the item restored. Fire-and-forget by
   * design — the pointer handlers cannot wait on the landing animation.
   */
  const settle = (commit: boolean): void => {
    const current = session;

    if (!current) {
      return;
    }

    (commit ? current.commit() : current.cancel())
      .finally(() => {
        // Released even if the landing threw, so a failure cannot strand the
        // session and block every future drag. Only release if nothing has
        // claimed the slot in the meantime.
        if (session === current) {
          session = null;
        }
      })
      .catch(reportError);
  };

  /**
   * Ends the active keyboard reorder, then returns focus to the drag handle so
   * the user keeps their place — the item may have been re-rendered by the
   * consumer's commit, so the handle is re-resolved from its current subtree.
   */
  const settleKeyboard = (commit: boolean): void => {
    const current = keyboard;
    const grabbed = keyboardItem;

    if (!current) {
      return;
    }

    (commit ? current.commit() : current.cancel())
      .finally(() => {
        if (keyboard === current) {
          keyboard = null;
          keyboardItem = null;
        }

        grabbed?.querySelector<HTMLElement>('[data-handle]')?.focus();
      })
      .catch(reportError);
  };

  use(host, {
    disconnected() {
      // The session owns a listener outside the useEvents lifecycle; without
      // this it would strand a non-null session and block every future drag.
      // Abandon rather than cancel so a landing in flight is stopped too, not
      // left to finish and dispatch on a detached host.
      session?.abandon().catch(reportError);
      session = null;
      keyboard?.abandon().catch(reportError);
      keyboard = null;
      keyboardItem = null;
    },
  });

  useEvents(host, {
    keydown(event: KeyboardEvent) {
      // While a keyboard reorder is live, arrows move it and space/enter/escape
      // resolve it — the grab has swallowed the item's normal key behaviour.
      if (keyboard) {
        switch (event.key) {
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            keyboard.move(-1);
            break;
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            keyboard.move(1);
            break;
          case ' ':
          case 'Enter':
            event.preventDefault();
            settleKeyboard(true);
            break;
          case 'Escape':
            event.preventDefault();
            settleKeyboard(false);
            break;
          case 'Tab':
            // Let focus leave, but cancel the grab first so it can't linger.
            settleKeyboard(false);
            break;
          default:
            break;
        }

        return;
      }

      // Otherwise a grab starts on space/enter pressed on an item's handle.
      // Keyboard reorder requires that explicit, focusable handle: the
      // whole-surface affordance is pointer-only, since there is no key that
      // could start a grab without clashing with the item's own activation.
      if (
        session ||
        !host.reorderable ||
        (event.key !== ' ' && event.key !== 'Enter')
      ) {
        return;
      }

      const path = event.composedPath();
      const itemIndex = path.findIndex(
        (n) => n instanceof ControlledElement && itemSet.has(n),
      );

      if (itemIndex === -1) {
        return;
      }

      const handle = path
        .slice(0, itemIndex)
        .find((n) => n instanceof Element && n.hasAttribute('data-handle'));

      if (!handle) {
        return;
      }

      event.preventDefault();
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      keyboardItem = path[itemIndex] as ControlledElement;
      keyboard = createKeyboardSession(host, getItems, keyboardItem, announce);
    },

    pointerdown(event: PointerEvent) {
      // Only a primary press starts a drag: no right-click, no secondary touch.
      if (
        session ||
        keyboard ||
        !host.reorderable ||
        event.button !== 0 ||
        !event.isPrimary
      ) {
        return;
      }

      const path = event.composedPath();
      const itemIndex = path.findIndex(
        (n) => n instanceof ControlledElement && itemSet.has(n),
      );

      if (itemIndex === -1) {
        return;
      }

      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const item = path[itemIndex] as ControlledElement;

      // If the item declares a drag handle, the press must land on it. Items
      // without a `[data-handle]` stay draggable by their whole surface, so the
      // handle is opt-in strictness rather than a hard requirement.
      if (item.querySelector('[data-handle]')) {
        const onHandle = path
          .slice(0, itemIndex)
          .some((n) => n instanceof Element && n.hasAttribute('data-handle'));

        if (!onHandle) {
          return;
        }
      }

      session = createDragSession(host, timing, getItems, item, event);
    },

    pointerup(event: PointerEvent) {
      if (session?.pointerId === event.pointerId) {
        settle(true);
      }
    },

    pointercancel(event: PointerEvent) {
      if (session?.pointerId === event.pointerId) {
        settle(false);
      }
    },

    // Fires right after pointerup too, where the landing is already in flight
    // and `cancel` no-ops onto the same promise. It only does real work when the
    // browser takes capture away mid-gesture.
    lostpointercapture(event: PointerEvent) {
      if (session?.pointerId === event.pointerId) {
        settle(false);
      }
    },
  });
}

/**
 * Registers the inner visual element of a reorderable item so that
 * {@link useReorderable} can lift it during a drag.
 *
 * @param host - The item host element.
 * @param target - Inner visual element used as the drag ghost. Defaults to
 *   `host`.
 */
export function useReorderableItem(
  host: ControlledElement,
  target: HTMLElement = host,
): void {
  itemTargets.set(host, target);
}
