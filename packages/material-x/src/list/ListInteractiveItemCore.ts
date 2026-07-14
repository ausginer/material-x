import { Bool } from '@ydinjs/core/attribute.js';
import { useARIA } from '@ydinjs/core/controllers/useARIA.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import {
  Selectable,
  type SelectableProps,
} from '@ydinjs/core/traits/selectable.js';
import type { Traited } from '@ydinjs/core/traits/attributes.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import {
  LIST_ITEM_CORE_TRAITS,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreProperties,
} from './ListItemCore.ts';

export type ListInteractiveItemCoreProperties = ListItemCoreProperties &
  SelectableProps &
  DisableableProps;
export type ListInteractiveItemCoreCSSProperties = ListItemCoreCSSProperties &
  Readonly<{
    '--md-list-item-press-duration'?: string;
    '--md-list-item-press-easing'?: string;
  }>;

export const LIST_INTERACTIVE_ITEM_CORE_TRAITS: readonly [
  ...typeof LIST_ITEM_CORE_TRAITS,
  typeof Disableable,
  typeof Selectable,
] = [...LIST_ITEM_CORE_TRAITS, Disableable, Selectable];

export type ListInteractiveItemCore = Traited<
  ControlledElement,
  typeof LIST_INTERACTIVE_ITEM_CORE_TRAITS
>;

export function useInteractiveListItemCore(
  host: ListInteractiveItemCore,
  template: HTMLTemplateElement,
): HTMLButtonElement | HTMLAnchorElement {
  const target = useListItemCore(host, template, [focusStyles], {
    delegatesFocus: true,
  }) as HTMLButtonElement | HTMLAnchorElement;

  useDisableable(host, target);
  useARIA(host, target);
  useRipple(host, target, target);
  useAttributes(host, {
    selected: via(Bool, (_, newValue) => {
      toggleState(internals(host), 'selected', newValue);
    }),
    disabled: via(Bool, (_, newValue) => {
      toggleState(internals(host), 'disabled', newValue);
    }),
  });

  return target;
}
