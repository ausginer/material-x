import type { SortableItem } from './sortable-list-context.ts';

const DESCRIPTION = 'Use the arrow keys to move';

/** The attributes the item claims, which its observer watches. */
const CLAIMED: MutationObserverInit = {
  attributeFilter: [
    'tabindex',
    'role',
    'aria-label',
    'aria-description',
    'aria-disabled',
  ],
};

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

function unclaim(
  element: HTMLElement | null,
  owned: Set<string>,
  name: string,
): void {
  if (!owned.delete(name)) {
    return;
  }

  if (name !== 'touch-action') {
    element!.removeAttribute(name);
  } else if (element!.style.touchAction === 'none') {
    // No observer sees an inline style, so only a different value tells a
    // consumer's `touch-action` from the item's.
    element!.style.removeProperty(name);
  }
}

/**
 * Writes the attribute when the element doesn't have it, or has the item's own
 * value, and records it in `owned`. With `null`, removes the item's own value.
 * `touch-action` is the inline style property.
 */
function claim(
  element: HTMLElement,
  owned: Set<string>,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    unclaim(element, owned, name);
  } else if (name === 'touch-action') {
    if (!element.style.touchAction) {
      element.style.touchAction = value;
      owned.add(name);
    }
  } else if (
    owned.has(name)
      ? element.getAttribute(name) !== value
      : !element.hasAttribute(name)
  ) {
    element.setAttribute(name, value);
    owned.add(name);
  }
}

function release(element: HTMLElement | null, owned: Set<string>): void {
  for (const name of owned) {
    unclaim(element, owned, name);
  }
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

  const handleOwned = new Set<string>();
  const controlOwned = new Set<string>();
  let handle: HTMLElement | null = null;

  // Each record that reaches this function is another writer's, so its
  // attribute stops being the item's.
  const disown = (records: readonly MutationRecord[]): void => {
    for (const { target, attributeName } of records) {
      if (target === control) {
        controlOwned.delete(attributeName!);
      } else if (target === handle) {
        handleOwned.delete(attributeName!);
      }
    }
  };
  const observer = new MutationObserver(disown);

  // Runs the item's own writes and removals: the pending records, which are
  // another writer's, are applied first, and those of the item's own writes
  // are dropped.
  const write = (run: () => void): void => {
    disown(observer.takeRecords());
    run();
    observer.takeRecords();
  };

  observer.observe(control, CLAIMED);

  const update = (): void => {
    write(() => {
      const next = handleOf(host);
      const disabled = isDisabled(host);
      const description = disabled ? null : DESCRIPTION;

      if (next !== handle) {
        release(handle, handleOwned);
        handle = next;
        observer.disconnect();
        observer.observe(control, CLAIMED);

        if (handle) {
          observer.observe(handle, CLAIMED);
        }
      }

      if (handle) {
        claim(handle, handleOwned, 'tabindex', disabled ? '-1' : '0');
        claim(handle, handleOwned, 'role', 'button');

        if (!handle.hasAttribute('aria-labelledby')) {
          claim(handle, handleOwned, 'aria-label', 'Reorder');
        }

        claim(handle, handleOwned, 'aria-description', description);
        claim(handle, handleOwned, 'aria-disabled', disabled ? 'true' : null);
        claim(handle, handleOwned, 'touch-action', disabled ? null : 'none');
        release(control, controlOwned);
      } else {
        if (control === host) {
          claim(control, controlOwned, 'tabindex', '0');
        }

        claim(control, controlOwned, 'aria-description', description);
      }
    });
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
      write(() => {
        release(handle, handleOwned);
        release(control, controlOwned);
      });

      if (link) {
        control.removeAttribute('draggable');
      }

      observer.disconnect();
      state.disconnect();
      handle = null;
    },
  };
}
