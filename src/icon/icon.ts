import { attachShadow, createTemplate, define } from '../utils.js';
import css from './icon.scss' with { type: 'css' };

const template = createTemplate(`<slot></slot>`);

export default class Icon extends HTMLElement {
  constructor() {
    super();
    attachShadow(this, template, [css]);
  }
}

define('mx-icon', Icon);

declare global {
  interface HTMLElementTagNameMap {
    'mx-icon': Icon;
  }
}
