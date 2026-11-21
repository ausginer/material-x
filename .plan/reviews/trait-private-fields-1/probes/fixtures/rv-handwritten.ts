import { RvBase } from './rv-base.ts';
import { rec } from './rv-log.ts';
// What the trait E declares, written by hand into the class.
export class KEHand extends RvBase {
  #unused = rec('E unused field');
  #used = rec('E used field', 'e');
  get ex(): string {
    return this.#used;
  }
}
