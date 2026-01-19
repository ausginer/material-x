import { Bool } from '../elements/attribute.ts';
import {
  trait,
  type Accessors,
  type Trait,
  type TraitProps,
} from '../elements/impl.ts';

export const Disableable: Trait<
  HTMLElement,
  Accessors<{ disabled: Bool }>
> = trait({ disabled: Bool });

export type Disableable = TraitProps<typeof Disableable>;
