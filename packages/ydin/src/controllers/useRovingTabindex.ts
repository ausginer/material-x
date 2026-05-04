import { ControlledElement } from '../element.ts';
import { Checkable } from '../traits/checkable.ts';
import { Disableable } from '../traits/disableable.ts';
import { Valuable } from '../traits/valuable.ts';
import { notify } from '../utils/DOM.ts';
import { when } from '../utils/runtime.ts';
import { useAttributes } from './useAttributes.ts';
import { useEvents } from './useEvents.ts';
import { useKeyboard, type KeyboardListener } from './useKeyboard.ts';
import { useSlot } from './useSlot.ts';

type Host = ControlledElement & Valuable;
type Item = ControlledElement & Checkable & Valuable & Disableable;

function notifyFocused(item: Item | undefined): void {
  // Keep the host controlled-only: emit events but don't mutate state here.
  if (!item || item.checked) {
    return;
  }

  // Match native radio behavior by emitting the same events on selection.
  notify(item, 'input', 'change');
}

function isItem(node: unknown): node is Item {
  // Accept only elements that implement the expected traits for roving groups.
  return (
    node instanceof ControlledElement &&
    node instanceof Valuable &&
    node instanceof Checkable &&
    node instanceof Disableable
  );
}

const EDGE_FIRST = 0;
const EDGE_LAST = -1;
type Edge = typeof EDGE_FIRST | typeof EDGE_LAST;

const DIRECTION_LEFT = -1;
const DIRECTION_RIGHT = 1;
type Direction = typeof DIRECTION_LEFT | typeof DIRECTION_RIGHT;

/**
 * Internal view over the current managed roving items.
 *
 * This helper keeps slot-derived items and centralizes enabled-item filtering,
 * tab stop selection, and edge / step navigation for
 * `useRovingTabindex(...)`.
 */
class RovingItems {
  readonly #host: Host;
  #items: readonly Item[] = [];

  constructor(host: Host) {
    this.#host = host;
  }

  // Signal-style API: avoids `items.items` at the call site.
  // oxlint-disable-next-line accessor-pairs
  set value(value: readonly Item[]) {
    this.#items = value;
  }

  contains(item: Item): boolean {
    return this.#items.includes(item);
  }

  /**
   * Enabled items that can participate in roving focus and selection.
   */
  get enabled(): readonly Item[] {
    return this.#items.filter((item) => !item.disabled);
  }

  /**
   * Currently focused managed item, if focus is on the item element itself.
   */
  get focused(): Item | undefined {
    const focused = document.activeElement;
    return this.#items.find((item) => item === focused);
  }

  /**
   * Managed item that currently owns the roving tab stop.
   */
  get tabbable(): Item | undefined {
    return this.#items.find((item) => item.tabIndex === 0);
  }

  /**
   * Active navigation anchor.
   *
   * This prefers the directly focused item and otherwise falls back to the
   * current tabbable item.
   */
  get active(): Item | undefined {
    return this.focused ?? this.tabbable;
  }

  /**
   * Assigns the roving tab stop to the given item.
   *
   * When no item is provided, all managed items become untabbable.
   *
   * @param target - Item that should receive `tabIndex = 0`.
   */
  setTabStop(target?: Item): void {
    for (const item of this.#items) {
      item.tabIndex = item === target ? 0 : -1;
    }
  }

  /**
   * Selects the next tab stop candidate for the current host state.
   *
   * Candidates are chosen in this order:
   * 1. enabled item matching `host.value`
   * 2. current active enabled item
   * 3. first enabled item
   *
   * @returns The preferred tabbable item, if any enabled item exists.
   */
  getTabStopCandidate(): Item | undefined {
    const { enabled } = this;
    if (!enabled.length) return undefined;

    return (
      enabled.find((item) => item.value === this.#host.value) ??
      (this.active && !this.active.disabled && this.contains(this.active)
        ? this.active
        : undefined) ??
      enabled[0]
    );
  }

  /**
   * Applies focus and roving tabindex to a specific item.
   *
   * Disabled and missing items are ignored. When the target is already active,
   * only the tab stop is refreshed.
   *
   * @param item - Item that should receive focus.
   * @returns The focused item, or `undefined` when nothing happened.
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
   * Focuses the first or last enabled item.
   *
   * @param edge - Edge to resolve, matching `Home` / `End` semantics.
   * @returns The focused edge item, if any enabled item exists.
   */
  focusEdge(edge: Edge): Item | undefined {
    const { enabled } = this;
    if (!enabled.length) return undefined;

    const target = enabled.at(edge);
    return target ? this.focus(target) : undefined;
  }

  /**
   * Computes the next enabled item for arrow navigation with wrap-around.
   *
   * This uses the current active item as the navigation anchor. When there is
   * no active managed item, it falls back to the enabled item matching
   * `host.value`, then to the first enabled item.
   *
   * @param direction - Navigation direction relative to the active item.
   * @returns The next enabled item, without focusing it.
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
  return !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
}

/**
 * Registers roving tabindex behavior for checkable valuable items in a slot.
 *
 * Managed items are expected to implement `Checkable`, `Disableable`, and
 * `Valuable` on top of `ControlledElement`. Elements that do not match that
 * contract are ignored.
 *
 * The controller keeps exactly one enabled item tabbable, updates that tab
 * stop from `host.value`, and handles `Home`, `End`, and arrow-key navigation
 * with wrap-around semantics.
 *
 * @remarks Focus entering a managed item, or a composed descendant inside that
 * item, updates the current tab stop immediately. Modified key combos
 * (`Shift`, `Alt`, `Ctrl`, `Meta`) are ignored. In RTL layout, the current
 * previous/next semantics are mirrored for all supported arrow keys.
 *
 * @param host - Valuable host element that controls the roving group state.
 * @param slotSelector - Selector for the slot that provides managed item
 *   elements. Defaults to the first `slot` in the host shadow root.
 */
export function useRovingTabindex(host: Host, slotSelector = 'slot'): void {
  const items = new RovingItems(host);

  const createEdgeHandler = (edge: Edge): KeyboardListener =>
    when(hasNoKeyModifier, (event) => {
      const target = items.focusEdge(edge);
      if (!target) return;

      // Prevent scrolling when moving focus via Home/End.
      event.preventDefault();
      notifyFocused(target);
    });

  const createStepHandler = (direction: Direction): KeyboardListener =>
    when(hasNoKeyModifier, (event) => {
      const target = items.focus(items.step(direction));
      if (!target) return;

      // Move focus (wrapping) and emit selection.
      event.preventDefault();
      notifyFocused(target);
    });

  useSlot(host, slotSelector, (_, nodes) => {
    items.value = nodes.filter(isItem);
    // When slot content changes, recompute the active tab stop.
    items.setTabStop(items.getTabStopCandidate());
  });

  const hasRtl = (_: KeyboardEvent) =>
    // Mirror arrow key behavior in RTL layout.
    getComputedStyle(host).direction === 'rtl';

  const right = createStepHandler(DIRECTION_RIGHT);
  const left = createStepHandler(DIRECTION_LEFT);

  const previous = when(hasRtl, right, left);
  const next = when(hasRtl, left, right);

  useKeyboard(host, {
    Home: { down: createEdgeHandler(EDGE_FIRST) },
    End: { down: createEdgeHandler(EDGE_LAST) },
    ArrowLeft: { down: previous },
    ArrowUp: { down: previous },
    ArrowRight: { down: next },
    ArrowDown: { down: next },
  });

  useAttributes(host, {
    value() {
      // Keep tab stop in sync with controlled value updates.
      items.setTabStop(items.getTabStopCandidate());
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
