// P45 (c) to (g): misuse. Each `// expect:` line names the case.
import { AnyElement, trait } from './composition.ts';

// (c) A class with no bound. expect: TS1238
@trait
export class Plain {}

// (d) Called. expect: TS2554 and TS1238
@trait()
export class Called extends AnyElement {}

// (e) The old form, `trait(this)` in a static block. expect: TS2554
export class Old extends AnyElement {
  static {
    trait(this);
  }
}

// (f) On a method. expect: TS1241
export class OnMethod extends AnyElement {
  @trait
  method(): void {}
}

// (g) A class expression. expect: no decorator error from TypeScript (the
// isolatedDeclarations error is the export's); the plugin refuses it
export const Expression =
  @trait
  class extends AnyElement {};
