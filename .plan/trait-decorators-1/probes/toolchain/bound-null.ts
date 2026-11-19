// P30. A bound as `class {}` against a bound as `null`, at runtime in Node:
// what a trait class that extends each one does. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/bound-null.ts
const attempt = (label: string, run: () => unknown): void => {
  try {
    console.log(`  ${label} →`, run());
  } catch (error) {
    console.log(
      `  ${label} → throws`,
      `${(error as Error).name}: ${(error as Error).message}`,
    );
  }
};

// The fixed file's trait(), unchanged.
const trait = (ctr: abstract new (...args: any[]) => unknown): void => {
  const $brand = Symbol();
  Object.defineProperty(ctr, Symbol.hasInstance, {
    configurable: true,
    value: (o: unknown): boolean =>
      o != null && typeof o === 'object' && (o as any)[$brand] === true,
  });
  brands.set(ctr, $brand);
};
const brands = new WeakMap<object, symbol>();

for (const [label, bound] of [
  ['class {}', () => class {}],
  ['null', () => null],
] as const) {
  console.log(`== bound() returns ${label}`);
  const AnyElement: any = bound();
  let Disableable: any;
  let Observing: any;
  attempt('a trait class that extends the bound evaluates', () => {
    Disableable = class Disableable extends AnyElement {
      static {
        trait(this);
      }
      get disabled(): boolean {
        return (this as any).hasAttribute('disabled');
      }
      focusBase(): unknown {
        return super.focus;
      }
    };
    Observing = class Observing extends AnyElement {
      static {
        trait(this);
      }
      static observed(): unknown {
        return this.observedAttributes ?? [];
      }
      static baseStatic(): unknown {
        return super.observedAttributes;
      }
    };
    return 'ok';
  });
  attempt('the trait prototype inherits Object.prototype', () =>
    Object.prototype.isPrototypeOf.call(
      Object.prototype,
      Disableable.prototype,
    ),
  );
  attempt(
    'the trait prototype has toString',
    () => typeof Disableable.prototype.toString,
  );
  attempt('the trait constructor inherits Function.prototype', () =>
    Object.getPrototypeOf(Disableable) === Function.prototype
      ? 'directly'
      : Function.prototype.isPrototypeOf(Disableable)
        ? 'through the bound'
        : 'no',
  );
  attempt('new Disableable()', () => typeof new Disableable());
  attempt('super.focus in an instance member, on an object', () =>
    Disableable.prototype.focusBase.call({}),
  );
  attempt('this.observedAttributes in a static member', () =>
    Observing.observed(),
  );
  attempt('super.observedAttributes in a static member', () =>
    Observing.baseStatic(),
  );
  // A component as the flattener emits it: the brand on its prototype.
  class Component {}
  Object.defineProperty(Component.prototype, brands.get(Disableable)!, {
    value: true,
  });
  attempt(
    'component instanceof Disableable',
    () => new Component() instanceof Disableable,
  );
  attempt('{} instanceof Disableable', () => ({}) instanceof Disableable);
  attempt(
    'Object.create(Disableable.prototype) instanceof Disableable',
    () => Object.create(Disableable.prototype) instanceof Disableable,
  );
  // Without trait(), instanceof falls back to the prototype chain.
  const Plain: any = class extends AnyElement {};
  attempt(
    'without trait(): Object.create(Plain.prototype) instanceof Plain',
    () => Object.create(Plain.prototype) instanceof Plain,
  );
}

console.log('== compose() with bound() returning null');
// fix 5 with a null bound: no WeakSet, a bound is the one value null.
const compose = (base: unknown): any => {
  if (base !== null) {
    throw new Error('compose() of a component is replaced by the flattener');
  }
  return base;
};
const AnyElement: any = null;
attempt('a supertrait: class extends compose(AnyElement)', () => {
  class LabelledButton extends compose(AnyElement) {
    static {
      trait(this);
    }
  }
  return typeof LabelledButton;
});
attempt('a component: compose(class Base {})', () => compose(class Base {}));
attempt('a base still in its temporal dead zone: compose(undefined)', () =>
  compose(undefined),
);
