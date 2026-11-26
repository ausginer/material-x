import { ControlledElement } from '../element.ts';
import { Checkable } from '../traits/checkable.ts';
import { Disableable } from '../traits/disableable.ts';
import { Valuable } from '../traits/valuable.ts';
import { createEventNotifier } from '../utils/DOM.ts';
import { useAttributes } from './useAttributes.ts';
import { useConnected } from './useConnected.ts';
import { useEvents } from './useEvents.ts';
import { useKeyboard, type KeyboardListener } from './useKeyboard.ts';
import { useSlot } from './useSlot.ts';

type Host = ControlledElement & Valuable;
type Item = ControlledElement & Checkable & Valuable & Disableable;

const notifySelection = createEventNotifier({
  input: { cancelable: false },
  change: { cancelable: false, composed: false },
});

function notifyFocused(item: Item | undefined): void {
  // Keep the host controlled-only: emit events but don't mutate state here.
  if (!item || item.checked) {
    return;
  }

  // Match native radio behavior by emitting the same events on selection.
  notifySelection(item, 'input', 'change');
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
 * This helper keeps slot-derived items and centralizes the filtering of the
 * items that can take focus, tab stop selection, and edge / step navigation for
 * `useRovingTabindex(...)`.
 */
class RovingItems {
  readonly #host: Host;
  #items: readonly Item[] = [];
  // The item that focus moved the tab stop to last, while it is managed.
  #chosen: Item | undefined;

  constructor(host: Host) {
    this.#host = host;
  }

  // Signal-style API: avoids `items.items` at the call site.
  // oxlint-disable-next-line accessor-pairs
  set value(value: readonly Item[]) {
    this.#items = value;

    const { focused } = this;
    // An item that is focused in the task that adds it has no `focusin` as a
    // managed item.
    this.#chosen =
      this.eligible.find((item) => item === focused) ??
      value.find((item) => item === this.#chosen);
  }

  contains(item: Item): boolean {
    return this.#items.includes(item);
  }

  /**
   * Items that can take focus: enabled, without the `hidden` attribute, and not
   * `display: none`.
   *
   * An item with `hidden` is out even where a page's own `display` shows it.
   * The attribute is read first because it is never stale: an engine can keep
   * the former computed `display` in a subtree that isn't rendered. The computed
   * `display` is empty while the host is out of the document, and the item
   * counts then.
   */
  get eligible(): readonly Item[] {
    return this.#items.filter(
      (item) =>
        !item.disabled &&
        !item.hidden &&
        getComputedStyle(item).display !== 'none',
    );
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
   * Moves the tab stop to the item that focus entered.
   *
   * @param item - Enabled managed item that becomes the chosen one.
   */
  choose(item: Item): void {
    this.#chosen = item;
    this.setTabStop(item);
  }

  /**
   * Selects the next tab stop candidate for the current host state.
   *
   * Candidates are chosen in this order:
   * 1. eligible item matching `host.value`
   * 2. eligible item that focus moved the tab stop to last
   * 3. first eligible item
   *
   * @returns The preferred tabbable item, if any eligible item exists.
   */
  getTabStopCandidate(): Item | undefined {
    const { eligible } = this;
    if (!eligible.length) return undefined;

    return (
      eligible.find((item) => item.value === this.#host.value) ??
      eligible.find((item) => item === this.#chosen) ??
      eligible[0]
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
   * Focuses the first or last eligible item.
   *
   * @param edge - Edge to resolve, matching `Home` / `End` semantics.
   * @returns The focused edge item, if any eligible item exists.
   */
  focusEdge(edge: Edge): Item | undefined {
    const { eligible } = this;
    if (!eligible.length) return undefined;

    const target = eligible.at(edge);
    return target ? this.focus(target) : undefined;
  }

  /**
   * Computes the next eligible item for arrow navigation with wrap-around.
   *
   * This uses the current active item as the navigation anchor. When there is
   * no active managed item, it falls back to the eligible item matching
   * `host.value`, then to the first eligible item.
   *
   * @param direction - Navigation direction relative to the active item.
   * @returns The next eligible item, without focusing it.
   */
  step(direction: Direction): Item | undefined {
    const { eligible } = this;
    if (!eligible.length) return undefined;

    const { active } = this;
    let index = active ? eligible.indexOf(active) : -1;

    if (index === -1) {
      const fromValue = eligible.find(
        (item) => item.value === this.#host.value,
      );
      index = fromValue ? eligible.indexOf(fromValue) : 0;
    }

    const nextIndex = (index + direction + eligible.length) % eligible.length;
    return eligible[nextIndex];
  }
}

// Don't hijack modified key combos; let the browser handle them.
function hasKeyModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/**
 * Registers roving tabindex behavior for checkable valuable items in a slot.
 *
 * Managed items are expected to implement `Checkable`, `Disableable`, and
 * `Valuable` on top of `ControlledElement`. Elements that do not match that
 * contract are ignored.
 *
 * An item is eligible while it is enabled, has no `hidden` attribute, and its
 * computed `display` isn't `none`. An item with `hidden` is out even where a
 * page's own style shows it. The controller keeps exactly one eligible item tabbable, or none when
 * there is no eligible item, and handles `Home`,
 * `End`, and arrow-key navigation with wrap-around semantics.
 *
 * The tab stop is the eligible item that matches `host.value`; or else the
 * eligible item that focus moved it to last, while that item is in the slot; or
 * else the first eligible item. It is chosen again when the slot's content,
 * `host.value`, or an item's `hidden` or `disabled` attribute changes, when the
 * host connects, and when a slotted element is defined later.
 *
 * @remarks Focus entering a managed item, or a composed descendant inside that
 * item, updates the current tab stop immediately. Modified key combos
 * (`Shift`, `Alt`, `Ctrl`, `Meta`) are ignored. In RTL layout, the current
 * previous/next semantics are mirrored for all supported arrow keys. Hide an
 * item with its `hidden` attribute: when a style change alone hides or shows an
 * item, the keys follow it at once, and the tab stop is chosen again only at
 * the next of the changes above.
 *
 * @param host - Valuable host element that controls the roving group state.
 * @param slotSelector - Selector for the slot that provides managed item
 *   elements. Defaults to the first `slot` in the host shadow root.
 */
export function useRovingTabindex(host: Host, slotSelector = 'slot'): void {
  const items = new RovingItems(host);

  const select = () => {
    items.setTabStop(items.getTabStopCandidate());
  };

  const observer = new MutationObserver(select);

  const read = (nodes: readonly Node[]) => {
    const value = nodes.filter(isItem);
    items.value = value;
    select();

    observer.disconnect();

    for (const item of value) {
      observer.observe(item, { attributeFilter: ['hidden', 'disabled'] });
    }
  };

  // While the host was out, no item had a computed `display`.
  useConnected(host, select);

  const createEdgeHandler =
    (edge: Edge): KeyboardListener =>
    (event: KeyboardEvent) => {
      if (!hasKeyModifier(event)) {
        const target = items.focusEdge(edge);
        if (!target) return;

        // Prevent scrolling when moving focus via Home/End.
        event.preventDefault();
        notifyFocused(target);
      }
    };

  const createStepHandler =
    (direction: Direction): KeyboardListener =>
    (event: KeyboardEvent) => {
      if (!hasKeyModifier(event)) {
        const target = items.focus(items.step(direction));
        if (!target) return;

        // Move focus (wrapping) and emit selection.
        event.preventDefault();
        notifyFocused(target);
      }
    };

  useSlot(host, slotSelector, (slot, nodes) => {
    read(nodes);

    for (const node of nodes) {
      // A customized built-in element is never an item, and its local name is
      // no name that `whenDefined` accepts.
      if (
        node instanceof HTMLElement &&
        node.localName.includes('-') &&
        !node.matches(':defined')
      ) {
        void customElements.whenDefined(node.localName).then(() => {
          const current = slot.assignedNodes();

          if (current.includes(node)) {
            // A node cloned from a template isn't upgraded by its definition
            // until it is connected.
            customElements.upgrade(node);
            read(current);
          }
        });
      }
    }
  });

  const hasRtl = () =>
    // Mirror arrow key behavior in RTL layout.
    getComputedStyle(host).direction === 'rtl';

  const right = createStepHandler(DIRECTION_RIGHT);
  const left = createStepHandler(DIRECTION_LEFT);

  const previous = (event: KeyboardEvent) =>
    hasRtl() ? right(event) : left(event);
  const next = (event: KeyboardEvent) =>
    hasRtl() ? left(event) : right(event);

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
      select();
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
        items.choose(target);
      }
    },
  });
}
