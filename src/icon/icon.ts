import type { EmptyObject } from 'type-fest';
import { define, ReactiveElement } from '../core/elements/reactive-element.ts';
import { useCore } from '../core/utils/useCore.ts';
import iconTemplate from './icon.tpl.html' with { type: 'html' };
import iconStyles from './styles/icon.ctr.css' with { type: 'css' };

export type IconProperties = EmptyObject;
export type IconEvents = EmptyObject;
export type IconCSSProperties = Readonly<{
  '--md-icon-size'?: string;
  '--md-icon-font'?: string;
}>;

export default class Icon extends ReactiveElement {
  constructor() {
    super();
    useCore(this, iconTemplate, {}, [iconStyles]);
  }
}

define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
