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
   * Animates the item home, dispatches {@link ReorderEvent} when `fireEvent`,
   * and resolves once it has landed. Idempotent — repeat calls return the
   * in-flight landing rather than starting a second one.
   */
  drop(fireEvent: boolean): Promise<void>;
  /** Tears the session down immediately, without landing or announcing. */
  cancel(): void;
}>;

/**
 * Lifts `item` and starts tracking the pointer. Creating the session *is* the
 * `pointerdown` transition: the footprint is inserted, the visual is lifted,
 * and a session-scoped `pointermove` listener starts following the pointer.
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
  const { left, top, width, height } = visual.getBoundingClientRect();
  const origin: Point = { x: left, y: top };
  const start: Point = { x: event.clientX, y: event.clientY };
  const fromIndex = items().indexOf(item);
  const tracking = new AbortController();

  const footprint = document.createElement('div');
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
  host.setPointerCapture(event.pointerId);
  toggleState(internals(item), DRAGGED_STATE, true);
  event.preventDefault();

  // Measured after the lift, so the footprint already occupies the gap.
  let rects = measure(items(), item);
  let delta: Point = ORIGIN;
  let toIndex = fromIndex;
  let frame = -1;
  let landing: Promise<void> | null = null;

  const clearVisual = () => {
    for (const prop of DRAGGING_PROPS) {
      visual.style.removeProperty(prop);
    }
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

  const land = async (fireEvent: boolean): Promise<void> => {
    flush();
    // Stop following the pointer the moment the gesture is over.
    tracking.abort();

    const fp = footprint.getBoundingClientRect();
    const animation = visual.animate(
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
      // Cancelled mid-flight — land anyway rather than stall the session.
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        footprint.replaceWith(item);
        clearVisual();

        if (fireEvent) {
          host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));
        }

        resolve();
      });
    });
  };

  host.addEventListener(
    'pointermove',
    (moveEvent: PointerEvent) => {
      delta = {
        x: moveEvent.clientX - start.x,
        y: moveEvent.clientY - start.y,
      };

      visual.style.transform = `translate(${delta.x}px, ${delta.y}px)`;

      // Below the threshold, leave any scheduled frame alone: the pointer has
      // been further out than this and that reposition is still owed.
      if (
        Math.abs(delta.x) < DRAG_THRESHOLD &&
        Math.abs(delta.y) < DRAG_THRESHOLD
      ) {
        return;
      }

      const { clientY } = moveEvent;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        reposition(clientY);
      });
    },
    { signal: tracking.signal },
  );

  return {
    drop(fireEvent) {
      landing ??= land(fireEvent);
      return landing;
    },

    cancel() {
      tracking.abort();
      cancelAnimationFrame(frame);
      footprint.remove();
      clearVisual();
      toggleState(internals(item), DRAGGED_STATE, false);
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
 * On `pointerdown` over a tracked item the item's visual element lifts to a
 * fixed position following the pointer. A footprint placeholder — a `<div>`
 * carrying a `data-footprint` attribute, sized inline to match the lifted item
 * — is inserted in the list to show the insertion point, and moves among
 * siblings as the pointer crosses their midpoints. Style it from the caller's
 * shadow styles via `::slotted([data-footprint])`.
 *
 * On `pointerup` the item animates back to the footprint position, lands there,
 * and a {@link ReorderEvent} is dispatched. The hook never mutates the DOM
 * order beyond the animation landing — the consumer handles final reordering if
 * needed. A `pointerdown` arriving while a previous item is still animating
 * home is ignored.
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
   * Ends the active gesture, if any. Fire-and-forget by design — the pointer
   * handlers cannot wait on the landing animation.
   */
  const finalize = (fireEvent: boolean): void => {
    const current = session;

    if (!current) {
      return;
    }

    current
      .drop(fireEvent)
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
      session?.cancel();
      session = null;
    },
  });

  useEvents(host, {
    pointerdown(event: PointerEvent) {
      if (session || !host.reorderable) {
        return;
      }

      const item = event
        .composedPath()
        .find(
          (n): n is ControlledElement =>
            n instanceof ControlledElement && itemSet.has(n),
        );

      if (item) {
        session = createDragSession(host, timing, getItems, item, event);
      }
    },

    pointerup() {
      finalize(true);
    },

    pointercancel() {
      finalize(false);
    },

    // Fires right after pointerup too, where the landing is already in flight
    // and `drop` hands back the same promise. It only does real work when the
    // browser takes capture away mid-gesture.
    lostpointercapture() {
      finalize(false);
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
