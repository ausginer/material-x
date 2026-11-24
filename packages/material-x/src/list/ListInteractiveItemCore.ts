import { Bool } from '@ydinjs/core/attribute.js';
import { useARIA } from '@ydinjs/core/controllers/useARIA.js';
import { useAttributes, via } from '@ydinjs/core/controllers/useAttributes.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import type { Composed } from '@ydinjs/core/traits/composition.js';
import {
  type Disableable,
  useDisableable,
  type DisableableProps,
} from '@ydinjs/core/traits/disableable.js';
import type {
  Selectable,
  SelectableProps,
} from '@ydinjs/core/traits/selectable.js';
import { toggleState } from '@ydinjs/core/utils/DOM.js';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import {
  type ListItemCoreTraits,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreProperties,
} from './ListItemCore.ts';
import interactiveBoxStyles from './styles/item/interactive-box.css.ts' with { type: 'css' };

export type ListInteractiveItemCoreProperties = ListItemCoreProperties &
  SelectableProps &
  DisableableProps;
export type ListInteractiveItemCoreCSSProperties = ListItemCoreCSSProperties &
  Readonly<{
    '--md-list-item-press-duration'?: string;
    '--md-list-item-press-easing'?: string;
  }>;

export type ListInteractiveItemCoreTraits = readonly [
  ...ListItemCoreTraits,
  typeof Disableable,
  typeof Selectable,
];

export type ListInteractiveItemCore = InstanceType<
  Composed<typeof ControlledElement, ListInteractiveItemCoreTraits>
>;

export function useInteractiveListItemCore(
  host: ListInteractiveItemCore,
  template: HTMLTemplateElement,
): HTMLButtonElement | HTMLAnchorElement {
  const target = useListItemCore(host, [interactiveBoxStyles], template, {
    delegatesFocus: true,
  })!;

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
