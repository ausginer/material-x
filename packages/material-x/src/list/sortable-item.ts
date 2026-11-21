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
 * Writes the attribute when the element doesn't have it, and records it in
 * `owned`. A value the consumer set is kept, and one the item wrote stays in
 * the record while it is present. `touch-action` is the inline style property.
 */
function claim(
  element: HTMLElement,
  owned: string[],
  name: string,
  value: string,
): void {
  if (name === 'touch-action') {
    if (!element.style.touchAction) {
      element.style.touchAction = value;
      owned.push(name);
    }
  } else if (!element.hasAttribute(name)) {
    element.setAttribute(name, value);
    owned.push(name);
  }
}

function release(element: HTMLElement | null, owned: string[]): void {
  for (const name of owned) {
    if (name === 'touch-action') {
      element!.style.removeProperty(name);
    } else {
      element!.removeAttribute(name);
    }
  }

  owned.length = 0;
}

/**
 * The sortable semantics of one item of `list`, on the item's own elements:
 * its handle's, or else its control's description, and a static item's tab
 * stop on its inner element. Nothing goes on the host, whose
 * `display: contents` box takes no focus and gains an accessibility node of
 * its own with a `tabindex`.
 *
 * The handle is the consumer's element, and an interactive item's control
 * receives the host's `aria-*`, so what the item wrote on either is recorded,
 * and only that is removed. A static item's inner element has no other writer.
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

  const isStatic = control.localName === 'div';
  const handleOwned: string[] = [];
  const controlOwned: string[] = [];
  let handle: HTMLElement | null = null;

  const releaseControl = (): void => {
    if (isStatic) {
      control.removeAttribute('tabindex');
      control.removeAttribute('aria-description');
    } else {
      release(control, controlOwned);
    }
  };

  const update = (): void => {
    const next = handleOf(host);

    if (next !== handle) {
      release(handle, handleOwned);
      handle = next;
    }

    if (handle) {
      claim(handle, handleOwned, 'tabindex', '0');
      claim(handle, handleOwned, 'role', 'button');

      if (!handle.hasAttribute('aria-labelledby')) {
        claim(handle, handleOwned, 'aria-label', 'Reorder');
      }

      claim(handle, handleOwned, 'aria-description', DESCRIPTION);
      claim(handle, handleOwned, 'touch-action', 'none');
      releaseControl();
    } else if (isStatic) {
      control.tabIndex = 0;
      control.setAttribute('aria-description', DESCRIPTION);
    } else {
      claim(control, controlOwned, 'aria-description', DESCRIPTION);
    }
  };

  update();

  return {
    update,
    release: () => {
      release(handle, handleOwned);
      releaseControl();
    },
  };
}
