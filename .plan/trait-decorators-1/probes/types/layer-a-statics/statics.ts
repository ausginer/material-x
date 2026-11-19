// Trait statics in every shape the generic merge rule has to classify. Each
// annotation is what isolatedDeclarations requires; the unannotated forms are
// in p38-unannotated.ts. Read by tsc, tsc6 and the syntactic classifier (P39).
import { trait } from '../layer-b/piirre.ts';
import type { AttributeNames } from './names.ts';

type LocalNames = readonly string[];
type Options = { readonly delegates: boolean; readonly mode: string };

export class Shapes {
  static {
    trait(this);
  }
  // arrays
  static readonly arrayReadonly: readonly string[] = ['a'];
  static readonly arrayGeneric: ReadonlyArray<string> = ['a'];
  static arrayMutable: string[] = ['a'];
  static readonly arrayUnion: readonly ('a' | 'b')[] = ['a'];
  // tuples
  static readonly tuple: readonly ['a', 'b'] = ['a', 'b'];
  static readonly asConst = ['a', 'b'] as const;
  // objects
  static readonly objectLiteral: { readonly a: number } = { a: 1 };
  static readonly objectReadonly: Readonly<{ a: number }> = { a: 1 };
  static readonly objectRecord: Readonly<Record<string, number>> = {};
  static readonly objectNested: { readonly inner: { readonly a: number } } = {
    inner: { a: 1 },
  };
  static readonly objectAsConst = { a: 1 } as const;
  // simple
  static readonly text: string = 'a';
  static readonly flag: boolean = true;
  static readonly count = 1;
  static readonly literal = 'a';
  // aliases
  static readonly aliasLocal: LocalNames = ['a'];
  static readonly aliasLocalObject: Options = { delegates: true, mode: 'x' };
  static readonly aliasImported: AttributeNames = ['a'];
  // nullable and optional
  static readonly arrayOrUndefined: readonly string[] | undefined = undefined;
  static readonly arrayOrNull: readonly string[] | null = null;
  static readonly arrayOptional?: readonly string[];
  static readonly mixed: readonly string[] | string = 'a';
  // members that are not values
  static zero(): number {
    return 0;
  }
  static get names(): readonly string[] {
    return ['a'];
  }
  // class instances and functions
  static readonly map: ReadonlyMap<string, number> = new Map();
  static readonly set: ReadonlySet<string> = new Set();
  static readonly date: Date = new Date(0);
  static readonly callback: (value: string) => string = (value) => value;
  static readonly typeQuery: typeof Shapes.arrayReadonly = ['a'];
}
