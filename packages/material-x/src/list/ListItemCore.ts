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
import {
  SORTABLE_LIST_CTX,
  SORTABLE_LIST_ELEMENTS,
} from './sortable-list-context.ts';
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

/**
 * Sets up a list item. With a `template`, the shared content goes into the
 * template's `.host`, which the function returns. Without one, the shared
 * content is the shadow root's, and the host is the item's box.
 */
export function useListItemCore(
  host: ListItemCore,
  styles: ReadonlyArray<CSSStyleSheet | string>,
  template?: HTMLTemplateElement,
  init?: Partial<ShadowRootInit>,
): HTMLButtonElement | HTMLAnchorElement | undefined {
  useCore(
    host,
    [template ?? nestedTemplate],
    { role: 'listitem' },
    [elevationStyles, defaultStyles, ...styles],
    init,
  );

  let target: HTMLButtonElement | HTMLAnchorElement | undefined;
  if (template) {
    target = $<HTMLButtonElement | HTMLAnchorElement>(host, '.host')!;
    target.append(nestedTemplate.content.cloneNode(true));
  }

  useHasSlottedPolyfill(host);

  // While a sortable list is the item's parent, the context's value applies
  // the item's sortable semantics to its own elements, and returns the update
  // that each slot change runs. A plain list's items carry none of that code.
  let update: (() => void) | undefined;

  useContext(host, SORTABLE_LIST_CTX, SORTABLE_LIST_ELEMENTS, (sort) => {
    const item = sort?.(host, target ?? host);

    if (!item) {
      return undefined;
    }

    ({ update } = item);

    return () => {
      update = undefined;
      item.release();
    };
  });

  useSlot(host, '.lead', (_, nodes) => {
    toggleState(
      internals(host),
      'lead-large',
      nodes.some((n) => n instanceof HTMLElement && 'large' in n.dataset),
    );
    update?.();
  });

  useSlot(host, '.trail', () => update?.());

  return target;
}
