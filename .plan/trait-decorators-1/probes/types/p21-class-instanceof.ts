// P21. A trait class as its own `instanceof` target, with no separate Trait
// object.
import { ControlledElement } from './element.ts';
import { Disableable } from './traits.ts';

// (a) `instanceof` on the class narrows to its instance type, with no
// `Symbol.hasInstance` in the class's type. expected: ok
export function isOff(node: Node): boolean {
  return node instanceof Disableable && node.disabled;
}

// (b) A typed static `Symbol.hasInstance` written in the class, with
// `override`. expected: unknown under isolatedDeclarations. Observed: ok, no
// TS9038, because `Symbol.hasInstance` is a well-known symbol
export class Branded extends ControlledElement {
  static override [Symbol.hasInstance](_o: unknown): _o is Branded {
    return false;
  }
}
export function isBranded(node: Node): boolean {
  return node instanceof Branded && node.isConnected; // expected: ok
}

// (c) The same without `override`. expected: TS4114, because the base's
// static side has Function's `Symbol.hasInstance`
export class BrandedNoOverride extends ControlledElement {
  static [Symbol.hasInstance](_o: unknown): _o is BrandedNoOverride {
    return false;
  }
}
