// P40. The owner's question 8: the last trait wins a shared key, and the
// types agree. Each case states its expected result.
import { ControlledElement } from '../../../../../packages/core/src/element.ts';
import {
  bound,
  compose,
  trait,
  type Bound,
  type Composed,
} from './composition.ts';

const AnyElement: Bound<HTMLElement> = bound();

export class ButtonLike extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly ('color' | 'size')[] = [
    'color',
    'size',
  ];
  static readonly shadow: {
    readonly mode: 'open';
    readonly delegates: boolean;
  } = {
    mode: 'open',
    delegates: true,
  };
  static readonly variant: 'filled' = 'filled';
  get size(): 'small' | 'medium' | null {
    return null;
  }
  set size(_value: 'small' | 'medium' | null) {}
  describe(): string {
    return 'button';
  }
  get color(): string | null {
    return null;
  }
  set color(_value: string | null) {}
}

export class FABLike extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly ('size' | 'extended')[] = [
    'size',
    'extended',
  ];
  static readonly shadow: { readonly mode: 'closed' } = { mode: 'closed' };
  static readonly variant: 'tonal' = 'tonal';
  get size(): 'large' | null {
    return null;
  }
  set size(_value: 'large' | null) {}
  describe(): number {
    return 1;
  }
}

export class Disableable extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly 'disabled'[] = ['disabled'];
  get disabled(): boolean {
    return false;
  }
  set disabled(_value: boolean) {}
}

export class Counted {
  static {
    trait(this);
  }
  count: number = 0;
}

// (a) Two traits that share keys: the last wins, in the statics and the instance.
const FABBase: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof FABLike]
> = compose(ControlledElement);
export class FAB extends FABBase {
  check(): void {
    this.size = 'large'; // expected: ok — FABLike's size wins
    const n: number = this.describe(); // expected: ok — FABLike's describe wins
    const c: string | null = this.color; // expected: ok — ButtonLike's other members stay
    void n;
    void c;
  }
}
export const names: readonly ('color' | 'size' | 'extended')[] =
  FAB.observedAttributes; // expected: ok — arrays union
export const mode: 'closed' = FAB.shadow.mode; // expected: ok — objects spread, the last key wins
export const delegates: boolean = FAB.shadow.delegates; // expected: ok — the earlier key stays
export const variant: 'tonal' = FAB.variant; // expected: ok — a simple value, the last wins
export const smaller: FAB['size'] = 'small'; // expected: TS2322 — ButtonLike's size lost

// (b) No shared key: the intersection keeps declaration kinds.
const ButtonBase: Composed<
  typeof ControlledElement,
  [typeof ButtonLike, typeof Disableable, typeof Counted]
> = compose(ControlledElement);
export class OwnField extends ButtonBase {
  override disabled = true; // expected: TS2610 — still an accessor
}
export class AccessorOverField extends ButtonBase {
  override get count(): number {
    // expected: TS2611 — still a field
    return 0;
  }
}

export class OwnFieldOverButtonLike extends ButtonBase {
  override color: string | null = null; // expected: TS2610 — ButtonLike keeps its kinds
}

// (c) With a shared key, the earlier trait goes through Omit, a mapped type.
export class OwnFieldAfterConflict extends FABBase {
  override color: string | null = null; // expected: ok — the check is lost for ButtonLike's other accessors; the flattener's warning names the pair
}

// (d) The component declares the shared key itself: no warning, its type wins.
export class Declares extends FABBase {
  override get size(): 'large' | null {
    return null;
  }
  override set size(_value: 'large' | null) {}
}
