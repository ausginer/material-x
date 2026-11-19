// P17. The owner's sketch as written (sketch/_example.ts, copied unchanged
// from packages/core/src/traits/_example.ts in the owner's checkout) as a
// component base. The sketch's own errors are reported in sketch/_example.ts.
import { ControlledElement } from './element.ts';
import { impl, Valuable, type ValuableTrait } from './sketch/_example.ts';

// (a) In the heritage clause of an exported class, as components are.
// expected: TS9021 (isolatedDeclarations), and an error that the type isn't a constructor
export default class Inline extends impl(ControlledElement, Valuable) {}

// (b) The same in a class that isn't exported, so that isolatedDeclarations
// doesn't apply. expected: an error that the type isn't a constructor
class Local extends impl(ControlledElement, Valuable) {}

// (c) What impl returns for one trait. expected: `never`, so the constant typechecks
type Returned = ReturnType<
  typeof impl<typeof ControlledElement, [typeof Valuable]>
>;
export const returnedIsNever: [Returned] extends [never] ? true : false = true;

// (d) `instanceof` through the Trait object narrows to the class. expected: ok
export function read(node: Node): string | null | undefined {
  return node instanceof Valuable ? node.value : undefined;
}

// (e) An instance type in a heritage clause, which is what impl returns once
// TraitInstance alone is fixed. expected: TS2507
declare const instanceOnly: ControlledElement & ValuableTrait;
class FromInstance extends instanceOnly {}
