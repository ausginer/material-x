import { Bool } from '../attribute.ts';
import { useEvents } from '../controllers/useEvents.ts';
import { useSlot } from '../controllers/useSlot.ts';
import { ControlledElement, internals, use } from '../element.ts';
import { toggleState } from '../utils/DOM.ts';
import { trait, type Interface, type Props, type Trait } from './attributes.ts';

const REORDER_EVENT_INIT: Readonly<EventInit> = {
  bubbles: true,
  cancelable: false,
  composed: true,
};

/**
 * Fired by a reorderable container when the user drops a dragged item at a new
 * position. DOM reordering is left to the consumer.
 *
 * @remarks This post-commit notification bubbles and crosses shadow DOM
 * boundaries. It is not cancelable because the drag has already landed.
 *
 * Reorder **synchronously** inside the handler (e.g. a synchronous `setState`),
 * not in a microtask, `await`, or a later frame. The dropped item is restored
 * to its original position as this event is dispatched, so a deferred reorder
 * makes it visibly snap back to its old slot for a frame before landing in the
 * new one.
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
 * Inline properties written onto the dragged visual while it is lifted, removed
 * again once it lands.
 */
const DRAGGING_PROPS: readonly string[] = [
  'position',
  'top',
  'left',
  'width',
  'z-index',
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

/**
 * First item whose midpoint the pointer sits above, i.e. the item the footprint
 * should precede. `null` means "past every item" — append to the end.
 */
function findInsertionPoint(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
  rects: ReadonlyMap<HTMLElement, DOMRect>,
  pointerY: number,
): ControlledElement | null {
  for (const item of items) {
    if (item === dragged) {
      continue;
    }

    // Missing rect means the item was slotted in mid-drag and never measured;
    // skip it rather than throw.
    const rect = rects.get(getItemTarget(item));

    if (rect && pointerY < rect.top + rect.height / 2) {
      return item;
    }
  }

  return null;
}

/** Index the dragged item would occupy once removed from its old position. */
function landingIndex(
  items: readonly ControlledElement[],
  dragged: ControlledElement,
  before: ControlledElement | null,
): number {
  if (!before) {
    return items.length - 1;
  }

  let index = 0;

  for (const item of items) {
    if (item === before) {
      break;
    }

    if (item !== dragged) {
      index += 1;
    }
  }

  return index;
}

/**
 * One drag gesture, from `pointerdown` to the moment the item lands.
 *
 * @remarks Every value belonging to the gesture lives in the session closure,
 * so it is created and discarded with the drag and cannot leak into the next
 * one.
 */
type DragSession = Readonly<{
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
  let delta: Point = ORIGIN;
  let toIndex = fromIndex;
  let frame = -1;
  let activated = false;
  let settling: Promise<void> | null = null;
  // Set when a landing must be abandoned (host disconnected mid-animation):
  // stop the animation and skip the announcement, but still clean up.
  let canceled = false;
  let animation: Animation | undefined;

  const clearVisual = () => {
    for (const prop of DRAGGING_PROPS) {
      visual.style.removeProperty(prop);
    }
  };

  /** Undoes the lift: footprint gone, styles cleared, dragged state removed. */
  const teardown = () => {
    footprint.remove();
    clearVisual();
    toggleState(internals(item), DRAGGED_STATE, false);
  };

  /**
   * Promotes a pending press into a live drag: the visual is lifted to a fixed
   * position, the footprint fills the gap, and the host takes pointer capture.
   * Runs once, the first time the pointer crosses the threshold.
   */
  const activate = () => {
    activated = true;

    const { left, top, width, height } = visual.getBoundingClientRect();
    origin = { x: left, y: top };

    footprint = document.createElement('div');
    footprint.dataset['footprint'] = '';
    footprint.style.inlineSize = `${width}px`;
    footprint.style.blockSize = `${height}px`;
    footprint.setAttribute('aria-hidden', 'true');
    item.before(footprint);

    visual.style.position = 'fixed';
    visual.style.top = `${top}px`;
    visual.style.left = `${left}px`;
    visual.style.width = `${width}px`;
    visual.style.zIndex = '9999';

    // Capture on the host: it is the only element guaranteed to stay in the
    // document for the whole gesture, so the pointer cannot escape the listeners.
    host.setPointerCapture(pointerId);
    toggleState(internals(item), DRAGGED_STATE, true);

    // Measured after the lift, so the footprint already occupies the gap.
    rects = measure(items(), item);
  };

  /** Moves the footprint to track the pointer, and with it the landing index. */
  const reposition = (pointerY: number) => {
    frame = -1;

    const before = findInsertionPoint(items(), item, rects, pointerY);

    if (footprint.nextElementSibling === before) {
      return;
    }

    if (before) {
      before.before(footprint);
    } else {
      host.append(footprint);
    }

    toIndex = landingIndex(items(), item, before);
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
      reposition(start.y + delta.y);
    }
  };

  const land = async (): Promise<void> => {
    flush();
    // Stop following the pointer the moment the gesture is over.
    tracking.abort();

    // All cleanup lives in the finally, so a throw from `timing()` or
    // `animate()` — or an abandoned landing — can never leave the item stuck
    // lifted with a dangling footprint.
    try {
      const fp = footprint.getBoundingClientRect();
      animation = visual.animate(
        [
          { transform: `translate(${delta.x}px, ${delta.y}px)` },
          {
            transform: `translate(${fp.left - origin.x}px, ${fp.top - origin.y}px)`,
          },
        ],
        timing(),
      );

      toggleState(internals(item), DRAGGED_STATE, false);

      try {
        await animation.finished;
      } catch {
        // Finished rejects when the animation is cancelled — either because the
        // session was abandoned, or the browser interrupted it. Fall through.
      }

      // Abandoned mid-flight (e.g. host disconnected): clean up, announce nothing.
      if (!canceled) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            // The trait never reorders siblings itself — the consumer does, in
            // response to the event. Dispatch before the finally clears the lift
            // so a consumer that reorders synchronously lands the item in its new
            // slot without a flash.
            if (!canceled) {
              host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));
            }

            resolve();
          });
        });
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

      const { clientY } = moveEvent;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        reposition(clientY);
      });
    },
    { signal: tracking.signal },
  );

  return {
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
 * item's visual element lifts to a fixed position following the pointer, and a
 * footprint placeholder — a `<div>` carrying a `data-footprint` attribute, sized
 * inline to match the lifted item — is inserted to show the insertion point,
 * moving among siblings as the pointer crosses their midpoints. Style it from
 * the caller's shadow styles via `::slotted([data-footprint])`.
 *
 * On `pointerup` the lifted visual animates to the footprint's position and a
 * {@link ReorderEvent} is dispatched. The hook never reorders siblings itself —
 * the consumer performs the actual reorder in response to the event, and should
 * do so synchronously to avoid a snap-back flash (see {@link ReorderEvent}). On
 * `pointercancel` or lost capture the item is restored to its original position
 * and nothing is dispatched. A `pointerdown` arriving while a previous item is
 * still animating home is ignored.
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
  // doubles as the "a drag is already happening" guard.
  let session: DragSession | null = null;

  const getItems = () => items;

  useSlot<ControlledElement>(host, slotSelector, (_, nodes) => {
    items = nodes.filter(
      (n): n is ControlledElement => n instanceof ControlledElement,
    );
    itemSet = new Set(items);
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

  use(host, {
    disconnected() {
      // The session owns a listener outside the useEvents lifecycle; without
      // this it would strand a non-null session and block every future drag.
      // Abandon rather than cancel so a landing in flight is stopped too, not
      // left to finish and dispatch on a detached host.
      session?.abandon().catch(reportError);
      session = null;
    },
  });

  useEvents(host, {
    pointerdown(event: PointerEvent) {
      // Only a primary press starts a drag: no right-click, no secondary touch.
      if (
        session ||
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

    pointerup() {
      settle(true);
    },

    pointercancel() {
      settle(false);
    },

    // Fires right after pointerup too, where the landing is already in flight
    // and `cancel` no-ops onto the same promise. It only does real work when the
    // browser takes capture away mid-gesture.
    lostpointercapture() {
      settle(false);
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
