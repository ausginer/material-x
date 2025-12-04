import type { EmptyObject } from 'type-fest';
import { useCore } from '../core/controllers/useCore.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import css from './styles/icon.css.ts?type=css' with { type: 'css' };

export type IconAttributes = EmptyObject;
export type IconProperties = EmptyObject;
export type IconEvents = EmptyObject;
export type IconCSSProperties = Readonly<{
  '--md-icon-size'?: string;
  '--md-icon-font'?: string;
}>;

const TEMPLATE = html`<slot></slot>`;

export default class Icon extends ReactiveElement {
  constructor() {
    super();
    useCore(this, TEMPLATE, {}, [css]);
  }
}

define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
