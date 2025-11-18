import { useCore } from '../core/controllers/useCore.ts';
import {
  define,
  html,
  ReactiveElement,
} from '../core/elements/reactive-element.ts';
import css from './icon.css.ts?type=css' with { type: 'css' };

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
