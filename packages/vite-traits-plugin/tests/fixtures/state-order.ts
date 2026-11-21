/** The steps of each construction, in the order they ran. */
export const order: string[] = [];

/** Records `step` and returns it. */
export function record(step: string): string {
  order.push(step);
  return step;
}
