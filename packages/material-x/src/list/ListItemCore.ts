import { useContext } from '@ydinjs/core/controllers/useContext.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import { type ControlledElement, internals } from '@ydinjs/core/element.js';
import type { Composed } from '@ydinjs/core/traits/composition.js';
import { $, toggleState } from '@ydinjs/core/utils/DOM.js';
import '../core/styles/elevation/elevation.runtime.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
import { useCore } from '../core/utils/useCore.ts';
import nestedTemplate from './list-item-shared.tpl.html' with { type: 'html' };
import { handleOf, SORTABLE_LIST_CTX } from './sortable-list-context.ts';
import defaultStyles from './styles/item/main.css.ts' with { type: 'css' };

export type ListItemCoreTraits = readonly [];
export type ListItemCore = InstanceType<
  Composed<typeof ControlledElement, ListItemCoreTraits>
>;

export type ListItemCoreProperties = Record<never, never>;
export type ListItemCoreEvents = Readonly<{
  click: HTMLElementEventMap['click'];
}>;
export type ListItemCoreCSSProperties = Readonly<{
  '--md-list-item-container-color'?: string;
  '--md-list-item-container-height'?: string;
  '--md-list-item-container-shape'?: string;
  '--md-list-item-leading-space'?: string;
  '--md-list-item-trailing-space'?: string;
  '--md-list-item-leading-icon-size'?: string;
  '--md-list-item-trailing-icon-size'?: string;
}>;

const DESCRIPTION = 'Use the arrow keys to move';

/**
 * Writes the attribute when the element doesn't have it, and records it in
 * `next` when the item owns it. An attribute the item wrote stays owned while
 * it is present. `touch-action` is the inline style property.
 */
function claim(
  owned: ReadonlyMap<HTMLElement, readonly string[]>,
  next: Map<HTMLElement, string[]>,
  element: HTMLElement,
  name: string,
  value: string,
): void {
  const isStyle = name === 'touch-action';

  if (!(isStyle ? element.style.touchAction : element.hasAttribute(name))) {
    if (isStyle) {
      element.style.touchAction = value;
    } else {
      element.setAttribute(name, value);
    }
  } else if (!owned.get(element)?.includes(name)) {
    return;
  }

  const names = next.get(element);

  if (names) {
    names.push(name);
  } else {
    next.set(element, [name]);
  }
}

export function useListItemCore(
  host: ListItemCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string> = [],
  init?: Partial<ShadowRootInit>,
): HTMLDivElement | HTMLButtonElement | HTMLAnchorElement {
  useCore(
    host,
    [template],
    {},
    [elevationStyles, defaultStyles, ...styles],
    init,
  );
  const target = $<HTMLDivElement | HTMLButtonElement | HTMLAnchorElement>(
    host,
    '.host',
  )!;
  target.append(nestedTemplate.content.cloneNode(true));

  useHasSlottedPolyfill(host);

  // The item's sortable semantics, which it writes on its own elements while
  // an `mx-sortable-list` is its parent: the handle's, or else its control's.
  // A static item's control is its inner `<div>`, which takes no focus of its
  // own, so the item makes it the tab stop. Nothing goes on the host, whose
  // `display: contents` box takes no focus and gains an accessibility node of
  // its own with a `tabindex`.
  let sortable = false;
  let owned = new Map<HTMLElement, string[]>();

  const update = (): void => {
    const next = new Map<HTMLElement, string[]>();

    if (sortable) {
      const handle = handleOf(host);

      if (handle) {
        claim(owned, next, handle, 'tabindex', '0');
        claim(owned, next, handle, 'role', 'button');

        if (!handle.hasAttribute('aria-labelledby')) {
          claim(owned, next, handle, 'aria-label', 'Reorder');
        }

        claim(owned, next, handle, 'aria-description', DESCRIPTION);
        claim(owned, next, handle, 'touch-action', 'none');
      } else {
        if (target.localName === 'div') {
          claim(owned, next, target, 'tabindex', '0');
        }

        claim(owned, next, target, 'aria-description', DESCRIPTION);
      }
    }

    for (const [element, names] of owned) {
      for (const name of names) {
        if (!next.get(element)?.includes(name)) {
          if (name === 'touch-action') {
            element.style.removeProperty(name);
          } else {
            element.removeAttribute(name);
          }
        }
      }
    }

    owned = next;
  };

  // A provider that isn't the parent is an outer sortable list around a
  // nested `mx-list`, whose items stay plain.
  useContext(host, SORTABLE_LIST_CTX, (list) => {
    if (list !== host.parentElement) {
      return undefined;
    }

    sortable = true;
    update();

    return () => {
      sortable = false;
      update();
    };
  });

  useSlot(host, '.lead', (_, nodes) => {
    toggleState(
      internals(host),
      'lead-large',
      nodes.some((n) => n instanceof HTMLElement && 'large' in n.dataset),
    );
    update();
  });

  useSlot(host, '.trail', update);

  return target;
}
