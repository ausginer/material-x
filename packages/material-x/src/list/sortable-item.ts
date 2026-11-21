import type { SortableItem } from './sortable-list-context.ts';

const DESCRIPTION = 'Use the arrow keys to move';

/** The attributes the item claims, which its observer watches. */
const CLAIMED: MutationObserverInit = {
  attributeFilter: ['tabindex', 'role', 'aria-label', 'aria-description'],
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
 * Writes the attribute when the element doesn't have it, and records it in
 * `owned`. `touch-action` is the inline style property.
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
    if (name !== 'touch-action') {
      element!.removeAttribute(name);
    } else if (element!.style.touchAction === 'none') {
      // No observer sees an inline style, so only a different value tells a
      // consumer's `touch-action` from the item's.
      element!.style.removeProperty(name);
    }
  }

  owned.length = 0;
}

/**
 * The sortable semantics of one item of `list`, on the item's own elements:
 * its handle's, or else its control's description, and a static item's tab
 * stop. A static item's control is its host, whose box takes focus and is its
 * `listitem`. An interactive item writes nothing on its host.
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

  const handleOwned: string[] = [];
  const controlOwned: string[] = [];
  let handle: HTMLElement | null = null;

  // Each record that reaches this function is another writer's, so its
  // attribute stops being the item's.
  const disown = (records: readonly MutationRecord[]): void => {
    for (const { target, attributeName } of records) {
      const owned =
        target === control
          ? controlOwned
          : target === handle
            ? handleOwned
            : [];
      const index = owned.indexOf(attributeName!);

      if (index >= 0) {
        owned.splice(index, 1);
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
        claim(handle, handleOwned, 'tabindex', '0');
        claim(handle, handleOwned, 'role', 'button');

        if (!handle.hasAttribute('aria-labelledby')) {
          claim(handle, handleOwned, 'aria-label', 'Reorder');
        }

        claim(handle, handleOwned, 'aria-description', DESCRIPTION);
        claim(handle, handleOwned, 'touch-action', 'none');
        release(control, controlOwned);
      } else {
        if (control === host) {
          claim(control, controlOwned, 'tabindex', '0');
        }

        claim(control, controlOwned, 'aria-description', DESCRIPTION);
      }
    });
  };

  update();

  return {
    update,
    release: () => {
      write(() => {
        release(handle, handleOwned);
        release(control, controlOwned);
      });
      observer.disconnect();
      handle = null;
    },
  };
}
