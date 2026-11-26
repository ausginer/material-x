import { useEvents } from '@ydinjs/core/controllers/useEvents.js';
import { useRovingTabindex } from '@ydinjs/core/controllers/useRovingTabindex.js';
import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  ControlledElement,
  internals,
  type ControlledElementConstructor,
} from '@ydinjs/core/element.js';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import buttonGroupTemplate from './button-group.tpl.html' with { type: 'html' };
import {
  type ButtonGroupCoreTraits,
  useButtonGroupCore,
  type ButtonGroupCoreCSSProperties,
  type ButtonGroupCoreEvents,
  type ButtonGroupCoreProps,
} from './ButtonGroupCore.ts';
import connectedStyles from './styles/connected/main.css.ts' with { type: 'css' };

export type ConnectedButtonGroupProperties = ButtonGroupCoreProps;
export type ConnectedButtonGroupEvents = ButtonGroupCoreEvents;
export type ConnectedButtonGroupCSSProperties = ButtonGroupCoreCSSProperties;

const ConnectedButtonGroupConstructor: Composed<
  ControlledElementConstructor,
  ButtonGroupCoreTraits
> = compose(ControlledElement);

/**
 * @tag mx-connected-button-group
 *
 * @summary Connected button groups arrange checkable buttons as a segmented
 * control.
 *
 * A member hidden with its `hidden` attribute, or disabled, isn't the group's
 * tab stop, and no key moves focus to it. The outer corners are on the first
 * and the last member that isn't hidden.
 *
 * @attr {"outlined"|"elevated"|"text"|"tonal"} color - Shared color variant
 * for child buttons.
 * @attr {"xsmall"|"medium"|"large"|"xlarge"} size - Shared size for child
 * buttons.
 * @attr {"round"|"square"} shape - Shared shape for child buttons.
 * @attr {boolean} disabled - Group disabled state.
 * @attr {string} value - Selected group value.
 *
 * @slot - Checkable button elements.
 *
 * @cssprop --md-button-group-between-space - Overrides spacing between buttons.
 * @cssprop --md-button-group-interaction-width-multiplier - Overrides active
 * overlap width factor.
 * @cssprop --md-button-group-inner-corner-size - Overrides the inner corner
 * radius of a button at rest. A selected or pressed button keeps its own
 * corners.
 */
export default class ConnectedButtonGroup extends ConnectedButtonGroupConstructor {
  constructor() {
    super();
    useButtonGroupCore(this, buttonGroupTemplate, { role: 'group' }, [
      connectedStyles,
    ]);

    useRovingTabindex(this);

    const innards = internals(this);
    // A member's host matches `:focus` and never `:focus-visible`, so CSS can't
    // tell the keyboard's focus from a pointer's. The focused control is read
    // rather than the event's target: an arrow key moves focus during
    // `keydown`, whose target is then the former control.
    const updateFocusVisible = () => {
      toggleState(
        innards,
        'focus-visible',
        Array.from(this.children).some((member) =>
          member.shadowRoot?.activeElement?.matches(':focus-visible'),
        ),
      );
    };

    useEvents(this, {
      focusin: updateFocusVisible,
      // After a click, a key can make the focused control match
      // `:focus-visible` without a `focusin`.
      keydown: updateFocusVisible,
    });

    const slot = this.shadowRoot!.querySelector('slot')!;
    // The ends read no style, so a member that a page's style alone hides or
    // shows doesn't move them. A mark is written only where it changes.
    const markEnds = () => {
      // The slot's elements, without the text and comment nodes between them.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const elements = slot.assignedElements() as HTMLElement[];
      const shown = elements.filter((element) => !element.hidden);
      const [first] = shown;
      const last = shown.at(-1);

      for (const element of elements) {
        element.toggleAttribute('data-first', element === first);
        element.toggleAttribute('data-last', element === last);
      }
    };

    useSlot(this, slot, markEnds);
    // It observes for the group's whole life, so a member's `hidden` that
    // changes while the group is out is heard, and the connect reads nothing.
    new MutationObserver(markEnds).observe(this, {
      attributeFilter: ['hidden'],
      subtree: true,
    });
  }
}

customElements.define('mx-connected-button-group', ConnectedButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'mx-connected-button-group': ConnectedButtonGroup;
  }
}
