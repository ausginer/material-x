// The mixin form's types, module-local so that `isolatedDeclarations` doesn't
// apply (mixin-declarations.ts reads that). Each `// expect:` line names the
// diagnostic the case is about; run-types.sh prints what each compiler says.

type Ctor<I = object> = abstract new (...args: any[]) => I;

class Element0 {
  getAttribute(_name: string): string | null {
    return null;
  }
}

const Disableable = <B extends Ctor<Element0>>(base: B) => {
  abstract class Disableable extends base {
    get disabled(): boolean {
      return this.getAttribute('disabled') !== null;
    }
    set disabled(_value: boolean) {}
  }
  return Disableable;
};

const Valued = <B extends Ctor<Element0>>(base: B) => {
  abstract class Valued extends base {
    value: string = '';
  }
  return Valued;
};

const Clickable = <B extends Ctor<Element0>>(base: B) => {
  abstract class Clickable extends base {
    click(): void {}
  }
  return Clickable;
};

const Narrow = <B extends Ctor<Element0>>(base: B) => {
  abstract class Narrow extends base {
    declare color: 'a' | null;
  }
  return Narrow;
};

const Wide = <B extends Ctor<Element0>>(base: B) => {
  abstract class Wide extends base {
    get color(): 'a' | 'b' | null {
      return null;
    }
    set color(_value: 'a' | 'b' | null) {}
  }
  return Wide;
};

// (a) RF-57's case: a field over a trait's accessor. expect: TS2610
class FieldOverAccessor extends Disableable(Element0) {
  override disabled = true;
}

// (b) An accessor over a trait's field. expect: TS2611
class AccessorOverField extends Valued(Element0) {
  override get value(): string {
    return '';
  }
  override set value(_value: string) {}
}

// (c) A method override through the chain, the TS2425 case of RD-26's
// second property 4 amendment. expect: no error
class MethodOverride extends Clickable(Disableable(Element0)) {
  override click(): void {
    super.click();
  }
}

// (d) Last-wins: Wide comes later, so the runtime accepts 'b'.
// expect: no error under last-wins; the mixin's intersection gives TS2322
class LastWins extends Wide(Narrow(Element0)) {}
new (LastWins as unknown as new () => LastWins)().color = 'b';

export {};
void [FieldOverAccessor, AccessorOverField, MethodOverride];
