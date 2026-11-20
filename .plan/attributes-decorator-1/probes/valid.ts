// P46 (a)-(e): forms that check clean. expect: no error, and declarations
// without either decorator.
import {
  AnyElement,
  trait,
} from '../../trait-decorator-1/probes/composition.ts';
import { attributes, Bool, type ConverterOf, Num, Str } from './attributes.ts';

// (a) An inline table, `@trait` first.
@trait
@attributes({ disabled: Bool })
export class Disableable extends AnyElement {
  accessor disabled!: boolean;
}

// (b) A module constant with an annotated type, as core's traits declare.
const LINKABLE_ATTRS: Readonly<{ href: ConverterOf<string> }> = { href: Str };

@trait
@attributes(LINKABLE_ATTRS)
export class Linkable extends AnyElement {
  accessor href!: string | null;

  // A method beside the attributes isn't a table key and needs none.
  follow(): void {}
}

// (c) Several members, one left out of the table (the plugin reports it, as
// today), and a narrowed converter on a matching union.
type Width = 'narrow' | 'wide';

@trait
@attributes({ count: Num, width: Str as ConverterOf<Width> })
export class Counted extends AnyElement {
  accessor count!: number | null;
  accessor width!: Width | null;
}

// (d) A nominal trait with a private brand and attributes.
@trait
@attributes({ open: Bool })
export class Openable extends AnyElement {
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;

  accessor open!: boolean;
}

// (e) The member's type is still the declared one.
export const checkOpen: boolean = new (class extends Openable {})().open;
