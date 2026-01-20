import { ReactiveElement } from '../elements/reactive-element.ts';
import { Checkable } from '../traits/checkable.ts';
import { Disableable } from '../traits/disableable.ts';
import { Valuable } from '../traits/valuable.ts';
import { DEFAULT_EVENT_INIT } from '../utils/DOM.ts';
import { when } from '../utils/runtime.ts';
import { useAttributes } from './useAttributes.ts';
import { useEvents } from './useEvents.ts';
import { useKeyboard, type KeyboardListener } from './useKeyboard.ts';
import { useSlot } from './useSlot.ts';

type Host = ReactiveElement & Valuable;
type Item = ReactiveElement & Checkable & Valuable & Disableable;

// Match native radio behavior by emitting the same events on selection.
const CHANGE_EVENTS = ['input', 'change'] as const;

function notify(item: Item): void {
  // Keep the host controlled-only: emit events but don't mutate state here.
  if (item.checked) {
    return;
  }

  for (const name of CHANGE_EVENTS) {
    item.dispatchEvent(new Event(name, DEFAULT_EVENT_INIT));
  }
}

function isItem(node: unknown): node is Item {
  // Accept only elements that implement the expected traits for roving groups.
  return (
    node instanceof ReactiveElement &&
    node instanceof Valuable &&
    node instanceof Checkable &&
    node instanceof Disableable
  );
}

const Edge = {
  FIRST: 0,
  LAST: -1,
} as const;
type Edge = (typeof Edge)[keyof typeof Edge];

const Direction = {
  LEFT: -1,
  RIGHT: 1,
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

class RovingItems {
  readonly #host: Host;
  #items: readonly Item[] = [];

  constructor(host: Host) {
    this.#host = host;
  }

  // Signal-style API: avoids `items.items` at the call site.
  set value(value: readonly Item[]) {
    this.#items = value;
  }

  contains(item: Item): boolean {
    return this.#items.includes(item);
  }

  get enabled(): readonly Item[] {
    return this.#items.filter((item) => !item.disabled);
  }

  get focused(): Item | undefined {
    const focused = document.activeElement;
    return this.#items.find((item) => item === focused);
  }

  get tabbable(): Item | undefined {
    return this.#items.find((item) => item.tabIndex === 0);
  }

  get active(): Item | undefined {
    return this.focused ?? this.tabbable;
  }

  findByValue(value: unknown): Item | undefined {
    return this.#items.find((i) => i.value === value);
  }

  setTabStop(target?: Item): void {
    for (const item of this.#items) {
      item.tabIndex = item === target ? 0 : -1;
    }
  }

  getTabStopCandidate(preferred?: Item): Item | undefined {
    const { enabled } = this;
    if (!enabled.length) return undefined;

    return (
      enabled.find((item) => item.value === this.#host.value) ??
      (preferred && !preferred.disabled && this.contains(preferred)
        ? preferred
        : undefined) ??
      enabled[0]
    );
  }

  /**
   * Apply focus + roving tabindex.
   * @returns the focused item or undefined if nothing happened
   */
  focus(item: Item | undefined): Item | undefined {
    if (!item || item.disabled) {
      return undefined;
    }

    if (this.active === item) {
      this.setTabStop(item);
      return item;
    }

    this.setTabStop(item);
    item.focus();
    return item;
  }

  /**
   * Home/End behavior: returns the target it focused.
   */
  focusEdge(edge: Edge): Item | undefined {
    const { enabled } = this;
    if (!enabled.length) return undefined;

    const target = enabled.at(edge);
    return target ? this.focus(target) : undefined;
  }

  /**
   * Compute the next enabled item for arrow navigation (wrap-around).
   * Does not focus by itself.
   */
  step(direction: Direction): Item | undefined {
    const { enabled } = this;
    if (!enabled.length) return undefined;

    const { active } = this;
    let index = active ? enabled.indexOf(active) : -1;

    if (index === -1) {
      const fromValue = enabled.find((item) => item.value === this.#host.value);
      index = fromValue ? enabled.indexOf(fromValue) : 0;
    }

    const nextIndex = (index + direction + enabled.length) % enabled.length;
    return enabled[nextIndex];
  }
}

// Don't hijack modified key combos; let the browser handle them.
function hasNoKeyModifier(event: KeyboardEvent): boolean {
  return !(event.altKey || event.ctrlKey || event.metaKey);
}

export function useRovingTabindex(host: Host, slotSelector = 'slot'): void {
  const items = new RovingItems(host);

  const createEdgeHandler = (edge: Edge): KeyboardListener =>
    when(hasNoKeyModifier, (event) => {
      // Prevent scrolling when moving focus via Home/End.
      const focused = items.focusEdge(edge);
      if (focused) {
        notify(focused);
        event.preventDefault();
      }
    });

  const createStepHandler = (direction: Direction): KeyboardListener =>
    when(hasNoKeyModifier, (event) => {
      // Move focus (wrapping) and emit selection.
      const focused = items.focus(items.step(direction));
      if (focused) {
        notify(focused);
        event.preventDefault();
      }
    });

  useSlot(host, slotSelector, (_, elements) => {
    items.value = elements.filter(isItem);
    // When slot content changes, recompute the active tab stop.
    items.setTabStop(items.getTabStopCandidate());
  });

  const hasRtl = (_: KeyboardEvent) =>
    // Mirror arrow key behavior in RTL layout.
    getComputedStyle(host).direction === 'rtl';

  const right = createStepHandler(Direction.RIGHT);
  const left = createStepHandler(Direction.LEFT);

  const previous = when(hasRtl, right, left);
  const next = when(hasRtl, left, right);

  useKeyboard(host, {
    Home: { down: createEdgeHandler(Edge.FIRST) },
    End: { down: createEdgeHandler(Edge.LAST) },
    ArrowLeft: { down: previous },
    ArrowUp: { down: previous },
    ArrowRight: { down: next },
    ArrowDown: { down: next },
  });

  useAttributes(host, {
    value(_, newValue) {
      // Keep tab stop in sync with controlled value updates.
      items.setTabStop(items.getTabStopCandidate(items.findByValue(newValue)));
    },
  });

  useEvents(host, {
    focusin(event) {
      // Clicking an item should update the tab stop immediately.
      const target = event
        .composedPath()
        .find(
          (node): node is Item =>
            isItem(node) && !node.disabled && items.contains(node),
        );

      if (target) {
        items.setTabStop(target);
      }
    },
  });
}
