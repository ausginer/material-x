import { rec } from './rv-log.ts';
export class RvBase {
  static observedAttributes: readonly string[] = ['data-rv'];
  readonly baseField = rec('base field');
  readonly args: readonly unknown[];
  constructor(...args: unknown[]) {
    this.args = args;
    rec('base body');
  }
}
