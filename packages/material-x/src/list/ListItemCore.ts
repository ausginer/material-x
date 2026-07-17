import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import { type ControlledElement, internals } from '@ydinjs/core/element.js';
import type { Traited } from '@ydinjs/core/traits/attributes.js';
import { useReorderableItem } from '@ydinjs/core/traits/reorderable.js';
import { $, toggleState } from '@ydinjs/core/utils/DOM.js';
import '../core/styles/elevation/elevation.runtime.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
import { useCore } from '../core/utils/useCore.ts';
import nestedTemplate from './list-item-shared.tpl.html' with { type: 'html' };
import defaultStyles from './styles/item/main.css.ts' with { type: 'css' };

export const LIST_ITEM_CORE_TRAITS: readonly [] = [];
export type ListItemCore = Traited<
  ControlledElement,
  typeof LIST_ITEM_CORE_TRAITS
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

/**
 * Turns a slotted `[data-handle]` grip into a focusable, button-like control so
 * the reorder gesture is operable from the keyboard, not just the pointer: the
 * {@link useReorderable} keyboard path is armed by space/enter on this handle.
 * Consumer-supplied `role`, `tabindex`, and accessible name are left untouched.
 */
function enhanceHandle(nodes: readonly Node[]): void {
  const handle = nodes.find(
    (n): n is HTMLElement => n instanceof HTMLElement && 'handle' in n.dataset,
  );

  if (!handle) {
    return;
  }

  if (!handle.hasAttribute('tabindex')) {
    handle.tabIndex = 0;
  }
  if (!handle.hasAttribute('role')) {
    handle.setAttribute('role', 'button');
  }
  if (
    !handle.hasAttribute('aria-label') &&
    !handle.hasAttribute('aria-labelledby')
  ) {
    handle.setAttribute('aria-label', 'Reorder');
  }
  // A drag grip should claim touch gestures rather than let them scroll.
  handle.style.touchAction = 'none';
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
  useReorderableItem(host, target);

  useSlot(host, '.lead', (_, nodes) => {
    toggleState(
      internals(host),
      'lead-large',
      nodes.some((n) => n instanceof HTMLElement && 'large' in n.dataset),
    );
    enhanceHandle(nodes);
  });

  useSlot(host, '.trail', (_, nodes) => {
    enhanceHandle(nodes);
  });

  return target;
}
