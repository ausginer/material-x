// Probe: where TypeScript guarantees a root-level `super()` in a component's
// constructor (RD-33, decision 7). Typecheck only:
// tsc --ignoreConfig --noEmit --strict --target es2022 component-super.ts
declare const Base: new (...args: any[]) => { b: number };

// No initialized field, parameter property or private name: TypeScript
// accepts a nested `super()`, so the plugin can't rely on it.
class Nested extends Base {
  constructor(flag: boolean) {
    if (flag) {
      super(1);
    } else {
      super(2);
    }
  }
}

// The same with an arrow that calls `super()`.
class InArrow extends Base {
  constructor() {
    const init = () => super();
    init();
  }
}

// With an initialized field, TypeScript requires a root-level `super()`.
class NestedWithField extends Base {
  x = 1;
  constructor(flag: boolean) {
    if (flag) {
      super(1);
    } else {
      super(2);
    }
  }
}

// With a private name only.
class NestedWithPrivate extends Base {
  #y?: number;
  constructor(flag: boolean) {
    if (flag) {
      super(1);
    } else {
      super(2);
    }
  }
}

// Code before a root-level `super()` that doesn't use `this` is accepted.
class Before extends Base {
  x = 1;
  constructor(value: number) {
    const doubled = value * 2;
    super(doubled);
  }
}
