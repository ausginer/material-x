import { ControlledElement } from '@ydinjs/core/element.js';
import type { EmptyObject } from 'type-fest';
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
 * The content is hidden from assistive technology, so it is in no accessible
 * name, and a page doesn't set `aria-hidden` itself. An icon with a meaning
 * takes `role="img"` and `aria-label`.
 *
 * @slot - Icon glyph text/content.
 *
 * @cssprop --md-icon-size - Overrides icon font size.
 * @cssprop --md-icon-font - Overrides icon font family.
 */
export default class Icon extends ControlledElement {
  constructor() {
    super();
    useCore(this, [template], {}, [iconStyles]);
  }
}

customElements.define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
