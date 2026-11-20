// P45 (a), (b): the forms the migration writes. expect: no error, and
// declarations without the decorator.
import { AnyElement, trait } from './composition.ts';

/** The decorator before `export`. */
@trait
export class Disableable extends AnyElement {
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(_value: boolean) {}
}

/** The decorator after `export`, with a nominal brand. */
export
@trait
class Forwarding extends AnyElement {
  // eslint-disable-next-line @typescript-eslint/no-unused-private-class-members
  readonly #brand!: true;

  override focus(): void {}
}
