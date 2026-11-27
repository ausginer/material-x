import { AttributeClaimer } from '@ydinjs/core/utils/AttributeClaimer.js';
import type { SortableItem } from './sortable-list-context.ts';

const DESCRIPTION = 'Use the arrow keys to move';

/**
 * The item's handle: a child element with `data-handle` in its `lead` or
 * `trail` slot. The item's semantics and drag's `handle(item)` use this one
 * rule, so they agree.
 */
export function handleOf(item: HTMLElement): HTMLElement | null {
  return item.querySelector(
    ':scope > [data-handle]:is([slot=lead],[slot=trail])',
  );
}

/**
 * Whether the item is disabled. Drag's `handle(item)` and the item's semantics
 * use this one rule. A static item has no such state, whatever its attributes.
 */
export function isDisabled(item: HTMLElement): boolean {
  return item.matches(':state(disabled)');
}

/**
 * The sortable semantics of one item of `list`, on the item's own elements:
 * its handle's, or else its control's description, and a static item's tab
 * stop. A static item's control is its host, whose box takes focus and is its
 * `listitem`. An interactive item writes nothing on its host.
 *
 * A disabled item isn't reorderable: its handle is an `aria-disabled` button
 * that is no tab stop, and neither it nor a control is described. The handle
 * keeps a tab index, so that one that has focus doesn't lose it.
 *
 * A link item's anchor has `draggable="false"`. The browser's own drag of a
 * link would cancel the pointer's press, by the surface and by a handle, so the
 * item wouldn't lift.
 *
 * The handle and a static item's host are the consumer's elements, and an
 * interactive item's control receives the host's `aria-*`. So a value is the
 * item's from its write until anyone else writes or removes that attribute,
 * and the item removes only the values that are still its own.
 */
export function sortItem(
  list: HTMLElement,
  host: HTMLElement,
  control: HTMLElement,
): SortableItem | undefined {
  // A provider that isn't the parent is an outer sortable list around a
  // nested `mx-list`, whose items stay plain.
  if (host.parentElement !== list) {
    return undefined;
  }

  const controlClaims = new AttributeClaimer(control);
  let handle: HTMLElement | null = null;
  let handleClaims: AttributeClaimer | null = null;
  // Whether the handle's inline `touch-action` is the item's. No observer
  // sees an inline style, so only a different value tells a consumer's
  // `touch-action` from the item's.
  let ownsTouchAction = false;

  const releaseTouchAction = (): void => {
    if (ownsTouchAction) {
      ownsTouchAction = false;

      if (handle!.style.touchAction === 'none') {
        handle!.style.removeProperty('touch-action');
      }
    }
  };

  const update = (): void => {
    const next = handleOf(host);
    const disabled = isDisabled(host);
    const description = disabled ? null : DESCRIPTION;

    if (next !== handle) {
      handleClaims?.release();
      releaseTouchAction();
      handle = next;
      handleClaims = handle && new AttributeClaimer(handle);
    }

    if (handle) {
      handleClaims!.set({
        tabindex: disabled ? '-1' : '0',
        role: 'button',
        // `aria-labelledby` names the handle instead, so the item's own
        // label goes.
        'aria-label': handle.hasAttribute('aria-labelledby') ? null : 'Reorder',
        'aria-description': description,
        'aria-disabled': disabled ? 'true' : null,
      });

      if (disabled) {
        releaseTouchAction();
      } else if (!handle.style.touchAction) {
        handle.style.touchAction = 'none';
        ownsTouchAction = true;
      }

      controlClaims.set({ tabindex: null, 'aria-description': null });
    } else {
      controlClaims.set(
        control === host
          ? { tabindex: '0', 'aria-description': description }
          : { 'aria-description': description },
      );
    }
  };

  const state = new MutationObserver(update);

  // A static item has no disabled state.
  if (control !== host) {
    state.observe(host, { attributeFilter: ['disabled'] });
  }

  // The anchor is in the item's shadow tree, so no one else writes it.
  const link = control instanceof HTMLAnchorElement;

  if (link) {
    control.draggable = false;
  }

  update();

  return {
    update,
    release: () => {
      handleClaims?.release();
      releaseTouchAction();
      controlClaims.release();

      if (link) {
        control.removeAttribute('draggable');
      }

      state.disconnect();
      handle = null;
    },
  };
}
