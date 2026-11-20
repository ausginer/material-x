import { bound, trait, type Bound } from '../../src/traits/composition.ts';

const AnyObject: Bound<object> = bound();

/** A trait with no members, whose build exports its brand as `$named`. */
@trait
export class Named extends AnyObject {}
