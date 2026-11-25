import type { ControlledElement } from '@ydinjs/core/element.js';
import { useCore } from '../core/utils/useCore.ts';
import template from './list.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type ListCoreCSSProperties = Readonly<{
  '--md-list-container-color'?: string;
  '--md-list-container-shape'?: string;
}>;

/**
 * Sets up the template, role and styles that `mx-list` and `mx-sortable-list`
 * share, and then `styles`.
 */
export function useListCore(
  host: ControlledElement,
  styles: ReadonlyArray<CSSStyleSheet | string> = [],
): void {
  useCore(host, [template], { role: 'list' }, [defaultStyles, ...styles]);
}
