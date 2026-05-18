import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from 'ydin/element.js';
import {
  Reorderable,
  useReorderable,
  type ReorderableProps,
  type ReorderEvent,
} from 'ydin/traits/reorderable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import { useCore } from '../core/utils/useCore.ts';
import { LIST_REORDERABLE_CTX } from './list-reorderable-context.ts';
import template from './list.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type ListProperties = ReorderableProps;
export type ListEvents = Readonly<{ reorder: ReorderEvent }>;
export type ListCSSProperties = Readonly<{
  '--md-list-container-color'?: string;
  '--md-list-container-shape'?: string;
}>;

const ListCore: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof Reorderable]
> = impl(ControlledElement, [Reorderable]);

/**
 * @tag mx-list
 *
 * @summary Lists are continuous groups of text or image-based content.
 *
 * @attr {boolean} reorderable - Enables drag-and-drop reordering of items.
 *   Items must have a `data-handle` element in their lead or trail slot to
 *   serve as the drag grip.
 *
 * @slot - List item elements.
 *
 * @event reorder - Fired when the user drops an item at a new position.
 *   The event detail contains the dragged item and its `fromIndex`/`toIndex`.
 *   The consumer is responsible for updating the DOM order.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
export default class List extends ListCore {
  constructor() {
    super();
    useCore(this, [template], { role: 'list' }, [defaultStyles]);
    useReorderable(this, LIST_REORDERABLE_CTX);
  }
}

define('mx-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list': List;
  }
}
