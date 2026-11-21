import type { ControlledElement } from '@ydinjs/core/element.js';
import { useCore } from '../core/utils/useCore.ts';
import template from './list.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type ListCoreCSSProperties = Readonly<{
  '--md-list-container-color'?: string;
  '--md-list-container-shape'?: string;
}>;

/** The template, role and styles that `mx-list` and `mx-sortable-list` share. */
export function useListCore(host: ControlledElement): void {
  useCore(host, [template], { role: 'list' }, [defaultStyles]);
}
