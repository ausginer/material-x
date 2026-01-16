import { Bool } from '../elements/attribute.ts';
import {
  trait,
  type Accessors,
  type Trait,
  type TraitProps,
} from '../elements/impl.ts';
import type { ReactiveElement } from '../elements/reactive-element.ts';

export const Disableable: Trait<
  ReactiveElement,
  Accessors<{ disabled: Bool }>
> = trait({ disabled: Bool });

export type Disableable = TraitProps<typeof Disableable>;
