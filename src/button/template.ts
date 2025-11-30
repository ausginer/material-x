import { html } from '../core/elements/reactive-element.ts';

// prettier-ignore
export const REGULAR_TEMPLATE: HTMLTemplateElement =
  html`<slot class="icon" name="icon"></slot><slot></slot>`;

// prettier-ignore
export const LINK_TEMPLATE: HTMLTemplateElement =
  html`<a>${REGULAR_TEMPLATE}</a>`;

// prettier-ignore
export const ICON_TEMPLATE: HTMLTemplateElement =
  html`<slot class="icon"></slot>`;
