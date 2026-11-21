// A module of the same package that the trait's member imports relatively.
/**
 * @param {{ calls: number, options: unknown }} target
 * @param {unknown} options
 */
export function record(target, options) {
  target.calls += 1;
  target.options = options;
}

/** A value that a trait's field initializer imports. */
export const RECORD_KIND = 'record';
