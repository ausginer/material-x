import CoreElement from '../core/elements/core.ts';
import { template, define } from '../utils.ts';
import css from './icon.scss' with { type: 'css' };

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
