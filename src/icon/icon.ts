import {
  define,
  template,
  CoreElement,
} from '../core/elements/core-element.ts';
import css from './icon.css' with { type: 'css' };

const TEMPLATE = template`<slot></slot>`;

export default class Icon extends CoreElement {
  constructor() {
    super(TEMPLATE, {}, [css]);
  }
}

define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
