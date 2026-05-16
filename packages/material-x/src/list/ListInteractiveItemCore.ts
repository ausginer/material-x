import { Bool } from 'ydin/attribute.js';
import { useARIA } from 'ydin/controllers/useARIA.js';
import { useAttributes } from 'ydin/controllers/useAttributes.js';
import { internals } from 'ydin/element.js';
import {
  Disableable,
  useDisableable,
  type DisableableProps,
} from 'ydin/traits/disableable.js';
import { Selectable, type SelectableProps } from 'ydin/traits/selectable.js';
import { impl, type TraitedConstructor } from 'ydin/traits/traits.js';
import { toggleState } from 'ydin/utils/DOM.js';
import { useRipple } from '../core/animations/ripple/ripple.ts';
import elevationStyles from '../core/styles/elevation/elevation.css.ts' with { type: 'css' };
import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };
import {
  ListItemCore,
  useListItemCore,
  type ListItemCoreCSSProperties,
  type ListItemCoreProperties,
} from './ListItemCore.ts';
import interactiveStyles from './styles/item/interactive.css.ts' with { type: 'css' };
import defaultStyles from './styles/item/main.css.ts' with { type: 'css' };

export type ListInteractiveItemCoreProperties = ListItemCoreProperties &
  SelectableProps &
  DisableableProps;
export type ListInteractiveItemCoreCSSProperties = ListItemCoreCSSProperties &
  Readonly<{
    '--md-list-item-press-duration'?: string;
    '--md-list-item-press-easing'?: string;
  }>;

export const ListInteractiveItemCore: TraitedConstructor<
  ListItemCore,
  typeof ListItemCore,
  [typeof Disableable, typeof Selectable]
> = impl(ListItemCore, [Disableable, Selectable]);
export type ListInteractiveItemCore = InstanceType<
  typeof ListInteractiveItemCore
>;

export function useInteractiveListItemCore(
  host: ListInteractiveItemCore,
  template: HTMLTemplateElement,
): HTMLButtonElement | HTMLAnchorElement {
  const target = useListItemCore(
    host,
    template,
    [elevationStyles, focusStyles, defaultStyles, interactiveStyles],
    { delegatesFocus: true },
  ) as HTMLButtonElement | HTMLAnchorElement;

  useDisableable(host, target);
  useARIA(host, target);
  useRipple(host, target, target);
  useAttributes(host, {
    selected(_, newValue) {
      toggleState(internals(host), 'selected', Bool.from(newValue));
    },
    disabled(_, newValue) {
      toggleState(internals(host), 'disabled', Bool.from(newValue));
    },
  });

  return target;
}
