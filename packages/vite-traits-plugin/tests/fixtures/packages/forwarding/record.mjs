// A module of the same package that the trait's member imports relatively.
/**
 * @param {{ calls: number, options: unknown }} target
 * @param {unknown} options
 */
export function record(target, options) {
  target.calls += 1;
  target.options = options;
}
