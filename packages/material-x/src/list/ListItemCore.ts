import {
  ControlledElement,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import { $ } from 'ydin/utils/DOM.js';
import '../core/styles/elevation/elevation.runtime.ts';
import { useHasSlottedPolyfill } from '../core/utils/polyfills.ts';
import { useCore } from '../core/utils/useCore.ts';
import nestedTemplate from './list-item-shared.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/list-item.css.ts' with { type: 'css' };

export const ListItemCore: ControlledElementConstructor = ControlledElement;
export type ListItemCore = InstanceType<typeof ListItemCore>;

export type ListItemCoreProperties = Record<never, never>;
export type ListItemCoreEvents = Readonly<{
  click: MouseEvent;
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

export function useListItemCore(
  host: ListItemCore,
  template: HTMLTemplateElement,
  styles: ReadonlyArray<CSSStyleSheet | string> = [defaultStyles],
  init?: Partial<ShadowRootInit>,
): HTMLDivElement | HTMLButtonElement | HTMLAnchorElement {
  useCore(host, [template], { role: 'listitem' }, styles, init);
  const target = $<HTMLDivElement | HTMLButtonElement | HTMLAnchorElement>(
    host,
    '.host',
  )!;
  target.append(nestedTemplate.content.cloneNode(true));

  useHasSlottedPolyfill(host);

  return target;
}
