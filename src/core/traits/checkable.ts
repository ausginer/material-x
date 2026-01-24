import { Bool } from '../elements/attribute.ts';
import {
  trait,
  type Interface,
  type Props,
  type Trait,
} from '../elements/traits.ts';

type CheckableDescriptor = { checked: boolean };
const $checkable: unique symbol = Symbol('Checkable');

export const Checkable: Trait<CheckableDescriptor, typeof $checkable> = trait<
  CheckableDescriptor,
  typeof $checkable
>({ checked: Bool }, $checkable);

export type Checkable = Interface<typeof Checkable>;
export type CheckableProps = Props<typeof Checkable>;
