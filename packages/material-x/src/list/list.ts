import {
  useCSSProps,
  type CSSPropDescription,
} from '@ydinjs/core/controllers/useCSSProps.js';
import {
  ControlledElement,
  define,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import {
  Reorderable,
  useReorderable,
  type ReorderableProps,
  type ReorderEvent,
} from '@ydinjs/core/traits/reorderable.js';
import { identity, parseMs } from '../core/utils/fns.ts';
import { useCore } from '../core/utils/useCore.ts';
import template from './list.tpl.html' with { type: 'html' };
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

const CSS_PROPS = {
  easing: ['--_drag-easing', identity<string>],
  duration: ['--_drag-duration', parseMs],
} as const satisfies Readonly<Record<string, CSSPropDescription<unknown>>>;

export type ListProperties = ReorderableProps;
export type ListEvents = Readonly<{ reorder: ReorderEvent }>;
export type ListCSSProperties = Readonly<{
  '--md-list-container-color'?: string;
  '--md-list-container-shape'?: string;
}>;

const ListConstructor: TraitedConstructor<
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
 *   An item may designate a `data-handle` element (e.g. in its lead or trail
 *   slot) as the drag grip; if it has none, its whole surface starts the drag.
 *   A drag begins only on a primary press that moves past a small threshold, so
 *   plain clicks and taps on nested controls are unaffected.
 *
 * @slot - List item elements.
 *
 * @event reorder - Fired when the user drops an item at a new position.
 *   The event exposes the dragged `item` and its `from` and `to` indices
 *   directly.
 *   The consumer is responsible for updating the DOM order, and should do so
 *   synchronously in the handler — a deferred reorder makes the dropped item
 *   snap back to its old slot for a frame before landing.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
export default class List extends ListConstructor {
  constructor() {
    super();
    useCore(this, [template], { role: 'list' }, [defaultStyles]);
    const cssProps = useCSSProps(this, CSS_PROPS);
    useReorderable(this, cssProps);
  }
}

define('mx-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list': List;
  }
}
