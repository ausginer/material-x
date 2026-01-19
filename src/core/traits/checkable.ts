import { Bool } from '../elements/attribute.ts';
import {
  trait,
  type Accessors,
  type Trait,
  type TraitProps,
} from '../elements/impl.ts';

export const Checkable: Trait<
  HTMLElement,
  Accessors<{ checked: Bool }>
> = trait({ checked: Bool });

export type Checkable = TraitProps<typeof Checkable>;

export type CheckableProps = Readonly<{
  checked?: boolean;
}>;
