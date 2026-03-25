import { Bool } from '../attribute.ts';
import { trait, type Interface, type Props, type Trait } from './traits.ts';

type DisableableDescriptor = { disabled: boolean };
const $disableable: unique symbol = Symbol('Disableable');

export const Disableable: Trait<DisableableDescriptor, typeof $disableable> =
  trait<DisableableDescriptor, typeof $disableable>(
    { disabled: Bool },
    $disableable,
  );

export type Disableable = Interface<typeof Disableable>;
export type DisableableProps = Props<typeof Disableable>;
