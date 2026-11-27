import { useProvider } from '@ydinjs/core/controllers/useContext.js';
import {
  useCSSProps,
  type CSSPropDescription,
} from '@ydinjs/core/controllers/useCSSProps.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import { ControlledElement, internals, use } from '@ydinjs/core/element.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { landing } from '@ydinjs/drag/sortable/landing.js';
import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js';
import { y } from '@ydinjs/drag/sortable/y.js';
import {
  ReorderResolution,
  sortable,
  type ReorderRequest,
  type SortableConfig,
  type SortableController,
} from '@ydinjs/drag/sortable.js';
import { useAriaNotifyPolyfill } from '../core/polyfills/aria-notify/aria-notify.ts';
import { identity, parseMs } from '../core/utils/fns.ts';
import { ReorderEvent } from './reorder-event.ts';
import { handleOf, isDisabled, sortItem } from './sortable-item.ts';
import { SORTABLE_LIST_CTX } from './sortable-list-context.ts';

/**
 * How long an accepted move waits for the list's slot to show it before the
 * item lands where the DOM has it.
 */
const COMMIT_TIMEOUT = 500;

const DRAG_STATE = 'drag';

/**
 * The list's state from a command's start until the next operation's. Nothing
 * clears it, because it matters only to the placeholder and the lifted item,
 * which an operation has.
 */
const COMMAND_STATE = 'command';

/** The landing's timing. */
const DRAG_CSS_PROPS = {
  duration: ['--_drag-duration', parseMs],
  easing: ['--_drag-easing', identity<string>],
} as const satisfies Readonly<Record<string, CSSPropDescription<unknown>>>;

/** The layout animation's timing. */
const LAYOUT_CSS_PROPS = {
  duration: ['--_layout-animation-duration', parseMs],
  easing: ['--_layout-animation-easing', identity<string>],
} as const satisfies Readonly<Record<string, CSSPropDescription<unknown>>>;

/** One proposed move, from its `reorder` event until the drag ends. */
type Proposal = Readonly<{
  /**
   * Whether the item at `index` of `current` has the order of `slot` among the
   * other items of the proposal that are still in the list. Items that came or
   * left since the proposal shift its index without moving it.
   */
  isAtSlot(
    current: readonly ControlledElement[],
    index: number,
    slot: number,
  ): boolean;
  /**
   * Accepts the move when the list's children show it, when
   * {@link COMMIT_TIMEOUT} passes, or when `signal` aborts.
   */
  wait(signal: AbortSignal): Promise<ReorderResolution>;
  /** Ends the wait if the list's children show the move. Inert outside it. */
  commit(): void;
}>;

/**
 * @param others - The items of the list in the proposal's order, without the
 *   moved one.
 * @param read - Reads the list's items.
 */
function createProposal(
  request: ReorderRequest,
  others: readonly ControlledElement[],
  read: () => readonly ControlledElement[],
): Proposal {
  let check: (() => void) | null = null;

  const isAtSlot = (
    current: readonly ControlledElement[],
    index: number,
    slot: number,
  ): boolean => {
    const before = new Set(others);
    const now = new Set(current);

    return (
      current.slice(0, index).filter((other) => before.has(other)).length ===
      others.slice(0, slot).filter((other) => now.has(other)).length
    );
  };

  return {
    isAtSlot,
    wait: (signal) =>
      new Promise((resolve) => {
        const done = (): void => {
          clearTimeout(timer);
          check = null;
          resolve(ReorderResolution.accept());
        };
        const timer = setTimeout(done, COMMIT_TIMEOUT);

        check = () => {
          const current = read();
          const index = current.indexOf(request.item as ControlledElement);

          if (index >= 0 && isAtSlot(current, index, request.to)) {
            done();
          }
        };
        signal.addEventListener('abort', done, { once: true });
        check();
      }),
    commit: () => {
      check?.();
    },
  };
}

/**
 * Makes `host`'s slotted items sortable with `@ydinjs/drag`: the controller of
 * each connection, the items' semantics through the list's context, and the
 * `reorder` event of each proposed move. `host` has rendered its shadow tree,
 * with one `slot`.
 */
export function useSortable(host: ControlledElement): void {
  const notify = useAriaNotifyPolyfill(host);
  const slot = host.shadowRoot!.querySelector<HTMLSlotElement>('slot')!;
  const read = (): readonly ControlledElement[] =>
    slot
      .assignedElements()
      .filter(
        (element): element is ControlledElement =>
          element instanceof ControlledElement,
      );

  let items: readonly ControlledElement[] = [];
  let dragged: ControlledElement | null = null;
  let proposal: Proposal | null = null;
  let controller: SortableController | null = null;

  const config: SortableConfig = {
    items: () => items,
    axis: y(),
    handle: (item) => (isDisabled(item) ? null : (handleOf(item) ?? item)),
    displacement: layoutAnimation({
      timing: useCSSProps(host, LAYOUT_CSS_PROPS),
    }),
    landing: {
      ...landing(),
      timing: useCSSProps(host, DRAG_CSS_PROPS),
    },
    onStart: (item, kind) => {
      toggleState(internals(host), COMMAND_STATE, kind === 'command');
      dragged = item as ControlledElement;
      // WebKit starts no transition when the lift's top-layer entry and the
      // state change share one style update, so the item's style is computed
      // once in the top layer before the state raises it.
      getComputedStyle(dragged).getPropertyValue('--_level');
      toggleState(internals(dragged), DRAG_STATE, true);
    },
    onEnd: (result) => {
      const item = dragged!;
      const ended = proposal;
      toggleState(internals(item), DRAG_STATE, false);
      dragged = null;
      proposal = null;

      if (result.type === 'accepted') {
        // An accepted move can end with the item unmoved, at another slot,
        // or out of the list, so its position is read here.
        const current = read();
        const index = current.indexOf(item);

        if (
          index >= 0 &&
          !ended!.isAtSlot(current, index, result.request.from)
        ) {
          notify(`Item ${index + 1} of ${current.length}.`);
        }
      }
    },
    onReorder: (request, { signal }) => {
      const next = createProposal(
        request,
        items.filter((other) => other !== request.item),
        read,
      );
      proposal = next;

      if (!host.dispatchEvent(new ReorderEvent(request))) {
        return ReorderResolution.reject();
      }

      return next.wait(signal);
    },
  };

  const refresh = (): void => {
    const current = read();

    if (
      current.length !== items.length ||
      current.some((item, index) => item !== items[index])
    ) {
      items = current;
      controller?.invalidate();
    }
  };

  // Each item that resolves this list as its parent applies its sortable
  // semantics to its own elements, with the writer the value carries. The
  // list keeps no registry and queries no item. An item that upgrades after
  // the list's last slot change isn't in the collection yet, because an
  // upgrade fires no `slotchange`, so its lookup reads the slot again.
  useProvider(host, SORTABLE_LIST_CTX, (item, control) => {
    if (!items.includes(item as ControlledElement)) {
      refresh();
    }

    return sortItem(host, item, control);
  });

  useSlot(host, slot, () => {
    refresh();
    proposal?.commit();
  });

  // A controller per connection. Destroying it ends a drag without a
  // landing, which a cancel would attempt on a placeholder that left the
  // document with the list. Destruction calls no `onEnd`, so the proposal is
  // cleared here, and its wait ends when the destruction aborts its signal.
  use(host, {
    connected: () => {
      controller = sortable(host, config);
    },
    disconnected: () => {
      void controller!.requestDestroy();
      controller = null;
      proposal = null;

      if (dragged) {
        toggleState(internals(dragged), DRAG_STATE, false);
        dragged = null;
      }
    },
  });
}
