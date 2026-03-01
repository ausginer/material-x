import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { useCore } from '../core/utils/useCore.ts';
import template from './icon.tpl.html' with { type: 'html' };
import iconStyles from './styles/icon.ctr.css' with { type: 'css' };

export type IconProperties = EmptyObject;
export type IconEvents = EmptyObject;
export type IconCSSProperties = Readonly<{
  '--md-icon-size'?: string;
  '--md-icon-font'?: string;
}>;

/**
 * @tag mx-icon
 *
 * @summary Icons display a single symbol from an icon font.
 *
 * @slot - Icon glyph text/content.
 *
 * @cssprop --md-icon-size - Overrides icon font size.
 * @cssprop --md-icon-font - Overrides icon font family.
 */
export default class Icon extends ReactiveElement {
  constructor() {
    super();
    useCore(this, [template], {}, [iconStyles]);
  }
}

define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
