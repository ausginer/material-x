// The mixin form's declarations: an exported mixin under isolatedDeclarations,
// and a mixin with a private member under `declaration: true`.

type Ctor<I = object> = abstract new (...args: any[]) => I;

class Element0 {}

// (e) No return type annotation. expect: an isolatedDeclarations error
export const Disableable = <B extends Ctor<Element0>>(base: B) => {
  abstract class Disableable extends base {
    get disabled(): boolean {
      return false;
    }
    set disabled(_value: boolean) {}
  }
  return Disableable;
};

// (f) A private member in an exported mixin. expect: TS4094
export const Counting = <B extends Ctor<Element0>>(base: B) => {
  abstract class Counting extends base {
    private count = 0;
    #seen = 0;
    bump(): number {
      return (this.count += 1) + this.#seen;
    }
  }
  return Counting;
};

export { Element0 };
