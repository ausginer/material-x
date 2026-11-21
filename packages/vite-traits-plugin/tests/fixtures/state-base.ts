import { record } from './state-order.ts';

/**
 * A DOM-free base that records when its field and its constructor run, and
 * keeps the arguments it was constructed with.
 */
export class StateBase {
  static observedAttributes: readonly string[] = ['data-state'];

  readonly baseField: string = record('base field');
  readonly args: readonly unknown[];

  constructor(...args: unknown[]) {
    this.args = args;
    record('base body');
  }
}
