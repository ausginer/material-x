import { Str } from '../elements/attribute.ts';
import {
  trait,
  type Accessors,
  type Trait,
  type TraitProps,
} from '../elements/impl.ts';

export const Valuable: Trait<HTMLElement, Accessors<{ value: Str }>> = trait({
  value: Str,
});

export type Valuable = TraitProps<typeof Valuable>;

export type ValuableProps = Readonly<{
  checked?: boolean;
  value?: string;
}>;
