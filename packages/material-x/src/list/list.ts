import {
  useCSSProps,
  type CSSPropDescription,
} from 'ydin/controllers/useCSSProps.js';
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
 *   The event exposes the dragged `item` and its `from` and `to` indices
 *   directly.
 *   The consumer is responsible for updating the DOM order.
 *
 * @cssprop --md-list-container-color - Overrides the list container color.
 * @cssprop --md-list-container-shape - Overrides the list container shape.
 */
const List: TraitedConstructor<
  ControlledElement,
  ControlledElementConstructor,
  [typeof Reorderable]
> = impl(ControlledElement, [Reorderable])(
  (Base) =>
    class extends Base {
      constructor() {
        super();
        useCore(this, [template], { role: 'list' }, [defaultStyles]);
        const cssProps = useCSSProps(this, CSS_PROPS);
        useReorderable(this, cssProps);
      }
    },
);
type List = InstanceType<typeof List>;

export default List;

define('mx-list', List);

declare global {
  interface HTMLElementTagNameMap {
    'mx-list': List;
  }
}
