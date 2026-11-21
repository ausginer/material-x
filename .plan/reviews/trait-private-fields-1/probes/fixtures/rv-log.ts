export const log: string[] = [];
export function rec<T>(step: string, value?: T): T | string {
  log.push(step);
  return value === undefined ? step : value;
}
