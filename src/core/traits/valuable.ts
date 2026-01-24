import { Str } from '../elements/attribute.ts';
import {
  trait,
  type Interface,
  type Props,
  type Trait,
} from '../elements/traits.ts';

type ValuableDescriptor = { value: string };

const $valuable: unique symbol = Symbol('Valuable');

export const Valuable: Trait<ValuableDescriptor, typeof $valuable> = trait<
  ValuableDescriptor,
  typeof $valuable
>({ value: Str }, $valuable);

export type Valuable = Interface<typeof Valuable>;
export type ValuableProps = Props<typeof Valuable>;
