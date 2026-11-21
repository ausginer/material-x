// Probe: TypeScript requires `super()` in a trait's constructor, because every
// trait class extends a bound. Typecheck only: tsc --noEmit --strict.
declare const Bound: abstract new (...args: any[]) => { b: number };
abstract class WithoutSuper extends Bound {
  constructor() {
    this.b;
  }
}
abstract class WithSuper extends Bound {
  constructor() {
    super();
    this.b;
  }
}
