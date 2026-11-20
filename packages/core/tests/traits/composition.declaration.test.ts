// oxlint-disable typescript/no-unsafe-type-assertion, max-classes-per-file, eslint/class-methods-use-this, typescript/no-extraneous-class
import { describe, expectTypeOf, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import {
  bound,
  compose,
  trait,
  type Bound,
  type Composed,
} from '../../src/traits/composition.ts';

const AnyElement: Bound<HTMLElement> = bound();
const Controlled: Bound<ControlledElement> = bound();
const AnyObject: Bound<object> = bound();

@trait
class ButtonLike extends AnyElement {
  static readonly observedAttributes: ReadonlyArray<'color' | 'size'> = [
    'color',
    'size',
  ];

  static readonly shadow: {
    readonly mode: 'open';
    readonly delegates: boolean;
  } = { mode: 'open', delegates: true };

  static readonly variant = 'filled' as const;

  get size(): 'small' | 'medium' | null {
    return null;
  }

  set size(_value: 'small' | 'medium' | null) {}

  get color(): string | null {
    return null;
  }

  set color(_value: string | null) {}

  describe(): string {
    return 'button';
  }
}

@trait
class FABLike extends AnyElement {
  static readonly observedAttributes: ReadonlyArray<'size' | 'extended'> = [
    'size',
    'extended',
  ];

  static readonly shadow: { readonly mode: 'closed' } = { mode: 'closed' };

  static readonly variant = 'tonal' as const;

  get size(): 'large' | null {
    return null;
  }

  set size(_value: 'large' | null) {}

  describe(): number {
    return 1;
  }
}

@trait
class Disableable extends AnyElement {
  get disabled(): boolean {
    return false;
  }

  set disabled(_value: boolean) {}
}

@trait
class Counted extends AnyObject {
  declare count: number;

  static zero(): number {
    return 0;
  }
}

@trait
class Focusing extends Controlled {
  // The field exists for its type: it makes the trait nominal.
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;

  override focus(_options?: FocusOptions): void {}
}

const FABBase: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof FABLike]
> = compose(ControlledElement);
class FAB extends FABBase {}

const ButtonBase: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Disableable, typeof Counted]
> = compose(ControlledElement);
class Button extends ButtonBase {}

