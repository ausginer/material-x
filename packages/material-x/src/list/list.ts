import {
  ControlledElement,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import type { EmptyObject } from 'type-fest';
import { type ListCoreCSSProperties, useListCore } from './ListCore.ts';

export type ListProperties = EmptyObject;
export type ListEvents = EmptyObject;
export type ListCSSProperties = ListCoreCSSProperties;

const ListConstructor: Composed<ControlledElementConstructor, readonly []> =
  compose(ControlledElement);

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
export default class List extends ListConstructor {
  constructor() {
    super();
    useListCore(this);
  }
}

customElements.define('mx-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list': List;
  }
}
