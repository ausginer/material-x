// P2b. A typed marker checks that the merged interface names every marked
// trait. It can't check the converse.
import { ControlledElement } from './element.ts';
import { Disableable, FocusForwarding } from './traits.ts';

type Ctor = abstract new (...args: any[]) => object;
type All<T extends readonly Ctor[]> = T extends readonly [
  infer H extends Ctor,
  ...infer R extends readonly Ctor[],
]
  ? InstanceType<H> & All<R>
  : unknown;

export function traits<const T extends readonly Ctor[]>(
  ..._traits: T
): <C extends abstract new (...args: any[]) => All<T>>(
  value: C,
  context: ClassDecoratorContext<C>,
) => void {
  throw new Error('removed by the flattener');
}

// (a) The interface names both traits: expected ok.
export interface Good extends Disableable, FocusForwarding {}
@traits(Disableable, FocusForwarding)
export class Good extends ControlledElement {}

// (b) The interface omits a marked trait: expected an error at the marker.
export interface Missing extends FocusForwarding {}
@traits(Disableable, FocusForwarding)
export class Missing extends ControlledElement {}

// (c) The interface names a trait the marker omits: expected no error.
export interface Extra extends Disableable, FocusForwarding {}
@traits(FocusForwarding)
export class Extra extends ControlledElement {}
