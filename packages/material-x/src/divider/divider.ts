import { Str, type ConverterOf } from '@ydinjs/core/attribute.js';
import { useAttributes } from '@ydinjs/core/controllers/useAttributes.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import {
  AnyElement,
  attributes,
  type Props,
} from '@ydinjs/core/traits/attribute-traits.js';
import {
  compose,
  trait,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import { switchState } from '@ydinjs/core/utils/DOM.js';
import type { EmptyObject } from 'type-fest';
import { useCore } from '../core/utils/useCore.ts';
import defaultStyles from './styles/default/main.css.ts' with { type: 'css' };

export type DividerInset = 'start' | 'middle';

export type DividerOrientation = 'horizontal' | 'vertical';

@trait
@attributes({
  inset: Str as ConverterOf<DividerInset>,
  orientation: Str as ConverterOf<DividerOrientation>,
})
export class DividerLike extends AnyElement {
  accessor inset!: DividerInset | null;
  accessor orientation!: DividerOrientation | null;
}

export type DividerLikeProps = Props<typeof DividerLike>;

export type DividerProperties = Readonly<DividerLikeProps>;
export type DividerEvents = EmptyObject;
export type DividerCSSProperties = Readonly<{
  '--md-divider-color'?: string;
  '--md-divider-thickness'?: string;
}>;

const DividerConstructor: Composed<
  ControlledElementConstructor,
  [typeof DividerLike]
> = compose(ControlledElement);

/**
 * @tag mx-divider
 *
 * @summary Dividers are thin lines that group content in lists or other
 * containers.
 *
 * The divider is decorative: it has no role, adds no tab stop and isn't in the
 * accessibility tree. Don't give a decorative divider an `aria-label`, which
 * makes it a node. Set `role="separator"` on a
 * divider that assistive technology should announce. Don't set it on a divider
 * in `mx-list`, where only list items are valid. A vertical separator is
 * announced as vertical, and an `aria-orientation` set on the divider stands.
 *
 * A horizontal divider is as wide as its container. A vertical divider is as
 * high as the layout makes it: a flex row or a grid stretches it, and
 * elsewhere the page gives it a height. The divider has no margin of its own.
 *
 * A horizontal divider that is a direct child of `mx-card` reaches the card's
 * edges, and its inset is measured from the card's edge. Its inline margin
 * doesn't apply there. `mx-sortable-list`
 * doesn't support a divider, because it would sort the divider with its items.
 *
 * @attr {"start"|"middle"} inset - Indents the line by 16px at the start, or at
 * both ends. Omit for a full-width divider.
 * @attr {"horizontal"|"vertical"} orientation - The line's direction. Omit for
 * a horizontal divider.
 *
 * @cssprop --md-divider-color - Overrides the line's color.
 * @cssprop --md-divider-thickness - Overrides the line's thickness.
 */
export default class Divider extends DividerConstructor {
  constructor() {
    super();
    useCore(this, [], {}, [defaultStyles]);

    const innards = internals(this);

    useAttributes(this, {
      inset: (oldValue, newValue) => switchState(innards, oldValue, newValue),
      orientation: (oldValue, newValue) => {
        switchState(innards, oldValue, newValue);
        innards.ariaOrientation = newValue;
      },
    });
  }
}

customElements.define('mx-divider', Divider);

declare global {
  interface HTMLElementTagNameMap {
    'mx-divider': Divider;
  }
}
