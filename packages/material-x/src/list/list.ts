import type { EmptyObject } from 'type-fest';
import { ControlledElement, define } from 'ydin/element.js';
import { useCore } from '../core/utils/useCore.ts';
import template from './list.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type ListProperties = EmptyObject;
export type ListEvents = EmptyObject;
export type ListCSSProperties = Readonly<{
  '--md-list-container-color'?: string;
  '--md-list-container-shape'?: string;
}>;

/**
 * @tag mx-list
 *
 * @summary Lists are continuous groups of text or image-based content.
 *
 * @slot - List item elements.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
export default class List extends ControlledElement {
  constructor() {
    super();
    useCore(this, [template], { role: 'list' }, [defaultStyles]);
  }
}

define('mx-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list': List;
  }
}