describe('Composed', () => {
  it("should give the component each trait's instance members", () => {
    expectTypeOf<Button['disabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<Button['count']>().toEqualTypeOf<number>();
  });

  it("should give the component the base's instance members", () => {
    expectTypeOf<Button>().toExtend<ControlledElement>();
  });

  it("should give the component a trait's statics", () => {
    expectTypeOf(Button.zero).toEqualTypeOf<() => number>();
  });

  it('should give the later trait an instance key that two traits declare', () => {
    expectTypeOf<FAB['size']>().toEqualTypeOf<'large' | null>();
    expectTypeOf<ReturnType<FAB['describe']>>().toEqualTypeOf<number>();
  });

  it("should keep the earlier trait's other members", () => {
    expectTypeOf<FAB['color']>().toEqualTypeOf<string | null>();
  });

  it('should join array statics', () => {
    expectTypeOf(FAB.observedAttributes).toEqualTypeOf<
      ReadonlyArray<'color' | 'size' | 'extended'>
    >();
  });

  it('should spread object statics, the later key winning', () => {
    expectTypeOf(FAB.shadow.mode).toEqualTypeOf<'closed'>();
    expectTypeOf(FAB.shadow.delegates).toEqualTypeOf<boolean>();
  });

  it('should give the later trait a simple static', () => {
    expectTypeOf(FAB.variant).toEqualTypeOf<'tonal'>();
  });

  it("should report an own field over a trait's accessor", () => {
    class OwnField extends ButtonBase {
      // @ts-expect-error: TS2610, `disabled` is an accessor
      override disabled = true;
    }

    expectTypeOf<OwnField>().toExtend<Button>();
  });

  it("should report an own field over another trait's accessor when no key is shared", () => {
    class OwnField extends ButtonBase {
      // @ts-expect-error: TS2610, ButtonLike keeps its accessor kinds
      override color: string | null = null;
    }

    expectTypeOf<OwnField>().toExtend<Button>();
  });

  it("should report an accessor over a trait's field", () => {
    class AccessorOverField extends ButtonBase {
      // @ts-expect-error: TS2611, `count` is a field
      override get count(): number {
        return 0;
      }
    }

    expectTypeOf<AccessorOverField>().toExtend<Button>();
  });

  it('should accept a key that the component declares itself', () => {
    class Declares extends FABBase {
      override get size(): 'large' | null {
        return null;
      }

      override set size(_value: 'large' | null) {}
    }

    expectTypeOf<Declares['size']>().toEqualTypeOf<'large' | null>();
  });

  it('should reject a trait whose bound the base does not meet', () => {
    class Plain extends HTMLElement {}
    // @ts-expect-error: TS2344, Focusing needs a ControlledElement
    type Rejected = Composed<typeof Plain, [typeof Focusing]>;

    expectTypeOf<Rejected>().not.toBeNever();
  });

  it("should reject a call that names another base than the annotation's", () => {
    class Other {}
    // @ts-expect-error: TS2322, the annotation's base must accept the call's
    const Mismatched: Composed<typeof ControlledElement, []> = compose(Other);

    expectTypeOf(Mismatched).not.toBeNever();
  });
});

describe('trait', () => {
  it("should leave a decorated trait's type its class's", () => {
    class Undecorated extends AnyElement {
      get disabled(): boolean {
        return false;
      }

      set disabled(_value: boolean) {}
    }

    expectTypeOf<Disableable>().toEqualTypeOf<Undecorated>();
  });

  it('should reject a class that does not extend a bound', () => {
    // @ts-expect-error: TS1238, the class has no bound's heritage
    @trait
    class Unbound {}

    expectTypeOf<Unbound>().toBeObject();
  });

  it('should reject a call of the decorator', () => {
    // @ts-expect-error: TS2554 and TS1238, `trait` takes the class itself
    @trait()
    class Called extends AnyElement {}

    expectTypeOf<Called>().toExtend<HTMLElement>();
  });

  it('should reject the decorator on a method', () => {
    class Host {
      // @ts-expect-error: TS1241, `trait` decorates a class
      @trait
      method(): void {}
    }

    expectTypeOf<Host>().toBeObject();
  });

  it('should narrow by instanceof to the trait class', () => {
    const value = null as unknown as HTMLElement;

    if (value instanceof Disableable) {
      expectTypeOf(value.disabled).toEqualTypeOf<boolean>();
    }
  });

  it('should make a trait with a private brand nominal', () => {
    const accept = (_value: Focusing): void => {};
    const element = null as unknown as ControlledElement;

    // @ts-expect-error: a plain ControlledElement isn't a Focusing
    accept(element);

    expectTypeOf(accept).toBeFunction();
  });

  it('should require an abstract member of a trait', () => {
    @trait
    abstract class Labelled extends AnyElement {
      abstract label(): string;
    }
    const LabelledBase: Composed<typeof ControlledElement, [typeof Labelled]> =
      compose(ControlledElement);
    // @ts-expect-error: TS2515, `label` is abstract
    class Unlabelled extends LabelledBase {}

    expectTypeOf<Unlabelled>().toExtend<Labelled>();
  });
});

@trait
class Wide extends AnyElement {
  get width(): 'wide' | 'narrow' | null {
    return null;
  }

  set width(_value: 'wide' | 'narrow' | null) {}

  declare color: 'tonal' | null;
}

/** SwitchIconButton's order: the nominal trait before the one that shares a key. */
const SharedBase: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Disableable, typeof Focusing, typeof Wide]
> = compose(ControlledElement);
class Shared extends SharedBase {}

@trait
class Sized extends AnyElement {
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;

  declare size: 'small' | null;
}

@trait
class Large extends AnyElement {
  declare size: 'large' | null;
}

const SizedLargeBase: Composed<
  typeof ControlledElement,
  [typeof Sized, typeof Large]
> = compose(ControlledElement);
class SizedLarge extends SizedLargeBase {}

describe('Composed with a key that two traits share', () => {
  it('should keep the private brand of a trait that loses no key', () => {
    expectTypeOf<Shared>().toExtend<Focusing>();
  });

  it("should give the later trait's type to the shared key", () => {
    expectTypeOf<Shared['color']>().toEqualTypeOf<'tonal' | null>();
  });

  it('should report an own field over the accessor of a trait that loses no key', () => {
    class OwnDisabled extends SharedBase {
      // @ts-expect-error: TS2610, Disableable keeps its accessor
      override disabled = true;
    }

    expectTypeOf<OwnDisabled>().toExtend<Shared>();
  });

  it('should drop the private brand of a trait that loses a key', () => {
    expectTypeOf<SizedLarge>().not.toExtend<Sized>();
  });
});

class Host extends HTMLElement {
  get acc(): number {
    return 0;
  }

  set acc(_value: number) {}

  meth(): void {}
}

const AnyHost: Bound<Host> = bound();

@trait
class First extends AnyHost {
  shared(): void {}
}

@trait
class Second extends AnyHost {
  shared(): string {
    return '';
  }
}

/** A composition that trims First: it loses `shared` to Second. */
const PairBase: Composed<typeof Host, [typeof First, typeof Second]> =
  compose(Host);

describe('Composed with a trimmed trait', () => {
  it('should accept an override of a base method', () => {
    class Overrides extends PairBase {
      override meth(): void {}
    }

    expectTypeOf<Overrides>().toExtend<Host>();
  });

  it("should report an own field over a base's accessor", () => {
    class OwnField extends PairBase {
      // @ts-expect-error: TS2610, `acc` is the base's accessor
      override acc = 1;
    }

    expectTypeOf<OwnField>().toExtend<Host>();
  });
});
