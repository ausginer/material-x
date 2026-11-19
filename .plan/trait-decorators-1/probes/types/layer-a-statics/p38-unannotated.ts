// P38. Which unannotated statics isolatedDeclarations accepts, and so which
// kinds a declaration can carry without an author's annotation.
import { trait } from '../layer-b/piirre.ts';

export class Unannotated {
  static {
    trait(this);
  }
  static readonly array = ['a']; // expected: TS9017, arrays need `as const`
  static readonly arrayAsConst = ['a'] as const; // expected: ok, a tuple
  static readonly object = { a: 1 }; // expected: ok, an object literal type
  static readonly objectWithArray = { a: ['x'] }; // expected: TS9017
  static readonly text = 'a'; // expected: ok
  static readonly map = new Map<string, number>(); // expected: TS9012
  static readonly fn = (value: string): string => value; // expected: ok, a function type
}
